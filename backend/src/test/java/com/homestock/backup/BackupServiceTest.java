package com.homestock.backup;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;

import com.homestock.backup.BackupDtos.Backup;
import com.homestock.backup.BackupDtos.BackupEvent;
import com.homestock.backup.BackupDtos.BackupItem;
import com.homestock.common.ApiException;
import com.homestock.item.EventType;
import com.homestock.item.Item;
import com.homestock.item.ItemEvent;
import com.homestock.item.ItemEventRepository;
import com.homestock.item.ItemRepository;
import com.homestock.item.Unit;
import com.homestock.user.User;
import com.homestock.user.UserRepository;

/**
 * A backup is only worth having if restoring it twice is the same as
 * restoring it once, so that is most of what these check.
 */
class BackupServiceTest {

    private static final Long USER = 7L;
    private static final Instant NOON = Instant.parse("2026-09-25T12:00:00Z");

    private UserRepository users;
    private ItemRepository items;
    private ItemEventRepository events;
    private BackupService service;

    @BeforeEach
    void setUp() {
        users = Mockito.mock(UserRepository.class);
        items = Mockito.mock(ItemRepository.class);
        events = Mockito.mock(ItemEventRepository.class);
        service = new BackupService(users, items, events);

        User user = new User();
        user.setUsername("Rayane");
        user.setEmail("rayane@example.com");
        when(users.findById(USER)).thenReturn(Optional.of(user));
        when(items.save(any(Item.class))).thenAnswer(call -> call.getArgument(0));
        when(items.findByIdAndUserId(any(), anyLong())).thenReturn(Optional.empty());
        when(events.existsById(any())).thenReturn(false);
        when(events.findTotalDeltaForItem(any())).thenReturn(BigDecimal.ZERO);
    }

    private static Item storedItem(UUID id, String name, boolean archived) {
        Item item = new Item();
        item.setId(id);
        item.setUserId(USER);
        item.setName(name);
        item.setUnit(Unit.PIECE);
        item.setQuantity(new BigDecimal("3"));
        item.setArchived(archived);
        item.setUpdatedAt(NOON);
        return item;
    }

    private static BackupItem fileItem(UUID id, Instant updatedAt) {
        return new BackupItem(id, "Eggs", "Fridge", Unit.PIECE, new BigDecimal("4"), false, updatedAt);
    }

    private static BackupEvent fileEvent(UUID id, UUID itemId, String delta) {
        return new BackupEvent(id, itemId, EventType.PURCHASE, new BigDecimal(delta),
                null, null, NOON);
    }

    /* ----------------------------------------------------------- exporting */

    @Test
    void anExportCarriesTheAccountItsItemsAndItsEvents() {
        UUID id = UUID.randomUUID();
        when(items.findByUserId(USER)).thenReturn(List.of(storedItem(id, "Eggs", false)));
        ItemEvent event = new ItemEvent();
        event.setId(UUID.randomUUID());
        event.setItemId(id);
        event.setType(EventType.PURCHASE);
        event.setQuantityDelta(new BigDecimal("3"));
        event.setOccurredAt(NOON);
        when(events.findByUserId(USER)).thenReturn(List.of(event));

        Backup backup = service.export(USER);

        assertThat(backup.account().email()).isEqualTo("rayane@example.com");
        assertThat(backup.items()).hasSize(1);
        assertThat(backup.events()).hasSize(1);
        assertThat(backup.version()).isEqualTo(BackupService.FORMAT_VERSION);
    }

    /** Dropping what you deleted would make it a backup of the present, not the past. */
    @Test
    void anExportIncludesArchivedItems() {
        when(items.findByUserId(USER))
                .thenReturn(List.of(storedItem(UUID.randomUUID(), "Old thing", true)));
        when(events.findByUserId(USER)).thenReturn(List.of());

        assertThat(service.export(USER).items()).singleElement()
                .satisfies(item -> assertThat(item.archived()).isTrue());
    }

    /* ----------------------------------------------------------- restoring */

    @Test
    void restoringIntoAnEmptyAccountAddsEverything() {
        UUID itemId = UUID.randomUUID();
        var result = service.restore(USER, new Backup(1, NOON, null,
                List.of(fileItem(itemId, NOON)),
                List.of(fileEvent(UUID.randomUUID(), itemId, "6"))));

        assertThat(result.itemsAdded()).isEqualTo(1);
        // The item is found on the second lookup, once it has been saved.
        assertThat(result.eventsAdded() + result.skipped()).isEqualTo(1);
    }

    @Test
    void anEventAlreadyPresentIsSkippedRatherThanDuplicated() {
        UUID itemId = UUID.randomUUID();
        UUID eventId = UUID.randomUUID();
        when(items.findByIdAndUserId(itemId, USER))
                .thenReturn(Optional.of(storedItem(itemId, "Eggs", false)));
        when(events.existsById(eventId)).thenReturn(true);

        var result = service.restore(USER, new Backup(1, NOON, null,
                List.of(), List.of(fileEvent(eventId, itemId, "6"))));

        assertThat(result.eventsAdded()).isZero();
        assertThat(result.skipped()).isEqualTo(1);
        verify(events, never()).save(any());
    }

    @Test
    void anOlderFileDoesNotOverwriteANewerItem() {
        UUID itemId = UUID.randomUUID();
        Item current = storedItem(itemId, "Eggs, large", false);
        current.setUpdatedAt(NOON.plus(1, ChronoUnit.HOURS));
        when(items.findByIdAndUserId(itemId, USER)).thenReturn(Optional.of(current));

        service.restore(USER, new Backup(1, NOON, null, List.of(fileItem(itemId, NOON)), List.of()));

        assertThat(current.getName()).isEqualTo("Eggs, large");
    }

    @Test
    void anEventWhoseItemIsNowhereToBeFoundIsSkipped() {
        var result = service.restore(USER, new Backup(1, NOON, null,
                List.of(), List.of(fileEvent(UUID.randomUUID(), UUID.randomUUID(), "6"))));

        assertThat(result.skipped()).isEqualTo(1);
        verify(events, never()).save(any());
    }

    /** A file cannot assert a total its own history does not support. */
    @Test
    void quantitiesAreRecomputedFromTheEventsNotTakenFromTheFile() {
        UUID itemId = UUID.randomUUID();
        Item stored = storedItem(itemId, "Eggs", false);
        when(items.findByIdAndUserId(itemId, USER)).thenReturn(Optional.of(stored));
        when(events.findTotalDeltaForItem(itemId)).thenReturn(new BigDecimal("11"));

        service.restore(USER, new Backup(1, NOON, null,
                List.of(), List.of(fileEvent(UUID.randomUUID(), itemId, "6"))));

        assertThat(stored.getQuantity()).isEqualByComparingTo("11");
    }

    @Test
    void aFileFromANewerVersionIsRefusedRatherThanHalfRead() {
        assertThatThrownBy(() -> service.restore(USER,
                new Backup(BackupService.FORMAT_VERSION + 1, NOON, null, List.of(), List.of())))
                .isInstanceOf(ApiException.class)
                .hasMessageContaining("newer version");
    }

    @Test
    void missingListsAreTreatedAsEmptyRatherThanCrashing() {
        assertThat(service.restore(USER, new Backup(1, NOON, null, null, null)).itemsAdded())
                .isZero();
    }
}
