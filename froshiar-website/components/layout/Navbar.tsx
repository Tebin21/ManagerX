import Image from "next/image";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { ThemeToggle } from "./ThemeToggle";

export function Navbar() {
  const t = useTranslations("nav");

  return (
    <header className="sticky top-0 z-50 border-b border-gray-100 bg-white/80 backdrop-blur-md dark:border-gold-900/40 dark:bg-[#14110a]/80">
      <nav
        aria-label="Primary"
        className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-4 sm:px-8 lg:px-10"
      >
        <Link href="/" className="flex items-center gap-2" aria-label="Froshiar">
          <Image src="/images/logo.png" alt="" width={28} height={28} priority />
          <span className="text-lg font-semibold tracking-tight text-ink">
            Froshiar
          </span>
        </Link>

        <div className="flex items-center gap-6">
          <ul className="hidden items-center gap-8 text-sm font-medium text-gray-600 sm:flex dark:text-gray-300">
            <li>
              <a
                href="#home"
                className="transition-colors hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-500 focus-visible:rounded-sm"
              >
                {t("home")}
              </a>
            </li>
            <li>
              <a
                href="#features"
                className="transition-colors hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-500 focus-visible:rounded-sm"
              >
                {t("features")}
              </a>
            </li>
            <li>
              <a
                href="#contact"
                className="transition-colors hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-500 focus-visible:rounded-sm"
              >
                {t("contact")}
              </a>
            </li>
          </ul>

          <div className="flex items-center gap-3">
            <LanguageSwitcher />
            <ThemeToggle />
          </div>
        </div>
      </nav>
    </header>
  );
}
