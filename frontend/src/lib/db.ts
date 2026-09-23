"use client";

import { openDB, type DBSchema, type IDBPDatabase } from "idb";
import type { Item, ItemEvent } from "./types";

/**
 * The on-device copy of the pantry.
 *
 * This is the app's real source of truth for reading: every screen renders
 * from here and never waits on the network, which is what lets the whole thing
 * work with the server switched off. It is also, incidentally, a backup —
 * every device that has opened the app holds the full history.
 */

/** Something done locally that the server has not acknowledged yet. */
export interface OutboxEntry {
  id: string;
  kind: "item" | "event";
  /** Sent verbatim in the next sync; shapes match SyncDtos on the server. */
  payload: unknown;
  queuedAt: number;
}

interface HomestockDb extends DBSchema {
  items: { key: string; value: Item };
  events: { key: string; value: ItemEvent; indexes: { byItem: string } };
  outbox: { key: string; value: OutboxEntry };
  meta: { key: string; value: unknown };
}

let dbPromise: Promise<IDBPDatabase<HomestockDb>> | null = null;

function db() {
  dbPromise ??= openDB<HomestockDb>("homestock", 1, {
    upgrade(database) {
      database.createObjectStore("items", { keyPath: "id" });
      const events = database.createObjectStore("events", { keyPath: "id" });
      events.createIndex("byItem", "itemId");
      database.createObjectStore("outbox", { keyPath: "id" });
      database.createObjectStore("meta");
    },
  });
  return dbPromise;
}

/* ------------------------------------------------------------------- items */

/** Archived rows stay on disk so a later sync can tell them apart from unknown ones. */
export async function localItems(): Promise<Item[]> {
  const all = await (await db()).getAll("items");
  return all.filter((item) => !item.archived).sort((a, b) => a.name.localeCompare(b.name));
}

export async function putItems(items: Item[]): Promise<void> {
  const tx = (await db()).transaction("items", "readwrite");
  await Promise.all([...items.map((item) => tx.store.put(item)), tx.done]);
}

export async function getItem(id: string): Promise<Item | undefined> {
  return (await db()).get("items", id);
}

/* ------------------------------------------------------------------ events */

export async function putEvents(events: ItemEvent[]): Promise<void> {
  const tx = (await db()).transaction("events", "readwrite");
  await Promise.all([...events.map((event) => tx.store.put(event)), tx.done]);
}

export async function eventsForItem(itemId: string): Promise<ItemEvent[]> {
  const all = await (await db()).getAllFromIndex("events", "byItem", itemId);
  return all.sort((a, b) => b.occurredAt.localeCompare(a.occurredAt));
}

export async function allEvents(): Promise<ItemEvent[]> {
  return (await db()).getAll("events");
}

/* ------------------------------------------------------------------ outbox */

export async function enqueue(entry: OutboxEntry): Promise<void> {
  await (await db()).put("outbox", entry);
}

/** Oldest first: a tap from this morning should reach the server before one from now. */
export async function pendingEntries(): Promise<OutboxEntry[]> {
  const all = await (await db()).getAll("outbox");
  return all.sort((a, b) => a.queuedAt - b.queuedAt);
}

export async function pendingCount(): Promise<number> {
  return (await db()).count("outbox");
}

export async function dequeue(ids: string[]): Promise<void> {
  const tx = (await db()).transaction("outbox", "readwrite");
  await Promise.all([...ids.map((id) => tx.store.delete(id)), tx.done]);
}

/* -------------------------------------------------------------------- meta */

export async function getMeta<T>(key: string): Promise<T | undefined> {
  return (await db()).get("meta", key) as Promise<T | undefined>;
}

export async function setMeta(key: string, value: unknown): Promise<void> {
  await (await db()).put("meta", value, key);
}

/**
 * Wipe everything. Used when a different account signs in on this device: the
 * pantry on disk belongs to whoever was here last, and it must not leak.
 */
export async function clearLocal(): Promise<void> {
  const database = await db();
  const tx = database.transaction(["items", "events", "outbox", "meta"], "readwrite");
  await Promise.all([
    tx.objectStore("items").clear(),
    tx.objectStore("events").clear(),
    tx.objectStore("outbox").clear(),
    tx.objectStore("meta").clear(),
    tx.done,
  ]);
}
