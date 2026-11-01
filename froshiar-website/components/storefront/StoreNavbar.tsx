'use client';

import Link from 'next/link';
import { Store as StoreIcon } from 'lucide-react';
import { ThemeToggle } from '@/components/layout/ThemeToggle';

interface Props {
  businessName: string;
  logoUrl?: string;
  slug?: string;
}

export function StoreNavbar({ businessName, logoUrl, slug }: Props) {
  const homeHref = slug ? `/${slug}` : '#';

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-200/80 bg-white/85 backdrop-blur-md transition-colors duration-200 dark:border-slate-800 dark:bg-slate-950/85">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3 sm:px-6">
        {/* Corner 1 (Right in Kurdish RTL): Store Name & Logo */}
        <Link
          href={homeHref}
          className="group flex items-center gap-2.5 transition-opacity hover:opacity-90"
        >
          {logoUrl ? (
            <img
              src={logoUrl}
              alt={businessName}
              className="h-8 w-8 rounded-full border border-amber-500/40 object-cover shadow-xs"
            />
          ) : (
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-500/15 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400">
              <StoreIcon size={16} />
            </div>
          )}

          <div className="flex items-center gap-2">
            <span className="max-w-[180px] truncate text-base font-black tracking-tight text-slate-900 sm:max-w-xs md:max-w-md dark:text-white">
              {businessName}
            </span>
            <span
              className="relative flex h-2 w-2 shrink-0"
              title="فڕۆشگا چالاکە"
            >
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
            </span>
          </div>
        </Link>

        {/* Corner 2 (Left in Kurdish RTL): Theme Switcher */}
        <div className="flex items-center gap-2">
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
