import type { LucideIcon } from "lucide-react";

export function FeatureCard({
  icon: Icon,
  title,
  description,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-2xl border border-white/15 bg-slate-900/45 p-6 shadow-[inset_0_1px_1px_rgba(255,255,255,0.2),0_10px_25px_rgba(0,0,0,0.35)] backdrop-blur-2xl [-webkit-backdrop-filter:blur(24px)] transition-all hover:border-gold-400/40 hover:-translate-y-1 dark:border-white/[0.12] dark:bg-white/[0.035]">
      <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gold-500/15 text-gold-400 border border-gold-400/25">
        <Icon size={20} />
      </div>
      <h3 className="mt-4 text-base font-bold text-white">{title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-slate-300 dark:text-slate-300">
        {description}
      </p>
    </div>
  );
}
