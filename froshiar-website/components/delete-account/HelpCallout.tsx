import { Link } from "@/i18n/navigation";

export function HelpCallout() {
  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-6 text-center shadow-sm dark:border-gold-900/30 dark:bg-white/[0.03] sm:p-8">
      <h2 className="text-lg font-semibold tracking-tight text-ink sm:text-xl">Need Help?</h2>
      <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
        If you have questions before deleting your account, reach out to us.
      </p>
      <div className="mt-5 flex flex-col items-center justify-center gap-3 sm:flex-row">
        <a
          href="mailto:tebin.faruq@gmail.com"
          className="font-medium text-ink underline decoration-gold-500/60 underline-offset-2 transition-colors hover:text-gold-600 dark:hover:text-gold-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-500 rounded-sm"
        >
          tebin.faruq@gmail.com
        </a>
        <Link
          href="/#contact"
          className="inline-flex items-center justify-center rounded-full bg-gold-500 px-5 py-2.5 text-sm font-semibold text-ink-fixed transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-500"
        >
          Contact Us
        </Link>
      </div>
    </div>
  );
}
