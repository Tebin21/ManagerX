'use client';

import { useMemo } from 'react';
import type { StoreInfo } from '@/lib/storefront/storeApi';
import { ThemeToggle } from '@/components/layout/ThemeToggle';
import { SocialIcons } from './SocialIcons';

interface Props {
  businessName: string;
  info: StoreInfo;
}

export function StoreHeader({ businessName, info }: Props) {
  // Check whether store name is Kurdish / Arabic script
  const isKurdish = useMemo(() => {
    return /[\u0600-\u06FF\u0750-\u077F\uFB50-\uFDFF\uFE70-\uFEFF]/.test(businessName);
  }, [businessName]);

  return (
    <div className="w-full">
      {/* 1. Main Cover Banner: Completely empty of text/overlays; uploaded business picture covers full banner */}
      <div className="mx-auto mt-4 w-full max-w-5xl px-4 sm:mt-6">
        <div className="relative h-48 w-full overflow-hidden rounded-3xl border border-slate-200/80 bg-slate-900 shadow-xl transition-all sm:h-64 md:h-80 lg:h-96 dark:border-slate-800">
          {info.logoUrl ? (
            <img
              src={info.logoUrl}
              alt={businessName}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="relative flex h-full w-full items-center justify-center bg-gradient-to-br from-[var(--brand-700,#1e3a8a)] via-[var(--brand-600,#2563eb)] to-slate-950">
              <div
                aria-hidden="true"
                className="pointer-events-none absolute -right-20 -top-20 h-72 w-72 rounded-full bg-white/10 blur-3xl"
              />
              <div
                aria-hidden="true"
                className="pointer-events-none absolute -bottom-20 -left-20 h-72 w-72 rounded-full bg-amber-400/15 blur-3xl"
              />
            </div>
          )}
        </div>
      </div>

      {/* 2. Store Name & Description Below Banner (Aligned Right for Kurdish, Left for English) */}
      <div className="mx-auto mt-5 w-full max-w-5xl px-4 sm:mt-6">
        <div
          className={`flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between ${
            isKurdish ? 'text-right' : 'text-left'
          }`}
        >
          <div className="flex-1">
            <h1
              className={`text-2xl font-black tracking-tight text-slate-900 sm:text-3xl md:text-4xl dark:text-white ${
                isKurdish ? 'font-kurdish' : 'font-sans'
              }`}
            >
              {businessName}
            </h1>
            {info.description && (
              <p
                className={`mt-2 text-sm font-medium leading-relaxed text-slate-600 sm:text-base dark:text-slate-300 ${
                  isKurdish ? 'font-kurdish' : 'font-sans'
                }`}
              >
                {info.description}
              </p>
            )}
          </div>

          {/* Theme Switcher Button */}
          <div className="self-end sm:self-center">
            <ThemeToggle />
          </div>
        </div>

        {/* 3. Small Banner for Social Media Icons */}
        <SocialIcons
          facebookUrl={info.facebookUrl}
          instagramUrl={info.instagramUrl}
          tiktokUrl={info.tiktokUrl}
          whatsappNumber={info.whatsappNumber}
        />
      </div>
    </div>
  );
}
