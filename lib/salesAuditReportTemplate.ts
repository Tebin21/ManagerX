import type { Sale } from '@/types/sales';
import { fmtIQD, fmtUSD, formatDate as fmtDate } from '@/utils/formatters';
import { KURDISH_FONT_FACE, PDF_BRAND_WEBSITE, pdfDevelopedByText, kuSpan, isKurdishPdfActive } from '@/lib/pdfFont';
import { useSettingsStore } from '@/store/settingsStore';

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

function methodBadge(method: string, isKurdish: boolean): string {
  const m = (method || 'cash').toLowerCase();
  if (m === 'cash') {
    return `<span style="background:#ECFDF5;color:#047857;border:1px solid #A7F3D0;padding:2px 8px;border-radius:6px;font-size:11px;font-weight:700;">${isKurdish ? ku('نەختینە') : 'Cash'}</span>`;
  }
  if (m === 'fib' || m === 'card' || m === 'online') {
    return `<span style="background:#EFF6FF;color:#1D4ED8;border:1px solid #BFDBFE;padding:2px 8px;border-radius:6px;font-size:11px;font-weight:700;">${isKurdish ? ku('ئۆنلاین') : 'Card/FIB'}</span>`;
  }
  if (m === 'debt') {
    return `<span style="background:#FEF2F2;color:#B91C1C;border:1px solid #FECACA;padding:2px 8px;border-radius:6px;font-size:11px;font-weight:700;">${isKurdish ? ku('قەرز') : 'Debt'}</span>`;
  }
  return `<span style="background:#F1F5F9;color:#475569;border:1px solid #CBD5E1;padding:2px 8px;border-radius:6px;font-size:11px;font-weight:600;">${escHtml(method)}</span>`;
}

export function buildSalesAuditReportHTML(
  sales: Sale[],
  periodLabel: string,
  business: BusinessInfo,
  dir: 'ltr' | 'rtl' = 'rtl'
): string {
  const isKurdish = dir === 'rtl' || isKurdishPdfActive();
  const lang = isKurdish ? 'ku' : 'en';

  const baseCurrency = useSettingsStore.getState().baseCurrency || 'IQD';
  const rate = useSettingsStore.getState().exchangeRate || 1310;
  const isUsd = baseCurrency === 'USD';
  const fmtMoney = (val: number) => isUsd ? `$${fmtUSD(val / rate)}` : `${fmtIQD(val)} IQD`;

  const now = new Date();
  const dateStr = fmtDate(now.toISOString());
  const timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
  const reportId = `SAR-${now.toISOString().slice(0, 10).replace(/-/g, '')}-${Math.random().toString(16).slice(2, 6).toUpperCase()}`;

  // Computations
  const totalRevenue = sales.reduce((sum, s) => sum + (s.grandTotal || 0), 0);
  const totalPaid = sales.reduce((sum, s) => sum + (s.paidAmount || 0), 0);
  const totalDebt = sales.reduce((sum, s) => sum + (s.remainingDebt || 0), 0);
  const totalInvoices = sales.length;

  let totalItemsCount = 0;
  for (const s of sales) {
    if (s.items && s.items.length > 0) {
      for (const it of s.items) {
        totalItemsCount += it.quantity || 1;
      }
    }
  }

  const logoHTML = business.logoUri
    ? `<img src="${business.logoUri}" style="height:55px;max-width:140px;object-fit:contain;display:block;background:#fff;border-radius:8px;padding:4px;border:1px solid #E2E8F0;" alt="logo" />`
    : '';

  const rowsHTML = sales.length === 0
    ? `<tr><td colspan="9" style="text-align:center;color:#94A3B8;padding:28px;font-style:italic;">${isKurdish ? ku('هیچ فرۆشتنێک لەم ماوەیەدا تۆمار نەکراوە') : 'No sales recorded for this period'}</td></tr>`
    : sales.map((sale, idx) => {
        const itemsList = (sale.items && sale.items.length > 0)
          ? sale.items.map((it) => {
              const unitPrice = it.sellingPrice ? `<span class="en-num" dir="ltr">${fmtMoney(it.sellingPrice)}</span>` : '';
              return `<div style="font-size:11.5px;color:#334155;line-height:1.4;">&bull; <b>${escHtml(it.productName)}</b> (<span class="en-num" dir="ltr">${it.quantity}x</span> ${unitPrice})</div>`;
            }).join('')
          : '<span style="color:#94A3B8;font-size:11px;">&mdash;</span>';

        const remainingDebtHTML = sale.remainingDebt > 0
          ? `<span class="en-num" dir="ltr" style="color:#DC2626;font-weight:700;display:inline-block;unicode-bidi:isolate;">${fmtMoney(sale.remainingDebt)}</span>`
          : '<span class="en-num" dir="ltr" style="color:#94A3B8;">0</span>';

        const customerDisplay = sale.customerName
          ? `<div style="font-weight:700;color:#0F172A;">${escHtml(sale.customerName)}</div>${sale.customerPhone ? `<div class="en-num" dir="ltr" style="font-size:10.5px;color:#64748B;display:inline-block;unicode-bidi:isolate;">${escHtml(sale.customerPhone)}</div>` : ''}`
          : `<span style="color:#64748B;font-style:italic;">${isKurdish ? ku('کڕیاری نەناسراو') : 'Walk-in Customer'}</span>`;

        return `
          <tr style="background:${idx % 2 === 0 ? '#FFFFFF' : '#F8FAFC'};">
            <td style="text-align:center;color:#64748B;font-size:11px;"><span class="en-num" dir="ltr">${idx + 1}</span></td>
            <td style="font-weight:700;color:#0F172A;white-space:nowrap;text-align:${dir === 'rtl' ? 'right' : 'left'};"><span class="en-num" dir="ltr">#${escHtml(sale.invoiceNumber)}</span></td>
            <td style="text-align:${dir === 'rtl' ? 'right' : 'left'};">${customerDisplay}</td>
            <td style="font-size:11.5px;color:#475569;white-space:nowrap;text-align:center;"><span class="en-num" dir="ltr">${fmtDate(sale.date || sale.createdAt)}</span></td>
            <td style="max-width:220px;text-align:${dir === 'rtl' ? 'right' : 'left'};">${itemsList}</td>
            <td style="text-align:center;">${methodBadge(sale.paymentMethod, isKurdish)}</td>
            <td style="text-align:${dir === 'rtl' ? 'left' : 'right'};font-weight:700;color:#0F172A;white-space:nowrap;"><span class="en-num" dir="ltr">${fmtMoney(sale.grandTotal)}</span></td>
            <td style="text-align:${dir === 'rtl' ? 'left' : 'right'};color:#059669;font-weight:600;white-space:nowrap;"><span class="en-num" dir="ltr">${fmtMoney(sale.paidAmount)}</span></td>
            <td style="text-align:${dir === 'rtl' ? 'left' : 'right'};white-space:nowrap;">${remainingDebtHTML}</td>
          </tr>
        `;
      }).join('');

  return `<!DOCTYPE html>
<html lang="${lang}" dir="${dir}">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1.0"/>
<title>${isKurdish ? `جەردی فرۆشتن — ${escHtml(business.name)}` : `Sales Audit Report — ${escHtml(business.name)}`}</title>
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
    body { background: #FFFFFF; }
    .page { padding: 0; max-width: 100%; }
    tr { page-break-inside: avoid; }
    .kpi-grid { page-break-inside: avoid; }
  }

  /* Force Western digits and LTR flow for numbers/dates */
  .en-num {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif !important;
    direction: ltr !important;
    unicode-bidi: isolate !important;
  }

  .header-card {
    background: linear-gradient(135deg, #1E293B 0%, #334155 50%, #475569 100%);
    color: #FFFFFF;
    border-radius: 16px;
    padding: 24px 28px;
    margin-bottom: 22px;
  }
  .header-top {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 16px;
    margin-bottom: 16px;
  }
  .biz-info h1 {
    font-size: 22px;
    font-weight: 800;
    margin-bottom: 4px;
    letter-spacing: -0.2px;
  }
  .biz-info p {
    font-size: 12px;
    color: rgba(255,255,255,0.75);
    line-height: 1.4;
    margin-top: 2px;
  }
  .report-meta {
    text-align: ${dir === 'rtl' ? 'left' : 'right'};
  }
  .report-badge {
    display: inline-block;
    background: rgba(255,255,255,0.18);
    border: 1px solid rgba(255,255,255,0.25);
    padding: 4px 12px;
    border-radius: 20px;
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.5px;
    text-transform: uppercase;
    margin-bottom: 6px;
  }
  .report-id {
    font-size: 11px;
    color: rgba(255,255,255,0.7);
    font-family: monospace;
    direction: ltr;
    unicode-bidi: isolate;
  }

  .banner-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    background: rgba(0,0,0,0.2);
    border-radius: 10px;
    padding: 10px 16px;
    font-size: 12.5px;
  }
  .banner-period b {
    color: #38BDF8;
    margin-inline-start: 4px;
  }
  .banner-date {
    color: rgba(255,255,255,0.85);
    font-size: 11.5px;
  }

  /* KPI Grid */
  .kpi-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 12px;
    margin-bottom: 24px;
  }
  .kpi-card {
    background: #FFFFFF;
    border: 1px solid #E2E8F0;
    border-radius: 12px;
    padding: 14px 16px;
    box-shadow: 0 1px 3px rgba(0,0,0,0.04);
  }
  .kpi-label {
    font-size: 11.5px;
    color: #64748B;
    font-weight: 600;
    margin-bottom: 6px;
  }
  .kpi-value {
    font-size: 18px;
    font-weight: 800;
    color: #0F172A;
  }
  .kpi-sub {
    font-size: 10.5px;
    color: #94A3B8;
    margin-top: 2px;
  }

  /* Table */
  .section-title {
    font-size: 15px;
    font-weight: 700;
    color: #0F172A;
    margin-bottom: 12px;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  table {
    width: 100%;
    border-collapse: collapse;
    background: #FFFFFF;
    border: 1px solid #E2E8F0;
    border-radius: 12px;
    overflow: hidden;
    margin-bottom: 24px;
  }
  th {
    background: #F1F5F9;
    color: #475569;
    font-weight: 700;
    font-size: 11.5px;
    padding: 10px 12px;
    border-bottom: 1px solid #CBD5E1;
  }
  td {
    padding: 10px 12px;
    border-bottom: 1px solid #F1F5F9;
    vertical-align: middle;
  }
  tfoot td {
    background: #F8FAFC;
    font-weight: 800;
    border-top: 2px solid #CBD5E1;
    padding: 12px;
  }

  /* Sign-off */
  .signoff-box {
    display: flex;
    justify-content: space-between;
    gap: 32px;
    margin-top: 28px;
    padding-top: 20px;
    border-top: 1px dashed #CBD5E1;
  }
  .signoff-col {
    flex: 1;
    background: #F8FAFC;
    border: 1px solid #E2E8F0;
    border-radius: 10px;
    padding: 16px;
    min-height: 85px;
  }
  .signoff-label {
    font-size: 11.5px;
    font-weight: 700;
    color: #475569;
    margin-bottom: 30px;
  }
  .signoff-line {
    border-top: 1px dotted #94A3B8;
    margin-top: 10px;
    font-size: 10.5px;
    color: #94A3B8;
    text-align: center;
    padding-top: 4px;
  }

  .footer {
    margin-top: 28px;
    text-align: center;
    font-size: 11px;
    color: #94A3B8;
  }
</style>
</head>
<body>
<div class="page">

  <!-- Header Card -->
  <div class="header-card">
    <div class="header-top">
      <div class="biz-info">
        <h1>${isKurdish ? ku(escHtml(business.name || 'فرۆشگاکەم')) : escHtml(business.name || 'My Store')}</h1>
        ${business.phone ? `<p>${isKurdish ? ku('تەلەفۆن:') : 'Phone:'} <span class="en-num" dir="ltr" style="display:inline-block;unicode-bidi:isolate;color:#FFFFFF;margin-inline-start:4px;">${escHtml(business.phone)}</span></p>` : ''}
        ${business.address ? `<p>${isKurdish ? ku('ناونیشان:') : 'Address:'} <span style="margin-inline-start:4px;">${escHtml(business.address)}</span></p>` : ''}
      </div>
      <div style="display:flex;flex-direction:column;align-items:${dir === 'rtl' ? 'flex-start' : 'flex-end'};gap:8px;">
        ${logoHTML}
        <div class="report-meta" style="text-align:${dir === 'rtl' ? 'left' : 'right'};">
          <div class="report-badge">${isKurdish ? ku('جەردی فرۆشتن') : 'Sales Audit Report'}</div>
          <div class="report-id en-num" dir="ltr">${reportId}</div>
        </div>
      </div>
    </div>

    <div class="banner-row">
      <div class="banner-period">
        <span>${isKurdish ? ku('ماوەی دیاریکراو:') : 'Selected Period:'}</span>
        <b>${isKurdish ? ku(escHtml(periodLabel)) : escHtml(periodLabel)}</b>
      </div>
      <div class="banner-date" style="display:inline-flex;align-items:center;gap:6px;">
        <span>${isKurdish ? ku('بەرواری دەرکردن:') : 'Generated:'}</span>
        <span class="en-num" dir="ltr" style="display:inline-block;unicode-bidi:isolate;color:#FFFFFF;font-weight:600;">${dateStr} &bull; ${timeStr}</span>
      </div>
    </div>
  </div>

  <!-- KPI Grid -->
  <div class="kpi-grid">
    <div class="kpi-card">
      <div class="kpi-label">${isKurdish ? ku('کۆی گشتی فرۆشراو') : 'Total Revenue'}</div>
      <div class="kpi-value"><span class="en-num" dir="ltr" style="color:#0284C7;display:inline-block;unicode-bidi:isolate;">${fmtMoney(totalRevenue)}</span></div>
      <div class="kpi-sub"><span class="en-num" dir="ltr">${totalInvoices}</span> ${isKurdish ? ku('پسوولە') : 'Invoices'}</div>
    </div>
    <div class="kpi-card">
      <div class="kpi-label">${isKurdish ? ku('کۆی پارەی وەرگیراو') : 'Total Paid Amount'}</div>
      <div class="kpi-value"><span class="en-num" dir="ltr" style="color:#059669;display:inline-block;unicode-bidi:isolate;">${fmtMoney(totalPaid)}</span></div>
      <div class="kpi-sub">${isKurdish ? ku('کاش و FIB') : 'Cash & Online'}</div>
    </div>
    <div class="kpi-card">
      <div class="kpi-label">${isKurdish ? ku('کۆی قەرزی ماوە') : 'Remaining Debt'}</div>
      <div class="kpi-value"><span class="en-num" dir="ltr" style="color:${totalDebt > 0 ? '#DC2626' : '#64748B'};display:inline-block;unicode-bidi:isolate;">${fmtMoney(totalDebt)}</span></div>
      <div class="kpi-sub">${totalDebt > 0 ? (isKurdish ? ku('قەرزی وەرنەگیراو') : 'Pending Debt') : (isKurdish ? ku('هیچ قەرزێک نییە') : 'Zero Debt')}</div>
    </div>
    <div class="kpi-card">
      <div class="kpi-label">${isKurdish ? ku('کۆی ئایتمەکان') : 'Items Sold'}</div>
      <div class="kpi-value"><span class="en-num" dir="ltr" style="color:#475569;display:inline-block;unicode-bidi:isolate;">${totalItemsCount}</span></div>
      <div class="kpi-sub">${isKurdish ? ku('دانە فرۆشراوەکان') : 'Total Pieces'}</div>
    </div>
  </div>

  <!-- Invoices Table -->
  <div class="section-title">
    <span>${isKurdish ? ku('وردەکاری پسوولەکانی فرۆشتن') : 'Invoices & Sales Detail'}</span>
    <span style="font-size:12px;color:#64748B;font-weight:500;"><span class="en-num" dir="ltr">${sales.length}</span> ${isKurdish ? ku('پسوولە تۆمارکراوە') : 'invoices listed'}</span>
  </div>

  <table>
    <thead>
      <tr>
        <th style="width:36px;text-align:center;">#</th>
        <th style="width:75px;text-align:${dir === 'rtl' ? 'right' : 'left'};">${isKurdish ? ku('پسوولە') : 'Invoice'}</th>
        <th style="width:130px;text-align:${dir === 'rtl' ? 'right' : 'left'};">${isKurdish ? ku('کڕیار') : 'Customer'}</th>
        <th style="width:90px;text-align:center;">${isKurdish ? ku('بەروار') : 'Date'}</th>
        <th style="text-align:${dir === 'rtl' ? 'right' : 'left'};">${isKurdish ? ku('ئایتم و وردەکاری') : 'Items & Details'}</th>
        <th style="width:85px;text-align:center;">${isKurdish ? ku('جۆر') : 'Method'}</th>
        <th style="width:115px;text-align:${dir === 'rtl' ? 'left' : 'right'};">${isKurdish ? ku('کۆی گشتی') : 'Total'} (${isUsd ? '$' : 'IQD'})</th>
        <th style="width:105px;text-align:${dir === 'rtl' ? 'left' : 'right'};">${isKurdish ? ku('دراو') : 'Paid'} (${isUsd ? '$' : 'IQD'})</th>
        <th style="width:95px;text-align:${dir === 'rtl' ? 'left' : 'right'};">${isKurdish ? ku('قەرز') : 'Debt'} (${isUsd ? '$' : 'IQD'})</th>
      </tr>
    </thead>
    <tbody>
      ${rowsHTML}
    </tbody>
    ${sales.length > 0 ? `
    <tfoot>
      <tr>
        <td colspan="6" style="text-align:${dir === 'rtl' ? 'right' : 'left'};color:#0F172A;font-weight:800;font-size:13px;">${isKurdish ? ku('کۆی گشتی هەموو پسوولەکان:') : 'Grand Total for All Invoices:'}</td>
        <td style="text-align:${dir === 'rtl' ? 'left' : 'right'};color:#0284C7;font-weight:800;white-space:nowrap;"><span class="en-num" dir="ltr">${fmtMoney(totalRevenue)}</span></td>
        <td style="text-align:${dir === 'rtl' ? 'left' : 'right'};color:#059669;font-weight:700;white-space:nowrap;"><span class="en-num" dir="ltr">${fmtMoney(totalPaid)}</span></td>
        <td style="text-align:${dir === 'rtl' ? 'left' : 'right'};color:${totalDebt > 0 ? '#DC2626' : '#64748B'};font-weight:700;white-space:nowrap;"><span class="en-num" dir="ltr">${fmtMoney(totalDebt)}</span></td>
      </tr>
    </tfoot>` : ''}
  </table>

  <!-- Signoff section -->
  <div class="signoff-box">
    <div class="signoff-col">
      <div class="signoff-label">${isKurdish ? ku('پەسەندکردنی خاوەنکار / بەڕێوەبەر:') : 'Manager / Owner Approval:'}</div>
      <div class="signoff-line">${isKurdish ? ku('مۆر و واژوو') : 'Stamp & Signature'}</div>
    </div>
    <div class="signoff-col">
      <div class="signoff-label">${isKurdish ? ku('واژووی وردبینیکاری جەرد / ژمێریار:') : 'Auditor / Accountant Signature:'}</div>
      <div class="signoff-line">${isKurdish ? ku('ناو و بەروار') : 'Name & Date'}</div>
    </div>
  </div>

  <!-- Footer -->
  <div class="footer">
    ${isKurdish
      ? `${ku(pdfDevelopedByText())} &bull; <span class="en-num" dir="ltr">${PDF_BRAND_WEBSITE}</span> &bull; <span class="en-num" dir="ltr">${dateStr} &bull; ${timeStr}</span>`
      : `${pdfDevelopedByText()} &bull; <span class="en-num" dir="ltr">${PDF_BRAND_WEBSITE}</span> &bull; <span class="en-num" dir="ltr">${dateStr} at ${timeStr}</span>`}
  </div>

</div>
</body>
</html>`;
}
