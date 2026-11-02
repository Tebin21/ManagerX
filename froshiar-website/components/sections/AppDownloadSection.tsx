'use client';

import React from 'react';
import { useTranslations } from 'next-intl';
import { Sparkles } from 'lucide-react';
import { Container } from '@/components/ui/Container';
import { AppDownloadButtons } from '@/components/ui/AppDownloadButtons';

export function AppDownloadSection() {
  const t = useTranslations('download');

  return (
    <section
      id="download"
      className="relative min-h-[100dvh] flex flex-col justify-center items-center py-16 sm:py-20 lg:py-24 overflow-hidden"
    >
      {/* Soft ambient golden light in center background */}
      <div
        aria-hidden="true"
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[360px] bg-amber-400/[0.06] dark:bg-amber-400/[0.04] rounded-full blur-3xl pointer-events-none"
      />

      <Container className="relative z-10 my-auto w-full">
        <div className="mx-auto max-w-3xl text-center space-y-6 sm:space-y-7">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-gold-500/10 border border-gold-400/30 text-amber-500 dark:text-gold-300 text-xs sm:text-sm font-bold shadow-[inset_0_1px_0_rgba(255,255,255,0.15)]">
            <Sparkles className="w-3.5 h-3.5 text-amber-400 dark:text-gold-400" />
            <span>{t('badge')}</span>
          </div>

          {/* Clean Bold Heading */}
          <h2 className="text-3xl sm:text-5xl lg:text-6xl font-black tracking-tight text-ink dark:text-white leading-[1.2]">
            {t('ctaHeading')}
          </h2>

          {/* Simple, Pure Subtitle */}
          <p className="mx-auto max-w-xl text-base sm:text-lg lg:text-xl text-slate-600 dark:text-slate-300 leading-relaxed font-normal">
            {t('ctaSubheading')}
          </p>

          {/* Distinctive, Solid Official Store Buttons (Not Liquid Glass) */}
          <div className="pt-4 sm:pt-6 flex items-center justify-center">
            <AppDownloadButtons size="lg" />
          </div>

          {/* Clean minimal trust line */}
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 font-medium tracking-wide pt-2">
            {t('note')}
          </p>
        </div>
      </Container>
    </section>
  );
}
