"use client";

import { RequireAuth } from "@/lib/auth";
import { PageHeader, PageShell } from "@/components/ui/Page";

export default function PantryPage() {
  return (
    <RequireAuth>
      <PageShell>
        <PageHeader
          title="Pantry"
          subtitle="Everything you have at home, and how much of it is left."
        />
        <div className="rounded-xl border border-dashed border-line-strong p-8 text-center text-ink-soft">
          Nothing here yet. Adding and counting items lands in the next step.
        </div>
      </PageShell>
    </RequireAuth>
  );
}
