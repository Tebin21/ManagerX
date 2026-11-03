import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { NextIntlClientProvider, hasLocale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ThemeProvider } from "next-themes";
import { routing } from "@/i18n/routing";
import { inter, rudaw, bahijJanna } from "@/lib/fonts";
import { SITE_URL, SITE_NAME } from "@/lib/seo";
import { GlobalBackground } from "@/components/ui/GlobalBackground";
import { SplashProvider } from "@/contexts/SplashContext";
import { WebsiteTracker } from "@/components/analytics/WebsiteTracker";
import "../globals.css";

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "hero" });

  return {
    metadataBase: new URL(SITE_URL),
    title: `${SITE_NAME} — ${t("title")}`,
    description: t("subtitle"),
    alternates: {
      canonical: locale === routing.defaultLocale ? "/" : `/${locale}`,
      languages: {
        en: "/en",
        // Next's built-in hreflang type only accepts known LangCode values
        // or a hyphenated `xx-YY` form; bare "ckb" isn't in its static list,
        // so "ckb-IQ" (Sorani Kurdish, Iraq) is used to satisfy the type
        // while still being a correct, more precise hreflang tag.
        "ckb-IQ": "/",
      },
    },
    openGraph: {
      title: `${SITE_NAME} — ${t("title")}`,
      description: t("subtitle"),
      url: locale === routing.defaultLocale ? SITE_URL : `${SITE_URL}/${locale}`,
      siteName: SITE_NAME,
      locale: locale === "ckb" ? "ckb_IQ" : "en_US",
      type: "website",
    },
    icons: {
      icon: "/icon.png",
      apple: "/apple-icon.png",
    },
  };
}

export default async function LocaleLayout({
  children,
  params,
}: Readonly<{
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}>) {
  const { locale } = await params;

  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }

  setRequestLocale(locale);

  const dir = locale === "ckb" ? "rtl" : "ltr";
  const bodyFontClass = locale === "ckb" ? "font-kurdish" : "font-sans";

  return (
    <html
      lang={locale}
      dir={dir}
      className={`${inter.variable} ${rudaw.variable} ${bahijJanna.variable} h-full`}
      suppressHydrationWarning
    >
      <body className={`min-h-full flex flex-col antialiased ${bodyFontClass} bg-slate-50 dark:bg-[#090C10] text-slate-900 dark:text-[#f1f5f9] relative`}>
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
          <SplashProvider>
            <GlobalBackground />
            <NextIntlClientProvider>
              <WebsiteTracker locale={locale} />
              {children}
            </NextIntlClientProvider>
          </SplashProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
