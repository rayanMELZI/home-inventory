package com.homestock.sync;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

import com.homestock.item.EventType;
import com.homestock.item.ItemDtos.EventResponse;
import com.homestock.item.ItemDtos.ItemResponse;
import com.homestock.item.Unit;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public class SyncDtos {

    /**
     * An item as the client knows it.
     *
     * Deliberately carries no quantity. The client sends what it MEANT — this
     * item exists, these things happened to it — and the server works out the
     * totals. A second copy of that arithmetic living in the browser is
     * exactly how the two would drift.
     */
    public record ItemPayload(
            @NotNull UUID id,
            @NotNull @Size(max = 80) String name,
            @Size(max = 40) String category,
            @NotNull Unit unit,
            BigDecimal lowThreshold,
            boolean archived,
            @NotNull Instant updatedAt) {}

    public record EventPayload(
            @NotNull UUID id,
            @NotNull UUID itemId,
            @NotNull EventType type,
            @NotNull BigDecimal quantityDelta,
            BigDecimal unitPrice,
            @Size(max = 200) String note,
            @NotNull Instant occurredAt) {}

    /**
     * Push and pull in one round trip. `since` is the serverTime handed back by
     * the previous sync, or null on a first run, which asks for everything.
     */
    public record SyncRequest(
            Instant since,
            @Valid List<ItemPayload> items,
            @Valid List<EventPayload> events) {}

    /**
     * Everything that changed server-side, plus the cursor for next time.
     *
     * `rejected` names the events the server refused — an offline tap that
     * cannot be honoured, such as using the last of something twice on two
     * different devices. The client drops those from its outbox so one bad
     * entry cannot block every later one behind it.
     */
    public record SyncResponse(
            Instant serverTime,
            List<ItemResponse> items,
            List<EventResponse> events,
            List<RejectedEvent> rejected) {}

    public record RejectedEvent(UUID id, String reason) {}

    private SyncDtos() {}
}
