package com.meiye.live.room;

import jakarta.persistence.*;
import java.time.Instant;

@Entity
@Table(name = "live_rooms")
public class Room {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @Column(nullable = false, length = 120) private String title;
    @Column(nullable = false, length = 60) private String host;
    @Enumerated(EnumType.STRING) @Column(nullable = false) private RoomMode mode;
    @Enumerated(EnumType.STRING) @Column(nullable = false) private RoomStatus status;
    @Column(length = 2000) private String description;
    @Column(length = 1000) private String announcement;
    @Column(length = 2048) private String streamUrl;
    @Column(length = 2048) private String posterUrl;
    private Instant scheduledAt;
    private int durationSeconds;
    private boolean commentsEnabled = true;
    private long likes;
    public Long getId() { return id; }
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
    public String getPosterUrl() { return posterUrl; }
    public void setPosterUrl(String posterUrl) { this.posterUrl = posterUrl; }
    public Instant getScheduledAt() { return scheduledAt; }
    public void setScheduledAt(Instant scheduledAt) { this.scheduledAt = scheduledAt; }
    public int getDurationSeconds() { return durationSeconds; }
    public void setDurationSeconds(int durationSeconds) { this.durationSeconds = durationSeconds; }
    public boolean isCommentsEnabled() { return commentsEnabled; }
    public void setCommentsEnabled(boolean commentsEnabled) { this.commentsEnabled = commentsEnabled; }
    public long getLikes() { return likes; }
}
