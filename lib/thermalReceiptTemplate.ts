/**
 * thermalReceiptTemplate.ts
 *
 * High-performance, pixel-precise HTML generator for thermal receipt printers
 * supporting 58mm (5.8 cm), 80mm (8.0 cm), and 110mm (11.0 cm) roll paper.
 *
 * Key Characteristics:
 * - NO business logo/photo displayed (per user specifications).
 * - Full Kurdish RTL font support via Bahij Janna embedded font.
 * - Dynamic field toggles based on user's ThermalReceiptSettings.
 * - Continuous receipt styling with monospace/clean numbers and dashed dividers.
 */

import type { Sale } from '@/types/sales';
import { fmtIQD, fmtUSD, formatDate, formatTime, getPaymentStatus } from '@/utils/formatters';
import { KURDISH_FONT_FACE, kuSpan, isKurdishPdfActive } from '@/lib/pdfFont';
import {
  type ThermalReceiptWidth,
  type ThermalReceiptSettings,
  DEFAULT_THERMAL_RECEIPT_SETTINGS,
  useSettingsStore,
} from '@/store/settingsStore';
import type { ReceiptCurrencyMode } from './invoiceTemplate';
import { escHtml } from '@/lib/security';

interface BusinessInfo {
  name: string;
  phone?: string;
  address?: string;
}

const ku = kuSpan;

/**
 * Builds barcode simulation bars for the thermal receipt footer
 */
function buildBarcodeSvg(code: string): string {
  const cleanCode = (code || 'FROSHIAR').replace(/[^a-zA-Z0-9-]/g, '');
  // Deterministic bar widths based on char codes
  const bars: string[] = [];
  let totalWidth = 0;
  for (let i = 0; i < cleanCode.length; i++) {
    const val = cleanCode.charCodeAt(i);
    const w1 = (val % 3) + 1.2;
    const w2 = ((val >> 1) % 2) + 1;
    const w3 = ((val >> 2) % 3) + 1.5;
    bars.push(`<rect x="${totalWidth.toFixed(1)}" y="0" width="${w1.toFixed(1)}" height="38" fill="#000000"/>`);
    totalWidth += w1 + 1.2;
    bars.push(`<rect x="${totalWidth.toFixed(1)}" y="0" width="${w2.toFixed(1)}" height="38" fill="#000000"/>`);
    totalWidth += w2 + 1.6;
    bars.push(`<rect x="${totalWidth.toFixed(1)}" y="0" width="${w3.toFixed(1)}" height="38" fill="#000000"/>`);
    totalWidth += w3 + 1.4;
  }
  return `
    <div class="barcode-wrap">
      <svg width="${Math.min(totalWidth, 180)}" height="38" viewBox="0 0 ${totalWidth} 38" preserveAspectRatio="none">
        ${bars.join('')}
      </svg>
      <div class="barcode-num">${escHtml(cleanCode)}</div>
    </div>
  `;
}

/**
 * Generates thermal receipt CSS rules for 58mm, 80mm, and 110mm widths.
 */
function buildThermalCSS(width: ThermalReceiptWidth, isKurdish: boolean): string {
  const kuAlign = isKurdish ? 'right' : 'left';
  const numAlign = isKurdish ? 'left' : 'right';

  // Config parameters based on thermal paper width
  let pageWidthMm = 58;
  let bodyWidthMm = 52;
  let baseFontSizePx = 11;
  let titleFontSizePx = 15;
  let pageMargin = '1.5mm 1.5mm';

  if (width === '80mm') {
    pageWidthMm = 80;
    bodyWidthMm = 74;
    baseFontSizePx = 12.5;
    titleFontSizePx = 17;
    pageMargin = '2.5mm 2.5mm';
  } else if (width === '110mm') {
    pageWidthMm = 110;
    bodyWidthMm = 102;
    baseFontSizePx = 13.5;
    titleFontSizePx = 19;
    pageMargin = '3.5mm 3.5mm';
  }

  return `
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
    }
    body {
      width: ${bodyWidthMm}mm;
      max-width: ${bodyWidthMm}mm;
      margin: 0 auto;
      background: #ffffff;
      color: #000000;
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, 'Bahij Janna', sans-serif;
      font-size: ${baseFontSizePx}px;
      line-height: 1.35;
      direction: ${isKurdish ? 'rtl' : 'ltr'};
    }
    .ku-text {
      font-family: 'Bahij Janna', 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      direction: rtl;
      unicode-bidi: isolate;
    }
    .receipt-container {
      width: 100%;
      padding: 2px 0 10px;
    }

    /* ── Header ── */
    .biz-header {
      text-align: center;
      padding-bottom: 6px;
    }
    .biz-name {
      font-size: ${titleFontSizePx}px;
      font-weight: 800;
      letter-spacing: -0.2px;
      margin-bottom: 2px;
      text-transform: uppercase;
      word-break: break-word;
    }
    .biz-contact {
      font-size: ${baseFontSizePx - 1}px;
      color: #222222;
      line-height: 1.3;
      margin-top: 1px;
      word-break: break-word;
    }

    /* ── Dividers ── */
    .divider-dashed {
      border-top: 1px dashed #000000;
      margin: 6px 0;
    }
    .divider-solid {
      border-top: 1.5px solid #000000;
      margin: 6px 0;
    }
    .divider-double {
      border-top: 3px double #000000;
      margin: 7px 0;
    }

    /* ── Info Rows (Key-Value) ── */
    .info-section {
      padding: 2px 0;
    }
    .info-row {
      display: flex;
      flex-direction: ${isKurdish ? 'row-reverse' : 'row'};
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 2px;
      font-size: ${baseFontSizePx - 0.5}px;
    }
    .info-label {
      color: #333333;
      font-weight: 600;
      white-space: nowrap;
    }
    .info-value {
      color: #000000;
      font-weight: 700;
      text-align: ${isKurdish ? 'left' : 'right'};
      word-break: break-word;
    }

    /* ── Items Table ── */
    .items-table {
      width: 100%;
      border-collapse: collapse;
      margin: 4px 0;
    }
    .items-table th {
      border-top: 1px dashed #000000;
      border-bottom: 1px dashed #000000;
      padding: 4px 2px;
      font-size: ${baseFontSizePx - 1}px;
      font-weight: 800;
      text-transform: uppercase;
      text-align: ${kuAlign};
    }
    .items-table th.num-col, .items-table td.num-col {
      text-align: ${numAlign};
      white-space: nowrap !important;
    }
    .items-table th.center-col, .items-table td.center-col {
      text-align: center;
    }
    .items-table td {
      padding: 4px 2px;
      vertical-align: top;
      font-size: ${baseFontSizePx}px;
    }
    .item-name-cell {
      word-break: break-word;
      font-weight: 600;
    }
    .item-id-sub {
      display: block;
      font-size: ${baseFontSizePx - 2.5}px;
      color: #555555;
      font-weight: 500;
      margin-top: 1px;
    }
    .item-discount-sub {
      display: block;
      font-size: ${baseFontSizePx - 2}px;
      color: #000000;
      font-weight: 600;
      margin-top: 1px;
    }

    /* ── 58mm 2-line layout ── */
    .row-58 {
      margin-bottom: 4px;
      padding-bottom: 3px;
      border-bottom: 1px dotted #cccccc;
    }
    .row-58:last-child {
      border-bottom: none;
    }
    .row-58-top {
      font-weight: 700;
      word-break: break-word;
      margin-bottom: 2px;
    }
    .row-58-bottom {
      display: flex;
      flex-direction: ${isKurdish ? 'row-reverse' : 'row'};
      justify-content: space-between;
      align-items: center;
      font-size: ${baseFontSizePx - 0.5}px;
    }

    /* ── Totals ── */
    .totals-section {
      padding: 2px 0;
    }
    .total-row {
      display: flex;
      flex-direction: ${isKurdish ? 'row-reverse' : 'row'};
      justify-content: space-between;
      align-items: center;
      margin-bottom: 3px;
      font-size: ${baseFontSizePx}px;
    }
    .grand-total-box {
      border-top: 2px solid #000000;
      border-bottom: 2px solid #000000;
      padding: 6px 2px;
      margin: 6px 0;
      display: flex;
      flex-direction: ${isKurdish ? 'row-reverse' : 'row'};
      justify-content: space-between;
      align-items: center;
    }
    .grand-total-label {
      font-size: ${titleFontSizePx - 1}px;
      font-weight: 800;
    }
    .grand-total-amount {
      font-size: ${titleFontSizePx}px;
      font-weight: 900;
      white-space: nowrap !important;
      direction: ltr;
    }
    .grand-total-sub {
      font-size: ${baseFontSizePx}px;
      font-weight: 700;
      text-align: ${isKurdish ? 'left' : 'right'};
      margin-top: 2px;
    }

    /* ── Notes & Warranty ── */
    .notes-box {
      margin-top: 6px;
      padding: 4px 6px;
      border: 1px solid #000000;
      border-radius: 4px;
      font-size: ${baseFontSizePx - 1.5}px;
      line-height: 1.35;
      word-break: break-word;
    }
    .notes-title {
      font-weight: 800;
      margin-bottom: 2px;
      text-transform: uppercase;
    }

    /* ── Footer ── */
    .receipt-footer {
      text-align: center;
      margin-top: 8px;
      padding-top: 4px;
    }
    .footer-msg {
      font-size: ${baseFontSizePx - 0.5}px;
      font-weight: 700;
      line-height: 1.4;
      margin-bottom: 6px;
      word-break: break-word;
    }
    .barcode-wrap {
      margin: 8px auto 4px;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
    }
    .barcode-num {
      font-size: ${baseFontSizePx - 2}px;
      font-family: monospace;
      letter-spacing: 2px;
      margin-top: 2px;
      font-weight: 700;
    }
    .brand-credit {
      font-size: 8.5px;
      color: #666666;
      margin-top: 6px;
    }
  `;
}

/**
 * Builds the complete HTML string for a 58mm, 80mm, or 110mm thermal receipt.
 */
export function buildThermalReceiptHTML(
  sale: Sale,
  business: BusinessInfo,
  width: ThermalReceiptWidth = '80mm',
  customSettings?: Partial<ThermalReceiptSettings>,
  currencyMode: ReceiptCurrencyMode = 'iqd'
): string {
  const storeSettings = useSettingsStore.getState();
  const settings: ThermalReceiptSettings = {
    ...DEFAULT_THERMAL_RECEIPT_SETTINGS,
    ...(storeSettings.thermalReceiptSettings || {}),
    ...(customSettings || {}),
  };

  const isKurdish = isKurdishPdfActive();
  const baseCurrency = storeSettings.baseCurrency || 'IQD';
  const isUsd = baseCurrency === 'USD' || currencyMode === 'usd';
  const rate = sale.exchangeRateUsed ?? storeSettings.exchangeRate ?? 1310;

  const fmtRow = (val: number) =>
    isUsd ? `$${fmtUSD(val / rate)}` : `${fmtIQD(val)}&nbsp;IQD`;

  const items = sale.items ?? [];
  const dateTimeValue = sale.date ?? sale.createdAt;
  const paymentStatus = getPaymentStatus(sale);

  // ── Header Section ──
  const storeName = escHtml(business.name || 'Froshiar Store');
  const storePhone = settings.showBusinessPhone && business.phone ? escHtml(business.phone) : '';
  const storeAddress = settings.showBusinessAddress && business.address ? escHtml(business.address) : '';

  // ── Customer & Invoice Metadata ──
  const customerName =
    settings.showCustomerName && sale.customerName && sale.customerName.trim()
      ? escHtml(sale.customerName)
      : '';
  const customerPhone =
    settings.showCustomerPhone && sale.customerPhone && sale.customerPhone.trim()
      ? escHtml(sale.customerPhone)
      : '';
  const invoiceNum = settings.showInvoiceNumber ? escHtml(sale.invoiceNumber) : '';
  const dateFormatted = settings.showDate ? formatDate(dateTimeValue) : '';
  const timeFormatted = settings.showDate ? formatTime(dateTimeValue) : '';

  // ── Items Rendering ──
  let itemsHTML = '';
  if (width === '58mm') {
    // Compact 2-line layout for 58mm roll
    itemsHTML = items.map((item, i) => {
      const discountTag =
        settings.showDiscount && item.discount > 0
          ? `<span class="item-discount-sub">${ku(isKurdish ? 'داشکاندن:' : 'Disc:')} -${fmtRow(item.discount)}</span>`
          : '';
      const barcodeTag =
        settings.showItemBarcode && item.itemId
          ? `<span class="item-id-sub">#${escHtml(item.itemId)}</span>`
          : '';

      const unitPriceWithDiscount = settings.showDiscount && item.discount > 0
        ? `<span style="text-decoration:line-through;color:#777777;margin-inline-end:3px;">${fmtRow(item.sellingPrice)}</span><span style="font-weight:700;">${fmtRow(item.sellingPrice - item.discount)}</span>`
        : fmtRow(item.sellingPrice);

      const qtyPricePart = settings.showQty && settings.showItemPrice
        ? `${item.quantity} × ${unitPriceWithDiscount}`
        : settings.showQty
        ? `${item.quantity} ${ku(isKurdish ? 'دانە' : 'pcs')}`
        : settings.showItemPrice
        ? unitPriceWithDiscount
        : '';

      return `
        <div class="row-58">
          <div class="row-58-top">
            ${i + 1}. ${escHtml(item.productName)}
            ${barcodeTag}
          </div>
          <div class="row-58-bottom">
            <span>${qtyPricePart}</span>
            <span style="font-weight:700;">${fmtRow(item.lineTotal)}</span>
          </div>
          ${discountTag}
        </div>
      `;
    }).join('');
  } else {
    // 80mm & 110mm columnar layout
    const qtyColWidth = width === '110mm' ? '12%' : '14%';
    const priceColWidth = width === '110mm' ? '22%' : '26%';
    const totalColWidth = width === '110mm' ? '22%' : '26%';

    const rows = items.map((item, i) => {
      const barcodeTag =
        settings.showItemBarcode && item.itemId
          ? `<span class="item-id-sub">#${escHtml(item.itemId)}</span>`
          : '';
      const discountTag =
        settings.showDiscount && item.discount > 0
          ? `<span class="item-discount-sub">${ku(isKurdish ? 'داشکاندن:' : 'Disc:')} -${fmtRow(item.discount)}</span>`
          : '';

      const unitPriceCell = settings.showDiscount && item.discount > 0
        ? `<span style="text-decoration:line-through;color:#777777;font-size:0.9em;margin-inline-end:3px;">${fmtRow(item.sellingPrice)}</span><span style="font-weight:700;">${fmtRow(item.sellingPrice - item.discount)}</span>`
        : fmtRow(item.sellingPrice);

      return `
        <tr>
          <td class="item-name-cell">
            ${i + 1}. ${escHtml(item.productName)}
            ${barcodeTag}
            ${discountTag}
          </td>
          ${settings.showQty ? `<td class="center-col" style="width:${qtyColWidth};">${item.quantity}</td>` : ''}
          ${settings.showItemPrice ? `<td class="num-col" style="width:${priceColWidth};">${unitPriceCell}</td>` : ''}
          <td class="num-col" style="width:${totalColWidth};font-weight:700;">${fmtRow(item.lineTotal)}</td>
        </tr>
      `;
    }).join('');

    itemsHTML = `
      <table class="items-table">
        <thead>
          <tr>
            <th>${ku(isKurdish ? 'کاڵا' : 'Item')}</th>
            ${settings.showQty ? `<th class="center-col" style="width:${qtyColWidth};">${ku(isKurdish ? 'بڕ' : 'Qty')}</th>` : ''}
            ${settings.showItemPrice ? `<th class="num-col" style="width:${priceColWidth};">${ku(isKurdish ? 'نرخ' : 'Price')}</th>` : ''}
            <th class="num-col" style="width:${totalColWidth};">${ku(isKurdish ? 'کۆ' : 'Total')}</th>
          </tr>
        </thead>
        <tbody>
          ${rows}
        </tbody>
      </table>
    `;
  }

  // ── Financial Totals ──
  const showUsdOnly = isUsd;
  const showBoth = currencyMode === 'both';

  const totalUSD = fmtUSD(sale.grandTotal / rate);
  const totalIQD = fmtIQD(sale.grandTotal);

  let grandTotalHTML = '';
  if (showUsdOnly) {
    grandTotalHTML = `
      <div class="grand-total-box">
        <span class="grand-total-label">${ku(isKurdish ? 'کۆی گشتی' : 'Grand Total')}</span>
        <span class="grand-total-amount">$${totalUSD}</span>
      </div>
      ${showBoth ? `<div class="grand-total-sub">${ku(isKurdish ? 'کۆی گشتی بە دینار:' : 'Total in IQD:')} ${totalIQD}&nbsp;IQD</div>` : ''}
    `;
  } else {
    grandTotalHTML = `
      <div class="grand-total-box">
        <span class="grand-total-label">${ku(isKurdish ? 'کۆی گشتی' : 'Grand Total')}</span>
        <span class="grand-total-amount">${totalIQD}&nbsp;IQD</span>
      </div>
      ${showBoth ? `<div class="grand-total-sub">${ku(isKurdish ? 'کۆی گشتی بە دۆلار:' : 'Total in USD:')} $${totalUSD}</div>` : ''}
    `;
  }

  // Payment details
  const methodLabel =
    sale.paymentMethod === 'debt'
      ? (isKurdish ? 'قەرز (Debt)' : 'Debt')
      : sale.paymentMethod === 'fib'
      ? 'FIB'
      : (isKurdish ? 'کاش (Cash)' : 'Cash');

  // Notes & Warranty
  const noteContent = (sale.notes || '').trim();
  const warrantyContent = (sale.warranty || '').trim();
  const policyContent = (sale.aboutPolicy || storeSettings.invoiceAboutPolicy || '').trim();

  const notesHTML =
    settings.showNotes && (noteContent || warrantyContent || policyContent)
      ? `
        <div class="notes-box">
          ${warrantyContent ? `<div class="notes-title">${ku(isKurdish ? 'گرەنتی / مەرج:' : 'Warranty:')}</div><div style="margin-bottom:3px;">${escHtml(warrantyContent)}</div>` : ''}
          ${noteContent ? `<div class="notes-title">${ku(isKurdish ? 'تێبینی:' : 'Notes:')}</div><div style="margin-bottom:3px;">${escHtml(noteContent)}</div>` : ''}
          ${policyContent ? `<div class="notes-title">${ku(isKurdish ? 'ڕێنمایی و سیاسەت:' : 'Policy:')}</div><div>${escHtml(policyContent)}</div>` : ''}
        </div>
      `
      : '';

  // Footer barcode & thank you message
  const footerMessage = (settings.customFooterNote || '').trim();
  const barcodeHTML = settings.showFooterBarcode && sale.invoiceNumber ? buildBarcodeSvg(sale.invoiceNumber) : '';

  return `<!DOCTYPE html>
<html lang="${isKurdish ? 'ku' : 'en'}" dir="${isKurdish ? 'rtl' : 'ltr'}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Froshiar-${escHtml(sale.invoiceNumber || 'Receipt')}</title>
  <style>
    ${buildThermalCSS(width, isKurdish)}
  </style>
</head>
<body>
  <div class="receipt-container">
    <!-- Store Header (NO LOGO) -->
    <div class="biz-header">
      <div class="biz-name">${storeName}</div>
      ${storeAddress ? `<div class="biz-contact">${storeAddress}</div>` : ''}
      ${storePhone ? `<div class="biz-contact">${storePhone}</div>` : ''}
    </div>

    <div class="divider-dashed"></div>

    <!-- Info Metadata -->
    <div class="info-section">
      ${invoiceNum ? `
      <div class="info-row">
        <span class="info-label">${ku(isKurdish ? 'پسوولە:' : 'Receipt #:')}</span>
        <span class="info-value">#${invoiceNum}</span>
      </div>` : ''}
      ${dateFormatted ? `
      <div class="info-row">
        <span class="info-label">${ku(isKurdish ? 'بەروار:' : 'Date:')}</span>
        <span class="info-value">${dateFormatted} ${timeFormatted}</span>
      </div>` : ''}
      ${customerName ? `
      <div class="info-row">
        <span class="info-label">${ku(isKurdish ? 'کڕیار:' : 'Customer:')}</span>
        <span class="info-value">${customerName}</span>
      </div>` : ''}
      ${customerPhone ? `
      <div class="info-row">
        <span class="info-label">${ku(isKurdish ? 'مۆبایل:' : 'Phone:')}</span>
        <span class="info-value">${customerPhone}</span>
      </div>` : ''}
    </div>

    <div class="divider-dashed"></div>

    <!-- Items Section -->
    <div class="items-section">
      ${itemsHTML}
    </div>

    <div class="divider-dashed"></div>

    <!-- Financial Totals -->
    <div class="totals-section">
      <div class="total-row">
        <span class="info-label">${ku(isKurdish ? 'کۆی کاڵاکان:' : 'Subtotal:')}</span>
        <span class="info-value">${fmtRow(sale.subtotal)}</span>
      </div>

      ${settings.showDiscount && sale.discountTotal > 0 ? `
      <div class="total-row">
        <span class="info-label">${ku(isKurdish ? 'داشکاندنی کاڵا:' : 'Item Discount:')}</span>
        <span class="info-value" style="color:#000;">− ${fmtRow(sale.discountTotal)}</span>
      </div>` : ''}

      ${settings.showDiscount && sale.globalDiscount > 0 ? `
      <div class="total-row">
        <span class="info-label">${ku(isKurdish ? 'داشکاندنی گشتی:' : 'Cart Discount:')}</span>
        <span class="info-value" style="color:#000;">− ${fmtRow(sale.globalDiscount)}</span>
      </div>` : ''}

      ${grandTotalHTML}

      ${settings.showPaymentMethod ? `
      <div class="total-row" style="margin-top:4px;">
        <span class="info-label">${ku(isKurdish ? 'شێوازی پارەدان:' : 'Payment:')}</span>
        <span class="info-value">${ku(methodLabel)}</span>
      </div>` : ''}

      ${sale.paymentMethod === 'debt' && sale.paidAmount > 0 ? `
      <div class="total-row">
        <span class="info-label">${ku(isKurdish ? 'بڕی دراو:' : 'Paid:')}</span>
        <span class="info-value">${fmtRow(sale.paidAmount)}</span>
      </div>` : ''}

      ${settings.showRemainingDebt && sale.remainingDebt > 0 ? `
      <div class="total-row" style="font-weight:800;">
        <span class="info-label">${ku(isKurdish ? 'قەرزی ماوە:' : 'Remaining Debt:')}</span>
        <span class="info-value">${fmtRow(sale.remainingDebt)}</span>
      </div>` : ''}
    </div>

    <!-- Notes & Policy -->
    ${notesHTML}

    <!-- Footer Message & Barcode -->
    <div class="receipt-footer">
      ${footerMessage ? `<div class="footer-msg">${ku(escHtml(footerMessage))}</div>` : ''}
      ${barcodeHTML}
      <div class="brand-credit">Froshiar POS • www.froshiar.store</div>
    </div>
  </div>
</body>
</html>`;
}
