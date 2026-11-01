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
    <div className="mx-auto mt-8 mb-6 w-full max-w-xl px-4">
      <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 rounded-2xl border border-white/60 bg-white/40 p-3 shadow-xs backdrop-blur-xl transition-all dark:border-white/10 dark:bg-white/[0.04] sm:p-3.5">
        {hasPhone && (
          <a
            href={`tel:${info.phone}`}
            className="group flex items-center gap-2 text-xs font-bold text-slate-800 transition hover:text-[var(--brand-600,#D4AF37)] sm:text-sm dark:text-slate-200 dark:hover:text-[var(--brand-500,#D4AF37)]"
          >
            <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-amber-500/15 text-amber-600 transition group-hover:bg-amber-500/25 dark:bg-amber-500/20 dark:text-amber-400">
              <Phone size={12} />
            </div>
            <span dir="ltr">{info.phone}</span>
          </a>
        )}

        {hasPhone && hasAddress && (
          <span className="hidden text-slate-300 sm:inline dark:text-slate-700">
            •
          </span>
        )}

        {hasAddress && (
          <div className="flex items-center gap-2 text-xs font-medium text-slate-600 sm:text-sm dark:text-slate-300">
            <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-amber-500/15 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400">
              <MapPin size={12} />
            </div>
            <span className="max-w-[240px] truncate sm:max-w-xs">{info.address}</span>
          </div>
        )}
      </div>
    </div>
  );
}
