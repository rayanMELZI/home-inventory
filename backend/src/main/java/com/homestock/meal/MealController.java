package com.homestock.meal;

import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.homestock.auth.CurrentUser;
import com.homestock.meal.MealDtos.SuggestionsResponse;

@RestController
@RequestMapping("/api/meals")
public class MealController {

    private final MealService mealService;

    public MealController(MealService mealService) {
        this.mealService = mealService;
    }

    /** POST, not GET: it costs a model call and must never be prefetched. */
    @PostMapping("/suggest")
    public SuggestionsResponse suggest(@AuthenticationPrincipal CurrentUser user) {
        return mealService.suggest(user.id());
    }
}
