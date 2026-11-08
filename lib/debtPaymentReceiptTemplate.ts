import type { DebtPaymentReceiptData } from '@/types/debt';
import { fmtIQD, fmtUSD, formatDate, formatTime } from '@/utils/formatters';
import { KURDISH_FONT_FACE, PDF_BRAND_WEBSITE } from '@/lib/pdfFont';
import { escHtml, sanitizeImageUri } from '@/lib/security';

export interface DebtPaymentBusinessInfo {
  name: string;
  phone: string;
  address: string;
  logoUri?: string | null;
}

export type DebtReceiptPaperSize = 'A4' | '110mm' | '80mm' | '58mm';

/**
 * Builds A4 Sheet HTML for Debt Payment Receipt.
 */
export function buildDebtPaymentA4HTML(
  receipt: DebtPaymentReceiptData,
  business: DebtPaymentBusinessInfo,
  exchangeRate: number = 1310
): string {
  const isCustomerPayment = receipt.debtType === 'sales';
  const isSettled = receipt.remainingAfter <= 0;

  const docTitle = isCustomerPayment ? 'وەسڵی وەرگرتنی پارەی قەرز' : 'وەسڵی دانەوەی قەرزی دابینکەر';
  const partyRoleLabel = isCustomerPayment ? 'کڕیار' : 'دابینکەر';
  const statusLabel = isSettled ? 'تەواوبوو (بێ باڵانس)' : 'بەشێکی دراوە (قەرز ماوە)';

  const paymentMethodLabel = receipt.paymentMethod?.toLowerCase() === 'fib' ? 'FIB (ئۆنلاین)' : 'کاش (نەقد)';

  const dateStr = formatDate(receipt.createdAt);
  const timeStr = formatTime(receipt.createdAt);

  const logoHtml = business.logoUri
    ? `<img src="${sanitizeImageUri(business.logoUri)}" class="logo-img" alt="Logo" />`
    : `<div class="logo-mono">${escHtml(business.name?.charAt(0) || 'F')}</div>`;

  return `<!DOCTYPE html>
<html lang="ku" dir="rtl">
<head>
  <meta charset="UTF-8">
  <title>${escHtml(docTitle)} - ${escHtml(receipt.paymentNumber)}</title>
  <style>
    ${KURDISH_FONT_FACE}
    @page {
      size: A4 portrait;
      margin: 12mm 14mm 14mm 14mm;
    }
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
      font-family: 'Bahij Janna', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    }
    body {
      font-family: 'Bahij Janna', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      direction: rtl;
      background: #FFFFFF;
      color: #000000;
      font-size: 13px;
      line-height: 1.5;
      padding: 0;
    }
    .en-num, .font-mono, [dir="ltr"] {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif !important;
    }
    .page-container {
      max-width: 780px;
      margin: 0 auto;
      background: #FFFFFF;
    }

    /* ── Header ── */
    .header-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 22px;
      padding-bottom: 16px;
      border-bottom: 2px solid #000000;
    }
    .header-table td { vertical-align: middle; }
    .logo-td { width: 75px; text-align: right; }
    .logo-img { max-height: 65px; max-width: 130px; object-fit: contain; filter: grayscale(100%); }
    .logo-mono {
      width: 55px; height: 55px; border-radius: 8px;
      background: #FFFFFF; color: #000000;
      display: inline-flex; align-items: center; justify-content: center;
      font-size: 24px; font-weight: 900; border: 1.5px solid #000000;
    }
    .biz-info-td { padding-right: 14px; text-align: right; }
    .biz-name { font-size: 20px; font-weight: 900; color: #000000; margin-bottom: 3px; }
    .biz-meta { font-size: 12px; color: #000000; font-weight: 600; }

    .doc-meta-td { text-align: left; vertical-align: top; }
    .doc-title { font-size: 17px; font-weight: 900; color: #000000; margin-bottom: 4px; }
    .doc-number { font-size: 14px; font-weight: 800; color: #000000; font-family: monospace; letter-spacing: 0.5px; }
    .doc-date-time { font-size: 11.5px; color: #000000; font-weight: 600; margin-top: 3px; }
    .status-pill {
      display: inline-block;
      padding: 3px 10px;
      border-radius: 6px;
      font-size: 11px;
      font-weight: 800;
      color: #000000;
      background: #FFFFFF;
      margin-top: 5px;
      border: 1.5px solid #000000;
    }

    /* ── Party Card ── */
    .party-card {
      background: #FFFFFF;
      border: 1.5px solid #000000;
      border-radius: 8px;
      padding: 14px 18px;
      margin-bottom: 22px;
    }
    .party-card-title {
      font-size: 11px;
      font-weight: 800;
      color: #000000;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 8px;
    }
    .party-name {
      font-size: 17px;
      font-weight: 900;
      color: #000000;
      margin-bottom: 4px;
    }
    .party-details-grid {
      display: flex;
      flex-wrap: wrap;
      gap: 16px;
      margin-top: 6px;
      font-size: 12px;
      color: #000000;
      font-weight: 600;
    }
    .party-details-item { display: inline-flex; align-items: center; gap: 5px; }

    /* ── Financial Cards Grid ── */
    .financial-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 14px;
      margin-bottom: 24px;
    }
    .fin-box {
      border-radius: 8px;
      padding: 16px;
      text-align: center;
      border: 1.5px solid #000000;
      background: #FFFFFF;
    }
    .fin-box-prev { background: #FFFFFF; border-color: #000000; }
    .fin-box-paid { background: #F4F4F5; border: 2px solid #000000; }
    .fin-box-rem { background: #FFFFFF; border-color: #000000; }
    .fin-label { font-size: 12px; font-weight: 800; color: #000000; margin-bottom: 6px; }
    .fin-value { font-size: 19px; font-weight: 900; line-height: 1.2; color: #000000; }
    .fin-value-prev { color: #000000; }
    .fin-value-paid { color: #000000; }
    .fin-value-rem { color: #000000; }
    .fin-sub { font-size: 11px; font-weight: 700; color: #000000; margin-top: 3px; }

    /* ── Meta details row ── */
    .meta-table {
      width: 100%;
      border-collapse: collapse;
      background: #FFFFFF;
      border: 1.5px solid #000000;
      border-radius: 8px;
      overflow: hidden;
      margin-bottom: 30px;
    }
    .meta-table td {
      padding: 10px 16px;
      border-bottom: 1px solid #000000;
      font-size: 12.5px;
    }
    .meta-table tr:last-child td { border-bottom: none; }
    .meta-label { color: #000000; font-weight: 800; width: 35%; text-align: right; }
    .meta-val { color: #000000; font-weight: 800; text-align: left; }

    /* ── Signatures ── */
    .signatures-table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 40px;
      margin-bottom: 25px;
    }
    .signatures-table td {
      width: 50%;
      text-align: center;
      vertical-align: bottom;
      padding: 0 20px;
    }
    .sig-line {
      border-top: 1.5px dashed #000000;
      margin-top: 45px;
      padding-top: 8px;
      font-size: 12px;
      font-weight: 800;
      color: #000000;
    }

    /* ── Footer ── */
    .footer {
      border-top: 1px solid #000000;
      padding-top: 12px;
      text-align: center;
      font-size: 11px;
      color: #000000;
      font-weight: 700;
    }
  </style>
</head>
<body>
  <div class="page-container">
    <!-- Header -->
    <table class="header-table">
      <tr>
        ${business.logoUri ? `<td class="logo-td">${logoHtml}</td>` : ''}
        <td class="biz-info-td">
          <div class="biz-name">${escHtml(business.name || 'فرۆشیار')}</div>
          <div class="biz-meta">
            ${business.phone ? `<span>تەلەفۆن: ${escHtml(business.phone)}</span>` : ''}
            ${business.address ? ` · <span>${escHtml(business.address)}</span>` : ''}
          </div>
        </td>
        <td class="doc-meta-td">
          <div class="doc-title">${escHtml(docTitle)}</div>
          <div class="doc-number">${escHtml(receipt.paymentNumber)}</div>
          <div class="doc-date-time" dir="ltr" style="unicode-bidi:embed;white-space:nowrap;">${dateStr}${timeStr ? ` · ${timeStr}` : ''}</div>
          <div><span class="status-pill">${escHtml(statusLabel)}</span></div>
        </td>
      </tr>
    </table>

    <!-- Party Info Card -->
    <div class="party-card">
      <div class="party-card-title">زانیارییەکانی ${partyRoleLabel}</div>
      <div class="party-name">${escHtml(receipt.partyName)}</div>
      <div class="party-details-grid">
        ${receipt.partyPhone ? `<div class="party-details-item"><span>📞 تەلەفۆن:</span> <strong>${escHtml(receipt.partyPhone)}</strong></div>` : ''}
        ${receipt.partyAddress ? `<div class="party-details-item"><span>📍 ناونیشان:</span> <strong>${escHtml(receipt.partyAddress)}</strong></div>` : ''}
        ${receipt.referenceNumber ? `<div class="party-details-item"><span>📄 پسوولەی سەرەکی:</span> <strong>#${escHtml(receipt.referenceNumber)}</strong></div>` : ''}
      </div>
    </div>

    <!-- Financial Cards -->
    <div class="financial-grid">
      <div class="fin-box fin-box-prev">
        <div class="fin-label">قەرزی پێش ئەم پارەدانە</div>
        <div class="fin-value fin-value-prev">${fmtIQD(receipt.previousBalance)}</div>
        <div class="fin-sub">IQD</div>
      </div>
      <div class="fin-box fin-box-paid">
        <div class="fin-label">${isCustomerPayment ? 'بڕی وەرگیراو لە کڕیار' : 'بڕی دراو بە دابینکەر'}</div>
        <div class="fin-value fin-value-paid">+ ${fmtIQD(receipt.amount)}</div>
        <div class="fin-sub">IQD (${fmtUSD(receipt.amount / exchangeRate)} USD)</div>
      </div>
      <div class="fin-box fin-box-rem">
        <div class="fin-label">قەرزی ماوەی دوای ئەم پارەدانە</div>
        <div class="fin-value fin-value-rem">${fmtIQD(receipt.remainingAfter)}</div>
        <div class="fin-sub">${isSettled ? 'قەرز نەماوە' : 'IQD'}</div>
      </div>
    </div>

    <!-- Meta Details Table -->
    <table class="meta-table">
      <tr>
        <td class="meta-label">شێوازی پارەدان:</td>
        <td class="meta-val">${escHtml(paymentMethodLabel)}</td>
      </tr>
      <tr>
        <td class="meta-label">جۆری جووڵەی دارایی:</td>
        <td class="meta-val">${isCustomerPayment ? 'وەرگرتنی قیست / قەرز (Cash In)' : 'دانەوەی پارەی وەکیل (Cash Out)'}</td>
      </tr>
      ${receipt.note ? `<tr><td class="meta-label">تێبینی:</td><td class="meta-val">${escHtml(receipt.note)}</td></tr>` : ''}
    </table>

    <!-- Signatures -->
    <table class="signatures-table">
      <tr>
        <td>
          <div class="sig-line">واژووی ${partyRoleLabel} (${escHtml(receipt.partyName)})</div>
        </td>
        <td>
          <div class="sig-line">واژووی وەرگر / سەرپەرشتیار</div>
        </td>
      </tr>
    </table>

    <!-- Footer -->
    <div class="footer">
      سوپاس بۆ پابەندبوونتان · ${PDF_BRAND_WEBSITE} · سیستەمی بەڕێوەبردنی Froshiar
    </div>
  </div>
</body>
</html>`;
}

/**
 * Builds Thermal Receipt HTML for Debt Payment (58mm, 80mm, 110mm).
 */
export function buildDebtPaymentThermalHTML(
  receipt: DebtPaymentReceiptData,
  business: DebtPaymentBusinessInfo,
  width: '58mm' | '80mm' | '110mm' = '80mm',
  exchangeRate: number = 1310
): string {
  const isCustomerPayment = receipt.debtType === 'sales';
  const isSettled = receipt.remainingAfter <= 0;

  let pageWidthMm = 80;
  let bodyWidthMm = 74;
  let baseFontSizePx = 12.5;
  let titleFontSizePx = 16;
  let pageMargin = '2.5mm 2.5mm';

  if (width === '58mm') {
    pageWidthMm = 58;
    bodyWidthMm = 52;
    baseFontSizePx = 10.5;
    titleFontSizePx = 14;
    pageMargin = '1.5mm 1.5mm';
  } else if (width === '110mm') {
    pageWidthMm = 110;
    bodyWidthMm = 102;
    baseFontSizePx = 13.5;
    titleFontSizePx = 18;
    pageMargin = '3.5mm 3.5mm';
  }

  const docTitle = isCustomerPayment ? 'وەسڵی وەرگرتنی قەرز' : 'وەسڵی دانەوەی قەرز';
  const partyRoleLabel = isCustomerPayment ? 'کڕیار' : 'دابینکەر';
  const statusLabel = isSettled ? 'قەرز تەواوبوو' : 'بەشێکی دراوە';

  const paymentMethodLabel = receipt.paymentMethod?.toLowerCase() === 'fib' ? 'FIB' : 'کاش (نەقد)';
  const dateStr = formatDate(receipt.createdAt);
  const timeStr = formatTime(receipt.createdAt);

  return `<!DOCTYPE html>
<html lang="ku" dir="rtl">
<head>
  <meta charset="UTF-8">
  <title>${escHtml(docTitle)} - ${escHtml(receipt.paymentNumber)}</title>
  <style>
    ${KURDISH_FONT_FACE}
    @page {
      size: ${pageWidthMm}mm auto;
      margin: ${pageMargin};
    }
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
      font-family: 'Bahij Janna', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    }
    body {
      font-family: 'Bahij Janna', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      direction: rtl;
      background: #FFFFFF;
      color: #000000;
      font-size: ${baseFontSizePx}px;
      line-height: 1.4;
      width: ${bodyWidthMm}mm;
      margin: 0 auto;
      padding: 2mm 0;
    }
    .text-center { text-align: center; }
    .text-right { text-align: right; }
    .text-left { text-align: left; }
    .font-bold { font-weight: 800; }
    .font-mono, .en-num, [dir="ltr"] {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif !important;
    }
    
    .divider {
      border-top: 1px dashed #000;
      margin: 6px 0;
    }
    .double-divider {
      border-top: 2px solid #000;
      margin: 6px 0;
    }

    .biz-header { text-align: center; margin-bottom: 4px; }
    .biz-name { font-size: ${titleFontSizePx}px; font-weight: 900; color: #000; }
    .biz-sub { font-size: ${baseFontSizePx - 1}px; color: #000; margin-top: 1px; }

    .doc-badge {
      display: inline-block;
      padding: 2px 8px;
      border: 1.5px solid #000;
      border-radius: 4px;
      font-weight: 800;
      font-size: ${baseFontSizePx}px;
      margin: 4px 0;
      color: #000;
      background: #FFF;
    }

    .row {
      display: flex;
      flex-direction: row;
      justify-content: space-between;
      align-items: center;
      margin: 3px 0;
      font-size: ${baseFontSizePx}px;
    }
    .row-label { color: #000; font-weight: 700; text-align: right; }
    .row-value { color: #000; font-weight: 800; text-align: left; }

    .amount-highlight-box {
      border: 2px solid #000;
      border-radius: 6px;
      padding: 6px;
      margin: 6px 0;
      text-align: center;
      background: #FFF;
    }
    .amount-highlight-label { font-size: ${baseFontSizePx - 1}px; font-weight: 800; color: #000; }
    .amount-highlight-val { font-size: ${titleFontSizePx + 2}px; font-weight: 900; color: #000; }

    .footer {
      text-align: center;
      font-size: ${baseFontSizePx - 2}px;
      color: #000;
      margin-top: 8px;
      font-weight: 600;
    }
  </style>
</head>
<body>
  <div class="biz-header">
    <div class="biz-name">${escHtml(business.name || 'فرۆشیار')}</div>
    ${business.phone ? `<div class="biz-sub">📞 ${escHtml(business.phone)}</div>` : ''}
    ${business.address ? `<div class="biz-sub">${escHtml(business.address)}</div>` : ''}
  </div>

  <div class="text-center">
    <div class="doc-badge">${escHtml(docTitle)}</div>
  </div>

  <div class="row">
    <span class="row-label">ژمارەی وەسڵ:</span>
    <span class="row-value font-mono">${escHtml(receipt.paymentNumber)}</span>
  </div>
  <div class="row">
    <span class="row-label">ڕێکەوت و کات:</span>
    <span class="row-value font-mono" dir="ltr" style="unicode-bidi:embed;white-space:nowrap;">${[dateStr, timeStr].filter(Boolean).join(' ')}</span>
  </div>

  <div class="divider"></div>

  <div class="row">
    <span class="row-label">${partyRoleLabel}:</span>
    <span class="row-value">${escHtml(receipt.partyName)}</span>
  </div>
  ${receipt.partyPhone ? `
  <div class="row">
    <span class="row-label">تەلەفۆن:</span>
    <span class="row-value font-mono">${escHtml(receipt.partyPhone)}</span>
  </div>` : ''}
  ${receipt.referenceNumber ? `
  <div class="row">
    <span class="row-label">پسوولەی سەرەکی:</span>
    <span class="row-value font-mono">#${escHtml(receipt.referenceNumber)}</span>
  </div>` : ''}

  <div class="divider"></div>

  <div class="row">
    <span class="row-label">قەرزی پێشوو:</span>
    <span class="row-value font-mono">${fmtIQD(receipt.previousBalance)} IQD</span>
  </div>

  <!-- Prominent Paid Amount Box -->
  <div class="amount-highlight-box">
    <div class="amount-highlight-label">${isCustomerPayment ? 'بڕی وەرگیراو لە کڕیار' : 'بڕی دراو بە دابینکەر'}</div>
    <div class="amount-highlight-val font-mono">+ ${fmtIQD(receipt.amount)} IQD</div>
    <div style="font-size:${baseFontSizePx - 2}px; font-weight:700; color:#000;">($${fmtUSD(receipt.amount / exchangeRate)} USD)</div>
  </div>

  <div class="row">
    <span class="row-label">قەرزی ماوە:</span>
    <span class="row-value font-mono" style="font-weight:900;">${fmtIQD(receipt.remainingAfter)} IQD</span>
  </div>

  <div class="row">
    <span class="row-label">شێوازی پارەدان:</span>
    <span class="row-value">${escHtml(paymentMethodLabel)}</span>
  </div>

  <div class="row">
    <span class="row-label">دۆخی قەرز:</span>
    <span class="row-value font-bold">${escHtml(statusLabel)}</span>
  </div>

  <div class="double-divider"></div>

  <div class="footer">
    <div>سوپاس بۆ مامەڵەکەتان</div>
    <div style="margin-top:2px;">${PDF_BRAND_WEBSITE} · Froshiar</div>
  </div>
</body>
</html>`;
}

/**
 * Universal HTML builder based on chosen paper size.
 */
export function buildDebtPaymentHTML(
  receipt: DebtPaymentReceiptData,
  business: DebtPaymentBusinessInfo,
  paperSize: DebtReceiptPaperSize = 'A4',
  exchangeRate: number = 1310
): string {
  if (paperSize === 'A4') {
    return buildDebtPaymentA4HTML(receipt, business, exchangeRate);
  }
  return buildDebtPaymentThermalHTML(receipt, business, paperSize, exchangeRate);
}

