import {
  Store,
  Smartphone,
  Warehouse,
  Globe,
  Truck,
  Building2,
  Shirt,
  Pill,
  Watch,
  Gem,
  Car,
  Boxes,
  UtensilsCrossed,
  Sparkles,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { Container } from "@/components/ui/Container";
import { BusinessTypeCard } from "@/components/ui/BusinessTypeCard";

const BUSINESS_TYPE_ICONS = {
  markets: Store,
  mobileShops: Smartphone,
  warehouseOwners: Warehouse,
  onlineBusiness: Globe,
  salesReps: Truck,
  distributionCompanies: Building2,
  clothing: Shirt,
  pharmacies: Pill,
  watchShops: Watch,
  womenAccessories: Gem,
  autoParts: Car,
  megaWarehouses: Boxes,
  restaurants: UtensilsCrossed,
  more: Sparkles,
} as const;

export function BusinessTypes() {
  const t = useTranslations("businessTypes");

  return (
    <section className="relative py-20 sm:py-28 lg:py-36 overflow-hidden">
      {/* Background ambient liquid glow */}
      <div
        aria-hidden="true"
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[650px] h-[350px] bg-amber-400/[0.04] dark:bg-amber-400/[0.025] rounded-full blur-3xl pointer-events-none"
      />

      <Container className="relative z-10">
        <div className="mx-auto max-w-3xl text-center">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-gold-400/30 bg-gold-500/10 dark:bg-gold-500/[0.08] backdrop-blur-xl text-xs sm:text-sm font-bold text-amber-600 dark:text-gold-300 shadow-[inset_0_1px_1px_rgba(255,255,255,0.2)]">
            <Sparkles size={14} className="text-amber-500 dark:text-gold-400" />
            <span>{t("badge")}</span>
          </div>

          <h2 className="mt-5 text-2xl sm:text-4xl lg:text-5xl font-black tracking-tight text-ink dark:text-white leading-[1.25]">
            {t("heading")}
          </h2>

          <p className="mt-4 text-base sm:text-lg text-slate-600 dark:text-slate-300 leading-relaxed font-normal">
            {t("subtitle")}
          </p>
        </div>

        <div className="mt-12 sm:mt-16 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-7 gap-3.5 sm:gap-4 lg:gap-5 max-w-7xl mx-auto">
          {(
            Object.keys(BUSINESS_TYPE_ICONS) as Array<keyof typeof BUSINESS_TYPE_ICONS>
          ).map((key) => (
            <BusinessTypeCard
              key={key}
              icon={BUSINESS_TYPE_ICONS[key]}
              label={t(`items.${key}`)}
            />
          ))}
        </div>
      </Container>
    </section>
  );
}
