package com.homestock.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "app")
public record AppProperties(
        Jwt jwt,
        Refresh refresh,
        boolean secureCookies
) {
    public record Jwt(String secret, int accessTtlMinutes) {}

    public record Refresh(int ttlDays) {}
}
