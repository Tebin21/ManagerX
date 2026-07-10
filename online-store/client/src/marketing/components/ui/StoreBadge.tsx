import type { LucideIcon } from "lucide-react";

// No real App Store / Google Play listing exists yet — this renders the shape of
// a real store badge but is deliberately inert: no href, no onClick, not a tab
// stop, and visually muted so it doesn't read as a working link.
export function StoreBadge({
  icon: Icon,
  eyebrow,
  name,
}: {
  icon: LucideIcon;
  eyebrow: string;
  name: string;
}) {
  return (
    <div
      aria-disabled="true"
      className="flex cursor-not-allowed select-none items-center gap-3 rounded-xl border border-slate-200 bg-slate-100 px-4 py-2.5 opacity-70 grayscale"
    >
      <Icon size={22} className="text-slate-500" />
      <div className="text-start leading-tight">
        <p className="text-[10px] text-slate-500">{eyebrow}</p>
        <p className="text-sm font-semibold text-slate-600">{name}</p>
      </div>
    </div>
  );
}
