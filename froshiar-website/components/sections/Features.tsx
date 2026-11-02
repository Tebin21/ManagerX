"use client";

import React from "react";
import { useTranslations } from "next-intl";
import { motion, useReducedMotion } from "framer-motion";
import {
  Globe,
  Boxes,
  ShoppingCart,
  Users,
  ShieldCheck,
  BarChart3,
  Cloud,
  Languages,
  Sparkles,
  CheckCircle2,
  GitBranch,
} from "lucide-react";
import { Container } from "@/components/ui/Container";

const FEATURE_KEYS = [
  { key: "onlineStore", icon: Globe, num: "01", color: "from-amber-400 to-gold-600" },
  { key: "inventory", icon: Boxes, num: "02", color: "from-gold-400 to-amber-600" },
  { key: "salesPos", icon: ShoppingCart, num: "03", color: "from-yellow-400 to-gold-600" },
  { key: "debts", icon: Users, num: "04", color: "from-amber-400 to-yellow-600" },
  { key: "staff", icon: ShieldCheck, num: "05", color: "from-gold-400 to-amber-500" },
  { key: "reports", icon: BarChart3, num: "06", color: "from-yellow-500 to-gold-600" },
  { key: "cloudSync", icon: Cloud, num: "07", color: "from-amber-400 to-gold-500" },
  { key: "multiLang", icon: Languages, num: "08", color: "from-gold-400 to-yellow-600" },
] as const;

export function Features() {
  const t = useTranslations("features");
  const shouldReduceMotion = useReducedMotion();

  return (
    <section id="features" className="relative py-20 sm:py-28 lg:py-36 overflow-hidden">
      {/* Background Ambient Glows */}
      <div className="absolute top-1/4 -start-48 w-96 h-96 bg-[#D4AF37]/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute top-3/4 -end-48 w-96 h-96 bg-amber-500/10 rounded-full blur-[120px] pointer-events-none" />

      <Container className="relative z-10">
        {/* Section Header */}
        <div className="mx-auto max-w-3xl text-center space-y-4 mb-16 sm:mb-24">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-gold-500/10 border border-gold-500/30 text-gold-400 text-xs font-black shadow-sm">
            <GitBranch className="w-3.5 h-3.5 text-gold-400" />
            <span>تایبەتمەندییە نوێ و پێشکەوتووەکان</span>
          </div>

          <h2 className="text-3xl font-black tracking-tight text-white sm:text-5xl lg:text-6xl leading-tight">
            {t("heading")}
          </h2>
          <p className="mx-auto max-w-2xl text-sm sm:text-base lg:text-lg text-slate-300 leading-relaxed">
            {t("subheading")}
          </p>
        </div>

        {/* ── 3D Tree Branch Timeline Architecture ── */}
        <div className="relative mx-auto max-w-5xl">
          {/* Central Tree Trunk (Stem) - Desktop */}
          <div className="absolute left-1/2 -translate-x-1/2 top-6 bottom-6 w-1 hidden lg:block pointer-events-none">
            {/* Ambient Trunk Glow */}
            <div className="absolute -inset-x-1 inset-y-0 bg-gold-500/20 blur-sm rounded-full" />
            {/* Trunk Line */}
            <div className="relative h-full w-full bg-gradient-to-b from-gold-500/0 via-gold-400/80 to-gold-500/0 rounded-full shadow-[0_0_12px_rgba(212,175,55,0.5)]" />
          </div>

          {/* Side Tree Trunk (Stem) - Mobile & Tablet */}
          <div className="absolute start-4 sm:start-8 top-6 bottom-6 w-1 block lg:hidden pointer-events-none">
            <div className="absolute -inset-x-1 inset-y-0 bg-gold-500/20 blur-sm rounded-full" />
            <div className="relative h-full w-full bg-gradient-to-b from-gold-500/10 via-gold-400/80 to-gold-500/10 rounded-full" />
          </div>

          {/* Tree Nodes & Branching Feature Cards */}
          <div className="space-y-12 sm:space-y-16 lg:space-y-20">
            {FEATURE_KEYS.map((item, idx) => {
              const isEven = idx % 2 === 0;
              const Icon = item.icon;
              const title = t(`items.${item.key}.title`);
              const description = t(`items.${item.key}.description`);
              const tag = t(`items.${item.key}.tag`);
              const chipsRaw = t.raw(`items.${item.key}.chips`) as string[] | undefined;
              const chips = Array.isArray(chipsRaw) ? chipsRaw : [];

              return (
                <div
                  key={item.key}
                  className="relative flex flex-col lg:flex-row items-center justify-between gap-6 lg:gap-0"
                >
                  {/* ── Left Side Item (on Desktop if even, spacer if odd) ── */}
                  <div
                    className={`w-full lg:w-[45%] ps-12 sm:ps-16 lg:ps-0 ${
                      isEven ? "lg:order-1" : "lg:order-3 lg:invisible pointer-events-none hidden lg:block"
                    }`}
                  >
                    {isEven && (
                      <motion.div
                        initial={
                          shouldReduceMotion
                            ? { opacity: 0 }
                            : { opacity: 0, x: -50, rotateY: 12, scale: 0.95 }
                        }
                        whileInView={
                          shouldReduceMotion
                            ? { opacity: 1 }
                            : { opacity: 1, x: 0, rotateY: 0, scale: 1 }
                        }
                        viewport={{ once: true, margin: "-70px" }}
                        transition={{ duration: 0.65, ease: [0.16, 1, 0.3, 1] }}
                        className="relative group [perspective:1200px]"
                      >
                        {/* Connecting branch line to center node on desktop */}
                        <div className="absolute top-1/2 -end-8 sm:-end-12 w-8 sm:w-12 h-0.5 bg-gradient-to-l from-gold-400 to-gold-400/20 hidden lg:block pointer-events-none" />

                        {/* Mobile branch connector */}
                        <div className="absolute top-7 -start-8 sm:-start-10 w-8 sm:w-10 h-0.5 bg-gradient-to-r from-gold-400/80 to-gold-400/20 block lg:hidden pointer-events-none" />

                        <div className="relative rounded-3xl border border-gold-500/25 bg-gradient-to-br from-[#161c2d]/95 via-[#111726]/95 to-[#0b0e18]/95 p-6 sm:p-7 shadow-[0_15px_40px_rgba(0,0,0,0.6)] backdrop-blur-2xl transition-all duration-500 hover:-translate-y-2 hover:border-gold-400/70 hover:shadow-[0_20px_50px_rgba(212,175,55,0.22)] overflow-hidden">
                          {/* 3D Gold Accent Glow */}
                          <div className="absolute -top-20 -right-20 w-40 h-40 bg-gold-500/10 rounded-full blur-2xl group-hover:bg-gold-500/20 transition-all duration-500 pointer-events-none" />

                          <div className="relative z-10 flex flex-col gap-3.5">
                            {/* Card Top Row: 3D Badge + Category Tag */}
                            <div className="flex items-center justify-between">
                              <div className="flex h-12 w-12 sm:h-14 sm:w-14 items-center justify-center rounded-2xl bg-gradient-to-tr from-gold-500/25 via-gold-500/10 to-transparent border border-gold-400/40 text-gold-300 shadow-lg shadow-gold-500/10 group-hover:scale-110 group-hover:border-gold-300 transition-all duration-300">
                                <Icon className="w-6 h-6 sm:w-7 sm:h-7" />
                              </div>
                              <span className="text-[11px] font-black uppercase tracking-wider px-3 py-1 rounded-full bg-gold-500/10 border border-gold-500/30 text-gold-300 shadow-xs">
                                {tag}
                              </span>
                            </div>

                            {/* Title */}
                            <h3 className="text-lg sm:text-xl font-black text-white group-hover:text-gold-300 transition-colors tracking-tight">
                              {title}
                            </h3>

                            {/* Description */}
                            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                              {description}
                            </p>

                            {/* Feature Chips */}
                            {chips.length > 0 && (
                              <div className="pt-2 flex flex-wrap gap-1.5 border-t border-white/5">
                                {chips.map((chip, cIdx) => (
                                  <span
                                    key={cIdx}
                                    className="inline-flex items-center gap-1 text-[11px] font-medium px-2.5 py-0.5 rounded-md bg-white/[0.04] text-slate-300 border border-white/10 group-hover:border-gold-500/30 group-hover:text-white transition-all"
                                  >
                                    <CheckCircle2 className="w-3 h-3 text-gold-400 shrink-0" />
                                    <span>{chip}</span>
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </div>

                  {/* ── Center Trunk Node (Golden Orb / Bud) ── */}
                  <div className="absolute start-4 sm:start-8 lg:start-1/2 -translate-x-1/2 top-4 lg:top-1/2 lg:-translate-y-1/2 z-20 flex items-center justify-center">
                    <div className="relative group/node flex h-9 w-9 sm:h-11 sm:w-11 items-center justify-center rounded-full bg-[#14110a] border-2 border-gold-400 shadow-[0_0_20px_rgba(212,175,55,0.7)] transition-all duration-300 hover:scale-125">
                      <div className="absolute inset-1 rounded-full bg-gradient-to-tr from-gold-500 via-amber-400 to-gold-300 opacity-90" />
                      <span className="relative z-10 text-[11px] sm:text-xs font-black text-ink-fixed">
                        {item.num}
                      </span>
                    </div>
                  </div>

                  {/* ── Right Side Item (on Desktop if odd, spacer if even) ── */}
                  <div
                    className={`w-full lg:w-[45%] ps-12 sm:ps-16 lg:ps-0 ${
                      !isEven ? "lg:order-3" : "lg:order-1 lg:invisible pointer-events-none hidden lg:block"
                    }`}
                  >
                    {!isEven && (
                      <motion.div
                        initial={
                          shouldReduceMotion
                            ? { opacity: 0 }
                            : { opacity: 0, x: 50, rotateY: -12, scale: 0.95 }
                        }
                        whileInView={
                          shouldReduceMotion
                            ? { opacity: 1 }
                            : { opacity: 1, x: 0, rotateY: 0, scale: 1 }
                        }
                        viewport={{ once: true, margin: "-70px" }}
                        transition={{ duration: 0.65, ease: [0.16, 1, 0.3, 1] }}
                        className="relative group [perspective:1200px]"
                      >
                        {/* Connecting branch line to center node on desktop */}
                        <div className="absolute top-1/2 -start-8 sm:-start-12 w-8 sm:w-12 h-0.5 bg-gradient-to-r from-gold-400 to-gold-400/20 hidden lg:block pointer-events-none" />

                        {/* Mobile branch connector */}
                        <div className="absolute top-7 -start-8 sm:-start-10 w-8 sm:w-10 h-0.5 bg-gradient-to-r from-gold-400/80 to-gold-400/20 block lg:hidden pointer-events-none" />

                        <div className="relative rounded-3xl border border-gold-500/25 bg-gradient-to-br from-[#161c2d]/95 via-[#111726]/95 to-[#0b0e18]/95 p-6 sm:p-7 shadow-[0_15px_40px_rgba(0,0,0,0.6)] backdrop-blur-2xl transition-all duration-500 hover:-translate-y-2 hover:border-gold-400/70 hover:shadow-[0_20px_50px_rgba(212,175,55,0.22)] overflow-hidden">
                          {/* 3D Gold Accent Glow */}
                          <div className="absolute -top-20 -left-20 w-40 h-40 bg-gold-500/10 rounded-full blur-2xl group-hover:bg-gold-500/20 transition-all duration-500 pointer-events-none" />

                          <div className="relative z-10 flex flex-col gap-3.5">
                            {/* Card Top Row: 3D Badge + Category Tag */}
                            <div className="flex items-center justify-between">
                              <div className="flex h-12 w-12 sm:h-14 sm:w-14 items-center justify-center rounded-2xl bg-gradient-to-tr from-gold-500/25 via-gold-500/10 to-transparent border border-gold-400/40 text-gold-300 shadow-lg shadow-gold-500/10 group-hover:scale-110 group-hover:border-gold-300 transition-all duration-300">
                                <Icon className="w-6 h-6 sm:w-7 sm:h-7" />
                              </div>
                              <span className="text-[11px] font-black uppercase tracking-wider px-3 py-1 rounded-full bg-gold-500/10 border border-gold-500/30 text-gold-300 shadow-xs">
                                {tag}
                              </span>
                            </div>

                            {/* Title */}
                            <h3 className="text-lg sm:text-xl font-black text-white group-hover:text-gold-300 transition-colors tracking-tight">
                              {title}
                            </h3>

                            {/* Description */}
                            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                              {description}
                            </p>

                            {/* Feature Chips */}
                            {chips.length > 0 && (
                              <div className="pt-2 flex flex-wrap gap-1.5 border-t border-white/5">
                                {chips.map((chip, cIdx) => (
                                  <span
                                    key={cIdx}
                                    className="inline-flex items-center gap-1 text-[11px] font-medium px-2.5 py-0.5 rounded-md bg-white/[0.04] text-slate-300 border border-white/10 group-hover:border-gold-500/30 group-hover:text-white transition-all"
                                  >
                                    <CheckCircle2 className="w-3 h-3 text-gold-400 shrink-0" />
                                    <span>{chip}</span>
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </Container>
    </section>
  );
}
