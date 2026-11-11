package com.meiye.live.room;

import jakarta.validation.constraints.*;

public class RoomForm {
    private Long id;
    @NotBlank(message = "请填写场次标题") @Size(max = 120) private String title;
    @NotBlank(message = "请填写主播名称") @Size(max = 60) private String host;
    @NotNull private RoomMode mode;
    @NotNull private RoomStatus status;
    @Size(max = 2000) private String description = "";
    @Size(max = 1000) private String announcement = "";
    @Size(max = 2048) private String streamUrl = "";
    private Long mediaAssetId;
    @Size(max = 2048) private String posterUrl = "";
    private Long posterAssetId;
    private String scheduledAt;
    @Min(1) @Max(86400) private int durationSeconds = 3600;
    private boolean commentsEnabled;
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }
    public String getHost() { return host; }
    public void setHost(String host) { this.host = host; }
    public RoomMode getMode() { return mode; }
    public void setMode(RoomMode mode) { this.mode = mode; }
    public RoomStatus getStatus() { return status; }
    public void setStatus(RoomStatus status) { this.status = status; }
    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }
    public String getAnnouncement() { return announcement; }
    public void setAnnouncement(String announcement) { this.announcement = announcement; }
    public String getStreamUrl() { return streamUrl; }
    public void setStreamUrl(String streamUrl) { this.streamUrl = streamUrl; }
    public Long getMediaAssetId() { return mediaAssetId; }
    public void setMediaAssetId(Long mediaAssetId) { this.mediaAssetId = mediaAssetId; }
    public String getPosterUrl() { return posterUrl; }
    public void setPosterUrl(String posterUrl) { this.posterUrl = posterUrl; }
    public Long getPosterAssetId() { return posterAssetId; }
    public void setPosterAssetId(Long posterAssetId) { this.posterAssetId = posterAssetId; }
    public String getScheduledAt() { return scheduledAt; }
    public void setScheduledAt(String scheduledAt) { this.scheduledAt = scheduledAt; }
    public int getDurationSeconds() { return durationSeconds; }
    public void setDurationSeconds(int durationSeconds) { this.durationSeconds = durationSeconds; }
    public boolean isCommentsEnabled() { return commentsEnabled; }
    public void setCommentsEnabled(boolean commentsEnabled) { this.commentsEnabled = commentsEnabled; }
}
