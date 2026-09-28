"use client";

import { CloudOff, LoaderCircle } from "lucide-react";
import { useOnline } from "@/lib/offline";
import { useSyncState } from "@/lib/sync";

/**
 * Says what is actually true about the connection, from a corner.
 *
 * Being offline costs nothing now that the pantry lives on the device, so this
 * reassures rather than warns — which is why it floats instead of taking a
 * row at the top: a banner pushing the page down every few seconds was louder
 * than the news it carried. It stays up while there is still something
 * waiting, because "saved here" and "saved everywhere" are different promises
 * and only one of them has been kept.
 */
export function SyncIndicator() {
  const online = useOnline();
  const { pending, syncing } = useSyncState();

  if (online && pending === 0 && !syncing) return null;

  const waiting = pending === 1 ? "1 change" : `${pending} changes`;

  return (
    <div
      role="status"
      aria-live="polite"
      // Fixed and click-through, so it never moves the page or eats a tap.
      // Below the toast (z-40) on purpose: a message outranks a status.
      // bottom-20 clears the phone tab bar, the same way the toast does.
      className="pointer-events-none fixed right-4 bottom-20 z-30 flex items-center gap-1.5 rounded-full border border-line bg-surface/70 px-3 py-1.5 text-xs font-medium text-ink-soft shadow-sm backdrop-blur sm:right-6 sm:bottom-6"
    >
      {!online ? (
        <>
          <CloudOff size={14} className="shrink-0" />
          <span>Offline{pending > 0 ? ` · ${waiting} saved here` : ""}</span>
        </>
      ) : (
        <>
          <LoaderCircle size={14} className={`shrink-0 ${syncing ? "animate-spin" : ""}`} />
          <span>{syncing ? "Syncing" : `${waiting} to sync`}</span>
        </>
      )}
    </div>
  );
}
