package com.meiye.live.media;

import com.qcloud.cos.COSClient;
import com.qcloud.cos.ClientConfig;
import com.qcloud.cos.auth.BasicCOSCredentials;
import com.qcloud.cos.auth.COSCredentials;
import com.qcloud.cos.model.ObjectMetadata;
import com.qcloud.cos.model.COSObject;
import com.qcloud.cos.model.PutObjectRequest;
import com.qcloud.cos.region.Region;
import com.qcloud.cos.transfer.TransferManager;
import com.qcloud.cos.transfer.TransferManagerConfiguration;
import com.qcloud.cos.transfer.Upload;
import com.meiye.live.config.MeiyeProperties;
import jakarta.annotation.PreDestroy;
import java.io.InputStream;
import java.net.URL;
import java.util.Date;
import java.util.concurrent.Executors;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

@Service
public class CosStorageService {
    private final MeiyeProperties.Cos settings;
    private final COSClient client;
    private final TransferManager transfer;

    public CosStorageService(MeiyeProperties properties) {
        this.settings = properties.cos();
        if (ready()) {
            COSCredentials credentials = new BasicCOSCredentials(settings.secretId(), settings.secretKey());
            this.client = new COSClient(credentials, new ClientConfig(new Region(settings.region())));
            this.transfer = new TransferManager(client, Executors.newFixedThreadPool(4));
            TransferManagerConfiguration config = new TransferManagerConfiguration();
            config.setMultipartUploadThreshold(16L * 1024 * 1024);
            config.setMinimumUploadPartSize(8L * 1024 * 1024);
            transfer.setConfiguration(config);
        } else {
            this.client = null;
            this.transfer = null;
        }
    }

    public boolean ready() {
        return settings != null && nonBlank(settings.bucket()) && nonBlank(settings.region())
            && nonBlank(settings.secretId()) && nonBlank(settings.secretKey());
    }

    public void upload(String key, InputStream input, long size, String contentType) {
        requireReady();
        ObjectMetadata metadata = new ObjectMetadata();
        metadata.setContentLength(size);
        metadata.setContentType(contentType);
        try {
            Upload upload = transfer.upload(new PutObjectRequest(settings.bucket(), key, input, metadata));
            upload.waitForUploadResult();
        } catch (Exception exception) {
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "上传到 COS 失败，请检查服务器 COS 权限和网络");
        }
    }

    public String signedUrl(String key) {
        requireReady();
        Date expiry = new Date(System.currentTimeMillis() + 6L * 60 * 60 * 1000);
        URL url = client.generatePresignedUrl(settings.bucket(), key, expiry);
        return url.toString();
    }

    public COSObject getObject(String key) {
        requireReady();
        return client.getObject(settings.bucket(), key);
    }

    public String objectKey(String id) { return settings.bucket() + ".cos." + settings.region() + ".myqcloud.com/" + id; }
    public String domain() { return settings == null ? "" : (settings.publicDomain() == null ? "" : settings.publicDomain()); }

    public void requireReady() {
        if (!ready()) throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE, "COS 尚未配置，请在服务器设置 COS_BUCKET、COS_REGION、COS_SECRET_ID、COS_SECRET_KEY");
    }
    private static boolean nonBlank(String value) { return value != null && !value.isBlank(); }

    @PreDestroy public void close() {
        if (transfer != null) transfer.shutdownNow(false);
        if (client != null) client.shutdown();
    }
}
