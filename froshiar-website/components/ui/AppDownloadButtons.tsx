'use client';

import React from 'react';
import { useTranslations } from 'next-intl';

export const APP_STORE_URL = 'https://apps.apple.com/iq/app/froshiar/id6795295325';
export const GOOGLE_PLAY_URL = 'https://play.google.com/store/apps/details?id=com.froshiar.app&pcampaignid=web_share';

export function AppleIcon({ className = 'w-7 h-7' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 6.37c.61-.75 1.04-1.8 0.92-2.85-.92.04-2.06.62-2.73 1.39-.58.67-1.1 1.74-.96 2.77 1.03.08 2.09-.53 2.77-1.31z" />
    </svg>
  );
}

export function GooglePlayIcon({ className = 'w-7 h-7' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M3.609 1.813A1.5 1.5 0 0 0 3 3.093v17.814a1.5 1.5 0 0 0 .609 1.28l9.646-9.646L3.609 1.813z"
        fill="#2196F3"
      />
      <path
        d="M16.945 9.851 13.255 12.54l-9.646 9.646a1.5 1.5 0 0 0 1.99.074l11.346-6.409-3.69-3.69z"
        fill="#4CAF50"
      />
      <path
        d="M13.255 12.54l3.69-2.689 3.805 2.15a1.5 1.5 0 0 1 0 2.617l-3.805 2.15-3.69-2.689-.001-.001z"
        fill="#FFC107"
      />
      <path
        d="M5.599 1.74A1.5 1.5 0 0 0 3.61 1.814l9.645 9.646 3.69-2.689L5.599 1.74z"
        fill="#F4364C"
      />
    </svg>
  );
}

export interface AppDownloadButtonsProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  layout?: 'row' | 'col';
}

export function AppDownloadButtons({
  className = '',
  size = 'lg',
  layout = 'row',
}: AppDownloadButtonsProps) {
  const t = useTranslations('download');
  const isLg = size === 'lg';

  return (
    <div
      className={`flex ${
        layout === 'col' ? 'flex-col w-full' : 'flex-row flex-wrap items-center justify-center'
      } gap-3 sm:gap-4 ${className}`}
    >
      {/* ── Apple App Store Button (Solid, Distinctive, Premium Obsidian) ── */}
      <a
        href={APP_STORE_URL}
        target="_blank"
        rel="noopener noreferrer"
        className={`group relative flex items-center gap-3.5 rounded-2xl bg-[#090D14] hover:bg-[#111724] text-white border border-slate-700/80 hover:border-gold-400 transition-all duration-300 shadow-[0_10px_25px_rgba(0,0,0,0.6),0_2px_4px_rgba(0,0,0,0.4)] hover:shadow-[0_16px_36px_rgba(248,198,30,0.22)] hover:-translate-y-1 active:scale-[0.98] select-none cursor-pointer overflow-hidden ${
          isLg
            ? 'px-6 py-3.5 sm:px-7 sm:py-4 min-w-[175px] sm:min-w-[215px]'
            : 'px-4 py-2 sm:px-5 sm:py-2.5 min-w-[140px] sm:min-w-[165px]'
        }`}
        aria-label="Download Froshiar on Apple App Store"
      >
        {/* Subtle top specular hairline edge */}
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent pointer-events-none" />

        {/* Apple Icon */}
        <div className="shrink-0 text-white group-hover:text-gold-300 transition-transform duration-300 group-hover:scale-110">
          <AppleIcon className={isLg ? 'w-7 h-7 sm:w-8 sm:h-8' : 'w-5 h-5 sm:w-6 sm:h-6'} />
        </div>

        {/* Text */}
        <div className="flex flex-col text-start min-w-0">
          <span
            className={`font-semibold tracking-wider text-slate-400 group-hover:text-slate-300 transition-colors uppercase leading-none ${
              isLg ? 'text-[10px] sm:text-[11px] mb-1' : 'text-[9px] sm:text-[10px] mb-0.5'
            }`}
          >
            {t('appStoreSubtitle')}
          </span>
          <span
            className={`font-black text-white group-hover:text-gold-300 transition-colors tracking-tight leading-tight font-sans ${
              isLg ? 'text-base sm:text-xl' : 'text-xs sm:text-sm'
            }`}
          >
            App Store
          </span>
        </div>
      </a>

      {/* ── Google Play Store Button (Solid, Distinctive, Premium Obsidian) ── */}
      <a
        href={GOOGLE_PLAY_URL}
        target="_blank"
        rel="noopener noreferrer"
        className={`group relative flex items-center gap-3.5 rounded-2xl bg-[#090D14] hover:bg-[#111724] text-white border border-slate-700/80 hover:border-gold-400 transition-all duration-300 shadow-[0_10px_25px_rgba(0,0,0,0.6),0_2px_4px_rgba(0,0,0,0.4)] hover:shadow-[0_16px_36px_rgba(248,198,30,0.22)] hover:-translate-y-1 active:scale-[0.98] select-none cursor-pointer overflow-hidden ${
          isLg
            ? 'px-6 py-3.5 sm:px-7 sm:py-4 min-w-[175px] sm:min-w-[215px]'
            : 'px-4 py-2 sm:px-5 sm:py-2.5 min-w-[140px] sm:min-w-[165px]'
        }`}
        aria-label="Download Froshiar on Google Play Store"
      >
        {/* Subtle top specular hairline edge */}
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent pointer-events-none" />

        {/* Google Play Icon */}
        <div className="shrink-0 transition-transform duration-300 group-hover:scale-110">
          <GooglePlayIcon className={isLg ? 'w-7 h-7 sm:w-8 sm:h-8' : 'w-5 h-5 sm:w-6 sm:h-6'} />
        </div>

        {/* Text */}
        <div className="flex flex-col text-start min-w-0">
          <span
            className={`font-semibold tracking-wider text-slate-400 group-hover:text-slate-300 transition-colors uppercase leading-none ${
              isLg ? 'text-[10px] sm:text-[11px] mb-1' : 'text-[9px] sm:text-[10px] mb-0.5'
            }`}
          >
            {t('googlePlaySubtitle')}
          </span>
          <span
            className={`font-black text-white group-hover:text-gold-300 transition-colors tracking-tight leading-tight font-sans ${
              isLg ? 'text-base sm:text-xl' : 'text-xs sm:text-sm'
            }`}
          >
            Google Play
          </span>
        </div>
      </a>
    </div>
  );
}
