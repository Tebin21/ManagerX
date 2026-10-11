import { Inter } from "next/font/google";
import localFont from "next/font/local";

export const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const rudaw = localFont({
  src: "./rudawregular2.ttf",
  variable: "--font-rudaw",
  display: "swap",
});

export const bahijJanna = localFont({
  src: [
    {
      path: "./BahijJanna-Regular.ttf",
      weight: "400",
      style: "normal",
    },
    {
      path: "./BahijJanna-Bold.ttf",
      weight: "700",
      style: "normal",
    },
  ],
  variable: "--font-bahij",
  display: "swap",
});
