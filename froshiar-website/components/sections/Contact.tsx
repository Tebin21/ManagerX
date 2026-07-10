import { Globe, Phone } from "lucide-react";
import { useTranslations } from "next-intl";
import { Container } from "@/components/ui/Container";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { InstagramIcon } from "@/components/ui/InstagramIcon";

export function Contact() {
  const t = useTranslations("contact");

  return (
    <section id="contact" className="py-16 sm:py-24 lg:py-32">
      <Container>
        <SectionHeading title={t("heading")} />

        <div className="mx-auto mt-12 grid max-w-2xl gap-4 sm:grid-cols-3">
          <a
            href="https://froshiar.store"
            target="_blank"
            rel="noreferrer noopener"
            className="flex items-center gap-4 rounded-2xl border border-gray-100 bg-white p-5 shadow-sm transition-shadow hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-500 dark:border-gold-900/30 dark:bg-white/[0.03]"
          >
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gold-100 text-gold-700 dark:bg-gold-900/40 dark:text-gold-300">
              <Globe size={19} />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-medium uppercase tracking-wide text-gray-400">
                {t("websiteLabel")}
              </p>
              <p className="truncate text-sm font-semibold text-ink">{t("website")}</p>
            </div>
          </a>

          <a
            href="tel:+9647708229696"
            className="flex items-center gap-4 rounded-2xl border border-gray-100 bg-white p-5 shadow-sm transition-shadow hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-500 dark:border-gold-900/30 dark:bg-white/[0.03]"
          >
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gold-100 text-gold-700 dark:bg-gold-900/40 dark:text-gold-300">
              <Phone size={19} />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-medium uppercase tracking-wide text-gray-400">
                {t("phoneLabel")}
              </p>
              <p dir="ltr" className="truncate text-sm font-semibold text-ink">
                {t("phone")}
              </p>
            </div>
          </a>

          <a
            href="https://www.instagram.com/froshiar.krd/"
            target="_blank"
            rel="noreferrer noopener"
            className="flex items-center gap-4 rounded-2xl border border-gray-100 bg-white p-5 shadow-sm transition-shadow hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-500 dark:border-gold-900/30 dark:bg-white/[0.03]"
          >
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gold-100 text-gold-700 dark:bg-gold-900/40 dark:text-gold-300">
              <InstagramIcon size={19} />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-medium uppercase tracking-wide text-gray-400">
                {t("instagramLabel")}
              </p>
              <p className="truncate text-sm font-semibold text-ink">{t("instagram")}</p>
            </div>
          </a>
        </div>
      </Container>
    </section>
  );
}
