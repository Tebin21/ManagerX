import { useTranslations } from "next-intl";
import { Container } from "@/components/ui/Container";

export function About() {
  const t = useTranslations("about");

  return (
    <section className="py-16 sm:py-24 lg:py-32">
      <Container>
        <div className="mx-auto max-w-3xl rounded-3xl bg-gold-50 p-7 text-center sm:p-10 lg:p-14 dark:bg-white/[0.03]">
          <h2 className="text-xl font-bold tracking-tight text-ink sm:text-2xl lg:text-3xl">
            {t("heading")}
          </h2>
          <p className="mt-4 text-base leading-relaxed text-gray-600 sm:mt-5 sm:text-lg dark:text-gray-300">
            {t("paragraph")}
          </p>
        </div>
      </Container>
    </section>
  );
}
