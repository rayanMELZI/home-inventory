package com.homestock.backup;

import java.time.LocalDate;

import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.homestock.auth.CurrentUser;
import com.homestock.backup.BackupDtos.Backup;
import com.homestock.backup.BackupDtos.ImportResult;

import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/backup")
public class BackupController {

    private final BackupService backupService;

    public BackupController(BackupService backupService) {
        this.backupService = backupService;
    }

    /** Content-Disposition so the browser saves a file instead of rendering JSON. */
    @GetMapping("/export")
    public ResponseEntity<Backup> export(@AuthenticationPrincipal CurrentUser user) {
        String filename = "homestock-" + LocalDate.now() + ".json";
        return ResponseEntity.ok()
                .contentType(MediaType.APPLICATION_JSON)
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + filename + "\"")
                .body(backupService.export(user.id()));
    }

    @PostMapping("/import")
    public ImportResult restore(@AuthenticationPrincipal CurrentUser user,
                                @Valid @RequestBody Backup backup) {
        return backupService.restore(user.id(), backup);
    }
}
