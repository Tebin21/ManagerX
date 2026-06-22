import type { InventoryProduct } from '@/types/inventory';
import { formatDate } from '@/utils/formatters';

export type PeriodKey = 'today' | 'week' | 'month' | 'year' | 'custom';

export interface PeriodBounds {
  from: Date;
  to: Date;
}

function startOfDay(d: Date): Date {
  const r = new Date(d);
  r.setHours(0, 0, 0, 0);
  return r;
}

function endOfDay(d: Date): Date {
  const r = new Date(d);
  r.setHours(23, 59, 59, 999);
  return r;
}

function startOfWeek(d: Date): Date {
  const r = startOfDay(d);
  const dow = r.getDay(); // 0 = Sun ... 6 = Sat
  const diffToMonday = dow === 0 ? 6 : dow - 1;
  r.setDate(r.getDate() - diffToMonday);
  return r;
}

function endOfWeek(d: Date): Date {
  const r = startOfWeek(d);
  r.setDate(r.getDate() + 6);
  return endOfDay(r);
}

function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1, 0, 0, 0, 0);
}

function endOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999);
}

function startOfYear(d: Date): Date {
  return new Date(d.getFullYear(), 0, 1, 0, 0, 0, 0);
}

function endOfYear(d: Date): Date {
  return new Date(d.getFullYear(), 11, 31, 23, 59, 59, 999);
}

export function getPeriodBounds(
  key: PeriodKey,
  customFrom?: string,
  customTo?: string,
): PeriodBounds {
  const now = new Date();
  switch (key) {
    case 'today':
      return { from: startOfDay(now), to: endOfDay(now) };
    case 'week':
      return { from: startOfWeek(now), to: endOfWeek(now) };
    case 'month':
      return { from: startOfMonth(now), to: endOfMonth(now) };
    case 'year':
      return { from: startOfYear(now), to: endOfYear(now) };
    case 'custom': {
      const from = customFrom ? startOfDay(new Date(customFrom)) : startOfDay(now);
      const to = customTo ? endOfDay(new Date(customTo)) : endOfDay(now);
      return { from, to };
    }
  }
}

export function formatPeriodLabel(key: PeriodKey, from: Date, to: Date): string {
  switch (key) {
    case 'today': return 'Today';
    case 'week': return 'This Week';
    case 'month': return 'This Month';
    case 'year': return 'This Year';
    case 'custom': return `${formatDate(from)} → ${formatDate(to)}`;
  }
}

export function isWithinRange(product: InventoryProduct, from: Date, to: Date): boolean {
  const raw = product.purchaseDate ?? product.createdAt;
  if (!raw) return false;
  const t = new Date(raw).getTime();
  if (isNaN(t)) return false;
  return t >= from.getTime() && t <= to.getTime();
}
