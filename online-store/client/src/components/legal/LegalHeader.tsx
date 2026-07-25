import { Link } from "react-router-dom";

export function LegalHeader() {
  return (
    <header className="sticky top-0 z-50 border-b border-slate-100 bg-white/80 backdrop-blur-md">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-4 sm:px-8 lg:px-10">
        <Link to="/" className="flex items-center gap-2" aria-label="Froshiar home">
          <img src="/logo.png" alt="" className="h-7 w-7 object-contain" />
          <span className="text-lg font-semibold tracking-tight text-ink">Froshiar</span>
        </Link>
        <Link
          to="/"
          className="text-sm font-medium text-slate-600 transition-colors hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:rounded-sm"
        >
          Back to home
        </Link>
      </div>
    </header>
  );
}
