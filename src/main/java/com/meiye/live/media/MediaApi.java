package com.meiye.live.media;

import java.io.IOException;
import java.util.List;
import java.util.Locale;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping({"/api/admin/media", "/meiye/api/admin/media"})
public class MediaApi {
    private static final long MAX_UPLOAD_BYTES = 2L * 1024 * 1024 * 1024;
    private static final long MAX_IMAGE_BYTES = 10L * 1024 * 1024;
    private final MediaAssetRepository assets;
    private final CosStorageService cos;

    public MediaApi(MediaAssetRepository assets, CosStorageService cos) { this.assets = assets; this.cos = cos; }

    @GetMapping
    public List<MediaView> list() {
        cos.requireReady();
        return assets.findTop200ByOrderByCreatedAtDesc().stream().filter(asset -> asset.getContentType().startsWith("video/")).map(this::view).toList();
    }

    @GetMapping("/images")
    public List<MediaView> images() {
        cos.requireReady();
        return assets.findTop200ByOrderByCreatedAtDesc().stream().filter(asset -> asset.getContentType().startsWith("image/")).map(this::view).toList();
    }

    @PostMapping(consumes = "multipart/form-data")
    @ResponseStatus(HttpStatus.CREATED)
    @Transactional
    public MediaView upload(@RequestPart("file") MultipartFile file) {
        if (file.isEmpty()) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "请选择视频文件");
        if (file.getSize() > MAX_UPLOAD_BYTES) throw new ResponseStatusException(HttpStatus.PAYLOAD_TOO_LARGE, "视频文件不能超过 2 GB");
        String contentType = file.getContentType() == null ? "" : file.getContentType().toLowerCase(Locale.ROOT);
        if (!contentType.startsWith("video/")) throw new ResponseStatusException(HttpStatus.UNSUPPORTED_MEDIA_TYPE, "仅支持视频文件");
        String safeName = safeFilename(file.getOriginalFilename());
        String key = "media/" + UUID.randomUUID() + "/" + safeName;
        try { cos.upload(key, file.getInputStream(), file.getSize(), contentType); }
        catch (IOException exception) { throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "读取上传文件失败"); }
        return view(assets.save(new MediaAsset(safeName, key, contentType, file.getSize())));
    }

    @PostMapping(value = "/images", consumes = "multipart/form-data")
    @ResponseStatus(HttpStatus.CREATED)
    @Transactional
    public MediaView uploadImage(@RequestPart("file") MultipartFile file) {
        if (file.isEmpty()) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "请选择封面图片");
        if (file.getSize() > MAX_IMAGE_BYTES) throw new ResponseStatusException(HttpStatus.PAYLOAD_TOO_LARGE, "封面图片不能超过 10 MB");
        String contentType = file.getContentType() == null ? "" : file.getContentType().toLowerCase(Locale.ROOT);
        if (!List.of("image/jpeg", "image/png", "image/webp").contains(contentType))
            throw new ResponseStatusException(HttpStatus.UNSUPPORTED_MEDIA_TYPE, "封面仅支持 JPG、PNG 或 WebP 图片");
        String safeName = safeFilename(file.getOriginalFilename());
        String key = "covers/" + UUID.randomUUID() + "/" + safeName;
        try { cos.upload(key, file.getInputStream(), file.getSize(), contentType); }
        catch (IOException exception) { throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "读取封面图片失败"); }
        return view(assets.save(new MediaAsset(safeName, key, contentType, file.getSize())));
    }

    @GetMapping("/{id}/url")
    public MediaView url(@PathVariable long id) {
        MediaAsset asset = assets.findById(id).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "素材不存在"));
        return view(asset);
    }

    private MediaView view(MediaAsset asset) {
        String url = cos.signedUrl(asset.getObjectKey());
        return new MediaView(asset.getId(), asset.getName(), asset.getObjectKey(), asset.getContentType(),
            asset.getSizeBytes(), asset.getCreatedAt(), url);
    }
    private static String safeFilename(String name) {
        String value = name == null ? "video" : name.replace('\\', '/');
        value = value.substring(value.lastIndexOf('/') + 1).replaceAll("[^\\p{L}\\p{N}._ -]", "_").trim();
        if (value.isBlank()) value = "video";
        return value.length() > 180 ? value.substring(value.length() - 180) : value;
    }
    public record MediaView(long id, String name, String objectKey, String contentType, long sizeBytes,
                            java.time.Instant createdAt, String url) { }
}
