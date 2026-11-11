package com.meiye.live.share;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

import com.fasterxml.jackson.databind.ObjectMapper;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.ByteBuffer;
import java.nio.charset.StandardCharsets;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.Flow;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.web.server.ResponseStatusException;

class WechatCodeServiceTest {
    private final ObjectMapper json = new ObjectMapper();
    private final HttpClient client = mock(HttpClient.class);
    private final byte[] image = new byte[] {(byte)0x89, 'P', 'N', 'G', 13, 10, 26, 10, 1};

    private WechatCodeService service(String secret) {
        return new WechatCodeService(new WechatShareProperties("test-app", secret, "release", "https://example.test/watch/", "https://example.test/share/rooms/"), json, client);
    }

    @SuppressWarnings("unchecked")
    private HttpResponse<byte[]> response(byte[] bytes) {
        HttpResponse<byte[]> result = mock(HttpResponse.class);
        when(result.statusCode()).thenReturn(200);
        when(result.body()).thenReturn(bytes);
        return result;
    }
    private HttpResponse<byte[]> response(String text) { return response(text.getBytes(StandardCharsets.UTF_8)); }

    @Test void missingSecretDoesNotCallWechat() {
        assertThatThrownBy(() -> service("").code(1)).isInstanceOf(ResponseStatusException.class).hasMessageContaining("WECHAT_APP_SECRET");
        verifyNoInteractions(client);
    }

    @Test void generatesCorrectRoomAndCachesImageAndToken() throws Exception {
        doReturn(response("{\"access_token\":\"private-token\",\"expires_in\":7200}"), response(image), response(image))
            .when(client).send(any(HttpRequest.class), org.mockito.ArgumentMatchers.<HttpResponse.BodyHandler<byte[]>>any());
        WechatCodeService service = service("private-secret");
        assertThat(service.code(3)).isEqualTo(image);
        assertThat(service.code(3)).isEqualTo(image);
        service.code(2);
        ArgumentCaptor<HttpRequest> requests = ArgumentCaptor.forClass(HttpRequest.class);
        verify(client, times(3)).send(requests.capture(), any());
        var payload = json.readTree(body(requests.getAllValues().get(1)));
        assertThat(payload.path("page").asText()).isEqualTo("pages/watch-share/watch-share");
        assertThat(payload.path("scene").asText()).isEqualTo("id=3");
        assertThat(payload.path("env_version").asText()).isEqualTo("release");
        assertThat(payload.path("check_path").asBoolean()).isTrue();
        assertThat(requests.getAllValues().get(0).uri().getPath()).isEqualTo("/cgi-bin/stable_token");
    }

    @Test void retriesExpiredTokenAndDoesNotReturnJsonAsImage() throws Exception {
        doReturn(response("{\"access_token\":\"old-token\"}"), response("{\"errcode\":42001}"),
                response("{\"access_token\":\"new-token\"}"), response(image))
            .when(client).send(any(HttpRequest.class), org.mockito.ArgumentMatchers.<HttpResponse.BodyHandler<byte[]>>any());
        assertThat(service("private-secret").code(1)).isEqualTo(image);
        verify(client, times(4)).send(any(), any());
    }

    @Test void wechatErrorIsActionableAndDoesNotExposeSecretOrToken() throws Exception {
        doReturn(response("{\"errcode\":40164,\"errmsg\":\"private-secret internal detail\"}"))
            .when(client).send(any(HttpRequest.class), org.mockito.ArgumentMatchers.<HttpResponse.BodyHandler<byte[]>>any());
        assertThatThrownBy(() -> service("private-secret").code(1))
            .hasMessageContaining("IP 白名单").hasMessageNotContaining("private-secret");
    }

    private String body(HttpRequest request) throws Exception {
        CompletableFuture<String> result = new CompletableFuture<>();
        java.io.ByteArrayOutputStream bytes = new java.io.ByteArrayOutputStream();
        request.bodyPublisher().orElseThrow().subscribe(new Flow.Subscriber<ByteBuffer>() {
            public void onSubscribe(Flow.Subscription subscription) { subscription.request(Long.MAX_VALUE); }
            public void onNext(ByteBuffer buffer) { byte[] part = new byte[buffer.remaining()]; buffer.get(part); bytes.writeBytes(part); }
            public void onError(Throwable error) { result.completeExceptionally(error); }
            public void onComplete() { result.complete(bytes.toString(StandardCharsets.UTF_8)); }
        });
        return result.get(2, java.util.concurrent.TimeUnit.SECONDS);
    }
}
