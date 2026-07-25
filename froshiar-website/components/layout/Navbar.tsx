"use client";

import { useState } from "react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Menu, X } from "lucide-react";
import { Link, usePathname } from "@/i18n/navigation";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { ThemeToggle } from "./ThemeToggle";

// Home/Features/Contact are same-page anchors; Privacy/Terms are real routed
// pages, so they need the locale-aware Link + an active/aria-current state.
// Privacy/Terms labels are hardcoded English, matching the footer's legal
// links — those pages are English-only by product decision.
const NAV_LINKS = [
  { type: "anchor", href: "#home", key: "home" },
  { type: "anchor", href: "#features", key: "features" },
  { type: "route", href: "/privacy", label: "Privacy" },
  { type: "route", href: "/terms", label: "Terms" },
  { type: "anchor", href: "#contact", key: "contact" },
] as const;

const linkClass =
  "transition-colors hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-500 focus-visible:rounded-sm";
const mobileLinkClass =
  "block rounded-lg px-2 py-2.5 transition-colors hover:bg-gray-100 hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-500 dark:hover:bg-white/[0.06]";

export function Navbar() {
  const t = useTranslations("nav");
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const shouldReduceMotion = useReducedMotion();

  return (
    <header className="sticky top-0 z-50 border-b border-gray-100 bg-white/80 backdrop-blur-md dark:border-gold-900/40 dark:bg-[#14110a]/80">
      <nav
        aria-label="Primary"
        className="mx-auto flex w-full max-w-6xl items-center justify-between px-5 py-4 sm:px-8 lg:px-10"
      >
        <Link href="/" className="flex items-center gap-2" aria-label="Froshiar">
          <Image src="/images/logo.png" alt="" width={28} height={28} priority />
          <span className="text-lg font-semibold tracking-tight text-ink">
            Froshiar
          </span>
        </Link>

        <div className="flex items-center gap-6">
          <ul className="hidden items-center gap-8 text-sm font-medium text-gray-600 sm:flex dark:text-gray-300">
            {NAV_LINKS.map((link) => {
              if (link.type === "route") {
                const isActive = pathname === link.href;
                return (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      aria-current={isActive ? "page" : undefined}
                      className={`${linkClass} ${isActive ? "text-ink" : ""}`}
                    >
                      {link.label}
                    </Link>
                  </li>
                );
              }
              return (
                <li key={link.key}>
                  <a href={link.href} className={linkClass}>
                    {t(link.key)}
                  </a>
                </li>
              );
            })}
          </ul>

          <div className="hidden items-center gap-3 sm:flex">
            <LanguageSwitcher />
            <ThemeToggle />
          </div>

          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            aria-label={t("menu")}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-gray-600 transition-colors hover:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-500 sm:hidden dark:text-gray-300 dark:hover:bg-white/[0.06]"
          >
            {open ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </nav>

      <AnimatePresence initial={false}>
        {open ? (
          <motion.div
            initial={shouldReduceMotion ? { opacity: 0 } : { height: 0, opacity: 0 }}
            animate={shouldReduceMotion ? { opacity: 1 } : { height: "auto", opacity: 1 }}
            exit={shouldReduceMotion ? { opacity: 0 } : { height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: "easeInOut" }}
            className="overflow-hidden border-t border-gray-100 sm:hidden dark:border-gold-900/40"
          >
            <ul className="flex flex-col gap-1 px-5 py-3 text-sm font-medium text-gray-600 dark:text-gray-300">
              {NAV_LINKS.map((link) => {
                if (link.type === "route") {
                  const isActive = pathname === link.href;
                  return (
                    <li key={link.href}>
                      <Link
                        href={link.href}
                        onClick={() => setOpen(false)}
                        aria-current={isActive ? "page" : undefined}
                        className={`${mobileLinkClass} ${isActive ? "text-ink" : ""}`}
                      >
                        {link.label}
                      </Link>
                    </li>
                  );
                }
                return (
                  <li key={link.key}>
                    <a
                      href={link.href}
                      onClick={() => setOpen(false)}
                      className={mobileLinkClass}
                    >
                      {t(link.key)}
                    </a>
                  </li>
                );
              })}
            </ul>
            <div className="flex items-center justify-between border-t border-gray-100 px-5 py-3 dark:border-gold-900/40">
              <LanguageSwitcher />
              <ThemeToggle />
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </header>
  );
}
