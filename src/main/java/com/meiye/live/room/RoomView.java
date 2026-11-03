package com.meiye.live.room;

import java.time.Instant;

public record RoomView(Long id, String title, String host, RoomMode mode, RoomStatus status,
    String description, String announcement, String streamUrl, String posterUrl, Instant scheduledAt,
    int durationSeconds, boolean commentsEnabled, long likes, int productCount, boolean mediaReady,
    String modeLabel, String statusLabel) {
    public static RoomView of(Room room, int products) {
        return new RoomView(room.getId(), room.getTitle(), room.getHost(), room.getMode(), room.getStatus(),
            room.getDescription(), room.getAnnouncement(), room.getStreamUrl(), room.getPosterUrl(), room.getScheduledAt(),
            room.getDurationSeconds(), room.isCommentsEnabled(), room.getLikes(), products,
            room.getStreamUrl() != null && !room.getStreamUrl().isBlank(), room.getMode().label(), statusLabel(room));
    }
    private static String statusLabel(Room room) {
        if (room.getMode() == RoomMode.PSEUDO && room.getScheduledAt() != null
                && room.getStatus() != RoomStatus.DRAFT && room.getStatus() != RoomStatus.ENDED) {
            Instant now = Instant.now();
            if (now.isBefore(room.getScheduledAt())) return "待开播";
            if (now.isBefore(room.getScheduledAt().plusSeconds(room.getDurationSeconds()))) return "排期进行中";
            return "已结束";
        }
        return room.getStatus().label();
    }
}
