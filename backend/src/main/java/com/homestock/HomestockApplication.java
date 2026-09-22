package com.homestock;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.ConfigurationPropertiesScan;

@SpringBootApplication
@ConfigurationPropertiesScan
public class HomestockApplication {

    public static void main(String[] args) {
        SpringApplication.run(HomestockApplication.class, args);
    }
}
