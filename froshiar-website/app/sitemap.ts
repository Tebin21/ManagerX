import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/seo";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: SITE_URL,
      lastModified: new Date(),
      alternates: {
        languages: {
          en: SITE_URL,
          "ckb-IQ": `${SITE_URL}/ckb`,
        },
      },
    },
  ];
}
