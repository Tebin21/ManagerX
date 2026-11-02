"use client";

import { useState, useRef, useEffect } from "react";
import { useLocale } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { AnimatePresence, motion } from "framer-motion";

export function KurdistanFlag({ className = "w-full h-full" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 60 40"
      preserveAspectRatio="xMidYMid slice"
      className={className}
      aria-label="Kurdistan Flag"
    >
      {/* Top Red Stripe */}
      <rect x="0" y="0" width="60" height="13.33" fill="#E52628" />
      {/* Middle White Stripe */}
      <rect x="0" y="13.33" width="60" height="13.34" fill="#FFFFFF" />
      {/* Bottom Green Stripe */}
      <rect x="0" y="26.67" width="60" height="13.33" fill="#138808" />
      {/* Golden Sun with 21 Rays */}
      <polygon
        points="30.00,11.50 30.54,16.44 32.51,11.88 31.56,16.76 34.79,12.98 32.45,17.36 36.65,14.70 33.12,18.20 37.91,16.89 33.51,19.20 38.48,19.36 33.59,20.27 38.29,21.89 33.35,21.32 37.36,24.25 32.81,22.24 35.78,26.23 32.03,22.97 33.69,27.66 31.06,23.44 31.27,28.41 30.00,23.60 28.73,28.41 28.94,23.44 26.31,27.66 27.97,22.97 24.22,26.23 27.19,22.24 22.64,24.25 26.65,21.32 21.71,21.89 26.41,20.27 21.52,19.36 26.49,19.20 22.09,16.89 26.88,18.20 23.35,14.70 27.55,17.36 25.21,12.98 28.44,16.76 27.49,11.88 29.46,16.44"
        fill="#FFC107"
      />
      {/* Sun Center Disk */}
      <circle cx="30" cy="20" r="3.4" fill="#FFC107" stroke="#E5A000" strokeWidth="0.4" />
    </svg>
  );
}

export function UKFlag({ className = "w-full h-full" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 60 40"
      preserveAspectRatio="xMidYMid slice"
      className={className}
      aria-label="UK Flag"
    >
      {/* Blue Background */}
      <rect width="60" height="40" fill="#012169" />
      {/* White Diagonals */}
      <path d="M0 0 L60 40 M60 0 L0 40" stroke="#FFFFFF" strokeWidth="8" />
      {/* Red Diagonals */}
      <path d="M0 0 L60 40 M60 0 L0 40" stroke="#C8102E" strokeWidth="4" />
      {/* White Cross */}
      <path d="M30 0 V40 M0 20 H60" stroke="#FFFFFF" strokeWidth="12" />
      {/* Red Cross */}
      <path d="M30 0 V40 M0 20 H60" stroke="#C8102E" strokeWidth="7" />
    </svg>
  );
}

const LANGUAGES = [
  { code: "ckb", label: "کوردی", Flag: KurdistanFlag },
  { code: "en", label: "English", Flag: UKFlag },
] as const;

export function LanguageSwitcher() {
  const locale = useLocale();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const isEn = locale !== "ckb";

  // Close when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent | TouchEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("touchstart", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
    };
  }, [open]);

  // Close on Escape key
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    if (open) window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open]);

  const otherLanguages = LANGUAGES.filter((item) => item.code !== locale);

  return (
    <div className="relative flex items-center" ref={containerRef}>
      {/* Clean Edge-to-Edge Flag Option: Only shows the OTHER language to switch to (No duplicates) */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, x: isEn ? 8 : -8, scale: 0.95 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: isEn ? 8 : -8, scale: 0.95 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
            className={`absolute top-1/2 -translate-y-1/2 z-50 flex items-center whitespace-nowrap ${
              isEn ? "right-full mr-2 sm:mr-2.5" : "left-full ml-2 sm:ml-2.5"
            }`}
          >
            {otherLanguages.map(({ code, label, Flag }) => (
              <Link
                key={code}
                href={pathname}
                locale={code}
                onClick={() => setOpen(false)}
                title={label}
                aria-label={label}
                className="relative flex h-8 w-8 sm:h-8.5 sm:w-8.5 items-center justify-center rounded-full overflow-hidden border-2 border-gold-400 shadow-[0_0_14px_rgba(248,198,30,0.5)] hover:scale-105 transition-all duration-200 active:scale-95"
              >
                <Flag className="w-full h-full object-cover pointer-events-none" />
              </Link>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Flag-Only Trigger Button: 100% Full-Bleed Edge-to-Edge Flag with Only an Outer Border Line */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-label="Change Language"
        className={`relative flex h-8 w-8 sm:h-8.5 sm:w-8.5 items-center justify-center rounded-full overflow-hidden border transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-500 active:scale-95 shadow-md ${
          open
            ? "border-gold-400 ring-2 ring-gold-400/40 shadow-[0_0_12px_rgba(248,198,30,0.4)] scale-105"
            : "border-white/30 dark:border-white/25 hover:border-gold-400/80 hover:scale-105"
        }`}
        style={{ backgroundColor: "rgba(15, 23, 42, 0.92)" }}
      >
        {locale === "ckb" ? (
          <KurdistanFlag className="w-full h-full object-cover pointer-events-none" />
        ) : (
          <UKFlag className="w-full h-full object-cover pointer-events-none" />
        )}
      </button>
    </div>
  );
}
