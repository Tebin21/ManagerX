import { setRequestLocale } from "next-intl/server";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { Hero } from "@/components/sections/Hero";
import { Features } from "@/components/sections/Features";
import { About } from "@/components/sections/About";
import { BusinessTypes } from "@/components/sections/BusinessTypes";
import { Contact } from "@/components/sections/Contact";
import { routing } from "@/i18n/routing";

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function Home({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <>
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-gold-500 focus:px-4 focus:py-2 focus:text-ink-fixed"
      >
        Skip to content
      </a>
      <Navbar />
      <main id="main" className="flex-1">
        <Hero />
        <Features />
        <About />
        <BusinessTypes />
        <Contact />
      </main>
      <Footer />
    </>
  );
}
