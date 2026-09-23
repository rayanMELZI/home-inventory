package com.homestock.item;

import java.time.Instant;
import java.util.Collection;
import java.util.List;
import java.util.Set;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

public interface ItemEventRepository extends JpaRepository<ItemEvent, UUID> {

    List<ItemEvent> findTop50ByItemIdOrderByOccurredAtDesc(UUID itemId);

    List<ItemEvent> findByUserId(Long userId);

    List<ItemEvent> findByUserIdAndCreatedAtAfter(Long userId, Instant since);

    /** Which of these ids the server has already seen, in one query. */
    @Query("SELECT e.id FROM ItemEvent e WHERE e.id IN :ids")
    Set<UUID> findExistingIds(Collection<UUID> ids);
}
