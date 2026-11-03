package com.meiye.live.media;

import jakarta.persistence.*;
import java.time.Instant;

@Entity
@Table(name = "media_assets")
public class MediaAsset {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @Column(nullable = false, length = 255) private String name;
    @Column(nullable = false, unique = true, length = 512) private String objectKey;
    @Column(nullable = false, length = 160) private String contentType;
    @Column(nullable = false) private long sizeBytes;
    @Column(nullable = false) private Instant createdAt;

    protected MediaAsset() { }
    public MediaAsset(String name, String objectKey, String contentType, long sizeBytes) {
        this.name = name; this.objectKey = objectKey; this.contentType = contentType;
        this.sizeBytes = sizeBytes; this.createdAt = Instant.now();
    }
    public Long getId() { return id; }
    public String getName() { return name; }
    public String getObjectKey() { return objectKey; }
    public String getContentType() { return contentType; }
    public long getSizeBytes() { return sizeBytes; }
    public Instant getCreatedAt() { return createdAt; }
}
