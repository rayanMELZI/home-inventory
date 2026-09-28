package com.homestock.backup;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.UUID;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.homestock.backup.BackupDtos.Account;
import com.homestock.backup.BackupDtos.Backup;
import com.homestock.backup.BackupDtos.BackupEvent;
import com.homestock.backup.BackupDtos.BackupItem;
import com.homestock.backup.BackupDtos.ImportResult;
import com.homestock.common.ApiException;
import com.homestock.item.Item;
import com.homestock.item.ItemEvent;
import com.homestock.item.ItemEventRepository;
import com.homestock.item.ItemRepository;
import com.homestock.user.User;
import com.homestock.user.UserRepository;

@Service
public class BackupService {

    /** Only bumped when an older file could no longer be read correctly. */
    static final int FORMAT_VERSION = 1;

    private final UserRepository userRepository;
    private final ItemRepository itemRepository;
    private final ItemEventRepository eventRepository;

    public BackupService(UserRepository userRepository, ItemRepository itemRepository,
                         ItemEventRepository eventRepository) {
        this.userRepository = userRepository;
        this.itemRepository = itemRepository;
        this.eventRepository = eventRepository;
    }

    @Transactional(readOnly = true)
    public Backup export(Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> ApiException.notFound("User not found"));

        // Archived rows are included deliberately: a backup that quietly drops
        // what you deleted is not a backup of what happened.
        List<BackupItem> items = itemRepository.findByUserId(userId).stream()
                .map(item -> new BackupItem(item.getId(), item.getName(), item.getCategory(),
                        item.getIcon(), item.getUnit(), item.getLowThreshold(), item.isArchived(),
                        item.getUpdatedAt()))
                .toList();

        List<BackupEvent> events = eventRepository.findByUserId(userId).stream()
                .map(event -> new BackupEvent(event.getId(), event.getItemId(), event.getType(),
                        event.getQuantityDelta(), event.getTotalPrice(), event.getNote(),
                        event.getOccurredAt()))
                .toList();

        return new Backup(FORMAT_VERSION, Instant.now(),
                new Account(user.getUsername(), user.getEmail(), user.getTimezone()),
                items, events);
    }

    /**
     * Restores into the signed-in account, merging rather than replacing.
     *
     * Importing the same file twice must land in the same place as importing
     * it once — ids are carried in the file, so anything already present is
     * skipped rather than duplicated. Quantities are recomputed from the
     * events instead of being trusted from the file, which means a backup
     * cannot smuggle in a total that its own history does not support.
     */
    @Transactional
    public ImportResult restore(Long userId, Backup backup) {
        if (backup.version() > FORMAT_VERSION) {
            throw ApiException.badRequest(
                    "That file was written by a newer version of Homestock");
        }

        int added = 0;
        int updated = 0;
        for (BackupItem incoming : nullSafe(backup.items())) {
            Item item = itemRepository.findByIdAndUserId(incoming.id(), userId).orElse(null);
            if (item == null) {
                item = new Item();
                item.setId(incoming.id());
                item.setUserId(userId);
                item.setQuantity(BigDecimal.ZERO);
                added++;
            } else if (!incoming.updatedAt().isAfter(item.getUpdatedAt())) {
                continue;
            } else {
                updated++;
            }
            item.setName(incoming.name());
            item.setCategory(incoming.category());
            item.setIcon(incoming.icon());
            item.setUnit(incoming.unit());
            item.setLowThreshold(incoming.lowThreshold());
            item.setArchived(incoming.archived());
            item.setUpdatedAt(incoming.updatedAt());
            itemRepository.save(item);
        }

        int eventsAdded = 0;
        int skipped = 0;
        Set<UUID> touched = new HashSet<>();
        for (BackupEvent incoming : nullSafe(backup.events())) {
            if (eventRepository.existsById(incoming.id())) {
                skipped++;
                continue;
            }
            Item item = itemRepository.findByIdAndUserId(incoming.itemId(), userId).orElse(null);
            if (item == null) {
                // An event whose item is not in the file and not in the account
                // has nothing to attach to.
                skipped++;
                continue;
            }
            ItemEvent event = new ItemEvent();
            event.setId(incoming.id());
            event.setUserId(userId);
            event.setItemId(incoming.itemId());
            event.setType(incoming.type());
            event.setQuantityDelta(incoming.quantityDelta());
            event.setTotalPrice(incoming.totalPrice());
            event.setNote(incoming.note());
            event.setOccurredAt(incoming.occurredAt());
            eventRepository.save(event);
            touched.add(item.getId());
            eventsAdded++;
        }

        recomputeQuantities(userId, touched);
        return new ImportResult(added, updated, eventsAdded, skipped);
    }

    /** The ledger is the truth; the running total is just its sum. */
    private void recomputeQuantities(Long userId, Set<UUID> itemIds) {
        for (UUID itemId : itemIds) {
            Item item = itemRepository.findByIdAndUserId(itemId, userId).orElse(null);
            if (item == null) {
                continue;
            }
            BigDecimal total = eventRepository.findTotalDeltaForItem(itemId);
            item.setQuantity(total == null ? BigDecimal.ZERO : total.max(BigDecimal.ZERO));
            itemRepository.save(item);
        }
    }

    private static <T> List<T> nullSafe(List<T> list) {
        return list == null ? List.of() : list;
    }
}
