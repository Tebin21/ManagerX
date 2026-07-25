import type { Metadata } from "next";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { Container } from "@/components/ui/Container";
import { TableOfContents } from "@/components/legal/TableOfContents";
import { SectionHeadingLink } from "@/components/legal/SectionHeadingLink";
import { LegalJsonLd } from "@/components/legal/LegalJsonLd";
import {
  PRIVACY_SECTIONS,
  PRIVACY_LAST_UPDATED,
  PRIVACY_FIRST_PUBLISHED,
} from "@/lib/legal/privacy-sections";
import { PRIVACY_BODY } from "@/lib/legal/privacy-body";
import { SITE_URL, SITE_NAME } from "@/lib/seo";

const DESCRIPTION =
  "How Froshiar collects, uses, stores, and protects your data across Android, iOS, and Web.";

export function generateMetadata(): Metadata {
  const title = `Privacy Policy — ${SITE_NAME}`;

  return {
    metadataBase: new URL(SITE_URL),
    title,
    description: DESCRIPTION,
    alternates: {
      canonical: "/privacy",
    },
    openGraph: {
      title,
      description: DESCRIPTION,
      url: `${SITE_URL}/privacy`,
      siteName: SITE_NAME,
      type: "website",
      locale: "en_US",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description: DESCRIPTION,
    },
    robots: {
      index: true,
      follow: true,
    },
  };
}

export default function PrivacyPolicyPage() {
  const formattedDate = new Intl.DateTimeFormat("en-US", { dateStyle: "long" }).format(
    new Date(PRIVACY_LAST_UPDATED)
  );

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
        <LegalJsonLd
          path="/privacy"
          name="Privacy Policy"
          description={DESCRIPTION}
          firstPublished={PRIVACY_FIRST_PUBLISHED}
          lastUpdated={PRIVACY_LAST_UPDATED}
        />

        <section className="pb-8 pt-16 sm:pt-20">
          <Container>
            <p className="text-xs font-semibold uppercase tracking-widest text-gold-600 dark:text-gold-400">
              Legal
            </p>
            <h1 className="mt-3 text-3xl font-bold tracking-tight text-ink sm:text-4xl">
              Privacy Policy
            </h1>
            <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">
              Last updated: <time dateTime={PRIVACY_LAST_UPDATED}>{formattedDate}</time>
            </p>
          </Container>
        </section>

        <section className="pb-24">
          <Container>
            <div className="lg:grid lg:grid-cols-[240px_1fr] lg:items-start lg:gap-12">
              <TableOfContents sections={PRIVACY_SECTIONS} />

              <div className="min-w-0 space-y-6">
                {PRIVACY_SECTIONS.map((section, i) => (
                  <article
                    key={section.id}
                    id={section.id}
                    className="scroll-mt-28 rounded-2xl border border-gray-100 bg-white p-6 shadow-sm dark:border-gold-900/30 dark:bg-white/[0.03] sm:p-8"
                  >
                    <SectionHeadingLink id={section.id} number={i + 1} title={section.title} />
                    <div className="mt-4 space-y-4 text-sm leading-relaxed text-gray-600 dark:text-gray-300">
                      {PRIVACY_BODY[section.id]}
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
