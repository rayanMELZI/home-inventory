package com.homestock.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "app")
public record AppProperties(
        Jwt jwt,
        Refresh refresh,
        Meals meals,
        boolean secureCookies
) {
    public record Jwt(String secret, int accessTtlMinutes) {}

    public record Refresh(int ttlDays) {}

    /**
     * Meal suggestions. A blank apiKey disables the feature cleanly — the
     * pantry keeps working and the Meals screen says why it cannot help.
     */
    public record Meals(String apiKey, String model, String baseUrl) {}
}
