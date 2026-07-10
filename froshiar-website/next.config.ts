import path from "path";
import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./i18n/request.ts");

const nextConfig: NextConfig = {
  // The repo root (ManagerX/) has its own package-lock.json for the Expo app,
  // which Next.js otherwise mistakes for this project's workspace root.
  turbopack: {
    root: path.join(__dirname),
  },
};

export default withNextIntl(nextConfig);
