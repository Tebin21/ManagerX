"use client";

import { useLocale, useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";

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
      className="flex items-center gap-1 rounded-full border border-gray-200 p-1 dark:border-gold-800/60"
    >
      {LANGUAGES.map(({ code, label }) => {
        const isActive = locale === code;
        return (
          <Link
            key={code}
            href={pathname}
            locale={code}
            aria-current={isActive ? "page" : undefined}
            className={`rounded-full px-3 py-1 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-500 focus-visible:ring-offset-2 ${
              isActive
                ? "bg-gold-500 text-ink-fixed"
                : "text-gray-500 hover:text-ink dark:text-gray-400"
            }`}
          >
            {label}
          </Link>
        );
      })}
    </div>
  );
}
