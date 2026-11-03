package com.meiye.live;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.ConfigurationPropertiesScan;

@SpringBootApplication
@ConfigurationPropertiesScan
public class MeiyeApplication {
    public static void main(String[] args) { SpringApplication.run(MeiyeApplication.class, args); }
}
