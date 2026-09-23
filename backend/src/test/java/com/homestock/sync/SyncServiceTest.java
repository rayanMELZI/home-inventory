package com.homestock.sync;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.mockito.Mockito;

import com.homestock.item.EventType;
import com.homestock.item.Item;
import com.homestock.item.ItemEvent;
import com.homestock.item.ItemEventRepository;
import com.homestock.item.ItemRepository;
import com.homestock.item.Unit;
import com.homestock.sync.SyncDtos.EventPayload;
import com.homestock.sync.SyncDtos.ItemPayload;
import com.homestock.sync.SyncDtos.SyncRequest;

/**
 * What a phone that has been in a pocket all afternoon does to the server.
 */
class SyncServiceTest {

    private static final Long USER = 7L;
    private static final Instant NOON = Instant.parse("2026-09-22T12:00:00Z");

    private ItemRepository items;
    private ItemEventRepository events;
    private SyncService service;
    private Item eggs;

    @BeforeEach
    void setUp() {
        items = Mockito.mock(ItemRepository.class);
        events = Mockito.mock(ItemEventRepository.class);
        service = new SyncService(items, events);

        eggs = new Item();
        eggs.setId(UUID.randomUUID());
        eggs.setUserId(USER);
        eggs.setName("Eggs");
        eggs.setQuantity(new BigDecimal("3"));
        eggs.setUpdatedAt(NOON);

        when(items.findByIdAndUserId(eggs.getId(), USER)).thenReturn(Optional.of(eggs));
        when(items.save(any(Item.class))).thenAnswer(call -> call.getArgument(0));
        when(items.findByUserId(anyLong())).thenReturn(List.of(eggs));
        when(events.findByUserId(anyLong())).thenReturn(List.of());
        when(events.findExistingIds(any())).thenReturn(Set.of());
    }

    private EventPayload consume(String delta, Instant at) {
        return new EventPayload(UUID.randomUUID(), eggs.getId(), EventType.CONSUME,
                new BigDecimal(delta), null, null, at);
    }

    private SyncDtos.SyncResponse push(List<EventPayload> payloads) {
        return service.sync(USER, new SyncRequest(null, List.of(), payloads));
    }

    @Test
    void aBatchOfOfflineTapsIsAppliedInTheOrderTheyHappened() {
        push(List.of(consume("-1", NOON.plus(2, ChronoUnit.MINUTES)),
                     consume("-1", NOON.plus(1, ChronoUnit.MINUTES))));

        assertThat(eggs.getQuantity()).isEqualByComparingTo("1");
    }

    @Test
    void anEventTheServerHasAlreadySeenIsIgnored() {
        EventPayload seen = consume("-1", NOON);
        when(events.findExistingIds(any())).thenReturn(Set.of(seen.id()));

        push(List.of(seen));

        assertThat(eggs.getQuantity()).isEqualByComparingTo("3");
        verify(events, never()).save(any());
    }

    @Test
    void usingTheLastOfSomethingTwiceRejectsTheSecondInsteadOfRetryingForever() {
        var first = consume("-3", NOON);
        var second = consume("-1", NOON.plus(1, ChronoUnit.MINUTES));

        var response = push(List.of(first, second));

        assertThat(eggs.getQuantity()).isEqualByComparingTo("0");
        assertThat(response.rejected()).singleElement()
                .satisfies(r -> assertThat(r.id()).isEqualTo(second.id()));
    }

    @Test
    void anOverConsumeStoresOnlyWhatWasThere() {
        push(List.of(consume("-999", NOON)));

        ArgumentCaptor<ItemEvent> saved = ArgumentCaptor.forClass(ItemEvent.class);
        verify(events).save(saved.capture());
        assertThat(saved.getValue().getQuantityDelta()).isEqualByComparingTo("-3");
        assertThat(eggs.getQuantity()).isEqualByComparingTo("0");
    }

    @Test
    void aStaleItemEditDoesNotOverwriteANewerServerOne() {
        eggs.setName("Eggs, large");
        eggs.setUpdatedAt(NOON.plus(1, ChronoUnit.HOURS));

        service.sync(USER, new SyncRequest(null,
                List.of(new ItemPayload(eggs.getId(), "Eggs", null, Unit.PIECE, null, false, NOON)),
                List.of()));

        assertThat(eggs.getName()).isEqualTo("Eggs, large");
    }

    @Test
    void aNewerItemEditFromTheDeviceWins() {
        service.sync(USER, new SyncRequest(null,
                List.of(new ItemPayload(eggs.getId(), "Free-range eggs", "Fridge", Unit.PIECE,
                        new BigDecimal("6"), false, NOON.plus(1, ChronoUnit.HOURS))),
                List.of()));

        assertThat(eggs.getName()).isEqualTo("Free-range eggs");
        assertThat(eggs.getLowThreshold()).isEqualByComparingTo("6");
    }

    /** The cursor must not sit after rows this very call wrote, or they'd never be pulled. */
    @Test
    void theCursorIsTakenBeforeAnythingIsWritten() {
        Instant before = Instant.now();
        var response = push(List.of(consume("-1", NOON)));

        assertThat(response.serverTime()).isBetween(before, Instant.now());
    }
}
