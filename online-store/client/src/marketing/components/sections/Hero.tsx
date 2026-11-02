import { useLocale } from "../../i18n/LocaleContext";
import { Container } from "../ui/Container";
import { GradientBlob } from "../ui/GradientBlob";

export function Hero() {
  const { messages } = useLocale();
  const t = messages.hero;

  return (
    <section id="home" className="relative overflow-hidden pt-12 pb-16 sm:pt-20 sm:pb-24">
      <GradientBlob className="-top-24 -start-24 h-64 w-64 sm:h-80 sm:w-80" />
      <GradientBlob className="top-40 -end-32 h-72 w-72 sm:h-96 sm:w-96" />

      <Container className="relative">
        <div className="mx-auto max-w-3xl text-center">
          <h1 className="text-3xl font-bold tracking-tight text-ink sm:text-5xl lg:text-6xl">
            {t.title}
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-base text-slate-500 sm:mt-6 sm:text-lg">
            {t.subtitle}
          </p>
        </div>
      </Container>
    </section>
  );
}
