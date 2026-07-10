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
import { useLocale } from "../../i18n/LocaleContext";
import { Container } from "../ui/Container";
import { SectionHeading } from "../ui/SectionHeading";
import { BusinessTypeCard } from "../ui/BusinessTypeCard";

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
  const { messages } = useLocale();
  const t = messages.businessTypes;

  return (
    <section className="py-16 sm:py-24 lg:py-32">
      <Container>
        <SectionHeading title={t.heading} />

        <div className="mt-12 grid grid-cols-2 gap-3 sm:mt-16 sm:grid-cols-3 sm:gap-4 lg:grid-cols-5">
          {(Object.keys(BUSINESS_TYPE_ICONS) as Array<keyof typeof BUSINESS_TYPE_ICONS>).map(
            (key) => (
              <BusinessTypeCard key={key} icon={BUSINESS_TYPE_ICONS[key]} label={t.items[key]} />
            )
          )}
        </div>
      </Container>
    </section>
  );
}
