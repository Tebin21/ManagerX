import Image from "next/image";
import { useTranslations } from "next-intl";
import { Container } from "@/components/ui/Container";

export function Footer() {
  const t = useTranslations("footer");

  return (
    <footer className="border-t border-gray-100 py-10 dark:border-gold-900/40">
      <Container className="flex flex-col items-center justify-between gap-4 text-sm text-gray-500 sm:flex-row dark:text-gray-400">
        <p>{t("copyright")}</p>
        <a
          href="https://www.bexdre.com"
          target="_blank"
          rel="noreferrer noopener"
          className="flex items-center gap-2 transition-opacity hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-500 focus-visible:rounded-sm"
        >
          <span>{t("designedBy")}</span>
          <Image
            src="/images/bexdrelogo-dark.png"
            alt="BexDre"
            width={72}
            height={18}
            className="block dark:hidden"
          />
          <Image
            src="/images/bexdrelogo-light.png"
            alt="BexDre"
            width={72}
            height={18}
            className="hidden dark:block"
          />
        </a>
      </Container>
    </footer>
  );
}
