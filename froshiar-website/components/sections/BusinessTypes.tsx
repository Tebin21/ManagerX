import {
  Smartphone,
  UtensilsCrossed,
  Coffee,
  Pill,
  ShoppingBasket,
  Shirt,
  Cpu,
  Warehouse,
  MoreHorizontal,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { Container } from "@/components/ui/Container";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { BusinessTypeCard } from "@/components/ui/BusinessTypeCard";

const BUSINESS_TYPE_ICONS = {
  mobileShops: Smartphone,
  restaurants: UtensilsCrossed,
  cafes: Coffee,
  pharmacies: Pill,
  markets: ShoppingBasket,
  clothing: Shirt,
  electronics: Cpu,
  warehouses: Warehouse,
  more: MoreHorizontal,
} as const;

export function BusinessTypes() {
  const t = useTranslations("businessTypes");

  return (
    <section className="py-24 sm:py-32">
      <Container>
        <SectionHeading title={t("heading")} />

        <div className="mt-16 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
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
