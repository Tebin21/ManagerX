'use client';

import React from 'react';
import Image from 'next/image';
import { useTranslations } from 'next-intl';
import { Sparkles, ShieldCheck, Zap, Smartphone, CheckCircle2 } from 'lucide-react';
import { Container } from '@/components/ui/Container';
import { AppDownloadButtons } from '@/components/ui/AppDownloadButtons';

export function AppDownloadSection() {
  const t = useTranslations('download');

  const highlights = [
    { title: 'خێرایی و ئاسانی لە کارکردن', desc: 'دیزاین کراوە بۆ ئەوەی هەر کەسێک بە خولەکێک فێری بێت' },
    { title: 'پشتیوانی تەواوی زمانی کوردی', desc: 'فۆنت و ڕووکاری تایبەت بە زمانی کوردی و ئینگلیزی' },
    { title: 'هاوکاتکردنی هەوری و ئۆفلاین', desc: 'بەبێ ئینتەرنێتیش بەردەوام بە لە فرۆشتن بەبێ وەستان' },
    { title: 'نوێکردنەوەی بەردەوام', desc: 'هەموو مانگێک تایبەتمەندی و باشترکردنی نوێ زیاد دەکرێت' },
  ];

  return (
    <section id="download" className="relative scroll-mt-24 py-16 sm:py-24 overflow-hidden">
      <Container>
        <div className="relative rounded-3xl sm:rounded-[2.5rem] border border-slate-200/80 dark:border-gold-500/25 bg-gradient-to-b from-white via-amber-50/30 to-white dark:from-[#111728] dark:via-[#0c101c] dark:to-[#080b14] p-6 sm:p-12 lg:p-16 shadow-2xl shadow-gold-500/5 overflow-hidden">
          
          {/* Ambient Gold Glow Blobs in Background */}
          <div className="absolute -top-32 -right-32 w-80 h-80 bg-[#D4AF37]/15 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-32 -left-32 w-80 h-80 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 flex flex-col lg:flex-row items-center justify-between gap-10 lg:gap-14">
            
            {/* Left Content */}
            <div className="flex-1 text-center lg:text-start space-y-5 sm:space-y-6 max-w-xl">
              {/* Badge */}
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#D4AF37]/15 border border-[#D4AF37]/35 text-[#D4AF37] text-xs font-extrabold shadow-sm">
                <Sparkles className="w-3.5 h-3.5" />
                <span>{t('badge')}</span>
              </div>

              {/* Title & Subtitle */}
              <div className="space-y-3">
                <h2 className="text-2xl sm:text-4xl lg:text-5xl font-black tracking-tight text-ink dark:text-white leading-tight">
                  {t('ctaHeading')}
                </h2>
                <p className="text-sm sm:text-base text-gray-600 dark:text-slate-300 leading-relaxed">
                  {t('ctaSubheading')}
                </p>
              </div>

              {/* Download Buttons */}
              <div className="pt-2 flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4">
                <AppDownloadButtons size="lg" />
              </div>

              {/* Highlights Checkmarks */}
              <div className="pt-4 grid grid-cols-1 sm:grid-cols-2 gap-3 text-start border-t border-slate-200/70 dark:border-slate-800/80">
                {highlights.map((item, idx) => (
                  <div key={idx} className="flex items-start gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                    <div>
                      <h4 className="text-xs font-bold text-ink dark:text-slate-200">{item.title}</h4>
                      <p className="text-[11px] text-gray-500 dark:text-slate-400 mt-0.5">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Right: Phone Visual Mockup / Logo Display */}
            <div className="relative shrink-0 flex items-center justify-center">
              <div className="relative w-64 h-64 sm:w-80 sm:h-80 rounded-3xl bg-gradient-to-tr from-[#D4AF37]/20 via-[#D4AF37]/10 to-transparent p-6 border border-[#D4AF37]/30 flex flex-col items-center justify-center text-center shadow-2xl backdrop-blur-md">
                <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-3xl bg-gradient-to-tr from-[#D4AF37] to-[#B8860B] p-4 shadow-xl shadow-[#D4AF37]/30 flex items-center justify-center mb-4">
                  <Image
                    src="/images/logo.png"
                    alt="Froshiar App"
                    width={80}
                    height={80}
                    className="object-contain"
                  />
                </div>
                <h3 className="text-lg font-black text-ink dark:text-white">فرۆشیار - Froshiar</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">ئەپی فەرمی بەڕێوەبردنی فرۆشگا</p>
                <div className="mt-3 px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-500 text-[11px] font-bold">
                  وەشانی نوێ لە هەردوو ستۆر لایڤە
                </div>
              </div>
            </div>

          </div>
        </div>
      </Container>
    </section>
  );
}
