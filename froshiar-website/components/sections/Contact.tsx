"use client";

import { motion, useReducedMotion } from "framer-motion";
import { Globe, Phone } from "lucide-react";
import { useTranslations } from "next-intl";
import { Container } from "@/components/ui/Container";
import { SectionHeading } from "@/components/ui/SectionHeading";

export function Contact() {
  const t = useTranslations("contact");
  const shouldReduceMotion = useReducedMotion();

  const items = [
    {
      id: "instagram",
      href: "https://www.instagram.com/froshiar.krd/",
      target: "_blank",
      rel: "noreferrer noopener",
      ariaLabel: "Instagram: @froshiar.krd",
      tooltipText: "@froshiar.krd",
      dotColor: "bg-[#e1306c] shadow-[0_0_8px_#e1306c]",
      auraGradient: "from-[#f09433] via-[#dc2743] to-[#bc1888]",
      cardGradient: "from-[#f09433] via-[#dc2743] to-[#bc1888]",
      cardShadow:
        "shadow-[inset_0_1.5px_2px_rgba(255,255,255,0.55),inset_0_-2px_4px_rgba(0,0,0,0.35),0_14px_35px_rgba(220,39,67,0.45)]",
      floatDuration: 3.6,
      floatDelay: 0,
      floatY: [0, -10, 0],
      rotateRange: [-1.5, 1.5, -1.5],
      icon: (
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-9 w-9 text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.35)] transition-transform duration-300 group-hover:scale-110 sm:h-11 sm:w-11"
          aria-hidden="true"
        >
          <rect width="20" height="20" x="2" y="2" rx="5.5" ry="5.5" />
          <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
          <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
        </svg>
      ),
    },
    {
      id: "phone",
      href: "tel:+9647708229696",
      target: undefined,
      rel: undefined,
      ariaLabel: "Phone: 0770 822 9696",
      tooltipText: "0770 822 9696",
      dotColor: "bg-emerald-400 shadow-[0_0_8px_#34d399]",
      auraGradient: "from-emerald-500 via-teal-400 to-green-500",
      cardGradient: "from-emerald-600 via-emerald-500 to-teal-400",
      cardShadow:
        "shadow-[inset_0_1.5px_2px_rgba(255,255,255,0.55),inset_0_-2px_4px_rgba(0,0,0,0.35),0_14px_35px_rgba(16,185,129,0.45)]",
      floatDuration: 4.2,
      floatDelay: 0.35,
      floatY: [0, -14, 0],
      rotateRange: [1.5, -1.5, 1.5],
      icon: (
        <Phone
          className="h-8 w-8 text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.35)] transition-transform duration-300 group-hover:scale-110 sm:h-10 sm:w-10"
          aria-hidden="true"
        />
      ),
    },
    {
      id: "website",
      href: "https://froshiar.store",
      target: "_blank",
      rel: "noreferrer noopener",
      ariaLabel: "Website: froshiar.store",
      tooltipText: "froshiar.store",
      dotColor: "bg-gold-400 shadow-[0_0_8px_#f59e0b]",
      auraGradient: "from-amber-400 via-gold-500 to-yellow-300",
      cardGradient: "from-amber-600 via-gold-500 to-amber-300",
      cardShadow:
        "shadow-[inset_0_1.5px_2px_rgba(255,255,255,0.55),inset_0_-2px_4px_rgba(0,0,0,0.35),0_14px_35px_rgba(245,158,11,0.45)]",
      floatDuration: 3.8,
      floatDelay: 0.7,
      floatY: [0, -10, 0],
      rotateRange: [-1.5, 1.5, -1.5],
      icon: (
        <Globe
          className="h-8 w-8 text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.35)] transition-transform duration-300 group-hover:scale-110 sm:h-10 sm:w-10"
          aria-hidden="true"
        />
      ),
    },
  ];

  return (
    <section id="contact" className="relative overflow-visible py-16 sm:py-24 lg:py-32">
      <Container>
        <SectionHeading title={t("heading")} />

        <div className="relative mx-auto mt-14 flex items-center justify-center gap-7 sm:gap-12 md:gap-16">
          {items.map((item) => (
            <div key={item.id} className="relative flex flex-col items-center">
              <motion.a
                href={item.href}
                target={item.target}
                rel={item.rel}
                aria-label={item.ariaLabel}
                className="group relative flex items-center justify-center focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-gold-400/50 rounded-[24px] sm:rounded-[28px]"
                animate={
                  shouldReduceMotion
                    ? undefined
                    : {
                        y: item.floatY,
                        rotate: item.rotateRange,
                      }
                }
                transition={
                  shouldReduceMotion
                    ? undefined
                    : {
                        duration: item.floatDuration,
                        repeat: Infinity,
                        ease: "easeInOut",
                        delay: item.floatDelay,
                      }
                }
                whileHover={{ scale: 1.15, y: -8 }}
                whileTap={{ scale: 0.93 }}
              >
                {/* Ambient Breathing Glowing Aura Disk */}
                <motion.div
                  className={`absolute -inset-3.5 rounded-full bg-gradient-to-tr ${item.auraGradient} blur-2xl opacity-40 group-hover:opacity-90 transition-opacity duration-500 -z-10 pointer-events-none`}
                  animate={
                    shouldReduceMotion
                      ? undefined
                      : {
                          scale: [0.9, 1.15, 0.9],
                          opacity: [0.35, 0.65, 0.35],
                        }
                  }
                  transition={
                    shouldReduceMotion
                      ? undefined
                      : {
                          duration: item.floatDuration,
                          repeat: Infinity,
                          ease: "easeInOut",
                          delay: item.floatDelay,
                        }
                  }
                />

                {/* Primary Glass Jewel Squircle */}
                <div
                  className={`relative flex h-20 w-20 sm:h-24 sm:w-24 items-center justify-center rounded-[24px] sm:rounded-[28px] overflow-hidden bg-gradient-to-tr ${item.cardGradient} ${item.cardShadow} border border-white/30 backdrop-blur-2xl transition-all duration-300`}
                >
                  {/* Frosted Glass Specular Top Highlight */}
                  <div className="absolute inset-0 bg-gradient-to-b from-white/40 via-white/5 to-transparent pointer-events-none" />

                  {/* Inner Refraction Ring */}
                  <div className="absolute inset-[1px] rounded-[23px] sm:rounded-[27px] border border-white/25 pointer-events-none" />

                  {/* Icon Glyphs */}
                  <div className="relative z-10 flex items-center justify-center">
                    {item.icon}
                  </div>
                </div>

                {/* Elegant Floating Hover/Focus Tooltip Pill */}
                <div className="pointer-events-none absolute -bottom-12 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100 transition-all duration-300 transform translate-y-1 group-hover:translate-y-0 z-30">
                  <div className="flex items-center gap-2 rounded-full border border-white/20 bg-slate-900/90 backdrop-blur-xl px-3.5 py-1.5 shadow-[0_8px_24px_rgba(0,0,0,0.5)] whitespace-nowrap">
                    <span className={`h-2 w-2 rounded-full ${item.dotColor}`} />
                    <span
                      dir={item.id === "phone" ? "ltr" : undefined}
                      className="text-xs font-semibold text-white tracking-wide"
                    >
                      {item.tooltipText}
                    </span>
                  </div>
                </div>
              </motion.a>
            </div>
          ))}
        </div>
      </Container>
    </section>
  );
}
