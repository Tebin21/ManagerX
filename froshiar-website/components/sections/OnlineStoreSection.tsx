"use client";

import { useState } from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import {
  Globe,
  ShoppingBag,
  Share2,
  ShoppingCart,
  Palette,
  Zap,
  CheckCircle2,
  Copy,
  Check,
  Bell,
  Sparkles,
  Phone,
  ArrowUpRight,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { Container } from "@/components/ui/Container";
import { Link } from "@/i18n/navigation";
import { InstagramIcon } from "@/components/ui/InstagramIcon";

export function OnlineStoreSection() {
  const t = useTranslations("onlineStore");
  const [copied, setCopied] = useState(false);

  const handleCopyLink = () => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText("https://froshiar.store/demo");
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    }
  };

  const featureCards = [
    {
      key: "ownWebsite",
      icon: Globe,
      accent: "text-amber-400 border-amber-400/25 bg-amber-400/10",
      title: t("features.ownWebsite.title"),
      desc: t("features.ownWebsite.desc"),
    },
    {
      key: "catalogDisplay",
      icon: ShoppingBag,
      accent: "text-gold-400 border-gold-400/25 bg-gold-400/10",
      title: t("features.catalogDisplay.title"),
      desc: t("features.catalogDisplay.desc"),
    },
    {
      key: "dedicatedLink",
      icon: Share2,
      accent: "text-sky-400 border-sky-400/25 bg-sky-400/10",
      title: t("features.dedicatedLink.title"),
      desc: t("features.dedicatedLink.desc"),
    },
    {
      key: "directOrdering",
      icon: ShoppingCart,
      accent: "text-emerald-400 border-emerald-400/25 bg-emerald-400/10",
      title: t("features.directOrdering.title"),
      desc: t("features.directOrdering.desc"),
    },
    {
      key: "customBranding",
      icon: Palette,
      accent: "text-fuchsia-400 border-fuchsia-400/25 bg-fuchsia-400/10",
      title: t("features.customBranding.title"),
      desc: t("features.customBranding.desc"),
    },
    {
      key: "realtimeSync",
      icon: Zap,
      accent: "text-yellow-400 border-yellow-400/25 bg-yellow-400/10",
      title: t("features.realtimeSync.title"),
      desc: t("features.realtimeSync.desc"),
    },
  ];

  return (
    <section id="online-store" className="relative py-20 sm:py-28 lg:py-36 overflow-hidden">
      {/* Background ambient liquid glows */}
      <div
        aria-hidden="true"
        className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[700px] h-[400px] bg-gradient-to-tr from-gold-500/[0.07] via-amber-400/[0.04] to-cyan-500/[0.03] rounded-full blur-3xl pointer-events-none -z-10"
      />

      <Container className="relative z-10">
        {/* Section Heading */}
        <div className="mx-auto max-w-3xl text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-gold-400/25 bg-gold-500/10 px-4 py-1.5 backdrop-blur-xl mb-4 shadow-[inset_0_1px_1px_rgba(255,255,255,0.15)]">
            <Sparkles className="w-3.5 h-3.5 text-gold-400" />
            <span className="text-xs font-semibold uppercase tracking-wider text-gold-400">
              {t("badge")}
            </span>
          </div>

          <h2 className="text-3xl font-extrabold tracking-tight sm:text-4xl lg:text-5xl bg-gradient-to-r from-white via-slate-100 to-gold-200 bg-clip-text text-transparent">
            {t("heading")}
          </h2>

          <p className="mt-4 text-base sm:text-lg leading-relaxed text-slate-300 max-w-2xl mx-auto">
            {t("subtitle")}
          </p>
        </div>

        {/* ── LIVE INTERACTIVE STOREFRONT MOCKUP SHOWCASE (FROSTED GLASS) ── */}
        <div className="mt-14 sm:mt-18 relative mx-auto max-w-5xl">
          {/* Frosted Glass Main Window Container */}
          <div className="relative rounded-3xl border border-white/20 dark:border-white/15 bg-slate-900/55 dark:bg-white/[0.035] backdrop-blur-2xl [-webkit-backdrop-filter:blur(24px)] p-4 sm:p-7 lg:p-9 shadow-[inset_0_1.5px_2px_rgba(255,255,255,0.22),0_24px_60px_rgba(0,0,0,0.55)] overflow-hidden">
            {/* Top specular hairline edge */}
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/30 to-transparent pointer-events-none" />

            {/* Window Browser Header */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pb-6 border-b border-white/10">
              {/* Traffic light dots */}
              <div className="hidden sm:flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-rose-500/80 shadow-[0_0_8px_rgba(244,63,94,0.4)]" />
                <span className="w-3 h-3 rounded-full bg-amber-500/80 shadow-[0_0_8px_rgba(245,158,11,0.4)]" />
                <span className="w-3 h-3 rounded-full bg-emerald-500/80 shadow-[0_0_8px_rgba(16,185,129,0.4)]" />
              </div>

              {/* URL Pill Bar */}
              <div className="flex items-center gap-2.5 rounded-full border border-white/15 bg-slate-950/70 px-4 py-1.5 shadow-[inset_0_1px_2px_rgba(0,0,0,0.5)] w-full sm:w-auto max-w-md justify-between sm:justify-start">
                <Globe className="w-3.5 h-3.5 text-gold-400 shrink-0" />
                <span dir="ltr" className="text-xs sm:text-sm font-mono text-slate-300 truncate">
                  https://froshiar.store/demo
                </span>
                <button
                  type="button"
                  onClick={handleCopyLink}
                  aria-label={t("copyLink")}
                  className="flex items-center gap-1 text-[11px] font-semibold text-gold-400 hover:text-gold-300 transition-colors bg-gold-500/10 hover:bg-gold-500/20 px-2 py-0.5 rounded-full border border-gold-400/20 shrink-0"
                >
                  {copied ? (
                    <>
                      <Check className="w-3 h-3 text-emerald-400" />
                      <span className="text-emerald-400">کۆپیکرا</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3" />
                      <span>{t("copyLink")}</span>
                    </>
                  )}
                </button>
              </div>

              {/* Live Preview Button */}
              <Link
                href="/demo"
                target="_blank"
                className="group/demo inline-flex items-center gap-1.5 text-xs font-semibold text-white bg-gradient-to-r from-gold-500 to-amber-600 hover:from-gold-400 hover:to-amber-500 px-4 py-1.5 rounded-full shadow-[0_4px_16px_rgba(248,198,30,0.3)] transition-all duration-300 hover:scale-105 shrink-0"
              >
                <span>{t("viewDemo")}</span>
                <ArrowUpRight className="w-3.5 h-3.5 transition-transform group-hover/demo:translate-x-0.5 group-hover/demo:-translate-y-0.5" />
              </Link>
            </div>

            {/* Storefront Identity Header (Inside Mockup) */}
            <div className="mt-6 rounded-2xl border border-white/10 bg-slate-950/50 p-4 sm:p-6 backdrop-blur-xl">
              <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 text-center sm:text-start">
                {/* Store Avatar with Gold Refraction Ring */}
                <div className="relative h-16 w-16 sm:h-20 sm:w-20 rounded-2xl overflow-hidden border-2 border-gold-400/60 shadow-[0_8px_24px_rgba(248,198,30,0.3)] shrink-0">
                  <Image
                    src="/demo/banner.png"
                    alt={t("previewStoreName")}
                    fill
                    className="object-cover"
                    sizes="80px"
                  />
                </div>

                {/* Store Details */}
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                    <h3 className="text-lg sm:text-xl font-bold text-white tracking-tight">
                      {t("previewStoreName")}
                    </h3>
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 border border-emerald-400/30 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-400">
                      <CheckCircle2 className="w-3 h-3" />
                      {t("previewVerified")}
                    </span>
                  </div>

                  <p className="mt-1.5 text-xs sm:text-sm text-slate-300 leading-relaxed max-w-xl">
                    {t("previewBio")}
                  </p>

                  {/* Social Badges Pill Row */}
                  <div className="mt-3 flex flex-wrap items-center justify-center sm:justify-start gap-2 text-xs">
                    <div className="inline-flex items-center gap-1.5 rounded-full bg-white/[0.05] border border-white/10 px-3 py-1 text-slate-300">
                      <InstagramIcon size={13} className="text-pink-400" />
                      <span dir="ltr">@froshiar.krd</span>
                    </div>
                    <div className="inline-flex items-center gap-1.5 rounded-full bg-white/[0.05] border border-white/10 px-3 py-1 text-slate-300">
                      <Phone className="w-3 h-3 text-emerald-400" />
                      <span dir="ltr">0770 822 9696</span>
                    </div>
                    <div className="inline-flex items-center gap-1.5 rounded-full bg-gold-500/10 border border-gold-400/20 px-3 py-1 text-gold-400 font-medium">
                      <Globe className="w-3 h-3" />
                      <span>سلێمانی / هەولێر / دهۆک</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* 3 Featured Products Showcase Grid */}
            <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Product 1 */}
              <div className="group/prod relative rounded-2xl border border-white/10 bg-slate-950/40 p-3.5 backdrop-blur-xl transition-all duration-300 hover:border-gold-400/40 hover:-translate-y-1">
                <div className="relative aspect-square w-full rounded-xl overflow-hidden bg-slate-900 border border-white/10">
                  <Image
                    src="/demo/product-01.jpg"
                    alt={t("product1")}
                    fill
                    className="object-cover transition-transform duration-500 group-hover/prod:scale-105"
                    sizes="(max-width: 640px) 100vw, 33vw"
                  />
                  <span className="absolute top-2 right-2 rounded-full bg-gold-500/90 text-slate-950 text-[10px] font-bold px-2 py-0.5 shadow-md">
                    نوێ
                  </span>
                </div>
                <h4 className="mt-3 text-xs sm:text-sm font-semibold text-white truncate">
                  {t("product1")}
                </h4>
                <div className="mt-2 flex items-center justify-between">
                  <span dir="ltr" className="text-xs sm:text-sm font-bold text-gold-400">
                    {t("price1")}
                  </span>
                  <span className="text-[11px] font-medium text-slate-400 bg-white/[0.05] px-2 py-1 rounded-md border border-white/10">
                    {t("addToCart")}
                  </span>
                </div>
              </div>

              {/* Product 2 */}
              <div className="group/prod relative rounded-2xl border border-white/10 bg-slate-950/40 p-3.5 backdrop-blur-xl transition-all duration-300 hover:border-gold-400/40 hover:-translate-y-1">
                <div className="relative aspect-square w-full rounded-xl overflow-hidden bg-slate-900 border border-white/10">
                  <Image
                    src="/demo/product-02.jpg"
                    alt={t("product2")}
                    fill
                    className="object-cover transition-transform duration-500 group-hover/prod:scale-105"
                    sizes="(max-width: 640px) 100vw, 33vw"
                  />
                </div>
                <h4 className="mt-3 text-xs sm:text-sm font-semibold text-white truncate">
                  {t("product2")}
                </h4>
                <div className="mt-2 flex items-center justify-between">
                  <span dir="ltr" className="text-xs sm:text-sm font-bold text-gold-400">
                    {t("price2")}
                  </span>
                  <span className="text-[11px] font-medium text-slate-400 bg-white/[0.05] px-2 py-1 rounded-md border border-white/10">
                    {t("addToCart")}
                  </span>
                </div>
              </div>

              {/* Product 3 */}
              <div className="group/prod relative rounded-2xl border border-white/10 bg-slate-950/40 p-3.5 backdrop-blur-xl transition-all duration-300 hover:border-gold-400/40 hover:-translate-y-1">
                <div className="relative aspect-square w-full rounded-xl overflow-hidden bg-slate-900 border border-white/10">
                  <Image
                    src="/demo/product-03.jpg"
                    alt={t("product3")}
                    fill
                    className="object-cover transition-transform duration-500 group-hover/prod:scale-105"
                    sizes="(max-width: 640px) 100vw, 33vw"
                  />
                </div>
                <h4 className="mt-3 text-xs sm:text-sm font-semibold text-white truncate">
                  {t("product3")}
                </h4>
                <div className="mt-2 flex items-center justify-between">
                  <span dir="ltr" className="text-xs sm:text-sm font-bold text-gold-400">
                    {t("price3")}
                  </span>
                  <span className="text-[11px] font-medium text-slate-400 bg-white/[0.05] px-2 py-1 rounded-md border border-white/10">
                    {t("addToCart")}
                  </span>
                </div>
              </div>
            </div>

            {/* Floating Live Order Notification Pill */}
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6, duration: 0.8 }}
              className="mt-6 sm:mt-7 flex flex-col sm:flex-row items-center justify-between gap-3 rounded-2xl border border-emerald-500/30 bg-emerald-950/40 p-3.5 sm:px-5 sm:py-3 backdrop-blur-xl shadow-[0_8px_32px_rgba(16,185,129,0.15)]"
            >
              <div className="flex items-center gap-3">
                <div className="relative flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-400/30 shrink-0">
                  <Bell className="w-4 h-4" />
                  <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
                  </span>
                </div>
                <div>
                  <p className="text-xs sm:text-sm font-bold text-white">
                    {t("previewOrderNotice")}
                  </p>
                  <p className="text-[11px] sm:text-xs text-emerald-300">
                    {t("previewOrderDetail")}
                  </p>
                </div>
              </div>

              <Link
                href="/demo"
                target="_blank"
                className="text-xs font-semibold text-emerald-400 hover:text-emerald-300 transition-colors underline underline-offset-4 shrink-0"
              >
                {t("viewDemo")} ↗
              </Link>
            </motion.div>
          </div>
        </div>

        {/* ── 6 KEY BENEFIT CARDS (FROSTED GLASS) ── */}
        <div className="mt-14 sm:mt-20 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {featureCards.map((card) => {
            const IconComponent = card.icon;
            return (
              <div
                key={card.key}
                className="group relative rounded-2xl border border-white/15 dark:border-white/[0.12] bg-slate-900/45 dark:bg-white/[0.035] p-6 sm:p-7 backdrop-blur-2xl [-webkit-backdrop-filter:blur(24px)] shadow-[inset_0_1px_1px_rgba(255,255,255,0.2),0_12px_36px_rgba(0,0,0,0.35)] transition-all duration-300 hover:border-gold-400/40 hover:-translate-y-1.5 hover:shadow-[inset_0_1px_1px_rgba(255,255,255,0.3),0_18px_45px_rgba(248,198,30,0.15)] overflow-hidden"
              >
                {/* Top specular hairline edge */}
                <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent pointer-events-none" />

                {/* Card Icon */}
                <div
                  className={`flex h-12 w-12 items-center justify-center rounded-xl border ${card.accent} shadow-[inset_0_1px_1px_rgba(255,255,255,0.15)] transition-transform duration-300 group-hover:scale-110`}
                >
                  <IconComponent className="w-5 h-5" />
                </div>

                {/* Card Content */}
                <h3 className="mt-5 text-base sm:text-lg font-bold text-white tracking-tight group-hover:text-gold-300 transition-colors">
                  {card.title}
                </h3>
                <p className="mt-2.5 text-xs sm:text-sm leading-relaxed text-slate-300">
                  {card.desc}
                </p>
              </div>
            );
          })}
        </div>
      </Container>
    </section>
  );
}
