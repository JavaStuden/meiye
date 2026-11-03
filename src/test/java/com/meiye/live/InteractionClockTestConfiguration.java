package com.meiye.live;

import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Primary;

@TestConfiguration(proxyBeanMethods = false)
public class InteractionClockTestConfiguration {
    @Bean @Primary Clock fixedInteractionClock() {
        return Clock.fixed(Instant.parse("2026-10-19T00:00:00Z"), ZoneOffset.UTC);
    }
}
