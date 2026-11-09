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
import i18n from '@/lib/i18n';
import { fmtIQD, fmtUSD, formatDate, formatTime, getPaymentStatus } from '@/utils/formatters';
import { KURDISH_FONT_FACE, kuSpan, isKurdishPdfActive } from '@/lib/pdfFont';
import {
  type ThermalReceiptWidth,
  type ThermalReceiptSettings,
  type PurchaseReceiptSettings,
  type InventoryReceiptSettings,
  DEFAULT_THERMAL_RECEIPT_SETTINGS,
  DEFAULT_PURCHASE_RECEIPT_SETTINGS,
  DEFAULT_INVENTORY_RECEIPT_SETTINGS,
  useSettingsStore,
} from '@/store/settingsStore';
import type { ReceiptCurrencyMode } from './invoiceTemplate';
import type { Quotation } from '@/types/quotation';
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

  const primaryFont = isKurdish
    ? `'Bahij Janna', 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif`
    : `'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, 'Bahij Janna', sans-serif`;

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
      font-family: ${primaryFont};
    }
    body {
      width: ${bodyWidthMm}mm;
      max-width: ${bodyWidthMm}mm;
      margin: 0 auto;
      background: #ffffff;
      color: #000000;
      font-family: ${primaryFont};
      font-size: ${baseFontSizePx}px;
      line-height: 1.35;
      direction: ${isKurdish ? 'rtl' : 'ltr'};
    }
    .ku-text {
      font-family: 'Bahij Janna', sans-serif !important;
      direction: rtl;
      unicode-bidi: isolate;
    }
    .en-num, .row-value-ltr, .font-mono, .barcode-num, .info-date, [dir="ltr"] {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif !important;
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
      flex-direction: row;
      justify-content: flex-start;
      align-items: baseline;
      gap: 6px;
      margin-bottom: 2.5px;
      font-size: ${baseFontSizePx - 0.5}px;
      line-height: 1.35;
    }
    .info-label {
      color: #333333;
      font-weight: 700;
      white-space: nowrap;
      flex-shrink: 0;
    }
    .info-value {
      color: #000000;
      font-weight: 700;
      word-break: break-word;
    }
    .info-date, .info-value.info-date {
      direction: ltr !important;
      unicode-bidi: embed !important;
      white-space: nowrap !important;
      word-break: normal !important;
      display: inline-block;
      font-variant-numeric: tabular-nums;
      font-size: ${width === '58mm' ? '10px' : `${baseFontSizePx - 0.5}px`};
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
    .row-58, .item-block-58 {
      margin-bottom: 4px;
      padding-bottom: 3px;
      border-bottom: 1px dotted #cccccc;
    }
    .row-58:last-child, .item-block-58:last-child {
      border-bottom: none;
    }
    .row-58-top, .item-title-58 {
      font-weight: 700;
      word-break: break-word;
      margin-bottom: 2px;
    }
    .row-58-bottom, .item-meta-row-58 {
      display: flex;
      flex-direction: row;
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
      flex-direction: row;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 3px;
      font-size: ${baseFontSizePx}px;
    }
    .grand-total-box, .grand-total-row {
      border-top: 2px solid #000000;
      border-bottom: 2px solid #000000;
      padding: 6px 2px;
      margin: 6px 0;
      display: flex;
      flex-direction: row;
      justify-content: space-between;
      align-items: center;
    }
    .grand-total-label {
      font-size: ${titleFontSizePx - 1}px;
      font-weight: 800;
    }
    .grand-total-amount, .grand-total-value {
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
      font-family: ${isKurdish ? `'Bahij Janna', sans-serif` : `'Inter', sans-serif`};
      direction: ${isKurdish ? 'rtl' : 'ltr'};
      text-align: ${isKurdish ? 'right' : 'left'};
    }
    .notes-title {
      font-weight: 800;
      margin-bottom: 2px;
      text-transform: uppercase;
      font-family: ${isKurdish ? `'Bahij Janna', sans-serif` : `'Inter', sans-serif`};
    }
    .notes-content {
      word-break: break-word;
      font-family: ${isKurdish ? `'Bahij Janna', sans-serif` : `'Inter', sans-serif`};
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
  const currentLang = i18n.language || 'ku';
  const isAr = currentLang === 'ar';
  const isKu = currentLang === 'ku';
  const baseCurrency = storeSettings.baseCurrency || 'IQD';
  const isUsd = baseCurrency === 'USD' || currencyMode === 'usd';
  const rate = sale.exchangeRateUsed ?? storeSettings.exchangeRate ?? 1310;

  const fmtRow = (val: number) =>
    isUsd ? `$${fmtUSD(val / rate)}` : `${fmtIQD(val)}&nbsp;IQD`;

  const items = sale.items ?? [];
  const rawDate = sale.date || sale.createdAt;
  const rawTime = (sale.date && sale.date.includes('T') ? sale.date : null) || sale.createdAt;
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
  const dateFormatted = settings.showDate ? formatDate(rawDate) : '';
  const timeFormatted = settings.showDate ? formatTime(rawTime) : '';
  const fullDateTime = [dateFormatted, timeFormatted].filter(Boolean).join(' ');

  // ── Items Rendering ──
  let itemsHTML = '';
  if (width === '58mm') {
    // Compact 2-line layout for 58mm roll
    itemsHTML = items.map((item, i) => {
      const discountTag =
        settings.showDiscount && item.discount > 0
          ? `<span class="item-discount-sub">${ku(isAr ? 'الخصم:' : isKu ? 'داشکاندن:' : 'Disc:')} -${fmtRow(item.discount)}</span>`
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
        ? `${item.quantity} ${ku(isAr ? 'قطعة' : isKu ? 'دانە' : 'pcs')}`
        : settings.showItemPrice
        ? unitPriceWithDiscount
        : '';

      return `
        <div class="row-58">
          <div class="row-58-top">
            <span dir="ltr" style="display:inline-block;font-weight:700;margin-inline-end:3px;">${i + 1}.</span><bdi class="ku-text">${escHtml(item.productName)}</bdi>
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
          ? `<span class="item-discount-sub">${ku(isAr ? 'الخصم:' : isKu ? 'داشکاندن:' : 'Disc:')} -${fmtRow(item.discount)}</span>`
          : '';

      const unitPriceCell = settings.showDiscount && item.discount > 0
        ? `<span style="text-decoration:line-through;color:#777777;font-size:0.9em;margin-inline-end:3px;">${fmtRow(item.sellingPrice)}</span><span style="font-weight:700;">${fmtRow(item.sellingPrice - item.discount)}</span>`
        : fmtRow(item.sellingPrice);

      return `
        <tr>
          <td class="item-name-cell">
            <span dir="ltr" style="display:inline-block;font-weight:700;margin-inline-end:3px;">${i + 1}.</span><bdi>${escHtml(item.productName)}</bdi>
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
            <th>${ku(isAr ? 'المادة' : isKu ? 'کاڵا' : 'Item')}</th>
            ${settings.showQty ? `<th class="center-col" style="width:${qtyColWidth};">${ku(isAr ? 'الكمية' : isKu ? 'بڕ' : 'Qty')}</th>` : ''}
            ${settings.showItemPrice ? `<th class="num-col" style="width:${priceColWidth};">${ku(isAr ? 'السعر' : isKu ? 'نرخ' : 'Price')}</th>` : ''}
            <th class="num-col" style="width:${totalColWidth};">${ku(isAr ? 'المجموع' : isKu ? 'کۆ' : 'Total')}</th>
          </tr>
        </thead>
        <tbody>
          ${rows}
        </tbody>
      </table>
    `;
  }

  // ── Financial Totals ──
  const effectiveMode: ReceiptCurrencyMode = currencyMode || (isUsd ? 'usd' : 'iqd');
  const showUsdOnly = effectiveMode === 'usd';
  const showIqdOnly = effectiveMode === 'iqd';
  const showBoth = effectiveMode === 'both';

  const totalUSD = fmtUSD(sale.grandTotal / rate);
  const totalIQD = fmtIQD(sale.grandTotal);

  const usdLabel = ku(isAr ? 'المجموع الكلي (دولار)' : isKu ? 'کۆی گشتی (دۆلار)' : 'Grand Total (USD)');
  const iqdLabel = ku(isAr ? 'المجموع الكلي (دينار)' : isKu ? 'کۆی گشتی (دینار)' : 'Grand Total (IQD)');
  const iqdSubLabel = ku(isAr ? 'المجموع الكلي بالدينار:' : isKu ? 'کۆی گشتی بە دینار:' : 'Total in IQD:');
  const usdSubLabel = ku(isAr ? 'المجموع الكلي بالدولار:' : isKu ? 'کۆی گشتی بە دۆلار:' : 'Total in USD:');

  let grandTotalHTML = '';
  if (showUsdOnly || (isUsd && !showBoth && !showIqdOnly)) {
    grandTotalHTML = `
      <div class="grand-total-box">
        <span class="grand-total-label">${usdLabel}</span>
        <span class="grand-total-amount">$${totalUSD} USD</span>
      </div>
    `;
  } else if (showIqdOnly || (!isUsd && !showBoth && !showUsdOnly)) {
    grandTotalHTML = `
      <div class="grand-total-box">
        <span class="grand-total-label">${iqdLabel}</span>
        <span class="grand-total-amount">${totalIQD}&nbsp;IQD</span>
      </div>
    `;
  } else {
    // Both mode:
    if (isUsd) {
      grandTotalHTML = `
        <div class="grand-total-box">
          <span class="grand-total-label">${usdLabel}</span>
          <span class="grand-total-amount">$${totalUSD} USD</span>
        </div>
        <div class="grand-total-sub">${iqdSubLabel} ${totalIQD}&nbsp;IQD</div>
      `;
    } else {
      grandTotalHTML = `
        <div class="grand-total-box">
          <span class="grand-total-label">${iqdLabel}</span>
          <span class="grand-total-amount">${totalIQD}&nbsp;IQD</span>
        </div>
        <div class="grand-total-sub">${usdSubLabel} $${totalUSD} USD</div>
      `;
    }
  }

  // Payment details
  const methodLabel =
    sale.paymentMethod === 'debt'
      ? (isAr ? 'دين' : isKu ? 'قەرز (Debt)' : 'Debt')
      : sale.paymentMethod === 'installment'
      ? (isAr ? 'تقسيط' : isKu ? 'قیست (Installment)' : 'Installment')
      : sale.paymentMethod === 'fib'
      ? 'FIB'
      : (isAr ? 'نقداً' : isKu ? 'کاش (Cash)' : 'Cash');

  // Notes & Warranty
  const noteContent = (sale.notes || '').trim();
  const warrantyContent = (sale.warranty || '').trim();
  const policyContent = (sale.aboutPolicy || storeSettings.invoiceAboutPolicy || '').trim();

  const notesHTML =
    settings.showNotes && (noteContent || warrantyContent || policyContent)
      ? `
        <div class="notes-box">
          ${warrantyContent ? `<div class="notes-title">${ku(isAr ? 'الضمان والشروط:' : isKu ? 'گرەنتی / مەرج:' : 'Warranty:')}</div><div style="margin-bottom:3px;">${ku(escHtml(warrantyContent))}</div>` : ''}
          ${noteContent ? `<div class="notes-title">${ku(isAr ? 'الملاحظات:' : isKu ? 'تێبینی:' : 'Notes:')}</div><div style="margin-bottom:3px;">${ku(escHtml(noteContent))}</div>` : ''}
          ${policyContent ? `<div class="notes-title">${ku(isAr ? 'السياسة والتعليمات:' : isKu ? 'ڕێنمایی و سیاسەت:' : 'Policy:')}</div><div>${ku(escHtml(policyContent))}</div>` : ''}
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
      <div class="biz-name">${ku(storeName)}</div>
      ${storeAddress ? `<div class="biz-contact">${ku(storeAddress)}</div>` : ''}
      ${storePhone ? `<div class="biz-contact">${storePhone}</div>` : ''}
    </div>

    <div class="divider-dashed"></div>

    <!-- Info Metadata -->
    <div class="info-section">
      ${invoiceNum ? `
      <div class="info-row">
        <span class="info-label">${ku(isAr ? 'رقم الإيصال:' : isKu ? 'پسوولە:' : 'Receipt #:')}</span>
        <span class="info-value">#${invoiceNum}</span>
      </div>` : ''}
      ${fullDateTime ? `
      <div class="info-row">
        <span class="info-label">${ku(isAr ? 'التاريخ:' : isKu ? 'بەروار:' : 'Date:')}</span>
        <span class="info-value info-date" dir="ltr">${fullDateTime}</span>
      </div>` : ''}
      ${customerName ? `
      <div class="info-row">
        <span class="info-label">${ku(isAr ? 'الزبون:' : isKu ? 'کڕیار:' : 'Customer:')}</span>
        <span class="info-value">${ku(customerName)}</span>
      </div>` : ''}
      ${customerPhone ? `
      <div class="info-row">
        <span class="info-label">${ku(isAr ? 'الهاتف:' : isKu ? 'مۆبایل:' : 'Phone:')}</span>
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
        <span class="info-label">${ku(isAr ? 'مجموع المواد:' : isKu ? 'کۆی کاڵاکان:' : 'Subtotal:')}</span>
        <span class="info-value">${fmtRow(sale.subtotal)}</span>
      </div>

      ${settings.showDiscount && sale.discountTotal > 0 ? `
      <div class="total-row">
        <span class="info-label">${ku(isAr ? 'خصم المواد:' : isKu ? 'داشکاندنی کاڵا:' : 'Item Discount:')}</span>
        <span class="info-value" style="color:#000;">− ${fmtRow(sale.discountTotal)}</span>
      </div>` : ''}

      ${settings.showDiscount && sale.globalDiscount > 0 ? `
      <div class="total-row">
        <span class="info-label">${ku(isAr ? 'خصم السلة:' : isKu ? 'داشکاندنی گشتی:' : 'Cart Discount:')}</span>
        <span class="info-value" style="color:#000;">− ${fmtRow(sale.globalDiscount)}</span>
      </div>` : ''}

      ${grandTotalHTML}

      ${settings.showPaymentMethod ? `
      <div class="total-row" style="margin-top:4px;">
        <span class="info-label">${ku(isAr ? 'طريقة الدفع:' : isKu ? 'شێوازی پارەدان:' : 'Payment:')}</span>
        <span class="info-value">${ku(methodLabel)}</span>
      </div>` : ''}

      ${sale.paymentMethod === 'debt' && sale.paidAmount > 0 ? `
      <div class="total-row">
        <span class="info-label">${ku(isAr ? 'المبلغ المدفوع:' : isKu ? 'بڕی دراو:' : 'Paid:')}</span>
        <span class="info-value">${fmtRow(sale.paidAmount)}</span>
      </div>` : ''}

      ${sale.paymentMethod === 'debt' && settings.showRemainingDebt && sale.remainingDebt > 0 ? `
      <div class="total-row" style="font-weight:800;">
        <span class="info-label">${ku(isAr ? 'الدين المتبقي:' : isKu ? 'قەرزی ماوە:' : 'Remaining Debt:')}</span>
        <span class="info-value">${fmtRow(sale.remainingDebt)}</span>
      </div>` : ''}

      ${sale.paymentMethod === 'installment' ? `
      <div class="total-row">
        <span class="info-label">${ku(isAr ? 'الدفعة الأولى (المقدمة):' : isKu ? 'پێشەکی:' : 'Down Payment:')}</span>
        <span class="info-value">${sale.paidAmount > 0 ? fmtRow(sale.paidAmount) : ku(isAr ? 'بدون مقدمة (0)' : isKu ? 'بێ پێشەکی (0)' : 'None (0)')}</span>
      </div>
      <div class="total-row">
        <span class="info-label">${ku(isAr ? 'المتبقي بالتقسيط:' : isKu ? 'بڕی ماوە بە قیست:' : 'Remaining Balance:')}</span>
        <span class="info-value" style="font-weight:700;">${fmtRow(sale.remainingDebt)}</span>
      </div>
      <div class="total-row">
        <span class="info-label">${ku(isAr ? 'مدة التقسيط:' : isKu ? 'ماوەی قیست:' : 'Duration:')}</span>
        <span class="info-value">${sale.installmentMonths || 1} ${ku(isAr ? 'أشهر' : isKu ? 'مانگ' : 'Months')}</span>
      </div>
      <div class="total-row" style="font-weight:800;border-top:1px dashed #000;padding-top:3px;margin-top:2px;">
        <span class="info-label">${ku(isAr ? 'القسط الشهري:' : isKu ? 'قیستی مانگانە:' : 'Monthly Installment:')}</span>
        <span class="info-value">${fmtRow(sale.installmentMonthlyAmount || Math.round((sale.remainingDebt / (sale.installmentMonths || 1)) * 100) / 100)}</span>
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

export interface PurchaseReceiptItem {
  id?: number | string;
  productName: string;
  quantity: number;
  buyPrice: number;
  discount?: number;
  lineTotal: number;
  itemId?: string;
}

/**
 * Builds the complete HTML string for a thermal purchase receipt (58mm, 80mm, 110mm).
 */
export function buildThermalPurchaseReceiptHTML(
  purchase: {
    purchaseNumber?: string;
    date?: string;
    time?: string;
    createdAt?: string;
    supplierName?: string | null;
    supplierPhone?: string | null;
    totalIQD: number;
    paymentStatus?: 'paid' | 'fib' | 'debt';
    notes?: string | null;
  },
  items: PurchaseReceiptItem[],
  business: BusinessInfo,
  width: ThermalReceiptWidth = '80mm',
  customSettings?: Partial<PurchaseReceiptSettings>,
  currencyMode: ReceiptCurrencyMode = 'iqd'
): string {
  const storeSettings = useSettingsStore.getState();
  const settings: PurchaseReceiptSettings = {
    ...DEFAULT_PURCHASE_RECEIPT_SETTINGS,
    ...(storeSettings.purchaseReceiptSettings || {}),
    ...(customSettings || {}),
  };

  const isKurdish = isKurdishPdfActive();
  const currentPurchaseLang = i18n.language || 'ku';
  const isPurchaseAr = currentPurchaseLang === 'ar';
  const isPurchaseKu = currentPurchaseLang === 'ku';
  const baseCurrency = storeSettings.baseCurrency || 'IQD';
  const isUsd = baseCurrency === 'USD' || currencyMode === 'usd';
  const rate = storeSettings.exchangeRate || 1310;
  const fmtRow = (val: number) =>
    isUsd ? `$${fmtUSD(val / rate)}` : `${fmtIQD(val)}&nbsp;IQD`;

  const rawDate = purchase.date || purchase.createdAt || new Date().toISOString();
  const rawTime = purchase.time || purchase.createdAt || (purchase.date && purchase.date.includes('T') ? purchase.date : '') || new Date().toISOString();
  const dateFormatted = settings.showDate ? formatDate(rawDate) : '';
  const timeFormatted = settings.showDate ? formatTime(rawTime) : '';
  const fullDateTime = [dateFormatted, timeFormatted].filter(Boolean).join(' ');

  const storeName = escHtml(business.name || 'Froshiar Store');
  const storePhone = settings.showBusinessPhone && business.phone ? escHtml(business.phone) : '';
  const storeAddress = settings.showBusinessAddress && business.address ? escHtml(business.address) : '';

  const supplierName = settings.showSupplierName && purchase.supplierName?.trim() ? escHtml(purchase.supplierName) : '';
  const supplierPhone = settings.showSupplierPhone && purchase.supplierPhone?.trim() ? escHtml(purchase.supplierPhone) : '';
  const billNum = settings.showInvoiceNumber && purchase.purchaseNumber ? escHtml(purchase.purchaseNumber) : '';

  let itemsHTML = '';
  if (width === '58mm') {
    itemsHTML = items.map((item, i) => {
      const idTag = settings.showItemBarcode && item.itemId ? `<span class="item-id-sub">#${escHtml(item.itemId)}</span>` : '';
      const unitCost = settings.showBuyPrice
        ? (settings.showDiscount && (item.discount ?? 0) > 0
          ? `<span style="text-decoration:line-through;color:#777777;margin-inline-end:3px;">${fmtRow(item.buyPrice)}</span><span style="font-weight:700;">${fmtRow(item.buyPrice - (item.discount ?? 0))}</span>`
          : fmtRow(item.buyPrice))
        : '';
      const qtyPricePart = settings.showQty && settings.showBuyPrice
        ? `${item.quantity} × ${unitCost}`
        : settings.showQty
        ? `${item.quantity} ${ku(isPurchaseAr ? 'قطعة' : isPurchaseKu ? 'دانە' : 'pcs')}`
        : unitCost;

      return `
        <div class="item-block-58">
          <div class="item-title-58">
            <span class="item-index-58" dir="ltr" style="display:inline-block;margin-inline-end:3px;">${i + 1}.</span>
            <span class="item-name-58"><bdi class="ku-text">${escHtml(item.productName)}</bdi></span>
            ${idTag}
          </div>
          <div class="item-meta-row-58">
            <span class="item-qty-price-58">${qtyPricePart}</span>
            <span class="item-linetotal-58">${fmtRow(item.lineTotal)}</span>
          </div>
        </div>
      `;
    }).join('');
  } else {
    const qtyColWidth = width === '110mm' ? '12%' : '14%';
    const priceColWidth = width === '110mm' ? '22%' : '26%';
    const totalColWidth = width === '110mm' ? '22%' : '26%';

    const rows = items.map((item, i) => {
      const idTag = settings.showItemBarcode && item.itemId ? `<span class="item-id-sub">#${escHtml(item.itemId)}</span>` : '';
      const unitCost = settings.showBuyPrice
        ? (settings.showDiscount && (item.discount ?? 0) > 0
          ? `<span style="text-decoration:line-through;color:#777777;font-size:0.9em;margin-inline-end:3px;">${fmtRow(item.buyPrice)}</span><span style="font-weight:700;">${fmtRow(item.buyPrice - (item.discount ?? 0))}</span>`
          : fmtRow(item.buyPrice))
        : '';

      return `
        <tr>
          <td class="item-name-cell">
            <span class="item-index-inline" dir="ltr" style="display:inline-block;margin-inline-end:3px;">${i + 1}.</span>
            <bdi class="ku-text">${escHtml(item.productName)}</bdi>
            ${idTag}
          </td>
          ${settings.showQty ? `<td class="center-col" style="width:${qtyColWidth};">${item.quantity}</td>` : ''}
          ${settings.showBuyPrice ? `<td class="num-col" style="width:${priceColWidth};">${unitCost}</td>` : ''}
          <td class="num-col" style="width:${totalColWidth};font-weight:700;">${fmtRow(item.lineTotal)}</td>
        </tr>
      `;
    }).join('');

    itemsHTML = `
      <table class="receipt-table">
        <thead>
          <tr>
            <th class="item-name-cell">${ku(isPurchaseAr ? 'المادة' : isPurchaseKu ? 'کاڵا' : 'Item')}</th>
            ${settings.showQty ? `<th class="center-col" style="width:${qtyColWidth};">${ku(isPurchaseAr ? 'الكمية' : isPurchaseKu ? 'عەدەد' : 'Qty')}</th>` : ''}
            ${settings.showBuyPrice ? `<th class="num-col" style="width:${priceColWidth};">${ku(isPurchaseAr ? 'التكلفة' : isPurchaseKu ? 'تێچوو' : 'Cost')}</th>` : ''}
            <th class="num-col" style="width:${totalColWidth};">${ku(isPurchaseAr ? 'المجموع الكلي' : isPurchaseKu ? 'کۆی گشتی' : 'Total')}</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    `;
  }

  const css = buildThermalCSS(width, isKurdish);
  const barcodeHTML = settings.showFooterBarcode && billNum ? buildBarcodeSvg(billNum) : '';
  const statusLabel = purchase.paymentStatus === 'paid'
    ? (isPurchaseAr ? 'نقداً (مدفوع)' : isPurchaseKu ? 'کاش (دراوە)' : 'Paid (Cash)')
    : purchase.paymentStatus === 'fib'
    ? 'FIB'
    : (isPurchaseAr ? 'دين' : isPurchaseKu ? 'قەرز' : 'Debt');

  return `<!DOCTYPE html>
<html lang="${isKurdish ? (isPurchaseAr ? 'ar' : 'ckb') : 'en'}" dir="${isKurdish ? 'rtl' : 'ltr'}">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Purchase Receipt #${billNum}</title>
  <style>${css}</style>
</head>
<body>
  <div class="receipt-container">
    <div class="receipt-header">
      <div class="biz-name">${ku(storeName)}</div>
      <div class="biz-type-badge">${ku(isPurchaseAr ? 'وصل شراء (مخزن)' : isPurchaseKu ? 'وەسڵی کڕین (کۆگا)' : 'Purchase Voucher')}</div>
      ${storeAddress ? `<div class="biz-contact">${ku(storeAddress)}</div>` : ''}
      ${storePhone ? `<div class="biz-contact">${storePhone}</div>` : ''}
    </div>
    <div class="divider-dashed"></div>

    <div class="info-section">
      ${billNum ? `<div class="info-row"><span class="info-label">${ku(isPurchaseAr ? 'رقم وصل الشراء:' : isPurchaseKu ? 'وەسڵی کڕین:' : 'Bill #:')}</span><span class="info-value">#${billNum}</span></div>` : ''}
      ${fullDateTime ? `<div class="info-row"><span class="info-label">${ku(isPurchaseAr ? 'التاريخ:' : isPurchaseKu ? 'بەروار:' : 'Date:')}</span><span class="info-value info-date" dir="ltr">${fullDateTime}</span></div>` : ''}
      ${supplierName ? `<div class="info-row"><span class="info-label">${ku(isPurchaseAr ? 'المورد:' : isPurchaseKu ? 'دابینکەر:' : 'Supplier:')}</span><span class="info-value">${ku(supplierName)}</span></div>` : ''}
      ${supplierPhone ? `<div class="info-row"><span class="info-label">${ku(isPurchaseAr ? 'الهاتف:' : isPurchaseKu ? 'مۆبایل:' : 'Phone:')}</span><span class="info-value">${supplierPhone}</span></div>` : ''}
    </div>
    <div class="divider-dashed"></div>

    <div class="items-section">${itemsHTML}</div>
    <div class="divider-dashed"></div>

    <div class="totals-section">
      ${(() => {
        const effectivePurchaseMode: ReceiptCurrencyMode = currencyMode || (isUsd ? 'usd' : 'iqd');
        const showPurchaseUsdOnly = effectivePurchaseMode === 'usd';
        const showPurchaseIqdOnly = effectivePurchaseMode === 'iqd';
        const showPurchaseBoth = effectivePurchaseMode === 'both';

        const totalUSD = fmtUSD(purchase.totalIQD / rate);
        const totalIQD = fmtIQD(purchase.totalIQD);

        const purchaseUsdLabel = ku(isPurchaseAr ? 'إجمالي تكلفة الشراء (دولار):' : isPurchaseKu ? 'کۆی گشتی کڕین (دۆلار):' : 'Total Cost (USD):');
        const purchaseIqdLabel = ku(isPurchaseAr ? 'إجمالي تكلفة الشراء (دينار):' : isPurchaseKu ? 'کۆی گشتی کڕین (دینار):' : 'Total Cost (IQD):');
        const purchaseIqdSubLabel = ku(isPurchaseAr ? 'المجموع الكلي بالدينار:' : isPurchaseKu ? 'کۆی گشتی بە دینار:' : 'Total in IQD:');
        const purchaseUsdSubLabel = ku(isPurchaseAr ? 'المجموع الكلي بالدولار:' : isPurchaseKu ? 'کۆی گشتی بە دۆلار:' : 'Total in USD:');

        if (showPurchaseUsdOnly || (isUsd && !showPurchaseBoth && !showPurchaseIqdOnly)) {
          return `
            <div class="grand-total-row">
              <span class="grand-total-label">${purchaseUsdLabel}</span>
              <span class="grand-total-value">$${totalUSD} USD</span>
            </div>
          `;
        } else if (showPurchaseIqdOnly || (!isUsd && !showPurchaseBoth && !showPurchaseUsdOnly)) {
          return `
            <div class="grand-total-row">
              <span class="grand-total-label">${purchaseIqdLabel}</span>
              <span class="grand-total-value">${totalIQD}&nbsp;IQD</span>
            </div>
          `;
        } else {
          // Both mode
          if (isUsd) {
            return `
              <div class="grand-total-row">
                <span class="grand-total-label">${purchaseUsdLabel}</span>
                <span class="grand-total-value">$${totalUSD} USD</span>
              </div>
              <div class="total-row" style="margin-top:2px;">
                <span class="info-label">${purchaseIqdSubLabel}</span>
                <span class="info-value">${totalIQD}&nbsp;IQD</span>
              </div>
            `;
          } else {
            return `
              <div class="grand-total-row">
                <span class="grand-total-label">${purchaseIqdLabel}</span>
                <span class="grand-total-value">${totalIQD}&nbsp;IQD</span>
              </div>
              <div class="total-row" style="margin-top:2px;">
                <span class="info-label">${purchaseUsdSubLabel}</span>
                <span class="info-value">$${totalUSD} USD</span>
              </div>
            `;
          }
        }
      })()}
      ${settings.showPaymentMethod ? `
      <div class="total-row" style="margin-top:4px;">
        <span class="info-label">${ku(isPurchaseAr ? 'حالة الدفع:' : isPurchaseKu ? 'دۆخی پارەدان:' : 'Payment:')}</span>
        <span class="info-value">${ku(statusLabel)}</span>
      </div>` : ''}
    </div>

    ${settings.showNotes && purchase.notes ? `
    <div class="notes-box">
      <div class="notes-title">${ku(isPurchaseAr ? 'الملاحظات:' : isPurchaseKu ? 'تێبینی:' : 'Notes:')}</div>
      <div class="notes-content">${ku(escHtml(purchase.notes))}</div>
    </div>` : ''}

    <div class="receipt-footer">
      ${settings.customFooterNote ? `<div class="footer-msg">${ku(escHtml(settings.customFooterNote))}</div>` : ''}
      ${barcodeHTML}
      <div class="brand-credit">Froshiar Inventory • www.froshiar.store</div>
    </div>
  </div>
</body>
</html>`;
}

export interface InventoryThermalItem {
  id?: number | string;
  name: string;
  itemId?: string;
  category?: string;
  quantity: number;
  buyPrice?: number;
  sellingPrice: number;
  status?: string;
}

/**
 * Builds the complete HTML string for a thermal inventory report (58mm, 80mm, 110mm).
 */
export function buildThermalInventoryReceiptHTML(
  items: InventoryThermalItem[],
  business: BusinessInfo,
  width: ThermalReceiptWidth = '80mm',
  customSettings?: Partial<InventoryReceiptSettings>,
  currencyMode: ReceiptCurrencyMode = 'iqd',
  reportTitle?: string
): string {
  const storeSettings = useSettingsStore.getState();
  const settings: InventoryReceiptSettings = {
    ...DEFAULT_INVENTORY_RECEIPT_SETTINGS,
    ...(storeSettings.inventoryReceiptSettings || {}),
    ...(customSettings || {}),
  };

  const isKurdish = isKurdishPdfActive();
  const currentLang = i18n.language || 'ku';
  const isInvAr = currentLang === 'ar';
  const isInvKu = currentLang === 'ku';

  const resolvedReportTitle = reportTitle || (isInvAr ? 'تقرير وسجل المخزن' : isInvKu ? 'سەرژمێری و تۆماری کۆگا' : 'Inventory Stock Audit');
  const baseCurrency = storeSettings.baseCurrency || 'IQD';
  const isUsd = baseCurrency === 'USD' || currencyMode === 'usd';
  const rate = storeSettings.exchangeRate || 1310;
  const fmtRow = (val: number) =>
    isUsd ? `$${fmtUSD(val / rate)}` : `${fmtIQD(val)}&nbsp;IQD`;

  const totalQty = items.reduce((acc, it) => acc + (it.quantity || 0), 0);
  const totalVal = items.reduce((acc, it) => acc + (it.quantity || 0) * (it.buyPrice || it.sellingPrice || 0), 0);

  const nowIso = new Date().toISOString();
  const dateFormatted = settings.showDate ? formatDate(nowIso) : '';
  const timeFormatted = settings.showDate ? formatTime(nowIso) : '';
  const fullDateTime = [dateFormatted, timeFormatted].filter(Boolean).join(' ');
  const storeName = escHtml(business.name || 'Froshiar Store');

  let rowsHTML = '';
  if (width === '58mm') {
    rowsHTML = items.map((item, i) => {
      const idTag = settings.showItemId && item.itemId ? `<span class="item-id-sub">#${escHtml(item.itemId)}</span>` : '';
      const catTag = settings.showCategory && item.category ? `<span class="item-discount-sub">[${escHtml(item.category)}]</span>` : '';
      return `
        <div class="item-block-58">
          <div class="item-title-58">
            <span class="item-index-58">${i + 1}.</span>
            <span class="item-name-58"><bdi class="ku-text">${escHtml(item.name)}</bdi></span>
            ${idTag}
            ${catTag}
          </div>
          <div class="item-meta-row-58">
            <span class="item-qty-price-58">${item.quantity} ${ku(isInvAr ? 'قطعة' : isInvKu ? 'دانە' : 'pcs')}</span>
            <span class="item-linetotal-58">${fmtRow(item.sellingPrice)}</span>
          </div>
        </div>
      `;
    }).join('');
  } else {
    rowsHTML = items.map((item, i) => {
      const idTag = settings.showItemId && item.itemId ? `<span class="item-id-sub">#${escHtml(item.itemId)}</span>` : '';
      return `
        <tr>
          <td class="item-name-cell">
            <span class="item-index-inline">${i + 1}.</span>
            <bdi class="ku-text">${escHtml(item.name)}</bdi>
            ${idTag}
          </td>
          ${settings.showQuantity ? `<td class="center-col" style="width:14%;">${item.quantity}</td>` : ''}
          ${settings.showSellPrice ? `<td class="num-col" style="width:24%;">${fmtRow(item.sellingPrice)}</td>` : ''}
          ${settings.showTotalValue ? `<td class="num-col" style="width:26%;font-weight:700;">${fmtRow((item.buyPrice || item.sellingPrice) * item.quantity)}</td>` : ''}
        </tr>
      `;
    }).join('');

    rowsHTML = `
      <table class="receipt-table">
        <thead>
          <tr>
            <th class="item-name-cell">${ku(isInvAr ? 'المادة' : isInvKu ? 'کاڵا' : 'Item')}</th>
            ${settings.showQuantity ? `<th class="center-col" style="width:14%;">${ku(isInvAr ? 'الكمية' : isInvKu ? 'بڕ' : 'Qty')}</th>` : ''}
            ${settings.showSellPrice ? `<th class="num-col" style="width:24%;">${ku(isInvAr ? 'السعر' : isInvKu ? 'نرخ' : 'Price')}</th>` : ''}
            ${settings.showTotalValue ? `<th class="num-col" style="width:26%;">${ku(isInvAr ? 'إجمالي القيمة' : isInvKu ? 'کۆی بەها' : 'Total')}</th>` : ''}
          </tr>
        </thead>
        <tbody>${rowsHTML}</tbody>
      </table>
    `;
  }

  const css = buildThermalCSS(width, isKurdish);

  return `<!DOCTYPE html>
<html lang="${isKurdish ? (isInvAr ? 'ar' : 'ckb') : 'en'}" dir="${isKurdish ? 'rtl' : 'ltr'}">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${resolvedReportTitle}</title>
  <style>${css}</style>
</head>
<body>
  <div class="receipt-container">
    <div class="receipt-header">
      <div class="biz-name">${ku(storeName)}</div>
      <div class="biz-type-badge">${ku(resolvedReportTitle)}</div>
      ${fullDateTime ? `<div class="biz-contact"><span dir="rtl">${ku(isInvAr ? 'التاريخ:' : isInvKu ? 'بەروار:' : 'Date:')}</span> <span class="info-date" dir="ltr">${fullDateTime}</span></div>` : ''}
    </div>
    <div class="divider-dashed"></div>

    <div class="items-section">${rowsHTML}</div>
    <div class="divider-dashed"></div>

    <div class="totals-section">
      <div class="total-row">
        <span class="info-label">${ku(isInvAr ? 'إجمالي عدد القطع:' : isInvKu ? 'کۆی گشتی دانە:' : 'Total Items:')}</span>
        <span class="info-value">${totalQty}</span>
      </div>
      ${settings.showTotalValue ? `
      <div class="grand-total-row">
        <span class="grand-total-label">${ku(isInvAr ? 'قيمة المخزون:' : isInvKu ? 'بەهای کۆگا:' : 'Stock Value:')}</span>
        <span class="grand-total-value">${fmtRow(totalVal)}</span>
      </div>` : ''}
    </div>

    <div class="receipt-footer">
      ${settings.customFooterNote ? `<div class="footer-msg">${ku(escHtml(settings.customFooterNote))}</div>` : ''}
      <div class="brand-credit">Froshiar Inventory System • www.froshiar.store</div>
    </div>
  </div>
</body>
</html>`;
}

/**
 * Builds the complete HTML string for a thermal quotation receipt (58mm, 80mm, 110mm).
 */
export function buildThermalQuotationReceiptHTML(
  quotation: Quotation,
  business: BusinessInfo,
  width: ThermalReceiptWidth = '80mm',
  customSettings?: Partial<ThermalReceiptSettings>,
  currencyMode: ReceiptCurrencyMode = 'both'
): string {
  const storeSettings = useSettingsStore.getState();
  const settings: ThermalReceiptSettings = {
    ...DEFAULT_THERMAL_RECEIPT_SETTINGS,
    ...(storeSettings.thermalReceiptSettings || {}),
    ...(customSettings || {}),
  };

  const isKurdish = isKurdishPdfActive();
  const currentLang = i18n.language || 'ku';
  const isAr = currentLang === 'ar';
  const isKu = currentLang === 'ku';
  const baseCurrency = storeSettings.baseCurrency || 'IQD';
  const isUsd = baseCurrency === 'USD' || currencyMode === 'usd';
  const rate = quotation.exchangeRate ?? storeSettings.exchangeRate ?? 1310;

  const fmtRow = (val: number) =>
    isUsd ? `$${fmtUSD(val / rate)}` : `${fmtIQD(val)}&nbsp;IQD`;

  const items = quotation.items ?? [];
  const rawDate = quotation.date || quotation.createdAt;
  const rawTime = quotation.time || quotation.createdAt;

  // Header Section
  const storeName = escHtml(business.name || 'Froshiar Store');
  const storePhone = settings.showBusinessPhone && business.phone ? escHtml(business.phone) : '';
  const storeAddress = settings.showBusinessAddress && business.address ? escHtml(business.address) : '';

  // Customer & Quotation Metadata
  const customerName = quotation.customerName && quotation.customerName.trim() ? escHtml(quotation.customerName) : '';
  const customerPhone = quotation.customerPhone && quotation.customerPhone.trim() ? escHtml(quotation.customerPhone) : '';
  const quotationNum = quotation.quotationNumber ? escHtml(quotation.quotationNumber) : '';
  const dateFormatted = formatDate(rawDate);
  const timeFormatted = formatTime(rawTime);
  const fullDateTime = [dateFormatted, timeFormatted].filter(Boolean).join(' ');

  // Items Rendering
  let itemsHTML = '';
  if (width === '58mm') {
    itemsHTML = items.map((item, i) => {
      const discountTag =
        settings.showDiscount && item.discount > 0
          ? `<span class="item-discount-sub">${ku(isAr ? 'الخصم:' : isKu ? 'داشکاندن:' : 'Disc:')} -${fmtRow(item.discount)}</span>`
          : '';
      const barcodeTag =
        settings.showItemBarcode && item.itemId
          ? `<span class="item-id-sub">#${escHtml(item.itemId)}</span>`
          : '';

      const unitPriceWithDiscount = settings.showDiscount && item.discount > 0
        ? `<span style="text-decoration:line-through;color:#777777;margin-inline-end:3px;">${fmtRow(item.unitPrice)}</span><span style="font-weight:700;">${fmtRow(item.unitPrice - item.discount)}</span>`
        : fmtRow(item.unitPrice);

      const qtyPricePart = settings.showQty && settings.showItemPrice
        ? `${item.quantity} × ${unitPriceWithDiscount}`
        : settings.showQty
        ? `${item.quantity} ${ku(isAr ? 'قطعة' : isKu ? 'دانە' : 'pcs')}`
        : settings.showItemPrice
        ? unitPriceWithDiscount
        : '';

      return `
        <div class="row-58">
          <div class="row-58-top">
            <span dir="ltr" style="display:inline-block;font-weight:700;margin-inline-end:3px;">${i + 1}.</span><bdi class="ku-text">${escHtml(item.productName)}</bdi>
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
          ? `<div class="item-discount-sub">${ku(isAr ? 'الخصم:' : isKu ? 'داشکاندن:' : 'Disc:')} -${fmtRow(item.discount)}</div>`
          : '';
      const unitPrice = settings.showDiscount && item.discount > 0
        ? `<span style="text-decoration:line-through;color:#777777;font-size:0.85em;display:block;">${fmtRow(item.unitPrice)}</span><span style="font-weight:700;">${fmtRow(item.unitPrice - item.discount)}</span>`
        : fmtRow(item.unitPrice);

      return `
        <tr class="item-row">
          <td class="col-item"><span dir="ltr" style="display:inline-block;font-weight:700;margin-inline-end:3px;">${i + 1}.</span><bdi class="ku-text">${escHtml(item.productName)}</bdi>${barcodeTag}${discountTag}</td>
          ${settings.showQty ? `<td class="col-qty" style="width:${qtyColWidth};">${item.quantity}</td>` : ''}
          ${settings.showItemPrice ? `<td class="col-price" style="width:${priceColWidth};">${unitPrice}</td>` : ''}
          <td class="col-total" style="width:${totalColWidth};">${fmtRow(item.lineTotal)}</td>
        </tr>
      `;
    }).join('');

    itemsHTML = `
      <table class="items-table">
        <thead>
          <tr>
            <th class="col-item">${ku(isAr ? 'المادة' : isKu ? 'کاڵا' : 'Item')}</th>
            ${settings.showQty ? `<th class="col-qty" style="width:${qtyColWidth};">${ku(isAr ? 'العدد' : isKu ? 'عدد' : 'Qty')}</th>` : ''}
            ${settings.showItemPrice ? `<th class="col-price" style="width:${priceColWidth};">${ku(isAr ? 'السعر' : isKu ? 'نرخ' : 'Price')}</th>` : ''}
            <th class="col-total" style="width:${totalColWidth};">${ku(isAr ? 'المجموع' : isKu ? 'کۆ' : 'Total')}</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    `;
  }

  const barcodeHTML = settings.showFooterBarcode && quotation.quotationNumber
    ? buildBarcodeSvg(quotation.quotationNumber)
    : '';

  const css = buildThermalCSS(width, isKurdish);

  return `<!DOCTYPE html>
<html lang="${currentLang}" dir="${isKurdish ? 'rtl' : 'ltr'}">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Quotation #${quotationNum}</title>
  <style>${css}</style>
</head>
<body>
  <div class="receipt-wrapper">
    <div class="biz-header">
      <div class="biz-name">${ku(storeName)}</div>
      <div class="biz-type-badge">${ku(isAr ? 'عرض أسعار (كشف)' : isKu ? 'وەسڵی عەرز (تەنها نرخ)' : 'Price Quotation')}</div>
      ${storeAddress ? `<div class="biz-contact">${ku(storeAddress)}</div>` : ''}
      ${storePhone ? `<div class="biz-contact">${storePhone}</div>` : ''}
    </div>
    <div class="divider-dashed"></div>

    <div class="info-section">
      ${quotationNum ? `<div class="info-row"><span class="info-label">${ku(isAr ? 'رقم العرض:' : isKu ? 'ژ. وەسڵ:' : 'Quote #:')}</span><span class="info-value">#${quotationNum}</span></div>` : ''}
      ${fullDateTime ? `<div class="info-row"><span class="info-label">${ku(isAr ? 'التاريخ:' : isKu ? 'بەروار:' : 'Date:')}</span><span class="info-value info-date" dir="ltr">${fullDateTime}</span></div>` : ''}
      ${customerName ? `<div class="info-row"><span class="info-label">${ku(isAr ? 'العميل:' : isKu ? 'کڕیار:' : 'Customer:')}</span><span class="info-value">${ku(customerName)}</span></div>` : ''}
      ${customerPhone ? `<div class="info-row"><span class="info-label">${ku(isAr ? 'الهاتف:' : isKu ? 'مۆبایل:' : 'Phone:')}</span><span class="info-value">${customerPhone}</span></div>` : ''}
    </div>
    <div class="divider-dashed"></div>

    <div class="items-section">${itemsHTML}</div>
    <div class="divider-dashed"></div>

    <div class="totals-section">
      ${quotation.discountTotal > 0 ? `
      <div class="total-row">
        <span class="info-label">${ku(isAr ? 'المجموع الفرعي:' : isKu ? 'کۆی سەرەتایی:' : 'Subtotal:')}</span>
        <span class="info-value">${fmtRow(quotation.subtotal)}</span>
      </div>
      <div class="total-row discount-text">
        <span class="info-label">${ku(isAr ? 'الخصم:' : isKu ? 'داشکاندن:' : 'Discount:')}</span>
        <span class="info-value">-${fmtRow(quotation.discountTotal)}</span>
      </div>` : ''}
      <div class="grand-total-row">
        <span class="grand-total-label">${ku(isAr ? 'المجموع النهائي:' : isKu ? 'کۆی گشتی عەرز:' : 'Grand Total:')}</span>
        <span class="grand-total-value">${fmtRow(quotation.grandTotal)}</span>
      </div>
      ${currencyMode === 'both' && rate > 0 ? `
      <div class="total-row" style="margin-top:2px;">
        <span class="info-label">${ku(isAr ? 'المعادل بالدولار:' : isKu ? 'یەکسانە بە دۆلار:' : 'USD Eq:')}</span>
        <span class="info-value" style="font-weight:700;color:#059669;">≈ $${fmtUSD(quotation.grandTotal / rate)} USD</span>
      </div>` : ''}
    </div>

    <div class="divider-dashed"></div>
    <div style="text-align:center;font-size:8.5pt;font-weight:700;color:#555555;padding:4px 0;">
      ${ku(isAr ? 'تنبيه: هذا كشف أسعار أولي فقط ولا يعتبر فاتورة بيع' : isKu ? 'تێبینی: ئەم وەسڵە تەنها عەرزی نرخە و بە وەسڵی فرۆشتن هەژمار ناکرێت' : 'Notice: This is a price quotation and not a sales receipt')}
    </div>

    ${quotation.notes ? `
    <div class="notes-box">
      <div class="notes-title">${ku(isAr ? 'الملاحظات:' : isKu ? 'تێبینی:' : 'Notes:')}</div>
      <div class="notes-content">${ku(escHtml(quotation.notes))}</div>
    </div>` : ''}

    <div class="receipt-footer">
      ${settings.customFooterNote ? `<div class="footer-msg">${ku(escHtml(settings.customFooterNote))}</div>` : ''}
      ${barcodeHTML}
      <div class="brand-credit">Froshiar • www.froshiar.store</div>
    </div>
  </div>
</body>
</html>`;
}
