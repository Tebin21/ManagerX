import { Link } from "react-router-dom";

export function HelpCallout() {
  return (
    <div className="rounded-2xl border border-slate-100 bg-white p-6 text-center shadow-sm sm:p-8">
      <h2 className="text-lg font-semibold tracking-tight text-ink sm:text-xl">Need Help?</h2>
      <p className="mt-2 text-sm text-slate-500">
        If you have questions before deleting your account, reach out to us.
      </p>
      <div className="mt-5 flex flex-col items-center justify-center gap-3 sm:flex-row">
        <a
          href="mailto:support@froshiar.store"
          className="font-medium text-ink underline decoration-gold/60 underline-offset-2 transition-colors hover:text-gold-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold rounded-sm"
        >
          support@froshiar.store
        </a>
        <Link
          to="/#contact"
          className="inline-flex items-center justify-center rounded-full bg-gold px-5 py-2.5 text-sm font-semibold text-ink transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold"
        >
          Contact Us
        </Link>
      </div>
    </div>
  );
}
