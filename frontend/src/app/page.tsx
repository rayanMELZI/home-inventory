"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Plus } from "lucide-react";
import { RequireAuth, useAuth } from "@/lib/auth";
import { PageHeader, PageShell } from "@/components/ui/Page";
import { SkeletonCard } from "@/components/ui/Skeleton";
import { Toast } from "@/components/ui/Toast";
import { ItemCard } from "@/components/ItemCard";
import { ItemForm } from "@/components/ItemForm";
import {
  archiveItemLocally,
  clearRejection,
  loadPantry,
  recordEventLocally,
  saveItemLocally,
  useSyncState,
  type ItemDraft,
} from "@/lib/sync";
import { categoriesOf, type Item } from "@/lib/types";

const ALL = "__all__";

export default function PantryPage() {
  return (
    <RequireAuth>
      <Pantry />
    </RequireAuth>
  );
}

function Pantry() {
  const { user } = useAuth();
  const { pending, lastRejection, lastSyncedAt } = useSyncState();

  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState(ALL);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Item | null>(null);
  const [stepping, setStepping] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [formKey, setFormKey] = useState(0);

  const redraw = useCallback(async () => {
    setItems(await loadPantry());
  }, []);

  // Everything is read from the on-device copy, so the list paints whether or
  // not there is a network. SyncBootstrap does the talking; this just redraws
  // from disk on arrival and again each time a sync brings something new.
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      const loaded = await loadPantry();
      if (cancelled) return;
      setItems(loaded);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [user, lastSyncedAt]);

  const message = toast ?? lastRejection;

  const categories = useMemo(() => categoriesOf(items), [items]);

  const visible = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return items.filter(
      (item) =>
        (category === ALL || item.category === category) &&
        (needle === "" || item.name.toLowerCase().includes(needle)),
    );
  }, [items, search, category]);

  // One tap writes to disk and returns. The network is not in the way, so this
  // is exactly as fast with the server down as with it up.
  async function onStep(item: Item, delta: number) {
    setStepping(item.id);
    try {
      const updated = await recordEventLocally(item, delta > 0 ? "PURCHASE" : "CONSUME", delta);
      setItems((current) => current.map((i) => (i.id === updated.id ? updated : i)));
    } finally {
      setStepping(null);
    }
  }

  async function onSave(draft: ItemDraft, startingQuantity: number) {
    await saveItemLocally(editing, draft, startingQuantity);
    await redraw();
  }

  async function onArchive(item: Item) {
    await archiveItemLocally(item);
    await redraw();
    setToast(`${item.name} removed`);
  }

  function open(item: Item | null) {
    setEditing(item);
    setFormKey((n) => n + 1);
    setFormOpen(true);
  }

  return (
    <PageShell>
      <PageHeader
        title="Pantry"
        subtitle={
          pending > 0
            ? `${pending} change${pending === 1 ? "" : "s"} waiting to sync.`
            : "Everything you have at home, and how much of it is left."
        }
        actions={
          <button
            type="button"
            onClick={() => open(null)}
            className="btn btn-primary px-4 max-sm:w-11 max-sm:px-0"
          >
            <Plus size={16} />
            <span className="max-sm:hidden">Add item</span>
          </button>
        }
      />

      {items.length > 0 && (
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search"
            aria-label="Search the pantry"
            className="field max-w-xs"
          />
          {categories.length > 0 && (
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              aria-label="Filter by category"
              className="field max-w-40"
            >
              <option value={ALL}>All categories</option>
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          )}
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-xl border border-dashed border-line-strong p-8 text-center">
          <p className="text-ink-soft">Your pantry is empty.</p>
          <button type="button" onClick={() => open(null)} className="btn btn-primary mt-3">
            <Plus size={16} />
            Add the first thing
          </button>
        </div>
      ) : visible.length === 0 ? (
        <div className="rounded-xl border border-dashed border-line-strong p-8 text-center text-ink-soft">
          Nothing matches that.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {visible.map((item) => (
            <ItemCard
              key={item.id}
              item={item}
              busy={stepping === item.id}
              onStep={onStep}
              onEdit={open}
            />
          ))}
        </div>
      )}

      <ItemForm
        // A fresh key on every open remounts the form, so its fields seed
        // themselves from this item and no stale draft survives a cancel.
        key={formKey}
        open={formOpen}
        item={editing}
        categories={categories}
        onClose={() => setFormOpen(false)}
        onSave={onSave}
        onArchive={onArchive}
      />

      {/* A refusal from the server reads as a message like any other, taken
          straight from the sync store rather than copied into state here. */}
      <Toast
        open={message !== null}
        onClose={() => {
          setToast(null);
          clearRejection();
        }}
      >
        {message}
      </Toast>
    </PageShell>
  );
}
