import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/seo";
import { PRIVACY_LAST_UPDATED } from "@/lib/legal/privacy-sections";
import { TERMS_LAST_UPDATED } from "@/lib/legal/terms-sections";

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
    {
      url: `${SITE_URL}/privacy`,
      lastModified: new Date(PRIVACY_LAST_UPDATED),
      changeFrequency: "yearly",
      priority: 0.3,
    },
    {
      url: `${SITE_URL}/terms`,
      lastModified: new Date(TERMS_LAST_UPDATED),
      changeFrequency: "yearly",
      priority: 0.3,
    },
  ];
}
