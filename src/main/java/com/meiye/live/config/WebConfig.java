package com.meiye.live.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@Configuration
public class WebConfig implements WebMvcConfigurer {
    @Override
    public void addResourceHandlers(ResourceHandlerRegistry registry) {
        registry.addResourceHandler("/meiye/**")
                .addResourceLocations("classpath:/static/meiye/", "classpath:/static/");
        registry.addResourceHandler("/assets/**")
                .addResourceLocations("classpath:/static/assets/");
        registry.addResourceHandler("/**")
                .addResourceLocations("classpath:/static/");
    }
}
