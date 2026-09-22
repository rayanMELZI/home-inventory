package com.homestock.item;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

public interface ItemRepository extends JpaRepository<Item, UUID> {

    List<Item> findByUserIdAndArchivedFalseOrderByNameAsc(Long userId);

    Optional<Item> findByIdAndUserId(UUID id, Long userId);

    boolean existsByUserIdAndArchivedFalseAndNameIgnoreCase(Long userId, String name);

    /** Autocomplete for the add form: names this person has used before, archived or not. */
    List<Item> findTop8ByUserIdAndNameContainingIgnoreCaseOrderByNameAsc(Long userId, String fragment);
}
