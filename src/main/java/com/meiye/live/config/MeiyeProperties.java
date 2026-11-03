package com.meiye.live.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties("meiye")
public record MeiyeProperties(String adminUsername, String adminPassword, String liveUrl, String replayUrl, String pseudoUrl, Cos cos) {
    public record Cos(String bucket, String region, String secretId, String secretKey, String publicDomain) { }
}
