"use client";

import { allEvents, localItems } from "./db";
import type { Item } from "./types";

/**
 * What things cost, worked out from the same event log everything else uses.
 *
 * Deliberately computed here rather than by an endpoint: the device already
 * holds every event, so this works with the server down and needs no second
 * table to keep in step with the first.
 */

export interface CategoryTotal {
  category: string;
  spent: number;
  earned: number;
}

export interface MonthSummary {
  month: string;
  spent: number;
  earned: number;
  wasted: number;
  byCategory: CategoryTotal[];
}

const UNCATEGORISED = "Uncategorised";

/** `month` is YYYY-MM in local time — "this month" should mean the user's month. */
export function currentMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function monthOf(iso: string): string {
  const date = new Date(iso);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

export async function summariseMonth(month: string = currentMonth()): Promise<MonthSummary> {
  const [events, items] = await Promise.all([allEvents(), localItems()]);
  const byId = new Map<string, Item>(items.map((item) => [item.id, item]));

  let spent = 0;
  let earned = 0;
  let wasted = 0;
  const categories = new Map<string, CategoryTotal>();

  for (const event of events) {
    if (monthOf(event.occurredAt) !== month) continue;

    const category = byId.get(event.itemId)?.category ?? UNCATEGORISED;
    const bucket = categories.get(category) ?? { category, spent: 0, earned: 0 };

    // Only the two types that carry money move money. A CONSUME has no price
    // by construction — see EventType.carriesMoney on the server. The stored
    // figure is already the line total, so there is nothing to multiply.
    if (event.totalPrice != null) {
      if (event.type === "PURCHASE") {
        spent += event.totalPrice;
        bucket.spent += event.totalPrice;
      } else if (event.type === "SELL") {
        earned += event.totalPrice;
        bucket.earned += event.totalPrice;
      }
    }

    // Thrown away is not money out — it was already paid for — but it is the
    // number most worth seeing, so it is counted separately.
    if (event.type === "DISCARD") wasted += Math.abs(event.quantityDelta);

    categories.set(category, bucket);
  }

  return {
    month,
    spent,
    earned,
    wasted,
    byCategory: [...categories.values()]
      .filter((c) => c.spent > 0 || c.earned > 0)
      .sort((a, b) => b.spent - a.spent),
  };
}

export function formatMoney(amount: number): string {
  return amount.toFixed(2);
}
