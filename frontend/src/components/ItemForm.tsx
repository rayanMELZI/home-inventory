"use client";

import { useEffect, useState, type FormEvent } from "react";
import { ImagePlus, Trash2 } from "lucide-react";
import { Modal } from "@/components/Modal";
import { Segmented } from "@/components/ui/Segmented";
import { ApiError } from "@/lib/api";
import { localNameSuggestions, type ItemDraft } from "@/lib/sync";
import { ICON_GROUPS, guessIcon } from "@/lib/icons";
import { UNIT_LABELS, type Item, type Unit } from "@/lib/types";

const UNITS: { value: Unit; label: string }[] = [
  { value: "PIECE", label: "Pieces" },
  { value: "G", label: "Grams" },
  { value: "ML", label: "ml" },
];

/** Select values that are not categories. The empty one is "None". */
const NO_CATEGORY = "";
const NEW_CATEGORY = "__new_category__";

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
  categories,
  onClose,
  onSave,
  onArchive,
}: {
  open: boolean;
  /** Null when adding, the item being changed when editing. */
  item: Item | null;
  /** Categories already in use, offered first so "Fridge" isn't retyped as "fridge". */
  categories: string[];
  onClose: () => void;
  /** `startingQuantity` is only asked for, and only sent, when adding. */
  onSave: (draft: ItemDraft, startingQuantity: number) => Promise<void>;
  onArchive: (item: Item) => Promise<void>;
}) {
  const [name, setName] = useState(item?.name ?? "");
  const [category, setCategory] = useState(item?.category ?? "");
  // Typing is the fallback, not the default: with nothing to pick from yet,
  // the text field is all there is.
  const [typingCategory, setTypingCategory] = useState(categories.length === 0);
  // undefined = "not chosen yet", so the picture follows the name as it is
  // typed; null = deliberately none. Only a real pick stops the guessing.
  const [picked, setPicked] = useState<string | null | undefined>(item?.icon ?? undefined);
  const [pickingIcon, setPickingIcon] = useState(false);
  const [unit, setUnit] = useState<Unit>(item?.unit ?? "PIECE");
  const [startingQuantity, setStartingQuantity] = useState("");
  const [lowThreshold, setLowThreshold] = useState(
    item?.lowThreshold != null ? String(item.lowThreshold) : "",
  );
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const typed = name.trim();
  const icon = picked === undefined ? guessIcon(typed) : picked;
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
      const starting = Number(startingQuantity);
      await onSave(
        {
          name: typed,
          category: category.trim() === "" ? null : category.trim(),
          icon,
          unit,
          lowThreshold: parsed != null && Number.isFinite(parsed) ? parsed : null,
        },
        Number.isFinite(starting) && starting > 0 ? starting : 0,
      );
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

        <div>
          <label htmlFor="item-name" className="field-label">
            Name
          </label>
          <div className="mt-1 flex items-center gap-2">
            <button
              type="button"
              onClick={() => setPickingIcon((v) => !v)}
              aria-label={icon ? `Picture: ${icon}. Change it` : "Choose a picture"}
              aria-expanded={pickingIcon}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-line-strong bg-surface-sunken text-xl hover:border-accent"
            >
              {icon ?? <ImagePlus size={16} className="text-ink-faint" />}
            </button>
            <input
              id="item-name"
              autoFocus
              required
              maxLength={80}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Eggs"
              className="field"
            />
          </div>
        </div>

        {pickingIcon && (
          <div className="max-h-56 space-y-3 overflow-y-auto rounded-lg border border-line p-2.5">
            {ICON_GROUPS.map((group) => (
              <div key={group.label}>
                <p className="mb-1 text-[11px] font-medium uppercase tracking-wide text-ink-faint">
                  {group.label}
                </p>
                <div className="flex flex-wrap gap-1">
                  {group.icons.map((preset) => (
                    <button
                      key={preset.icon}
                      type="button"
                      title={preset.name.split(" ")[0]}
                      aria-label={preset.name.split(" ")[0]}
                      aria-pressed={icon === preset.icon}
                      onClick={() => {
                        setPicked(preset.icon);
                        setPickingIcon(false);
                      }}
                      className={`flex h-9 w-9 items-center justify-center rounded-md text-xl hover:bg-surface-sunken ${
                        icon === preset.icon ? "bg-accent-soft ring-1 ring-accent" : ""
                      }`}
                    >
                      {preset.icon}
                    </button>
                  ))}
                </div>
              </div>
            ))}
            <button
              type="button"
              onClick={() => {
                setPicked(null);
                setPickingIcon(false);
              }}
              className="text-xs text-ink-soft underline-offset-2 hover:text-ink hover:underline"
            >
              No picture
            </button>
          </div>
        )}

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

        <div>
          <label htmlFor="item-category" className="field-label">
            Category
          </label>
          {!typingCategory && (
            <select
              id="item-category"
              value={category}
              onChange={(e) => {
                if (e.target.value === NEW_CATEGORY) {
                  setCategory("");
                  setTypingCategory(true);
                } else {
                  setCategory(e.target.value);
                }
              }}
              className="field mt-1"
            >
              <option value={NO_CATEGORY}>None</option>
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
              <option value={NEW_CATEGORY}>New category…</option>
            </select>
          )}
          {typingCategory && (
            <div className="mt-1 flex items-center gap-2">
              <input
                id="item-category"
                autoFocus={categories.length > 0}
                maxLength={40}
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                placeholder="Fridge"
                className="field"
              />
              {categories.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    setCategory("");
                    setTypingCategory(false);
                  }}
                  className="btn btn-ghost shrink-0"
                >
                  Pick
                </button>
              )}
            </div>
          )}
        </div>

        <div>
          <span className="field-label">Counted in</span>
          <div className="mt-1.5">
            <Segmented value={unit} onChange={setUnit} options={UNITS} ariaLabel="Unit" />
          </div>
        </div>

        {!item && (
          <label className="block">
            <span className="field-label">How much you have now</span>
            <input
              type="number"
              min={0}
              step="any"
              inputMode="decimal"
              value={startingQuantity}
              onChange={(e) => setStartingQuantity(e.target.value)}
              placeholder="0"
              className="field mt-1"
            />
            <span className="mt-1 block text-xs text-ink-faint">In {UNIT_LABELS[unit]}.</span>
          </label>
        )}

        <label className="block">
          <span className="field-label">Tell me when it drops below</span>
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
            In {UNIT_LABELS[unit]}. Below this it lands on the shopping list.
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
