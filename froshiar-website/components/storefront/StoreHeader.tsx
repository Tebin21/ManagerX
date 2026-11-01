'use client';

import { Phone, MapPin, Store as StoreIcon } from 'lucide-react';
import type { StoreInfo } from '@/lib/storefront/storeApi';

function initials(name: string): string {
  return name.trim().slice(0, 1).toUpperCase() || '?';
}

interface Props {
  businessName: string;
  info: StoreInfo;
}

export function StoreHeader({ businessName, info }: Props) {
  const hasContact = Boolean(info.phone || info.address);

  return (
    <div className="mx-auto mt-4 w-full max-w-5xl px-4 sm:mt-6">
      <div className="relative overflow-hidden rounded-3xl border border-white/15 bg-gradient-to-br from-[var(--brand-700,#1e3a8a)] via-[var(--brand-600,#2563eb)] to-slate-950 p-6 sm:p-8 md:p-10 text-white shadow-2xl">
        {/* Ambient decorative glowing mesh background */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-20 -top-20 h-72 w-72 rounded-full bg-white/10 blur-3xl"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-20 -left-20 h-72 w-72 rounded-full bg-amber-400/15 blur-3xl"
        />

        {/* Corner Contact Info (Phone & Address directly underneath) */}
        {hasContact && (
          <div className="mt-4 flex flex-col items-start gap-1.5 rounded-2xl border border-white/20 bg-black/25 p-3 backdrop-blur-md sm:absolute sm:top-5 sm:left-5 sm:mt-0 sm:p-3.5 rtl:sm:left-5 rtl:sm:right-auto">
            {info.phone && (
              <a
                href={`tel:${info.phone}`}
                className="group flex items-center gap-2 text-xs font-bold text-white transition hover:text-amber-300 sm:text-sm"
              >
                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-amber-500/20 text-amber-300 group-hover:bg-amber-500/30">
                  <Phone size={12} />
                </div>
                <span dir="ltr">{info.phone}</span>
              </a>
            )}

            {info.address && (
              <div className="flex items-center gap-2 text-xs text-white/90 sm:text-sm">
                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-amber-500/20 text-amber-300">
                  <MapPin size={12} />
                </div>
                <span className="max-w-[220px] truncate sm:max-w-[260px]">{info.address}</span>
              </div>
            )}
          </div>
        )}

        {/* Center Banner Content: Profile / Logo, Store Name, Welcome Description */}
        <div className="relative z-10 mx-auto flex flex-col items-center text-center">
          {info.logoUrl ? (
            <div className="relative mb-4">
              <img
                src={info.logoUrl}
                alt={businessName}
                className="h-24 w-24 rounded-full border-4 border-white/40 object-cover shadow-2xl ring-4 ring-black/15 transition-transform duration-300 hover:scale-105 sm:h-28 sm:w-28"
              />
            </div>
          ) : (
            <div className="relative mb-4 flex h-24 w-24 items-center justify-center rounded-full border-4 border-white/40 bg-white/15 text-3xl font-black text-white shadow-2xl backdrop-blur-md sm:h-28 sm:w-28">
              {initials(businessName) || <StoreIcon size={32} />}
            </div>
          )}

          <h1 className="text-2xl font-black tracking-tight text-white drop-shadow-sm sm:text-3xl md:text-4xl">
            {businessName}
          </h1>

          {info.description && (
            <p className="mt-2.5 max-w-xl text-sm leading-relaxed font-medium text-white/90 sm:text-base">
              {info.description}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
