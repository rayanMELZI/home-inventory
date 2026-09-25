package com.homestock.meal;

import java.math.BigDecimal;
import java.util.List;
import java.util.stream.Collectors;

import com.homestock.item.Item;

/**
 * Turns a pantry into a question.
 *
 * Kept apart from the HTTP client so the wording — the part that actually
 * decides whether the answers are any good — can be read and tested without a
 * network or an API key.
 */
public final class MealPrompt {

    private static final String TEMPLATE = """
            You are helping someone decide what to cook right now, from what is
            already in their kitchen. Nobody is going to the shop tonight.

            What they have:
            %s

            Suggest up to four things they could actually make. Rules:
            - Strongly prefer dishes needing nothing beyond the list above.
            - Treat salt, pepper, water and cooking oil as always available.
            - If a dish needs one or two other common things, it may still be
              suggested, but every one of them must be listed in "missing".
              Never put something in "missing" that is already in the list above.
            - "uses" must only name things from the list above, spelled the same way.
            - Keep the steps short: a few lines someone can follow while cooking.
            - Be realistic about time. No dish over 45 minutes.
            - Do not invent quantities they do not have.

            If nothing sensible can be made from this, return an empty list
            rather than padding it out.
            """;

    /** Zero-quantity rows are left out: an empty jar is not an ingredient. */
    public static String forItems(List<Item> items) {
        String lines = items.stream()
                .filter(item -> item.getQuantity().signum() > 0)
                .map(MealPrompt::describe)
                .collect(Collectors.joining("\n"));
        return TEMPLATE.formatted(lines);
    }

    private static String describe(Item item) {
        BigDecimal quantity = item.getQuantity().stripTrailingZeros();
        String amount = switch (item.getUnit()) {
            case PIECE -> quantity.toPlainString();
            case G -> quantity.toPlainString() + "g";
            case ML -> quantity.toPlainString() + "ml";
        };
        return "- " + item.getName() + " (" + amount + ")";
    }

    private MealPrompt() {}
}
