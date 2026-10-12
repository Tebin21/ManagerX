import type { DashboardOverviewStats, DashboardActivityItem } from '@/lib/sqlite';
import { fmtIQD, fmtEnNumber, formatDate as fmtDate, toEnglishDigits } from '@/utils/formatters';
import { KURDISH_FONT_FACE, PDF_BRAND_WEBSITE, pdfDevelopedByText, kuSpan, isKurdishPdfActive } from '@/lib/pdfFont';

interface BusinessInfo {
  name: string;
  phone: string;
  address: string;
  logoUri: string | null;
}

function escHtml(str: string): string {
  return (str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

const ku = kuSpan;

function activityBadge(type: DashboardActivityItem['type'], isKurdish: boolean): string {
  switch (type) {
    case 'sale':
      return `<span style="background:#ECFDF5;color:#047857;border:1px solid #A7F3D0;padding:2px 8px;border-radius:6px;font-size:11px;font-weight:700;">${isKurdish ? ku('فرۆشتن') : 'Sale'}</span>`;
    case 'purchase':
      return `<span style="background:#F5F3FF;color:#6D28D9;border:1px solid #DDD6FE;padding:2px 8px;border-radius:6px;font-size:11px;font-weight:700;">${isKurdish ? ku('کڕین') : 'Purchase'}</span>`;
    case 'customer_debt':
      return `<span style="background:#F0FDFA;color:#0F766E;border:1px solid #99F6E4;padding:2px 8px;border-radius:6px;font-size:11px;font-weight:700;">${isKurdish ? ku('وەرگرتنی قەرز') : 'Debt Collected'}</span>`;
    case 'supplier_debt':
      return `<span style="background:#FFF7ED;color:#C2410C;border:1px solid #FFEDD5;padding:2px 8px;border-radius:6px;font-size:11px;font-weight:700;">${isKurdish ? ku('دانەوەی قەرز') : 'Debt Paid'}</span>`;
    case 'expense':
      return `<span style="background:#FFF1F2;color:#BE123C;border:1px solid #FECDD3;padding:2px 8px;border-radius:6px;font-size:11px;font-weight:700;">${isKurdish ? ku('مەسروفات') : 'Expense'}</span>`;
    case 'customer':
      return `<span style="background:#EFF6FF;color:#1D4ED8;border:1px solid #BFDBFE;padding:2px 8px;border-radius:6px;font-size:11px;font-weight:700;">${isKurdish ? ku('کڕیاری نوێ') : 'New Customer'}</span>`;
    case 'supplier':
      return `<span style="background:#EEF2FF;color:#4338CA;border:1px solid #C7D2FE;padding:2px 8px;border-radius:6px;font-size:11px;font-weight:700;">${isKurdish ? ku('دابینکەری نوێ') : 'New Supplier'}</span>`;
    default:
      return `<span style="background:#F1F5F9;color:#475569;border:1px solid #CBD5E1;padding:2px 8px;border-radius:6px;font-size:11px;font-weight:600;">${escHtml(type)}</span>`;
  }
}

function formatActivityTitleForReport(act: DashboardActivityItem, isKurdish: boolean): string {
  const refMatch = (act.title || '').match(/#\s*([0-9a-zA-Z_-]+)/);
  const ref = act.referenceNumber || (refMatch ? refMatch[1] : '');

  switch (act.type) {
    case 'sale': {
      const num = ref || toEnglishDigits(act.title.replace(/^[^#]*#?/, '')).trim();
      return isKurdish ? `پسوولەی #${num}` : `Invoice #${num}`;
    }
    case 'purchase': {
      const num = ref || toEnglishDigits(act.title.replace(/^[^#]*#?/, '')).trim();
      return isKurdish ? `کڕین #${num}` : `Purchase #${num}`;
    }
    case 'customer_debt':
      return isKurdish ? 'وەرگرتنی قەرز' : 'Debt Collected';
    case 'supplier_debt':
      return isKurdish ? 'دانەوەی قەرز' : 'Debt Paid';
    case 'expense':
      return isKurdish ? 'مەسروفات' : 'Expense';
    case 'customer':
      return isKurdish ? 'کڕیاری نوێ' : 'New Customer';
    case 'supplier':
      return isKurdish ? 'دابینکەری نوێ' : 'New Supplier';
    case 'capital_deposit':
      return isKurdish ? 'پارەدانان بۆ دەخیلە' : 'Till Deposit';
    case 'capital_withdraw':
      return isKurdish ? 'ڕاکێشانی دەخیلە' : 'Till Withdrawal';
    default:
      return toEnglishDigits(act.title);
  }
}

function formatActivitySubtitleForReport(act: DashboardActivityItem, isKurdish: boolean): string {
  if (!act.subtitle) return '';
  const sub = act.subtitle.trim();
  if (sub === 'کڕیاری گشتی' || sub === 'General Customer') {
    return isKurdish ? 'کڕیاری گشتی' : 'General Customer';
  }
  if (sub === 'کڕینی کاڵا' || sub === 'General Purchase') {
    return isKurdish ? 'کڕینی کاڵا' : 'General Purchase';
  }
  if (sub === 'کڕیار' || sub === 'Customer') {
    return isKurdish ? 'کڕیار' : 'Customer';
  }
  if (sub === 'دابینکەر' || sub === 'Supplier') {
    return isKurdish ? 'دابینکەر' : 'Supplier';
  }
  return act.subtitle;
}

export function buildDashboardReportHTML(
  stats: DashboardOverviewStats,
  activities: DashboardActivityItem[],
  periodLabel: string,
  business: BusinessInfo,
  dir: 'ltr' | 'rtl' = 'rtl'
): string {
  const isKurdish = dir === 'rtl' || isKurdishPdfActive();
  const lang = isKurdish ? 'ku' : 'en';

  const now = new Date();
  const dateStr = fmtDate(now.toISOString());
  const timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
  const reportId = `DBR-${now.toISOString().slice(0, 10).replace(/-/g, '')}-${Math.random().toString(16).slice(2, 6).toUpperCase()}`;

  const logoHTML = business.logoUri
    ? `<img src="${business.logoUri}" style="height:55px;max-width:140px;object-fit:contain;display:block;background:#fff;border-radius:8px;padding:4px;border:1px solid #E2E8F0;" alt="logo" />`
    : '';

  const activitiesRowsHTML = activities.length === 0
    ? `<tr><td colspan="6" style="text-align:center;color:#94A3B8;padding:28px;font-style:italic;">${isKurdish ? ku('هیچ چالاکییەک لەم ماوەیەدا تۆمار نەکراوە') : 'No activities recorded for this period'}</td></tr>`
    : activities.map((act, idx) => {
        const sign = act.type === 'sale' || act.type === 'customer_debt'
          ? '+'
          : act.type === 'purchase' || act.type === 'supplier_debt' || act.type === 'expense'
          ? '-'
          : '';

        const amountColor = sign === '+' ? '#059669' : sign === '-' ? '#DC2626' : '#0F172A';
        const amountDisplay = act.amount > 0
          ? `<span class="en-num" dir="ltr" style="font-weight:800;color:${amountColor};">${sign}${fmtIQD(act.amount)} IQD</span>`
          : '<span style="color:#94A3B8;">&mdash;</span>';

        const discountDisplay = act.discount && act.discount > 0
          ? `<span class="en-num" dir="ltr" style="color:#8B5CF6;font-size:11px;font-weight:700;">${fmtIQD(act.discount)} IQD</span>`
          : '<span style="color:#94A3B8;">&mdash;</span>';

        const actDate = act.timestamp ? fmtDate(act.timestamp) : '';

        return `
          <tr style="background:${idx % 2 === 0 ? '#FFFFFF' : '#F8FAFC'};">
            <td style="text-align:center;color:#64748B;font-size:11px;"><span class="en-num" dir="ltr">${idx + 1}</span></td>
            <td style="text-align:center;">${activityBadge(act.type, isKurdish)}</td>
            <td style="text-align:${dir === 'rtl' ? 'right' : 'left'};">
              <div style="font-weight:700;color:#0F172A;">${escHtml(toEnglishDigits(formatActivityTitleForReport(act, isKurdish)))}</div>
              ${act.subtitle ? `<div style="font-size:11px;color:#64748B;">${escHtml(formatActivitySubtitleForReport(act, isKurdish))}</div>` : ''}
            </td>
            <td style="text-align:${dir === 'rtl' ? 'left' : 'right'};white-space:nowrap;">${amountDisplay}</td>
            <td style="text-align:${dir === 'rtl' ? 'left' : 'right'};white-space:nowrap;">${discountDisplay}</td>
            <td style="font-size:11.5px;color:#475569;white-space:nowrap;text-align:center;"><span class="en-num" dir="ltr">${actDate}</span></td>
          </tr>
        `;
      }).join('');

  const profitColor = stats.expectedProfit >= 0 ? '#059669' : '#DC2626';

  return `<!DOCTYPE html>
<html lang="${lang}" dir="${dir}">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1.0"/>
<title>${isKurdish ? `ڕاپۆرتی داشبۆرد — ${escHtml(business.name)}` : `Dashboard Report — ${escHtml(business.name)}`}</title>
<style>
  ${KURDISH_FONT_FACE}
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    direction: ${dir};
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, 'Rudaw', sans-serif;
    background: #F8FAFC;
    color: #0F172A;
    font-size: 12.5px;
    line-height: 1.5;
  }
  .page {
    max-width: 920px;
    margin: 0 auto;
    background: #FFFFFF;
    padding: 32px 36px;
    min-height: 100vh;
  }
  @media print {
    body { background: #FFF; }
    .page { max-width: 100%; padding: 18px 24px; }
  }

  /* Header Bar */
  .top-gold-bar {
    height: 6px;
    background: linear-gradient(90deg, #D4AF37 0%, #F59E0B 50%, #B89025 100%);
    border-radius: 4px;
    margin-bottom: 22px;
  }
  .header-table {
    width: 100%;
    border-collapse: collapse;
    margin-bottom: 22px;
  }
  .header-table td {
    vertical-align: top;
  }

  .biz-name {
    font-size: 20px;
    font-weight: 800;
    color: #0F172A;
    margin-bottom: 3px;
  }
  .biz-meta {
    font-size: 11.5px;
    color: #64748B;
    line-height: 1.4;
  }

  .report-title-box {
    text-align: ${dir === 'rtl' ? 'left' : 'right'};
  }
  .report-main-title {
    font-size: 22px;
    font-weight: 900;
    color: #D4AF37;
    letter-spacing: -0.5px;
    margin-bottom: 4px;
  }
  .period-badge {
    display: inline-block;
    background: #FEF9C3;
    color: #854D0E;
    border: 1px solid #FDE047;
    padding: 3px 10px;
    border-radius: 12px;
    font-size: 11.5px;
    font-weight: 800;
    margin-bottom: 4px;
  }
  .report-meta-text {
    font-size: 11px;
    color: #64748B;
    line-height: 1.4;
  }

  /* Section Title */
  .section-heading {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-top: 22px;
    margin-bottom: 12px;
    padding-bottom: 6px;
    border-bottom: 2px solid #F1F5F9;
  }
  .section-title {
    font-size: 14.5px;
    font-weight: 800;
    color: #1E293B;
  }
  .section-tag {
    font-size: 10.5px;
    font-weight: 700;
    color: #94A3B8;
  }

  /* Cards Grid */
  .cards-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 10px;
    margin-bottom: 8px;
  }
  .cards-grid-3 {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 10px;
    margin-bottom: 8px;
  }
  .cards-grid-2 {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 12px;
    margin-bottom: 8px;
  }

  .card {
    background: #F8FAFC;
    border: 1px solid #E2E8F0;
    border-radius: 12px;
    padding: 12px 14px;
    display: flex;
    flex-direction: column;
    justifyContent: space-between;
  }
  .card-top {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 6px;
  }
  .card-label {
    font-size: 11.5px;
    font-weight: 600;
    color: #64748B;
  }
  .card-pill {
    font-size: 9.5px;
    font-weight: 800;
    padding: 1px 6px;
    border-radius: 6px;
  }
  .card-val {
    font-size: 16px;
    font-weight: 800;
    letter-spacing: -0.3px;
  }
  .card-unit {
    font-size: 10.5px;
    color: #64748B;
    font-weight: 600;
  }

  /* Tables */
  .styled-table {
    width: 100%;
    border-collapse: collapse;
    margin-top: 10px;
    border: 1px solid #E2E8F0;
    border-radius: 10px;
    overflow: hidden;
  }
  .styled-table th {
    background: #0F172A;
    color: #F8FAFC;
    font-size: 11px;
    font-weight: 700;
    padding: 8px 10px;
    text-transform: uppercase;
    letter-spacing: 0.3px;
  }
  .styled-table td {
    padding: 8px 10px;
    border-bottom: 1px solid #E2E8F0;
    font-size: 11.5px;
  }

  /* Sign / Footer */
  .footer-signatures {
    margin-top: 34px;
    display: flex;
    justify-content: space-between;
    padding-top: 14px;
  }
  .sig-block {
    width: 220px;
    text-align: center;
    border-top: 1px dashed #94A3B8;
    padding-top: 6px;
    font-size: 11px;
    color: #64748B;
  }

  .bottom-brand {
    margin-top: 28px;
    text-align: center;
    font-size: 10px;
    color: #94A3B8;
    border-top: 1px solid #F1F5F9;
    padding-top: 12px;
  }

  .en-num {
    direction: ltr !important;
    unicode-bidi: isolate;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  }
</style>
</head>
<body>
<div class="page">
  <div class="top-gold-bar"></div>

  <!-- Header Info -->
  <table class="header-table">
    <tr>
      <td style="width: 55%;">
        ${logoHTML}
        <div class="biz-name" style="${business.logoUri ? 'margin-top:8px;' : ''}">${escHtml(business.name)}</div>
        <div class="biz-meta">
          ${business.phone ? `<div>${isKurdish ? ku('مۆبایل: ') : 'Phone: '}<span class="en-num" dir="ltr">${escHtml(business.phone)}</span></div>` : ''}
          ${business.address ? `<div>${isKurdish ? ku('ناونیشان: ') : 'Address: '}${escHtml(business.address)}</div>` : ''}
        </div>
      </td>
      <td style="width: 45%;">
        <div class="report-title-box">
          <div class="report-main-title">${isKurdish ? ku('ڕاپۆرتی داشبۆرد') : 'Dashboard Report'}</div>
          <div><span class="period-badge">${isKurdish ? ku('ماوە: ') : 'Period: '}${escHtml(periodLabel)}</span></div>
          <div class="report-meta-text">
            <div>${isKurdish ? ku('بەروار: ') : 'Date: '}<span class="en-num" dir="ltr">${dateStr}</span> (${timeStr})</div>
            <div>${isKurdish ? ku('ژمارەی ڕاپۆرت: ') : 'Report ID: '}<span class="en-num" dir="ltr">${reportId}</span></div>
          </div>
        </div>
      </td>
    </tr>
  </table>

  <!-- SECTION 1: داهات و دارایی (Revenue & Profit) -->
  <div class="section-heading">
    <span class="section-title">${isKurdish ? ku('١. پوختەی داهات و دارایی') : '1. Financial & Profit Overview'}</span>
    <span class="section-tag">${isKurdish ? ku('(داهات، کڕین، قازانج)') : '(Revenue, Purchases, Net Profit)'}</span>
  </div>
  <div class="cards-grid">
    <!-- Card 1: Total Revenue -->
    <div class="card" style="border-top: 3px solid #10B981; background: #F0FDF4;">
      <div class="card-top">
        <span class="card-label">${isKurdish ? ku('کۆی داهات') : 'Total Revenue'}</span>
        <span class="card-pill" style="background:#DCFCE7; color:#15803D;">IQD</span>
      </div>
      <div>
        <span class="card-val en-num" dir="ltr" style="color:#059669;">${fmtIQD(stats.totalRevenue)}</span>
        <span class="card-unit">IQD</span>
      </div>
    </div>

    <!-- Card 2: Total Purchases Cost -->
    <div class="card" style="border-top: 3px solid #6366F1; background: #EEF2FF;">
      <div class="card-top">
        <span class="card-label">${isKurdish ? ku('کۆی بەهای کڕین') : 'Purchases Cost'}</span>
        <span class="card-pill" style="background:#E0E7FF; color:#4338CA;">IQD</span>
      </div>
      <div>
        <span class="card-val en-num" dir="ltr" style="color:#4F46E5;">${fmtIQD(stats.totalPurchasesCost)}</span>
        <span class="card-unit">IQD</span>
      </div>
    </div>

    <!-- Card 3: Expected Profit -->
    <div class="card" style="border-top: 3px solid ${profitColor}; background: ${stats.expectedProfit >= 0 ? '#ECFDF5' : '#FEF2F2'};">
      <div class="card-top">
        <span class="card-label">${isKurdish ? ku('قازانجی چاوەڕوانکراو') : 'Expected Net Profit'}</span>
        <span class="card-pill" style="background:${stats.expectedProfit >= 0 ? '#D1FAE5' : '#FEE2E2'}; color:${profitColor};">
          ${stats.expectedProfit >= 0 ? (isKurdish ? ku('قازانج') : 'Profit') : (isKurdish ? ku('زەرەر') : 'Loss')}
        </span>
      </div>
      <div>
        <span class="card-val en-num" dir="ltr" style="color:${profitColor};">${fmtIQD(stats.expectedProfit)}</span>
        <span class="card-unit">IQD</span>
      </div>
    </div>

    <!-- Card 4: Total Sales -->
    <div class="card" style="border-top: 3px solid #06B6D4; background: #ECFEFF;">
      <div class="card-top">
        <span class="card-label">${isKurdish ? ku('کۆی فرۆشتنەکان') : 'Total Sales Turnover'}</span>
        <span class="card-pill" style="background:#CFFAFE; color:#0E7490;">IQD</span>
      </div>
      <div>
        <span class="card-val en-num" dir="ltr" style="color:#0891B2;">${fmtIQD(stats.totalSales)}</span>
        <span class="card-unit">IQD</span>
      </div>
    </div>
  </div>

  <!-- SECTION 2: ئامار و ژماردن (Store & Inventory Counts) -->
  <div class="section-heading">
    <span class="section-title">${isKurdish ? ku('٢. ئامار و ژماردنی فرۆشگا') : '2. Store Inventory & Directory Counts'}</span>
    <span class="section-tag">${isKurdish ? ku('(پسوولە، کڕیار، دابینکەر، کاڵا)') : '(Invoices, Clients, Suppliers, Stock)'}</span>
  </div>
  <div class="cards-grid">
    <!-- Invoices Count -->
    <div class="card">
      <div class="card-top">
        <span class="card-label">${isKurdish ? ku('کۆی پسوولەکان') : 'Invoices Count'}</span>
        <span class="card-pill" style="background:#E2E8F0; color:#334155;">#</span>
      </div>
      <div class="card-val en-num" dir="ltr" style="color:#0F172A;">${fmtEnNumber(stats.totalInvoices)}</div>
    </div>

    <!-- Customers Count -->
    <div class="card">
      <div class="card-top">
        <span class="card-label">${isKurdish ? ku('کۆی کڕیاران') : 'Registered Customers'}</span>
        <span class="card-pill" style="background:#FEF3C7; color:#B45309;">#</span>
      </div>
      <div class="card-val en-num" dir="ltr" style="color:#D97706;">${fmtEnNumber(stats.totalCustomers)}</div>
    </div>

    <!-- Suppliers Count -->
    <div class="card">
      <div class="card-top">
        <span class="card-label">${isKurdish ? ku('کۆی دابینکەران') : 'Active Suppliers'}</span>
        <span class="card-pill" style="background:#CCFBF1; color:#0F766E;">#</span>
      </div>
      <div class="card-val en-num" dir="ltr" style="color:#0D9488;">${fmtEnNumber(stats.totalSuppliers)}</div>
    </div>

    <!-- Total Items -->
    <div class="card">
      <div class="card-top">
        <span class="card-label">${isKurdish ? ku('کۆی کاڵاکان') : 'Inventory Items'}</span>
        <span class="card-pill" style="background:#FCE7F3; color:#BE185D;">#</span>
      </div>
      <div class="card-val en-num" dir="ltr" style="color:#DB2777;">${fmtEnNumber(stats.totalItems)}</div>
    </div>
  </div>

  <div class="cards-grid-3">
    <!-- Low Stock Alert -->
    <div class="card" style="background:${stats.lowStockCount > 0 ? '#FEF2F2' : '#F8FAFC'}; border-color:${stats.lowStockCount > 0 ? '#FECACA' : '#E2E8F0'};">
      <div class="card-top">
        <span class="card-label">${isKurdish ? ku('کەمیی کاڵا (ئاگاداری)') : 'Low Stock Alerts'}</span>
        <span class="card-pill" style="background:${stats.lowStockCount > 0 ? '#FEE2E2' : '#E2E8F0'}; color:${stats.lowStockCount > 0 ? '#B91C1C' : '#475569'};">
          ${stats.lowStockCount > 0 ? (isKurdish ? ku('ئاگاداری') : 'Alert') : (isKurdish ? ku('باشە') : 'OK')}
        </span>
      </div>
      <div class="card-val en-num" dir="ltr" style="color:${stats.lowStockCount > 0 ? '#DC2626' : '#0F172A'};">${fmtEnNumber(stats.lowStockCount)}</div>
    </div>

    <!-- Total Discounts -->
    <div class="card">
      <div class="card-top">
        <span class="card-label">${isKurdish ? ku('کۆی داشکاندن') : 'Total Discounts Given'}</span>
        <span class="card-pill" style="background:#F3E8FF; color:#7E22CE;">IQD</span>
      </div>
      <div>
        <span class="card-val en-num" dir="ltr" style="color:#9333EA;">${fmtIQD(stats.totalDiscount)}</span>
        <span class="card-unit">IQD</span>
      </div>
    </div>

    <!-- Operating Expenses -->
    <div class="card">
      <div class="card-top">
        <span class="card-label">${isKurdish ? ku('کۆی خەرجییەکان') : 'Operating Expenses'}</span>
        <span class="card-pill" style="background:#FFE4E6; color:#BE123C;">IQD</span>
      </div>
      <div>
        <span class="card-val en-num" dir="ltr" style="color:#E11D48;">${fmtIQD(stats.totalExpenses)}</span>
        <span class="card-unit">IQD</span>
      </div>
    </div>
  </div>

  <!-- SECTION 3: قەرزەکان (Debts & Balances) -->
  <div class="section-heading">
    <span class="section-title">${isKurdish ? ku('٣. باڵانسی قەرزەکان') : '3. Debts & Receivables Summary'}</span>
    <span class="section-tag">${isKurdish ? ku('(لای کڕیاران vs سەرشان)') : '(Receivables vs Payables)'}</span>
  </div>
  <div class="cards-grid-2">
    <!-- Customer Receivables -->
    <div class="card" style="border-left: ${dir === 'ltr' ? '4px solid #EA580C' : '1px solid #E2E8F0'}; border-right: ${dir === 'rtl' ? '4px solid #EA580C' : '1px solid #E2E8F0'}; background: #FFF7ED;">
      <div class="card-top">
        <span class="card-label" style="font-weight:700; color:#9A3412;">${isKurdish ? ku('قەرزی لای کڕیاران (شایستەی وەرگرتن)') : 'Customer Receivables (Money Owed to You)'}</span>
        <span class="card-pill" style="background:#FFEDD5; color:#C2410C;">${isKurdish ? ku('لای کڕیار') : 'Receivables'}</span>
      </div>
      <div>
        <span class="card-val en-num" dir="ltr" style="color:#C2410C; font-size:18px;">${fmtIQD(stats.customerDebtTotal)}</span>
        <span class="card-unit">IQD</span>
      </div>
    </div>

    <!-- Supplier Payables -->
    <div class="card" style="border-left: ${dir === 'ltr' ? '4px solid #DC2626' : '1px solid #E2E8F0'}; border-right: ${dir === 'rtl' ? '4px solid #DC2626' : '1px solid #E2E8F0'}; background: #FEF2F2;">
      <div class="card-top">
        <span class="card-label" style="font-weight:700; color:#991B1B;">${isKurdish ? ku('قەرزی سەرشان بۆ دابینکەران') : 'Supplier Payables (Debts You Owe)'}</span>
        <span class="card-pill" style="background:#FEE2E2; color:#B91C1C;">${isKurdish ? ku('قەرزی سەرشان') : 'Payables'}</span>
      </div>
      <div>
        <span class="card-val en-num" dir="ltr" style="color:#DC2626; font-size:18px;">${fmtIQD(stats.supplierDebtTotal)}</span>
        <span class="card-unit">IQD</span>
      </div>
    </div>
  </div>

  <!-- SECTION 4: تازەترین چالاکییەکانی ئەم ماوەیە (Recent Activities) -->
  <div class="section-heading" style="margin-top:26px;">
    <span class="section-title">${isKurdish ? ku('٤. تۆماری چالاکییەکانی ئەم ماوەیە') : '4. Activity Log for Selected Period'}</span>
    <span class="section-tag"><span class="en-num" dir="ltr">(${activities.length})</span> ${isKurdish ? ku('تۆمار') : 'Records'}</span>
  </div>

  <table class="styled-table">
    <thead>
      <tr>
        <th style="width: 4%;">#</th>
        <th style="width: 14%; text-align:center;">${isKurdish ? ku('جۆر') : 'Type'}</th>
        <th style="width: 36%; text-align:${dir === 'rtl' ? 'right' : 'left'};">${isKurdish ? ku('ناونیشان / وەسف') : 'Title / Description'}</th>
        <th style="width: 18%; text-align:${dir === 'rtl' ? 'left' : 'right'};">${isKurdish ? ku('بڕی پارە') : 'Amount'}</th>
        <th style="width: 14%; text-align:${dir === 'rtl' ? 'left' : 'right'};">${isKurdish ? ku('داشکاندن') : 'Discount'}</th>
        <th style="width: 14%; text-align:center;">${isKurdish ? ku('بەروار') : 'Date'}</th>
      </tr>
    </thead>
    <tbody>
      ${activitiesRowsHTML}
    </tbody>
  </table>

  <!-- Signatures block -->
  <div class="footer-signatures">
    <div class="sig-block">
      <div>${isKurdish ? ku('ئامادەکاری ڕاپۆرت') : 'Prepared By'}</div>
      <div style="margin-top:20px; color:#0F172A; font-weight:700;">${escHtml(business.name)}</div>
    </div>
    <div class="sig-block">
      <div>${isKurdish ? ku('مۆر و واژۆی بەڕێوەبەر') : 'Manager Approval & Stamp'}</div>
      <div style="margin-top:20px;">............................................</div>
    </div>
  </div>

  <!-- Brand footer -->
  <div class="bottom-brand">
    <div>${pdfDevelopedByText()} &bull; ${PDF_BRAND_WEBSITE}</div>
  </div>
</div>
</body>
</html>`;
}
