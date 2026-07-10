import { MarketingLocaleProvider, useLocale } from "./i18n/LocaleContext";
import { useDocumentDirection } from "./hooks/useDocumentDirection";
import { useDocumentHead } from "./hooks/useDocumentHead";
import { Navbar } from "./components/layout/Navbar";
import { Hero } from "./components/sections/Hero";
import { Features } from "./components/sections/Features";
import { About } from "./components/sections/About";
import { BusinessTypes } from "./components/sections/BusinessTypes";
import { DownloadApp } from "./components/sections/DownloadApp";
import { Contact } from "./components/sections/Contact";

export function MarketingHomepage() {
  return (
    <MarketingLocaleProvider>
      <MarketingHomepageContent />
    </MarketingLocaleProvider>
  );
}

function MarketingHomepageContent() {
  const { locale, dir, messages } = useLocale();

  useDocumentDirection(dir, locale);
  useDocumentHead({
    title: `Froshiar — ${messages.hero.title}`,
    description: messages.hero.subtitle,
  });

  return (
    <div dir={dir} lang={locale} className={locale === "ckb" ? "font-kurdish" : "font-sans"}>
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-gold-500 focus:px-4 focus:py-2 focus:text-ink"
      >
        Skip to content
      </a>
      <Navbar />
      <main id="main">
        <Hero />
        <Features />
        <About />
        <BusinessTypes />
        <DownloadApp />
        <Contact />
      </main>
    </div>
  );
}
