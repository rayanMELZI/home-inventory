"use client";

import { useEffect } from "react";
import { useAuth } from "@/lib/auth";
import { useOnline } from "@/lib/offline";
import { openFor, sync } from "@/lib/sync";

/**
 * Opens the on-device database for whoever is signed in, and keeps it in step.
 *
 * Mounted once in the layout rather than per screen. Each page used to do this
 * for itself, which meant Settings — a page that reports the sync state but
 * never triggered it — sat there claiming nothing had ever synced.
 */
export function SyncBootstrap() {
  const { user } = useAuth();
  const online = useOnline();

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      await openFor(user.id);
      if (!cancelled) await sync();
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  // Reaching the server again is the moment the outbox should drain.
  useEffect(() => {
    if (!user || !online) return;
    void sync();
  }, [user, online]);

  return null;
}
