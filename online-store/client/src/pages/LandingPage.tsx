import { Footer } from '../components/Footer';
import { MarketingHomepage } from '../marketing/MarketingHomepage';

export function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <MarketingHomepage />
      {/* Footer is a fixed, English-only, LTR brand element (BexDre credit) shared
          with /demo and every store — force it back to ltr/en regardless of the
          homepage's own locale toggle, since <html dir>/<html lang> are inherited
          and would otherwise leak the homepage's RTL/Kurdish state into it. */}
      <div dir="ltr" lang="en">
        <Footer />
      </div>
    </div>
  );
}
