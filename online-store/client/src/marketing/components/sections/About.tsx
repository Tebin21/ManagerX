import { useLocale } from "../../i18n/LocaleContext";
import { Container } from "../ui/Container";

export function About() {
  const { messages } = useLocale();
  const t = messages.about;

  return (
    <section className="py-24 sm:py-32">
      <Container>
        <div className="mx-auto max-w-3xl rounded-3xl bg-gold-50 p-10 text-center sm:p-14">
          <h2 className="text-2xl font-bold tracking-tight text-ink sm:text-3xl">{t.heading}</h2>
          <p className="mt-5 text-lg leading-relaxed text-slate-600">{t.paragraph}</p>
        </div>
      </Container>
    </section>
  );
}
