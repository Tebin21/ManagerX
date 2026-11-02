import { useTranslations } from "next-intl";
import { Container } from "@/components/ui/Container";
import {
  Award,
  Target,
  Rocket,
  Cpu,
  Sparkles,
  Zap,
  ShieldCheck,
  Layers,
} from "lucide-react";

export function About() {
  const t = useTranslations("about");

  const STATS = [
    {
      value: t("stats.years.value"),
      label: t("stats.years.label"),
      icon: Award,
    },
    {
      value: t("stats.offline.value"),
      label: t("stats.offline.label"),
      icon: ShieldCheck,
    },
    {
      value: t("stats.performance.value"),
      label: t("stats.performance.label"),
      icon: Zap,
    },
    {
      value: t("stats.allInOne.value"),
      label: t("stats.allInOne.label"),
      icon: Layers,
    },
  ];

  const PILLARS = [
    {
      key: "journey",
      title: t("pillars.journey.title"),
      desc: t("pillars.journey.desc"),
      icon: Award,
      badgeColor: "from-amber-500/20 to-yellow-500/10 border-amber-400/30 text-amber-500 dark:text-gold-300",
    },
    {
      key: "mission",
      title: t("pillars.mission.title"),
      desc: t("pillars.mission.desc"),
      icon: Target,
      badgeColor: "from-emerald-500/20 to-teal-500/10 border-emerald-400/30 text-emerald-500 dark:text-emerald-400",
    },
    {
      key: "vision",
      title: t("pillars.vision.title"),
      desc: t("pillars.vision.desc"),
      icon: Rocket,
      badgeColor: "from-blue-500/20 to-cyan-500/10 border-blue-400/30 text-blue-500 dark:text-blue-400",
    },
    {
      key: "advanced",
      title: t("pillars.advanced.title"),
      desc: t("pillars.advanced.desc"),
      icon: Cpu,
      badgeColor: "from-purple-500/20 to-indigo-500/10 border-purple-400/30 text-purple-500 dark:text-purple-300",
    },
  ];

  return (
    <section id="about" className="relative py-20 sm:py-28 lg:py-36 overflow-hidden">
      {/* Background ambient liquid glow */}
      <div
        aria-hidden="true"
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[400px] bg-amber-400/[0.04] dark:bg-amber-400/[0.03] rounded-full blur-3xl pointer-events-none"
      />

      <Container className="relative z-10">
        {/* Header Block */}
        <div className="mx-auto max-w-3xl text-center">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-gold-400/30 bg-gold-500/10 dark:bg-gold-500/[0.08] backdrop-blur-xl text-xs sm:text-sm font-bold text-amber-600 dark:text-gold-300 shadow-[inset_0_1px_1px_rgba(255,255,255,0.2)]">
            <Sparkles size={14} className="text-amber-500 dark:text-gold-400" />
            <span>{t("badge")}</span>
          </div>

          <h2 className="mt-5 text-2xl sm:text-4xl lg:text-5xl font-black tracking-tight text-ink dark:text-white leading-[1.25]">
            {t("heading")}
          </h2>

          <p className="mt-5 text-base sm:text-lg lg:text-xl text-slate-600 dark:text-slate-300 leading-relaxed font-normal">
            {t("lead")}
          </p>
        </div>

        {/* Stats Row in Frosted Glass Pills */}
        <div className="mt-12 sm:mt-16 grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 max-w-5xl mx-auto">
          {STATS.map((stat, idx) => {
            const Icon = stat.icon;
            return (
              <div
                key={idx}
                className="relative overflow-hidden rounded-2xl sm:rounded-3xl border border-white/20 dark:border-white/[0.12] bg-white/70 dark:bg-white/[0.03] backdrop-blur-2xl p-4 sm:p-5 text-center shadow-[inset_0_1px_1px_0_rgba(255,255,255,0.2),0_15px_30px_rgba(0,0,0,0.4)] transition-all hover:border-gold-400/40"
              >
                <div className="absolute inset-0 bg-gradient-to-b from-white/[0.08] via-transparent to-transparent pointer-events-none" />
                <div className="relative z-10 flex flex-col items-center">
                  <div className="flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-xl bg-gold-500/15 text-gold-500 dark:text-gold-400 border border-white/10 mb-2.5">
                    <Icon size={18} />
                  </div>
                  <span className="text-xl sm:text-3xl font-black text-amber-600 dark:text-[#f8c61e] tracking-tight">
                    {stat.value}
                  </span>
                  <span className="mt-1 text-xs sm:text-sm font-semibold text-slate-600 dark:text-slate-300">
                    {stat.label}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* 4 Core Pillars in Frosted Glass Cards (2x2 Grid) */}
        <div className="mt-8 sm:mt-10 grid grid-cols-1 md:grid-cols-2 gap-5 sm:gap-6 max-w-5xl mx-auto">
          {PILLARS.map((pillar) => {
            const Icon = pillar.icon;
            return (
              <div
                key={pillar.key}
                className="group relative overflow-hidden rounded-3xl border border-white/20 dark:border-white/[0.12] bg-white/70 dark:bg-white/[0.03] backdrop-blur-3xl p-6 sm:p-8 lg:p-9 shadow-[inset_0_1px_1px_0_rgba(255,255,255,0.25),0_20px_45px_rgba(0,0,0,0.5)] transition-all duration-300 hover:border-gold-400/40 hover:-translate-y-1"
              >
                {/* Specular glass reflection */}
                <div className="absolute inset-0 bg-gradient-to-b from-white/[0.10] via-white/[0.02] to-transparent pointer-events-none" />
                
                {/* Subtle hover gradient highlight */}
                <div className="absolute -inset-px rounded-3xl bg-gradient-to-br from-gold-400/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />

                <div className="relative z-10">
                  <div className="flex items-center gap-3.5 mb-5">
                    <div className="flex h-12 w-12 sm:h-13 sm:w-13 items-center justify-center rounded-2xl border border-white/20 bg-gradient-to-br from-white/10 to-white/[0.03] text-gold-400 shadow-[inset_0_1px_1px_rgba(255,255,255,0.25),0_4px_12px_rgba(0,0,0,0.2)]">
                      <Icon size={24} className="text-amber-500 dark:text-gold-400" />
                    </div>
                    <span className="text-xs font-bold uppercase tracking-wider text-amber-500/90 dark:text-gold-400/90 px-3 py-1 rounded-full border border-gold-400/20 bg-gold-500/10">
                      Froshiar Core
                    </span>
                  </div>

                  <h3 className="text-lg sm:text-xl lg:text-2xl font-black text-ink dark:text-white tracking-tight">
                    {pillar.title}
                  </h3>

                  <p className="mt-3.5 text-sm sm:text-base leading-relaxed text-slate-600 dark:text-slate-300 font-normal">
                    {pillar.desc}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </Container>
    </section>
  );
}
