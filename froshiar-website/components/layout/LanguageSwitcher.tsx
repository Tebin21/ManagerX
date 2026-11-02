"use client";

import { useState, useRef, useEffect } from "react";
import { useLocale } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { AnimatePresence, motion } from "framer-motion";

export function KurdistanFlag({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 60 40" className={className} aria-label="Kurdistan Flag">
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

export function UKFlag({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 60 40" className={className} aria-label="UK Flag">
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

  return (
    <div className="relative flex items-center" ref={containerRef}>
      {/* Expanded Flyout Menu Opening to the Left */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, x: 14, scale: 0.95 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 14, scale: 0.95 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
            className="absolute right-full mr-2 top-1/2 -translate-y-1/2 z-50 flex items-center gap-1.5 rounded-full border border-gold-800/50 bg-[#14110a]/95 p-1 shadow-2xl backdrop-blur-2xl whitespace-nowrap"
          >
            {LANGUAGES.map(({ code, label, Flag }) => {
              const isActive = locale === code;
              return (
                <Link
                  key={code}
                  href={pathname}
                  locale={code}
                  onClick={() => setOpen(false)}
                  title={label}
                  aria-label={label}
                  className={`relative flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-full transition-all duration-200 active:scale-95 ${
                    isActive
                      ? "border-2 border-gold-400 bg-gold-500/20 shadow-[0_0_12px_rgba(212,175,55,0.45)] scale-105"
                      : "border border-white/10 bg-white/[0.05] hover:bg-white/[0.12] hover:border-gold-500/40 hover:scale-105"
                  }`}
                >
                  <div className="w-5 h-5 sm:w-5.5 sm:h-5.5 rounded-full overflow-hidden shrink-0 border border-white/20 shadow-xs flex items-center justify-center">
                    <Flag className="w-full h-full object-cover" />
                  </div>
                </Link>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Flag-Only Trigger Button (Replaces Moon Theme Button) */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-label="Change Language"
        className={`flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-full border transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-500 active:scale-95 shadow-sm ${
          open
            ? "border-gold-500 bg-gold-500/15"
            : "border-gold-800/40 bg-white/[0.05] hover:bg-white/[0.12] hover:border-gold-500/60"
        }`}
      >
        <div className="w-5 h-5 sm:w-5.5 sm:h-5.5 rounded-full overflow-hidden shrink-0 border border-white/20 shadow-xs flex items-center justify-center">
          {locale === "ckb" ? (
            <KurdistanFlag className="w-full h-full object-cover" />
          ) : (
            <UKFlag className="w-full h-full object-cover" />
          )}
        </div>
      </button>
    </div>
  );
}
