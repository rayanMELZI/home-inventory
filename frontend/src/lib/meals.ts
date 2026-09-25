"use client";

import { api } from "./api";
import { getMeta, setMeta } from "./db";

export interface Suggestion {
  title: string;
  minutes: number;
  uses: string[];
  missing: string[];
  steps: string[];
}

export interface SuggestionsResponse {
  suggestions: Suggestion[];
  note: string | null;
}

/** What was suggested last time, kept so the page has something to show offline. */
interface CachedSuggestions extends SuggestionsResponse {
  askedAt: string;
}

const CACHE_KEY = "lastSuggestions";

export async function askForSuggestions(): Promise<CachedSuggestions> {
  const response = await api<SuggestionsResponse>("/api/meals/suggest", { method: "POST" });
  const cached: CachedSuggestions = { ...response, askedAt: new Date().toISOString() };
  // Only worth keeping if it actually said something useful.
  if (response.suggestions.length > 0) await setMeta(CACHE_KEY, cached);
  return cached;
}

export async function lastSuggestions(): Promise<CachedSuggestions | null> {
  return (await getMeta<CachedSuggestions>(CACHE_KEY)) ?? null;
}
