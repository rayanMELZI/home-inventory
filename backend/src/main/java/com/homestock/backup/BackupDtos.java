package com.homestock.backup;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

import com.homestock.item.EventType;
import com.homestock.item.Unit;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public class BackupDtos {

    /**
     * The whole account in one file.
     *
     * Everything here is plain readable JSON on purpose. This is the piece
     * fromNowToSuccess never had: there, the only backup was a pg_dump of
     * encrypted columns, useless without a key that could itself be lost.
     */
    public record Backup(
            /* Bumped only if the shape changes incompatibly, so an old file can
             * still be recognised rather than silently half-imported. */
            int version,
            Instant exportedAt,
            Account account,
            List<@Valid BackupItem> items,
            List<@Valid BackupEvent> events) {}

    public record Account(String username, String email, String timezone) {}

    public record BackupItem(
            @NotNull UUID id,
            @NotNull String name,
            String category,
            /* Absent from files written before V4; reads back as null. */
            @Size(max = 16) String icon,
            @NotNull Unit unit,
            BigDecimal lowThreshold,
            boolean archived,
            @NotNull Instant updatedAt) {}

    public record BackupEvent(
            @NotNull UUID id,
            @NotNull UUID itemId,
            @NotNull EventType type,
            @NotNull BigDecimal quantityDelta,
            BigDecimal totalPrice,
            String note,
            @NotNull Instant occurredAt) {}

    /** What an import actually did, so the UI can say more than "done". */
    public record ImportResult(int itemsAdded, int itemsUpdated, int eventsAdded, int skipped) {}

    private BackupDtos() {}
}
