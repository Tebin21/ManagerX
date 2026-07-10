import type { LucideIcon } from "lucide-react";

export function BusinessTypeCard({ icon: Icon, label }: { icon: LucideIcon; label: string }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-2xl border border-slate-100 bg-white p-5 text-center shadow-card transition-shadow hover:shadow-md">
      <div className="flex h-11 w-11 items-center justify-center rounded-full bg-gold-50 text-gold-700">
        <Icon size={19} />
      </div>
      <p className="text-sm font-medium text-ink">{label}</p>
    </div>
  );
}
