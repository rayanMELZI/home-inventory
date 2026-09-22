"use client";

import { Minus, Pencil, Plus } from "lucide-react";
import { UNIT_STEP, formatQuantity, type Item } from "@/lib/types";

/**
 * One item, and the two buttons that are the whole point of the app.
 *
 * A tap on − or + records a CONSUME or a PURCHASE straight away: no dialog, no
 * confirm, no quantity field. Anything slower than one tap and the pantry stops
 * matching the kitchen within a week, which makes every other feature a lie.
 */
export function ItemCard({
  item,
  busy,
  onStep,
  onEdit,
}: {
  item: Item;
  busy: boolean;
  onStep: (item: Item, delta: number) => void;
  onEdit: (item: Item) => void;
}) {
  const step = UNIT_STEP[item.unit];
  const empty = item.quantity <= 0;

  return (
    <div
      className={`card flex items-center gap-3 p-3.5 ${
        item.low ? "border-accent/60" : ""
      }`}
    >
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="truncate font-medium">{item.name}</span>
          {item.low && (
            <span className="shrink-0 rounded-full bg-accent-soft px-2 py-0.5 text-[11px] font-medium text-accent-ink">
              low
            </span>
          )}
        </div>
        <p className="mt-0.5 text-sm tabular-nums text-ink-soft">
          {empty ? "none left" : formatQuantity(item.quantity, item.unit)}
          {item.category && <span className="text-ink-faint"> · {item.category}</span>}
        </p>
      </div>

      <button
        type="button"
        className="btn-icon"
        aria-label={`Edit ${item.name}`}
        onClick={() => onEdit(item)}
      >
        <Pencil size={16} />
      </button>

      <div className="flex shrink-0 items-center gap-1.5">
        <button
          type="button"
          className="btn btn-ghost h-11 w-11 p-0"
          aria-label={`Use one ${item.name}`}
          disabled={busy || empty}
          onClick={() => onStep(item, -step)}
        >
          <Minus size={18} />
        </button>
        <button
          type="button"
          className="btn btn-primary h-11 w-11 p-0"
          aria-label={`Add one ${item.name}`}
          disabled={busy}
          onClick={() => onStep(item, step)}
        >
          <Plus size={18} />
        </button>
      </div>
    </div>
  );
}
