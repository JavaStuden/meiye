package com.meiye.live.share;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

/** Only server-side credentials are used; upstream response bodies and request URLs are never logged. */
@Service
public class WechatCodeService {
    static final String PAGE = "pages/watch/watch";
    private final WechatShareProperties settings;
    private final ObjectMapper json;
    private final HttpClient client;
    private String token;
    private Instant tokenExpiry = Instant.EPOCH;
    private final Map<Long, byte[]> codes = new LinkedHashMap<>(16, 0.75f, true) {
        @Override protected boolean removeEldestEntry(Map.Entry<Long, byte[]> entry) { return size() > 200; }
    };

    @org.springframework.beans.factory.annotation.Autowired
    public WechatCodeService(WechatShareProperties settings, ObjectMapper json) {
        this(settings, json, HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(10)).build());
    }

    WechatCodeService(WechatShareProperties settings, ObjectMapper json, HttpClient client) {
        this.settings = settings;
        this.json = json;
        this.client = client;
    }

    public synchronized byte[] code(long roomId) {
        validateRoom(roomId);
        if (settings.appId() == null || settings.appId().isBlank()
                || settings.appSecret() == null || settings.appSecret().isBlank()) {
            throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE,
                "尚未配置小程序分享：请在服务器配置 WECHAT_APP_ID 和 WECHAT_APP_SECRET");
        }
        if (!java.util.Set.of("release", "trial", "develop").contains(settings.envVersion())) {
            throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE, "小程序分享版本配置错误");
        }
        byte[] cached = codes.get(roomId);
        if (cached != null) return cached;
        for (int attempt = 0; attempt < 2; attempt++) {
            byte[] body = post("https://api.weixin.qq.com/wxa/getwxacodeunlimit?access_token=" + accessToken(),
                Map.of("scene", "id=" + roomId, "page", PAGE, "env_version", settings.envVersion(),
                    "check_path", "release".equals(settings.envVersion()), "width", 430));
            // WeChat returns JSON even with HTTP 200 when generation fails.
            if (isImage(body)) {
                codes.put(roomId, body);
                return body;
            }
            JsonNode error = parse(body);
            int code = error.path("errcode").asInt(-1);
            if (attempt == 0 && (code == 40001 || code == 40014 || code == 42001)) {
                token = null;
                continue;
            }
            throw upstreamError(code);
        }
        throw upstreamError(-1);
    }

    private String accessToken() {
        if (token != null && Instant.now().isBefore(tokenExpiry)) return token;
        JsonNode response = parse(post("https://api.weixin.qq.com/cgi-bin/stable_token", Map.of(
            "grant_type", "client_credential", "appid", settings.appId(), "secret", settings.appSecret(),
            "force_refresh", false)));
        String next = response.path("access_token").asText("");
        if (next.isBlank()) throw upstreamError(response.path("errcode").asInt(-1));
        token = next;
        tokenExpiry = Instant.now().plusSeconds(Math.max(0, response.path("expires_in").asLong(7200) - 120));
        return token;
    }

    private byte[] post(String url, Object payload) {
        try {
            HttpRequest request = HttpRequest.newBuilder(URI.create(url)).timeout(Duration.ofSeconds(20))
                .header("Content-Type", "application/json")
                .POST(HttpRequest.BodyPublishers.ofByteArray(json.writeValueAsBytes(payload))).build();
            HttpResponse<byte[]> response = client.send(request, HttpResponse.BodyHandlers.ofByteArray());
            if (response.statusCode() != 200) throw upstreamError(-1);
            return response.body();
        } catch (InterruptedException exception) {
            Thread.currentThread().interrupt();
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "微信小程序码请求中断，请重试");
        } catch (IOException exception) {
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "暂时无法连接微信小程序码服务，请稍后重试");
        }
    }

    private JsonNode parse(byte[] body) {
        try {
            JsonNode value = json.readTree(body);
            if (value == null || !value.isObject()) throw upstreamError(-1);
            return value;
        }
        catch (IOException exception) { throw upstreamError(-1); }
    }

    static boolean isImage(byte[] body) {
        return body != null && body.length > 8 &&
            ((body[0] == (byte) 0x89 && body[1] == 'P' && body[2] == 'N' && body[3] == 'G')
            || (body[0] == (byte) 0xff && body[1] == (byte) 0xd8 && body[2] == (byte) 0xff));
    }

    static void validateRoom(long roomId) {
        if (roomId <= 0) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "直播间编号不正确");
    }

    private ResponseStatusException upstreamError(int code) {
        String message = switch (code) {
            case 40164 -> "请在微信小程序后台将此服务器出口 IP 加入接口 IP 白名单";
            case 40013, 40125 -> "小程序 AppID 或 AppSecret 不正确，请检查服务器配置";
            case 41030 -> "正式版尚无观看页，请发布包含 pages/watch/watch 的小程序版本";
            case 45009 -> "微信接口调用次数已达上限，请稍后重试";
            case 85096 -> "小程序版本暂不可用，请检查微信后台发布状态";
            default -> "微信暂未生成小程序码，请检查小程序权限和服务器配置";
        };
        return new ResponseStatusException(HttpStatus.BAD_GATEWAY, message + "（微信错误码 " + code + "）");
    }
}
