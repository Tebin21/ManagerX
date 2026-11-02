import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { Container } from "@/components/ui/Container";
import { TableOfContents } from "@/components/legal/TableOfContents";
import { SectionHeadingLink } from "@/components/legal/SectionHeadingLink";
import { LegalJsonLd } from "@/components/legal/LegalJsonLd";
import {
  getTermsSections,
  TERMS_LAST_UPDATED,
  TERMS_FIRST_PUBLISHED,
} from "@/lib/legal/terms-sections";
import { getTermsBody } from "@/lib/legal/terms-body";
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
  const title = isCkb ? `مەرجەکانی بەکارهێنان — ${SITE_NAME}` : `Terms of Service — ${SITE_NAME}`;
  const description = isCkb
    ? "مەرج و یاساکانی بەکارهێنانی سیستەمی فرۆشیار لەسەر ئەندرۆید، ئایفۆن و وێب."
    : "The terms and conditions that govern your use of Froshiar across Android, iOS, and Web.";

  return {
    metadataBase: new URL(SITE_URL),
    title,
    description,
    alternates: {
      canonical: locale === routing.defaultLocale ? "/terms" : `/${locale}/terms`,
    },
    openGraph: {
      title,
      description,
      url: locale === routing.defaultLocale ? `${SITE_URL}/terms` : `${SITE_URL}/${locale}/terms`,
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

export default async function TermsOfServicePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const isCkb = locale === "ckb";
  const sections = getTermsSections(locale);
  const body = getTermsBody(locale);

  const formattedDate = isCkb
    ? "٢٥ی تەمموزی ٢٠٢٦"
    : new Intl.DateTimeFormat("en-US", { dateStyle: "long" }).format(
        new Date(TERMS_LAST_UPDATED)
      );

  const pageTitle = isCkb ? "مەرجەکانی بەکارهێنان" : "Terms of Service";
  const legalBadge = isCkb ? "یاسایی" : "Legal";
  const lastUpdatedLabel = isCkb ? "دواین نوێکردنەوە:" : "Last updated:";
  const description = isCkb
    ? "مەرج و ڕێساکانی بەکارهێنانی سیستەمی فرۆشیار."
    : "The terms and conditions that govern your use of Froshiar across Android, iOS, and Web.";

  return (
    <>
      <Navbar />
      <main id="main" className="flex-1">
        <LegalJsonLd
          path={`/${locale}/terms`}
          name={pageTitle}
          description={description}
          firstPublished={TERMS_FIRST_PUBLISHED}
          lastUpdated={TERMS_LAST_UPDATED}
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
              <time dateTime={TERMS_LAST_UPDATED} className="font-medium text-slate-300">
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
                      path={`/${locale}/terms`}
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
