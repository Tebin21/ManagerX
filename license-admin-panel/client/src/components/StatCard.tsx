interface Props {
  label: string;
  value: number;
  accent?: boolean;
}

export function StatCard({ label, value, accent }: Props) {
  return (
    <div className={`rounded-xl border p-4 shadow-card transition-shadow hover:shadow-md ${
      accent ? 'border-brand-200 bg-brand-50' : 'border-slate-200 bg-white'
    }`}>
      <div className={`text-2xl font-bold tracking-tight ${accent ? 'text-brand-700' : 'text-slate-900'}`}>
        {value}
      </div>
      <div className="mt-1 text-xs font-medium uppercase tracking-wide text-slate-500">{label}</div>
    </div>
  );
}
