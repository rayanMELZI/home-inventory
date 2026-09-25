package com.homestock.meal;

import java.util.List;

public class MealDtos {

    /**
     * One thing you could cook tonight.
     *
     * `missing` is the honest part: a suggestion that quietly assumes you have
     * garlic is worse than useless at eight in the evening, so anything not in
     * the pantry is named rather than hidden.
     */
    public record Suggestion(
            String title,
            int minutes,
            List<String> uses,
            List<String> missing,
            List<String> steps) {}

    public record SuggestionsResponse(List<Suggestion> suggestions, String note) {}

    private MealDtos() {}
}
