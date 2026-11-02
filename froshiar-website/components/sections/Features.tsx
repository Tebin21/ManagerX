'use client';

import React, { useRef, useState, useEffect, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import {
  motion,
  useScroll,
  useSpring,
  useReducedMotion,
} from 'framer-motion';
import {
  Globe,
  Boxes,
  Zap,
  ShoppingCart,
  Printer,
  Users,
  Truck,
  ShieldCheck,
  BarChart3,
  Wallet,
  WifiOff,
  Cloud,
  Coins,
  BellRing,
  Languages,
  CheckCircle2,
  GitBranch,
} from 'lucide-react';
import { Container } from '@/components/ui/Container';

const FEATURE_ITEMS = [
  { key: 'onlineStore', icon: Globe, num: '01' },
  { key: 'inventory', icon: Boxes, num: '02' },
  { key: 'bulkSync', icon: Zap, num: '03' },
  { key: 'salesPos', icon: ShoppingCart, num: '04' },
  { key: 'receipts', icon: Printer, num: '05' },
  { key: 'debts', icon: Users, num: '06' },
  { key: 'suppliers', icon: Truck, num: '07' },
  { key: 'staff', icon: ShieldCheck, num: '08' },
  { key: 'reports', icon: BarChart3, num: '09' },
  { key: 'expenses', icon: Wallet, num: '10' },
  { key: 'offlineMode', icon: WifiOff, num: '11' },
  { key: 'cloudSync', icon: Cloud, num: '12' },
  { key: 'currency', icon: Coins, num: '13' },
  { key: 'stockAlerts', icon: BellRing, num: '14' },
  { key: 'multiLang', icon: Languages, num: '15' },
] as const;

// ── Ultra-Fast Instant Card Text (Zero Timer Overhead, 120 FPS Native Feel) ──
function CardText({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="flex flex-col gap-1 sm:gap-2">
      <h3 className="text-sm sm:text-base lg:text-lg font-black text-white group-hover:text-gold-300 transition-colors tracking-tight">
        {title}
      </h3>
      <p className="text-[11px] sm:text-xs lg:text-sm text-slate-300 leading-relaxed">
        {description}
      </p>
    </div>
  );
}

// ── Individual 3D Feature Item Row with Strict Spacing & Glowing Line Connectors ──
function FeatureItemRow({
  item,
  idx,
  t,
  isOpen,
}: {
  item: (typeof FEATURE_ITEMS)[number];
  idx: number;
  t: ReturnType<typeof useTranslations>;
  isOpen: boolean;
}) {
  const isEven = idx % 2 === 0;
  const Icon = item.icon;
  const title = t(`items.${item.key}.title`);
  const description = t(`items.${item.key}.description`);
  const tag = t(`items.${item.key}.tag`);
  const chipsRaw = t.raw(`items.${item.key}.chips`) as string[] | undefined;
  const chips = Array.isArray(chipsRaw) ? chipsRaw : [];

  return (
    <div
      data-feature-row
      className="relative flex flex-col lg:flex-row items-center justify-between gap-4 lg:gap-0"
    >
      {/* ── Left Side Item (Desktop: Even indices, Mobile: Even cards) ── */}
      <div
        className={`w-full lg:w-[45%] ps-[64px] sm:ps-[76px] pe-2 sm:pe-4 lg:px-0 ${
          isEven
            ? 'lg:order-1'
            : 'lg:order-3 lg:invisible pointer-events-none hidden lg:block'
        }`}
      >
        {isEven && (
          <div className="relative group will-change-transform">
            {/* Desktop Horizontal Branch connector to center stem */}
            <div
              className={`absolute top-1/2 -end-12 w-12 h-[2px] origin-right hidden lg:block pointer-events-none transition-all duration-300 ${
                isOpen
                  ? 'bg-gradient-to-l from-gold-400 via-amber-300 to-gold-400/20 shadow-[0_0_10px_#D4AF37] opacity-100'
                  : 'bg-slate-800 opacity-40'
              }`}
            />

            {/* Mobile Branch connector: Visible horizontal bridge from number node to card */}
            <div
              className={`absolute top-[34px] -start-[23px] w-[23px] h-[2px] block lg:hidden pointer-events-none transition-all duration-300 ${
                isOpen
                  ? 'bg-gradient-to-r from-gold-400 via-amber-300 to-gold-400 shadow-[0_0_8px_#D4AF37] opacity-100'
                  : 'bg-slate-700/60 opacity-60'
              }`}
            />

            {/* High-Performance Liquid Glass Card */}
            <div
              className={`relative rounded-2xl sm:rounded-3xl border transition-all duration-300 p-4 sm:p-5 lg:p-6 overflow-hidden ${
                isOpen
                  ? 'border-gold-400/60 bg-[#0c1017]/95 shadow-[0_0_20px_rgba(248,198,30,0.18),0_12px_30px_rgba(0,0,0,0.5)] ring-1 ring-gold-400/30'
                  : 'border-white/[0.08] bg-[#0c1017]/80 shadow-[0_4px_16px_rgba(0,0,0,0.3)]'
              } hover:-translate-y-1 hover:border-gold-400/50 hover:shadow-[0_15px_35px_rgba(212,175,55,0.2)]`}
            >
              {/* Specular top glass reflection sheen */}
              <div className="absolute inset-0 bg-gradient-to-b from-white/[0.08] via-transparent to-transparent pointer-events-none rounded-2xl sm:rounded-3xl" />

              {/* Card Radiant Gold Ambient Fill when illuminated */}
              <div
                className={`absolute inset-0 bg-gradient-to-br from-gold-500/10 via-transparent to-transparent pointer-events-none rounded-2xl sm:rounded-3xl transition-opacity duration-300 ${
                  isOpen ? 'opacity-100' : 'opacity-0'
                }`}
              />

              <div className="relative z-10 flex flex-col gap-2.5 sm:gap-3">
                {/* Top Row: Sleek Icon Badge + Category Tag */}
                <div className="flex items-center justify-between">
                  <div
                    className={`flex h-9 w-9 sm:h-11 sm:w-11 items-center justify-center rounded-xl sm:rounded-2xl transition-all duration-300 ${
                      isOpen
                        ? 'bg-gold-500/15 border border-gold-400/50 text-gold-300 shadow-[inset_0_1px_1px_rgba(255,255,255,0.2),0_0_12px_rgba(212,175,55,0.2)] scale-105'
                        : 'bg-white/[0.04] border border-white/10 text-slate-400'
                    }`}
                  >
                    <Icon className="w-4.5 h-4.5 sm:w-5.5 sm:h-5.5" />
                  </div>
                  <span
                    className={`text-[10px] sm:text-[11px] font-black uppercase tracking-wider px-2.5 py-0.5 sm:py-1 rounded-full transition-all duration-300 ${
                      isOpen
                        ? 'bg-gold-500/15 border border-gold-400/50 text-gold-300 shadow-[inset_0_1px_0_rgba(255,255,255,0.15)]'
                        : 'bg-white/[0.04] border border-white/10 text-slate-400'
                    }`}
                  >
                    {tag}
                  </span>
                </div>

                {/* Card Title and Description (Instant render, no delay) */}
                <CardText title={title} description={description} />

                {/* Feature Chips */}
                {chips.length > 0 && (
                  <div className="pt-2 flex flex-wrap gap-1 sm:gap-1.5 border-t border-white/10">
                    {chips.map((chip, cIdx) => (
                      <span
                        key={cIdx}
                        className="inline-flex items-center gap-1 text-[10px] sm:text-[11px] font-medium px-2 py-0.5 sm:px-2.5 sm:py-0.5 rounded-md bg-white/[0.04] text-slate-200 border border-white/10 hover:border-gold-400/50 hover:bg-gold-500/10 transition-all shadow-2xs"
                      >
                        <CheckCircle2 className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-gold-400 shrink-0" />
                        <span>{chip}</span>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── Concentric Timeline Node (01 - 15) Perfectly Aligned with Vertical Trunk ── */}
      <div
        data-timeline-node
        className="absolute start-[9px] sm:start-[17px] lg:left-1/2 lg:-translate-x-1/2 top-[18px] lg:top-1/2 lg:-translate-y-1/2 z-20 flex items-center justify-center pointer-events-none"
      >
        <div
          className={`relative flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-full bg-[#090C10] border-2 transition-all duration-300 ${
            isOpen
              ? 'border-gold-400 shadow-[0_0_15px_rgba(248,198,30,0.85)] scale-105'
              : 'border-slate-700/70'
          }`}
        >
          {/* Golden Core Fill */}
          <div
            className={`absolute inset-0.5 rounded-full transition-all duration-300 ${
              isOpen
                ? 'opacity-100 bg-gradient-to-tr from-gold-500 via-amber-400 to-gold-300'
                : 'opacity-20 bg-slate-700'
            }`}
          />
          <span
            className={`relative z-10 text-[10px] sm:text-[11px] font-black transition-colors duration-300 ${
              isOpen ? 'text-ink-fixed font-black' : 'text-slate-400'
            }`}
          >
            {item.num}
          </span>
        </div>
      </div>

      {/* ── Right Side Item (Desktop: Odd indices, Mobile: Odd cards) ── */}
      <div
        className={`w-full lg:w-[45%] ps-[64px] sm:ps-[76px] pe-2 sm:pe-4 lg:px-0 ${
          !isEven
            ? 'lg:order-3'
            : 'lg:order-1 lg:invisible pointer-events-none hidden lg:block'
        }`}
      >
        {!isEven && (
          <div className="relative group will-change-transform">
            {/* Desktop Horizontal Branch connector to center stem */}
            <div
              className={`absolute top-1/2 -start-12 w-12 h-[2px] origin-left hidden lg:block pointer-events-none transition-all duration-300 ${
                isOpen
                  ? 'bg-gradient-to-r from-gold-400 via-amber-300 to-gold-400/20 shadow-[0_0_10px_#D4AF37] opacity-100'
                  : 'bg-slate-800 opacity-40'
              }`}
            />

            {/* Mobile Branch connector: Visible horizontal bridge from number node to card */}
            <div
              className={`absolute top-[34px] -start-[23px] w-[23px] h-[2px] block lg:hidden pointer-events-none transition-all duration-300 ${
                isOpen
                  ? 'bg-gradient-to-r from-gold-400 via-amber-300 to-gold-400 shadow-[0_0_8px_#D4AF37] opacity-100'
                  : 'bg-slate-700/60 opacity-60'
              }`}
            />

            {/* High-Performance Liquid Glass Card */}
            <div
              className={`relative rounded-2xl sm:rounded-3xl border transition-all duration-300 p-4 sm:p-5 lg:p-6 overflow-hidden ${
                isOpen
                  ? 'border-gold-400/60 bg-[#0c1017]/95 shadow-[0_0_20px_rgba(248,198,30,0.18),0_12px_30px_rgba(0,0,0,0.5)] ring-1 ring-gold-400/30'
                  : 'border-white/[0.08] bg-[#0c1017]/80 shadow-[0_4px_16px_rgba(0,0,0,0.3)]'
              } hover:-translate-y-1 hover:border-gold-400/50 hover:shadow-[0_15px_35px_rgba(212,175,55,0.2)]`}
            >
              {/* Specular top glass reflection sheen */}
              <div className="absolute inset-0 bg-gradient-to-b from-white/[0.08] via-transparent to-transparent pointer-events-none rounded-2xl sm:rounded-3xl" />

              {/* Entire Card Radiant Gold Ambient Fill when illuminated */}
              <div
                className={`absolute inset-0 bg-gradient-to-br from-gold-500/10 via-transparent to-transparent pointer-events-none rounded-2xl sm:rounded-3xl transition-opacity duration-300 ${
                  isOpen ? 'opacity-100' : 'opacity-0'
                }`}
              />

              <div className="relative z-10 flex flex-col gap-2.5 sm:gap-3">
                {/* Top Row: Sleek Icon Badge + Category Tag */}
                <div className="flex items-center justify-between">
                  <div
                    className={`flex h-9 w-9 sm:h-11 sm:w-11 items-center justify-center rounded-xl sm:rounded-2xl transition-all duration-300 ${
                      isOpen
                        ? 'bg-gold-500/15 border border-gold-400/50 text-gold-300 shadow-[inset_0_1px_1px_rgba(255,255,255,0.2),0_0_12px_rgba(212,175,55,0.2)] scale-105'
                        : 'bg-white/[0.04] border border-white/10 text-slate-400'
                    }`}
                  >
                    <Icon className="w-4.5 h-4.5 sm:w-5.5 sm:h-5.5" />
                  </div>
                  <span
                    className={`text-[10px] sm:text-[11px] font-black uppercase tracking-wider px-2.5 py-0.5 sm:py-1 rounded-full transition-all duration-300 ${
                      isOpen
                        ? 'bg-gold-500/15 border border-gold-400/50 text-gold-300 shadow-[inset_0_1px_0_rgba(255,255,255,0.15)]'
                        : 'bg-white/[0.04] border border-white/10 text-slate-400'
                    }`}
                  >
                    {tag}
                  </span>
                </div>

                {/* Card Title and Description (Instant render, no delay) */}
                <CardText title={title} description={description} />

                {/* Feature Chips */}
                {chips.length > 0 && (
                  <div className="pt-2 flex flex-wrap gap-1 sm:gap-1.5 border-t border-white/10">
                    {chips.map((chip, cIdx) => (
                      <span
                        key={cIdx}
                        className="inline-flex items-center gap-1 text-[10px] sm:text-[11px] font-medium px-2 py-0.5 sm:px-2.5 sm:py-0.5 rounded-md bg-white/[0.04] text-slate-200 border border-white/10 hover:border-gold-400/50 hover:bg-gold-500/10 transition-all shadow-2xs"
                      >
                        <CheckCircle2 className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-gold-400 shrink-0" />
                        <span>{chip}</span>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export function Features() {
  const t = useTranslations('features');
  const shouldReduceMotion = useReducedMotion();
  const timelineRef = useRef<HTMLDivElement>(null);

  // Scroll Progress across the Tree Timeline
  const { scrollYProgress } = useScroll({
    target: timelineRef,
    offset: ['start 65%', 'end 85%'],
  });

  // Responsive, fluid liquid spring progress for the tree filling line
  const smoothProgress = useSpring(scrollYProgress, {
    stiffness: 120,
    damping: 20,
    restDelta: 0.001,
  });

  // Pre-calculated threshold fractions for 15 nodes (zero forced DOM reflows)
  const thresholds = useMemo(
    () => FEATURE_ITEMS.map((_, i) => (i + 0.15) / FEATURE_ITEMS.length),
    []
  );

  // Active state for each card: lights up as the flowing line passes
  const [activeCards, setActiveCards] = useState<boolean[]>(() =>
    new Array(FEATURE_ITEMS.length).fill(false)
  );

  useEffect(() => {
    if (shouldReduceMotion) {
      setActiveCards(new Array(FEATURE_ITEMS.length).fill(true));
      return;
    }

    const unsubscribe = smoothProgress.on('change', (latest) => {
      setActiveCards((prev) => {
        let changed = false;
        const next = [...prev];
        for (let i = 0; i < FEATURE_ITEMS.length; i++) {
          const threshold = thresholds[i];
          if (latest >= threshold && !next[i]) {
            next[i] = true;
            changed = true;
          }
        }
        return changed ? next : prev;
      });
    });

    return () => unsubscribe();
  }, [smoothProgress, thresholds, shouldReduceMotion]);

  return (
    <section id="features" className="relative py-14 sm:py-20 lg:py-28 overflow-hidden">
      {/* Background Ambient Glow Orbs (GPU-optimized radial gradients, zero blur filter cost) */}
      <div className="absolute top-1/4 -start-48 w-96 h-96 bg-[radial-gradient(circle,rgba(212,175,55,0.12)_0%,transparent_70%)] pointer-events-none" />
      <div className="absolute top-2/4 -end-48 w-96 h-96 bg-[radial-gradient(circle,rgba(245,158,11,0.10)_0%,transparent_70%)] pointer-events-none" />
      <div className="absolute top-3/4 -start-48 w-96 h-96 bg-[radial-gradient(circle,rgba(212,175,55,0.10)_0%,transparent_70%)] pointer-events-none" />

      <Container className="relative z-10 px-3 sm:px-6">
        {/* Section Header */}
        <div className="mx-auto max-w-3xl text-center space-y-3 mb-10 sm:mb-16">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-gold-500/10 border border-gold-500/30 text-gold-400 text-xs font-black shadow-sm">
            <GitBranch className="w-3.5 h-3.5 text-gold-400" />
            <span>تایبەتمەندییە نوێ و پێشکەوتووەکان</span>
          </div>

          <h2 className="text-2xl font-black tracking-tight text-white sm:text-4xl lg:text-5xl leading-tight">
            {t('heading')}
          </h2>
          <p className="mx-auto max-w-2xl text-xs sm:text-sm lg:text-base text-slate-300 leading-relaxed">
            {t('subheading')}
          </p>
        </div>

        {/* ── 3D Living Tree Branch Timeline Architecture ── */}
        <div ref={timelineRef} className="relative mx-auto max-w-5xl">
          {/* ── Desktop Central Tree Trunk ── */}
          <div
            className="absolute left-1/2 -translate-x-1/2 top-8 bottom-12 w-1.5 hidden lg:block pointer-events-none z-0"
            style={{
              maskImage:
                'linear-gradient(to bottom, transparent 0%, black 40px, black calc(100% - 40px), transparent 100%)',
              WebkitMaskImage:
                'linear-gradient(to bottom, transparent 0%, black 40px, black calc(100% - 40px), transparent 100%)',
            }}
          >
            {/* Base dim track */}
            <div className="absolute inset-0 bg-slate-800/60 rounded-full" />
            {/* Animated liquid gold stem fill */}
            <motion.div
              style={{ scaleY: smoothProgress }}
              className="relative h-full w-full origin-top bg-gradient-to-b from-amber-300 via-gold-400 to-amber-500 rounded-full shadow-[0_0_20px_#D4AF37,0_0_35px_rgba(212,175,55,0.7)]"
            />
          </div>

          {/* ── Mobile Side Tree Trunk (Concentric with number node circles) ── */}
          <div
            className="absolute start-[23px] sm:start-[31px] top-6 bottom-12 w-[4px] block lg:hidden pointer-events-none z-0"
            style={{
              maskImage:
                'linear-gradient(to bottom, transparent 0%, black 30px, black calc(100% - 30px), transparent 100%)',
              WebkitMaskImage:
                'linear-gradient(to bottom, transparent 0%, black 30px, black calc(100% - 30px), transparent 100%)',
            }}
          >
            {/* Base dim track */}
            <div className="absolute inset-0 bg-slate-800/60 rounded-full" />
            {/* Animated liquid gold stem fill */}
            <motion.div
              style={{ scaleY: smoothProgress }}
              className="relative h-full w-full origin-top bg-gradient-to-b from-amber-300 via-gold-400 to-amber-500 rounded-full shadow-[0_0_12px_#D4AF37]"
            />
          </div>

          {/* ── All 15 Tree Nodes & Branching Cards with Instant 120 FPS Rendering ── */}
          <div className="space-y-4 sm:space-y-6 lg:space-y-12">
            {FEATURE_ITEMS.map((item, idx) => (
              <FeatureItemRow
                key={item.key}
                item={item}
                idx={idx}
                t={t}
                isOpen={activeCards[idx]}
              />
            ))}
          </div>
        </div>
      </Container>
    </section>
  );
}
