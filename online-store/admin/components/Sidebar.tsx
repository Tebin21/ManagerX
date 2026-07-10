"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Store,
  ScrollText,
  BadgeCheck,
  DatabaseBackup,
  LogOut,
} from "lucide-react";
import { ThemeToggle } from "./ThemeToggle";

const NAV_ITEMS = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/stores", label: "Online Stores", icon: Store },
  { href: "/activity", label: "Activity Logs", icon: ScrollText },
  { href: "/subscriptions", label: "Subscriptions", icon: BadgeCheck },
  { href: "/backups", label: "Backups", icon: DatabaseBackup },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.replace("/login");
    router.refresh();
  }

  return (
    <aside className="flex h-screen w-60 shrink-0 flex-col border-r border-border bg-surface">
      <div className="flex items-center gap-2 border-b border-border px-5 py-4">
        <div className="h-7 w-7 shrink-0 rounded-md bg-brand-600" />
        <div className="leading-tight">
          <div className="text-sm font-semibold tracking-tight">ManagerX</div>
          <div className="text-xs text-muted">Store Control Center</div>
        </div>
      </div>

      <nav className="flex flex-1 flex-col gap-1 overflow-y-auto p-3">
        {NAV_ITEMS.map((item) => {
          const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                active
                  ? "bg-brand-50 text-brand-700 dark:bg-brand-500/10 dark:text-brand-500"
                  : "text-muted hover:bg-canvas hover:text-ink"
              }`}
            >
              <Icon size={16} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="flex items-center justify-between border-t border-border px-3 py-3">
        <button
          type="button"
          onClick={logout}
          className="flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-sm font-medium text-muted transition-colors hover:bg-canvas hover:text-ink"
        >
          <LogOut size={15} />
          Log out
        </button>
        <ThemeToggle />
      </div>
    </aside>
  );
}
