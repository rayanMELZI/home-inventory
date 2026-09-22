"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Boxes, ChefHat, Moon, Settings, ShoppingCart, Sun } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useTheme } from "@/lib/theme";

const LINKS = [
  { href: "/", label: "Pantry", Icon: Boxes },
  { href: "/meals", label: "Meals", Icon: ChefHat },
  { href: "/shopping", label: "Shopping", Icon: ShoppingCart },
  { href: "/settings", label: "Settings", Icon: Settings },
];

export function Nav() {
  const { user, logout } = useAuth();
  const { resolved, setTheme } = useTheme();
  const pathname = usePathname();

  // Login and register are standalone centred cards; chrome would only get in the way.
  if (!user) return null;

  return (
    <>
      <header className="border-b border-line-strong bg-surface/90 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center gap-4 px-4 py-3 sm:px-6">
          <Link href="/" className="text-base font-semibold tracking-tight">
            Home<span className="text-accent">stock</span>
          </Link>

          <nav className="hidden flex-1 gap-1 sm:flex">
            {LINKS.map(({ href, label, Icon }) => {
              const active = pathname === href;
              return (
                <Link
                  key={href}
                  href={href}
                  className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                    active
                      ? "bg-accent-soft text-accent-ink"
                      : "text-ink-soft hover:bg-surface-sunken hover:text-ink"
                  }`}
                >
                  <Icon size={16} />
                  {label}
                </Link>
              );
            })}
          </nav>

          <div className="ml-auto flex items-center gap-2 sm:ml-0">
            <button
              type="button"
              className="btn-icon"
              aria-label={resolved === "dark" ? "Switch to light mode" : "Switch to dark mode"}
              onClick={() => setTheme(resolved === "dark" ? "light" : "dark")}
            >
              {resolved === "dark" ? <Sun size={18} /> : <Moon size={18} />}
            </button>
            <span className="hidden text-sm text-ink-soft md:inline">{user.username}</span>
            <button type="button" onClick={logout} className="hidden text-sm text-ink-soft hover:text-ink sm:inline">
              Log out
            </button>
          </div>
        </div>
      </header>

      <nav className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-4 border-t border-line bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur sm:hidden">
        {LINKS.map(({ href, label, Icon }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className={`flex flex-col items-center gap-1 py-2 text-[11px] font-medium transition-colors ${
                active ? "text-accent-ink" : "text-ink-faint"
              }`}
            >
              <Icon size={20} strokeWidth={active ? 2.4 : 1.8} />
              {label}
            </Link>
          );
        })}
      </nav>
    </>
  );
}
