package com.homestock.item;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public class ItemDtos {

    /** The id is optional here and required later: once the client owns an
     *  offline database it generates the id itself, and sending it now keeps
     *  that path identical. */
    public record ItemRequest(
            UUID id,
            @NotBlank @Size(max = 80) String name,
            @Size(max = 40) String category,
            @NotNull Unit unit,
            @DecimalMin("0.0") BigDecimal lowThreshold) {}

    public record EventRequest(
            UUID id,
            @NotNull EventType type,
            @NotNull BigDecimal quantityDelta,
            @DecimalMin("0.0") BigDecimal unitPrice,
            @Size(max = 200) String note,
            Instant occurredAt) {}

    public record ItemResponse(
            UUID id,
            String name,
            String category,
            Unit unit,
            BigDecimal quantity,
            BigDecimal lowThreshold,
            boolean low,
            /* Carried so a syncing client learns what was removed while it was away. */
            boolean archived,
            Instant updatedAt) {}

    public record EventResponse(
            UUID id,
            UUID itemId,
            EventType type,
            BigDecimal quantityDelta,
            BigDecimal unitPrice,
            String note,
            Instant occurredAt) {}

    public static ItemResponse toResponse(Item item) {
        boolean low = item.getLowThreshold() != null
                && item.getQuantity().compareTo(item.getLowThreshold()) <= 0;
        return new ItemResponse(item.getId(), item.getName(), item.getCategory(), item.getUnit(),
                item.getQuantity(), item.getLowThreshold(), low, item.isArchived(),
                item.getUpdatedAt());
    }

    public static EventResponse toResponse(ItemEvent event) {
        return new EventResponse(event.getId(), event.getItemId(), event.getType(),
                event.getQuantityDelta(), event.getUnitPrice(), event.getNote(),
                event.getOccurredAt());
    }

    private ItemDtos() {}
}
