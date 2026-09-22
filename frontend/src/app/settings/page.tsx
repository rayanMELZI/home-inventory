"use client";

import { RequireAuth, useAuth } from "@/lib/auth";
import { useTheme, type Theme } from "@/lib/theme";
import { PageHeader, PageShell } from "@/components/ui/Page";
import { Segmented } from "@/components/ui/Segmented";

const THEMES: { value: Theme; label: string }[] = [
  { value: "light", label: "Light" },
  { value: "system", label: "System" },
  { value: "dark", label: "Dark" },
];

export default function SettingsPage() {
  const { user, logout } = useAuth();
  const { theme, setTheme } = useTheme();

  return (
    <RequireAuth>
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
      </PageShell>
    </RequireAuth>
  );
}
