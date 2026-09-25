"use client";

import { Clock } from "lucide-react";
import type { Suggestion } from "@/lib/meals";

export function SuggestionCard({ suggestion }: { suggestion: Suggestion }) {
  return (
    <article className="card p-4">
      <header className="flex items-start justify-between gap-3">
        <h2 className="font-medium">{suggestion.title}</h2>
        <span className="flex shrink-0 items-center gap-1 text-xs tabular-nums text-ink-faint">
          <Clock size={13} />
          {suggestion.minutes} min
        </span>
      </header>

      {suggestion.uses.length > 0 && (
        <div className="mt-2.5 flex flex-wrap gap-1.5">
          {suggestion.uses.map((name) => (
            <span
              key={name}
              className="rounded-full bg-accent-soft px-2 py-0.5 text-[11px] font-medium text-accent-ink"
            >
              {name}
            </span>
          ))}
        </div>
      )}

      {/* Named, never hidden: finding out at the stove that you have no garlic
          is exactly the failure this whole feature is supposed to prevent. */}
      {suggestion.missing.length > 0 && (
        <p className="mt-2 text-xs text-ink-soft">
          You&apos;d also need{" "}
          <span className="font-medium text-ink">{suggestion.missing.join(", ")}</span>
        </p>
      )}

      <ol className="mt-3 list-inside list-decimal space-y-1 text-sm text-ink-soft">
        {suggestion.steps.map((step, index) => (
          <li key={index}>{step}</li>
        ))}
      </ol>
    </article>
  );
}
