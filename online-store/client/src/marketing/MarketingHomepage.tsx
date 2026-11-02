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
