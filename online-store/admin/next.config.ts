import path from "path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The repo root (ManagerX/) has its own package-lock.json for the Expo app,
  // which Next.js otherwise mistakes for this project's workspace root.
  turbopack: {
    root: path.join(__dirname),
  },
};

export default nextConfig;
