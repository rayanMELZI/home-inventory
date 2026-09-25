"use client";

import { useRef, useState } from "react";
import { Download, Upload } from "lucide-react";
import { RequireAuth, useAuth } from "@/lib/auth";
import { useTheme, type Theme } from "@/lib/theme";
import { PageHeader, PageShell } from "@/components/ui/Page";
import { Segmented } from "@/components/ui/Segmented";
import { downloadBackup, restoreBackup } from "@/lib/backup";
import { sync, useSyncState } from "@/lib/sync";
import { ApiError } from "@/lib/api";

const THEMES: { value: Theme; label: string }[] = [
  { value: "light", label: "Light" },
  { value: "system", label: "System" },
  { value: "dark", label: "Dark" },
];

export default function SettingsPage() {
  return (
    <RequireAuth>
      <Settings />
    </RequireAuth>
  );
}

function Settings() {
  const { user, logout } = useAuth();
  const { theme, setTheme } = useTheme();
  const { pending, lastSyncedAt } = useSyncState();

  const [busy, setBusy] = useState<"export" | "import" | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  async function onDownload() {
    setBusy("export");
    setMessage(null);
    try {
      await downloadBackup();
      setMessage("Saved to your downloads.");
    } catch (err) {
      setMessage(err instanceof ApiError ? err.message : "Could not build the file.");
    } finally {
      setBusy(null);
    }
  }

  async function onRestore(file: File) {
    setBusy("import");
    setMessage(null);
    try {
      const result = await restoreBackup(file);
      // Pull the restored rows down into the on-device copy straight away, or
      // the screen would keep showing the pantry as it was before the import.
      await sync();
      setMessage(
        `Restored ${result.itemsAdded} new item${result.itemsAdded === 1 ? "" : "s"} ` +
          `and ${result.eventsAdded} event${result.eventsAdded === 1 ? "" : "s"}` +
          (result.skipped > 0 ? `, skipping ${result.skipped} already here.` : "."),
      );
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Could not read that file.");
    } finally {
      setBusy(null);
      if (fileInput.current) fileInput.current.value = "";
    }
  }

  return (
    <PageShell width="form">
      <PageHeader title="Settings" />

      <div className="card space-y-4 p-4">
        <div>
          <span className="field-label">Account</span>
          <p className="mt-1 text-sm">{user?.username}</p>
          <p className="text-sm text-ink-soft">{user?.email}</p>
        </div>

        <div>
          <span className="field-label">Appearance</span>
          <div className="mt-1.5">
            <Segmented value={theme} onChange={setTheme} options={THEMES} ariaLabel="Appearance" />
          </div>
        </div>

        <div className="border-t border-line pt-4">
          <button type="button" onClick={logout} className="btn btn-ghost">
            Log out
          </button>
        </div>
      </div>

      <div className="card mt-4 space-y-3 p-4">
        <div>
          <h2 className="font-medium">Your data</h2>
          <p className="mt-0.5 text-sm text-ink-soft">
            {pending > 0
              ? `${pending} change${pending === 1 ? "" : "s"} still to reach the server.`
              : lastSyncedAt
                ? `Everything is synced, last at ${new Date(lastSyncedAt).toLocaleTimeString()}.`
                : "Not synced yet."}
          </p>
        </div>

        <p className="text-sm text-ink-soft">
          The file below is plain readable JSON with every item and everything that has ever
          happened to it. Nothing is encrypted, so it will still open years from now, with no key
          to lose.
        </p>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={onDownload}
            disabled={busy !== null}
            className="btn btn-primary"
          >
            <Download size={16} />
            {busy === "export" ? "Preparing…" : "Download a backup"}
          </button>

          <button
            type="button"
            onClick={() => fileInput.current?.click()}
            disabled={busy !== null}
            className="btn btn-ghost"
          >
            <Upload size={16} />
            {busy === "import" ? "Restoring…" : "Restore from a file"}
          </button>

          <input
            ref={fileInput}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) onRestore(file);
            }}
          />
        </div>

        <p className="text-xs text-ink-faint">
          Restoring merges into what is already here — anything the file has that you already have
          is skipped, so importing the same file twice is harmless.
        </p>

        {message && <p className="text-sm text-accent-ink">{message}</p>}
      </div>
    </PageShell>
  );
}
