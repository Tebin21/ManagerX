import { useDocumentHead } from "../marketing/hooks/useDocumentHead";
import { LegalHeader } from "../components/legal/LegalHeader";
import { Container } from "../components/legal/Container";
import { LegalJsonLd } from "../components/legal/LegalJsonLd";
import { List } from "../lib/legal/legal-ui";
import { DeletionWarning } from "../components/delete-account/DeletionWarning";
import { DeletionSteps } from "../components/delete-account/DeletionSteps";
import { HelpCallout } from "../components/delete-account/HelpCallout";
import { Footer } from "../components/Footer";

const DESCRIPTION =
  "Learn how to permanently delete your Froshiar account and associated data.";
const FIRST_PUBLISHED = "2026-08-07";
const LAST_UPDATED = "2026-08-07";

export function DeleteAccountPage() {
  useDocumentHead({ title: "Delete Account | Froshiar", description: DESCRIPTION });

  return (
    <div className="flex min-h-screen flex-col bg-white">
      <LegalHeader />
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
            <p className="text-xs font-semibold uppercase tracking-widest text-gold-dark">
              Account
            </p>
            <h1 className="mt-3 text-3xl font-bold tracking-tight text-ink sm:text-4xl">
              Delete Your Froshiar Account
            </h1>
            <p className="mt-4 max-w-2xl text-base text-slate-500">
              You can permanently delete your Froshiar account and associated data at any time.
            </p>
          </Container>
        </section>

        <section className="pb-16">
          <Container>
            <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm sm:p-8">
              <h2 className="text-lg font-semibold tracking-tight text-ink sm:text-xl">
                What gets permanently removed
              </h2>
              <div className="mt-4 text-sm leading-relaxed text-slate-600">
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
            <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm sm:p-8">
              <h2 className="text-lg font-semibold tracking-tight text-ink sm:text-xl">
                Data retention
              </h2>
              <div className="mt-4 text-sm leading-relaxed text-slate-600">
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
    </div>
  );
}
