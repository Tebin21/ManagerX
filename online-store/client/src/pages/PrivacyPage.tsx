import { useDocumentHead } from "../marketing/hooks/useDocumentHead";
import { LegalHeader } from "../components/legal/LegalHeader";
import { Container } from "../components/legal/Container";
import { TableOfContents } from "../components/legal/TableOfContents";
import { SectionHeadingLink } from "../components/legal/SectionHeadingLink";
import { LegalJsonLd } from "../components/legal/LegalJsonLd";
import { PRIVACY_SECTIONS, PRIVACY_LAST_UPDATED, PRIVACY_FIRST_PUBLISHED } from "../lib/legal/privacy-sections";
import { PRIVACY_BODY } from "../lib/legal/privacy-body";
import { Footer } from "../components/Footer";

const DESCRIPTION =
  "How Froshiar collects, uses, stores, and protects your data across Android, iOS, and Web.";

export function PrivacyPage() {
  useDocumentHead({ title: "Privacy Policy — Froshiar", description: DESCRIPTION });

  const formattedDate = new Intl.DateTimeFormat("en-US", { dateStyle: "long" }).format(
    new Date(PRIVACY_LAST_UPDATED)
  );

  return (
    <div className="flex min-h-screen flex-col bg-white">
      <LegalHeader />
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
            <p className="text-xs font-semibold uppercase tracking-widest text-gold-dark">Legal</p>
            <h1 className="mt-3 text-3xl font-bold tracking-tight text-ink sm:text-4xl">Privacy Policy</h1>
            <p className="mt-3 text-sm text-slate-500">
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
                    className="scroll-mt-28 rounded-2xl border border-slate-100 bg-white p-6 shadow-sm sm:p-8"
                  >
                    <SectionHeadingLink id={section.id} number={i + 1} title={section.title} />
                    <div className="mt-4 space-y-4 text-sm leading-relaxed text-slate-600">
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
    </div>
  );
}
