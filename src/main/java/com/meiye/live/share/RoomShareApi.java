package com.meiye.live.share;

import com.google.zxing.BarcodeFormat;
import com.google.zxing.EncodeHintType;
import com.google.zxing.common.BitMatrix;
import com.google.zxing.qrcode.QRCodeWriter;
import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;
import java.util.Map;
import javax.imageio.ImageIO;
import org.springframework.http.CacheControl;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping({"/api/admin/share/rooms", "/meiye/api/admin/share/rooms"})
public class RoomShareApi {
    private final WechatCodeService wechat;
    private final WechatShareProperties settings;

    public RoomShareApi(WechatCodeService wechat, WechatShareProperties settings) {
        this.wechat = wechat;
        this.settings = settings;
    }

    @GetMapping("/{id}")
    public Map<String, String> info(@PathVariable long id) {
        WechatCodeService.validateRoom(id);
        return Map.of("appId", settings.appId(), "envVersion", settings.envVersion(),
            "path", WechatCodeService.PAGE + "?id=" + id, "h5Url", h5Url(id));
    }

    @GetMapping("/{id}/miniprogram-code")
    public ResponseEntity<byte[]> miniCode(@PathVariable long id) {
        byte[] bytes = wechat.code(id);
        MediaType type = bytes[0] == (byte) 0x89 ? MediaType.IMAGE_PNG : MediaType.IMAGE_JPEG;
        return ResponseEntity.ok().cacheControl(CacheControl.noStore()).contentType(type).body(bytes);
    }

    @GetMapping(value = "/{id}/h5-code", produces = "image/png")
    public ResponseEntity<byte[]> h5Code(@PathVariable long id) throws Exception {
        WechatCodeService.validateRoom(id);
        BitMatrix matrix = new QRCodeWriter().encode(h5Url(id), BarcodeFormat.QR_CODE, 430, 430,
            Map.of(EncodeHintType.MARGIN, 4, EncodeHintType.CHARACTER_SET, "UTF-8"));
        BufferedImage image = new BufferedImage(430, 430, BufferedImage.TYPE_INT_RGB);
        for (int y = 0; y < 430; y++) for (int x = 0; x < 430; x++)
            image.setRGB(x, y, matrix.get(x, y) ? 0x000000 : 0xffffff);
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        ImageIO.write(image, "png", out);
        return ResponseEntity.ok().cacheControl(CacheControl.noStore()).contentType(MediaType.IMAGE_PNG).body(out.toByteArray());
    }

    private String h5Url(long id) { return settings.h5RoomUrl() + id; }
}
