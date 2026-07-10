export function StatTotal({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-gradient-to-br from-gold-500 to-gold-600 p-4 text-ink shadow-sm">
      <p className="text-[11px] font-medium uppercase tracking-wide text-ink/70">{label}</p>
      <p className="mt-1 text-2xl font-bold">{value}</p>
    </div>
  );
}
