"use client";

import { useLocale, useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { Globe } from "lucide-react";

const LANGUAGES = [
  { code: "en", label: "EN" },
  { code: "ckb", label: "کوردی" },
] as const;

export function LanguageSwitcher() {
  const locale = useLocale();
  const pathname = usePathname();
  const t = useTranslations("nav");

  return (
    <div
      role="group"
      aria-label={t("switchLanguage")}
      className="flex items-center gap-0.5 rounded-full border border-slate-200/90 bg-slate-100/70 p-0.5 dark:border-gold-800/40 dark:bg-white/[0.05]"
    >
      <div className="ps-2 pe-1 text-slate-400 dark:text-slate-400 hidden sm:flex items-center">
        <Globe size={13} />
      </div>
      {LANGUAGES.map(({ code, label }) => {
        const isActive = locale === code;
        return (
          <Link
            key={code}
            href={pathname}
            locale={code}
            aria-current={isActive ? "page" : undefined}
            className={`rounded-full px-2.5 py-1 text-xs font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-500 ${
              isActive
                ? "bg-gold-500 text-ink-fixed shadow-2xs font-bold"
                : "text-slate-500 hover:text-ink dark:text-slate-400 dark:hover:text-white"
            }`}
          >
            {label}
          </Link>
        );
      })}
    </div>
  );
}
