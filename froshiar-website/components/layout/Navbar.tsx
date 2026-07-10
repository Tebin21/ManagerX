"use client";

import { useState } from "react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Menu, X } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { ThemeToggle } from "./ThemeToggle";

const NAV_LINKS = [
  { href: "#home", key: "home" },
  { href: "#features", key: "features" },
  { href: "#contact", key: "contact" },
] as const;

export function Navbar() {
  const t = useTranslations("nav");
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
            {NAV_LINKS.map((link) => (
              <li key={link.key}>
                <a
                  href={link.href}
                  className="transition-colors hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-500 focus-visible:rounded-sm"
                >
                  {t(link.key)}
                </a>
              </li>
            ))}
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
              {NAV_LINKS.map((link) => (
                <li key={link.key}>
                  <a
                    href={link.href}
                    onClick={() => setOpen(false)}
                    className="block rounded-lg px-2 py-2.5 transition-colors hover:bg-gray-100 hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-500 dark:hover:bg-white/[0.06]"
                  >
                    {t(link.key)}
                  </a>
                </li>
              ))}
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
