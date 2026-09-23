package com.homestock.item;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.homestock.common.ApiException;
import com.homestock.item.ItemDtos.EventRequest;
import com.homestock.item.ItemDtos.EventResponse;
import com.homestock.item.ItemDtos.ItemRequest;
import com.homestock.item.ItemDtos.ItemResponse;

@Service
public class ItemService {

    private final ItemRepository itemRepository;
    private final ItemEventRepository eventRepository;

    public ItemService(ItemRepository itemRepository, ItemEventRepository eventRepository) {
        this.itemRepository = itemRepository;
        this.eventRepository = eventRepository;
    }

    @Transactional(readOnly = true)
    public List<ItemResponse> list(Long userId) {
        return itemRepository.findByUserIdAndArchivedFalseOrderByNameAsc(userId).stream()
                .map(ItemDtos::toResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<String> suggestNames(Long userId, String fragment) {
        if (fragment == null || fragment.isBlank()) {
            return List.of();
        }
        return itemRepository
                .findTop8ByUserIdAndNameContainingIgnoreCaseOrderByNameAsc(userId, fragment.trim())
                .stream()
                .map(Item::getName)
                .distinct()
                .toList();
    }

    @Transactional(readOnly = true)
    public List<EventResponse> history(Long userId, UUID itemId) {
        find(userId, itemId);
        return eventRepository.findTop50ByItemIdOrderByOccurredAtDesc(itemId).stream()
                .map(ItemDtos::toResponse)
                .toList();
    }

    @Transactional
    public ItemResponse create(Long userId, ItemRequest request) {
        String name = request.name().trim();
        if (itemRepository.existsByUserIdAndArchivedFalseAndNameIgnoreCase(userId, name)) {
            throw ApiException.conflict("You already have " + name + " in your pantry");
        }
        Item item = new Item();
        item.setId(request.id() != null ? request.id() : UUID.randomUUID());
        item.setUserId(userId);
        apply(item, request, name);
        return ItemDtos.toResponse(itemRepository.save(item));
    }

    @Transactional
    public ItemResponse update(Long userId, UUID id, ItemRequest request) {
        Item item = find(userId, id);
        String name = request.name().trim();
        if (!item.getName().equalsIgnoreCase(name)
                && itemRepository.existsByUserIdAndArchivedFalseAndNameIgnoreCase(userId, name)) {
            throw ApiException.conflict("You already have " + name + " in your pantry");
        }
        apply(item, request, name);
        return ItemDtos.toResponse(itemRepository.save(item));
    }

    /** Archive rather than delete: the events that mention it are still true. */
    @Transactional
    public void archive(Long userId, UUID id) {
        Item item = find(userId, id);
        item.setArchived(true);
        item.setUpdatedAt(Instant.now());
        itemRepository.save(item);
    }

    /**
     * The single write path for stock. Everything that moves a quantity — a
     * stepper tap, a shopping-list tick, a sync from another device — lands
     * here, so the event log and the running total cannot drift apart.
     */
    @Transactional
    public ItemResponse applyEvent(Long userId, UUID itemId, EventRequest request) {
        Item item = find(userId, itemId);
        BigDecimal delta = request.quantityDelta();

        if (!request.type().allows(delta)) {
            throw ApiException.badRequest(
                    request.type() + " cannot carry a delta of " + delta.toPlainString());
        }
        if (request.unitPrice() != null && !request.type().carriesMoney()) {
            throw ApiException.badRequest("A unit price only makes sense on a purchase or a sale");
        }

        UUID eventId = request.id() != null ? request.id() : UUID.randomUUID();
        // Re-sending an event must be a no-op, not a second deduction. The
        // offline outbox leans on this hard; it is cheap to honour from the start.
        if (eventRepository.existsById(eventId)) {
            return ItemDtos.toResponse(item);
        }

        BigDecimal effective = Stock.effectiveDelta(item.getQuantity(), delta);
        if (effective.signum() == 0) {
            throw ApiException.badRequest("There is no " + item.getName() + " left");
        }

        ItemEvent event = new ItemEvent();
        event.setId(eventId);
        event.setUserId(userId);
        event.setItemId(item.getId());
        event.setType(request.type());
        event.setQuantityDelta(effective);
        event.setUnitPrice(request.unitPrice());
        event.setNote(request.note());
        event.setOccurredAt(request.occurredAt() != null ? request.occurredAt() : Instant.now());
        eventRepository.save(event);

        // Exactly the sum of this item's deltas, by construction — see above.
        item.setQuantity(item.getQuantity().add(effective));
        item.setUpdatedAt(Instant.now());
        return ItemDtos.toResponse(itemRepository.save(item));
    }

    private void apply(Item item, ItemRequest request, String name) {
        item.setName(name);
        item.setCategory(request.category() == null || request.category().isBlank()
                ? null
                : request.category().trim());
        item.setUnit(request.unit());
        item.setLowThreshold(request.lowThreshold());
        item.setUpdatedAt(Instant.now());
    }

    private Item find(Long userId, UUID id) {
        return itemRepository.findByIdAndUserId(id, userId)
                .orElseThrow(() -> ApiException.notFound("No such item"));
    }
}
