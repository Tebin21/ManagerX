import type { DashboardOverviewStats, DashboardActivityItem } from '@/lib/sqlite';
import { fmtIQD, fmtUSD, fmtEnNumber, formatDate as fmtDate, formatTime, toEnglishDigits } from '@/utils/formatters';
import { KURDISH_FONT_FACE, PDF_BRAND_NAME, PDF_BRAND_WEBSITE, pdfDevelopedByText, isKurdishPdfActive } from '@/lib/pdfFont';
import { useSettingsStore } from '@/store/settingsStore';
import { useLanguageStore } from '@/store/languageStore';
import i18n from '@/lib/i18n';
import { escHtml, sanitizeImageUri } from '@/lib/security';

export type DashboardReportLang = 'ku' | 'ar' | 'en';

interface BusinessInfo {
  name: string;
  phone: string;
  address: string;
  logoUri: string | null;
}

type TranslateFn = (kuText: string, arText: string, enText: string) => string;

interface StatCardOptions {
  label: string;
  pillText: string;
  pillBg: string;
  pillColor: string;
  valueHtml: string;
  unit?: string;
  valueColor?: string;
  bgColor?: string;
  borderColor?: string;
  accentTopColor?: string;
  accentSideColor?: string;
  largeValue?: boolean;
  dir: 'rtl' | 'ltr';
}

function resolveReportLanguage(
  dirArg: 'ltr' | 'rtl',
  langOverride?: DashboardReportLang
): DashboardReportLang {
  if (langOverride) return langOverride;
  const storeLang = useLanguageStore.getState().language;
  const active = storeLang || i18n.language || (dirArg === 'rtl' || isKurdishPdfActive() ? 'ku' : 'en');
  if (active === 'ar') return 'ar';
  if (active === 'en') return 'en';
  return 'ku';
}

function activityBadge(
  type: DashboardActivityItem['type'],
  tr: TranslateFn,
  rtlText: (s: string) => string
): string {
  const map: Record<string, { bg: string; color: string; border: string; label: string }> = {
    sale: {
      bg: '#ECFDF5',
      color: '#047857',
      border: '#A7F3D0',
      label: tr('فرۆشتن', 'بيع', 'Sale'),
    },
    purchase: {
      bg: '#F5F3FF',
      color: '#6D28D9',
      border: '#DDD6FE',
      label: tr('کڕین', 'شراء', 'Purchase'),
    },
    customer_debt: {
      bg: '#F0FDFA',
      color: '#0F766E',
      border: '#99F6E4',
      label: tr('وەرگرتنی قەرز', 'تحصيل دين', 'Debt Collected'),
    },
    supplier_debt: {
      bg: '#FFF7ED',
      color: '#C2410C',
      border: '#FFEDD5',
      label: tr('دانەوەی قەرز', 'سداد دين', 'Debt Paid'),
    },
    expense: {
      bg: '#FFF1F2',
      color: '#BE123C',
      border: '#FECDD3',
      label: tr('مەسروفات', 'مصروفات', 'Expense'),
    },
    customer: {
      bg: '#EFF6FF',
      color: '#1D4ED8',
      border: '#BFDBFE',
      label: tr('کڕیاری نوێ', 'زبون جديد', 'New Customer'),
    },
    supplier: {
      bg: '#EEF2FF',
      color: '#4338CA',
      border: '#C7D2FE',
      label: tr('دابینکەری نوێ', 'مورد جديد', 'New Supplier'),
    },
    capital_deposit: {
      bg: '#FEF9C3',
      color: '#854D0E',
      border: '#FDE047',
      label: tr('پارەدانان بۆ دەخیلە', 'إيداع في الصندوق', 'Till Deposit'),
    },
    capital_withdraw: {
      bg: '#FEF2F2',
      color: '#B91C1C',
      border: '#FECACA',
      label: tr('ڕاکێشانی دەخیلە', 'سحب من الصندوق', 'Till Withdrawal'),
    },
  };

  const entry = map[type];
  if (!entry) {
    return `<span class="badge-pill" style="background:#F1F5F9;color:#475569;border-color:#CBD5E1;">${escHtml(type)}</span>`;
  }
  return `<span class="badge-pill" style="background:${entry.bg};color:${entry.color};border-color:${entry.border};">${rtlText(escHtml(entry.label))}</span>`;
}

function formatActivityTitleForReport(act: DashboardActivityItem, tr: TranslateFn): string {
  const hashMatch = (act.title || '').match(/#\s*([0-9a-zA-Z_-]+)/);
  const codeMatch = (act.title || '').match(/\b([A-Za-z]+-\d+)\b/);
  const ref = act.referenceNumber || (codeMatch ? codeMatch[1] : hashMatch ? hashMatch[1] : '');

  switch (act.type) {
    case 'sale': {
      const displayRef = ref
        ? (ref.includes('-') ? ref : `#${ref}`)
        : toEnglishDigits(act.title.replace(/^[^#]*#?/, '')).trim();
      return tr(`پسوولەی ${displayRef}`, `فاتورة ${displayRef}`, `Invoice ${displayRef}`).trim();
    }
    case 'purchase': {
      const displayRef = ref
        ? (ref.includes('-') ? ref : `#${ref}`)
        : toEnglishDigits(act.title.replace(/^[^#]*#?/, '')).trim();
      return tr(`کڕین ${displayRef}`, `شراء ${displayRef}`, `Purchase ${displayRef}`).trim();
    }
    case 'customer_debt':
      return tr('وەرگرتنی قەرز', 'تحصيل دين', 'Debt Collected');
    case 'supplier_debt':
      return tr('دانەوەی قەرز', 'سداد دين', 'Debt Paid');
    case 'expense':
      return tr('مەسروفات', 'مصروفات', 'Expense');
    case 'customer':
      return tr('کڕیاری نوێ', 'زبون جديد', 'New Customer');
    case 'supplier':
      return tr('دابینکەری نوێ', 'مورد جديد', 'New Supplier');
    case 'capital_deposit':
      return tr('پارەدانان بۆ دەخیلە', 'إيداع في الصندوق', 'Till Deposit');
    case 'capital_withdraw':
      return tr('ڕاکێشانی دەخیلە', 'سحب من الصندوق', 'Till Withdrawal');
    default:
      return toEnglishDigits(act.title);
  }
}

function formatActivitySubtitleForReport(act: DashboardActivityItem, tr: TranslateFn): string {
  if (!act.subtitle) return '';
  const sub = act.subtitle.trim();
  if (sub === 'کڕیاری گشتی' || sub === 'عميل عام' || sub === 'General Customer') {
    return tr('کڕیاری گشتی', 'عميل عام', 'General Customer');
  }
  if (sub === 'کڕینی کاڵا' || sub === 'شراء بضاعة' || sub === 'General Purchase') {
    return tr('کڕینی کاڵا', 'شراء بضاعة', 'General Purchase');
  }
  if (sub === 'کڕیار' || sub === 'زبون' || sub === 'الزبون' || sub === 'Customer') {
    return tr('کڕیار', 'الزبون', 'Customer');
  }
  if (sub === 'دابینکەر' || sub === 'مورد' || sub === 'المورد' || sub === 'Supplier') {
    return tr('دابینکەر', 'المورد', 'Supplier');
  }
  return toEnglishDigits(act.subtitle);
}

function renderStatCard(opts: StatCardOptions): string {
  const inlineStyles: string[] = [];
  if (opts.bgColor) inlineStyles.push(`background:${opts.bgColor}`);
  if (opts.borderColor) inlineStyles.push(`border-color:${opts.borderColor}`);
  if (opts.accentTopColor) inlineStyles.push(`border-top:3px solid ${opts.accentTopColor}`);
  if (opts.accentSideColor) {
    const side = opts.dir === 'rtl' ? 'border-right' : 'border-left';
    inlineStyles.push(`${side}:4px solid ${opts.accentSideColor}`);
  }

  return `
    <div class="card"${inlineStyles.length ? ` style="${inlineStyles.join(';')}"` : ''}>
      <div class="card-top">
        <span class="card-label">${opts.label}</span>
        <span class="card-pill" style="background:${opts.pillBg};color:${opts.pillColor};">${opts.pillText}</span>
      </div>
      <div class="card-val-wrap" dir="ltr" style="justify-content:${opts.dir === 'rtl' ? 'flex-end' : 'flex-start'};">
        <span class="card-val en-num${opts.largeValue ? ' card-val-lg' : ''}" dir="ltr" style="color:${opts.valueColor || '#0F172A'};">${opts.valueHtml}</span>
        ${opts.unit ? `<span class="card-unit">${escHtml(opts.unit)}</span>` : ''}
      </div>
    </div>
  `;
}

/**
 * Generates an A4-ready, responsive HTML document for the Dashboard PDF report
 * supporting Kurdish (ku), Arabic (ar), and English (en).
 */
export function buildDashboardReportHTML(
  rawStats: DashboardOverviewStats,
  activities: DashboardActivityItem[],
  periodLabel: string,
  business: BusinessInfo,
  dir: 'ltr' | 'rtl' = 'rtl',
  langOverride?: DashboardReportLang
): string {
  const stats: DashboardOverviewStats = {
    totalRevenue: rawStats?.totalRevenue ?? 0,
    totalSales: rawStats?.totalSales ?? 0,
    totalInvoices: rawStats?.totalInvoices ?? 0,
    totalPurchasesCost: rawStats?.totalPurchasesCost ?? 0,
    totalPurchasesCount: rawStats?.totalPurchasesCount ?? 0,
    expectedProfit: rawStats?.expectedProfit ?? 0,
    totalDiscount: rawStats?.totalDiscount ?? 0,
    totalExpenses: rawStats?.totalExpenses ?? 0,
    totalCustomers: rawStats?.totalCustomers ?? 0,
    totalSuppliers: rawStats?.totalSuppliers ?? 0,
    totalItems: rawStats?.totalItems ?? 0,
    lowStockCount: rawStats?.lowStockCount ?? 0,
    customerDebtTotal: rawStats?.customerDebtTotal ?? 0,
    supplierDebtTotal: rawStats?.supplierDebtTotal ?? 0,
    totalBatchesCount: rawStats?.totalBatchesCount ?? 0,
    activeBatchesCount: rawStats?.activeBatchesCount ?? 0,
    depletedBatchesCount: rawStats?.depletedBatchesCount ?? 0,
    multiBatchProductsCount: rawStats?.multiBatchProductsCount ?? 0,
    expiringBatchesCount: rawStats?.expiringBatchesCount ?? 0,
    totalInstallmentSales: rawStats?.totalInstallmentSales ?? 0,
    totalInstallmentCollected: rawStats?.totalInstallmentCollected ?? 0,
    totalInstallmentRemaining: rawStats?.totalInstallmentRemaining ?? 0,
    activeInstallmentAccounts: rawStats?.activeInstallmentAccounts ?? 0,
    totalInstallmentAccounts: rawStats?.totalInstallmentAccounts ?? 0,
  };

  const lang = resolveReportLanguage(dir, langOverride);
  const isAr = lang === 'ar';
  const isKu = lang === 'ku';
  const isRtl = isAr || isKu;
  const effectiveDir: 'rtl' | 'ltr' = isRtl ? 'rtl' : 'ltr';
  const tr: TranslateFn = (kuText, arText, enText) => (isAr ? arText : isKu ? kuText : enText);

  // Explicit bidi-isolated RTL span using our resolved report language rather than global state
  const rtlText = (html: string): string =>
    isRtl && html && !html.includes('ku-text')
      ? `<span class="ku-text" dir="rtl">${html}</span>`
      : html;

  const baseCurrency = useSettingsStore.getState().baseCurrency || 'IQD';
  const rate = useSettingsStore.getState().exchangeRate || 1310;
  const isUsd = baseCurrency === 'USD';
  const curUnit = isUsd ? 'USD' : 'IQD';

  const fmtMoneyVal = (val: number): string => {
    const num = Number(val) || 0;
    if (!isUsd) return fmtIQD(num);
    const sign = num < 0 ? '-' : '';
    return `${sign}$${fmtUSD(Math.abs(num) / rate)}`;
  };
  const fmtMoney = (val: number): string =>
    isUsd ? fmtMoneyVal(val) : `${fmtMoneyVal(val)}&nbsp;IQD`;

  const now = new Date();
  const dateStr = fmtDate(now.toISOString());
  const timeStr = formatTime(now);
  const reportId = `DBR-${now.toISOString().slice(0, 10).replace(/-/g, '')}-${Math.random().toString(16).slice(2, 6).toUpperCase()}`;

  const safeLogoUri = sanitizeImageUri(business.logoUri);
  const monogram = escHtml((business.name || 'F').trim().charAt(0).toUpperCase() || 'F');
  const logoHTML = safeLogoUri
    ? `<img src="${safeLogoUri}" class="biz-logo" alt="logo" />`
    : `<div class="biz-logo-mono">${monogram}</div>`;

  const alignStart = isRtl ? 'right' : 'left';
  const alignEnd = isRtl ? 'left' : 'right';
  const profitColor = stats.expectedProfit >= 0 ? '#059669' : '#DC2626';

  const showInstallments =
    stats.totalInstallmentSales > 0 ||
    stats.totalInstallmentCollected > 0 ||
    stats.totalInstallmentRemaining > 0 ||
    stats.activeInstallmentAccounts > 0;

  const activitiesRowsHTML =
    activities.length === 0
      ? `<tr><td colspan="6" style="text-align:center;color:#94A3B8;padding:24px;font-style:italic;">${rtlText(tr('هیچ چالاکییەک لەم ماوەیەدا تۆمار نەکراوە', 'لم يتم تسجيل أي نشاط خلال هذه الفترة', 'No activities recorded for this period'))}</td></tr>`
      : activities
          .map((act, idx) => {
            const sign =
              act.type === 'sale' || act.type === 'customer_debt' || act.type === 'capital_deposit'
                ? '+'
                : act.type === 'purchase' ||
                  act.type === 'supplier_debt' ||
                  act.type === 'expense' ||
                  act.type === 'capital_withdraw'
                ? '-'
                : '';

            const amountColor = sign === '+' ? '#059669' : sign === '-' ? '#DC2626' : '#0F172A';
            const amountDisplay =
              act.amount > 0
                ? `<span class="en-num" dir="ltr" style="font-weight:700;color:${amountColor};">${sign}${fmtMoney(act.amount)}</span>`
                : '<span style="color:#94A3B8;">&mdash;</span>';

            const discountDisplay =
              act.discount && act.discount > 0
                ? `<span class="en-num" dir="ltr" style="color:#7C3AED;font-size:10.5px;font-weight:700;">${fmtMoney(act.discount)}</span>`
                : '<span style="color:#94A3B8;">&mdash;</span>';

            const actDate = act.timestamp ? fmtDate(act.timestamp) : '';
            const rowTitle = escHtml(toEnglishDigits(formatActivityTitleForReport(act, tr)));
            const rowSubtitle = act.subtitle ? escHtml(formatActivitySubtitleForReport(act, tr)) : '';

            return `
              <tr style="background:${idx % 2 === 0 ? '#FFFFFF' : '#F8FAFC'};">
                <td class="col-idx"><span class="en-num" dir="ltr">${idx + 1}</span></td>
                <td class="col-type">${activityBadge(act.type, tr, rtlText)}</td>
                <td class="col-desc" style="text-align:${alignStart};">
                  <div class="act-title">${rtlText(rowTitle)}</div>
                  ${rowSubtitle ? `<div class="act-sub">${rtlText(rowSubtitle)}</div>` : ''}
                </td>
                <td class="col-num" style="text-align:${alignEnd};">${amountDisplay}</td>
                <td class="col-num" style="text-align:${alignEnd};">${discountDisplay}</td>
                <td class="col-date"><span class="en-num" dir="ltr">${actDate}</span></td>
              </tr>
            `;
          })
          .join('');

  const developedByStr = langOverride
    ? `${i18n.t('common.developedBy', { lng: lang })} ${PDF_BRAND_NAME}`
    : pdfDevelopedByText();

  const fontStack = isRtl
    ? `'Bahij Janna', 'SF Pro Arabic', 'Geeza Pro', 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif`
    : `'Inter', 'Bahij Janna', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif`;

  return `<!DOCTYPE html>
<html lang="${lang}" dir="${effectiveDir}">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1.0"/>
<title>${escHtml(tr('ڕاپۆرتی داشبۆرد', 'تقرير لوحة التحكم', 'Dashboard Report'))} &mdash; ${escHtml(business.name)}</title>
<style>
  ${KURDISH_FONT_FACE}

  @page {
    size: A4 portrait;
    margin: 10mm 10mm;
  }

  * {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
    -webkit-print-color-adjust: exact !important;
    print-color-adjust: exact !important;
  }

  html, body {
    width: 100%;
    max-width: 100%;
    overflow-x: hidden;
    direction: ${effectiveDir};
    font-family: ${fontStack};
    background: #F1F5F9;
    color: #0F172A;
    font-size: 12px;
    line-height: 1.45;
  }

  .ku-text {
    font-family: 'Bahij Janna', 'SF Pro Arabic', 'Geeza Pro', sans-serif !important;
    direction: rtl;
    unicode-bidi: isolate;
    font-weight: inherit;
    letter-spacing: normal;
  }

  .en-num, .font-mono, [dir="ltr"] {
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif !important;
    direction: ltr !important;
    unicode-bidi: isolate !important;
  }

  .page {
    width: 100%;
    max-width: 820px;
    margin: 0 auto;
    background: #FFFFFF;
    padding: 24px 26px;
    border-radius: 12px;
    overflow-x: hidden;
  }

  /* ── Executive Header ── */
  .top-gold-bar {
    height: 5px;
    background: linear-gradient(90deg, #D4AF37 0%, #F59E0B 50%, #B48A1E 100%);
    border-radius: 4px;
    margin-bottom: 16px;
  }

  .header-box {
    display: flex;
    flex-wrap: wrap;
    justify-content: space-between;
    align-items: flex-start;
    gap: 14px;
    background: #F8FAFC;
    border: 1px solid #E2E8F0;
    border-radius: 12px;
    padding: 14px 16px;
    margin-bottom: 18px;
    page-break-inside: avoid;
    break-inside: avoid;
  }

  .biz-block {
    display: flex;
    align-items: center;
    gap: 12px;
    flex: 1 1 230px;
    min-width: 0;
  }

  .biz-logo {
    width: 50px;
    height: 50px;
    border-radius: 10px;
    object-fit: contain;
    background: #FFFFFF;
    padding: 3px;
    border: 1px solid #E2E8F0;
    flex-shrink: 0;
  }

  .biz-logo-mono {
    width: 50px;
    height: 50px;
    border-radius: 10px;
    background: #0F172A;
    color: #D4AF37;
    font-size: 20px;
    font-weight: 800;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }

  .biz-info {
    min-width: 0;
    flex: 1;
  }

  .biz-name {
    font-size: 17px;
    font-weight: 800;
    color: #0F172A;
    margin-bottom: 3px;
    overflow-wrap: break-word;
    word-break: break-word;
  }

  .biz-meta {
    font-size: 11px;
    color: #475569;
    line-height: 1.5;
    overflow-wrap: break-word;
  }

  .report-title-box {
    flex: 0 1 auto;
    min-width: 195px;
    text-align: ${alignEnd};
  }

  .report-main-title {
    font-size: 18px;
    font-weight: 800;
    color: #0F172A;
    margin-bottom: 5px;
  }

  .report-accent-pill {
    display: inline-block;
    background: #FEF3C7;
    color: #92400E;
    border: 1px solid #F59E0B;
    padding: 2px 10px;
    border-radius: 999px;
    font-size: 11px;
    font-weight: 700;
    margin-bottom: 5px;
  }

  .report-meta-row {
    display: flex;
    justify-content: ${isRtl ? 'flex-end' : 'flex-end'};
    align-items: baseline;
    gap: 5px;
    font-size: 10.5px;
    color: #64748B;
    line-height: 1.5;
    flex-direction: ${isRtl ? 'row' : 'row'};
  }

  /* ── Section Headings ── */
  .section-heading {
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: 6px;
    margin-top: 16px;
    margin-bottom: 10px;
    padding-bottom: 5px;
    border-bottom: 2px solid #E2E8F0;
    page-break-after: avoid;
    break-after: avoid;
  }

  .section-title {
    font-size: 13.5px;
    font-weight: 800;
    color: #0F172A;
  }

  .section-tag {
    font-size: 10px;
    font-weight: 600;
    color: #64748B;
  }

  /* ── Responsive Metric Grids (always minmax(0, 1fr) so tracks never blow out) ── */
  .cards-grid-3 {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 9px;
    margin-bottom: 10px;
  }

  .cards-grid-4 {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 9px;
    margin-bottom: 10px;
  }

  .cards-grid-2 {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 10px;
    margin-bottom: 10px;
  }

  .card {
    background: #F8FAFC;
    border: 1px solid #E2E8F0;
    border-radius: 10px;
    padding: 10px 11px;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    min-width: 0;
    page-break-inside: avoid;
    break-inside: avoid;
  }

  .card-top {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 6px;
    margin-bottom: 6px;
  }

  .card-label {
    font-size: 10.5px;
    font-weight: 600;
    color: #475569;
    line-height: 1.35;
    min-width: 0;
    overflow-wrap: break-word;
  }

  .card-pill {
    font-size: 9px;
    font-weight: 700;
    padding: 1px 6px;
    border-radius: 5px;
    white-space: nowrap;
    flex-shrink: 0;
  }

  .card-val-wrap {
    display: flex;
    align-items: baseline;
    flex-wrap: wrap;
    gap: 4px;
    min-width: 0;
  }

  .card-val {
    font-size: 14.5px;
    font-weight: 800;
    letter-spacing: -0.3px;
    line-height: 1.2;
    overflow-wrap: break-word;
  }

  .card-val-lg {
    font-size: 16px;
  }

  .card-unit {
    font-size: 9.5px;
    color: #64748B;
    font-weight: 600;
  }

  /* ── Activity Table ── */
  .table-wrap {
    width: 100%;
    border: 1px solid #E2E8F0;
    border-radius: 10px;
    overflow-x: auto;
    margin-top: 8px;
  }

  .styled-table {
    width: 100%;
    border-collapse: collapse;
    table-layout: auto;
    page-break-inside: auto;
    break-inside: auto;
  }

  .styled-table thead {
    display: table-header-group;
  }

  .styled-table tr {
    page-break-inside: avoid;
    break-inside: avoid;
  }

  .styled-table th {
    background: #0F172A;
    color: #F8FAFC;
    font-size: 10.5px;
    font-weight: 700;
    padding: 8px 8px;
    white-space: nowrap;
  }

  .styled-table td {
    padding: 7px 8px;
    border-bottom: 1px solid #E2E8F0;
    font-size: 11px;
    vertical-align: middle;
  }

  .styled-table tbody tr:last-child td {
    border-bottom: none;
  }

  .col-idx {
    width: 32px;
    text-align: center;
    color: #64748B;
    font-size: 10px;
  }

  .col-type {
    text-align: center;
    white-space: nowrap;
  }

  .col-desc {
    min-width: 120px;
    overflow-wrap: break-word;
    word-break: break-word;
  }

  .col-num {
    white-space: nowrap;
  }

  .col-date {
    white-space: nowrap;
    text-align: center;
    font-size: 10.5px;
    color: #475569;
  }

  .badge-pill {
    display: inline-block;
    padding: 2px 7px;
    border-radius: 5px;
    border: 1px solid transparent;
    font-size: 10px;
    font-weight: 700;
    white-space: nowrap;
  }

  .act-title {
    font-weight: 700;
    color: #0F172A;
    line-height: 1.35;
  }

  .act-sub {
    font-size: 10px;
    color: #64748B;
    margin-top: 1px;
    line-height: 1.3;
  }

  /* ── Signatures & Footer ── */
  .footer-signatures {
    margin-top: 24px;
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 24px;
    padding-top: 12px;
    page-break-inside: avoid;
    break-inside: avoid;
  }

  .sig-block {
    background: #F8FAFC;
    border: 1px solid #E2E8F0;
    border-radius: 10px;
    padding: 12px 14px;
    text-align: center;
  }

  .sig-label {
    font-size: 11px;
    font-weight: 700;
    color: #475569;
    margin-bottom: 24px;
  }

  .sig-line {
    border-top: 1px dashed #94A3B8;
    padding-top: 5px;
    font-size: 10.5px;
    color: #0F172A;
    font-weight: 600;
  }

  .bottom-brand {
    margin-top: 18px;
    text-align: center;
    font-size: 10px;
    color: #64748B;
    border-top: 1px solid #E2E8F0;
    padding-top: 10px;
    page-break-inside: avoid;
    break-inside: avoid;
  }

  /* ── Responsive Breakpoints (Mobile screens & narrower print widths) ── */
  @media (max-width: 600px) {
    .page {
      padding: 14px 12px;
      border-radius: 0;
    }
    .report-title-box {
      width: 100%;
      min-width: 0;
      text-align: ${alignStart};
    }
    .report-meta-row {
      justify-content: flex-start;
    }
    .cards-grid-4 {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
    .cards-grid-3 {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
    .styled-table th,
    .styled-table td {
      padding: 6px 5px;
      font-size: 10px;
    }
  }

  @media (max-width: 500px) {
    .col-idx {
      display: none;
    }
    .col-desc {
      min-width: 0;
      width: auto;
    }
    .styled-table th,
    .styled-table td {
      padding: 5px 4px;
      font-size: 9.5px;
      white-space: normal;
    }
    .col-type,
    .col-num,
    .col-date {
      white-space: normal;
      font-size: 9px;
    }
    .badge-pill {
      white-space: normal;
      font-size: 8.5px;
      padding: 2px 5px;
      line-height: 1.2;
    }
    .card-val {
      font-size: 13px;
    }
    .card-val-lg {
      font-size: 14px;
    }
  }

  @media (max-width: 400px) {
    .cards-grid-2,
    .footer-signatures {
      grid-template-columns: 1fr;
    }
  }

  /* ── Print Overrides ── */
  @media print {
    html, body {
      background: #FFFFFF !important;
      width: 100% !important;
      overflow: visible !important;
    }
    .page {
      max-width: 100% !important;
      width: 100% !important;
      padding: 0 !important;
      margin: 0 !important;
      border-radius: 0 !important;
      overflow: visible !important;
    }
    .table-wrap {
      overflow: visible !important;
      border-radius: 6px !important;
    }
    .styled-table th {
      font-size: 10px !important;
      padding: 7px 6px !important;
    }
    .styled-table td {
      font-size: 10.5px !important;
      padding: 6px 6px !important;
    }
  }
</style>
</head>
<body>
<div class="page">
  <div class="top-gold-bar"></div>

  <!-- Header Info -->
  <div class="header-box">
    <div class="biz-block">
      ${logoHTML}
      <div class="biz-info">
        <div class="biz-name">${rtlText(escHtml(business.name || tr('فرۆشگاکەم', 'متجري', 'My Store')))}</div>
        <div class="biz-meta">
          ${business.phone ? `<div>${rtlText(tr('مۆبایل:', 'الهاتف:', 'Phone:'))} <span class="en-num" dir="ltr">${escHtml(toEnglishDigits(business.phone))}</span></div>` : ''}
          ${business.address ? `<div>${rtlText(tr('ناونیشان:', 'العنوان:', 'Address:'))} ${rtlText(escHtml(business.address))}</div>` : ''}
        </div>
      </div>
    </div>

    <div class="report-title-box">
      <div class="report-main-title">${rtlText(tr('ڕاپۆرتی داشبۆرد', 'تقرير لوحة التحكم', 'Dashboard Report'))}</div>
      <div>
        <span class="report-accent-pill">${rtlText(tr('ماوە:', 'الفترة:', 'Period:'))} ${rtlText(escHtml(periodLabel))}</span>
      </div>
      <div class="report-meta-row">
        <span>${rtlText(tr('بەروار:', 'التاريخ:', 'Date:'))}</span>
        <span class="en-num" dir="ltr">${dateStr} &bull; ${timeStr}</span>
      </div>
      <div class="report-meta-row">
        <span>${rtlText(tr('ژمارەی ڕاپۆرت:', 'رقم التقرير:', 'Report ID:'))}</span>
        <span class="en-num" dir="ltr">${reportId}</span>
      </div>
    </div>
  </div>

  <!-- SECTION 1: Financial & Profit Overview (6 balanced cards) -->
  <div class="section-heading">
    <span class="section-title">${rtlText(tr('١. پوختەی داهات و دارایی', '١. الملخص المالي والأرباح', '1. Financial & Profit Overview'))}</span>
    <span class="section-tag">${rtlText(tr('داهات، فرۆشتن، کڕین، خەرجی، قازانج', 'الإيرادات، المبيعات، المشتريات، المصروفات، الأرباح', 'Revenue, Sales, Purchases, Expenses, Net Profit'))}</span>
  </div>
  <div class="cards-grid-3">
    ${renderStatCard({
      label: rtlText(tr('کۆی داهات', 'إجمالي الإيرادات', 'Total Revenue')),
      pillText: curUnit,
      pillBg: '#DCFCE7',
      pillColor: '#15803D',
      valueHtml: fmtMoneyVal(stats.totalRevenue),
      unit: curUnit,
      valueColor: '#059669',
      bgColor: '#F0FDF4',
      borderColor: '#BBF7D0',
      accentTopColor: '#10B981',
      dir: effectiveDir,
    })}
    ${renderStatCard({
      label: rtlText(tr('کۆی فرۆشتنەکان', 'إجمالي المبيعات', 'Total Sales')),
      pillText: curUnit,
      pillBg: '#CFFAFE',
      pillColor: '#0E7490',
      valueHtml: fmtMoneyVal(stats.totalSales),
      unit: curUnit,
      valueColor: '#0891B2',
      bgColor: '#ECFEFF',
      borderColor: '#A5F3FC',
      accentTopColor: '#06B6D4',
      dir: effectiveDir,
    })}
    ${renderStatCard({
      label: rtlText(tr('قازانجی چاوەڕوانکراو', 'صافي الربح المتوقع', 'Expected Net Profit')),
      pillText: rtlText(stats.expectedProfit >= 0 ? tr('قازانج', 'ربح', 'Profit') : tr('زەرەر', 'خسارة', 'Loss')),
      pillBg: stats.expectedProfit >= 0 ? '#D1FAE5' : '#FEE2E2',
      pillColor: profitColor,
      valueHtml: fmtMoneyVal(stats.expectedProfit),
      unit: curUnit,
      valueColor: profitColor,
      bgColor: stats.expectedProfit >= 0 ? '#ECFDF5' : '#FEF2F2',
      borderColor: stats.expectedProfit >= 0 ? '#A7F3D0' : '#FECACA',
      accentTopColor: profitColor,
      dir: effectiveDir,
    })}
    ${renderStatCard({
      label: rtlText(tr('کۆی بەهای کڕین', 'إجمالي المشتريات', 'Purchases Cost')),
      pillText: curUnit,
      pillBg: '#E0E7FF',
      pillColor: '#4338CA',
      valueHtml: fmtMoneyVal(stats.totalPurchasesCost),
      unit: curUnit,
      valueColor: '#4F46E5',
      bgColor: '#EEF2FF',
      borderColor: '#C7D2FE',
      accentTopColor: '#6366F1',
      dir: effectiveDir,
    })}
    ${renderStatCard({
      label: rtlText(tr('کۆی خەرجییەکان', 'إجمالي المصروفات', 'Operating Expenses')),
      pillText: curUnit,
      pillBg: '#FFE4E6',
      pillColor: '#BE123C',
      valueHtml: fmtMoneyVal(stats.totalExpenses),
      unit: curUnit,
      valueColor: '#E11D48',
      bgColor: '#FFF1F2',
      borderColor: '#FECDD3',
      accentTopColor: '#E11D48',
      dir: effectiveDir,
    })}
    ${renderStatCard({
      label: rtlText(tr('کۆی داشکاندن', 'إجمالي الخصومات', 'Total Discounts')),
      pillText: curUnit,
      pillBg: '#F3E8FF',
      pillColor: '#7E22CE',
      valueHtml: fmtMoneyVal(stats.totalDiscount),
      unit: curUnit,
      valueColor: '#7C3AED',
      bgColor: '#FAF5FF',
      borderColor: '#E9D5FF',
      accentTopColor: '#8B5CF6',
      dir: effectiveDir,
    })}
  </div>

  <!-- SECTION 2: Store, Inventory & Batches (8 count cards + 2 alert cards) -->
  <div class="section-heading">
    <span class="section-title">${rtlText(tr('٢. ئامار و ژماردنی فرۆشگا و کۆگا', '٢. إحصائيات المتجر والمخزون', '2. Store, Inventory & Batches'))}</span>
    <span class="section-tag">${rtlText(tr('پسوولە، کڕیار، دابینکەر، کاڵا، وەجبەکان', 'الفواتير، الزبائن، الموردون، المواد، الوجبات', 'Invoices, Clients, Suppliers, Stock, Batches'))}</span>
  </div>
  <div class="cards-grid-4">
    ${renderStatCard({
      label: rtlText(tr('کۆی پسوولەکان', 'إجمالي الفواتير', 'Invoices')),
      pillText: '#',
      pillBg: '#E2E8F0',
      pillColor: '#334155',
      valueHtml: fmtEnNumber(stats.totalInvoices),
      valueColor: '#0F172A',
      dir: effectiveDir,
    })}
    ${renderStatCard({
      label: rtlText(tr('کۆی کڕیاران', 'إجمالي الزبائن', 'Customers')),
      pillText: '#',
      pillBg: '#FEF3C7',
      pillColor: '#B45309',
      valueHtml: fmtEnNumber(stats.totalCustomers),
      valueColor: '#D97706',
      dir: effectiveDir,
    })}
    ${renderStatCard({
      label: rtlText(tr('کۆی دابینکەران', 'إجمالي الموردين', 'Suppliers')),
      pillText: '#',
      pillBg: '#CCFBF1',
      pillColor: '#0F766E',
      valueHtml: fmtEnNumber(stats.totalSuppliers),
      valueColor: '#0D9488',
      dir: effectiveDir,
    })}
    ${renderStatCard({
      label: rtlText(tr('کۆی کاڵاکان', 'إجمالي المواد', 'Products')),
      pillText: '#',
      pillBg: '#FCE7F3',
      pillColor: '#BE185D',
      valueHtml: fmtEnNumber(stats.totalItems),
      valueColor: '#DB2777',
      dir: effectiveDir,
    })}
    ${renderStatCard({
      label: rtlText(tr('کۆی وەجبەکان', 'إجمالي الوجبات', 'Total Batches')),
      pillText: '#',
      pillBg: '#E0E7FF',
      pillColor: '#4338CA',
      valueHtml: fmtEnNumber(stats.totalBatchesCount),
      valueColor: '#4F46E5',
      bgColor: '#F5F7FF',
      borderColor: '#C7D2FE',
      dir: effectiveDir,
    })}
    ${renderStatCard({
      label: rtlText(tr('وەجبە بەردەستەکان', 'الوجبات المتوفرة', 'In-Stock Batches')),
      pillText: '#',
      pillBg: '#DCFCE7',
      pillColor: '#15803D',
      valueHtml: fmtEnNumber(stats.activeBatchesCount),
      valueColor: '#059669',
      bgColor: '#F0FDF4',
      borderColor: '#BBF7D0',
      dir: effectiveDir,
    })}
    ${renderStatCard({
      label: rtlText(tr('وەجبە تەواوبووەکان', 'الوجبات المنتهية', 'Sold-Out Batches')),
      pillText: '#',
      pillBg: '#E2E8F0',
      pillColor: '#334155',
      valueHtml: fmtEnNumber(stats.depletedBatchesCount),
      valueColor: '#475569',
      dir: effectiveDir,
    })}
    ${renderStatCard({
      label: rtlText(tr('کاڵا فرە-وەجبەکان', 'متعددة الوجبات', 'Multi-Batch Items')),
      pillText: '#',
      pillBg: '#FEF08A',
      pillColor: '#854D0E',
      valueHtml: fmtEnNumber(stats.multiBatchProductsCount),
      valueColor: '#D97706',
      bgColor: '#FEFCE8',
      borderColor: '#FDE68A',
      dir: effectiveDir,
    })}
  </div>

  <!-- Alerts Row (2 balanced cards) -->
  <div class="cards-grid-2">
    ${renderStatCard({
      label: rtlText(tr('کەمیی کاڵا (ئاگاداری کۆگا)', 'تنبيه نقص المخزون', 'Low Stock Alerts')),
      pillText: rtlText(stats.lowStockCount > 0 ? tr('ئاگاداری', 'تنبيه', 'Alert') : tr('باشە', 'جيد', 'OK')),
      pillBg: stats.lowStockCount > 0 ? '#FEE2E2' : '#DCFCE7',
      pillColor: stats.lowStockCount > 0 ? '#B91C1C' : '#15803D',
      valueHtml: fmtEnNumber(stats.lowStockCount),
      valueColor: stats.lowStockCount > 0 ? '#DC2626' : '#059669',
      bgColor: stats.lowStockCount > 0 ? '#FEF2F2' : '#F8FAFC',
      borderColor: stats.lowStockCount > 0 ? '#FECACA' : '#E2E8F0',
      dir: effectiveDir,
    })}
    ${renderStatCard({
      label: rtlText(tr('وەجبەی نزیک بەسەرچوون (٣٠ ڕۆژ)', 'وجبات قريبة الانتهاء (٣٠ يوم)', 'Expiring Batches (30d)')),
      pillText: rtlText(stats.expiringBatchesCount > 0 ? tr('نزیک بەسەرچوون', 'قريب الانتهاء', 'Expiring') : tr('باشە', 'جيد', 'OK')),
      pillBg: stats.expiringBatchesCount > 0 ? '#FEF3C7' : '#DCFCE7',
      pillColor: stats.expiringBatchesCount > 0 ? '#B45309' : '#15803D',
      valueHtml: fmtEnNumber(stats.expiringBatchesCount),
      valueColor: stats.expiringBatchesCount > 0 ? '#D97706' : '#059669',
      bgColor: stats.expiringBatchesCount > 0 ? '#FFFBEB' : '#F8FAFC',
      borderColor: stats.expiringBatchesCount > 0 ? '#FDE68A' : '#E2E8F0',
      dir: effectiveDir,
    })}
  </div>

  <!-- SECTION 3: Debts & Installments -->
  <div class="section-heading">
    <span class="section-title">${rtlText(tr('٣. باڵانسی قەرز و قیستەکان', '٣. أرصدة الديون والأقساط', '3. Debts, Receivables & Installments'))}</span>
    <span class="section-tag">${rtlText(tr('لای کڕیاران vs سەرشان', 'ديون عند الزبائن مقابل المستحق للموردين', 'Receivables vs Payables'))}</span>
  </div>
  <div class="cards-grid-2">
    ${renderStatCard({
      label: rtlText(tr('قەرزی لای کڕیاران (شایستەی وەرگرتن)', 'ديون الزبائن (مستحقة للتحصيل)', 'Customer Receivables (Owed to You)')),
      pillText: rtlText(tr('لای کڕیار', 'عند الزبون', 'Receivables')),
      pillBg: '#FFEDD5',
      pillColor: '#C2410C',
      valueHtml: fmtMoneyVal(stats.customerDebtTotal),
      unit: curUnit,
      valueColor: '#C2410C',
      bgColor: '#FFF7ED',
      borderColor: '#FED7AA',
      accentSideColor: '#EA580C',
      largeValue: true,
      dir: effectiveDir,
    })}
    ${renderStatCard({
      label: rtlText(tr('قەرزی سەرشان بۆ دابینکەران', 'الديون المستحقة للموردين', 'Supplier Payables (Debts You Owe)')),
      pillText: rtlText(tr('قەرزی سەرشان', 'للموردين', 'Payables')),
      pillBg: '#FEE2E2',
      pillColor: '#B91C1C',
      valueHtml: fmtMoneyVal(stats.supplierDebtTotal),
      unit: curUnit,
      valueColor: '#DC2626',
      bgColor: '#FEF2F2',
      borderColor: '#FECACA',
      accentSideColor: '#DC2626',
      largeValue: true,
      dir: effectiveDir,
    })}
  </div>

  ${
    showInstallments
      ? `<div class="cards-grid-4">
          ${renderStatCard({
            label: rtlText(tr('کۆی فرۆشتنی قیست', 'مبيعات الأقساط', 'Installment Sales')),
            pillText: curUnit,
            pillBg: '#E0E7FF',
            pillColor: '#4338CA',
            valueHtml: fmtMoneyVal(stats.totalInstallmentSales),
            unit: curUnit,
            valueColor: '#4F46E5',
            bgColor: '#EEF2FF',
            borderColor: '#C7D2FE',
            dir: effectiveDir,
          })}
          ${renderStatCard({
            label: rtlText(tr('قیستی وەرگیراو', 'الأقساط المستلمة', 'Collected')),
            pillText: curUnit,
            pillBg: '#D1FAE5',
            pillColor: '#047857',
            valueHtml: fmtMoneyVal(stats.totalInstallmentCollected),
            unit: curUnit,
            valueColor: '#059669',
            bgColor: '#ECFDF5',
            borderColor: '#A7F3D0',
            dir: effectiveDir,
          })}
          ${renderStatCard({
            label: rtlText(tr('قەرزی ماوەی قیست', 'الأقساط المتبقية', 'Remaining')),
            pillText: curUnit,
            pillBg: '#FFEDD5',
            pillColor: '#C2410C',
            valueHtml: fmtMoneyVal(stats.totalInstallmentRemaining),
            unit: curUnit,
            valueColor: '#EA580C',
            bgColor: '#FFF7ED',
            borderColor: '#FED7AA',
            dir: effectiveDir,
          })}
          ${renderStatCard({
            label: rtlText(tr('قیستی چالاک', 'الأقساط النشطة', 'Active Accounts')),
            pillText: '#',
            pillBg: '#FCE7F3',
            pillColor: '#BE185D',
            valueHtml: fmtEnNumber(stats.activeInstallmentAccounts),
            valueColor: '#DB2777',
            bgColor: '#FDF2F8',
            borderColor: '#FBCFE8',
            dir: effectiveDir,
          })}
        </div>`
      : ''
  }

  <!-- SECTION 4: Activity Log -->
  <div class="section-heading">
    <span class="section-title">${rtlText(tr('٤. تۆماری چالاکییەکانی ئەم ماوەیە', '٤. سجل الأنشطة للفترة المحددة', '4. Activity Log for Selected Period'))}</span>
    <span class="section-tag"><span class="en-num" dir="ltr">(${activities.length})</span> ${rtlText(tr('تۆمار', 'سجل', 'Records'))}</span>
  </div>

  <div class="table-wrap">
    <table class="styled-table">
      <thead>
        <tr>
          <th class="col-idx">#</th>
          <th class="col-type">${rtlText(tr('جۆر', 'النوع', 'Type'))}</th>
          <th style="text-align:${alignStart};">${rtlText(tr('ناونیشان / وەسف', 'العنوان / الوصف', 'Title / Description'))}</th>
          <th class="col-num" style="text-align:${alignEnd};">${rtlText(tr('بڕی پارە', 'المبلغ', 'Amount'))}</th>
          <th class="col-num" style="text-align:${alignEnd};">${rtlText(tr('داشکاندن', 'الخصم', 'Discount'))}</th>
          <th class="col-date">${rtlText(tr('بەروار', 'التاريخ', 'Date'))}</th>
        </tr>
      </thead>
      <tbody>
        ${activitiesRowsHTML}
      </tbody>
    </table>
  </div>

  <!-- Signatures Block -->
  <div class="footer-signatures">
    <div class="sig-block">
      <div class="sig-label">${rtlText(tr('ئامادەکاری ڕاپۆرت', 'مُعد التقرير', 'Prepared By'))}</div>
      <div class="sig-line">${rtlText(escHtml(business.name || tr('کارگێڕی فرۆشگا', 'إدارة المتجر', 'Store Management')))}</div>
    </div>
    <div class="sig-block">
      <div class="sig-label">${rtlText(tr('مۆر و واژۆی بەڕێوەبەر', 'ختم وتوقيع المدير', 'Manager Approval & Stamp'))}</div>
      <div class="sig-line">${rtlText(tr('واژۆ و بەروار', 'التوقيع والتاريخ', 'Signature & Date'))}</div>
    </div>
  </div>

  <!-- Brand Footer -->
  <div class="bottom-brand">
    <span>${rtlText(escHtml(developedByStr))}</span> &bull; <span class="en-num" dir="ltr">${PDF_BRAND_WEBSITE}</span> &bull; <span class="en-num" dir="ltr">${dateStr} &bull; ${timeStr}</span>
  </div>
</div>
</body>
</html>`;
}
