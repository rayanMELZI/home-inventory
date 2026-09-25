package com.homestock.meal;

import static org.assertj.core.api.Assertions.assertThat;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

import org.junit.jupiter.api.Test;

import com.homestock.item.Item;
import com.homestock.item.Unit;

class MealPromptTest {

    private static Item item(String name, String quantity, Unit unit) {
        Item item = new Item();
        item.setId(UUID.randomUUID());
        item.setName(name);
        item.setUnit(unit);
        item.setQuantity(new BigDecimal(quantity));
        return item;
    }

    @Test
    void namesEachThingWithItsAmountAndUnit() {
        String prompt = MealPrompt.forItems(List.of(
                item("Eggs", "6", Unit.PIECE),
                item("Rice", "2000", Unit.G),
                item("Milk", "500", Unit.ML)));

        assertThat(prompt).contains("- Eggs (6)", "- Rice (2000g)", "- Milk (500ml)");
    }

    /** An empty jar is not an ingredient, and offering it produces nonsense. */
    @Test
    void leavesOutAnythingThereIsNoneOf() {
        String prompt = MealPrompt.forItems(List.of(
                item("Eggs", "6", Unit.PIECE),
                item("Flour", "0", Unit.G)));

        assertThat(prompt).contains("Eggs").doesNotContain("Flour");
    }

    @Test
    void doesNotPrintTrailingZerosFromTheDatabaseScale() {
        String prompt = MealPrompt.forItems(List.of(item("Onions", "4.000", Unit.PIECE)));

        assertThat(prompt).contains("- Onions (4)").doesNotContain("4.000");
    }

    @Test
    void stillAsksTheQuestionWhenThePantryIsEmpty() {
        assertThat(MealPrompt.forItems(List.of())).contains("What they have:");
    }
}
