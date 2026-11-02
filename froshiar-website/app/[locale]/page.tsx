import { setRequestLocale } from "next-intl/server";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { Hero } from "@/components/sections/Hero";
import { Features } from "@/components/sections/Features";
import { AppDownloadSection } from "@/components/sections/AppDownloadSection";
import { About } from "@/components/sections/About";
import { BusinessTypes } from "@/components/sections/BusinessTypes";
import { Contact } from "@/components/sections/Contact";
import { SplashScreen } from "@/components/ui/SplashScreen";
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
      <SplashScreen />
      <Navbar />
      <main id="main" className="flex-1">
        <Hero />
        <Features />
        <AppDownloadSection />
        <About />
        <BusinessTypes />
        <Contact />
      </main>
      <Footer />
    </>
  );
}
