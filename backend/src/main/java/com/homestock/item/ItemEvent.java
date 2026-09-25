package com.homestock.item;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;

/** One immutable thing that happened. Written once, never updated or deleted. */
@Getter
@Setter
@Entity
@Table(name = "item_events")
public class ItemEvent {

    @Id
    private UUID id;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Column(name = "item_id", nullable = false)
    private UUID itemId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private EventType type;

    /** Signed: negative for anything that leaves the house. */
    @Column(name = "quantity_delta", nullable = false)
    private BigDecimal quantityDelta;

    /**
     * What was actually paid (or received) for this line, not a price per unit.
     * A per-unit price cannot be stored in money precision — see V3.
     */
    @Column(name = "total_price")
    private BigDecimal totalPrice;

    private String note;

    /** When it happened, which is not when it was recorded — an offline tap syncs later. */
    @Column(name = "occurred_at", nullable = false)
    private Instant occurredAt;

    @Column(name = "created_at", nullable = false, updatable = false, insertable = false)
    private Instant createdAt;
}
