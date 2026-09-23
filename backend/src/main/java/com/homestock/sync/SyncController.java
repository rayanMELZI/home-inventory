package com.homestock.sync;

import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.homestock.auth.CurrentUser;
import com.homestock.sync.SyncDtos.SyncRequest;
import com.homestock.sync.SyncDtos.SyncResponse;

import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/sync")
public class SyncController {

    private final SyncService syncService;

    public SyncController(SyncService syncService) {
        this.syncService = syncService;
    }

    @PostMapping
    public SyncResponse sync(@AuthenticationPrincipal CurrentUser user,
                             @Valid @RequestBody SyncRequest request) {
        return syncService.sync(user.id(), request);
    }
}
