import { api } from "./api";
import type { EventType, Item, ItemEvent, Unit } from "./types";

export interface ItemDraft {
  name: string;
  category: string | null;
  unit: Unit;
  lowThreshold: number | null;
}

export function listItems(): Promise<Item[]> {
  return api<Item[]>("/api/items");
}

export function suggestNames(fragment: string): Promise<string[]> {
  return api<string[]>(`/api/items/suggest?q=${encodeURIComponent(fragment)}`);
}

export function createItem(draft: ItemDraft): Promise<Item> {
  // The id is minted here, not by the server. Today it only saves a round trip;
  // once the pantry lives in IndexedDB it is what lets an item created with no
  // connection keep the same identity when it finally syncs.
  return api<Item>("/api/items", {
    method: "POST",
    body: { id: crypto.randomUUID(), ...draft },
  });
}

export function updateItem(id: string, draft: ItemDraft): Promise<Item> {
  return api<Item>(`/api/items/${id}`, { method: "PUT", body: draft });
}

export function archiveItem(id: string): Promise<void> {
  return api<void>(`/api/items/${id}`, { method: "DELETE" });
}

export function itemHistory(id: string): Promise<ItemEvent[]> {
  return api<ItemEvent[]>(`/api/items/${id}/events`);
}

/** Records one thing that happened and returns the item with its new total. */
export function recordEvent(
  itemId: string,
  type: EventType,
  quantityDelta: number,
  extra: { unitPrice?: number; note?: string } = {},
): Promise<Item> {
  return api<Item>(`/api/items/${itemId}/events`, {
    method: "POST",
    body: {
      id: crypto.randomUUID(),
      type,
      quantityDelta,
      occurredAt: new Date().toISOString(),
      ...extra,
    },
  });
}
