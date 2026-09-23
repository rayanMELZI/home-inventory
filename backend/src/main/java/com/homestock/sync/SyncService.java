package com.homestock.sync;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.homestock.item.Item;
import com.homestock.item.ItemDtos;
import com.homestock.item.ItemEvent;
import com.homestock.item.ItemEventRepository;
import com.homestock.item.ItemRepository;
import com.homestock.item.Stock;
import com.homestock.sync.SyncDtos.EventPayload;
import com.homestock.sync.SyncDtos.ItemPayload;
import com.homestock.sync.SyncDtos.RejectedEvent;
import com.homestock.sync.SyncDtos.SyncRequest;
import com.homestock.sync.SyncDtos.SyncResponse;

/**
 * One round trip: take what a device did while it was away, then hand back
 * everything it missed.
 *
 * The client is free to guess at totals so its screen can respond instantly,
 * but the numbers this returns are the ones that count. Where the two differ —
 * two devices each using the last of something — the client adopts what comes
 * back rather than arguing.
 */
@Service
public class SyncService {

    private final ItemRepository itemRepository;
    private final ItemEventRepository eventRepository;

    public SyncService(ItemRepository itemRepository, ItemEventRepository eventRepository) {
        this.itemRepository = itemRepository;
        this.eventRepository = eventRepository;
    }

    @Transactional
    public SyncResponse sync(Long userId, SyncRequest request) {
        // Read the clock before writing anything. A cursor taken at the end
        // could sit after a row this same call had already committed, and the
        // next pull would skip it.
        Instant serverTime = Instant.now();

        List<ItemPayload> incomingItems = request.items() == null ? List.of() : request.items();
        List<EventPayload> incomingEvents = request.events() == null ? List.of() : request.events();

        Map<UUID, Item> touched = push(userId, incomingItems);
        List<RejectedEvent> rejected = applyEvents(userId, incomingEvents, touched);

        return new SyncResponse(serverTime, pullItems(userId, request.since()),
                pullEvents(userId, request.since()), rejected);
    }

    /** Items are metadata, so last writer wins on updatedAt. Quantity is not theirs to set. */
    private Map<UUID, Item> push(Long userId, List<ItemPayload> payloads) {
        Map<UUID, Item> touched = new HashMap<>();
        for (ItemPayload payload : payloads) {
            Item item = itemRepository.findByIdAndUserId(payload.id(), userId).orElse(null);
            if (item == null) {
                item = new Item();
                item.setId(payload.id());
                item.setUserId(userId);
                item.setQuantity(BigDecimal.ZERO);
            } else if (!payload.updatedAt().isAfter(item.getUpdatedAt())) {
                // The server already knows something newer; keep it.
                touched.put(item.getId(), item);
                continue;
            }
            item.setName(payload.name().trim());
            item.setCategory(payload.category());
            item.setUnit(payload.unit());
            item.setLowThreshold(payload.lowThreshold());
            item.setArchived(payload.archived());
            item.setUpdatedAt(payload.updatedAt());
            touched.put(item.getId(), itemRepository.save(item));
        }
        return touched;
    }

    private List<RejectedEvent> applyEvents(Long userId, List<EventPayload> payloads,
                                            Map<UUID, Item> touched) {
        List<RejectedEvent> rejected = new ArrayList<>();
        if (payloads.isEmpty()) {
            return rejected;
        }

        // Anything the server already has is simply dropped. This is what makes
        // a resend harmless, so a client that loses the reply can just send again.
        Set<UUID> known = eventRepository.findExistingIds(payloads.stream().map(EventPayload::id).toList());

        // Oldest first, so trimming against the stock on hand plays out in the
        // order the taps actually happened.
        List<EventPayload> ordered = new ArrayList<>(payloads);
        ordered.sort(Comparator.comparing(EventPayload::occurredAt));

        for (EventPayload payload : ordered) {
            if (known.contains(payload.id())) {
                continue;
            }
            Item item = touched.computeIfAbsent(payload.itemId(),
                    id -> itemRepository.findByIdAndUserId(id, userId).orElse(null));
            if (item == null) {
                rejected.add(new RejectedEvent(payload.id(), "That item no longer exists"));
                continue;
            }
            if (!payload.type().allows(payload.quantityDelta())) {
                rejected.add(new RejectedEvent(payload.id(), "The amount does not match the action"));
                continue;
            }

            BigDecimal effective = Stock.effectiveDelta(item.getQuantity(), payload.quantityDelta());
            if (effective.signum() == 0) {
                // Two devices used the last of it. The second tap is not a
                // failure to retry — it can never succeed, so say so and let
                // the client forget it rather than block everything behind it.
                rejected.add(new RejectedEvent(payload.id(), "There was none of that left"));
                continue;
            }

            ItemEvent event = new ItemEvent();
            event.setId(payload.id());
            event.setUserId(userId);
            event.setItemId(item.getId());
            event.setType(payload.type());
            event.setQuantityDelta(effective);
            event.setUnitPrice(payload.type().carriesMoney() ? payload.unitPrice() : null);
            event.setNote(payload.note());
            event.setOccurredAt(payload.occurredAt());
            eventRepository.save(event);

            item.setQuantity(item.getQuantity().add(effective));
            itemRepository.save(item);
        }
        return rejected;
    }

    private List<ItemDtos.ItemResponse> pullItems(Long userId, Instant since) {
        List<Item> items = since == null
                ? itemRepository.findByUserId(userId)
                : itemRepository.findByUserIdAndUpdatedAtAfter(userId, since);
        return items.stream().map(ItemDtos::toResponse).toList();
    }

    private List<ItemDtos.EventResponse> pullEvents(Long userId, Instant since) {
        List<ItemEvent> events = since == null
                ? eventRepository.findByUserId(userId)
                : eventRepository.findByUserIdAndCreatedAtAfter(userId, since);
        return events.stream().map(ItemDtos::toResponse).toList();
    }
}
