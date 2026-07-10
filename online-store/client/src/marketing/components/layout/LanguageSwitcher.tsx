import { useLocale, type Locale } from "../../i18n/LocaleContext";

const LANGUAGES: Array<{ code: Locale; label: string }> = [
  { code: "en", label: "EN" },
  { code: "ckb", label: "کوردی" },
];

export function LanguageSwitcher() {
  const { locale, setLocale, messages } = useLocale();

  return (
    <div
      role="group"
      aria-label={messages.nav.switchLanguage}
      className="flex items-center gap-1 rounded-full border border-slate-200 p-1"
    >
      {LANGUAGES.map(({ code, label }) => {
        const isActive = locale === code;
        return (
          <button
            key={code}
            type="button"
            onClick={() => setLocale(code)}
            aria-current={isActive ? "true" : undefined}
            className={`rounded-full px-3 py-1 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-500 focus-visible:ring-offset-2 ${
              isActive ? "bg-gold-500 text-ink" : "text-slate-500 hover:text-ink"
            }`}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}
