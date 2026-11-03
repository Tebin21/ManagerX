import Image from "next/image";
import { useTranslations } from "next-intl";
import { Container } from "@/components/ui/Container";
import { Link } from "@/i18n/navigation";
import { AppDownloadButtons } from "@/components/ui/AppDownloadButtons";

export function Footer() {
  const t = useTranslations("footer");

  return (
    <footer className="relative border-t border-white/[0.08] bg-[#070A0F]/80 backdrop-blur-2xl py-10 sm:py-14 text-sm text-slate-400">
      {/* Top Specular Gold Hairline Highlight */}
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-gold-500/25 to-transparent pointer-events-none" />

      <Container className="flex flex-col">
        {/* Tier 1: App Downloads & Legal Navigation */}
        <div className="flex flex-col items-center justify-between gap-6 md:flex-row">
          {/* App Store & Google Play download badges */}
          <div className="flex items-center justify-center">
            <AppDownloadButtons size="sm" />
          </div>

          {/* Legal policy links */}
          <div className="flex flex-wrap items-center justify-center gap-x-3 sm:gap-x-4 gap-y-2 text-xs sm:text-sm font-medium">
            <Link
              href="/privacy"
              className="text-slate-400 hover:text-gold-300 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-500/60 focus-visible:rounded-md px-1 py-0.5"
            >
              {t("privacy")}
            </Link>
            <span className="text-slate-600 select-none text-xs" aria-hidden="true">
              •
            </span>
            <Link
              href="/terms"
              className="text-slate-400 hover:text-gold-300 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-500/60 focus-visible:rounded-md px-1 py-0.5"
            >
              {t("terms")}
            </Link>
            <span className="text-slate-600 select-none text-xs" aria-hidden="true">
              •
            </span>
            <Link
              href="/delete-account"
              className="text-slate-400 hover:text-gold-300 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-500/60 focus-visible:rounded-md px-1 py-0.5"
            >
              {t("deleteAccount")}
            </Link>
          </div>
        </div>

        {/* Divider between Tier 1 and Tier 2 */}
        <div className="my-6 sm:my-8 h-px w-full bg-gradient-to-r from-transparent via-white/[0.08] to-transparent" />

        {/* Tier 2: Copyright & BexDre Agency Attribution */}
        <div className="flex flex-col-reverse items-center justify-between gap-4 sm:flex-row text-xs">
          {/* Copyright notice */}
          <p className="text-slate-400 font-medium tracking-wide text-center sm:text-start">
            {t("copyright")}
          </p>

          {/* BexDre Agency Badge with high-contrast logo & cyan glow */}
          <a
            href="https://www.bexdre.com"
            target="_blank"
            rel="noreferrer noopener"
            className="group relative flex items-center gap-2.5 rounded-full border border-white/10 bg-white/[0.03] px-3.5 py-1.5 backdrop-blur-xl shadow-[inset_0_1px_1px_rgba(255,255,255,0.08),0_4px_16px_rgba(0,0,0,0.3)] transition-all duration-300 hover:-translate-y-0.5 hover:border-teal-400/50 hover:bg-white/[0.06] hover:shadow-[0_0_20px_rgba(4,207,168,0.25)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400/60"
            aria-label="Designed & Developed by BexDre"
          >
            <span className="text-[11px] sm:text-xs font-medium text-slate-400 group-hover:text-slate-200 transition-colors">
              {t("designedBy")}
            </span>
            <div className="relative flex items-center">
              <Image
                src="/images/bexdrelogo-light.png"
                alt="BexDre"
                width={110}
                height={22}
                className="h-4 sm:h-4.5 w-auto object-contain brightness-110 drop-shadow-[0_1px_3px_rgba(0,0,0,0.5)] group-hover:brightness-125 group-hover:drop-shadow-[0_0_8px_rgba(4,207,168,0.6)] transition-all duration-300"
              />
            </div>
          </a>
        </div>
      </Container>
    </footer>
  );
}
