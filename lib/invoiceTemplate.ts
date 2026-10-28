import type { Sale } from '@/types/sales';
import type { Purchase } from '@/types/purchases';
import type { PurchaseDebt } from '@/types/debt';
import {
  fmtIQD, fmtUSD, fmtPct, formatDate, formatTime,
  getPaymentStatus,
} from '@/utils/formatters';
import { KURDISH_FONT_FACE, PDF_BRAND_WEBSITE, pdfDevelopedByText, kuSpan, isKurdishPdfActive } from '@/lib/pdfFont';
import i18n from '@/lib/i18n';
import { useSettingsStore } from '@/store/settingsStore';

interface BusinessInfo {
  name: string;
  phone: string;
  address: string;
  logoUri: string | null;
}

import { escHtml, sanitizeImageUri } from '@/lib/security';

// PDF language follows the app's current language automatically. `t()`
// reads from the invoicePdf i18n namespace; `ku()` (shared from lib/pdfFont)
// wraps already-translated label text in an RTL-shaped, Bahij Janna-fonted span
// without ever touching the position/width/alignment of the element it sits
// inside -- numbers, IDs, dates, and user-entered data (names/addresses/etc.)
// never pass through `ku()`, so they always keep rendering as plain
// LTR/Latin-digit text.
function t(key: string, opts?: Record<string, unknown>): string {
  return i18n.t(`invoicePdf.${key}`, opts) as string;
}
const ku = kuSpan;

// Presentation-only choice made on the Purchase/Sales Receipt screen for the
// PDF currently being generated -- never persisted, never affects any
// calculation. Governs only the grand-total block via buildGrandTotal()
// below; item rows and every other financial row always stay in IQD.
export type ReceiptCurrencyMode = 'iqd' | 'usd' | 'both';

function buildGrandTotal(
  mode: ReceiptCurrencyMode,
  amountIQD: number,
  exchangeRate: number,
  isUsdBase: boolean = false,
  isKurdish: boolean = true
) {
  const totalUSD = fmtUSD(amountIQD / exchangeRate);
  const totalIQD = fmtIQD(amountIQD);

  const showUsdOnly = !isUsdBase && mode === 'usd';
  const showIqdOnly = !isUsdBase && mode === 'iqd';
  const showBoth = !showUsdOnly && !showIqdOnly;

  const usdLabel = ku(isKurdish ? 'کۆی گشتی (USD)' : 'Grand Total (USD)');
  const iqdLabel = ku(isKurdish ? 'کۆی گشتی (IQD)' : 'Grand Total (IQD)');
  const iqdSubLabel = ku(isKurdish ? 'کۆی گشتی بە دینار' : 'Total in IQD');
  const usdSubLabel = ku(isKurdish ? 'کۆی گشتی بە دۆلار' : 'Total in USD');

  if (isUsdBase) {
    const totalBlock = `
      <div class="total-block">
        <div class="total-row primary">
          <span class="total-label">${usdLabel}</span>
          <span class="total-amount en-num" dir="ltr">$${totalUSD}</span>
        </div>
        ${showBoth ? `
        <div class="total-divider"></div>
        <div class="total-row secondary">
          <span class="total-sub-label">${iqdSubLabel}</span>
          <span class="total-sub-amount en-num" dir="ltr">${totalIQD} IQD</span>
        </div>` : ''}
      </div>`;
    return { totalBlock, usdCard: '' };
  }

  if (showUsdOnly) {
    const totalBlock = `
      <div class="total-block">
        <div class="total-row primary">
          <span class="total-label">${usdLabel}</span>
          <span class="total-amount en-num" dir="ltr">$${totalUSD}</span>
        </div>
      </div>`;
    return { totalBlock, usdCard: '' };
  }

  const totalBlock = `
    <div class="total-block">
      <div class="total-row primary">
        <span class="total-label">${iqdLabel}</span>
        <span class="total-amount en-num" dir="ltr">${totalIQD} IQD</span>
      </div>
      ${showBoth ? `
      <div class="total-divider"></div>
      <div class="total-row secondary">
        <span class="total-sub-label">${usdSubLabel}</span>
        <span class="total-sub-amount en-num" dir="ltr">$${totalUSD}</span>
      </div>` : ''}
    </div>`;
  return { totalBlock, usdCard: '' };
}

// ─── Sales Invoice CSS ────────────────────────────────────────────────────────
// Mirrors buildPurchaseCSS's design system (monochrome, 3-column header, card
// layout) exactly — kept as a separate function so the two templates can
// still diverge in the few places sales genuinely needs more (discount
// column, 3-state payment status), without risking the purchase template.

function buildSalesCSS(isKurdish: boolean): string {
  const kuAlign = isKurdish ? 'right' : 'left';
  const numAlign = isKurdish ? 'left' : 'right';
  return `
  ${KURDISH_FONT_FACE}
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    direction: ltr;
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, 'Bahij Janna', sans-serif;
    background: #ffffff;
    color: #000000;
    font-size: 14px;
    line-height: 1.5;
  }
  .ku-text { font-family: 'Bahij Janna', 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; direction: rtl; unicode-bidi: isolate; }
  .body .ku-text { font-weight: 400; letter-spacing: normal; text-transform: none; }

  /* ── Header: 3-column (Business | Customer | Invoice Info) ── */
  .header {
    padding: 24px 32px 20px;
    border-bottom: 1px solid #e2e8f0;
  }
  .header-cols {
    display: flex;
    align-items: flex-start;
    page-break-inside: avoid;
  }
  .col-business, .col-customer, .col-invoice {
    flex: 1 1 33%;
    min-width: 0;
    overflow-wrap: break-word;
    word-break: break-word;
  }
  .col-business { padding-right: 18px; }
  .col-customer { padding: 0 18px; border-left: 1px solid #e2e8f0; }
  .col-invoice  { padding-left: 18px; border-left: 1px solid #e2e8f0; }

  .logo-frame {
    width: 52px;
    height: 52px;
    border-radius: 12px;
    overflow: hidden;
    border: 1px solid #e2e8f0;
    background: #f8fafc;
    margin-bottom: 8px;
  }
  .logo-img { width: 100%; height: 100%; object-fit: contain; display: block; }
  .logo-mono {
    width: 100%; height: 100%;
    display: flex; align-items: center; justify-content: center;
    font-size: 20px; font-weight: 800; color: #000000;
    background: linear-gradient(135deg, #eef2f7, #e2e8f0);
  }
  .biz-name { font-size: 17px; font-weight: 800; letter-spacing: -0.3px; color: #000000; margin-bottom: 4px; }
  .biz-meta { font-size: 12px; color: #000000; line-height: 1.6; }

  .inv-label { font-size: ${isKurdish ? '14px' : '10.5px'}; font-weight: ${isKurdish ? '400' : '700'}; text-transform: uppercase; letter-spacing: ${isKurdish ? 'normal' : '1.4px'}; color: #000000; margin-bottom: 8px; text-align: ${kuAlign}; }
  .inv-meta-title { font-size: 17px; font-weight: ${isKurdish ? '400' : '800'}; color: #000000; margin-bottom: 6px; text-align: ${kuAlign}; }
  .inv-meta-line { font-size: 12.5px; font-weight: 400; color: #000000; margin-bottom: 2px; text-align: ${kuAlign}; }
  .inv-status-row { display: flex; flex-direction: ${isKurdish ? 'row-reverse' : 'row'}; align-items: center; gap: 6px; margin-top: 6px; }

  .pill {
    display: inline-block;
    padding: 4px 14px;
    font-size: 10.5px;
    font-weight: 700;
    letter-spacing: 0.6px;
    text-transform: uppercase;
    border-radius: 999px;
  }
  .pill-paid    { background: #ecfdf5; color: #047857; border: 1px solid #a7f3d0; }
  .pill-fib     { background: #eff6ff; color: #1d4ed8; border: 1px solid #bfdbfe; }
  .pill-partial { background: #fff7ed; color: #b45309; border: 1px solid #fed7aa; }
  .pill-debt    { background: #fef2f2; color: #b91c1c; border: 1px solid #fecaca; }

  /* ── Body ── */
  .body { padding: 18px 32px 24px; }

  /* ── Cards ── */
  .card {
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    padding: 10px 14px;
    margin-bottom: 12px;
    page-break-inside: avoid;
    background: #ffffff;
  }
  .card-tint { background: #f8fafc; }
  .card-label {
    font-size: ${isKurdish ? '12px' : '10px'};
    font-weight: ${isKurdish ? '700' : '700'};
    text-transform: uppercase;
    letter-spacing: ${isKurdish ? 'normal' : '0.8px'};
    color: #475569;
    margin-bottom: 6px;
    text-align: ${kuAlign};
  }
  ${!isKurdish ? '.col-customer .card-label { font-size: 10px; text-align: left; }' : ''}

  /* ── Customer info rows: compact, label hugs value ── */
  .info-row { display: flex; flex-direction: ${isKurdish ? 'row-reverse' : 'row'}; align-items: baseline; gap: 6px; padding: 2px 0; font-size: 12.5px; }
  .row-label { color: #475569; font-weight: ${isKurdish ? '600' : '700'}; }
  .row-value { color: #000000; font-weight: 500; }
  .row-value-ltr { direction: ltr; unicode-bidi: isolate; }

  /* ── Header meta rows: label/value as separate boxes so RTL order is CSS-driven, not bidi-reordered ── */
  .inv-meta-row { display: flex; flex-direction: ${isKurdish ? 'row-reverse' : 'row'}; align-items: baseline; gap: 4px; margin-bottom: 2px; }
  .inv-meta-row-title { margin-bottom: 4px; }
  .inv-meta-row .row-label, .inv-meta-row .row-value { font-size: 12px; font-weight: 400; }
  .inv-meta-row-title .row-label, .inv-meta-row-title .row-value { font-size: 16px; font-weight: ${isKurdish ? '600' : '800'}; }

  /* ── Table ── */
  .table-card {
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    overflow: hidden;
    margin-bottom: 14px;
  }
  table { width: 100%; border-collapse: collapse; page-break-inside: auto; direction: ${isKurdish ? 'rtl' : 'ltr'}; }
  thead { display: table-header-group; }
  tbody tr { page-break-inside: avoid; }
  th {
    background: #f8fafc;
    color: #1e293b;
    font-size: 10px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.6px;
    padding: 8px 10px;
    border-bottom: 1.5px solid #e2e8f0;
  }
  td {
    padding: 8px 10px;
    font-size: 12px;
    border-bottom: 1px solid #f1f5f9;
    vertical-align: middle;
    color: #000000;
  }
  tbody tr:last-child td { border-bottom: none; }
  tbody tr:nth-child(even) { background: #f8fafc; }
  .center { text-align: center; }
  .right  { text-align: ${numAlign}; unicode-bidi: isolate; direction: ltr; }
  .item-name { font-weight: 600; color: #000000; font-size: 12.5px; display: block; unicode-bidi: plaintext; }
  .item-desc { display: block; font-size: 10px; font-weight: 400; color: #64748b; margin-top: 2px; unicode-bidi: plaintext; }
  .id-chip {
    display: inline-block;
    font-size: 9.5px;
    color: #334155;
    border: 1px solid #e2e8f0;
    border-radius: 4px;
    padding: 1px 5px;
    font-weight: 600;
    unicode-bidi: isolate;
    direction: ltr;
  }
  .num-col { color: #000000; font-size: 11.5px; font-weight: 700; text-align: center; unicode-bidi: isolate; direction: ltr; }
  .empty-row { text-align: center; color: #64748b; padding: 22px 14px; font-size: 12.5px; }
  .muted-cell { color: #94a3b8; }

  /* ── Financial ── */
  .fin-row {
    display: flex;
    flex-direction: row;
    justify-content: space-between;
    align-items: center;
    padding: 3.5px 0;
    font-size: 12px;
    color: #1e293b;
    width: 100%;
  }
  .fin-amount {
    font-weight: 600;
    color: #000000;
    font-size: 12px;
    direction: ltr;
    unicode-bidi: isolate;
  }
  .fin-discount { color: #d97706; font-weight: 700; }
  .fin-amount-paid { color: #047857; font-weight: 700; }
  .fin-amount-debt { color: #b91c1c; font-weight: 800; }

  .total-block {
    display: flex;
    flex-direction: column;
    padding: 7px 10px;
    margin: 6px 0;
    background: #f8fafc;
    border: 1px solid #cbd5e1;
    border-radius: 6px;
    width: 100%;
  }
  .total-row {
    display: flex;
    flex-direction: row;
    justify-content: space-between;
    align-items: center;
    width: 100%;
  }
  .total-divider {
    height: 1px;
    border-top: 1px dashed #cbd5e1;
    margin: 5px 0;
    width: 100%;
  }
  .total-label {
    font-size: 11px;
    font-weight: 700;
    color: #1e293b;
    text-transform: uppercase;
    letter-spacing: 0.3px;
  }
  .total-amount {
    font-size: 15px;
    font-weight: 800;
    color: #000000;
    letter-spacing: -0.2px;
  }
  .total-sub-label {
    font-size: 10.5px;
    font-weight: 600;
    color: #475569;
  }
  .total-sub-amount {
    font-size: 12.5px;
    font-weight: 700;
    color: #1e293b;
  }

  .en-num {
    unicode-bidi: isolate;
    direction: ltr;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
  }

  /* ── USD conversion ── */
  .usd-row { display: flex; justify-content: space-between; align-items: baseline; }
  .usd-stack { width: 100%; }
  .usd-label { font-size: ${isKurdish ? '13px' : '10px'}; font-weight: ${isKurdish ? '400' : '700'}; text-transform: uppercase; letter-spacing: ${isKurdish ? 'normal' : '1.1px'}; color: #000000; margin-bottom: 4px; text-align: ${kuAlign}; }
  .usd-amount { font-size: 18px; font-weight: 800; color: #000000; }

  /* ── Block text ── */
  .block-text { font-size: 11.5px; color: #1e293b; line-height: 1.5; overflow-wrap: break-word; word-break: break-word; }

  /* ── Company Policy / About Section at Top ── */
  .policy-card {
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    padding: 8px 12px;
    margin-bottom: 12px;
    page-break-inside: avoid;
    direction: ${isKurdish ? 'rtl' : 'ltr'};
    text-align: ${kuAlign};
  }
  .policy-label {
    font-size: ${isKurdish ? '11px' : '10px'};
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: ${isKurdish ? 'normal' : '0.6px'};
    color: #475569;
    margin-bottom: 3px;
    text-align: ${kuAlign};
  }
  .policy-text {
    font-size: 11.5px;
    color: #000000;
    line-height: 1.55;
    white-space: pre-wrap;
    overflow-wrap: break-word;
    word-break: break-word;
    text-align: ${kuAlign};
  }

  /* ── Top Summary Pair: Financial on LEFT, Notes & Warranty on RIGHT above table ── */
  .top-summary-pair {
    display: flex;
    flex-direction: row;
    justify-content: space-between;
    align-items: flex-start;
    gap: 14px;
    margin-bottom: 14px;
    page-break-inside: avoid;
    direction: ltr;
  }
  .top-summary-left {
    flex: 0 1 48%;
    max-width: 48%;
    min-width: 0;
    direction: ${isKurdish ? 'rtl' : 'ltr'};
  }
  .top-summary-right {
    flex: 0 1 48%;
    max-width: 48%;
    min-width: 0;
    direction: ${isKurdish ? 'rtl' : 'ltr'};
  }
  .top-summary-pair .card {
    margin-bottom: 0;
  }

  /* ── Warranty + Notes: side-by-side info area ── */
  .info-pair {
    display: flex;
    flex-direction: ${isKurdish ? 'row-reverse' : 'row'};
    align-items: stretch;
    gap: 16px;
    page-break-inside: avoid;
  }
  .info-pair > .card { flex: 1 1 50%; min-width: 0; }

  /* ── Footer ── */
  .footer {
    border-top: 1px solid #f1f5f9;
    text-align: center;
    padding: 16px 36px 22px;
    color: #cbd5e1;
    font-size: 11px;
  }

  @media print { body { background: white; } }
`;
}

// ─── Sales Invoice ─────────────────────────────────────────────────────────────

export function buildInvoiceHTML(
  sale: Sale,
  business: BusinessInfo,
  dir: 'ltr' | 'rtl' = 'ltr',
  exchangeRate: number = 1310,
  currencyMode: ReceiptCurrencyMode = 'iqd'
): string {
  const items = sale.items ?? [];
  const isKurdish = isKurdishPdfActive();
  const lang = isKurdish ? 'ku' : 'en';
  const kuAlign = isKurdish ? 'right' : 'left';

  const baseCurrency = useSettingsStore.getState().baseCurrency || 'IQD';
  const isUsdBase = baseCurrency === 'USD' || currencyMode === 'usd';
  const rate = exchangeRate || useSettingsStore.getState().exchangeRate || 1310;
  const fmtRow = (val: number) => isUsdBase ? `$${fmtUSD(val / rate)}` : `${fmtIQD(val)} IQD`;

  const monogram = (business.name ?? '').trim().charAt(0).toUpperCase() || 'B';
  const safeLogoUri = sanitizeImageUri(business.logoUri);
  const logoHTML = safeLogoUri
    ? `<img src="${safeLogoUri}" class="logo-img" alt="logo" />`
    : `<div class="logo-mono">${escHtml(monogram)}</div>`;

  const paymentStatus = getPaymentStatus(sale);
  const statusKey = paymentStatus === 'paid' ? 'statusPaid' : paymentStatus === 'partial' ? 'statusPartial' : 'statusUnpaid';
  const pillClass = paymentStatus === 'paid' ? 'pill-paid' : paymentStatus === 'partial' ? 'pill-partial' : 'pill-debt';
  const statusBadge = `<span class="pill ${pillClass}">${ku(t(statusKey))}</span>`;

  // ── Customer (rendered inside the header's middle column) ──
  const customerColumn = (sale.customerName || sale.customerPhone || sale.customerAddress) ? `
      <div class="card-label">${ku(t('customer'))}</div>
      ${sale.customerName    ? `<div class="info-row"><span class="row-label">${ku(t('name') + ':')}</span><span class="row-value">${escHtml(sale.customerName)}</span></div>` : ''}
      ${sale.customerPhone   ? `<div class="info-row"><span class="row-label">${ku(t('phone') + ':')}</span><span class="row-value">${escHtml(sale.customerPhone)}</span></div>` : ''}
      ${sale.customerAddress ? `<div class="info-row"><span class="row-label">${ku(t('address') + ':')}</span><span class="row-value">${escHtml(sale.customerAddress)}</span></div>` : ''}` : '';

  // ── Items table — Product ID is always its own column, never hidden ──
  const itemRows = items.length > 0 ? items.map((item, i) => `
    <tr>
      <td class="num-col">${i + 1}</td>
      <td style="text-align:${kuAlign};"><span class="item-name">${escHtml(item.productName)}</span>${item.itemDescription ? `<span class="item-desc">${escHtml(item.itemDescription)}</span>` : ''}</td>
      <td class="center">${item.itemId ? `<span class="id-chip">${escHtml(item.itemId)}</span>` : '<span class="muted-cell">—</span>'}</td>
      <td class="center">${item.quantity}</td>
      <td class="right">${fmtRow(item.sellingPrice)}</td>
      <td class="right">${item.discount > 0 ? `<span style="color:#d97706;font-weight:600;">− ${fmtRow(item.discount)}</span>` : '<span class="muted-cell">—</span>'}</td>
      <td class="right" style="font-weight:700;">${fmtRow(item.lineTotal)}</td>
    </tr>
  `).join('') : `<tr><td colspan="7" class="empty-row">${ku(t('noItems'))}</td></tr>`;

  const dateTimeValue = sale.date ?? sale.createdAt;

  const blockTextStyle = isKurdish ? `direction:rtl;text-align:${kuAlign};white-space:pre-wrap;` : '';

  const notesText = sale.notes ? escHtml(sale.notes) : ku(t('noNotes'));

  const notesCard = `
    <div class="card">
      ${sale.warranty ? `
      <div style="margin-bottom: 6px;">
        <div class="card-label">${ku(t('warranty'))}</div>
        <p class="block-text" style="${blockTextStyle}">${escHtml(sale.warranty)}</p>
      </div>
      <div style="margin: 6px 0; border-top: 1px dashed #e2e8f0;"></div>
      ` : ''}
      <div>
        <div class="card-label">${ku(t('notes'))}</div>
        <p class="block-text" style="${blockTextStyle}">${notesText}</p>
      </div>
    </div>`;

  const { totalBlock, usdCard } = buildGrandTotal(currencyMode, sale.grandTotal, rate, isUsdBase, isKurdish);

  const initialMethodTag = sale.initialPaymentMethod ? ` (${sale.initialPaymentMethod === 'fib' ? 'FIB' : (isKurdish ? 'کاش' : 'Cash')})` : '';
  const paidRow = sale.paidAmount > 0 && sale.paymentMethod === 'debt' ? `
    <div class="fin-row" style="margin-top:3px;">
      <span style="color:#047857;font-weight:600;">${ku(t('amountPaid'))}${initialMethodTag}</span>
      <span class="fin-amount fin-amount-paid en-num" dir="ltr">${fmtRow(sale.paidAmount)}</span>
    </div>` : '';

  const debtRow = sale.remainingDebt > 0 ? `
    <div class="fin-row" style="margin-top:2px;">
      <span style="color:#b91c1c;font-weight:700;">${ku(t('remainingDebt'))}</span>
      <span class="fin-amount fin-amount-debt en-num" dir="ltr">${fmtRow(sale.remainingDebt)}</span>
    </div>` : '';

  const financialCard = `
    <div class="card">
      <div class="card-label">${ku(t('paymentSummary'))}</div>
      <div class="fin-row">
        <span>${ku(t('subtotal'))}</span>
        <span class="fin-amount en-num" dir="ltr">${fmtRow(sale.subtotal)}</span>
      </div>
      ${sale.discountTotal > 0 ? `
      <div class="fin-row">
        <span style="color:#d97706;font-weight:600;">${ku(t('itemDiscountTotal'))}</span>
        <span class="fin-amount fin-discount en-num" dir="ltr">− ${fmtRow(sale.discountTotal)}</span>
      </div>` : ''}
      ${sale.globalDiscount > 0 ? `
      <div class="fin-row">
        <span style="color:#d97706;font-weight:600;">${ku(t('cartDiscountTotal'))}</span>
        <span class="fin-amount fin-discount en-num" dir="ltr">− ${fmtRow(sale.globalDiscount)}</span>
      </div>` : ''}
      ${totalBlock}
      ${paidRow}
      ${debtRow}
    </div>`;

  const aboutPolicyText = (sale.aboutPolicy ?? useSettingsStore.getState().invoiceAboutPolicy ?? '').trim();
  const aboutPolicySection = aboutPolicyText ? `
  <div class="policy-card">
    <div class="policy-label">${ku(t('companyPolicy'))}</div>
    <p class="policy-text">${escHtml(aboutPolicyText)}</p>
  </div>` : '';

  return `<!DOCTYPE html>
<html lang="${lang}" dir="ltr">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Froshiar-${escHtml(sale.invoiceNumber)}</title>
<style>${buildSalesCSS(isKurdish)}</style>
</head>
<body>

<div class="header">
  <div class="header-cols">
    <div class="col-business">
      <div class="logo-frame">
        ${logoHTML}
      </div>
      <div class="biz-name">${escHtml(business.name || 'Business')}</div>
      ${business.address ? `<div class="biz-meta">${escHtml(business.address)}</div>` : ''}
      ${business.phone ? `<div class="biz-meta">${escHtml(business.phone)}</div>` : ''}
    </div>
    <div class="col-customer">
      ${customerColumn}
    </div>
    <div class="col-invoice">
      <div class="inv-label">${ku(t('salesInvoiceLabel'))}</div>
      <div class="inv-meta-row inv-meta-row-title">
        <span class="row-label">${ku(t('invoiceNumberLabel'))}</span>
        <span class="row-value row-value-ltr">${sale.invoiceNumber?.startsWith('F-') ? '' : '#'}${escHtml(sale.invoiceNumber)}</span>
      </div>
      <div class="inv-meta-row">
        <span class="row-label">${ku(t('date') + ':')}</span>
        <span class="row-value row-value-ltr">${escHtml(formatDate(dateTimeValue))}</span>
      </div>
      <div class="inv-meta-row">
        <span class="row-label">${ku(t('time') + ':')}</span>
        <span class="row-value row-value-ltr">${escHtml(formatTime(dateTimeValue))}</span>
      </div>
      <div class="inv-status-row">
        <span class="inv-meta-line">${ku(t('status') + ':')}</span>
        ${statusBadge}
      </div>
    </div>
  </div>
</div>

<div class="body">

  ${aboutPolicySection}

  <div class="top-summary-pair">
    <div class="top-summary-left">
      ${financialCard}
    </div>
    <div class="top-summary-right">
      ${notesCard}
    </div>
  </div>

  <div class="table-card">
    <table>
      <thead>
        <tr>
          <th class="center" style="width:30px;">#</th>
          <th style="text-align:${kuAlign};">${ku(t('colProduct'))}</th>
          <th class="center" style="width:100px;">${ku(t('colProductId'))}</th>
          <th class="center" style="width:50px;">${ku(t('colQty'))}</th>
          <th class="right" style="width:100px;">${ku(t('colUnitPrice'))}</th>
          <th class="right" style="width:90px;">${ku(t('colDiscount'))}</th>
          <th class="right" style="width:110px;">${ku(t('colLineTotal'))}</th>
        </tr>
      </thead>
      <tbody>
        ${itemRows}
      </tbody>
    </table>
  </div>

</div>

<div class="footer">
  ${ku(t('salesInvoiceLabel'))} &nbsp;·&nbsp; ${ku(pdfDevelopedByText())} · ${PDF_BRAND_WEBSITE} &nbsp;·&nbsp; ${escHtml(sale.invoiceNumber)}
</div>

</body>
</html>`;
}

// ─── Purchase Invoice ─────────────────────────────────────────────────────────

export interface PurchaseItemRow {
  productName: string;
  category: string | null;
  quantity: number;
  buyPriceIQD: number;
  lineTotalIQD: number;
  idType: string | null;
  itemIds: string[];
}


function buildPurchaseCSS(isKurdish: boolean): string {
  const kuAlign = isKurdish ? 'right' : 'left';
  const numAlign = isKurdish ? 'left' : 'right';
  return `
  ${KURDISH_FONT_FACE}
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    direction: ltr;
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, 'Bahij Janna', sans-serif;
    background: #ffffff;
    color: #000000;
    font-size: 14px;
    line-height: 1.5;
  }
  .ku-text { font-family: 'Bahij Janna', 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; direction: rtl; unicode-bidi: isolate; }
  .body .ku-text { font-weight: 400; letter-spacing: normal; text-transform: none; }

  /* ── Header: 3-column (Business | Supplier | Invoice Info) ── */
  .header {
    padding: 24px 32px 20px;
    border-bottom: 1px solid #e2e8f0;
  }
  .header-cols {
    display: flex;
    align-items: flex-start;
    page-break-inside: avoid;
  }
  .col-business, .col-supplier, .col-invoice {
    flex: 1 1 33%;
    min-width: 0;
    overflow-wrap: break-word;
    word-break: break-word;
  }
  .col-business { padding-right: 18px; }
  .col-supplier { padding: 0 18px; border-left: 1px solid #e2e8f0; }
  .col-invoice  { padding-left: 18px; border-left: 1px solid #e2e8f0; }

  .logo-frame {
    width: 52px;
    height: 52px;
    border-radius: 12px;
    overflow: hidden;
    border: 1px solid #e2e8f0;
    background: #f8fafc;
    margin-bottom: 8px;
  }
  .logo-img { width: 100%; height: 100%; object-fit: contain; display: block; }
  .logo-mono {
    width: 100%; height: 100%;
    display: flex; align-items: center; justify-content: center;
    font-size: 20px; font-weight: 800; color: #000000;
    background: linear-gradient(135deg, #eef2f7, #e2e8f0);
  }
  .biz-name { font-size: 17px; font-weight: 800; letter-spacing: -0.3px; color: #000000; margin-bottom: 4px; }
  .biz-meta { font-size: 12px; color: #000000; line-height: 1.6; }

  .inv-label { font-size: ${isKurdish ? '14px' : '10.5px'}; font-weight: ${isKurdish ? '400' : '700'}; text-transform: uppercase; letter-spacing: ${isKurdish ? 'normal' : '1.4px'}; color: #000000; margin-bottom: 8px; text-align: ${kuAlign}; }
  .inv-meta-title { font-size: 17px; font-weight: ${isKurdish ? '400' : '800'}; color: #000000; margin-bottom: 6px; text-align: ${kuAlign}; }
  .inv-meta-line { font-size: 12.5px; font-weight: 400; color: #000000; margin-bottom: 2px; text-align: ${kuAlign}; }
  .inv-status-row { display: flex; flex-direction: ${isKurdish ? 'row-reverse' : 'row'}; align-items: center; gap: 6px; margin-top: 6px; }

  .pill {
    display: inline-block;
    padding: 4px 14px;
    font-size: 10.5px;
    font-weight: 700;
    letter-spacing: 0.6px;
    text-transform: uppercase;
    border-radius: 999px;
  }
  .pill-paid { background: #ecfdf5; color: #047857; border: 1px solid #a7f3d0; }
  .pill-fib  { background: #eff6ff; color: #1d4ed8; border: 1px solid #bfdbfe; }
  .pill-debt { background: #fef2f2; color: #b91c1c; border: 1px solid #fecaca; }

  /* ── Body ── */
  .body { padding: 18px 32px 24px; }

  /* ── Cards ── */
  .card {
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    padding: 10px 14px;
    margin-bottom: 12px;
    page-break-inside: avoid;
    background: #ffffff;
  }
  .card-tint { background: #f8fafc; }
  .card-label {
    font-size: ${isKurdish ? '12px' : '10px'};
    font-weight: ${isKurdish ? '700' : '700'};
    text-transform: uppercase;
    letter-spacing: ${isKurdish ? 'normal' : '0.8px'};
    color: #475569;
    margin-bottom: 6px;
    text-align: ${kuAlign};
  }
  ${!isKurdish ? '.col-supplier .card-label { font-size: 10px; text-align: left; }' : ''}

  /* ── Supplier info rows: compact, label hugs value ── */
  .info-row { display: flex; flex-direction: ${isKurdish ? 'row-reverse' : 'row'}; align-items: baseline; gap: 6px; padding: 2px 0; font-size: 12.5px; }
  .row-label { color: #475569; font-weight: ${isKurdish ? '600' : '700'}; }
  .row-value { color: #000000; font-weight: 500; }
  .row-value-ltr { direction: ltr; unicode-bidi: isolate; }

  /* ── Header meta rows: label/value as separate boxes so RTL order is CSS-driven, not bidi-reordered ── */
  .inv-meta-row { display: flex; flex-direction: ${isKurdish ? 'row-reverse' : 'row'}; align-items: baseline; gap: 4px; margin-bottom: 2px; }
  .inv-meta-row-title { margin-bottom: 4px; }
  .inv-meta-row .row-label, .inv-meta-row .row-value { font-size: 12px; font-weight: 400; }
  .inv-meta-row-title .row-label, .inv-meta-row-title .row-value { font-size: 16px; font-weight: ${isKurdish ? '600' : '800'}; }

  /* ── Table ── */
  .table-card {
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    overflow: hidden;
    margin-bottom: 14px;
  }
  table { width: 100%; border-collapse: collapse; page-break-inside: auto; direction: ${isKurdish ? 'rtl' : 'ltr'}; }
  thead { display: table-header-group; }
  tbody tr { page-break-inside: avoid; }
  th {
    background: #f8fafc;
    color: #1e293b;
    font-size: 10px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.6px;
    padding: 8px 10px;
    border-bottom: 1.5px solid #e2e8f0;
  }
  td {
    padding: 8px 10px;
    font-size: 12px;
    border-bottom: 1px solid #f1f5f9;
    vertical-align: middle;
    color: #000000;
  }
  tbody tr:last-child td { border-bottom: none; }
  tbody tr:nth-child(even) { background: #f8fafc; }
  .center { text-align: center; }
  .right  { text-align: ${numAlign}; unicode-bidi: isolate; direction: ltr; }
  .item-name { font-weight: 600; color: #000000; font-size: 12.5px; display: block; unicode-bidi: plaintext; }
  .item-desc { display: block; font-size: 10px; font-weight: 400; color: #64748b; margin-top: 2px; unicode-bidi: plaintext; }
  .item-id {
    display: inline-flex;
    flex-direction: ${isKurdish ? 'row-reverse' : 'row'};
    align-items: baseline;
    gap: 4px;
    margin-top: 2px;
    font-size: 9.5px;
    color: #334155;
    border: 1px solid #e2e8f0;
    border-radius: 4px;
    padding: 1px 5px;
    font-weight: 600;
  }
  .item-id-value { direction: ltr; unicode-bidi: isolate; }
  .num-col { color: #000000; font-size: 11.5px; font-weight: 700; text-align: center; unicode-bidi: isolate; direction: ltr; }

  /* ── Financial ── */
  .fin-row {
    display: flex;
    flex-direction: row;
    justify-content: space-between;
    align-items: center;
    padding: 3.5px 0;
    font-size: 12px;
    color: #1e293b;
    width: 100%;
  }
  .fin-amount {
    font-weight: 600;
    color: #000000;
    font-size: 12px;
    direction: ltr;
    unicode-bidi: isolate;
  }
  .fin-amount.muted { color: #000000; font-weight: 600; }
  .fin-discount { color: #d97706; font-weight: 700; }
  .fin-amount-paid { color: #047857; font-weight: 700; }
  .fin-amount-debt { color: #b91c1c; font-weight: 800; }

  .total-block {
    display: flex;
    flex-direction: column;
    padding: 7px 10px;
    margin: 6px 0;
    background: #f8fafc;
    border: 1px solid #cbd5e1;
    border-radius: 6px;
    width: 100%;
  }
  .total-row {
    display: flex;
    flex-direction: row;
    justify-content: space-between;
    align-items: center;
    width: 100%;
  }
  .total-divider {
    height: 1px;
    border-top: 1px dashed #cbd5e1;
    margin: 5px 0;
    width: 100%;
  }
  .total-label {
    font-size: 11px;
    font-weight: 700;
    color: #1e293b;
    text-transform: uppercase;
    letter-spacing: 0.3px;
  }
  .total-amount {
    font-size: 15px;
    font-weight: 800;
    color: #000000;
    letter-spacing: -0.2px;
  }
  .total-sub-label {
    font-size: 10.5px;
    font-weight: 600;
    color: #475569;
  }
  .total-sub-amount {
    font-size: 12.5px;
    font-weight: 700;
    color: #1e293b;
  }

  .en-num {
    unicode-bidi: isolate;
    direction: ltr;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
  }

  /* ── USD conversion ── */
  .usd-row { display: flex; justify-content: space-between; align-items: baseline; }
  .usd-stack { width: 100%; }
  .usd-label { font-size: ${isKurdish ? '13px' : '10px'}; font-weight: ${isKurdish ? '400' : '700'}; text-transform: uppercase; letter-spacing: ${isKurdish ? 'normal' : '1.1px'}; color: #000000; margin-bottom: 4px; text-align: ${kuAlign}; }
  .usd-amount { font-size: 18px; font-weight: 800; color: #000000; }

  /* ── Block text ── */
  .block-text { font-size: 11.5px; color: #1e293b; line-height: 1.5; }

  /* ── Company Policy / About Section at Top ── */
  .policy-card {
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    padding: 8px 12px;
    margin-bottom: 12px;
    page-break-inside: avoid;
    direction: ${isKurdish ? 'rtl' : 'ltr'};
    text-align: ${kuAlign};
  }
  .policy-label {
    font-size: ${isKurdish ? '11px' : '10px'};
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: ${isKurdish ? 'normal' : '0.6px'};
    color: #475569;
    margin-bottom: 3px;
    text-align: ${kuAlign};
  }
  .policy-text {
    font-size: 11.5px;
    color: #000000;
    line-height: 1.55;
    white-space: pre-wrap;
    overflow-wrap: break-word;
    word-break: break-word;
    text-align: ${kuAlign};
  }

  /* ── Top Summary Pair: Financial on LEFT, Notes & Warranty on RIGHT above table ── */
  .top-summary-pair {
    display: flex;
    flex-direction: row;
    justify-content: space-between;
    align-items: flex-start;
    gap: 14px;
    margin-bottom: 14px;
    page-break-inside: avoid;
    direction: ltr;
  }
  .top-summary-left {
    flex: 0 1 48%;
    max-width: 48%;
    min-width: 0;
    direction: ${isKurdish ? 'rtl' : 'ltr'};
  }
  .top-summary-right {
    flex: 0 1 48%;
    max-width: 48%;
    min-width: 0;
    direction: ${isKurdish ? 'rtl' : 'ltr'};
  }
  .top-summary-pair .card {
    margin-bottom: 0;
  }

  /* ── Warranty + Notes: side-by-side info area ── */
  .info-pair {
    display: flex;
    flex-direction: ${isKurdish ? 'row-reverse' : 'row'};
    align-items: stretch;
    gap: 16px;
    page-break-inside: avoid;
  }
  .info-pair > .card { flex: 1 1 50%; min-width: 0; }

  /* ── Footer ── */
  .footer {
    border-top: 1px solid #f1f5f9;
    text-align: center;
    padding: 16px 36px 22px;
    color: #cbd5e1;
    font-size: 11px;
  }

  @media print { body { background: white; } }
`;
}

// Stored purchase lines can represent several physically distinct units
// (idType 'custom' -> one itemId per unit). Those must render as separate
// rows; a single shared/blank id collapses back into one row for the full
// quantity, matching what was actually entered for the purchase.
interface PurchaseDisplayRow {
  name: string;
  qty: number;
  unitPriceIQD: number;
  totalIQD: number;
  idChip: string | null;
}

function expandPurchaseRow(
  name: string,
  qty: number,
  unitPriceIQD: number,
  lineTotalIQD: number,
  itemIds: string[],
): PurchaseDisplayRow[] {
  const ids = itemIds.map((v) => v.trim()).filter(Boolean);
  if (ids.length > 1) {
    return ids.map((id) => ({ name, qty: 1, unitPriceIQD, totalIQD: unitPriceIQD, idChip: id }));
  }
  return [{ name, qty, unitPriceIQD, totalIQD: lineTotalIQD, idChip: ids[0] ?? null }];
}

export function buildPurchaseInvoiceHTML(
  purchase: Purchase,
  purchaseItems: PurchaseItemRow[],
  business: BusinessInfo,
  dir: 'ltr' | 'rtl' = 'ltr',
  currencyMode: ReceiptCurrencyMode = 'iqd',
  purchaseDebt?: PurchaseDebt | null
): string {
  const isKurdish = isKurdishPdfActive();
  const lang = isKurdish ? 'ku' : 'en';
  const kuAlign = isKurdish ? 'right' : 'left';

  const monogram = (business.name ?? '').trim().charAt(0).toUpperCase() || 'B';
  const safeLogoUri = sanitizeImageUri(business.logoUri);
  const logoHTML = safeLogoUri
    ? `<img src="${safeLogoUri}" class="logo-img" alt="logo" />`
    : `<div class="logo-mono">${escHtml(monogram)}</div>`;

  const statusBadge = purchase.paymentStatus === 'paid'
    ? `<span class="pill pill-paid">${ku(t('statusPaid'))}</span>`
    : (purchase.paymentStatus === 'fib'
        ? `<span class="pill pill-fib">FIB</span>`
        : `<span class="pill pill-debt">${ku(t('statusDebt'))}</span>`);

  // ── Supplier (rendered inside the header's middle column) ──
  const supplierColumn = (purchase.supplierName || purchase.supplierPhone || purchase.supplierAddress) ? `
      <div class="card-label">${ku(t('supplier'))}</div>
      ${purchase.supplierName    ? `<div class="info-row"><span class="row-label">${ku(t('name') + ':')}</span><span class="row-value">${escHtml(purchase.supplierName)}</span></div>` : ''}
      ${purchase.supplierPhone   ? `<div class="info-row"><span class="row-label">${ku(t('phone') + ':')}</span><span class="row-value">${escHtml(purchase.supplierPhone)}</span></div>` : ''}
      ${purchase.supplierAddress ? `<div class="info-row"><span class="row-label">${ku(t('address') + ':')}</span><span class="row-value">${escHtml(purchase.supplierAddress)}</span></div>` : ''}` : '';

  // ── Items table ──
  const baseCurrency = useSettingsStore.getState().baseCurrency || 'IQD';
  const isUsdBase = baseCurrency === 'USD' || currencyMode === 'usd';
  const effectiveExchangeRate = (purchase.exchangeRate > 0 ? purchase.exchangeRate : 0) || useSettingsStore.getState().exchangeRate || 1310;
  const fmtRow = (val: number) => isUsdBase ? `$${fmtUSD(val / effectiveExchangeRate)}` : `${fmtIQD(val)} IQD`;

  const displayRows: PurchaseDisplayRow[] = purchaseItems.length > 0
    ? purchaseItems.flatMap((item) => expandPurchaseRow(item.productName, item.quantity, item.buyPriceIQD, item.lineTotalIQD, item.itemIds))
    : expandPurchaseRow(purchase.productName, purchase.quantity, purchase.buyPriceIQD, purchase.totalIQD, purchase.itemIds);

  const rows = displayRows.map((row, i) => `
        <tr>
          <td class="num-col">${i + 1}</td>
          <td style="text-align:${kuAlign};">
            <span class="item-name">${escHtml(row.name)}</span>
            ${purchase.itemDescription ? `<span class="item-desc">${escHtml(purchase.itemDescription)}</span>` : ''}
            ${row.idChip ? `<span class="item-id"><span class="item-id-label">${ku(t('itemIdLabel') + ':')}</span><span class="item-id-value">${escHtml(row.idChip)}</span></span>` : ''}
          </td>
          <td class="center">${row.qty}</td>
          <td class="right">${fmtRow(row.unitPriceIQD)}</td>
          <td class="right" style="font-weight:700;">${fmtRow(row.totalIQD)}</td>
        </tr>`).join('');

  const itemsContent = `
      <div class="table-card">
        <table>
          <thead>
            <tr>
              <th class="center" style="width:36px;">#</th>
              <th style="text-align:${kuAlign};">${ku(t('colProduct'))}</th>
              <th class="center" style="width:60px;">${ku(t('colQty'))}</th>
              <th class="right" style="width:130px;">${isUsdBase ? 'نرخی یەکە ($)' : ku(t('colUnitPriceIqd'))}</th>
              <th class="right" style="width:130px;">${isUsdBase ? 'کۆ ($)' : ku(t('totalIqd'))}</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </div>`;

  // ── Financial ──
  const { totalBlock, usdCard } = buildGrandTotal(currencyMode, purchase.totalIQD, effectiveExchangeRate, isUsdBase, isKurdish);

  const paidAmount = purchaseDebt?.paidAmount ?? 0;
  const remainingAmount = purchaseDebt?.remainingAmount ?? Math.max(0, purchase.totalIQD - paidAmount);

  const initialMethod = purchase.initialPaymentMethod || purchaseDebt?.initialPaymentMethod;
  const initialMethodTag = initialMethod ? ` (${initialMethod === 'fib' ? 'FIB' : (isKurdish ? 'کاش' : 'Cash')})` : '';
  const paidRows = (purchase.paymentStatus === 'paid' || purchase.paymentStatus === 'fib')
    ? ''
    : `<div class="fin-row" style="margin-top:3px;"><span style="color:#047857;font-weight:600;">${ku(t('amountPaid'))}${initialMethodTag}</span><span class="fin-amount fin-amount-paid en-num" dir="ltr">${fmtRow(paidAmount)}</span></div>
       <div class="fin-row" style="margin-top:2px;"><span style="color:#b91c1c;font-weight:700;">${ku(t('remainingDebt'))}</span><span class="fin-amount fin-amount-debt en-num" dir="ltr">${fmtRow(remainingAmount)}</span></div>`;

  const financialCard = `
    <div class="card">
      <div class="card-label">${ku(t('paymentSummary'))}</div>
      ${totalBlock}
      ${paidRows}
      <div class="fin-row" style="margin-top:3px;">
        <span>${ku(t('paymentStatusLabel'))}</span>
        <span>${statusBadge}</span>
      </div>
    </div>`;

  // ── Optional blocks ──
  const blockTextStyle = isKurdish ? `direction:rtl;text-align:${kuAlign};white-space:pre-wrap;` : '';

  const notesCard = `
    <div class="card">
      ${purchase.warranty ? `
      <div style="margin-bottom: 6px;">
        <div class="card-label">${ku(t('warranty'))}</div>
        <p class="block-text" style="${blockTextStyle}">${escHtml(purchase.warranty)}</p>
      </div>
      <div style="margin: 6px 0; border-top: 1px dashed #e2e8f0;"></div>
      ` : ''}
      ${purchase.description ? `
      <div style="margin-bottom: 6px;">
        <div class="card-label">${ku(t('description'))}</div>
        <p class="block-text" style="${blockTextStyle}">${escHtml(purchase.description)}</p>
      </div>
      <div style="margin: 6px 0; border-top: 1px dashed #e2e8f0;"></div>
      ` : ''}
      <div>
        <div class="card-label">${ku(t('notes'))}</div>
        <p class="block-text" style="${blockTextStyle}">${purchase.notes ? escHtml(purchase.notes) : ku(t('noNotes'))}</p>
      </div>
    </div>`;

  const purchaseDateTime = purchase.date ?? purchase.createdAt;

  const aboutPolicyText = (purchase.aboutPolicy ?? useSettingsStore.getState().invoiceAboutPolicy ?? '').trim();
  const aboutPolicySection = aboutPolicyText ? `
  <div class="policy-card">
    <div class="policy-label">${ku(t('companyPolicy'))}</div>
    <p class="policy-text">${escHtml(aboutPolicyText)}</p>
  </div>` : '';

  return `<!DOCTYPE html>
<html lang="${lang}" dir="ltr">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Froshiar-${escHtml(purchase.purchaseNumber)}</title>
<style>${buildPurchaseCSS(isKurdish)}</style>
</head>
<body>

<div class="header">
  <div class="header-cols">
    <div class="col-business">
      <div class="logo-frame">
        ${logoHTML}
      </div>
      <div class="biz-name">${escHtml(business.name || 'Business')}</div>
      ${business.address ? `<div class="biz-meta">${escHtml(business.address)}</div>` : ''}
      ${business.phone ? `<div class="biz-meta">${escHtml(business.phone)}</div>` : ''}
    </div>
    <div class="col-supplier">
      ${supplierColumn}
    </div>
    <div class="col-invoice">
      <div class="inv-label">${ku(t('purchaseInvoiceLabel'))}</div>
      <div class="inv-meta-row inv-meta-row-title">
        <span class="row-label">${ku(t('invoiceNumberLabel'))}</span>
        <span class="row-value row-value-ltr">${purchase.purchaseNumber?.startsWith('F-') || purchase.purchaseNumber?.startsWith('B-') ? '' : '#'}${escHtml(purchase.purchaseNumber)}</span>
      </div>
      <div class="inv-meta-row">
        <span class="row-label">${ku(t('date') + ':')}</span>
        <span class="row-value row-value-ltr">${escHtml(formatDate(purchaseDateTime))}</span>
      </div>
      <div class="inv-meta-row">
        <span class="row-label">${ku(t('time') + ':')}</span>
        <span class="row-value row-value-ltr">${escHtml(formatTime(purchaseDateTime))}</span>
      </div>
      <div class="inv-status-row">
        <span class="inv-meta-line">${ku(t('status') + ':')}</span>
        ${statusBadge}
      </div>
    </div>
  </div>
</div>

<div class="body">

  ${aboutPolicySection}

  <div class="top-summary-pair">
    <div class="top-summary-left">
      ${financialCard}
    </div>
    <div class="top-summary-right">
      ${notesCard}
    </div>
  </div>

  ${itemsContent}

</div>

<div class="footer">
  ${ku(t('purchaseInvoiceLabel'))} &nbsp;·&nbsp; ${ku(pdfDevelopedByText())} · ${PDF_BRAND_WEBSITE} &nbsp;·&nbsp; ${escHtml(purchase.purchaseNumber)}
</div>

</body>
</html>`;
}
