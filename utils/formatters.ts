import type { Sale } from '@/types/sales';
import i18n from '@/lib/i18n';

const IQD_OPTS: Intl.NumberFormatOptions = { minimumFractionDigits: 0, maximumFractionDigits: 0 };
const USD_OPTS: Intl.NumberFormatOptions = { minimumFractionDigits: 2, maximumFractionDigits: 2 };
const PCT_OPTS: Intl.NumberFormatOptions = { minimumFractionDigits: 1, maximumFractionDigits: 1 };

export function fmtIQD(n: number): string {
  return n.toLocaleString('en-US', IQD_OPTS);
}

// ─── Compact Money Display (summary/stat cards only — see CompactAmount) ──────

const COMPACT_THRESHOLD = 1_000_000;

function trimTrailingZeros(s: string): string {
  return s.replace(/\.?0+$/, '');
}

/**
 * Compacts large IQD amounts for summary/stat cards (3,980,000 -> "3.98M").
 * Below the 1M threshold returns the same full, comma-separated string as
 * fmtIQD so small values never change. Full precision is never lost — callers
 * pair this with the full fmtIQD value in a tap-to-expand affordance.
 */
export function formatCompactIQD(n: number): { text: string; isCompact: boolean } {
  const abs = Math.abs(n);
  if (abs >= 1_000_000_000) {
    return { text: `${trimTrailingZeros((n / 1_000_000_000).toFixed(2))}B`, isCompact: true };
  }
  if (abs >= COMPACT_THRESHOLD) {
    return { text: `${trimTrailingZeros((n / 1_000_000).toFixed(2))}M`, isCompact: true };
  }
  return { text: fmtIQD(n), isCompact: false };
}

export function fmtUSD(n: number): string {
  return n.toLocaleString('en-US', USD_OPTS);
}

export function fmtPct(n: number): string {
  return n.toLocaleString('en-US', PCT_OPTS);
}

export function fmtRate(n: number): string {
  return n.toLocaleString('en-US', IQD_OPTS);
}

export function fmtExchangeRate(rate: number): string {
  return (rate * 100).toLocaleString('en-US', IQD_OPTS);
}

// ─── Payment Status ───────────────────────────────────────────────────────────

export type PaymentStatus = 'paid' | 'partial' | 'unpaid';

export function getPaymentStatus(
  sale: Pick<Sale, 'paymentMethod' | 'paidAmount' | 'remainingDebt'>
): PaymentStatus {
  if (sale.paymentMethod !== 'debt') return 'paid';
  if (sale.remainingDebt <= 0) return 'paid';
  if (sale.paidAmount > 0) return 'partial';
  return 'unpaid';
}

export const PAYMENT_STATUS_LABEL: Record<PaymentStatus, string> = {
  paid: 'Paid',
  partial: 'Partial',
  unpaid: 'Unpaid',
};

// ─── Date / Time Utilities ────────────────────────────────────────────────────

function parseDateSafe(v: string | Date): Date {
  if (v instanceof Date) return v;
  const d = new Date(v);
  if (isNaN(d.getTime())) {
    console.warn('[formatters] unparseable date value:', v);
    return new Date();
  }
  return d;
}

export function nowISO(): string {
  return new Date().toISOString();
}

export function toDateOnly(v: string | Date): string {
  return parseDateSafe(v).toISOString().slice(0, 10);
}

export function toDateTimeISO(d: Date): string {
  return d.toISOString();
}

export function formatDate(v: string | Date): string {
  return parseDateSafe(v).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  });
}

export function formatTime(v: string | Date): string {
  return parseDateSafe(v).toLocaleTimeString('en-US', {
    hour: 'numeric', minute: '2-digit', hour12: true,
  });
}

export function formatDateTime(v: string | Date): string {
  const d = parseDateSafe(v);
  return `${formatDate(d)} · ${formatTime(d)}`;
}

// UI-facing date display — locale-aware (English: "Jun 22, 2026", Kurdish:
// "22-Jun-2026"). PDF/invoice templates use formatDate/formatDateTime
// directly so their output stays fixed regardless of app language.
export function formatDateShort(v: string | Date): string {
  const d = parseDateSafe(v);
  if (i18n.language === 'ku') {
    const day = String(d.getDate()).padStart(2, '0');
    const month = d.toLocaleDateString('en-US', { month: 'short' });
    return `${day}-${month}-${d.getFullYear()}`;
  }
  return formatDate(d);
}

export function formatDateTimeUI(v: string | Date): string {
  const d = parseDateSafe(v);
  return `${formatDateShort(d)} · ${formatTime(d)}`;
}

export function formatRelativeTime(v: string | Date): string {
  const date = parseDateSafe(v);
  const diffSec = Math.floor((Date.now() - date.getTime()) / 1000);

  if (diffSec < 10) return 'Just now';
  if (diffSec < 60) return `${diffSec} seconds ago`;
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin} minute${diffMin === 1 ? '' : 's'} ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr} hour${diffHr === 1 ? '' : 's'} ago`;
  const diffDay = Math.floor(diffHr / 24);
  if (diffDay < 7) return `${diffDay} day${diffDay === 1 ? '' : 's'} ago`;
  return formatDateShort(date);
}
