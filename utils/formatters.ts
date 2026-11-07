import type { Sale } from '@/types/sales';
import i18n from '@/lib/i18n';

const IQD_OPTS: Intl.NumberFormatOptions = { minimumFractionDigits: 0, maximumFractionDigits: 0 };
const USD_OPTS: Intl.NumberFormatOptions = { minimumFractionDigits: 2, maximumFractionDigits: 2 };
const PCT_OPTS: Intl.NumberFormatOptions = { minimumFractionDigits: 1, maximumFractionDigits: 1 };

export function toEnglishDigits(value: string | number | null | undefined): string {
  if (value == null) return '';
  const easternToWestern: Record<string, string> = {
    '٠': '0', '١': '1', '٢': '2', '٣': '3', '٤': '4',
    '٥': '5', '٦': '6', '٧': '7', '٨': '8', '٩': '9',
    '۰': '0', '۱': '1', '۲': '2', '۳': '3', '۴': '4',
    '۵': '5', '۶': '6', '۷': '7', '۸': '8', '۹': '9',
    '٫': '.',
    '٬': ',',
  };
  return String(value).replace(/[٠-٩۰-۹٫٬]/g, (char) => easternToWestern[char] ?? char);
}

/**
 * Sanitizes input text according to keyboardType and inputMode:
 * - 'phone-pad' / 'tel': Only digits (0-9) and optional leading '+'. Strictly disallows letters, spaces, and punctuation.
 * - 'number-pad': Pure integers (0-9). Strictly disallows letters, decimals, and punctuation.
 * - 'decimal-pad' / 'numeric' / 'decimal': Digits (0-9) and at most one decimal point ('.'). Commas are normalized to dots. Strictly disallows letters and words.
 * - 'numbers-and-punctuation': Digits (0-9) and date/time characters ('-', '/', ':', '.', ' ').
 * - Other / default: Converts Eastern Arabic/Persian digits to English ASCII without altering text/letters.
 */
export function sanitizeNumericInput(
  text: string | number | null | undefined,
  keyboardType?: string,
  inputMode?: string
): string {
  if (text == null) return '';
  const str = String(text);
  if (!str) return '';

  // 1. Convert any Eastern Arabic / Persian numerals to ASCII 0-9
  let clean = toEnglishDigits(str);

  const kb = (keyboardType || '').toLowerCase();
  const mode = (inputMode || '').toLowerCase();

  // 2. Phone numbers (digits 0-9, optional leading '+')
  if (kb === 'phone-pad' || mode === 'tel') {
    const hasLeadingPlus = clean.trim().startsWith('+');
    const digitsOnly = clean.replace(/\D/g, '');
    return hasLeadingPlus ? `+${digitsOnly}` : digitsOnly;
  }

  // 3. Integer numbers (number-pad)
  if (kb === 'number-pad') {
    return clean.replace(/\D/g, '');
  }

  // 4. Decimals, amounts, prices, currency, rates (decimal-pad, numeric)
  if (kb === 'decimal-pad' || kb === 'numeric' || mode === 'decimal' || mode === 'numeric') {
    // Normalize comma to dot
    let normalized = clean.replace(/,/g, '.');
    // Strip everything that isn't a digit or a dot
    normalized = normalized.replace(/[^\d.]/g, '');
    // Ensure only the first dot is preserved
    const firstDotIndex = normalized.indexOf('.');
    if (firstDotIndex !== -1) {
      normalized =
        normalized.slice(0, firstDotIndex + 1) +
        normalized.slice(firstDotIndex + 1).replace(/\./g, '');
    }
    return normalized;
  }

  // 5. Date & time (numbers-and-punctuation)
  if (kb === 'numbers-and-punctuation') {
    return clean.replace(/[^\d\-/:\. ]/g, '');
  }

  return clean;
}

export function fmtIQD(n: number): string {
  return toEnglishDigits(n.toLocaleString('en-US', IQD_OPTS));
}

export function fmtEnNumber(n: number | null | undefined): string {
  return toEnglishDigits(Number(n ?? 0).toLocaleString('en-US'));
}

// ─── Compact Money Display (summary/stat cards only — see CompactAmount) ──────

const COMPACT_THRESHOLD = 10_000_000;

function trimTrailingZeros(s: string): string {
  return s.replace(/\.?0+$/, '');
}

/**
 * Compacts large IQD amounts for summary/stat cards (12,500,000 -> "12.5M").
 * Below the 10M threshold returns the same full, comma-separated string as
 * fmtIQD so small/everyday values never change. Full precision is never lost
 * — callers pair this with the full fmtIQD value in a tap-to-expand affordance.
 */
export function formatCompactIQD(n: number): { text: string; isCompact: boolean } {
  const abs = Math.abs(n);
  if (abs >= 1_000_000_000) {
    return { text: toEnglishDigits(`${trimTrailingZeros((n / 1_000_000_000).toFixed(2))}B`), isCompact: true };
  }
  if (abs >= COMPACT_THRESHOLD) {
    return { text: toEnglishDigits(`${trimTrailingZeros((n / 1_000_000).toFixed(2))}M`), isCompact: true };
  }
  return { text: fmtIQD(n), isCompact: false };
}

export function formatCompactUSD(n: number): { text: string; isCompact: boolean } {
  const abs = Math.abs(n);
  if (abs >= 1_000_000_000) {
    return { text: toEnglishDigits(`${trimTrailingZeros((n / 1_000_000_000).toFixed(2))}B`), isCompact: true };
  }
  if (abs >= 1_000_000) {
    return { text: toEnglishDigits(`${trimTrailingZeros((n / 1_000_000).toFixed(2))}M`), isCompact: true };
  }
  if (abs >= 10_000) {
    return { text: toEnglishDigits(`${trimTrailingZeros((n / 1_000).toFixed(1))}K`), isCompact: true };
  }
  return { text: fmtUSD(n), isCompact: false };
}

export function fmtUSD(n: number): string {
  return toEnglishDigits(n.toLocaleString('en-US', USD_OPTS));
}

export function fmtPct(n: number): string {
  return toEnglishDigits(n.toLocaleString('en-US', PCT_OPTS));
}

export function fmtRate(n: number): string {
  return toEnglishDigits(n.toLocaleString('en-US', IQD_OPTS));
}

export function fmtExchangeRate(rate: number): string {
  return toEnglishDigits((rate * 100).toLocaleString('en-US', IQD_OPTS));
}

export function getBaseCurrency(): 'IQD' | 'USD' {
  try {
    const { useSettingsStore } = require('@/store/settingsStore');
    return useSettingsStore.getState().baseCurrency || 'IQD';
  } catch {
    return 'IQD';
  }
}

export function getExchangeRate(): number {
  try {
    const { useSettingsStore } = require('@/store/settingsStore');
    return useSettingsStore.getState().exchangeRate || 1310;
  } catch {
    return 1310;
  }
}

/**
 * Universal money formatter that automatically formats and converts amounts
 * based on baseCurrency ('IQD' or 'USD') and current exchangeRate.
 */
export function formatMoney(
  amountIQD: number,
  currencyOverride?: 'IQD' | 'USD',
  rateOverride?: number,
  includeSymbol: boolean = true
): string {
  const base = currencyOverride ?? getBaseCurrency();
  const rate = rateOverride ?? getExchangeRate();
  if (base === 'USD') {
    const val = (amountIQD || 0) / (rate || 1310);
    const str = fmtUSD(val);
    return includeSymbol ? `$${str}` : str;
  }
  const str = fmtIQD(amountIQD || 0);
  return includeSymbol ? `${str} IQD` : str;
}

export function formatMoneyValue(
  amountIQD: number,
  currencyOverride?: 'IQD' | 'USD',
  rateOverride?: number
): string {
  const base = currencyOverride ?? getBaseCurrency();
  const rate = rateOverride ?? getExchangeRate();
  if (base === 'USD') {
    return fmtUSD((amountIQD || 0) / (rate || 1310));
  }
  return fmtIQD(amountIQD || 0);
}

export function formatMoneySymbol(currencyOverride?: 'IQD' | 'USD'): string {
  const base = currencyOverride ?? getBaseCurrency();
  return base === 'USD' ? 'USD' : 'IQD';
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

export function toDateOnly(v: string | Date): string {
  if (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}/.test(v)) {
    return v.slice(0, 10);
  }
  const d = parseDateSafe(v);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function formatDate(v: string | Date | null | undefined): string {
  if (!v) return '';
  if (typeof v === 'string') {
    const clean = toEnglishDigits(v).trim();
    const m = clean.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/);
    if (m) {
      const [, y, mo, d] = m;
      return `${y}-${mo.padStart(2, '0')}-${d.padStart(2, '0')}`;
    }
  }
  const d = parseDateSafe(v);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function normalizeTimeToAmPm(t: string | null | undefined): string {
  if (!t) return '';
  let clean = toEnglishDigits(t).trim();
  clean = clean
    .replace(/(?:^|\s|\b)(ب\s*\.?\s*ن\.?|پێش\s*نیوەڕۆ|ص\.?|صباحاً|صباحا)(?:$|\s|\b)/gi, ' AM ')
    .replace(/(?:^|\s|\b)(د\s*\.?\s*ن\.?|پ\s*\.?\s*ن\.?|پاش\s*نیوەڕۆ|دوای\s*نیوەڕۆ|م\.?|مساءً|مساء)(?:$|\s|\b)/gi, ' PM ')
    .replace(/\s+/g, ' ')
    .trim();

  // If format is 24-hour like "14:30" or "09:15" without AM/PM marker
  const m24 = clean.match(/^(\d{1,2}):(\d{2})(?::\d{2})?$/);
  if (m24) {
    let h = parseInt(m24[1], 10);
    const m = m24[2];
    const period = h >= 12 ? 'PM' : 'AM';
    h = h % 12 || 12;
    return `${h}:${m} ${period}`;
  }

  return clean;
}

export function formatTime(v: string | Date | null | undefined): string {
  if (!v) return '';
  if (typeof v === 'string') {
    const trimmed = toEnglishDigits(v).trim();
    // If string is strictly a date without time (e.g. "2026-11-08"), there is no time to format
    if (/^\d{4}[-/.]\d{1,2}[-/.]\d{1,2}$/.test(trimmed)) {
      return '';
    }
    // If string has a time portion like "2026-11-07 1:29 AM", extract ONLY the time!
    const timeMatch = trimmed.match(/\b(\d{1,2}:\d{2}(?::\d{2})?\s*(?:[AP]M|ب\.?ن|پ\.?ن|د\.?ن|نیوەڕۆ|ص|م)?)\b/i);
    if (timeMatch && timeMatch[1]) {
      return normalizeTimeToAmPm(timeMatch[1]);
    }
    if (
      /AM|PM|ب\s*\.?\s*ن|پ\s*\.?\s*ن|د\s*\.?\s*ن|نیوەڕۆ|ص|م/i.test(trimmed) ||
      /^\d{1,2}:\d{2}(?::\d{2})?$/.test(trimmed)
    ) {
      return normalizeTimeToAmPm(trimmed);
    }
  }
  const formatted = parseDateSafe(v).toLocaleTimeString('en-US', {
    hour: 'numeric', minute: '2-digit', hour12: true,
  });
  return normalizeTimeToAmPm(formatted);
}

export function formatDateTime(v: string | Date): string {
  const d = parseDateSafe(v);
  return `${formatDate(d)} · ${formatTime(d)}`;
}

// UI-facing date display — "23-Jun-2026" in both languages, for visual
// consistency regardless of app language. PDF/invoice templates use
// formatDate/formatDateTime directly so their output stays fixed.
export function formatDateShort(v: string | Date): string {
  const d = parseDateSafe(v);
  const day = String(d.getDate()).padStart(2, '0');
  const month = d.toLocaleDateString('en-US', { month: 'short' });
  return `${day}-${month}-${d.getFullYear()}`;
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

export interface DateDurationBreakdown {
  years: number;
  months: number;
  days: number;
}

export function calculateDateDuration(startDate: Date, endDate: Date): DateDurationBreakdown {
  let y = endDate.getFullYear() - startDate.getFullYear();
  let m = endDate.getMonth() - startDate.getMonth();
  let d = endDate.getDate() - startDate.getDate();

  if (d < 0) {
    const prevMonthLastDay = new Date(endDate.getFullYear(), endDate.getMonth(), 0).getDate();
    d += prevMonthLastDay;
    m -= 1;
  }
  if (m < 0) {
    m += 12;
    y -= 1;
  }
  return { years: Math.max(0, y), months: Math.max(0, m), days: Math.max(0, d) };
}

function formatDurationKurdish(duration: DateDurationBreakdown): string {
  const parts: string[] = [];
  if (duration.years > 0) {
    parts.push(duration.years === 1 ? '١ ساڵ' : `\u200F${duration.years} ساڵ`);
  }
  if (duration.months > 0) {
    parts.push(duration.months === 1 ? '١ مانگ' : `\u200F${duration.months} مانگ`);
  }
  if (duration.days > 0 || parts.length === 0) {
    parts.push(`\u200F${duration.days} ڕۆژ`);
  }
  return parts.join(' و ');
}

function formatDurationArabic(duration: DateDurationBreakdown): string {
  const parts: string[] = [];
  if (duration.years > 0) {
    parts.push(duration.years === 1 ? 'سنة واحدة' : duration.years === 2 ? 'سنتان' : `${duration.years} سنوات`);
  }
  if (duration.months > 0) {
    parts.push(duration.months === 1 ? 'شهر واحد' : duration.months === 2 ? 'شهران' : `${duration.months} أشهر`);
  }
  if (duration.days > 0 || parts.length === 0) {
    parts.push(duration.days === 1 ? 'يوم واحد' : duration.days === 2 ? 'يومان' : `${duration.days} أيام`);
  }
  return parts.join(' و ');
}

function formatDurationEnglish(duration: DateDurationBreakdown): string {
  const parts: string[] = [];
  if (duration.years > 0) {
    parts.push(`${duration.years} yr${duration.years > 1 ? 's' : ''}`);
  }
  if (duration.months > 0) {
    parts.push(`${duration.months} mo${duration.months > 1 ? 's' : ''}`);
  }
  if (duration.days > 0 || parts.length === 0) {
    parts.push(`${duration.days} day${duration.days > 1 ? 's' : ''}`);
  }
  return parts.join(' and ');
}

export function formatExpiryCountdown(
  expiryInput: string | Date,
  isKuLanguage: boolean = true
): {
  text: string;
  badgeText: string;
  status: 'safe' | 'warning' | 'expired';
  daysDiff: number;
} {
  const expiry = parseDateSafe(expiryInput);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const expDay = new Date(expiry.getFullYear(), expiry.getMonth(), expiry.getDate());

  const msPerDay = 1000 * 60 * 60 * 24;
  const daysDiff = Math.round((expDay.getTime() - today.getTime()) / msPerDay);
  const lang = i18n.language || (isKuLanguage ? 'ku' : 'en');
  const isAr = lang === 'ar';
  const isKu = lang === 'ku' || (isKuLanguage && !isAr);

  if (daysDiff < 0) {
    const pastDuration = calculateDateDuration(expDay, today);
    const durStr = isAr ? formatDurationArabic(pastDuration) : isKu ? formatDurationKurdish(pastDuration) : formatDurationEnglish(pastDuration);
    return {
      text: isAr ? `منتهي الصلاحية (منذ ${durStr})` : isKu ? `\u200Fبەسەرچووە (${durStr} لەمەوپێش)` : `Expired (${durStr} ago)`,
      badgeText: isAr ? `منتهي الصلاحية` : isKu ? `بەسەرچووە` : `Expired`,
      status: 'expired',
      daysDiff,
    };
  }

  if (daysDiff === 0) {
    return {
      text: isAr ? 'ينتهي اليوم!' : isKu ? 'ئەمڕۆ بەسەردەچێت!' : 'Expires today!',
      badgeText: isAr ? 'ينتهي اليوم' : isKu ? 'ئەمڕۆ بەسەردەچێت' : 'Expires today',
      status: 'warning',
      daysDiff: 0,
    };
  }

  const futureDuration = calculateDateDuration(today, expDay);
  const durStr = isAr ? formatDurationArabic(futureDuration) : isKu ? formatDurationKurdish(futureDuration) : formatDurationEnglish(futureDuration);

  const status: 'safe' | 'warning' = daysDiff <= 30 ? 'warning' : 'safe';

  return {
    text: isAr ? `متبقي ${durStr} حتى انتهاء الصلاحية` : isKu ? `\u200F${durStr} ماوە بۆ بەسەرچوون` : `${durStr} left until expiry`,
    badgeText: isAr ? `متبقي ${durStr}` : isKu ? `\u200F${durStr} ماوە` : `${durStr} left`,
    status,
    daysDiff,
  };
}

export function formatProductionAge(
  prodInput: string | Date,
  isKuLanguage: boolean = true
): string {
  const prod = parseDateSafe(prodInput);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const prodDay = new Date(prod.getFullYear(), prod.getMonth(), prod.getDate());

  const msPerDay = 1000 * 60 * 60 * 24;
  const daysDiff = Math.round((today.getTime() - prodDay.getTime()) / msPerDay);
  const lang = i18n.language || (isKuLanguage ? 'ku' : 'en');
  const isAr = lang === 'ar';
  const isKu = lang === 'ku' || (isKuLanguage && !isAr);

  if (daysDiff === 0) {
    return isAr ? 'تم الإنتاج اليوم' : isKu ? 'ئەمڕۆ دروستکراوە' : 'Produced today';
  }
  if (daysDiff < 0) {
    const futureDuration = calculateDateDuration(today, prodDay);
    const durStr = isAr ? formatDurationArabic(futureDuration) : isKu ? formatDurationKurdish(futureDuration) : formatDurationEnglish(futureDuration);
    return isAr ? `متبقي ${durStr} حتى الإنتاج` : isKu ? `\u200F${durStr} بۆ دەرچوون` : `${durStr} until production`;
  }

  const pastDuration = calculateDateDuration(prodDay, today);
  const durStr = isAr ? formatDurationArabic(pastDuration) : isKu ? formatDurationKurdish(pastDuration) : formatDurationEnglish(pastDuration);
  return isAr ? `أُنتج منذ ${durStr}` : isKu ? `\u200F${durStr} لەمەوپێش دروستکراوە` : `Produced ${durStr} ago`;
}

export function formatShelfLife(
  prodInput: string | Date,
  expiryInput: string | Date,
  isKuLanguage: boolean = true
): string | null {
  const prod = parseDateSafe(prodInput);
  const exp = parseDateSafe(expiryInput);
  const prodDay = new Date(prod.getFullYear(), prod.getMonth(), prod.getDate());
  const expDay = new Date(exp.getFullYear(), exp.getMonth(), exp.getDate());

  if (expDay.getTime() <= prodDay.getTime()) return null;

  const lang = i18n.language || (isKuLanguage ? 'ku' : 'en');
  const isAr = lang === 'ar';
  const isKu = lang === 'ku' || (isKuLanguage && !isAr);

  const dur = calculateDateDuration(prodDay, expDay);
  const durStr = isAr ? formatDurationArabic(dur) : isKu ? formatDurationKurdish(dur) : formatDurationEnglish(dur);
  return isAr ? `مدة الصلاحية: ${durStr}` : isKu ? `\u200Fماوەی سەلاحییەت: ${durStr}` : `Shelf life: ${durStr}`;
}
