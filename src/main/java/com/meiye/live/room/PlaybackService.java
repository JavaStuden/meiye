package com.meiye.live.room;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import org.springframework.stereotype.Service;

@Service
public class PlaybackService {
    private final Clock clock;
    public PlaybackService() { this(Clock.systemUTC()); }
    public PlaybackService(Clock clock) { this.clock = clock; }
    public PlaybackState state(Room room) {
        Instant now = clock.instant();
        String phase;
        long offset = 0;
        if (room.getStatus() == RoomStatus.DRAFT) phase = "WAITING";
        else if (room.getMode() == RoomMode.PSEUDO) {
            if (room.getStatus() == RoomStatus.ENDED) phase = "ENDED";
            else if (room.getScheduledAt() == null || now.isBefore(room.getScheduledAt())) phase = "WAITING";
            else {
                offset = Duration.between(room.getScheduledAt(), now).getSeconds();
                phase = offset >= room.getDurationSeconds() ? "ENDED" : "PLAYING";
                offset = Math.min(offset, room.getDurationSeconds());
            }
        } else if (room.getMode() == RoomMode.REPLAY) phase = "PLAYING";
        else phase = room.getStatus() == RoomStatus.LIVE ? "PLAYING" : room.getStatus() == RoomStatus.ENDED ? "ENDED" : "WAITING";
        // Availability is separate from schedule; a missing media URL can never look like a broadcast.
        if ("PLAYING".equals(phase) && (room.getStreamUrl() == null || room.getStreamUrl().isBlank())) phase = "UNCONFIGURED";
        return new PlaybackState(phase, offset, room.getScheduledAt(), now, room.getStreamUrl(), room.getMode(), room.getDurationSeconds());
    }
    public record PlaybackState(String phase, long offsetSeconds, Instant startsAt, Instant serverTime, String source, RoomMode mode, int durationSeconds) { }
}
