import { useLocale } from "../../i18n/LocaleContext";
import { Container } from "../ui/Container";
import { GradientBlob } from "../ui/GradientBlob";
import { FloatingWrapper } from "../hero/FloatingWrapper";
import { PhoneMockup } from "../hero/PhoneMockup";
import { TabletMockup } from "../hero/TabletMockup";

export function Hero() {
  const { messages } = useLocale();
  const t = messages.hero;

  return (
    <section id="home" className="relative overflow-hidden pt-16 pb-24 sm:pt-24 sm:pb-32">
      <GradientBlob className="-top-24 -start-24 h-80 w-80" />
      <GradientBlob className="top-40 -end-32 h-96 w-96" />

      <Container className="relative">
        <div className="mx-auto max-w-3xl text-center">
          <h1 className="text-4xl font-bold tracking-tight text-ink sm:text-5xl lg:text-6xl">
            {t.title}
          </h1>
          <p className="mx-auto mt-6 max-w-xl text-lg text-slate-500">{t.subtitle}</p>
        </div>

        <div className="relative mx-auto mt-20 flex max-w-4xl items-end justify-center gap-4 sm:mt-28 sm:gap-6">
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
