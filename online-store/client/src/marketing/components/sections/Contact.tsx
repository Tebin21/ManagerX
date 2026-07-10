import { Globe, Mail } from "lucide-react";
import { useLocale } from "../../i18n/LocaleContext";
import { Container } from "../ui/Container";
import { SectionHeading } from "../ui/SectionHeading";

export function Contact() {
  const { messages } = useLocale();
  const t = messages.contact;

  return (
    <section id="contact" className="py-24 sm:py-32">
      <Container>
        <SectionHeading title={t.heading} />

        <div className="mx-auto mt-12 flex max-w-md flex-col gap-4">
          <a
            href="https://froshiar.store"
            target="_blank"
            rel="noreferrer noopener"
            className="flex items-center gap-4 rounded-2xl border border-slate-100 bg-white p-5 shadow-card transition-shadow hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-500"
          >
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gold-100 text-gold-700">
              <Globe size={19} />
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                {t.websiteLabel}
              </p>
              <p className="text-sm font-semibold text-ink">{t.website}</p>
            </div>
          </a>

          <a
            href="mailto:support@froshiar.store"
            className="flex items-center gap-4 rounded-2xl border border-slate-100 bg-white p-5 shadow-card transition-shadow hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-500"
          >
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gold-100 text-gold-700">
              <Mail size={19} />
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                {t.emailLabel}
              </p>
              <p className="text-sm font-semibold text-ink">{t.email}</p>
            </div>
          </a>
        </div>
      </Container>
    </section>
  );
}
