'use client';

import { useTranslations, useLocale } from 'next-intl';
import { Container } from '@/components/ui/Container';
import { HeroTitleBlurTypewriter } from '@/components/ui/HeroTitleBlurTypewriter';
import { HeroDeviceShowcase } from '@/components/ui/HeroDeviceShowcase';
import { MobileHeroDevices3D } from '@/components/ui/MobileHeroDevices3D';

export function Hero() {
  const t = useTranslations('hero');
  const locale = useLocale();
  const isCkb = locale === 'ckb';

  return (
    <>
      {/* SCREEN 1: Hero Section */}
      {/* On Mobile (< lg): Exactly 2 Balanced Halves (Top 50%: Hero Text | Bottom 50%: 3D iPad & iPhone Mockups) */}
      {/* On Desktop (>= lg): Full viewport dedicated headline screen with cue to scroll */}
      <section
        id="home"
        className="relative h-[100dvh] min-h-[100dvh] max-h-[100dvh] flex flex-col justify-between items-center overflow-x-clip pt-16 xs:pt-18 pb-2 xs:pb-3.5 lg:h-auto lg:min-h-[100dvh] lg:max-h-none lg:justify-center lg:py-24"
      >
        <div className="relative z-10 w-full flex-1 flex flex-col justify-between items-center max-w-5xl mx-auto px-4 sm:px-6 lg:justify-center lg:my-auto">
          {/* PART 1: Top Half — Text (Headline + Subtitle) */}
          <div className="flex-1 w-full flex flex-col items-center justify-center text-center lg:flex-initial">
            {/* Animated Blur-Typewriter Headline */}
            <HeroTitleBlurTypewriter />

            {/* Elevated Descriptive Subtitle */}
            <p className="mx-auto mt-2.5 xs:mt-3.5 sm:mt-5 lg:mt-8 max-w-xs xs:max-w-sm sm:max-w-2xl lg:max-w-3xl text-[13.5px] xs:text-[15px] sm:text-base lg:text-xl text-slate-200 dark:text-slate-200 leading-relaxed font-normal line-clamp-3 sm:line-clamp-none">
              {t('subtitle')}
            </p>
          </div>

          {/* PART 2: Bottom Half — 3D iPad + iPhone Standing Mockup (MOBILE ONLY < lg) */}
          <div className="flex-1 w-full flex flex-col items-center justify-center overflow-visible lg:hidden">
            <MobileHeroDevices3D />
          </div>
        </div>

        {/* Elegant Scroll Down Cue */}
        <div className="shrink-0 relative lg:absolute lg:bottom-10 inset-x-0 flex flex-col items-center justify-center text-slate-400 dark:text-slate-400 text-[11px] sm:text-sm animate-bounce pointer-events-none pt-0.5 sm:pt-1">
          <span className="mb-0.5 sm:mb-1 text-gold-400/90 font-medium tracking-wide">
            {isCkb ? 'سکرۆل بکە بۆ بینین' : 'Scroll to explore'}
          </span>
          <svg
            className="w-3.5 h-3.5 sm:w-5 sm:h-5 text-gold-400/80"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
          </svg>
        </div>
      </section>

      {/* SCREEN 2: Desktop Device Trio Showcase (MacBook, iPad, iPhone) — DESKTOP ONLY (>= lg) */}
      <section
        id="showcase"
        className="hidden lg:flex relative min-h-[100dvh] flex-col justify-center items-center overflow-hidden py-16 sm:py-20 lg:py-24"
      >
        <Container className="relative z-10 my-auto w-full">
          <HeroDeviceShowcase />
        </Container>
      </section>
    </>
  );
}
