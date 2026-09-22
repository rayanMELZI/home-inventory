package com.homestock.item;

import java.util.List;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

public interface ItemEventRepository extends JpaRepository<ItemEvent, UUID> {

    List<ItemEvent> findTop50ByItemIdOrderByOccurredAtDesc(UUID itemId);
}
