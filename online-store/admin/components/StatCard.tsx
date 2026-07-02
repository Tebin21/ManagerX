import type { LucideIcon } from "lucide-react";

interface Props {
  label: string;
  value: string | number;
  icon?: LucideIcon;
  tone?: "default" | "brand" | "warning" | "danger" | "success";
}

const TONE_STYLES: Record<NonNullable<Props["tone"]>, string> = {
  default: "text-ink",
  brand: "text-brand-600 dark:text-brand-500",
  warning: "text-amber-600 dark:text-amber-500",
  danger: "text-red-600 dark:text-red-500",
  success: "text-emerald-600 dark:text-emerald-500",
};

export function StatCard({ label, value, icon: Icon, tone = "default" }: Props) {
  return (
    <div className="rounded-xl border border-border bg-surface p-4 transition-shadow hover:shadow-sm">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium uppercase tracking-wide text-muted">{label}</span>
        {Icon && <Icon size={15} className="text-muted" />}
      </div>
      <div className={`mt-2 text-2xl font-semibold tracking-tight ${TONE_STYLES[tone]}`}>{value}</div>
    </div>
  );
}
