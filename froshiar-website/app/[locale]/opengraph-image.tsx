import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { getTranslations } from "next-intl/server";
import { colors } from "@/lib/colors";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "hero" });

  const logo = await readFile(
    join(process.cwd(), "public/images/logo-splash-white.png")
  );
  const logoSrc = `data:image/png;base64,${logo.toString("base64")}`;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: `radial-gradient(circle at 30% 20%, ${colors.gold900} 0%, ${colors.gold800} 45%, ${colors.ink} 100%)`,
          padding: "80px",
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={logoSrc} width={120} height={120} alt="" />
        <div
          style={{
            marginTop: 40,
            fontSize: 56,
            fontWeight: 700,
            color: colors.white,
            textAlign: "center",
            maxWidth: 900,
          }}
        >
          {t("title")}
        </div>
        <div
          style={{
            marginTop: 24,
            fontSize: 28,
            color: colors.gold300,
            textAlign: "center",
          }}
        >
          froshiar.store
        </div>
      </div>
    ),
    { ...size }
  );
}
