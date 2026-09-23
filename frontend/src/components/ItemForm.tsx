"use client";

import { useEffect, useState, type FormEvent } from "react";
import { Trash2 } from "lucide-react";
import { Modal } from "@/components/Modal";
import { Segmented } from "@/components/ui/Segmented";
import { ApiError } from "@/lib/api";
import { localNameSuggestions, type ItemDraft } from "@/lib/sync";
import { UNIT_LABELS, type Item, type Unit } from "@/lib/types";

const UNITS: { value: Unit; label: string }[] = [
  { value: "PIECE", label: "Pieces" },
  { value: "G", label: "Grams" },
  { value: "ML", label: "ml" },
];

/**
 * Add or edit one item.
 *
 * The fields are seeded once, on mount: the parent gives this a fresh `key`
 * every time the sheet opens, so a cancelled edit cannot leak into the next
 * one without an effect that writes state on every render.
 */
export function ItemForm({
  open,
  item,
  onClose,
  onSave,
  onArchive,
}: {
  open: boolean;
  /** Null when adding, the item being changed when editing. */
  item: Item | null;
  onClose: () => void;
  onSave: (draft: ItemDraft) => Promise<void>;
  onArchive: (item: Item) => Promise<void>;
}) {
  const [name, setName] = useState(item?.name ?? "");
  const [category, setCategory] = useState(item?.category ?? "");
  const [unit, setUnit] = useState<Unit>(item?.unit ?? "PIECE");
  const [lowThreshold, setLowThreshold] = useState(
    item?.lowThreshold != null ? String(item.lowThreshold) : "",
  );
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const typed = name.trim();
  const wantsSuggestions = !item && typed.length >= 2;

  // Autocomplete over things already owned: the same yoghurt gets typed a
  // hundred times, and one typo forks it into two half-tracked items.
  useEffect(() => {
    if (!wantsSuggestions) return;
    let cancelled = false;
    const timer = setTimeout(() => {
      localNameSuggestions(typed)
        .then((names) => {
          if (!cancelled) setSuggestions(names);
        })
        .catch(() => {
          /* a convenience; a failure here must never block typing */
        });
    }, 200);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [typed, wantsSuggestions]);

  // Held in state but filtered at render, so a name shrinking back below two
  // characters hides stale matches without writing state from an effect.
  const shown = wantsSuggestions
    ? suggestions.filter((n) => n.toLowerCase() !== typed.toLowerCase())
    : [];

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const parsed = lowThreshold.trim() === "" ? null : Number(lowThreshold);
      await onSave({
        name: typed,
        category: category.trim() === "" ? null : category.trim(),
        unit,
        lowThreshold: parsed != null && Number.isFinite(parsed) ? parsed : null,
      });
      onClose();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong");
      setBusy(false);
    }
  }

  async function onRemove(target: Item) {
    setBusy(true);
    try {
      await onArchive(target);
      onClose();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong");
      setBusy(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose}>
      <form onSubmit={onSubmit} className="space-y-4">
        <h2 className="text-lg font-semibold">{item ? "Edit item" : "Add to pantry"}</h2>

        {error && (
          <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/50 dark:text-red-300">
            {error}
          </p>
        )}

        <label className="block">
          <span className="field-label">Name</span>
          <input
            autoFocus
            required
            maxLength={80}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Eggs"
            className="field mt-1"
          />
        </label>

        {shown.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {shown.map((suggestion) => (
              <button
                key={suggestion}
                type="button"
                onClick={() => setName(suggestion)}
                className="rounded-full border border-line-strong px-2.5 py-1 text-xs text-ink-soft hover:bg-surface-sunken hover:text-ink"
              >
                {suggestion}
              </button>
            ))}
          </div>
        )}

        <label className="block">
          <span className="field-label">Category</span>
          <input
            maxLength={40}
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            placeholder="Fridge"
            className="field mt-1"
          />
        </label>

        <div>
          <span className="field-label">Counted in</span>
          <div className="mt-1.5">
            <Segmented value={unit} onChange={setUnit} options={UNITS} ariaLabel="Unit" />
          </div>
        </div>

        <label className="block">
          <span className="field-label">Tell me when it drops to</span>
          <input
            type="number"
            min={0}
            step="any"
            inputMode="decimal"
            value={lowThreshold}
            onChange={(e) => setLowThreshold(e.target.value)}
            placeholder="Leave empty for never"
            className="field mt-1"
          />
          <span className="mt-1 block text-xs text-ink-faint">
            In {UNIT_LABELS[unit]}. At or below this it lands on the shopping list.
          </span>
        </label>

        <div className="flex items-center gap-2 pt-1">
          <button disabled={busy} className="btn btn-primary flex-1">
            {busy ? "Saving…" : item ? "Save" : "Add"}
          </button>
          <button type="button" onClick={onClose} className="btn btn-ghost">
            Cancel
          </button>
          {item && (
            <button
              type="button"
              className="btn-icon text-red-600 hover:bg-red-50 dark:hover:bg-red-950/50"
              aria-label={`Remove ${item.name}`}
              disabled={busy}
              onClick={() => onRemove(item)}
            >
              <Trash2 size={16} />
            </button>
          )}
        </div>
      </form>
    </Modal>
  );
}
