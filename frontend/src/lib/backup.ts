"use client";

import { api } from "./api";

export interface ImportResult {
  itemsAdded: number;
  itemsUpdated: number;
  eventsAdded: number;
  skipped: number;
}

/**
 * Downloads the whole account as a file.
 *
 * Deliberately a plain fetch of JSON turned into a Blob rather than pointing
 * the browser at the URL: the access token lives in memory and never in a
 * cookie the browser would attach to a navigation, so a link would come back
 * 401.
 */
export async function downloadBackup(): Promise<void> {
  const backup = await api<unknown>("/api/backup/export");
  const blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `homestock-${new Date().toISOString().slice(0, 10)}.json`;
  link.click();
  URL.revokeObjectURL(url);
}

export async function restoreBackup(file: File): Promise<ImportResult> {
  const text = await file.text();
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error("That file isn't readable JSON.");
  }
  return api<ImportResult>("/api/backup/import", { method: "POST", body: parsed });
}
