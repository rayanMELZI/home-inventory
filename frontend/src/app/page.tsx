"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Plus } from "lucide-react";
import { RequireAuth } from "@/lib/auth";
import { PageHeader, PageShell } from "@/components/ui/Page";
import { SkeletonCard } from "@/components/ui/Skeleton";
import { Toast } from "@/components/ui/Toast";
import { ItemCard } from "@/components/ItemCard";
import { ItemForm } from "@/components/ItemForm";
import { archiveItem, createItem, listItems, recordEvent, updateItem, type ItemDraft } from "@/lib/items";
import { ApiError } from "@/lib/api";
import type { Item } from "@/lib/types";

const ALL = "__all__";

export default function PantryPage() {
  return (
    <RequireAuth>
      <Pantry />
    </RequireAuth>
  );
}

function Pantry() {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState(ALL);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Item | null>(null);
  const [stepping, setStepping] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [formKey, setFormKey] = useState(0);

  const reload = useCallback(
    () => listItems().then(setItems),
    [],
  );

  useEffect(() => {
    reload()
      .catch((err) => setToast(err instanceof ApiError ? err.message : "Could not load your pantry"))
      .finally(() => setLoading(false));
  }, [reload]);

  const categories = useMemo(
    () => [...new Set(items.map((i) => i.category).filter((c): c is string => !!c))].sort(),
    [items],
  );

  const visible = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return items.filter(
      (item) =>
        (category === ALL || item.category === category) &&
        (needle === "" || item.name.toLowerCase().includes(needle)),
    );
  }, [items, search, category]);

  // One tap moves stock. The new total comes back from the server and replaces
  // just that row, so the rest of the list never flickers.
  async function onStep(item: Item, delta: number) {
    setStepping(item.id);
    try {
      const updated = await recordEvent(item.id, delta > 0 ? "PURCHASE" : "CONSUME", delta);
      setItems((current) => current.map((i) => (i.id === updated.id ? updated : i)));
    } catch (err) {
      setToast(err instanceof ApiError ? err.message : "That didn't save");
    } finally {
      setStepping(null);
    }
  }

  async function onSave(draft: ItemDraft) {
    if (editing) {
      const updated = await updateItem(editing.id, draft);
      setItems((current) => current.map((i) => (i.id === updated.id ? updated : i)));
    } else {
      const created = await createItem(draft);
      setItems((current) => [...current, created].sort((a, b) => a.name.localeCompare(b.name)));
    }
  }

  async function onArchive(item: Item) {
    await archiveItem(item.id);
    setItems((current) => current.filter((i) => i.id !== item.id));
    setToast(`${item.name} removed`);
  }

  function openAdd() {
    setEditing(null);
    setFormKey((n) => n + 1);
    setFormOpen(true);
  }

  function openEdit(item: Item) {
    setEditing(item);
    setFormKey((n) => n + 1);
    setFormOpen(true);
  }

  return (
    <PageShell>
      <PageHeader
        title="Pantry"
        subtitle="Everything you have at home, and how much of it is left."
        actions={
          <button type="button" onClick={openAdd} className="btn btn-primary px-4 max-sm:w-11 max-sm:px-0">
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
          <button type="button" onClick={openAdd} className="btn btn-primary mt-3">
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
              onEdit={openEdit}
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
        onClose={() => setFormOpen(false)}
        onSave={onSave}
        onArchive={onArchive}
      />

      <Toast open={toast !== null} onClose={() => setToast(null)}>
        {toast}
      </Toast>
    </PageShell>
  );
}
