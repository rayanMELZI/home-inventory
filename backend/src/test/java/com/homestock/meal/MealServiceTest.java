package com.homestock.meal;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;

import com.homestock.item.Item;
import com.homestock.item.ItemRepository;
import com.homestock.item.Unit;
import com.homestock.meal.MealDtos.Suggestion;

/**
 * The rule under test is that this screen never shows an error. Every way the
 * feature can fail has to come back as an empty list and a plain sentence.
 */
class MealServiceTest {

    private ItemRepository items;
    private MealSuggestClient client;
    private MealService service;

    @BeforeEach
    void setUp() {
        items = Mockito.mock(ItemRepository.class);
        client = Mockito.mock(MealSuggestClient.class);
        service = new MealService(items, client);
        when(client.isEnabled()).thenReturn(true);
    }

    private static Item item(String name, String quantity) {
        Item it = new Item();
        it.setId(UUID.randomUUID());
        it.setName(name);
        it.setUnit(Unit.PIECE);
        it.setQuantity(new BigDecimal(quantity));
        return it;
    }

    private void pantry(Item... contents) {
        when(items.findByUserIdAndArchivedFalseOrderByNameAsc(anyLong())).thenReturn(List.of(contents));
    }

    @Test
    void passesTheSuggestionsStraightThroughWhenAllIsWell() {
        pantry(item("Eggs", "6"));
        when(client.suggest(any())).thenReturn(
                List.of(new Suggestion("Omelette", 10, List.of("Eggs"), List.of(), List.of("Beat"))));

        var response = service.suggest(1L);

        assertThat(response.suggestions()).singleElement()
                .satisfies(s -> assertThat(s.title()).isEqualTo("Omelette"));
        assertThat(response.note()).isNull();
    }

    @Test
    void saysSoWhenNoApiKeyIsConfiguredInsteadOfCallingOut() {
        when(client.isEnabled()).thenReturn(false);

        var response = service.suggest(1L);

        assertThat(response.suggestions()).isEmpty();
        assertThat(response.note()).contains("switched off");
        verify(client, never()).suggest(any());
    }

    @Test
    void doesNotAskTheModelAboutAnEmptyPantry() {
        pantry();

        var response = service.suggest(1L);

        assertThat(response.note()).contains("nothing in your pantry");
        verify(client, never()).suggest(any());
    }

    /** Everything on the shelf is at zero, which is the same as an empty pantry. */
    @Test
    void ignoresItemsThereAreNoneOf() {
        pantry(item("Flour", "0"));

        service.suggest(1L);

        verify(client, never()).suggest(any());
    }

    @Test
    void turnsAFailedCallIntoAMessageRatherThanAnError() {
        pantry(item("Eggs", "6"));
        when(client.suggest(any())).thenThrow(new IllegalStateException("upstream is down"));

        var response = service.suggest(1L);

        assertThat(response.suggestions()).isEmpty();
        assertThat(response.note()).contains("Could not reach the model");
    }

    @Test
    void handlesTheModelHonestlyReturningNothing() {
        pantry(item("Eggs", "6"));
        when(client.suggest(any())).thenReturn(List.of());

        assertThat(service.suggest(1L).note()).contains("Worth a shop");
    }
}
