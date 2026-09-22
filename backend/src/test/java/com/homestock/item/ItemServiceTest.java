package com.homestock.item;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.math.BigDecimal;
import java.util.Optional;
import java.util.UUID;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.mockito.Mockito;

import com.homestock.common.ApiException;
import com.homestock.item.ItemDtos.EventRequest;

/**
 * The invariant these guard: an item's quantity is exactly the sum of its
 * events' deltas. Nothing may clamp the total without clamping the delta that
 * produced it, or replaying the log on another device stops agreeing.
 */
class ItemServiceTest {

    private static final Long USER = 7L;

    private ItemRepository items;
    private ItemEventRepository events;
    private ItemService service;
    private Item eggs;

    @BeforeEach
    void setUp() {
        items = Mockito.mock(ItemRepository.class);
        events = Mockito.mock(ItemEventRepository.class);
        service = new ItemService(items, events);

        eggs = new Item();
        eggs.setId(UUID.randomUUID());
        eggs.setUserId(USER);
        eggs.setName("Eggs");
        eggs.setQuantity(new BigDecimal("3"));

        when(items.findByIdAndUserId(eggs.getId(), USER)).thenReturn(Optional.of(eggs));
        when(items.save(any(Item.class))).thenAnswer(call -> call.getArgument(0));
        when(events.existsById(any())).thenReturn(false);
    }

    private ItemDtos.ItemResponse consume(String delta) {
        return service.applyEvent(USER, eggs.getId(),
                new EventRequest(UUID.randomUUID(), EventType.CONSUME, new BigDecimal(delta),
                        null, null, null));
    }

    @Test
    void anOrdinaryConsumeSubtractsWhatItSays() {
        assertThat(consume("-1").quantity()).isEqualByComparingTo("2");
    }

    @Test
    void consumingMoreThanExistsStoresOnlyWhatExisted() {
        var response = consume("-999");

        assertThat(response.quantity()).isEqualByComparingTo("0");

        ArgumentCaptor<ItemEvent> saved = ArgumentCaptor.forClass(ItemEvent.class);
        verify(events).save(saved.capture());
        // -3, not -999: the total has to stay a plain sum of the deltas.
        assertThat(saved.getValue().getQuantityDelta()).isEqualByComparingTo("-3");
    }

    @Test
    void consumingFromAnEmptyShelfIsRefusedRatherThanRecordedAsNothing() {
        eggs.setQuantity(BigDecimal.ZERO);

        assertThatThrownBy(() -> consume("-1"))
                .isInstanceOf(ApiException.class)
                .hasMessageContaining("no Eggs left");
        verify(events, never()).save(any());
    }

    @Test
    void replayingAnEventAlreadySeenChangesNothing() {
        UUID seen = UUID.randomUUID();
        when(events.existsById(seen)).thenReturn(true);

        var response = service.applyEvent(USER, eggs.getId(),
                new EventRequest(seen, EventType.CONSUME, new BigDecimal("-1"), null, null, null));

        assertThat(response.quantity()).isEqualByComparingTo("3");
        verify(events, never()).save(any());
    }

    @Test
    void buyingNeverGetsTrimmed() {
        var response = service.applyEvent(USER, eggs.getId(),
                new EventRequest(UUID.randomUUID(), EventType.PURCHASE, new BigDecimal("12"),
                        new BigDecimal("0.30"), null, null));

        assertThat(response.quantity()).isEqualByComparingTo("15");
    }
}
