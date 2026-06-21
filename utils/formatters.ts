const IQD_OPTS: Intl.NumberFormatOptions = { minimumFractionDigits: 0, maximumFractionDigits: 0 };
const USD_OPTS: Intl.NumberFormatOptions = { minimumFractionDigits: 2, maximumFractionDigits: 2 };
const PCT_OPTS: Intl.NumberFormatOptions = { minimumFractionDigits: 1, maximumFractionDigits: 1 };

export function fmtIQD(n: number): string {
  return n.toLocaleString('en-US', IQD_OPTS);
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

export function formatDateShort(v: string | Date): string {
  return formatDate(v);
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
  return formatDate(date);
}
