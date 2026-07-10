import {
  Boxes,
  ShoppingCart,
  Users,
  Receipt,
  BarChart3,
  Globe,
  Cloud,
  Languages,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { Container } from "@/components/ui/Container";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { FeatureCard } from "@/components/ui/FeatureCard";

const FEATURE_ICONS = {
  inventory: Boxes,
  salesPos: ShoppingCart,
  customers: Users,
  expenses: Receipt,
  reports: BarChart3,
  onlineStore: Globe,
  cloudSync: Cloud,
  multiLang: Languages,
} as const;

export function Features() {
  const t = useTranslations("features");

  return (
    <section id="features" className="py-24 sm:py-32">
      <Container>
        <SectionHeading title={t("heading")} subtitle={t("subheading")} />

        <div className="mt-16 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {(Object.keys(FEATURE_ICONS) as Array<keyof typeof FEATURE_ICONS>).map(
            (key) => (
              <FeatureCard
                key={key}
                icon={FEATURE_ICONS[key]}
                title={t(`items.${key}.title`)}
                description={t(`items.${key}.description`)}
              />
            )
          )}
        </div>
      </Container>
    </section>
  );
}
