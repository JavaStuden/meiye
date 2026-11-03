package com.meiye.live.share;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties("meiye.wechat")
public record WechatShareProperties(String appId, String appSecret, String envVersion, String watchUrl) { }
