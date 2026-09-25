"use client";

import { useSyncExternalStore } from "react";
import { api, ApiError } from "./api";
import {
  clearLocal,
  dequeue,
  enqueue,
  getMeta,
  localItems,
  pendingCount,
  pendingEntries,
  putEvents,
  putItems,
  setMeta,
} from "./db";
import type { EventType, Item, ItemEvent, Unit } from "./types";

/**
 * Push what this device did, pull what it missed, in one round trip.
 *
 * The client may guess at totals so the screen responds to a tap instantly,
 * but it never argues with the answer: whatever the server sends back
 * overwrites the local copy. That is what keeps two phones that both used the
 * last of something from settling on different numbers.
 */

interface SyncResponse {
  serverTime: string;
  items: Item[];
  events: ItemEvent[];
  rejected: { id: string; reason: string }[];
}

/* ------------------------------------------------------- a store for the UI */

interface SyncState {
  pending: number;
  syncing: boolean;
  lastSyncedAt: string | null;
  /** Set when the server refused something; shown once, then cleared. */
  lastRejection: string | null;
}

let state: SyncState = { pending: 0, syncing: false, lastSyncedAt: null, lastRejection: null };
const listeners = new Set<() => void>();

function set(patch: Partial<SyncState>) {
  state = { ...state, ...patch };
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

const serverState: SyncState = {
  pending: 0,
  syncing: false,
  lastSyncedAt: null,
  lastRejection: null,
};

export function useSyncState(): SyncState {
  return useSyncExternalStore(
    subscribe,
    () => state,
    () => serverState,
  );
}

export function clearRejection() {
  if (state.lastRejection) set({ lastRejection: null });
}

/* ------------------------------------------------- data changes, done locally */

async function refreshPending() {
  set({ pending: await pendingCount() });
}

/** Applies a delta to the local copy so the screen updates before the network does. */
function optimistic(item: Item, delta: number): Item {
  const quantity = Math.max(0, item.quantity + delta);
  return {
    ...item,
    quantity,
    low: item.lowThreshold != null && quantity <= item.lowThreshold,
  };
}

export interface ItemDraft {
  name: string;
  category: string | null;
  unit: Unit;
  lowThreshold: number | null;
}

export async function saveItemLocally(existing: Item | null, draft: ItemDraft): Promise<Item> {
  const item: Item = {
    id: existing?.id ?? crypto.randomUUID(),
    quantity: existing?.quantity ?? 0,
    archived: false,
    ...draft,
    low: draft.lowThreshold != null && (existing?.quantity ?? 0) <= draft.lowThreshold,
    updatedAt: new Date().toISOString(),
  };
  await putItems([item]);
  await enqueue({ id: `item:${item.id}`, kind: "item", payload: itemPayload(item), queuedAt: Date.now() });
  await refreshPending();
  void sync();
  return item;
}

export async function archiveItemLocally(item: Item): Promise<void> {
  const archived: Item = { ...item, archived: true, updatedAt: new Date().toISOString() };
  await putItems([archived]);
  await enqueue({
    id: `item:${item.id}`,
    kind: "item",
    payload: itemPayload(archived),
    queuedAt: Date.now(),
  });
  await refreshPending();
  void sync();
}

export async function recordEventLocally(
  item: Item,
  type: EventType,
  quantityDelta: number,
  extra: { totalPrice?: number; note?: string } = {},
): Promise<Item> {
  const event: ItemEvent = {
    id: crypto.randomUUID(),
    itemId: item.id,
    type,
    quantityDelta,
    totalPrice: extra.totalPrice ?? null,
    note: extra.note ?? null,
    occurredAt: new Date().toISOString(),
  };
  const updated = optimistic(item, quantityDelta);

  await putEvents([event]);
  await putItems([updated]);
  await enqueue({ id: `event:${event.id}`, kind: "event", payload: event, queuedAt: Date.now() });
  await refreshPending();
  void sync();
  return updated;
}

/** The server sets quantity itself, so it is deliberately not sent. */
function itemPayload(item: Item) {
  return {
    id: item.id,
    name: item.name,
    category: item.category,
    unit: item.unit,
    lowThreshold: item.lowThreshold,
    archived: item.archived,
    updatedAt: item.updatedAt,
  };
}

/* -------------------------------------------------------------------- sync */

let inFlight: Promise<void> | null = null;

/** One sync at a time; a second caller waits on the first rather than racing it. */
export function sync(): Promise<void> {
  inFlight ??= runSync().finally(() => {
    inFlight = null;
  });
  return inFlight;
}

async function runSync(): Promise<void> {
  set({ syncing: true });
  try {
    const queued = await pendingEntries();
    const since = (await getMeta<string>("since")) ?? null;

    const response = await api<SyncResponse>("/api/sync", {
      method: "POST",
      body: {
        since,
        items: queued.filter((e) => e.kind === "item").map((e) => e.payload),
        events: queued.filter((e) => e.kind === "event").map((e) => e.payload),
      },
    });

    // Only the entries actually sent are cleared. Anything queued while this
    // request was in the air stays put and goes out next time.
    await dequeue(queued.map((entry) => entry.id));

    if (response.items.length) await putItems(response.items);
    if (response.events.length) await putEvents(response.events);
    await setMeta("since", response.serverTime);

    await refreshPending();
    set({
      lastSyncedAt: response.serverTime,
      // A rejected event can never succeed on a retry — it was dropped from
      // the outbox above rather than left to block everything behind it.
      lastRejection: response.rejected[0]?.reason ?? null,
    });
  } catch (err) {
    // Offline, or the server is down. The outbox is untouched, so nothing is
    // lost; api.ts has already flipped the app into its offline state.
    if (!(err instanceof ApiError)) throw err;
  } finally {
    set({ syncing: false });
  }
}

/* --------------------------------------------------------- reads, from disk */

export async function loadPantry(): Promise<Item[]> {
  return localItems();
}

export async function localNameSuggestions(fragment: string): Promise<string[]> {
  const needle = fragment.trim().toLowerCase();
  if (needle.length < 2) return [];
  // Answered from disk, so the add form still completes names with no network.
  const items = await localItems();
  return items
    .map((item) => item.name)
    .filter((name) => name.toLowerCase().includes(needle))
    .slice(0, 8);
}

/**
 * Retry on a timer for as long as anything is waiting.
 *
 * Without this the outbox only drains on a page load or a browser "online"
 * event — and that event fires when the network interface comes back, not when
 * the server does. A VM that reboots while the tab sits open on the counter
 * would otherwise go unnoticed until the app was opened again.
 */
const RETRY_MS = 30_000;
let retryTimer: ReturnType<typeof setInterval> | null = null;

function startRetrying() {
  if (retryTimer !== null) return;
  retryTimer = setInterval(() => {
    if (state.pending > 0 && !state.syncing) void sync();
  }, RETRY_MS);
}

/**
 * Called once the signed-in user is known. A different account means the
 * pantry on disk is not theirs, so it goes before anything is read.
 */
export async function openFor(userId: number): Promise<void> {
  const previous = await getMeta<number>("userId");
  if (previous !== undefined && previous !== userId) {
    await clearLocal();
  }
  await setMeta("userId", userId);
  await refreshPending();
  set({ lastSyncedAt: (await getMeta<string>("since")) ?? null });
  startRetrying();
}

export async function forgetLocal(): Promise<void> {
  await clearLocal();
  set({ pending: 0, lastSyncedAt: null, lastRejection: null });
}
