package com.homestock.auth;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.util.Base64;

import org.junit.jupiter.api.Test;

import com.homestock.config.AppProperties;
import com.homestock.user.User;

import io.jsonwebtoken.JwtException;

class JwtServiceTest {

    private static final String SECRET =
            Base64.getEncoder().encodeToString("a-test-secret-long-enough-for-hmac-sha256!".getBytes());

    private static JwtService service(String secret) {
        return new JwtService(new AppProperties(
                new AppProperties.Jwt(secret, 15),
                new AppProperties.Refresh(7),
                new AppProperties.Meals(null, null, null),
                false));
    }

    private static User user() {
        User user = new User();
        user.setUsername("rayane");
        user.setEmail("rayane@example.com");
        return user;
    }

    @Test
    void signsAndParsesBackTheSameIdentity() {
        var claims = service(SECRET).parse(service(SECRET).generateAccessToken(user()));

        assertThat(claims.get("email", String.class)).isEqualTo("rayane@example.com");
        assertThat(claims.get("role", String.class)).isEqualTo("USER");
    }

    /** A token signed with another key must not be accepted — that is the whole point. */
    @Test
    void rejectsATokenSignedWithADifferentKey() {
        String otherSecret =
                Base64.getEncoder().encodeToString("a-DIFFERENT-secret-long-enough-for-hmac!!".getBytes());
        String foreign = service(otherSecret).generateAccessToken(user());

        assertThatThrownBy(() -> service(SECRET).parse(foreign)).isInstanceOf(JwtException.class);
    }

    /** Fail loudly at startup rather than signing every token with an empty key. */
    @Test
    void refusesToStartWithoutASecret() {
        assertThatThrownBy(() -> service(""))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("JWT_SECRET");
    }
}
