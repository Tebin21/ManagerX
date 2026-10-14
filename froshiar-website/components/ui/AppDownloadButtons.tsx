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
  size = 'md',
  layout = 'row',
}: AppDownloadButtonsProps) {
  const t = useTranslations('download');

  const isLg = size === 'lg';
  const isSm = size === 'sm';

  const containerLayout = layout === 'col' ? 'flex flex-col' : 'flex flex-row flex-wrap justify-center';

  return (
    <div className={`${containerLayout} items-center gap-3 sm:gap-4 ${className}`}>
      {/* ── Apple App Store Button ── */}
      <a
        href={APP_STORE_URL}
        target="_blank"
        rel="noopener noreferrer"
        className={`group relative flex items-center gap-3 rounded-2xl border transition-all duration-300 active:scale-95 text-start cursor-pointer select-none overflow-hidden ${
          isSm
            ? 'px-3.5 py-2 min-w-[150px]'
            : isLg
            ? 'px-6 py-3.5 min-w-[210px] sm:min-w-[230px]'
            : 'px-5 py-3 min-w-[190px] sm:min-w-[205px]'
        } bg-[#0A0F1D]/90 hover:bg-[#111827] text-white border-slate-700/80 hover:border-[#D4AF37] shadow-lg shadow-black/30 hover:shadow-[0_0_28px_rgba(212,175,55,0.28)] hover:-translate-y-1 backdrop-blur-xl`}
        aria-label="Download Froshiar on Apple App Store"
      >
        {/* Subtle background gradient shine */}
        <div className="absolute inset-0 bg-gradient-to-tr from-white/[0.04] to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

        {/* Apple Icon */}
        <div className="shrink-0 text-white group-hover:text-[#D4AF37] group-hover:scale-110 transition-all duration-300">
          <AppleIcon className={isSm ? 'w-5 h-5' : isLg ? 'w-8 h-8' : 'w-7 h-7'} />
        </div>

        {/* Text Details */}
        <div className="flex flex-col min-w-0">
          <span className="text-[10px] sm:text-[11px] font-medium uppercase tracking-wider text-slate-400 group-hover:text-slate-300 transition-colors leading-tight">
            {t('appStoreSubtitle')}
          </span>
          <span className={`${isSm ? 'text-xs' : isLg ? 'text-base sm:text-lg' : 'text-sm sm:text-base'} font-black text-white tracking-tight group-hover:text-gold-300 transition-colors leading-snug font-sans`}>
            App Store
          </span>
        </div>
      </a>

      {/* ── Google Play Store Button ── */}
      <a
        href={GOOGLE_PLAY_URL}
        target="_blank"
        rel="noopener noreferrer"
        className={`group relative flex items-center gap-3 rounded-2xl border transition-all duration-300 active:scale-95 text-start cursor-pointer select-none overflow-hidden ${
          isSm
            ? 'px-3.5 py-2 min-w-[150px]'
            : isLg
            ? 'px-6 py-3.5 min-w-[210px] sm:min-w-[230px]'
            : 'px-5 py-3 min-w-[190px] sm:min-w-[205px]'
        } bg-[#0A0F1D]/90 hover:bg-[#111827] text-white border-slate-700/80 hover:border-[#D4AF37] shadow-lg shadow-black/30 hover:shadow-[0_0_28px_rgba(212,175,55,0.28)] hover:-translate-y-1 backdrop-blur-xl`}
        aria-label="Download Froshiar on Google Play Store"
      >
        {/* Subtle background gradient shine */}
        <div className="absolute inset-0 bg-gradient-to-tr from-white/[0.04] to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

        {/* Google Play Icon */}
        <div className="shrink-0 group-hover:scale-110 transition-all duration-300">
          <GooglePlayIcon className={isSm ? 'w-5 h-5' : isLg ? 'w-8 h-8' : 'w-7 h-7'} />
        </div>

        {/* Text Details */}
        <div className="flex flex-col min-w-0">
          <span className="text-[10px] sm:text-[11px] font-medium uppercase tracking-wider text-slate-400 group-hover:text-slate-300 transition-colors leading-tight">
            {t('googlePlaySubtitle')}
          </span>
          <span className={`${isSm ? 'text-xs' : isLg ? 'text-base sm:text-lg' : 'text-sm sm:text-base'} font-black text-white tracking-tight group-hover:text-gold-300 transition-colors leading-snug font-sans`}>
            Google Play
          </span>
        </div>
      </a>
    </div>
  );
}
