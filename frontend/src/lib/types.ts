/** Mirrors com.homestock.auth.AuthDtos.UserInfo. */
export interface UserInfo {
  id: number;
  username: string;
  email: string;
  timezone: string;
}

/** Mirrors com.homestock.item.Unit. */
export type Unit = "PIECE" | "G" | "ML";

/** Mirrors com.homestock.item.EventType. */
export type EventType = "PURCHASE" | "CONSUME" | "DISCARD" | "SELL" | "ADJUST";

/** Mirrors ItemDtos.ItemResponse. `low` is computed server-side. */
export interface Item {
  id: string;
  name: string;
  category: string | null;
  unit: Unit;
  quantity: number;
  lowThreshold: number | null;
  low: boolean;
  /** Kept on disk after removal so a sync can tell "gone" from "never seen". */
  archived: boolean;
  updatedAt: string;
}

/** Mirrors ItemDtos.EventResponse. */
export interface ItemEvent {
  id: string;
  itemId: string;
  type: EventType;
  quantityDelta: number;
  /** What the whole line cost, not a price per unit — see migration V3. */
  totalPrice: number | null;
  note: string | null;
  occurredAt: string;
}

export const UNIT_LABELS: Record<Unit, string> = {
  PIECE: "pieces",
  G: "grams",
  ML: "millilitres",
};

/** The step one tap of + or − moves, per unit. Grams by the 100 beats grams by the 1. */
export const UNIT_STEP: Record<Unit, number> = {
  PIECE: 1,
  G: 100,
  ML: 100,
};

/** "1.5" not "1.500" — trailing zeros make a pantry look like a spreadsheet. */
export function formatQuantity(quantity: number, unit: Unit): string {
  const rounded = Math.round(quantity * 1000) / 1000;
  const number = Number.isInteger(rounded) ? String(rounded) : String(rounded);
  return unit === "PIECE" ? number : `${number} ${unit.toLowerCase()}`;
}
