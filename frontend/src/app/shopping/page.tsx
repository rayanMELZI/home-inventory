"use client";

import { useCallback, useEffect, useState } from "react";
import { Check, Plus, ShoppingCart } from "lucide-react";
import { RequireAuth, useAuth } from "@/lib/auth";
import { PageHeader, PageShell } from "@/components/ui/Page";
import { Toast } from "@/components/ui/Toast";
import { ItemForm } from "@/components/ItemForm";
import {
  loadPantry,
  recordEventLocally,
  saveItemLocally,
  archiveItemLocally,
  useSyncState,
  type ItemDraft,
} from "@/lib/sync";
import { UNIT_LABELS, UNIT_STEP, categoriesOf, formatQuantity, type Item } from "@/lib/types";

export default function ShoppingPage() {
  return (
    <RequireAuth>
      <Shopping />
    </RequireAuth>
  );
}

function Shopping() {
  const { user } = useAuth();
  const { lastSyncedAt } = useSyncState();
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [formKey, setFormKey] = useState(0);

  const redraw = useCallback(async () => {
    setItems(await loadPantry());
  }, []);

  // Reads from the on-device copy; SyncBootstrap keeps that copy fresh.
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

  // The list is not a table of its own — it is just the pantry, filtered.
  // Something you do not own yet gets onto it by being added with no stock.
  const needed = items.filter((item) => item.low);

  async function onBought(item: Item, amount: number, totalPrice: number | null) {
    await recordEventLocally(
      item,
      "PURCHASE",
      amount,
      totalPrice != null ? { totalPrice } : {},
    );
    await redraw();
    setToast(`${item.name} restocked`);
  }

  return (
    <PageShell>
      <PageHeader
        title="Shopping"
        subtitle="What has run low, and anything you added to buy."
        actions={
          <button
            type="button"
            onClick={() => {
              setFormKey((n) => n + 1);
              setFormOpen(true);
            }}
            className="btn btn-primary px-4 max-sm:w-11 max-sm:px-0"
          >
            <Plus size={16} />
            <span className="max-sm:hidden">Add something to buy</span>
          </button>
        }
      />

      {loading ? null : needed.length === 0 ? (
        <div className="rounded-xl border border-dashed border-line-strong p-10 text-center">
          <ShoppingCart size={28} className="mx-auto text-ink-faint" />
          <p className="mt-3 text-ink-soft">Nothing has run low. Nothing to buy.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {needed.map((item) => (
            <ShoppingRow key={item.id} item={item} onBought={onBought} />
          ))}
        </div>
      )}

      <ItemForm
        key={formKey}
        open={formOpen}
        item={null}
        categories={categoriesOf(items)}
        onClose={() => setFormOpen(false)}
        onSave={async (draft: ItemDraft) => {
          await saveItemLocally(null, draft);
          await redraw();
        }}
        onArchive={async (item) => {
          await archiveItemLocally(item);
          await redraw();
        }}
      />

      <Toast open={toast !== null} onClose={() => setToast(null)}>
        {toast}
      </Toast>
    </PageShell>
  );
}

function ShoppingRow({
  item,
  onBought,
}: {
  item: Item;
  onBought: (item: Item, amount: number, totalPrice: number | null) => Promise<void>;
}) {
  // Pre-filled with enough to get back up to the level they set. "Low" means
  // strictly below the threshold, so reaching it exactly takes the row off.
  const step = UNIT_STEP[item.unit];
  const suggested = Math.max((item.lowThreshold ?? 0) - item.quantity, step);
  const [amount, setAmount] = useState(String(suggested));
  const [price, setPrice] = useState("");
  const [busy, setBusy] = useState(false);

  async function confirm() {
    const quantity = Number(amount);
    if (!Number.isFinite(quantity) || quantity <= 0) return;
    const paid = price.trim() === "" ? null : Number(price);
    setBusy(true);
    try {
      await onBought(item, quantity, paid != null && Number.isFinite(paid) ? paid : null);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card flex flex-wrap items-end gap-3 p-3.5">
      <div className="min-w-40 flex-1">
        <p className="font-medium">{item.name}</p>
        <p className="mt-0.5 text-sm text-ink-soft">
          {item.quantity <= 0 ? "none left" : `${formatQuantity(item.quantity, item.unit)} left`}
          {item.category && <span className="text-ink-faint"> · {item.category}</span>}
        </p>
      </div>

      <label className="block">
        <span className="field-label">Bought</span>
        <input
          type="number"
          min={0}
          step="any"
          inputMode="decimal"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          aria-label={`How much ${item.name} you bought, in ${UNIT_LABELS[item.unit]}`}
          className="field mt-1 w-24"
        />
      </label>

      <label className="block">
        <span className="field-label">Paid</span>
        <input
          type="number"
          min={0}
          step="any"
          inputMode="decimal"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          placeholder="—"
          aria-label={`What you paid in total for the ${item.name}`}
          className="field mt-1 w-24"
        />
      </label>

      <button type="button" onClick={confirm} disabled={busy} className="btn btn-primary">
        <Check size={16} />
        Got it
      </button>
    </div>
  );
}
