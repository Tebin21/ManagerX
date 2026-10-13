"use client";

import { useState } from "react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Menu, X, CreditCard, Sparkles } from "lucide-react";
import { Link, usePathname } from "@/i18n/navigation";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { ThemeToggle } from "./ThemeToggle";

const NAV_LINKS = [
  { type: "anchor", href: "#home", key: "home" },
  { type: "anchor", href: "#features", key: "features" },
  { type: "anchor", href: "#pricing", key: "pricing" },
  { type: "anchor", href: "#contact", key: "contact" },
  { type: "route", href: "/privacy", label: "Privacy" },
  { type: "route", href: "/terms", label: "Terms" },
] as const;

export function Navbar() {
  const t = useTranslations("nav");
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const shouldReduceMotion = useReducedMotion();
  const isHomePage = pathname === "/" || pathname === "";

  return (
    <header className="fixed top-3 sm:top-5 inset-x-0 z-50 mx-auto w-[92%] sm:w-[94%] max-w-5xl">
      <div className="flex items-center justify-between rounded-full border border-slate-200/80 bg-white/85 px-3 py-2 sm:px-4 sm:py-2 shadow-[0_8px_30px_rgb(0,0,0,0.06)] backdrop-blur-xl transition-all dark:border-gold-900/40 dark:bg-[#14110a]/85 dark:shadow-[0_8px_30px_rgb(0,0,0,0.4)]">
        
        {/* Left: Froshiar Logo Badge & Title */}
        <Link
          href="/"
          className="group flex items-center gap-2.5 sm:gap-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-500 focus-visible:rounded-full"
          aria-label="Froshiar"
        >
          <div className="relative flex h-9 w-9 sm:h-10 sm:w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-tr from-gold-500/20 via-gold-100 to-amber-50 p-1.5 border border-gold-400/40 shadow-xs transition-transform duration-300 group-hover:scale-105 dark:from-gold-950 dark:via-gold-900 dark:to-[#1a150c] dark:border-gold-500/40">
            <Image
              src="/images/logo.png"
              alt="Froshiar"
              width={24}
              height={24}
              priority
              className="object-contain"
            />
          </div>
          <span className="text-base sm:text-lg font-bold tracking-tight text-ink group-hover:text-gold-600 dark:group-hover:text-gold-400 transition-colors">
            Froshiar
          </span>
        </Link>

        {/* Center: Desktop Navigation Links (Pill Style) */}
        <nav aria-label="Primary" className="hidden lg:flex items-center gap-1">
          <ul className="flex items-center gap-1 text-sm font-medium">
            {NAV_LINKS.map((link) => {
              if (link.type === "route") {
                const isActive = pathname === link.href;
                return (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      aria-current={isActive ? "page" : undefined}
                      className={`px-3.5 py-1.5 rounded-full text-xs sm:text-sm font-medium transition-all ${
                        isActive
                          ? "bg-slate-100 text-ink font-semibold dark:bg-white/10 dark:text-white shadow-2xs"
                          : "text-slate-600 hover:text-ink hover:bg-slate-100/70 dark:text-slate-300 dark:hover:text-white dark:hover:bg-white/[0.08]"
                      }`}
                    >
                      {link.label}
                    </Link>
                  </li>
                );
              }

              // Anchor link (navigate to /#anchor if on a subpage)
              const targetHref = isHomePage ? link.href : `/${link.href}`;
              const isPricing = link.key === "pricing";

              return (
                <li key={link.key}>
                  <a
                    href={targetHref}
                    className={`px-3.5 py-1.5 rounded-full text-xs sm:text-sm font-medium transition-all ${
                      isPricing
                        ? "text-gold-700 dark:text-gold-300 font-semibold hover:bg-gold-50 dark:hover:bg-gold-950/40"
                        : "text-slate-600 hover:text-ink hover:bg-slate-100/70 dark:text-slate-300 dark:hover:text-white dark:hover:bg-white/[0.08]"
                    }`}
                  >
                    {t(link.key)}
                  </a>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Right: Payment Button + Language Switcher + Theme Toggle */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Dedicated Payment / Subscription Button */}
          <a
            href={isHomePage ? "#pricing" : "/#pricing"}
            className="flex items-center gap-1.5 rounded-full bg-gradient-to-r from-gold-500 via-amber-500 to-gold-600 px-3.5 py-1.5 sm:px-4 sm:py-2 text-xs sm:text-sm font-bold text-ink-fixed shadow-xs hover:shadow-md hover:scale-[1.02] active:scale-[0.98] transition-all"
          >
            <CreditCard className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-ink-fixed" />
            <span>{t("payment")}</span>
          </a>

          <div className="hidden sm:flex items-center gap-1.5">
            <LanguageSwitcher />
            <ThemeToggle />
          </div>

          {/* Mobile Menu Hamburger */}
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            aria-label={t("menu")}
            className="flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-full border border-slate-200/90 bg-slate-100/70 text-slate-700 transition-colors hover:bg-slate-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-500 lg:hidden dark:border-gold-800/40 dark:bg-white/[0.05] dark:text-slate-200 dark:hover:bg-white/[0.12]"
          >
            {open ? <X size={17} /> : <Menu size={17} />}
          </button>
        </div>
      </div>

      {/* Mobile Floating Dropdown Menu */}
      <AnimatePresence initial={false}>
        {open ? (
          <motion.div
            initial={shouldReduceMotion ? { opacity: 0 } : { y: -10, opacity: 0, scale: 0.98 }}
            animate={shouldReduceMotion ? { opacity: 1 } : { y: 0, opacity: 1, scale: 1 }}
            exit={shouldReduceMotion ? { opacity: 0 } : { y: -10, opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="mt-2.5 overflow-hidden rounded-3xl border border-slate-200/90 bg-white/95 p-4 shadow-xl backdrop-blur-2xl dark:border-gold-900/40 dark:bg-[#14110a]/95 lg:hidden"
          >
            <ul className="flex flex-col gap-1.5 text-sm font-medium">
              {NAV_LINKS.map((link) => {
                if (link.type === "route") {
                  const isActive = pathname === link.href;
                  return (
                    <li key={link.href}>
                      <Link
                        href={link.href}
                        onClick={() => setOpen(false)}
                        aria-current={isActive ? "page" : undefined}
                        className={`block rounded-2xl px-4 py-2.5 transition-colors ${
                          isActive
                            ? "bg-slate-100 text-ink font-bold dark:bg-white/10 dark:text-white"
                            : "text-slate-600 hover:bg-slate-50 hover:text-ink dark:text-slate-300 dark:hover:bg-white/[0.05]"
                        }`}
                      >
                        {link.label}
                      </Link>
                    </li>
                  );
                }

                const targetHref = isHomePage ? link.href : `/${link.href}`;
                return (
                  <li key={link.key}>
                    <a
                      href={targetHref}
                      onClick={() => setOpen(false)}
                      className="block rounded-2xl px-4 py-2.5 text-slate-600 hover:bg-slate-50 hover:text-ink transition-colors dark:text-slate-300 dark:hover:bg-white/[0.05]"
                    >
                      {t(link.key)}
                    </a>
                  </li>
                );
              })}
            </ul>

            <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-3 dark:border-gold-900/30">
              <LanguageSwitcher />
              <ThemeToggle />
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </header>
  );
}
