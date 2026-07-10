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
