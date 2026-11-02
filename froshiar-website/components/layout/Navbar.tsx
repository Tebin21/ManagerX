"use client";

import { useState, useRef, useEffect } from "react";
import Image from "next/image";
import { useTranslations, useLocale } from "next-intl";
import { AnimatePresence, motion } from "framer-motion";
import { Menu, X, Globe } from "lucide-react";
import { Link, usePathname } from "@/i18n/navigation";
import { LanguageSwitcher, KurdistanFlag, UKFlag } from "./LanguageSwitcher";

const NAV_LINKS = [
  { type: "anchor", href: "#home", key: "home" },
  { type: "anchor", href: "#features", key: "features" },
  { type: "anchor", href: "#download", key: "download" },
  { type: "anchor", href: "#contact", key: "contact" },
  { type: "route", href: "/privacy", key: "privacy" },
  { type: "route", href: "/terms", key: "terms" },
] as const;

export function Navbar() {
  const t = useTranslations("nav");
  const locale = useLocale();
  const pathname = usePathname();
  const isHomePage = pathname === "/" || pathname === "";

  // Mobile In-Place Navigation State Machine: 0: Main Links -> 1: Secondary Links -> 2: Flags -> 0
  const [mobileNavStep, setMobileNavStep] = useState<0 | 1 | 2>(0);
  const headerRef = useRef<HTMLElement>(null);

  // Close / Reset to step 0 when clicking outside the navbar on mobile
  useEffect(() => {
    function handleClickOutside(e: MouseEvent | TouchEvent) {
      if (headerRef.current && !headerRef.current.contains(e.target as Node)) {
        setMobileNavStep(0);
      }
    }
    if (mobileNavStep !== 0) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("touchstart", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
    };
  }, [mobileNavStep]);

  return (
    <>
      {/* Top Viewport Shield: Covers the 0 to 20px gap above the floating navbar so that scrolling content or lines NEVER emerge above the navbar */}
      <div
        aria-hidden="true"
        className="fixed top-0 inset-x-0 h-4 sm:h-6 bg-[#090C10] z-40 pointer-events-none"
      />
      <div
        aria-hidden="true"
        className="fixed top-4 sm:top-6 inset-x-0 h-6 bg-gradient-to-b from-[#090C10] to-transparent z-40 pointer-events-none"
      />

      <header ref={headerRef} className="fixed top-3 sm:top-5 inset-x-0 z-50 mx-auto w-[96%] sm:w-[94%] max-w-5xl">
        {/* Main Floating Frosted Glass Bar (Single Seamless Glass Pill) */}
        <div className="relative flex items-center justify-between rounded-full border border-white/20 dark:border-white/[0.16] bg-slate-950/30 dark:bg-white/[0.04] px-3 py-2 sm:px-4 sm:py-2.5 shadow-[inset_0_1px_1px_rgba(255,255,255,0.3),0_15px_40px_rgba(0,0,0,0.6)] backdrop-blur-2xl sm:backdrop-blur-3xl transition-all">
          
          {/* Frosted Glass Specular Top Sheen */}
          <div className="absolute inset-0 rounded-full bg-gradient-to-b from-white/[0.12] via-white/[0.02] to-transparent pointer-events-none" />

          {/* Left/Right Brand Logo Badge */}
          <Link
            href="/"
            onClick={() => setMobileNavStep(0)}
            className="relative z-10 group flex items-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-500 focus-visible:rounded-full shrink-0"
            aria-label="Froshiar"
          >
            <div className="relative flex h-9 w-9 sm:h-10 sm:w-10 shrink-0 items-center justify-center rounded-xl sm:rounded-2xl overflow-hidden shadow-md transition-transform duration-300 group-hover:scale-105 border border-white/20 ring-1 ring-gold-400/25">
              <Image
                src="/logo-icon.png"
                alt="Froshiar"
                width={40}
                height={40}
                priority
                className="w-full h-full object-cover"
              />
            </div>
          </Link>

          {/* Center on Mobile: 3-Step In-Place Morphing Navigation (No Dropdown Box!) */}
          <div className="relative z-10 flex lg:hidden items-center justify-center flex-1 mx-1.5 sm:mx-3 overflow-hidden h-9">
            <AnimatePresence mode="wait" initial={false}>
              {/* Step 0: Main 3 Links */}
              {mobileNavStep === 0 && (
                <motion.div
                  key="step-0"
                  initial={{ opacity: 0, y: 8, filter: "blur(6px)" }}
                  animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                  exit={{ opacity: 0, y: -8, filter: "blur(6px)" }}
                  transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
                  className="flex items-center justify-center gap-2.5 sm:gap-4 whitespace-nowrap"
                >
                  <a
                    href={isHomePage ? "#features" : "/#features"}
                    className="text-xs sm:text-sm font-bold text-slate-200 hover:text-gold-300 transition-colors whitespace-nowrap active:scale-95"
                    title={t("features")}
                  >
                    {t("features")}
                  </a>
                  <a
                    href={isHomePage ? "#download" : "/#download"}
                    className="text-xs sm:text-sm font-bold text-slate-200 hover:text-gold-300 transition-colors whitespace-nowrap active:scale-95"
                    title={t("download")}
                  >
                    {t("download")}
                  </a>
                  <a
                    href={isHomePage ? "#contact" : "/#contact"}
                    className="text-xs sm:text-sm font-bold text-slate-200 hover:text-gold-300 transition-colors whitespace-nowrap active:scale-95"
                    title={t("contact")}
                  >
                    {t("contact")}
                  </a>
                </motion.div>
              )}

              {/* Step 1: Secondary Links (Home, Privacy, Terms) */}
              {mobileNavStep === 1 && (
                <motion.div
                  key="step-1"
                  initial={{ opacity: 0, y: 8, filter: "blur(6px)" }}
                  animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                  exit={{ opacity: 0, y: -8, filter: "blur(6px)" }}
                  transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
                  className="flex items-center justify-center gap-2.5 sm:gap-4 whitespace-nowrap"
                >
                  <a
                    href={isHomePage ? "#home" : "/#home"}
                    onClick={() => setMobileNavStep(0)}
                    className="text-xs sm:text-sm font-bold text-slate-200 hover:text-gold-300 transition-colors whitespace-nowrap active:scale-95"
                    title={t("home")}
                  >
                    {t("home")}
                  </a>
                  <Link
                    href="/privacy"
                    onClick={() => setMobileNavStep(0)}
                    className="text-xs sm:text-sm font-bold text-slate-200 hover:text-gold-300 transition-colors whitespace-nowrap active:scale-95"
                  >
                    {t("privacy")}
                  </Link>
                  <Link
                    href="/terms"
                    onClick={() => setMobileNavStep(0)}
                    className="text-xs sm:text-sm font-bold text-slate-200 hover:text-gold-300 transition-colors whitespace-nowrap active:scale-95"
                  >
                    {t("terms")}
                  </Link>
                </motion.div>
              )}

              {/* Step 2: Language Switcher Flags in Center */}
              {mobileNavStep === 2 && (
                <motion.div
                  key="step-2"
                  initial={{ opacity: 0, y: 8, filter: "blur(6px)" }}
                  animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                  exit={{ opacity: 0, y: -8, filter: "blur(6px)" }}
                  transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
                  className="flex items-center justify-center gap-3.5 whitespace-nowrap"
                >
                  {/* Kurdish Flag */}
                  <Link
                    href={pathname}
                    locale="ckb"
                    onClick={() => setMobileNavStep(0)}
                    title="کوردی"
                    aria-label="کوردی"
                    className={`relative flex h-7.5 w-7.5 sm:h-8 sm:w-8 items-center justify-center rounded-full overflow-hidden transition-all duration-200 active:scale-95 shadow-md ${
                      locale === "ckb"
                        ? "border-2 border-gold-400 shadow-[0_0_12px_rgba(248,198,30,0.5)] scale-110"
                        : "border border-white/25 opacity-75 hover:opacity-100 hover:scale-105"
                    }`}
                  >
                    <KurdistanFlag className="w-full h-full object-cover pointer-events-none" />
                  </Link>

                  {/* UK Flag */}
                  <Link
                    href={pathname}
                    locale="en"
                    onClick={() => setMobileNavStep(0)}
                    title="English"
                    aria-label="English"
                    className={`relative flex h-7.5 w-7.5 sm:h-8 sm:w-8 items-center justify-center rounded-full overflow-hidden transition-all duration-200 active:scale-95 shadow-md ${
                      locale === "en"
                        ? "border-2 border-gold-400 shadow-[0_0_12px_rgba(248,198,30,0.5)] scale-110"
                        : "border border-white/25 opacity-75 hover:opacity-100 hover:scale-105"
                    }`}
                  >
                    <UKFlag className="w-full h-full object-cover pointer-events-none" />
                  </Link>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Center: Desktop Navigation Links (Pill Style) */}
          <nav aria-label="Primary" className="relative z-10 hidden lg:flex items-center gap-1">
            <ul className="flex items-center gap-1 text-sm font-medium">
              {NAV_LINKS.map((link) => {
                const label = t(link.key);
                if (link.type === "route") {
                  const isActive = pathname === link.href;
                  return (
                    <li key={link.href}>
                      <Link
                        href={link.href}
                        aria-current={isActive ? "page" : undefined}
                        className={`px-3.5 py-1.5 rounded-full text-xs sm:text-sm font-medium transition-all ${isActive
                            ? "bg-gold-500/15 border border-gold-400/40 text-gold-300 font-semibold shadow-2xs"
                            : "text-slate-300 hover:text-white hover:bg-white/[0.08]"
                          }`}
                      >
                        {label}
                      </Link>
                    </li>
                  );
                }

                // Anchor link (navigate to /#anchor if on a subpage)
                const targetHref = isHomePage ? link.href : `/${link.href}`;

                return (
                  <li key={link.key}>
                    <a
                      href={targetHref}
                      className="px-3.5 py-1.5 rounded-full text-xs sm:text-sm font-medium transition-all text-slate-300 hover:text-white hover:bg-white/[0.08]"
                    >
                      {label}
                    </a>
                  </li>
                );
              })}
            </ul>
          </nav>

          {/* Right: Desktop LanguageSwitcher + Mobile Morph Button */}
          <div className="relative z-10 flex items-center gap-1.5 sm:gap-2">
            {/* Desktop Only Language Switcher */}
            <div className="hidden lg:block">
              <LanguageSwitcher />
            </div>

            {/* Mobile In-Place Step Morph Button */}
            <button
              type="button"
              onClick={() => setMobileNavStep((prev) => ((prev + 1) % 3) as 0 | 1 | 2)}
              aria-label={t("menu")}
              className={`flex h-9 w-9 sm:h-9.5 sm:w-9.5 items-center justify-center rounded-full border transition-all active:scale-95 lg:hidden shadow-md ${
                mobileNavStep !== 0
                  ? "border-gold-400/90 text-gold-300 shadow-[0_0_14px_rgba(248,198,30,0.35)]"
                  : "border-white/20 hover:border-gold-400/60 text-slate-200 hover:text-gold-300"
              }`}
              style={{
                backgroundColor:
                  mobileNavStep !== 0
                    ? "rgba(212, 175, 55, 0.22)"
                    : "rgba(15, 23, 42, 0.92)",
              }}
            >
              <AnimatePresence mode="wait" initial={false}>
                {mobileNavStep === 0 && (
                  <motion.div
                    key="menu-icon"
                    initial={{ rotate: -90, opacity: 0 }}
                    animate={{ rotate: 0, opacity: 1 }}
                    exit={{ rotate: 90, opacity: 0 }}
                    transition={{ duration: 0.15 }}
                    className="flex items-center justify-center text-slate-200"
                  >
                    <Menu size={18} />
                  </motion.div>
                )}
                {mobileNavStep === 1 && (
                  <motion.div
                    key="globe-icon"
                    initial={{ rotate: -90, opacity: 0 }}
                    animate={{ rotate: 0, opacity: 1 }}
                    exit={{ rotate: 90, opacity: 0 }}
                    transition={{ duration: 0.15 }}
                    className="flex items-center justify-center text-gold-300"
                  >
                    <Globe size={18} />
                  </motion.div>
                )}
                {mobileNavStep === 2 && (
                  <motion.div
                    key="close-icon"
                    initial={{ rotate: -90, opacity: 0 }}
                    animate={{ rotate: 0, opacity: 1 }}
                    exit={{ rotate: 90, opacity: 0 }}
                    transition={{ duration: 0.15 }}
                    className="flex items-center justify-center text-gold-300"
                  >
                    <X size={18} />
                  </motion.div>
                )}
              </AnimatePresence>
            </button>
          </div>
        </div>
      </header>
    </>
  );
}
