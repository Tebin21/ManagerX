import { useLocale } from "../../i18n/LocaleContext";
import { LanguageSwitcher } from "./LanguageSwitcher";

export function Navbar() {
  const { messages } = useLocale();
  const t = messages.nav;

  return (
    <header className="sticky top-0 z-50 border-b border-slate-100 bg-white/80 backdrop-blur-md">
      <nav
        aria-label="Primary"
        className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-4 sm:px-8 lg:px-10"
      >
        <a href="#home" className="flex items-center gap-2" aria-label="Froshiar">
          <img src="/logo.png" alt="" className="h-7 w-7 object-contain" />
          <span className="text-lg font-semibold tracking-tight text-ink">Froshiar</span>
        </a>

        <div className="flex items-center gap-6">
          <ul className="hidden items-center gap-8 text-sm font-medium text-slate-600 sm:flex">
            <li>
              <a
                href="#home"
                className="transition-colors hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-500 focus-visible:rounded-sm"
              >
                {t.home}
              </a>
            </li>
            <li>
              <a
                href="#features"
                className="transition-colors hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-500 focus-visible:rounded-sm"
              >
                {t.features}
              </a>
            </li>
            <li>
              <a
                href="#contact"
                className="transition-colors hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-500 focus-visible:rounded-sm"
              >
                {t.contact}
              </a>
            </li>
          </ul>

          <LanguageSwitcher />
        </div>
      </nav>
    </header>
  );
}
