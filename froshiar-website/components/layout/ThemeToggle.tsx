"use client";

import { useSyncExternalStore } from "react";
import { useTheme } from "next-themes";
import { Moon, Sun } from "lucide-react";

const noopSubscribe = () => () => {};

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  // Avoids a hydration mismatch: next-themes only knows the real theme after
  // mounting on the client (server render has no access to the browser's
  // stored preference). useSyncExternalStore's differing server/client
  // snapshots are the React-sanctioned way to express "value only known on
  // the client" — unlike a `useEffect(() => setMounted(true))`, this doesn't
  // trigger a synchronous cascading re-render.
  const mounted = useSyncExternalStore(noopSubscribe, () => true, () => false);

  if (!mounted) return <div className="h-9 w-9" />;

  const isDark = resolvedTheme === "dark";

  return (
    <button
      type="button"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      aria-label="Toggle theme"
      className="flex h-8 w-8 items-center justify-center rounded-full border border-slate-200/90 bg-slate-100/70 text-slate-600 transition-all hover:bg-slate-200 hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-500 dark:border-gold-800/40 dark:bg-white/[0.05] dark:text-slate-300 dark:hover:bg-white/[0.12] dark:hover:text-white"
    >
      {isDark ? <Sun size={15} /> : <Moon size={15} />}
    </button>
  );
}
