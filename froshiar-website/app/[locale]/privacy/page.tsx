import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { Container } from "@/components/ui/Container";
import { TableOfContents } from "@/components/legal/TableOfContents";
import { SectionHeadingLink } from "@/components/legal/SectionHeadingLink";
import { LegalJsonLd } from "@/components/legal/LegalJsonLd";
import {
  getPrivacySections,
  PRIVACY_LAST_UPDATED,
  PRIVACY_FIRST_PUBLISHED,
} from "@/lib/legal/privacy-sections";
import { getPrivacyBody } from "@/lib/legal/privacy-body";
import { SITE_URL, SITE_NAME } from "@/lib/seo";
import { routing } from "@/i18n/routing";

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const isCkb = locale === "ckb";
  const title = isCkb ? `سیاسەتی پاراستنی نهێنی — ${SITE_NAME}` : `Privacy Policy — ${SITE_NAME}`;
  const description = isCkb
    ? "چۆنیەتی کۆکردنەوە، بەکارهێنان و پاراستنی زانیارییەکانت لە سیستەمی فرۆشیار لەسەر ئەندرۆید، ئایفۆن و وێب."
    : "How Froshiar collects, uses, stores, and protects your data across Android, iOS, and Web.";

  return {
    metadataBase: new URL(SITE_URL),
    title,
    description,
    alternates: {
      canonical: locale === routing.defaultLocale ? "/privacy" : `/${locale}/privacy`,
    },
    openGraph: {
      title,
      description,
      url: locale === routing.defaultLocale ? `${SITE_URL}/privacy` : `${SITE_URL}/${locale}/privacy`,
      siteName: SITE_NAME,
      type: "website",
      locale: isCkb ? "ckb_IQ" : "en_US",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
    robots: {
      index: true,
      follow: true,
    },
  };
}

export default async function PrivacyPolicyPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const isCkb = locale === "ckb";
  const sections = getPrivacySections(locale);
  const body = getPrivacyBody(locale);

  const formattedDate = isCkb
    ? "٢٥ی تەمموزی ٢٠٢٦"
    : new Intl.DateTimeFormat("en-US", { dateStyle: "long" }).format(
        new Date(PRIVACY_LAST_UPDATED)
      );

  const pageTitle = isCkb ? "سیاسەتی پاراستنی نهێنی" : "Privacy Policy";
  const legalBadge = isCkb ? "یاسایی" : "Legal";
  const lastUpdatedLabel = isCkb ? "دواین نوێکردنەوە:" : "Last updated:";
  const description = isCkb
    ? "چۆنیەتی کۆکردنەوە، بەکارهێنان و پاراستنی زانیارییەکانت لە سیستەمی فرۆشیار."
    : "How Froshiar collects, uses, stores, and protects your data across Android, iOS, and Web.";

  return (
    <>
      <Navbar />
      <main id="main" className="flex-1">
        <LegalJsonLd
          path={`/${locale}/privacy`}
          name={pageTitle}
          description={description}
          firstPublished={PRIVACY_FIRST_PUBLISHED}
          lastUpdated={PRIVACY_LAST_UPDATED}
        />

        <section className="pb-8 pt-24 sm:pt-28 lg:pt-32">
          <Container>
            <p className="text-xs font-semibold uppercase tracking-widest text-gold-600 dark:text-gold-400">
              {legalBadge}
            </p>
            <h1 className="mt-3 text-3xl font-bold tracking-tight text-ink sm:text-4xl lg:text-5xl">
              {pageTitle}
            </h1>
            <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">
              {lastUpdatedLabel}{" "}
              <time dateTime={PRIVACY_LAST_UPDATED} className="font-medium text-slate-300">
                {formattedDate}
              </time>
            </p>
          </Container>
        </section>

        <section className="pb-24">
          <Container>
            <div className="lg:grid lg:grid-cols-[260px_1fr] lg:items-start lg:gap-12">
              <TableOfContents sections={sections} locale={locale} />

              <div className="min-w-0 space-y-6">
                {sections.map((section, i) => (
                  <article
                    key={section.id}
                    id={section.id}
                    className="scroll-mt-28 rounded-2xl border border-gray-100 bg-white p-6 shadow-sm dark:border-gold-900/30 dark:bg-white/[0.03] sm:p-8"
                  >
                    <SectionHeadingLink
                      id={section.id}
                      number={i + 1}
                      title={section.title}
                      path={`/${locale}/privacy`}
                    />
                    <div className="mt-4 space-y-4 text-sm sm:text-base leading-relaxed text-gray-600 dark:text-gray-300 font-normal">
                      {body[section.id]}
                    </div>
                  </article>
                ))}
              </div>
            </div>
          </Container>
        </section>
      </main>
      <Footer />
    </>
  );
}
