import Link from 'next/link';
import { Globe, Phone } from 'lucide-react';

export function StorefrontFooter() {
  return (
    <footer className="bg-slate-950 px-6 py-10 text-slate-300 mt-auto border-t border-slate-800">
      <div className="mx-auto flex max-w-5xl flex-col items-center gap-6 text-center sm:flex-row sm:items-start sm:justify-between sm:text-left">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-amber-400">گەشەپێدراوە لەلایەن</p>
          <p className="mt-1 text-2xl font-extrabold text-white">BexDre</p>
          <p className="mt-3 max-w-sm text-sm leading-relaxed text-slate-400">
            ئەم ماڵپەڕە بە فەرمی لەلایەن گروپی تەکنەلۆژیای بێکسدرێ دروستکراوە.
          </p>
          <div className="mt-4 flex items-center justify-center gap-4 text-sm sm:justify-start">
            <Link href="/privacy" className="text-slate-400 transition-colors hover:text-amber-400">
              Privacy Policy
            </Link>
            <Link href="/terms" className="text-slate-400 transition-colors hover:text-amber-400">
              Terms of Service
            </Link>
          </div>
        </div>

        <div className="flex flex-col items-center gap-3 sm:items-end">
          <p className="max-w-xs text-sm leading-relaxed text-slate-400 sm:text-right">
            بۆ دروستکردنی سیستەم و ماڵپەڕ و ئەپڵیکەیشنی تایبەت بە مارکێتەکەت، پەیوەندیمان پێوە بکە:
          </p>
          <div className="flex flex-col items-center gap-2 sm:items-end">
            <a
              href="tel:07708229696"
              className="flex items-center gap-2 text-sm font-semibold text-amber-400 transition hover:text-amber-300"
            >
              <Phone size={15} /> 0770 822 9696
            </a>
            <a
              href="https://www.bexdre.com"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-sm font-semibold text-amber-400 transition hover:text-amber-300"
            >
              <Globe size={15} /> www.BexDre.com
            </a>
          </div>
        </div>
      </div>

      <div className="mx-auto mt-8 max-w-5xl border-t border-white/10 pt-5 text-center text-xs text-slate-500">
        © {new Date().getFullYear()} BexDre & Froshiar POS. All rights reserved.
      </div>
    </footer>
  );
}
