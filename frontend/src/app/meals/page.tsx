"use client";

import { RequireAuth } from "@/lib/auth";
import { PageHeader, PageShell } from "@/components/ui/Page";

export default function MealsPage() {
  return (
    <RequireAuth>
      <PageShell>
        <PageHeader
          title="Meals"
          subtitle="Ask what you could cook from what is actually in the kitchen."
        />
        <div className="rounded-xl border border-dashed border-line-strong p-8 text-center text-ink-soft">
          Suggestions need a stocked pantry first.
        </div>
      </PageShell>
    </RequireAuth>
  );
}
