import { Link } from 'react-router-dom';
import { Phone, MapPin, Facebook, Instagram, MessageCircle, ShoppingCart, Store as StoreIcon } from 'lucide-react';
import type { StoreInfo } from '../lib/api';

function digitsOnly(value: string): string {
  return value.replace(/\D/g, '');
}

function initials(name: string): string {
  return name.trim().slice(0, 1).toUpperCase() || '?';
}

interface Props {
  businessName: string;
  info: StoreInfo;
  /** Omit to hide the cart badge entirely (e.g. while cart state isn't available yet). */
  cartCount?: number;
  cartHref?: string;
}

export function StoreHeader({ businessName, info, cartCount, cartHref }: Props) {
  // No separate WhatsApp number field — the business phone doubles as the WhatsApp
  // ordering number.
  const whatsappDigits = info.phone ? digitsOnly(info.phone) : '';

  return (
    <header className="relative bg-gradient-to-br from-brand-700 via-brand-600 to-brand-500 px-6 py-10 text-white shadow-card">
      {cartHref && (
        <Link
          to={cartHref}
          className="absolute right-4 top-4 flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-2 backdrop-blur-sm transition hover:bg-white/25"
          aria-label="Cart"
        >
          <ShoppingCart size={18} />
          {!!cartCount && (
            <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-white px-1 text-xs font-bold text-brand-700">
              {cartCount}
            </span>
          )}
        </Link>
      )}
      <div className="mx-auto flex max-w-5xl flex-col items-center text-center">
        {info.logoUrl ? (
          <img
            src={info.logoUrl}
            alt={businessName}
            className="mb-3 h-20 w-20 rounded-full border-2 border-white/40 object-cover shadow-lg"
          />
        ) : (
          <div className="mb-3 flex h-20 w-20 items-center justify-center rounded-full border-2 border-white/40 bg-white/10 text-2xl font-bold shadow-lg">
            {initials(businessName) || <StoreIcon size={28} />}
          </div>
        )}

        <h1 className="text-2xl font-extrabold tracking-tight">{businessName}</h1>

        {info.description && (
          <p className="mt-2 max-w-xl text-sm text-white/85">{info.description}</p>
        )}

        <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
          {info.phone && (
            <a
              href={`tel:${info.phone}`}
              className="flex items-center gap-1.5 rounded-full bg-white/15 px-3.5 py-1.5 text-xs font-semibold backdrop-blur-sm transition hover:bg-white/25"
            >
              <Phone size={14} /> {info.phone}
            </a>
          )}
          {whatsappDigits && (
            <a
              href={`https://wa.me/${whatsappDigits}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 rounded-full bg-emerald-500 px-3.5 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-emerald-600"
            >
              <MessageCircle size={14} /> WhatsApp
            </a>
          )}
          {info.address && (
            <span className="flex items-center gap-1.5 rounded-full bg-white/15 px-3.5 py-1.5 text-xs font-semibold backdrop-blur-sm">
              <MapPin size={14} /> {info.address}
            </span>
          )}
        </div>

        {(info.facebookUrl || info.instagramUrl) && (
          <div className="mt-4 flex items-center gap-3">
            {info.facebookUrl && (
              <a
                href={info.facebookUrl}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Facebook"
                className="flex h-8 w-8 items-center justify-center rounded-full bg-white/15 transition hover:bg-white/25"
              >
                <Facebook size={16} />
              </a>
            )}
            {info.instagramUrl && (
              <a
                href={info.instagramUrl}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Instagram"
                className="flex h-8 w-8 items-center justify-center rounded-full bg-white/15 transition hover:bg-white/25"
              >
                <Instagram size={16} />
              </a>
            )}
          </div>
        )}
      </div>
    </header>
  );
}
