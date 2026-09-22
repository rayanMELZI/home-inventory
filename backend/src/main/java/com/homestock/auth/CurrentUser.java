package com.homestock.auth;

/** The authenticated principal, extracted from a verified access token. */
public record CurrentUser(Long id, String email, String role) {}
