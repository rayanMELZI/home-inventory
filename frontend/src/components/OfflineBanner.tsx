"use client";

import { CloudOff, RefreshCw } from "lucide-react";
import { useOnline } from "@/lib/offline";
import { useSyncState } from "@/lib/sync";

/**
 * Says what is actually true about the connection.
 *
 * The honest message changed when the pantry moved onto the device: being
 * offline no longer costs anything, so this reassures rather than warns. It
 * stays up while there is still something waiting, because "saved here" and
 * "saved everywhere" are different promises and only one of them has been kept.
 */
export function OfflineBanner() {
  const online = useOnline();
  const { pending, syncing } = useSyncState();

  if (online && pending === 0) return null;

  const waiting = pending === 1 ? "1 change" : `${pending} changes`;

  if (!online) {
    return (
      <Bar icon={<CloudOff size={14} className="shrink-0" />}>
        <span className="sm:hidden">Offline — saved on this device</span>
        <span className="hidden sm:inline">
          Offline — {pending > 0 ? `${waiting} saved here, they` : "everything is saved here and"}{" "}
          will sync when you are back.
        </span>
      </Bar>
    );
  }

  return (
    <Bar icon={<RefreshCw size={14} className={`shrink-0 ${syncing ? "animate-spin" : ""}`} />}>
      {syncing ? "Syncing…" : `${waiting} waiting to sync`}
    </Bar>
  );
}

function Bar({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div
      role="status"
      aria-live="polite"
      className="flex items-center justify-center gap-2 bg-stone-800 px-4 py-1.5 text-center text-xs font-medium text-stone-100 dark:bg-stone-700"
    >
      {icon}
      {children}
    </div>
  );
}
