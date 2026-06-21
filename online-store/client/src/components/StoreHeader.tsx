import { Phone, MapPin, Store as StoreIcon } from 'lucide-react';
import type { StoreInfo } from '../lib/api';

function initials(name: string): string {
  return name.trim().slice(0, 1).toUpperCase() || '?';
}

interface Props {
  businessName: string;
  info: StoreInfo;
}

// Pure storefront-info display — logo, name, description, phone, address only.
// This is a catalog, not a shop: no cart, no WhatsApp ordering link here.
export function StoreHeader({ businessName, info }: Props) {
  return (
    <header className="relative bg-gradient-to-br from-brand-700 via-brand-600 to-brand-500 px-6 py-10 text-white shadow-card">
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
          {info.address && (
            <span className="flex items-center gap-1.5 rounded-full bg-white/15 px-3.5 py-1.5 text-xs font-semibold backdrop-blur-sm">
              <MapPin size={14} /> {info.address}
            </span>
          )}
        </div>
      </div>
    </header>
  );
}
