import { Globe, Phone } from "lucide-react";
import { useTranslations } from "next-intl";
import { Container } from "@/components/ui/Container";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { InstagramIcon } from "@/components/ui/InstagramIcon";

export function Contact() {
  const t = useTranslations("contact");

  const cardGlassClass =
    "group relative flex items-center gap-4 rounded-2xl border border-white/15 dark:border-white/[0.10] bg-white/60 dark:bg-white/[0.03] backdrop-blur-2xl p-5 shadow-[inset_0_1px_1px_0_rgba(255,255,255,0.18),0_10px_25px_rgba(0,0,0,0.35)] transition-all duration-300 hover:-translate-y-1 hover:border-gold-400/40 hover:shadow-[inset_0_1px_1px_0_rgba(255,255,255,0.3),0_15px_35px_rgba(248,198,30,0.15)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-500 overflow-hidden";

  return (
    <section id="contact" className="py-16 sm:py-24 lg:py-32">
      <Container>
        <SectionHeading title={t("heading")} />

        <div className="mx-auto mt-12 grid max-w-2xl gap-4 sm:grid-cols-3">
          <a
            href="https://froshiar.store"
            target="_blank"
            rel="noreferrer noopener"
            className={cardGlassClass}
          >
            <div className="absolute inset-0 bg-gradient-to-b from-white/[0.06] via-transparent to-transparent pointer-events-none" />
            <div className="relative z-10 flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gold-500/10 border border-gold-400/25 text-gold-400 shadow-[inset_0_1px_1px_rgba(255,255,255,0.15)] transition-transform duration-300 group-hover:scale-110">
              <Globe size={19} />
            </div>
            <div className="relative z-10 min-w-0">
              <p className="text-xs font-medium uppercase tracking-wide text-gray-400">
                {t("websiteLabel")}
              </p>
              <p className="truncate text-sm font-semibold text-ink dark:text-slate-200 group-hover:text-gold-300 transition-colors">
                {t("website")}
              </p>
            </div>
          </a>

          <a
            href="tel:+9647708229696"
            className={cardGlassClass}
          >
            <div className="absolute inset-0 bg-gradient-to-b from-white/[0.06] via-transparent to-transparent pointer-events-none" />
            <div className="relative z-10 flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gold-500/10 border border-gold-400/25 text-gold-400 shadow-[inset_0_1px_1px_rgba(255,255,255,0.15)] transition-transform duration-300 group-hover:scale-110">
              <Phone size={19} />
            </div>
            <div className="relative z-10 min-w-0">
              <p className="text-xs font-medium uppercase tracking-wide text-gray-400">
                {t("phoneLabel")}
              </p>
              <p dir="ltr" className="truncate text-sm font-semibold text-ink dark:text-slate-200 group-hover:text-gold-300 transition-colors">
                {t("phone")}
              </p>
            </div>
          </a>

          <a
            href="https://www.instagram.com/froshiar.krd/"
            target="_blank"
            rel="noreferrer noopener"
            className={cardGlassClass}
          >
            <div className="absolute inset-0 bg-gradient-to-b from-white/[0.06] via-transparent to-transparent pointer-events-none" />
            <div className="relative z-10 flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gold-500/10 border border-gold-400/25 text-gold-400 shadow-[inset_0_1px_1px_rgba(255,255,255,0.15)] transition-transform duration-300 group-hover:scale-110">
              <InstagramIcon size={19} />
            </div>
            <div className="relative z-10 min-w-0">
              <p className="text-xs font-medium uppercase tracking-wide text-gray-400">
                {t("instagramLabel")}
              </p>
              <p className="truncate text-sm font-semibold text-ink dark:text-slate-200 group-hover:text-gold-300 transition-colors">
                {t("instagram")}
              </p>
            </div>
          </a>
        </div>
      </Container>
    </section>
  );
}
