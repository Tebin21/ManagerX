import { Apple, Play } from "lucide-react";
import { useLocale } from "../../i18n/LocaleContext";
import { Container } from "../ui/Container";
import { SectionHeading } from "../ui/SectionHeading";
import { StoreBadge } from "../ui/StoreBadge";

export function DownloadApp() {
  const { messages } = useLocale();
  const t = messages.downloadApp;

  return (
    <section className="py-24 sm:py-32">
      <Container>
        <SectionHeading title={t.heading} subtitle={t.subheading} />
        <div className="mt-8 flex flex-col items-center gap-3">
          <span className="rounded-full bg-gold-100 px-3 py-1 text-xs font-semibold text-gold-700">
            {t.comingSoon}
          </span>
          <div className="mt-4 flex flex-wrap items-center justify-center gap-4">
            <StoreBadge icon={Apple} eyebrow={t.appStore.eyebrow} name={t.appStore.name} />
            <StoreBadge icon={Play} eyebrow={t.googlePlay.eyebrow} name={t.googlePlay.name} />
          </div>
        </div>
      </Container>
    </section>
  );
}
