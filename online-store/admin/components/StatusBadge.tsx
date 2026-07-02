type Tone = "success" | "danger" | "warning" | "neutral" | "brand";

const TONE_CLASSES: Record<Tone, string> = {
  success: "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400",
  danger: "bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-400",
  warning: "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400",
  neutral: "bg-slate-100 text-slate-600 dark:bg-white/5 dark:text-slate-400",
  brand: "bg-brand-50 text-brand-700 dark:bg-brand-500/10 dark:text-brand-400",
};

export function StatusBadge({ label, tone }: { label: string; tone: Tone }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${TONE_CLASSES[tone]}`}>
      {label}
    </span>
  );
}

export function storeStatusBadge(store: { enabled: boolean; adminSuspended?: boolean }) {
  if (store.adminSuspended) return { label: "Suspended", tone: "danger" as const };
  if (!store.enabled) return { label: "Disabled", tone: "neutral" as const };
  return { label: "Active", tone: "success" as const };
}

export function subscriptionStatusBadge(status?: string) {
  switch (status) {
    case "valid":
      return { label: "Active", tone: "success" as const };
    case "expired":
      return { label: "Expired", tone: "danger" as const };
    case "wrong_device":
      return { label: "Wrong device", tone: "warning" as const };
    case "invalid":
      return { label: "Invalid", tone: "warning" as const };
    default:
      return { label: "No subscription data", tone: "neutral" as const };
  }
}
