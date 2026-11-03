import type { LucideIcon } from "lucide-react";

export function BusinessTypeCard({
  icon: Icon,
  label,
}: {
  icon: LucideIcon;
  label: string;
}) {
  return (
    <div className="group relative flex flex-col items-center justify-center gap-3.5 rounded-2xl sm:rounded-3xl border border-white/15 dark:border-white/[0.12] bg-slate-900/45 dark:bg-white/[0.035] backdrop-blur-2xl [-webkit-backdrop-filter:blur(24px)] p-4 sm:p-6 text-center shadow-[inset_0_1.5px_1px_rgba(255,255,255,0.25),inset_0_-1px_1px_rgba(255,255,255,0.05),0_15px_35px_rgba(0,0,0,0.45)] transition-all duration-300 hover:-translate-y-1.5 hover:border-gold-400/50 hover:shadow-[inset_0_1.5px_1px_rgba(255,255,255,0.35),0_20px_45px_rgba(248,198,30,0.18)] overflow-hidden">
      {/* Specular glass reflection sheen */}
      <div className="absolute inset-0 bg-gradient-to-b from-white/[0.12] via-white/[0.02] to-transparent pointer-events-none" />

      {/* Subtle hover liquid glow */}
      <div className="absolute -inset-px rounded-2xl sm:rounded-3xl bg-gradient-to-br from-gold-400/15 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none duration-300" />

      {/* Glowing Frosted Glass Jewel Icon Button */}
      <div className="relative z-10 flex h-12 w-12 sm:h-14 sm:w-14 items-center justify-center rounded-2xl border border-gold-400/35 bg-gradient-to-br from-gold-500/20 via-amber-500/10 to-yellow-500/5 shadow-[inset_0_1px_1px_rgba(255,255,255,0.3),0_4px_16px_rgba(248,198,30,0.2)] transition-all duration-300 group-hover:scale-110 group-hover:border-gold-400/70 group-hover:shadow-[inset_0_1px_1px_rgba(255,255,255,0.4),0_6px_22px_rgba(248,198,30,0.35)]">
        <Icon size={22} className="text-amber-400 dark:text-[#f8c61e] transition-transform duration-300 group-hover:scale-105" />
      </div>

      {/* Label */}
      <p className="relative z-10 text-xs sm:text-sm font-bold text-slate-100 dark:text-slate-200 group-hover:text-gold-300 transition-colors leading-snug">
        {label}
      </p>
    </div>
  );
}
