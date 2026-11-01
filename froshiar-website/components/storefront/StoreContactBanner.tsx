'use client';

import { Phone, MapPin } from 'lucide-react';
import type { StoreInfo } from '@/lib/storefront/storeApi';

interface Props {
  info: StoreInfo;
}

export function StoreContactBanner({ info }: Props) {
  const hasPhone = Boolean(info.phone && info.phone.trim());
  const hasAddress = Boolean(info.address && info.address.trim());

  if (!hasPhone && !hasAddress) {
    return null;
  }

  return (
    <div className="mx-auto mt-12 mb-8 w-full max-w-5xl px-4">
      <div className="relative overflow-hidden rounded-3xl border border-slate-200/80 bg-gradient-to-br from-slate-900 via-slate-850 to-slate-950 p-6 text-white shadow-xl sm:p-8 dark:border-slate-800">
        {/* Ambient decorative glowing mesh */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-[var(--brand-500,#D4AF37)]/15 blur-3xl"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-16 -left-16 h-56 w-56 rounded-full bg-blue-500/10 blur-3xl"
        />

        {/* Centered Contact Box */}
        <div className="relative z-10 flex flex-col items-center justify-center text-center">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-amber-400/30 bg-amber-400/10 px-4 py-1.5 text-xs font-bold text-amber-300">
            <Phone size={13} />
            <span>پەیوەندیکردن و ناونیشانی فڕۆشگا</span>
          </div>

          {/* Clickable Phone Pill */}
          {hasPhone && (
            <div className="mb-3">
              <a
                href={`tel:${info.phone}`}
                className="group inline-flex items-center gap-2.5 rounded-2xl border border-white/20 bg-white/10 px-6 py-3 text-base font-black text-white shadow-md backdrop-blur-md transition-all duration-200 hover:scale-105 hover:bg-white/20 sm:text-lg"
              >
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-amber-500/25 text-amber-300 group-hover:bg-amber-500/35">
                  <Phone size={15} />
                </div>
                <span dir="ltr">{info.phone}</span>
              </a>
            </div>
          )}

          {/* Address Directly Underneath */}
          {hasAddress && (
            <div className="mt-1 inline-flex max-w-lg items-center justify-center gap-2 text-xs font-medium text-slate-300 sm:text-sm">
              <MapPin size={16} className="shrink-0 text-amber-400" />
              <span>{info.address}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

