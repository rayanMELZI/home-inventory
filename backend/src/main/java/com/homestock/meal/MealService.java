package com.homestock.meal;

import java.util.List;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.homestock.item.Item;
import com.homestock.item.ItemRepository;
import com.homestock.meal.MealDtos.SuggestionsResponse;

@Service
public class MealService {

    private final ItemRepository itemRepository;
    private final MealSuggestClient client;

    public MealService(ItemRepository itemRepository, MealSuggestClient client) {
        this.itemRepository = itemRepository;
        this.client = client;
    }

    /**
     * Every failure here comes back as an empty list and a sentence, never as
     * an error status. This is one button on a screen whose whole job is to be
     * pressed on a whim — a red banner for "the model was busy" would train
     * the user to stop pressing it.
     */
    @Transactional(readOnly = true)
    public SuggestionsResponse suggest(Long userId) {
        if (!client.isEnabled()) {
            return new SuggestionsResponse(List.of(),
                    "Meal suggestions are switched off — no API key is configured.");
        }

        List<Item> items = itemRepository.findByUserIdAndArchivedFalseOrderByNameAsc(userId).stream()
                .filter(item -> item.getQuantity().signum() > 0)
                .toList();

        if (items.isEmpty()) {
            return new SuggestionsResponse(List.of(),
                    "There is nothing in your pantry yet, so there is nothing to cook.");
        }

        try {
            List<MealDtos.Suggestion> suggestions = client.suggest(MealPrompt.forItems(items));
            if (suggestions.isEmpty()) {
                return new SuggestionsResponse(List.of(),
                        "Nothing sensible came out of what you have. Worth a shop.");
            }
            return new SuggestionsResponse(suggestions, null);
        } catch (RuntimeException e) {
            return new SuggestionsResponse(List.of(), "Could not reach the model. Try again.");
        }
    }
}
