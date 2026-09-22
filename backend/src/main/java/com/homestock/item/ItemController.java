package com.homestock.item;

import java.util.List;
import java.util.UUID;

import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import com.homestock.auth.CurrentUser;
import com.homestock.item.ItemDtos.EventRequest;
import com.homestock.item.ItemDtos.EventResponse;
import com.homestock.item.ItemDtos.ItemRequest;
import com.homestock.item.ItemDtos.ItemResponse;

import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/items")
public class ItemController {

    private final ItemService itemService;

    public ItemController(ItemService itemService) {
        this.itemService = itemService;
    }

    @GetMapping
    public List<ItemResponse> list(@AuthenticationPrincipal CurrentUser user) {
        return itemService.list(user.id());
    }

    @GetMapping("/suggest")
    public List<String> suggest(@AuthenticationPrincipal CurrentUser user,
                                @RequestParam String q) {
        return itemService.suggestNames(user.id(), q);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public ItemResponse create(@AuthenticationPrincipal CurrentUser user,
                               @Valid @RequestBody ItemRequest request) {
        return itemService.create(user.id(), request);
    }

    @PutMapping("/{id}")
    public ItemResponse update(@AuthenticationPrincipal CurrentUser user,
                               @PathVariable UUID id,
                               @Valid @RequestBody ItemRequest request) {
        return itemService.update(user.id(), id, request);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void archive(@AuthenticationPrincipal CurrentUser user, @PathVariable UUID id) {
        itemService.archive(user.id(), id);
    }

    @PostMapping("/{id}/events")
    public ItemResponse recordEvent(@AuthenticationPrincipal CurrentUser user,
                                    @PathVariable UUID id,
                                    @Valid @RequestBody EventRequest request) {
        return itemService.applyEvent(user.id(), id, request);
    }

    @GetMapping("/{id}/events")
    public List<EventResponse> history(@AuthenticationPrincipal CurrentUser user,
                                       @PathVariable UUID id) {
        return itemService.history(user.id(), id);
    }
}
