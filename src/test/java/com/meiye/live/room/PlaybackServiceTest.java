package com.meiye.live.room;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.EnumSource;

class PlaybackServiceTest {
    private static final Instant NOW = Instant.parse("2026-10-19T04:00:00Z");
    private static final String SOURCE = "https://media.example.test/course.mp4";
    private final PlaybackService playback = new PlaybackService(Clock.fixed(NOW, ZoneOffset.UTC));

    @Test
    void pseudoLiveWaitsUntilItsScheduledStart() {
        Room room = room(RoomMode.PSEUDO, RoomStatus.SCHEDULED);
        room.setScheduledAt(NOW.plusSeconds(1));

        PlaybackService.PlaybackState state = playback.state(room);

        assertThat(state.phase()).isEqualTo("WAITING");
        assertThat(state.offsetSeconds()).isZero();
        assertThat(state.startsAt()).isEqualTo(NOW.plusSeconds(1));
        assertThat(state.serverTime()).isEqualTo(NOW);
    }

    @Test
    void pseudoLiveStartsExactlyAtItsScheduledTime() {
        Room room = room(RoomMode.PSEUDO, RoomStatus.SCHEDULED);
        room.setScheduledAt(NOW);

        PlaybackService.PlaybackState state = playback.state(room);

        assertThat(state.phase()).isEqualTo("PLAYING");
        assertThat(state.offsetSeconds()).isZero();
    }

    @Test
    void pseudoLiveUsesServerElapsedTimeAsItsPlaybackOffset() {
        Room room = room(RoomMode.PSEUDO, RoomStatus.LIVE);
        room.setScheduledAt(NOW.minusSeconds(125));

        PlaybackService.PlaybackState state = playback.state(room);

        assertThat(state.phase()).isEqualTo("PLAYING");
        assertThat(state.offsetSeconds()).isEqualTo(125);
        assertThat(state.source()).isEqualTo(SOURCE);
        assertThat(state.durationSeconds()).isEqualTo(600);
    }

    @Test
    void pseudoLiveEndsAtTheExactDurationBoundary() {
        Room room = room(RoomMode.PSEUDO, RoomStatus.LIVE);
        room.setScheduledAt(NOW.minusSeconds(600));

        PlaybackService.PlaybackState state = playback.state(room);

        assertThat(state.phase()).isEqualTo("ENDED");
        assertThat(state.offsetSeconds()).isEqualTo(600);
    }

    @Test
    void latePseudoLiveVisitorsCannotSeekPastTheConfiguredDuration() {
        Room room = room(RoomMode.PSEUDO, RoomStatus.LIVE);
        room.setScheduledAt(NOW.minusSeconds(1200));

        PlaybackService.PlaybackState state = playback.state(room);

        assertThat(state.phase()).isEqualTo("ENDED");
        assertThat(state.offsetSeconds()).isEqualTo(600);
    }

    @Test
    void pseudoLiveWithoutAScheduleWaits() {
        Room room = room(RoomMode.PSEUDO, RoomStatus.SCHEDULED);

        assertThat(playback.state(room).phase()).isEqualTo("WAITING");
    }

    @Test
    void explicitlyEndedPseudoLiveDoesNotResumeFromItsSchedule() {
        Room room = room(RoomMode.PSEUDO, RoomStatus.ENDED);
        room.setScheduledAt(NOW.minusSeconds(20));

        assertThat(playback.state(room).phase()).isEqualTo("ENDED");
    }

    @Test
    void activePseudoLiveWithoutMediaIsClearlyUnconfigured() {
        Room room = room(RoomMode.PSEUDO, RoomStatus.LIVE);
        room.setScheduledAt(NOW.minusSeconds(45));
        room.setStreamUrl("");

        PlaybackService.PlaybackState state = playback.state(room);

        assertThat(state.phase()).isEqualTo("UNCONFIGURED");
        assertThat(state.offsetSeconds()).isEqualTo(45);
    }

    @Test
    void liveStatusWithoutAnActualSourceDoesNotClaimToBroadcast() {
        Room room = room(RoomMode.LIVE, RoomStatus.LIVE);
        room.setStreamUrl(null);

        assertThat(playback.state(room).phase()).isEqualTo("UNCONFIGURED");
    }

    @Test
    void endedReplayCanStillBePlayedWhenItHasMedia() {
        Room room = room(RoomMode.REPLAY, RoomStatus.ENDED);

        assertThat(playback.state(room).phase()).isEqualTo("PLAYING");
    }

    @Test
    void replayCanUseAResolvedPrivateMediaUrl() {
        Room room = room(RoomMode.REPLAY, RoomStatus.ENDED);
        room.setStreamUrl("");

        PlaybackService.PlaybackState state = playback.state(room, SOURCE);

        assertThat(state.phase()).isEqualTo("PLAYING");
        assertThat(state.source()).isEqualTo(SOURCE);
    }

    @Test
    void roomWithAnAssociatedMediaAssetReportsMediaReady() {
        Room room = room(RoomMode.REPLAY, RoomStatus.ENDED);
        room.setStreamUrl("");
        room.setMediaAssetId(42L);

        RoomView view = RoomView.of(room, 0);

        assertThat(view.mediaAssetId()).isEqualTo(42L);
        assertThat(view.mediaReady()).isTrue();
    }

    @Test
    void replayWithoutMediaIsUnconfigured() {
        Room room = room(RoomMode.REPLAY, RoomStatus.ENDED);
        room.setStreamUrl("  ");

        assertThat(playback.state(room).phase()).isEqualTo("UNCONFIGURED");
    }

    @ParameterizedTest
    @EnumSource(RoomMode.class)
    void draftRoomsNeverBeginPlayback(RoomMode mode) {
        Room room = room(mode, RoomStatus.DRAFT);
        room.setScheduledAt(NOW.minusSeconds(20));

        assertThat(playback.state(room).phase()).isEqualTo("WAITING");
    }

    private static Room room(RoomMode mode, RoomStatus status) {
        Room room = new Room();
        room.setMode(mode);
        room.setStatus(status);
        room.setDurationSeconds(600);
        room.setStreamUrl(SOURCE);
        return room;
    }
}
