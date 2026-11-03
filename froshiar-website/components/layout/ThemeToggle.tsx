"use client";

import { useSyncExternalStore } from "react";
import { useTheme } from "next-themes";
import { Moon, Sun } from "lucide-react";
import { useStoreLanguage } from "@/components/storefront/StoreLanguageContext";

const noopSubscribe = () => () => {};

export function ThemeToggle({ storeSlug }: { storeSlug?: string } = {}) {
  const { resolvedTheme, setTheme } = useTheme();
  const storeContext = useStoreLanguage();
  const activeSlug = storeSlug || (storeContext?.slug && storeContext.slug !== 'default' ? storeContext.slug : undefined);

  // Avoids a hydration mismatch: next-themes only knows the real theme after
  // mounting on the client (server render has no access to the browser's
  // stored preference). useSyncExternalStore's differing server/client
  // snapshots are the React-sanctioned way to express "value only known on
  // the client" — unlike a `useEffect(() => setMounted(true))`, this doesn't
  // trigger a synchronous cascading re-render.
  const mounted = useSyncExternalStore(noopSubscribe, () => true, () => false);

  if (!mounted) return <div className="h-9 w-9" />;

  const isDark = resolvedTheme === "dark";

  const handleToggle = () => {
    const nextTheme = isDark ? "light" : "dark";
    setTheme(nextTheme);
    if (activeSlug) {
      try {
        localStorage.setItem(`froshiar_store_theme_${activeSlug}`, nextTheme);
      } catch {
        // Ignore quota/private mode errors
      }
    }
  };

  return (
    <button
      type="button"
      onClick={handleToggle}
      aria-label="Toggle theme"
      className="flex h-8 w-8 items-center justify-center rounded-full border border-slate-200/90 bg-slate-100/70 text-slate-600 transition-all hover:bg-slate-200 hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-500 dark:border-gold-800/40 dark:bg-white/[0.05] dark:text-slate-300 dark:hover:bg-white/[0.12] dark:hover:text-white cursor-pointer"
    >
      {isDark ? <Sun size={15} /> : <Moon size={15} />}
    </button>
  );
}
