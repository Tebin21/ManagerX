'use client';

function FacebookIcon({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M22 12.06C22 6.5 17.52 2 12 2S2 6.5 2 12.06c0 5 3.66 9.17 8.44 9.94v-7.03H7.9v-2.91h2.54V9.85c0-2.5 1.49-3.89 3.77-3.89 1.09 0 2.24.2 2.24.2v2.46h-1.26c-1.24 0-1.63.77-1.63 1.56v1.88h2.78l-.44 2.91h-2.34V22c4.78-.77 8.44-4.94 8.44-9.94Z" />
    </svg>
  );
}

function InstagramIcon({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden="true">
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.2" cy="6.8" r="1.1" fill="currentColor" stroke="none" />
    </svg>
  );
}

function TikTokIcon({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M16.5 2h-3.1v13.6c0 1.4-1.1 2.5-2.5 2.5a2.5 2.5 0 0 1 0-5c.3 0 .6.05.85.13v-3.2a5.7 5.7 0 0 0-.85-.06 5.7 5.7 0 1 0 5.7 5.7V8.9c1.1.8 2.45 1.27 3.9 1.27V7.1c-2.2 0-3.99-1.75-4-3.94V2Z" />
    </svg>
  );
}

function WhatsAppIcon({ size }: { size: number }) {
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
}

function buildWhatsAppUrl(whatsappNumber: string): string {
  return `https://wa.me/${whatsappNumber.replace(/\D/g, '')}`;
}

export function SocialIcons({ facebookUrl, instagramUrl, tiktokUrl, whatsappNumber }: Props) {
  const activeItems: {
    key: string;
    label: string;
    href: string;
    badgeClass: string;
    Icon: (p: { size: number }) => React.JSX.Element;
  }[] = [];

  const cleanWhatsapp = (whatsappNumber || '').trim();
  if (cleanWhatsapp) {
    activeItems.push({
      key: 'whatsapp',
      label: 'واتسئەپ (WhatsApp)',
      href: buildWhatsAppUrl(cleanWhatsapp),
      badgeClass:
        'border-emerald-500/30 bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500 hover:text-white dark:bg-emerald-950/40 dark:text-emerald-400 dark:hover:bg-emerald-600',
      Icon: WhatsAppIcon,
    });
  }

  const cleanInstagram = (instagramUrl || '').trim();
  if (cleanInstagram) {
    activeItems.push({
      key: 'instagram',
      label: 'ئینستاگرام (Instagram)',
      href: cleanInstagram,
      badgeClass:
        'border-pink-500/30 bg-pink-500/10 text-pink-600 hover:bg-gradient-to-tr hover:from-amber-500 hover:via-pink-500 hover:to-purple-500 hover:text-white dark:bg-pink-950/40 dark:text-pink-400',
      Icon: InstagramIcon,
    });
  }

  const cleanTikTok = (tiktokUrl || '').trim();
  if (cleanTikTok) {
    activeItems.push({
      key: 'tiktok',
      label: 'تیکتۆک (TikTok)',
      href: cleanTikTok,
      badgeClass:
        'border-slate-300 bg-slate-100 text-slate-800 hover:bg-black hover:text-white dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-black',
      Icon: TikTokIcon,
    });
  }

  const cleanFacebook = (facebookUrl || '').trim();
  if (cleanFacebook) {
    activeItems.push({
      key: 'facebook',
      label: 'فەیسبووک (Facebook)',
      href: cleanFacebook,
      badgeClass:
        'border-blue-500/30 bg-blue-500/10 text-blue-600 hover:bg-blue-600 hover:text-white dark:bg-blue-950/40 dark:text-blue-400',
      Icon: FacebookIcon,
    });
  }

  // Strict Rule: If no social links were provided, do not render anything!
  if (activeItems.length === 0) {
    return null;
  }

  return (
    <div className="mt-4 overflow-hidden rounded-2xl border border-slate-200/90 bg-white/90 p-3 shadow-xs backdrop-blur-md dark:border-slate-800 dark:bg-slate-850/90 sm:p-3.5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <span className="text-xs font-bold text-slate-600 dark:text-slate-300">
          تۆڕە کۆمەڵایەتییەکان:
        </span>
        <div className="flex flex-wrap items-center gap-2">
          {activeItems.map(({ key, label, href, badgeClass, Icon }) => (
            <a
              key={key}
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={label}
              className={`group flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-xs font-bold shadow-xs transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md sm:text-sm ${badgeClass}`}
            >
              <Icon size={15} />
              <span>{label}</span>
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}
