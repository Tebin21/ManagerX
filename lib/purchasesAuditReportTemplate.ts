import type { Purchase } from '@/types/purchases';
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

function statusBadge(status: string, isKurdish: boolean): string {
  const s = (status || 'paid').toLowerCase();
  if (s === 'paid') {
    return `<span style="background:#ECFDF5;color:#047857;border:1px solid #A7F3D0;padding:2px 8px;border-radius:6px;font-size:11px;font-weight:700;">${isKurdish ? ku('پارەدراوە') : 'Paid'}</span>`;
  }
  if (s === 'debt') {
    return `<span style="background:#FEF2F2;color:#B91C1C;border:1px solid #FECACA;padding:2px 8px;border-radius:6px;font-size:11px;font-weight:700;">${isKurdish ? ku('قەرز') : 'Debt'}</span>`;
  }
  return `<span style="background:#F1F5F9;color:#475569;border:1px solid #CBD5E1;padding:2px 8px;border-radius:6px;font-size:11px;font-weight:600;">${escHtml(status)}</span>`;
}

export function buildPurchasesAuditReportHTML(
  purchases: Purchase[],
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
  const reportId = `PAR-${now.toISOString().slice(0, 10).replace(/-/g, '')}-${Math.random().toString(16).slice(2, 6).toUpperCase()}`;

  // Computations
  const totalCostIQD = purchases.reduce((sum, p) => sum + (p.totalIQD || 0), 0);
  const totalPurchases = purchases.length;
  const totalItemsCount = purchases.reduce((sum, p) => sum + (p.quantity || 1), 0);

  const paidPurchases = purchases.filter((p) => p.paymentStatus === 'paid');
  const paidTotalIQD = paidPurchases.reduce((sum, p) => sum + (p.totalIQD || 0), 0);
  const paidCount = paidPurchases.length;

  const debtPurchases = purchases.filter((p) => p.paymentStatus === 'debt');
  const debtTotalIQD = debtPurchases.reduce((sum, p) => sum + (p.totalIQD || 0), 0);
  const debtCount = debtPurchases.length;

  const logoHTML = business.logoUri
    ? `<img src="${business.logoUri}" style="height:55px;max-width:140px;object-fit:contain;display:block;background:#fff;border-radius:8px;padding:4px;border:1px solid #E2E8F0;" alt="logo" />`
    : '';

  const rowsHTML = purchases.length === 0
    ? `<tr><td colspan="9" style="text-align:center;color:#94A3B8;padding:28px;font-style:italic;">${isKurdish ? ku('هیچ کڕینێک لەم ماوەیەدا تۆمار نەکراوە') : 'No purchases recorded for this period'}</td></tr>`
    : purchases.map((purchase, idx) => {
        const supplierDisplay = purchase.supplierName
          ? `<div style="font-weight:700;color:#0F172A;">${escHtml(purchase.supplierName)}</div>${purchase.supplierPhone ? `<div class="en-num" dir="ltr" style="font-size:10.5px;color:#64748B;display:inline-block;unicode-bidi:isolate;">${escHtml(purchase.supplierPhone)}</div>` : ''}`
          : `<span style="color:#64748B;font-style:italic;">${isKurdish ? ku('دابینکەری نەناسراو') : 'Unknown Supplier'}</span>`;

        const productDisplay = `
          <div style="font-weight:700;color:#0F172A;">${escHtml(purchase.productName)}</div>
          ${purchase.category ? `<div style="font-size:10.5px;color:#64748B;">${escHtml(purchase.category)}</div>` : ''}
          ${purchase.warranty ? `<div style="font-size:10px;color:#0284C7;">${isKurdish ? ku('گەرەنتی: ') : 'Warranty: '}<span class="en-num" dir="ltr">${escHtml(purchase.warranty)}</span></div>` : ''}
        `;

        const unitPriceStr = isUsd
          ? `$${fmtUSD(purchase.buyPriceUSD > 0 ? purchase.buyPriceUSD : purchase.buyPriceIQD / rate)}`
          : (purchase.buyPriceUSD > 0
              ? `${fmtIQD(purchase.buyPriceIQD)} IQD <span style="font-size:10px;color:#64748B;">($${fmtUSD(purchase.buyPriceUSD)})</span>`
              : `${fmtIQD(purchase.buyPriceIQD)} IQD`);

        return `
          <tr style="background:${idx % 2 === 0 ? '#FFFFFF' : '#F8FAFC'};">
            <td style="text-align:center;color:#64748B;font-size:11px;"><span class="en-num" dir="ltr">${idx + 1}</span></td>
            <td style="font-weight:700;color:#0F172A;white-space:nowrap;text-align:${dir === 'rtl' ? 'right' : 'left'};"><span class="en-num" dir="ltr">#${escHtml(purchase.purchaseNumber)}</span></td>
            <td style="text-align:${dir === 'rtl' ? 'right' : 'left'};">${supplierDisplay}</td>
            <td style="font-size:11.5px;color:#475569;white-space:nowrap;text-align:center;"><span class="en-num" dir="ltr">${fmtDate(purchase.date || purchase.createdAt)}</span></td>
            <td style="max-width:210px;text-align:${dir === 'rtl' ? 'right' : 'left'};">${productDisplay}</td>
            <td style="text-align:center;font-weight:700;color:#0F172A;"><span class="en-num" dir="ltr">${purchase.quantity}</span></td>
            <td style="text-align:${dir === 'rtl' ? 'left' : 'right'};font-size:11.5px;color:#334155;white-space:nowrap;"><span class="en-num" dir="ltr">${unitPriceStr}</span></td>
            <td style="text-align:center;">${statusBadge(purchase.paymentStatus, isKurdish)}</td>
            <td style="text-align:${dir === 'rtl' ? 'left' : 'right'};font-weight:700;color:#0F172A;white-space:nowrap;"><span class="en-num" dir="ltr">${fmtMoney(purchase.totalIQD)}</span></td>
          </tr>
        `;
      }).join('');

  return `<!DOCTYPE html>
<html lang="${lang}" dir="${dir}">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1.0"/>
<title>${isKurdish ? `جەردی کڕینەکان — ${escHtml(business.name)}` : `Purchases Audit Report — ${escHtml(business.name)}`}</title>
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
          <div class="report-badge">${isKurdish ? ku('جەردی کڕینەکان') : 'Purchases Audit Report'}</div>
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
      <div class="kpi-label">${isKurdish ? ku('کۆی تێچووی کڕین') : 'Total Purchase Cost'}</div>
      <div class="kpi-value"><span class="en-num" dir="ltr" style="color:#0284C7;display:inline-block;unicode-bidi:isolate;">${fmtMoney(totalCostIQD)}</span></div>
      <div class="kpi-sub"><span class="en-num" dir="ltr">${totalPurchases}</span> ${isKurdish ? ku('پسوولەی کڕین') : 'Purchases'}</div>
    </div>
    <div class="kpi-card">
      <div class="kpi-label">${isKurdish ? ku('کڕینی پارەدراو (نەختینە)') : 'Paid Purchases'}</div>
      <div class="kpi-value"><span class="en-num" dir="ltr" style="color:#059669;display:inline-block;unicode-bidi:isolate;">${fmtMoney(paidTotalIQD)}</span></div>
      <div class="kpi-sub"><span class="en-num" dir="ltr">${paidCount}</span> ${isKurdish ? ku('کڕین پارەدراوە') : 'Paid Orders'}</div>
    </div>
    <div class="kpi-card">
      <div class="kpi-label">${isKurdish ? ku('کڕینی قەرز') : 'Debt Purchases'}</div>
      <div class="kpi-value"><span class="en-num" dir="ltr" style="color:${debtTotalIQD > 0 ? '#DC2626' : '#64748B'};display:inline-block;unicode-bidi:isolate;">${fmtMoney(debtTotalIQD)}</span></div>
      <div class="kpi-sub">${debtCount > 0 ? `<span class="en-num" dir="ltr">${debtCount}</span> ${isKurdish ? ku('کڕین بە قەرز') : 'Debt Orders'}` : (isKurdish ? ku('هیچ قەرزێک نییە') : 'Zero Debt')}</div>
    </div>
    <div class="kpi-card">
      <div class="kpi-label">${isKurdish ? ku('کۆی ژمارەی کەلوپەل') : 'Total Items / Units'}</div>
      <div class="kpi-value"><span class="en-num" dir="ltr" style="color:#475569;display:inline-block;unicode-bidi:isolate;">${totalItemsCount}</span></div>
      <div class="kpi-sub">${isKurdish ? ku('دانەی کڕدراو') : 'Units Purchased'}</div>
    </div>
  </div>

  <!-- Purchases Table -->
  <div class="section-title">
    <span>${isKurdish ? ku('وردەکاری پسوولەکانی کڕین') : 'Purchases & Invoices Detail'}</span>
    <span style="font-size:12px;color:#64748B;font-weight:500;"><span class="en-num" dir="ltr">${purchases.length}</span> ${isKurdish ? ku('کڕین تۆمارکراوە') : 'purchases listed'}</span>
  </div>

  <table>
    <thead>
      <tr>
        <th style="width:36px;text-align:center;">#</th>
        <th style="width:75px;text-align:${dir === 'rtl' ? 'right' : 'left'};">${isKurdish ? ku('پسوولە') : 'Purchase #'}</th>
        <th style="width:130px;text-align:${dir === 'rtl' ? 'right' : 'left'};">${isKurdish ? ku('دابینکەر') : 'Supplier'}</th>
        <th style="width:90px;text-align:center;">${isKurdish ? ku('بەروار') : 'Date'}</th>
        <th style="text-align:${dir === 'rtl' ? 'right' : 'left'};">${isKurdish ? ku('بەرهەم و جۆر') : 'Product & Category'}</th>
        <th style="width:55px;text-align:center;">${isKurdish ? ku('دانە') : 'Qty'}</th>
        <th style="width:125px;text-align:${dir === 'rtl' ? 'left' : 'right'};">${isKurdish ? ku('نرخی دانە') : 'Unit Price'} (${isUsd ? '$' : 'IQD'})</th>
        <th style="width:85px;text-align:center;">${isKurdish ? ku('دۆخ') : 'Status'}</th>
        <th style="width:120px;text-align:${dir === 'rtl' ? 'left' : 'right'};">${isKurdish ? ku('کۆی گشتی') : 'Total'} (${isUsd ? '$' : 'IQD'})</th>
      </tr>
    </thead>
    <tbody>
      ${rowsHTML}
    </tbody>
    ${purchases.length > 0 ? `
    <tfoot>
      <tr>
        <td colspan="4" style="text-align:${dir === 'rtl' ? 'right' : 'left'};color:#0F172A;font-weight:800;font-size:13px;">
          ${isKurdish ? ku('کۆی گشتی هەموو کڕینەکان:') : 'Grand Total for All Purchases:'}
        </td>
        <td style="text-align:${dir === 'rtl' ? 'right' : 'left'};color:#64748B;font-size:11px;">
          ${isKurdish ? ku('کۆی دانە:') : 'Total Qty:'}
        </td>
        <td style="text-align:center;color:#0F172A;font-weight:800;">
          <span class="en-num" dir="ltr">${totalItemsCount}</span>
        </td>
        <td colspan="2" style="text-align:center;color:#64748B;font-size:11.5px;">
          <span style="display:inline-flex;gap:10px;align-items:center;">
            <span>${isKurdish ? ku('دراو') : 'Paid'}: <b class="en-num" dir="ltr" style="color:#059669;display:inline-block;unicode-bidi:isolate;">${fmtMoney(paidTotalIQD)}</b></span>
            <span style="color:#CBD5E1;">&bull;</span>
            <span>${isKurdish ? ku('قەرز') : 'Debt'}: <b class="en-num" dir="ltr" style="color:${debtTotalIQD > 0 ? '#DC2626' : '#64748B'};display:inline-block;unicode-bidi:isolate;">${fmtMoney(debtTotalIQD)}</b></span>
          </span>
        </td>
        <td style="text-align:${dir === 'rtl' ? 'left' : 'right'};color:#0284C7;font-weight:800;font-size:13px;white-space:nowrap;">
          <span class="en-num" dir="ltr" style="display:inline-block;unicode-bidi:isolate;">${fmtMoney(totalCostIQD)}</span>
        </td>
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
      <div class="signoff-label">${isKurdish ? ku('واژووی وردبینیکاری کڕین / ژمێریار:') : 'Purchasing Auditor / Accountant Signature:'}</div>
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
