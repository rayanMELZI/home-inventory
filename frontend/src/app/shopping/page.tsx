"use client";

import { RequireAuth } from "@/lib/auth";
import { PageHeader, PageShell } from "@/components/ui/Page";

export default function ShoppingPage() {
  return (
    <RequireAuth>
      <PageShell>
        <PageHeader title="Shopping" subtitle="What has run low, and what you meant to buy." />
        <div className="rounded-xl border border-dashed border-line-strong p-8 text-center text-ink-soft">
          Items fall onto this list on their own once they drop below the level you set.
        </div>
      </PageShell>
    </RequireAuth>
  );
}
