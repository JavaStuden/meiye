package com.meiye.live.share;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;
import com.google.zxing.BinaryBitmap;
import com.google.zxing.MultiFormatReader;
import com.google.zxing.RGBLuminanceSource;
import com.google.zxing.common.HybridBinarizer;
import java.io.ByteArrayInputStream;
import javax.imageio.ImageIO;
import org.junit.jupiter.api.Test;

class RoomShareApiTest {
    @Test void h5QrDecodesToExactPublicRoomUrl() throws Exception {
        var api = new RoomShareApi(mock(WechatCodeService.class), new WechatShareProperties("app", "", "release", "https://voice.yourunshi.online/meiye/meiye/"));
        var image = ImageIO.read(new ByteArrayInputStream(api.h5Code(3).getBody()));
        int[] pixels = image.getRGB(0, 0, image.getWidth(), image.getHeight(), null, 0, image.getWidth());
        var source = new RGBLuminanceSource(image.getWidth(), image.getHeight(), pixels);
        String decoded = new MultiFormatReader().decode(new BinaryBitmap(new HybridBinarizer(source))).getText();
        assertThat(decoded).isEqualTo("https://voice.yourunshi.online/meiye/meiye/?view=h5&room=3");
        assertThat(api.info(3).get("path")).isEqualTo("pages/watch/watch?id=3");
        assertThatThrownBy(() -> api.info(0)).hasMessageContaining("编号不正确");
    }
}
