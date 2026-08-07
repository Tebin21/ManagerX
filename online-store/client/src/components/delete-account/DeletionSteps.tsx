const STEPS = [
  "Open the Froshiar App",
  "Go to Settings",
  "Scroll to the bottom",
  "Tap Delete Account",
  "Confirm deletion",
  "Wait until deletion completes",
];

export function DeletionSteps() {
  return (
    <ol className="mt-6 space-y-3">
      {STEPS.map((step, i) => (
        <li
          key={step}
          className="flex items-center gap-4 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm"
        >
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gold-100 text-sm font-semibold text-gold-dark">
            {i + 1}
          </span>
          <span className="text-sm font-medium text-ink">{step}</span>
        </li>
      ))}
    </ol>
  );
}
