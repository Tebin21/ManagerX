import { Globe, Phone } from 'lucide-react';

// Premium dark/gold treatment is deliberately scoped to this footer only — the rest
// of the storefront keeps the blue brand palette that matches the ManagerX app.
export function Footer() {
  return (
    <footer className="bg-slate-950 px-6 py-10 text-slate-300">
      <div className="mx-auto flex max-w-5xl flex-col items-center gap-6 text-center sm:flex-row sm:items-start sm:justify-between sm:text-left">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-gold">Developed By</p>
          <p className="mt-1 text-2xl font-extrabold text-white">BexDre</p>
          <p className="mt-3 max-w-sm text-sm leading-relaxed text-slate-400">
            This website was professionally designed and developed by BexDre.
          </p>
        </div>

        <div className="flex flex-col items-center gap-3 sm:items-end">
          <p className="max-w-xs text-sm leading-relaxed text-slate-400 sm:text-right">
            For custom websites, business systems, mobile applications, e-commerce
            platforms, and software solutions, contact us:
          </p>
          <div className="flex flex-col items-center gap-2 sm:items-end">
            <a
              href="tel:07708229696"
              className="flex items-center gap-2 text-sm font-semibold text-gold-light transition hover:text-gold"
            >
              <Phone size={15} /> 0770 822 9696
            </a>
            <a
              href="https://www.bexdre.com"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-sm font-semibold text-gold-light transition hover:text-gold"
            >
              <Globe size={15} /> www.BexDre.com
            </a>
          </div>
        </div>
      </div>

      <div className="mx-auto mt-8 max-w-5xl border-t border-white/10 pt-5 text-center text-[11px] text-slate-500">
        © {new Date().getFullYear()} BexDre. All rights reserved.
      </div>
    </footer>
  );
}
