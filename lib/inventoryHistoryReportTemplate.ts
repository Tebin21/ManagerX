import type { InventoryHistoryItem } from '@/types/inventory';
import { fmtIQD, fmtUSD, formatDate as fmtDate, formatTime } from '@/utils/formatters';
import { KURDISH_FONT_FACE, PDF_BRAND_WEBSITE, pdfDevelopedByText, kuSpan, isKurdishPdfActive } from '@/lib/pdfFont';
import { useSettingsStore } from '@/store/settingsStore';

interface BusinessInfo {
  name: string;
  phone: string;
  address: string;
  logoUri: string | null;
}

import { escHtml, sanitizeImageUri } from '@/lib/security';

const ku = kuSpan;

export function buildInventoryHistoryReportHTML(
  items: InventoryHistoryItem[],
  periodLabel: string,
  business: BusinessInfo,
  dir: 'ltr' | 'rtl' = 'rtl'
): string {
  const isKurdish = dir === 'rtl' || isKurdishPdfActive();
  const lang = isKurdish ? 'ku' : 'en';

  const baseCurrency = useSettingsStore.getState().baseCurrency || 'IQD';
  const rate = useSettingsStore.getState().exchangeRate || 1310;
  const isUsd = baseCurrency === 'USD';
  const fmtMoney = (val: number) => isUsd ? `$${fmtUSD(val / rate)}` : `${fmtIQD(val)}&nbsp;IQD`;

  const now = new Date();
  const dateStr = fmtDate(now.toISOString());
  const timeStr = formatTime(now);
  const reportId = `DPR-${now.toISOString().slice(0, 10).replace(/-/g, '')}-${Math.random().toString(16).slice(2, 6).toUpperCase()}`;

  // Computations
  const totalProducts = items.length;
  const totalPurchaseValue = items.reduce((sum, it) => sum + (it.purchasePrice || 0), 0);
  const totalSellingValue = items.reduce((sum, it) => sum + (it.sellingPrice || 0), 0);
  const totalSoldUnits = items.reduce((sum, it) => sum + (it.quantitySold || 0), 0);

  const safeLogoUri = sanitizeImageUri(business.logoUri);
  const logoHTML = safeLogoUri
    ? `<img src="${safeLogoUri}" style="height:55px;max-width:140px;object-fit:contain;display:block;background:#fff;border-radius:8px;padding:4px;border:1px solid #E2E8F0;" alt="logo" />`
    : '';

  const rowsHTML = items.length === 0
    ? `<tr><td colspan="8" style="text-align:center;color:#94A3B8;padding:28px;font-style:italic;">${isKurdish ? ku('هیچ بەرهەمێکی سڕاوە لەم ماوەیەدا نییە') : 'No deleted products found for this period'}</td></tr>`
    : items.map((item, idx) => {
        const dateFormatted = item.archivedAt ? fmtDate(item.archivedAt) : '—';
        return `
          <tr style="background:${idx % 2 === 0 ? '#FFFFFF' : '#F8FAFC'};">
            <td style="text-align:center;color:#64748B;font-size:11px;"><span class="en-num" dir="ltr">${idx + 1}</span></td>
            <td style="font-weight:700;color:#0F172A;text-align:${dir === 'rtl' ? 'right' : 'left'};">
              <div>${escHtml(item.productName)}</div>
              ${item.itemId ? `<div class="en-num" dir="ltr" style="font-size:10.5px;color:#64748B;display:inline-block;unicode-bidi:isolate;">${escHtml(item.itemId)}</div>` : ''}
            </td>
            <td style="text-align:${dir === 'rtl' ? 'right' : 'left'};">
              <span style="background:#F1F5F9;color:#475569;border:1px solid #E2E8F0;padding:2px 8px;border-radius:6px;font-size:11px;font-weight:600;">${escHtml(item.category || 'General')}</span>
            </td>
            <td style="text-align:center;font-weight:700;color:#0F172A;"><span class="en-num" dir="ltr">${item.quantitySold ?? 0}</span></td>
            <td style="text-align:${dir === 'rtl' ? 'left' : 'right'};color:#475569;font-weight:600;white-space:nowrap;"><span class="en-num" dir="ltr">${fmtMoney(item.purchasePrice)}</span></td>
            <td style="text-align:${dir === 'rtl' ? 'left' : 'right'};font-weight:700;color:#0F172A;white-space:nowrap;"><span class="en-num" dir="ltr">${fmtMoney(item.sellingPrice)}</span></td>
            <td style="font-size:11.5px;color:#475569;white-space:nowrap;text-align:center;"><span class="en-num" dir="ltr">${dateFormatted}</span></td>
            <td style="text-align:center;">
              <span style="background:#FEF2F2;color:#DC2626;border:1px solid #FECACA;padding:2px 8px;border-radius:6px;font-size:11px;font-weight:700;">${isKurdish ? ku('سڕاوەتەوە') : 'Removed'}</span>
            </td>
          </tr>
        `;
      }).join('');

  return `<!DOCTYPE html>
<html lang="${lang}" dir="${dir}">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1.0"/>
<title>${isKurdish ? `جەردی بەرهەمە سڕاوەکان — ${escHtml(business.name)}` : `Deleted Products Audit Report — ${escHtml(business.name)}`}</title>
<style>
  ${KURDISH_FONT_FACE}
  * {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
    font-family: ${isKurdish ? `'Bahij Janna', 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif` : `'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, 'Bahij Janna', sans-serif`};
  }
  body {
    direction: ${dir};
    font-family: ${isKurdish ? `'Bahij Janna', 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif` : `'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, 'Bahij Janna', sans-serif`};
    background: #F8FAFC;
    color: #0F172A;
    font-size: 12.5px;
    line-height: 1.5;
  }
  .en-num, .font-mono, [dir="ltr"] {
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif !important;
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
          <div class="report-badge">${isKurdish ? ku('جەردی بەرهەمە سڕاوەکان') : 'Deleted Products Report'}</div>
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
      <div class="kpi-label">${isKurdish ? ku('کۆی بەرهەمە سڕاوەکان') : 'Total Deleted Items'}</div>
      <div class="kpi-value en-num" dir="ltr">${totalProducts}</div>
      <div class="kpi-sub">${isKurdish ? ku('بەرهەم') : 'Products'}</div>
    </div>
    <div class="kpi-card">
      <div class="kpi-label">${isKurdish ? ku('کۆی دانەی فرۆشراو') : 'Total Sold Units'}</div>
      <div class="kpi-value en-num" dir="ltr">${totalSoldUnits}</div>
      <div class="kpi-sub">${isKurdish ? ku('دانە پێش سڕینەوە') : 'Units before deletion'}</div>
    </div>
    <div class="kpi-card">
      <div class="kpi-label">${isKurdish ? ku('کۆی نرخی کڕین') : 'Total Buy Value'}</div>
      <div class="kpi-value en-num" dir="ltr" style="color:#059669;">${fmtMoney(totalPurchaseValue)}</div>
      <div class="kpi-sub">${isKurdish ? ku('بەپێی کۆی نرخی کڕین') : 'Based on buy price'}</div>
    </div>
    <div class="kpi-card">
      <div class="kpi-label">${isKurdish ? ku('کۆی نرخی فرۆشتن') : 'Total Sell Value'}</div>
      <div class="kpi-value en-num" dir="ltr" style="color:#D97706;">${fmtMoney(totalSellingValue)}</div>
      <div class="kpi-sub">${isKurdish ? ku('بەپێی کۆی نرخی فرۆشتن') : 'Based on sell price'}</div>
    </div>
  </div>

  <!-- Table Title -->
  <div class="section-title">
    <span>${isKurdish ? ku('لیستی وردەکاری بەرهەمە سڕاوەکان') : 'Deleted Products Breakdown'}</span>
    <span style="font-size:12px;color:#64748B;font-weight:600;">${totalProducts} ${isKurdish ? ku('بەرهەم') : 'products'}</span>
  </div>

  <!-- Items Table -->
  <table>
    <thead>
      <tr>
        <th style="width:40px;text-align:center;">#</th>
        <th style="text-align:${dir === 'rtl' ? 'right' : 'left'};">${isKurdish ? ku('ناوی بەرهەم و کۆد') : 'Product & Code'}</th>
        <th style="text-align:${dir === 'rtl' ? 'right' : 'left'};">${isKurdish ? ku('پۆلێن') : 'Category'}</th>
        <th style="text-align:center;">${isKurdish ? ku('کۆی فرۆشراو') : 'Sold Qty'}</th>
        <th style="text-align:${dir === 'rtl' ? 'left' : 'right'};">${isKurdish ? ku('نرخی کڕین') : 'Buy Price'}</th>
        <th style="text-align:${dir === 'rtl' ? 'left' : 'right'};">${isKurdish ? ku('نرخی فرۆشتن') : 'Sell Price'}</th>
        <th style="text-align:center;">${isKurdish ? ku('بەرواری سڕینەوە') : 'Archived Date'}</th>
        <th style="text-align:center;">${isKurdish ? ku('دۆخ') : 'Status'}</th>
      </tr>
    </thead>
    <tbody>
      ${rowsHTML}
    </tbody>
    ${items.length > 0 ? `
    <tfoot>
      <tr>
        <td colspan="4" style="text-align:${dir === 'rtl' ? 'right' : 'left'};color:#475569;font-weight:700;">${isKurdish ? ku('کۆی گشتی:') : 'Total:'}</td>
        <td style="text-align:${dir === 'rtl' ? 'left' : 'right'};color:#059669;" class="en-num" dir="ltr">${fmtMoney(totalPurchaseValue)}</td>
        <td style="text-align:${dir === 'rtl' ? 'left' : 'right'};color:#0F172A;" class="en-num" dir="ltr">${fmtMoney(totalSellingValue)}</td>
        <td colspan="2"></td>
      </tr>
    </tfoot>` : ''}
  </table>

  <!-- Sign-off Block -->
  <div class="signoff-box">
    <div class="signoff-col">
      <div class="signoff-label">${isKurdish ? ku('ئامادەکاری کۆگا:') : 'Inventory Clerk:'}</div>
      <div class="signoff-line">${isKurdish ? ku('واژۆ و مۆر') : 'Signature & Stamp'}</div>
    </div>
    <div class="signoff-col">
      <div class="signoff-label">${isKurdish ? ku('وردبینی و پشکنین:') : 'Audited By:'}</div>
      <div class="signoff-line">${isKurdish ? ku('واژۆ و بەروار') : 'Signature & Date'}</div>
    </div>
    <div class="signoff-col">
      <div class="signoff-label">${isKurdish ? ku('پەسەندکردنی بەڕێوەبەر:') : 'Management Approval:'}</div>
      <div class="signoff-line">${isKurdish ? ku('واژۆ') : 'Signature'}</div>
    </div>
  </div>

  <!-- Footer -->
  <div class="footer">
    ${isKurdish
      ? `${ku(pdfDevelopedByText())} &bull; ${PDF_BRAND_WEBSITE} &bull; ${dateStr} &bull; ${timeStr}`
      : `${pdfDevelopedByText()} &bull; ${PDF_BRAND_WEBSITE} &bull; ${dateStr} at ${timeStr}`}
  </div>

</div>
</body>
</html>`;
}
