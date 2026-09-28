package com.homestock.item;

import static org.assertj.core.api.Assertions.assertThat;

import java.math.BigDecimal;

import org.junit.jupiter.api.Test;

/** "Low" decides what lands on the shopping list, so its boundary is pinned here. */
class ItemDtosTest {

    private static Item eggs(String quantity, String threshold) {
        Item item = new Item();
        item.setName("Eggs");
        item.setQuantity(new BigDecimal(quantity));
        item.setLowThreshold(threshold == null ? null : new BigDecimal(threshold));
        return item;
    }

    @Test
    void exactlyAtTheThresholdIsNotLow() {
        assertThat(ItemDtos.toResponse(eggs("2", "2")).low()).isFalse();
    }

    @Test
    void belowTheThresholdIsLow() {
        assertThat(ItemDtos.toResponse(eggs("1", "2")).low()).isTrue();
    }

    @Test
    void noThresholdIsNeverLow() {
        assertThat(ItemDtos.toResponse(eggs("0", null)).low()).isFalse();
    }
}
