"use client";

import { useEffect, useState } from "react";
import { formatMoney, summariseMonth, type MonthSummary } from "@/lib/spend";

/**
 * This month, in money.
 *
 * The whole card is a by-product of the event log — no spending table, no
 * second place for the numbers to disagree. It only shows up once there is
 * something to show, so an empty pantry does not get a row of zeroes.
 */
export function SpendCard() {
  const [summary, setSummary] = useState<MonthSummary | null>(null);

  useEffect(() => {
    let cancelled = false;
    summariseMonth().then((result) => {
      if (!cancelled) setSummary(result);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!summary || (summary.spent === 0 && summary.earned === 0 && summary.wasted === 0)) {
    return null;
  }

  return (
    <div className="card mt-4 p-4">
      <h2 className="font-medium">This month</h2>
      <p className="mt-0.5 text-sm text-ink-soft">
        Worked out from what you have recorded, so it is only as complete as the prices you entered.
      </p>

      <dl className="mt-3 flex flex-wrap gap-x-8 gap-y-3">
        <Stat label="Spent" value={formatMoney(summary.spent)} />
        {summary.earned > 0 && <Stat label="Earned" value={formatMoney(summary.earned)} />}
        {summary.wasted > 0 && <Stat label="Thrown away" value={String(summary.wasted)} />}
      </dl>

      {summary.byCategory.length > 0 && (
        <ul className="mt-4 space-y-1.5 border-t border-line pt-3">
          {summary.byCategory.map((row) => (
            <li key={row.category} className="flex justify-between text-sm">
              <span className="text-ink-soft">{row.category}</span>
              <span className="tabular-nums">{formatMoney(row.spent)}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="field-label">{label}</dt>
      <dd className="mt-0.5 text-xl font-semibold tabular-nums">{value}</dd>
    </div>
  );
}
