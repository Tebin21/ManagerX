"use client";

import { Check, CreditCard, Sparkles, Phone, MessageCircle, ShieldCheck } from "lucide-react";
import { useTranslations } from "next-intl";
import { Container } from "@/components/ui/Container";
import { SectionHeading } from "@/components/ui/SectionHeading";

export function Pricing() {
  const t = useTranslations("pricing");

  const plans = [
    {
      key: "monthly",
      name: t("monthly.name"),
      price: t("monthly.price"),
      currency: t("monthly.currency"),
      desc: t("monthly.desc"),
      features: [
        t("monthly.features.0"),
        t("monthly.features.1"),
        t("monthly.features.2"),
        t("monthly.features.3"),
      ],
      isPopular: false,
    },
    {
      key: "yearly",
      name: t("yearly.name"),
      badge: t("yearly.badge"),
      price: t("yearly.price"),
      currency: t("yearly.currency"),
      desc: t("yearly.desc"),
      features: [
        t("yearly.features.0"),
        t("yearly.features.1"),
        t("yearly.features.2"),
        t("yearly.features.3"),
        t("yearly.features.4"),
      ],
      isPopular: true,
    },
    {
      key: "lifetime",
      name: t("lifetime.name"),
      price: t("lifetime.price"),
      currency: t("lifetime.currency"),
      desc: t("lifetime.desc"),
      features: [
        t("lifetime.features.0"),
        t("lifetime.features.1"),
        t("lifetime.features.2"),
        t("lifetime.features.3"),
      ],
      isPopular: false,
    },
  ];

  return (
    <section id="pricing" className="relative scroll-mt-24 py-16 sm:py-24 lg:py-32">
      <div id="payment" className="absolute -top-24" />
      <Container>
        <div className="mx-auto max-w-3xl text-center">
          <div className="inline-flex items-center gap-1.5 rounded-full border border-gold-300/60 bg-gold-50/80 px-3.5 py-1 text-xs font-bold text-gold-700 shadow-2xs dark:border-gold-800/40 dark:bg-gold-950/40 dark:text-gold-300">
            <Sparkles size={13} className="text-gold-500" />
            <span>{t("monthly.name")} • {t("yearly.name")} • {t("lifetime.name")}</span>
          </div>
          <h2 className="mt-4 text-3xl font-bold tracking-tight text-ink sm:text-4xl lg:text-5xl">
            {t("heading")}
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-base text-gray-500 sm:text-lg dark:text-gray-400">
            {t("subheading")}
          </p>
        </div>

        {/* Pricing Cards Grid */}
        <div className="mt-14 grid grid-cols-1 gap-6 sm:gap-8 lg:grid-cols-3 lg:items-stretch">
          {plans.map((plan) => (
            <div
              key={plan.key}
              className={`relative flex flex-col justify-between rounded-3xl p-7 sm:p-8 transition-all duration-300 ${
                plan.isPopular
                  ? "border-2 border-gold-500 bg-white shadow-xl shadow-gold-500/10 dark:bg-[#1a160d] dark:shadow-gold-500/5 lg:-translate-y-2"
                  : "border border-gray-100 bg-white/70 shadow-sm hover:shadow-md dark:border-gold-900/30 dark:bg-white/[0.03]"
              }`}
            >
              {plan.isPopular && (
                <div className="absolute -top-3.5 start-1/2 -translate-x-1/2 rtl:translate-x-1/2">
                  <span className="rounded-full bg-gradient-to-r from-gold-500 to-amber-500 px-3.5 py-1 text-xs font-bold text-ink-fixed shadow-md">
                    {plan.badge}
                  </span>
                </div>
              )}

              <div>
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-bold text-ink">{plan.name}</h3>
                  {plan.isPopular && (
                    <Sparkles className="h-5 w-5 text-gold-500" />
                  )}
                </div>
                <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">{plan.desc}</p>

                <div className="mt-6 flex items-baseline gap-1.5">
                  <span className="text-3xl font-extrabold tracking-tight text-ink sm:text-4xl">
                    {plan.price}
                  </span>
                  <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
                    {plan.currency}
                  </span>
                </div>

                <div className="mt-7 space-y-3 border-t border-gray-100 pt-6 dark:border-gold-900/30">
                  {plan.features.map((feature, i) => (
                    <div key={i} className="flex items-start gap-2.5 text-xs sm:text-sm text-gray-600 dark:text-gray-300">
                      <div className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-gold-100 text-gold-700 dark:bg-gold-900/50 dark:text-gold-300">
                        <Check size={11} strokeWidth={3} />
                      </div>
                      <span>{feature}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-8 pt-4">
                <a
                  href={`https://wa.me/9647708229696?text=${encodeURIComponent(
                    `سڵاو، دەمەوێت بەشداری بکەم لە پاکجی (${plan.name}) بۆ فرۆشیار`
                  )}`}
                  target="_blank"
                  rel="noreferrer noopener"
                  className={`flex w-full items-center justify-center gap-2 rounded-2xl py-3 text-sm font-bold transition-all ${
                    plan.isPopular
                      ? "bg-gradient-to-r from-gold-500 to-amber-500 text-ink-fixed shadow-md shadow-gold-500/20 hover:from-gold-400 hover:to-amber-400"
                      : "border border-gray-200 bg-gray-50 text-ink hover:bg-gray-100 dark:border-gold-900/50 dark:bg-white/[0.05] dark:text-white dark:hover:bg-white/[0.1]"
                  }`}
                >
                  <CreditCard size={16} />
                  <span>{t("requestBtn")}</span>
                </a>
              </div>
            </div>
          ))}
        </div>

        {/* Payment Methods Card */}
        <div className="mx-auto mt-12 max-w-4xl rounded-3xl border border-gold-200/80 bg-gradient-to-b from-gold-50/50 to-white p-7 shadow-sm dark:border-gold-900/40 dark:from-white/[0.03] dark:to-white/[0.01] sm:p-9">
          <div className="flex flex-col items-center gap-6 text-center sm:flex-row sm:items-start sm:text-start">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gold-100 text-gold-700 shadow-xs dark:bg-gold-900/40 dark:text-gold-300">
              <ShieldCheck size={28} />
            </div>

            <div className="flex-1">
              <h3 className="text-lg font-bold text-ink sm:text-xl">{t("methodsTitle")}</h3>
              <p className="mt-1 text-xs sm:text-sm text-gray-500 dark:text-gray-400">
                {t("methodsDesc")}
              </p>

              <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div className="rounded-xl border border-gray-200/80 bg-white p-3.5 shadow-2xs dark:border-gold-900/40 dark:bg-white/[0.03]">
                  <p className="text-xs font-bold text-ink">{t("fastpay")}</p>
                  <p dir="ltr" className="mt-1 font-mono text-sm font-semibold text-gold-600 dark:text-gold-400">
                    {t("accountNumber")}
                  </p>
                </div>
                <div className="rounded-xl border border-gray-200/80 bg-white p-3.5 shadow-2xs dark:border-gold-900/40 dark:bg-white/[0.03]">
                  <p className="text-xs font-bold text-ink">{t("fib")}</p>
                  <p dir="ltr" className="mt-1 font-mono text-sm font-semibold text-gold-600 dark:text-gold-400">
                    {t("accountNumber")}
                  </p>
                </div>
                <div className="rounded-xl border border-gray-200/80 bg-white p-3.5 shadow-2xs dark:border-gold-900/40 dark:bg-white/[0.03]">
                  <p className="text-xs font-bold text-ink">{t("zaincash")}</p>
                  <p dir="ltr" className="mt-1 font-mono text-sm font-semibold text-gold-600 dark:text-gold-400">
                    {t("accountNumber")}
                  </p>
                </div>
              </div>

              <div className="mt-6 flex flex-wrap items-center gap-3">
                <a
                  href={`https://wa.me/9647708229696?text=${encodeURIComponent(
                    "سڵاو، وەسڵی پارەدانم ئامادەیە بۆ فرۆشیار تکایە کارام بۆ بکەن."
                  )}`}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-xs sm:text-sm font-bold text-white shadow-xs hover:bg-emerald-500 transition-all"
                >
                  <MessageCircle size={16} />
                  <span>{t("whatsappBtn")}</span>
                </a>

                <a
                  href="tel:+9647708229696"
                  className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-xs sm:text-sm font-semibold text-ink shadow-2xs hover:bg-gray-50 dark:border-gold-900/50 dark:bg-white/[0.05] dark:text-white dark:hover:bg-white/[0.1] transition-all"
                >
                  <Phone size={15} />
                  <span dir="ltr">0770 822 9696</span>
                </a>

                <span className="text-xs text-gray-400 dark:text-gray-500">
                  {t("accountHolder")}
                </span>
              </div>
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
}
