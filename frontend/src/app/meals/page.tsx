"use client";

import { useCallback, useEffect, useState } from "react";
import { ChefHat, Sparkles } from "lucide-react";
import { RequireAuth } from "@/lib/auth";
import { PageHeader, PageShell } from "@/components/ui/Page";
import { SuggestionCard } from "@/components/SuggestionCard";
import { useOnline } from "@/lib/offline";
import { askForSuggestions, lastSuggestions, type Suggestion } from "@/lib/meals";
import { ApiError } from "@/lib/api";

export default function MealsPage() {
  return (
    <RequireAuth>
      <Meals />
    </RequireAuth>
  );
}

function Meals() {
  const online = useOnline();
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [note, setNote] = useState<string | null>(null);
  const [askedAt, setAskedAt] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Whatever was suggested last time, so the page is not blank on arrival and
  // still reads on a train.
  useEffect(() => {
    let cancelled = false;
    lastSuggestions().then((cached) => {
      if (cancelled || !cached) return;
      setSuggestions(cached.suggestions);
      setAskedAt(cached.askedAt);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const ask = useCallback(async () => {
    setBusy(true);
    setNote(null);
    try {
      const answer = await askForSuggestions();
      setSuggestions(answer.suggestions);
      setNote(answer.note);
      setAskedAt(answer.askedAt);
    } catch (err) {
      setNote(
        err instanceof ApiError && err.status === 0
          ? "This one needs a connection — the thinking happens on the server."
          : "That didn't work. Try again in a moment.",
      );
    } finally {
      setBusy(false);
    }
  }, []);

  return (
    <PageShell>
      <PageHeader
        title="Meals"
        subtitle="What you could cook, from what you actually have."
        actions={
          <button
            type="button"
            onClick={ask}
            /* The one feature here that genuinely cannot work offline, so it
               says so rather than failing once pressed. */
            disabled={busy || !online}
            className="btn btn-primary px-4"
            title={online ? undefined : "Needs a connection"}
          >
            <Sparkles size={16} />
            {busy ? "Thinking…" : suggestions.length > 0 ? "Again" : "What can I cook?"}
          </button>
        }
      />

      {!online && (
        <p className="mb-4 text-sm text-ink-soft">
          You&apos;re offline. These are the last suggestions you asked for.
        </p>
      )}

      {note && (
        <div className="mb-4 rounded-xl border border-dashed border-line-strong p-6 text-center text-sm text-ink-soft">
          {note}
        </div>
      )}

      {suggestions.length === 0 && !note ? (
        <div className="rounded-xl border border-dashed border-line-strong p-10 text-center">
          <ChefHat size={28} className="mx-auto text-ink-faint" />
          <p className="mt-3 text-ink-soft">
            Press the button and it will read your pantry and come back with ideas.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
          {suggestions.map((suggestion) => (
            <SuggestionCard key={suggestion.title} suggestion={suggestion} />
          ))}
        </div>
      )}

      {askedAt && suggestions.length > 0 && (
        <p className="mt-4 text-xs text-ink-faint">
          Asked {new Date(askedAt).toLocaleString()}
        </p>
      )}
    </PageShell>
  );
}
