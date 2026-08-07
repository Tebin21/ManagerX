import type { Metadata } from "next";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { Container } from "@/components/ui/Container";
import { LegalJsonLd } from "@/components/legal/LegalJsonLd";
import { List } from "@/lib/legal/legal-ui";
import { DeletionWarning } from "@/components/delete-account/DeletionWarning";
import { DeletionSteps } from "@/components/delete-account/DeletionSteps";
import { HelpCallout } from "@/components/delete-account/HelpCallout";
import { SITE_URL, SITE_NAME } from "@/lib/seo";

const DESCRIPTION =
  "Learn how to permanently delete your Froshiar account and associated data.";
const FIRST_PUBLISHED = "2026-08-07";
const LAST_UPDATED = "2026-08-07";

export function generateMetadata(): Metadata {
  const title = "Delete Account | Froshiar";

  return {
    metadataBase: new URL(SITE_URL),
    title,
    description: DESCRIPTION,
    alternates: {
      canonical: "/delete-account",
    },
    openGraph: {
      title,
      description: DESCRIPTION,
      url: `${SITE_URL}/delete-account`,
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

export default function DeleteAccountPage() {
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
          path="/delete-account"
          name="Delete Account"
          description={DESCRIPTION}
          firstPublished={FIRST_PUBLISHED}
          lastUpdated={LAST_UPDATED}
        />

        <section className="pb-8 pt-16 sm:pt-20">
          <Container>
            <p className="text-xs font-semibold uppercase tracking-widest text-gold-600 dark:text-gold-400">
              Account
            </p>
            <h1 className="mt-3 text-3xl font-bold tracking-tight text-ink sm:text-4xl">
              Delete Your Froshiar Account
            </h1>
            <p className="mt-4 max-w-2xl text-base text-gray-500 dark:text-gray-400">
              You can permanently delete your Froshiar account and associated data at any time.
            </p>
          </Container>
        </section>

        <section className="pb-16">
          <Container>
            <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm dark:border-gold-900/30 dark:bg-white/[0.03] sm:p-8">
              <h2 className="text-lg font-semibold tracking-tight text-ink sm:text-xl">
                What gets permanently removed
              </h2>
              <div className="mt-4 text-sm leading-relaxed text-gray-600 dark:text-gray-300">
                <List
                  items={[
                    "Account",
                    "Business information",
                    "Products",
                    "Inventory",
                    "Customers",
                    "Sales",
                    "Purchases",
                    "Expenses",
                    "Debts",
                    "Reports",
                    "Images",
                    "Local backups",
                    "Online Store information (if enabled)",
                  ]}
                />
              </div>
              <DeletionWarning />
            </div>
          </Container>
        </section>

        <section className="pb-16">
          <Container>
            <h2 className="text-lg font-semibold tracking-tight text-ink sm:text-xl">
              How to delete your account
            </h2>
            <DeletionSteps />
          </Container>
        </section>

        <section className="pb-16">
          <Container>
            <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm dark:border-gold-900/30 dark:bg-white/[0.03] sm:p-8">
              <h2 className="text-lg font-semibold tracking-tight text-ink sm:text-xl">
                Data retention
              </h2>
              <div className="mt-4 text-sm leading-relaxed text-gray-600 dark:text-gray-300">
                <List
                  items={[
                    "Your Firebase account is removed.",
                    "The local SQLite database on your device is deleted.",
                    "Locally stored images are deleted.",
                    "Cached files are deleted.",
                    "Online Store data (if enabled) is removed.",
                    "Authentication tokens are deleted.",
                  ]}
                />
              </div>
            </div>
          </Container>
        </section>

        <section className="pb-24">
          <Container>
            <HelpCallout />
          </Container>
        </section>
      </main>
      <Footer />
    </>
  );
}
