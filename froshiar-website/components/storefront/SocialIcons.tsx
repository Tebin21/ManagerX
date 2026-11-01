'use client';

import { useState } from 'react';

function FacebookIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M22 12.06C22 6.5 17.52 2 12 2S2 6.5 2 12.06c0 5 3.66 9.17 8.44 9.94v-7.03H7.9v-2.91h2.54V9.85c0-2.5 1.49-3.89 3.77-3.89 1.09 0 2.24.2 2.24.2v2.46h-1.26c-1.24 0-1.63.77-1.63 1.56v1.88h2.78l-.44 2.91h-2.34V22c4.78-.77 8.44-4.94 8.44-9.94Z" />
    </svg>
  );
}

function InstagramIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
      <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
    </svg>
  );
}

function TikTokIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M16.5 2h-3.1v13.6c0 1.4-1.1 2.5-2.5 2.5a2.5 2.5 0 0 1 0-5c.3 0 .6.05.85.13v-3.2a5.7 5.7 0 0 0-.85-.06 5.7 5.7 0 1 0 5.7 5.7V8.9c1.1.8 2.45 1.27 3.9 1.27V7.1c-2.2 0-3.99-1.75-4-3.94V2Z" />
    </svg>
  );
}

function WhatsAppIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.35A10 10 0 1 0 12 2Zm0 18.2a8.15 8.15 0 0 1-4.16-1.14l-.3-.18-3 .8.8-2.93-.2-.3A8.2 8.2 0 1 1 12 20.2Zm4.5-6.13c-.25-.12-1.45-.72-1.68-.8-.22-.08-.39-.12-.55.13-.16.25-.63.8-.78.96-.14.16-.29.18-.54.06-.25-.12-1.04-.38-1.98-1.22-.73-.65-1.22-1.46-1.37-1.71-.14-.25-.02-.38.11-.5.11-.11.25-.29.37-.43.13-.14.17-.25.25-.4.08-.16.04-.3-.02-.43-.06-.12-.55-1.32-.75-1.81-.2-.48-.4-.41-.55-.42h-.47c-.16 0-.43.06-.65.3-.22.25-.86.84-.86 2.04 0 1.2.88 2.37 1 2.53.12.16 1.74 2.66 4.22 3.73.59.25 1.05.4 1.41.52.59.19 1.13.16 1.56.1.48-.07 1.45-.59 1.65-1.16.2-.57.2-1.06.14-1.16-.06-.1-.22-.16-.47-.28Z" />
    </svg>
  );
}

interface Props {
  facebookUrl?: string;
  instagramUrl?: string;
  tiktokUrl?: string;
  whatsappNumber?: string;
  telegramUrl?: string;
  snapchatUrl?: string;
}

function buildWhatsAppUrl(whatsappNumber: string): string {
  return `https://wa.me/${whatsappNumber.replace(/\D/g, '')}`;
}

export function SocialIcons({
  facebookUrl,
  instagramUrl,
  tiktokUrl,
  whatsappNumber,
}: Props) {
  const [activeUnavailable, setActiveUnavailable] = useState<string | null>(null);

  const cleanWhatsapp = (whatsappNumber || '').trim();
  const cleanInstagram = (instagramUrl || '').trim();
  const cleanTikTok = (tiktokUrl || '').trim();
  const cleanFacebook = (facebookUrl || '').trim();

  // Keep strictly the 4 authentic platforms: WhatsApp, Instagram, TikTok, Facebook
  const items = [
    {
      key: 'whatsapp',
      name: 'واتسئەپ',
      href: cleanWhatsapp ? buildWhatsAppUrl(cleanWhatsapp) : undefined,
      isAvailable: Boolean(cleanWhatsapp),
      activeClass:
        'border-emerald-500/40 bg-emerald-500/15 text-emerald-600 hover:bg-emerald-500 hover:text-white hover:border-emerald-500 dark:border-emerald-500/40 dark:bg-emerald-500/20 dark:text-emerald-400 dark:hover:bg-emerald-500 dark:hover:text-white',
      Icon: WhatsAppIcon,
    },
    {
      key: 'instagram',
      name: 'ئینستاگرام',
      href: cleanInstagram || undefined,
      isAvailable: Boolean(cleanInstagram),
      activeClass:
        'border-pink-500/40 bg-pink-500/15 text-pink-600 hover:bg-gradient-to-tr hover:from-amber-500 hover:via-pink-500 hover:to-purple-500 hover:text-white hover:border-transparent dark:border-pink-500/40 dark:bg-pink-500/20 dark:text-pink-400',
      Icon: InstagramIcon,
    },
    {
      key: 'tiktok',
      name: 'تیکتۆک',
      href: cleanTikTok || undefined,
      isAvailable: Boolean(cleanTikTok),
      activeClass:
        'border-slate-300 bg-slate-100 text-slate-800 hover:bg-black hover:text-white hover:border-black dark:border-slate-700 dark:bg-white/[0.08] dark:text-slate-200 dark:hover:bg-white dark:hover:text-black',
      Icon: TikTokIcon,
    },
    {
      key: 'facebook',
      name: 'فەیسبووک',
      href: cleanFacebook || undefined,
      isAvailable: Boolean(cleanFacebook),
      activeClass:
        'border-blue-500/40 bg-blue-500/15 text-blue-600 hover:bg-blue-600 hover:text-white hover:border-blue-600 dark:border-blue-500/40 dark:bg-blue-500/20 dark:text-blue-400 dark:hover:bg-blue-600 dark:hover:text-white',
      Icon: FacebookIcon,
    },
  ];

  const handleUnavailableClick = (key: string) => {
    setActiveUnavailable(key);
    setTimeout(() => {
      setActiveUnavailable((curr) => (curr === key ? null : curr));
    }, 2500);
  };

  return (
    <div className="flex flex-wrap items-center justify-center gap-2.5 sm:gap-3">
      {items.map((item) => {
        if (item.isAvailable && item.href) {
          return (
            <a
              key={item.key}
              href={item.href}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={item.name}
              title={item.name}
              className={`relative flex h-10 w-10 sm:h-11 sm:w-11 items-center justify-center rounded-full border shadow-xs transition-all duration-200 hover:scale-110 active:scale-95 cursor-pointer ${item.activeClass}`}
            >
              <item.Icon size={18} />
            </a>
          );
        }

        const isBadgeOpen = activeUnavailable === item.key;

        return (
          <div key={item.key} className="relative">
            <button
              type="button"
              onClick={() => handleUnavailableClick(item.key)}
              aria-label={`${item.name} (بەردەست نییە)`}
              title={`${item.name} (بەردەست نییە)`}
              className="relative flex h-10 w-10 sm:h-11 sm:w-11 items-center justify-center rounded-full border border-slate-200/70 bg-slate-100/60 text-slate-400 shadow-2xs backdrop-blur-sm transition-all duration-200 hover:border-amber-400/50 hover:text-amber-500 hover:scale-105 active:scale-95 cursor-pointer dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-500 dark:hover:border-amber-400/50 dark:hover:text-amber-400"
            >
              <item.Icon size={18} />
            </button>

            {/* Popup Tooltip: بەردەست نییە */}
            {isBadgeOpen && (
              <div className="absolute -top-8 left-1/2 -translate-x-1/2 z-30 pointer-events-none whitespace-nowrap rounded-lg bg-slate-900/95 px-2.5 py-1 text-[11px] font-bold text-white shadow-xl ring-1 ring-white/10 animate-in fade-in zoom-in-95 duration-150 dark:bg-slate-800 dark:text-amber-300">
                بەردەست نییە
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
