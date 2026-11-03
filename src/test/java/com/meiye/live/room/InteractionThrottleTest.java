package com.meiye.live.room;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.mock;

import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpSession;
import org.springframework.web.server.ResponseStatusException;

class InteractionThrottleTest {
    private InteractionService at(long milliseconds) {
        return new InteractionService(mock(RoomService.class), mock(MessageRepository.class),
            Clock.fixed(Instant.ofEpochMilli(milliseconds), ZoneOffset.UTC));
    }
    @Test void cooldownRejectsBeforeBoundaryAndAllowsAtBoundary() {
        var session = new MockHttpSession();
        at(1000).throttle(session, "like", 500);
        assertThatThrownBy(() -> at(1499).throttle(session, "like", 500))
            .isInstanceOfSatisfying(ResponseStatusException.class, e -> assertThat(e.getStatusCode().value()).isEqualTo(429));
        assertThat(session.getAttribute("rate:like")).isEqualTo(1000L);
        at(1500).throttle(session, "like", 500);
        assertThat(session.getAttribute("rate:like")).isEqualTo(1500L);
    }
    @Test void cooldownIsIndependentForDifferentActions() {
        var session = new MockHttpSession();
        var service = at(1000);
        service.throttle(session, "message", 1000);
        assertThatCode(() -> service.throttle(session, "order", 3000)).doesNotThrowAnyException();
    }
    @Test void cooldownIsIndependentForDifferentSessions() {
        var service = at(1000);
        service.throttle(new MockHttpSession(), "order", 3000);
        assertThatCode(() -> service.throttle(new MockHttpSession(), "order", 3000)).doesNotThrowAnyException();
    }
}
