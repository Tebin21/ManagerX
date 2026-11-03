'use client';

import Link from 'next/link';
import { Globe, Phone } from 'lucide-react';
import { useLocale } from 'next-intl';

interface Props {
  isRTL?: boolean;
}

export function StorefrontFooter({ isRTL }: Props) {
  let locale = 'ckb';
  try {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    locale = useLocale();
  } catch {
    locale = isRTL === false ? 'en' : 'ckb';
  }

  const isKurdish = isRTL ?? (locale === 'ckb');

  return (
    <footer className="bg-white dark:bg-slate-950 px-6 py-10 text-slate-600 dark:text-slate-300 mt-auto border-t border-slate-200 dark:border-slate-800 transition-colors duration-200">
      <div className="mx-auto flex max-w-5xl flex-col items-center gap-6 text-center sm:flex-row sm:items-start sm:justify-between sm:text-left">
        <div className={`flex flex-col items-center ${isKurdish ? 'sm:items-start sm:text-right' : 'sm:items-start sm:text-left'}`}>
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-amber-500 dark:text-amber-400">
            {isKurdish ? 'گەشەپێدراوە لەلایەن' : 'DEVELOPED BY'}
          </p>
          <p className="mt-1 text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">BexDre</p>
          <p className="mt-3 max-w-sm text-sm leading-relaxed text-slate-500 dark:text-slate-400">
            {isKurdish
              ? 'ئەم ماڵپەڕە بە فەرمی لەلایەن گرووپی تەکنەلۆژیای بێکسدرێ دروستکراوە.'
              : 'This storefront is officially powered and developed by BexDre Technology Group.'}
          </p>
          <div className="mt-4 flex items-center justify-center gap-4 text-sm sm:justify-start">
            <Link href="/privacy" className="text-slate-500 hover:text-amber-500 dark:text-slate-400 dark:hover:text-amber-400 transition-colors">
              Privacy Policy
            </Link>
            <Link href="/terms" className="text-slate-500 hover:text-amber-500 dark:text-slate-400 dark:hover:text-amber-400 transition-colors">
              Terms of Service
            </Link>
          </div>
        </div>

        <div className={`flex flex-col items-center gap-3 ${isKurdish ? 'sm:items-end' : 'sm:items-end'}`}>
          <p className={`max-w-xs text-sm leading-relaxed text-slate-500 dark:text-slate-400 ${isKurdish ? 'sm:text-right' : 'sm:text-right'}`}>
            {isKurdish
              ? 'بۆ دروستکردنی سیستەم و ماڵپەڕ و ئەپڵیکەیشنی تایبەت بە مارکێتەکەت، پەیوەندیمان پێوە بکە:'
              : 'To build a custom POS system, website, or mobile application for your business, contact us:'}
          </p>
          <div className={`flex flex-col items-center gap-2 ${isKurdish ? 'sm:items-end' : 'sm:items-end'}`}>
            <a
              href="tel:07708229696"
              className="flex items-center gap-2 text-sm font-semibold text-amber-600 dark:text-amber-400 transition hover:text-amber-500 dark:hover:text-amber-300"
            >
              <Phone size={15} className="shrink-0" />
              <span
                dir="ltr"
                className="inline-block font-sans tabular-nums font-bold tracking-wider"
                style={{ direction: 'ltr', unicodeBidi: 'isolate' }}
              >
                0770 822 9696
              </span>
            </a>
            <a
              href="https://www.bexdre.com"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-sm font-semibold text-amber-600 dark:text-amber-400 transition hover:text-amber-500 dark:hover:text-amber-300"
            >
              <Globe size={15} className="shrink-0" />
              <span
                dir="ltr"
                className="inline-block font-sans font-medium"
                style={{ direction: 'ltr', unicodeBidi: 'isolate' }}
              >
                www.BexDre.com
              </span>
            </a>
          </div>
        </div>
      </div>

      <div className="mx-auto mt-8 max-w-5xl border-t border-slate-200 dark:border-white/10 pt-5 text-center text-xs text-slate-400 dark:text-slate-500 font-sans">
        © {new Date().getFullYear()} BexDre & Froshiar POS. All rights reserved.
      </div>
    </footer>
  );
}
