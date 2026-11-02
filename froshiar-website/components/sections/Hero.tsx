import { useTranslations } from "next-intl";
import { Container } from "@/components/ui/Container";
import { GradientBlob } from "@/components/ui/GradientBlob";
import { AppDownloadButtons } from "@/components/ui/AppDownloadButtons";

export function Hero() {
  const t = useTranslations("hero");

  return (
    <section id="home" className="relative overflow-hidden pt-28 pb-16 sm:pt-36 sm:pb-24 lg:pt-40 lg:pb-28">
      <GradientBlob className="-top-24 -start-24 h-64 w-64 sm:h-80 sm:w-80" />
      <GradientBlob className="top-40 -end-32 h-72 w-72 sm:h-96 sm:w-96" />

      <Container className="relative">
        <div className="mx-auto max-w-3xl text-center">
          <h1 className="text-3xl font-bold tracking-tight text-ink sm:text-5xl lg:text-6xl">
            {t("title")}
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-base text-gray-500 sm:mt-6 sm:text-lg dark:text-gray-400">
            {t("subtitle")}
          </p>

          {/* ── Official Store Download Buttons (App Store & Google Play) ── */}
          <div className="mt-8 sm:mt-10 flex flex-col items-center justify-center gap-3">
            <AppDownloadButtons size="sm" />
            <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 font-medium mt-1">
              <span className="flex text-amber-400 tracking-wider">★★★★★</span>
              <span>•</span>
              <span className="text-slate-600 dark:text-slate-300 font-bold">iOS 15+ & Android</span>
              <span>•</span>
              <span className="text-[#D4AF37] font-extrabold">داگرتنی بێ بەرامبەر</span>
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
}
