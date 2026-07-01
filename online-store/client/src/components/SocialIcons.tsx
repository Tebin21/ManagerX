import { useState } from 'react';
import { Toast } from './Toast';

// Shown when a given icon is clicked but the business hasn't configured that
// platform yet -- icons always render regardless of data, only the click
// behavior differs (real link vs. this fallback).
const PLACEHOLDER_MESSAGE = 'This social media account is not available yet.';

// Minimal single-path brand glyphs, fill set to currentColor so they inherit
// the header's white text color exactly like the existing Phone/MapPin lucide
// icons. Hand-approximated for this local-preview pass, not official brand
// assets -- swap for verified marks (e.g. Simple Icons) before any real use.
function FacebookIcon({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M22 12.06C22 6.5 17.52 2 12 2S2 6.5 2 12.06c0 5 3.66 9.17 8.44 9.94v-7.03H7.9v-2.91h2.54V9.85c0-2.5 1.49-3.89 3.77-3.89 1.09 0 2.24.2 2.24.2v2.46h-1.26c-1.24 0-1.63.77-1.63 1.56v1.88h2.78l-.44 2.91h-2.34V22c4.78-.77 8.44-4.94 8.44-9.94Z" />
    </svg>
  );
}

function InstagramIcon({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} aria-hidden="true">
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

type IconKey = 'facebook' | 'instagram' | 'tiktok' | 'whatsapp';

const ICONS: { key: IconKey; label: string; Icon: (p: { size: number }) => JSX.Element }[] = [
  { key: 'facebook', label: 'Facebook', Icon: FacebookIcon },
  { key: 'instagram', label: 'Instagram', Icon: InstagramIcon },
  { key: 'tiktok', label: 'TikTok', Icon: TikTokIcon },
  { key: 'whatsapp', label: 'WhatsApp', Icon: WhatsAppIcon },
];

interface Props {
  facebookUrl?: string;
  instagramUrl?: string;
  tiktokUrl?: string;
  whatsappNumber?: string;
}

// Strips every non-digit character so "+964 770 123 4567" and
// "964-770-123-4567" both resolve the same way. Does NOT invent a missing
// country code -- that's a data-entry concern the settings screen's
// placeholder now warns against, not something this helper can fix after
// the fact.
function buildWhatsAppUrl(whatsappNumber: string): string {
  return `https://wa.me/${whatsappNumber.replace(/\D/g, '')}`;
}

export function SocialIcons({ facebookUrl, instagramUrl, tiktokUrl, whatsappNumber }: Props) {
  const [toastKey, setToastKey] = useState(0); // bump to re-trigger/restart the toast's auto-dismiss

  function hrefFor(key: IconKey): string | null {
    switch (key) {
      case 'facebook':  return facebookUrl?.trim() || null;
      case 'instagram': return instagramUrl?.trim() || null;
      case 'tiktok':    return tiktokUrl?.trim() || null;
      case 'whatsapp':  return whatsappNumber?.trim() ? buildWhatsAppUrl(whatsappNumber.trim()) : null;
    }
  }

  return (
    <>
      <div className="mt-3 flex items-center justify-center gap-2">
        {ICONS.map(({ key, label, Icon }) => {
          const href = hrefFor(key);
          const className = "flex h-9 w-9 items-center justify-center rounded-full bg-white/15 backdrop-blur-sm transition hover:bg-white/25";
          return href ? (
            <a
              key={key}
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={label}
              className={className}
            >
              <Icon size={16} />
            </a>
          ) : (
            <button
              key={key}
              type="button"
              aria-label={label}
              onClick={() => setToastKey((k) => k + 1)}
              className={className}
            >
              <Icon size={16} />
            </button>
          );
        })}
      </div>
      {toastKey > 0 && <Toast key={toastKey} message={PLACEHOLDER_MESSAGE} />}
    </>
  );
}
