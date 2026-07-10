import { useTranslations } from "next-intl";
import { Container } from "@/components/ui/Container";
import { GradientBlob } from "@/components/ui/GradientBlob";
import { FloatingWrapper } from "@/components/hero/FloatingWrapper";
import { PhoneMockup } from "@/components/hero/PhoneMockup";
import { TabletMockup } from "@/components/hero/TabletMockup";

export function Hero() {
  const t = useTranslations("hero");

  return (
    <section id="home" className="relative overflow-hidden pt-12 pb-20 sm:pt-24 sm:pb-32">
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
        </div>

        <div className="relative mx-auto mt-14 flex max-w-4xl items-end justify-center gap-3 sm:mt-28 sm:gap-6">
          <FloatingWrapper delay={0} className="relative z-10 hidden sm:block">
            <TabletMockup />
          </FloatingWrapper>
          <FloatingWrapper delay={1.2} className="relative z-20 -mb-6">
            <PhoneMockup />
          </FloatingWrapper>
        </div>
      </Container>
    </section>
  );
}
