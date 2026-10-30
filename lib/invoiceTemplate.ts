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

  const currentLang = i18n.language || 'ku';
  const isAr = currentLang === 'ar';
  const isKu = currentLang === 'ku';

  const usdLabel = ku(isAr ? 'المجموع الكلي (USD)' : isKu ? 'کۆی گشتی (USD)' : 'Grand Total (USD)');
  const iqdLabel = ku(isAr ? 'المجموع الكلي (IQD)' : isKu ? 'کۆی گشتی (IQD)' : 'Grand Total (IQD)');
  const iqdSubLabel = ku(isAr ? 'المجموع بالدينار' : isKu ? 'کۆی گشتی بە دینار' : 'Total in IQD');
  const usdSubLabel = ku(isAr ? 'المجموع بالدولار' : isKu ? 'کۆی گشتی بە دۆلار' : 'Total in USD');

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
          <span class="total-sub-amount en-num" dir="ltr">${totalIQD}&nbsp;IQD</span>
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
        <span class="total-amount en-num" dir="ltr">${totalIQD}&nbsp;IQD</span>
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
    overflow: visible;
    margin-bottom: 14px;
  }
  table { width: 100%; border-collapse: collapse; page-break-inside: auto; break-inside: auto; direction: ${isKurdish ? 'rtl' : 'ltr'}; table-layout: fixed; }
  thead { display: table-header-group; }
  tbody tr { page-break-inside: avoid !important; break-inside: avoid !important; }
  th, td { page-break-inside: avoid !important; break-inside: avoid !important; }
  th {
    background: #f8fafc;
    color: #1e293b;
    font-size: 10px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.6px;
    padding: 8px 8px;
    border-bottom: 1.5px solid #e2e8f0;
    vertical-align: middle;
    box-sizing: border-box;
  }
  td {
    padding: 8px 8px;
    font-size: 11.5px;
    border-bottom: 1px solid #f1f5f9;
    vertical-align: middle;
    color: #000000;
    box-sizing: border-box;
  }
  tbody tr:last-child td { border-bottom: none; }
  tbody tr:nth-child(even) { background: #f8fafc; }
  .center { text-align: center; }
  .right  { text-align: ${numAlign}; unicode-bidi: isolate; direction: ltr; white-space: nowrap !important; }
  .item-name { font-weight: 600; color: #000000; font-size: 12px; display: block; unicode-bidi: plaintext; word-break: break-word; overflow-wrap: break-word; line-height: 1.35; }
  .item-desc { display: block; font-size: 9.5px; font-weight: 400; color: #64748b; margin-top: 2px; unicode-bidi: plaintext; word-break: break-word; overflow-wrap: break-word; }
  .id-chip {
    display: inline-block;
    font-size: 9px;
    color: #334155;
    border: 1px solid #e2e8f0;
    border-radius: 4px;
    padding: 1px 4px;
    font-weight: 600;
    unicode-bidi: isolate;
    direction: ltr;
    word-break: break-all;
  }
  .num-col { color: #000000; font-size: 11px; font-weight: 700; text-align: center; unicode-bidi: isolate; direction: ltr; white-space: nowrap; }
  .empty-row { text-align: center; color: #64748b; padding: 22px 14px; font-size: 12px; }
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
    white-space: nowrap !important;
  }
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

  @media print {
    body { background: white; }
    .table-card { overflow: visible !important; border-radius: 0; }
    table { page-break-inside: auto !important; break-inside: auto !important; }
    thead { display: table-header-group !important; }
    tfoot { display: table-footer-group !important; }
    tbody tr { page-break-inside: avoid !important; break-inside: avoid !important; }
    th, td { page-break-inside: avoid !important; break-inside: avoid !important; }
    .top-summary-pair, .policy-card, .info-pair, .card, .total-block {
      page-break-inside: avoid !important;
      break-inside: avoid !important;
    }
  }
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

  const salesSettings = useSettingsStore.getState().salesReceiptSettings ?? {
    showBusinessPhone: true,
    showBusinessAddress: true,
    showCustomerName: true,
    showCustomerPhone: true,
    showInvoiceNumber: true,
    showDate: true,
    showQty: true,
    showItemPrice: true,
    showDiscount: true,
    showItemBarcode: false,
    showPaymentMethod: true,
    showRemainingDebt: true,
    showNotes: true,
    showSignature: true,
    showAboutPolicy: true,
    showFooterBarcode: true,
    customFooterNote: '',
  };

  const baseCurrency = useSettingsStore.getState().baseCurrency || 'IQD';
  const isUsdBase = baseCurrency === 'USD' || currencyMode === 'usd';
  const rate = exchangeRate || useSettingsStore.getState().exchangeRate || 1310;
  const fmtRow = (val: number) => isUsdBase ? `$${fmtUSD(val / rate)}` : `${fmtIQD(val)}&nbsp;IQD`;

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
  const showCustName = salesSettings.showCustomerName && sale.customerName;
  const showCustPhone = salesSettings.showCustomerPhone && sale.customerPhone;
  const showCustAddr = salesSettings.showBusinessAddress && sale.customerAddress;
  const customerColumn = (showCustName || showCustPhone || showCustAddr) ? `
      <div class="card-label">${ku(t('customer'))}</div>
      ${showCustName  ? `<div class="info-row"><span class="row-label">${ku(t('name') + ':')}</span><span class="row-value">${escHtml(sale.customerName!)}</span></div>` : ''}
      ${showCustPhone ? `<div class="info-row"><span class="row-label">${ku(t('phone') + ':')}</span><span class="row-value">${escHtml(sale.customerPhone!)}</span></div>` : ''}
      ${showCustAddr  ? `<div class="info-row"><span class="row-label">${ku(t('address') + ':')}</span><span class="row-value">${escHtml(sale.customerAddress!)}</span></div>` : ''}` : '';

  // ── Items table — Product ID is always its own column, never hidden ──
  const itemRows = items.length > 0 ? items.map((item, i) => `
    <tr>
      <td class="num-col" style="width:4%;">${i + 1}</td>
      <td style="width:36%;text-align:${kuAlign};"><span class="item-name">${escHtml(item.productName)}</span>${item.itemDescription ? `<span class="item-desc">${escHtml(item.itemDescription)}</span>` : ''}</td>
      <td class="center" style="width:12%;">${(salesSettings.showItemBarcode && item.itemId) ? `<span class="id-chip">${escHtml(item.itemId)}</span>` : '<span class="muted-cell">—</span>'}</td>
      <td class="center" style="width:6%;">${item.quantity}</td>
      <td class="right" style="width:13%;white-space:nowrap !important;">${item.discount > 0 ? `<span style="text-decoration:line-through;color:#94a3b8;font-size:0.9em;margin-inline-end:4px;">${fmtRow(item.sellingPrice)}</span><span style="font-weight:700;">${fmtRow(item.sellingPrice - item.discount)}</span>` : fmtRow(item.sellingPrice)}</td>
      <td class="right" style="width:11%;white-space:nowrap !important;">${item.discount > 0 ? `<span style="color:#d97706;font-weight:600;">− ${fmtRow(item.discount)}</span>` : '<span class="muted-cell">—</span>'}</td>
      <td class="right" style="width:18%;white-space:nowrap !important;font-weight:700;">${fmtRow(item.lineTotal)}</td>
    </tr>
  `).join('') : `<tr><td colspan="7" class="empty-row">${ku(t('noItems'))}</td></tr>`;

  const dateTimeValue = sale.date ?? sale.createdAt;

  const blockTextStyle = isKurdish ? `direction:rtl;text-align:${kuAlign};white-space:pre-wrap;` : '';

  const notesText = sale.notes ? escHtml(sale.notes) : ku(t('noNotes'));

  const customNoteBlock = salesSettings.customFooterNote ? `
    <div style="margin-top: 6px; padding-top: 6px; border-top: 1px dashed #e2e8f0; font-size: 11px; color: #475569;">
      ${ku(escHtml(salesSettings.customFooterNote))}
    </div>` : '';

  const notesCard = salesSettings.showNotes ? `
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
        ${customNoteBlock}
      </div>
    </div>` : '';

  const { totalBlock, usdCard } = buildGrandTotal(currencyMode, sale.grandTotal, rate, isUsdBase, isKurdish);

  const currentLang = i18n.language || 'ku';
  const isAr = currentLang === 'ar';
  const isKu = currentLang === 'ku';

  const initialMethodTag = sale.initialPaymentMethod ? ` (${sale.initialPaymentMethod === 'fib' ? 'FIB' : (isAr ? 'نقداً' : isKu ? 'کاش' : 'Cash')})` : '';
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
      ${salesSettings.showBusinessAddress && business.address ? `<div class="biz-meta">${escHtml(business.address)}</div>` : ''}
      ${salesSettings.showBusinessPhone && business.phone ? `<div class="biz-meta">${escHtml(business.phone)}</div>` : ''}
    </div>
    <div class="col-customer">
      ${customerColumn}
    </div>
    <div class="col-invoice">
      <div class="inv-label">${ku(t('salesInvoiceLabel'))}</div>
      ${salesSettings.showInvoiceNumber ? `
      <div class="inv-meta-row inv-meta-row-title">
        <span class="row-label">${ku(t('invoiceNumberLabel'))}</span>
        <span class="row-value row-value-ltr">${sale.invoiceNumber?.startsWith('F-') ? '' : '#'}${escHtml(sale.invoiceNumber)}</span>
      </div>` : ''}
      ${salesSettings.showDate ? `
      <div class="inv-meta-row">
        <span class="row-label">${ku(t('date') + ':')}</span>
        <span class="row-value row-value-ltr">${escHtml(formatDate(dateTimeValue))}</span>
      </div>
      <div class="inv-meta-row">
        <span class="row-label">${ku(t('time') + ':')}</span>
        <span class="row-value row-value-ltr">${escHtml(formatTime(dateTimeValue))}</span>
      </div>` : ''}
      ${salesSettings.showPaymentMethod ? `
      <div class="inv-status-row">
        <span class="inv-meta-line">${ku(t('status') + ':')}</span>
        ${statusBadge}
      </div>` : ''}
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
          <th class="center" style="width:4%;min-width:26px;">#</th>
          <th style="width:36%;text-align:${kuAlign};">${ku(t('colProduct'))}</th>
          <th class="center" style="width:12%;min-width:55px;">${ku(t('colProductId'))}</th>
          <th class="center" style="width:6%;min-width:32px;">${ku(t('colQty'))}</th>
          <th class="right" style="width:13%;min-width:80px;white-space:nowrap;">${ku(t('colUnitPrice'))}</th>
          <th class="right" style="width:11%;min-width:70px;white-space:nowrap;">${ku(t('colDiscount'))}</th>
          <th class="right" style="width:18%;min-width:85px;white-space:nowrap;">${ku(t('colLineTotal'))}</th>
        </tr>
      </thead>
      <tbody>
        ${itemRows}
      </tbody>
    </table>
  </div>

  ${salesSettings.showSignature !== false ? `
  <div style="display:flex;justify-content:space-between;align-items:flex-end;padding:24px 32px 10px;page-break-inside:avoid;direction:${isKurdish ? 'rtl' : 'ltr'};">
    <div style="text-align:center;width:150px;">
      <div style="border-top:1px solid #94a3b8;padding-top:6px;font-size:11.5px;color:#475569;font-weight:600;">${ku(isAr ? 'توقيع الزبون / المستلم' : isKu ? 'واژووی کڕیار / وەرگر' : 'Customer Signature')}</div>
    </div>
    <div style="text-align:center;width:150px;">
      <div style="border-top:1px solid #94a3b8;padding-top:6px;font-size:11.5px;color:#475569;font-weight:600;">${ku(isAr ? 'ختم وتوقيع المتجر' : isKu ? 'مۆر و واژووی فرۆشگا' : 'Store Stamp & Signature')}</div>
    </div>
  </div>` : ''}

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
  description?: string | null;
  itemDescription?: string | null;
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
    overflow: visible;
    margin-bottom: 14px;
  }
  table { width: 100%; border-collapse: collapse; page-break-inside: auto; break-inside: auto; direction: ${isKurdish ? 'rtl' : 'ltr'}; table-layout: fixed; }
  thead { display: table-header-group; }
  tbody tr { page-break-inside: avoid !important; break-inside: avoid !important; }
  th, td { page-break-inside: avoid !important; break-inside: avoid !important; }
  th {
    background: #f8fafc;
    color: #1e293b;
    font-size: 10px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.6px;
    padding: 8px 8px;
    border-bottom: 1.5px solid #e2e8f0;
    vertical-align: middle;
    box-sizing: border-box;
  }
  td {
    padding: 8px 8px;
    font-size: 11.5px;
    border-bottom: 1px solid #f1f5f9;
    vertical-align: middle;
    color: #000000;
    box-sizing: border-box;
  }
  tbody tr:last-child td { border-bottom: none; }
  tbody tr:nth-child(even) { background: #f8fafc; }
  .center { text-align: center; }
  .right  { text-align: ${numAlign}; unicode-bidi: isolate; direction: ltr; white-space: nowrap !important; }
  .item-name { font-weight: 600; color: #000000; font-size: 12px; display: block; unicode-bidi: plaintext; word-break: break-word; overflow-wrap: break-word; line-height: 1.35; }
  .item-desc { display: block; font-size: 9.5px; font-weight: 400; color: #64748b; margin-top: 2px; unicode-bidi: plaintext; word-break: break-word; overflow-wrap: break-word; }
  .id-chip {
    display: inline-block;
    font-size: 9px;
    color: #334155;
    border: 1px solid #e2e8f0;
    border-radius: 4px;
    padding: 1px 4px;
    font-weight: 600;
    unicode-bidi: isolate;
    direction: ltr;
    word-break: break-all;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
  }
  .num-col { color: #000000; font-size: 11px; font-weight: 700; text-align: center; unicode-bidi: isolate; direction: ltr; white-space: nowrap; }
  .empty-row { text-align: center; color: #64748b; padding: 22px 14px; font-size: 12px; }
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

  @media print {
    body { background: white; }
    .table-card { overflow: visible !important; border-radius: 0; }
    table { page-break-inside: auto !important; break-inside: auto !important; }
    thead { display: table-header-group !important; }
    tfoot { display: table-footer-group !important; }
    tbody tr { page-break-inside: avoid !important; break-inside: avoid !important; }
    th, td { page-break-inside: avoid !important; break-inside: avoid !important; }
    .top-summary-pair, .policy-card, .info-pair, .card, .total-block {
      page-break-inside: avoid !important;
      break-inside: avoid !important;
    }
  }
`;
}

// Stored purchase lines can represent several physically distinct units
// (idType 'custom' -> one itemId per unit). Those must render as separate
// rows; a single shared/blank id collapses back into one row for the full
// quantity, matching what was actually entered for the purchase.
interface PurchaseDisplayRow {
  name: string;
  category: string | null;
  qty: number;
  unitPriceIQD: number;
  totalIQD: number;
  idChip: string | null;
  description: string | null;
}

function expandPurchaseRow(
  name: string,
  category: string | null,
  qty: number,
  unitPriceIQD: number,
  lineTotalIQD: number,
  itemIds: string[],
  description: string | null = null,
): PurchaseDisplayRow[] {
  const ids = itemIds.map((v) => v.trim()).filter(Boolean);
  if (ids.length > 1) {
    return ids.map((id) => ({
      name,
      category,
      qty: 1,
      unitPriceIQD,
      totalIQD: unitPriceIQD,
      idChip: id,
      description,
    }));
  }
  return [{
    name,
    category,
    qty,
    unitPriceIQD,
    totalIQD: lineTotalIQD,
    idChip: ids[0] ?? null,
    description,
  }];
}

export function buildPurchaseInvoiceHTML(
  purchase: Purchase,
  purchaseItems: PurchaseItemRow[],
  business: BusinessInfo,
  dir: 'ltr' | 'rtl' = 'ltr',
  currencyMode: ReceiptCurrencyMode = 'iqd',
  purchaseDebt?: PurchaseDebt | null
): string {
  const purchaseSettings = useSettingsStore.getState().purchaseReceiptSettings ?? {
    showBusinessPhone: true,
    showBusinessAddress: true,
    showSupplierName: true,
    showSupplierPhone: true,
    showInvoiceNumber: true,
    showDate: true,
    showQty: true,
    showBuyPrice: true,
    showDiscount: true,
    showItemBarcode: false,
    showPaymentMethod: true,
    showRemainingDebt: true,
    showNotes: true,
    showSignature: true,
    showAboutPolicy: true,
    showFooterBarcode: true,
    customFooterNote: '',
  };

  const isKurdish = isKurdishPdfActive();
  const currentPurchaseLang = i18n.language || (isKurdish ? 'ku' : 'en');
  const isPurchaseAr = currentPurchaseLang === 'ar';
  const isPurchaseKu = isKurdish;
  const lang = isPurchaseAr ? 'ar' : isPurchaseKu ? 'ku' : 'en';
  const kuAlign = (isPurchaseKu || isPurchaseAr) ? 'right' : 'left';

  const monogram = (business.name ?? '').trim().charAt(0).toUpperCase() || 'B';
  const safeLogoUri = sanitizeImageUri(business.logoUri);
  const logoHTML = safeLogoUri
    ? `<img src="${safeLogoUri}" class="logo-img" alt="logo" />`
    : `<div class="logo-mono">${escHtml(monogram)}</div>`;

  const statusBadge = (purchase.paymentStatus === 'paid')
    ? `<span class="pill pill-paid">${ku(isPurchaseAr ? '● مدفوع (نقداً)' : isPurchaseKu ? '● پارەدراو (کاش)' : '● PAID (CASH)')}</span>`
    : (purchase.paymentStatus === 'fib'
        ? `<span class="pill pill-fib">● FIB</span>`
        : `<span class="pill pill-debt">${ku(isPurchaseAr ? '● آجل (دين)' : isPurchaseKu ? '● قەرزدار' : '● DEBT')}</span>`);

  // ── Supplier (rendered inside the header's middle column) ──
  const showSuppName = purchaseSettings.showSupplierName && purchase.supplierName;
  const showSuppPhone = purchaseSettings.showSupplierPhone && purchase.supplierPhone;
  const supplierColumn = (showSuppName || showSuppPhone || purchase.supplierAddress) ? `
      <div class="card-label">${ku(isPurchaseAr ? 'المورد' : isPurchaseKu ? 'دابینکەر' : 'SUPPLIER')}</div>
      ${showSuppName    ? `<div class="info-row"><span class="row-label">${ku(isPurchaseAr ? 'المورد:' : isPurchaseKu ? 'دابینکەر:' : 'Supplier:')}</span><span class="row-value">${escHtml(purchase.supplierName!)}</span></div>` : ''}
      ${showSuppPhone   ? `<div class="info-row"><span class="row-label">${ku(isPurchaseAr ? 'الهاتف:' : isPurchaseKu ? 'تەلەفۆن:' : 'Phone:')}</span><span class="row-value row-value-ltr">${escHtml(purchase.supplierPhone!)}</span></div>` : ''}
      ${purchase.supplierAddress ? `<div class="info-row"><span class="row-label">${ku(isPurchaseAr ? 'العنوان:' : isPurchaseKu ? 'ناونیشان:' : 'Address:')}</span><span class="row-value">${escHtml(purchase.supplierAddress)}</span></div>` : ''}` : '';

  // ── Items table ──
  const baseCurrency = useSettingsStore.getState().baseCurrency || 'IQD';
  const isUsdBase = baseCurrency === 'USD' || currencyMode === 'usd';
  const effectiveExchangeRate = (purchase.exchangeRate > 0 ? purchase.exchangeRate : 0) || useSettingsStore.getState().exchangeRate || 1310;
  const fmtRow = (val: number) => isUsdBase ? `$${fmtUSD(val / effectiveExchangeRate)}` : `${fmtIQD(val)}&nbsp;IQD`;

  const fallbackDesc = purchase.itemDescription || purchase.description || null;
  const displayRows: PurchaseDisplayRow[] = purchaseItems.length > 0
    ? purchaseItems.flatMap((item) =>
        expandPurchaseRow(
          item.productName,
          item.category || purchase.category || null,
          item.quantity,
          item.buyPriceIQD,
          item.lineTotalIQD,
          item.itemIds,
          item.itemDescription || item.description || fallbackDesc
        )
      )
    : expandPurchaseRow(
        purchase.productName,
        purchase.category || null,
        purchase.quantity,
        purchase.buyPriceIQD,
        purchase.totalIQD,
        purchase.itemIds,
        fallbackDesc
      );

  const rows = displayRows.length > 0 ? displayRows.map((row, i) => `
        <tr>
          <td class="num-col" style="width:4%;">${i + 1}</td>
          <td style="width:28%;text-align:${kuAlign};">
            <span class="item-name">${escHtml(row.name)}</span>
            ${row.description ? `<span class="item-desc">${escHtml(row.description)}</span>` : ''}
          </td>
          <td class="center" style="width:12%;">${(purchaseSettings.showItemBarcode && row.idChip) ? `<span class="id-chip">${escHtml(row.idChip)}</span>` : '<span class="muted-cell">—</span>'}</td>
          <td class="center" style="width:14%;color:#64748b;font-size:11px;">${escHtml(row.category || '—')}</td>
          <td class="center" style="width:6%;font-weight:700;">${row.qty}</td>
          <td class="right" style="width:16%;white-space:nowrap !important;">${fmtRow(row.unitPriceIQD)}</td>
          <td class="right" style="width:20%;white-space:nowrap !important;font-weight:700;">${fmtRow(row.totalIQD)}</td>
        </tr>`).join('') : `<tr><td colspan="7" class="empty-row">${ku(t('noItems'))}</td></tr>`;

  const itemsContent = `
      <div class="table-card">
        <table>
          <thead>
            <tr>
              <th class="center" style="width:4%;min-width:24px;">#</th>
              <th style="width:28%;text-align:${kuAlign};">${isPurchaseAr ? 'المادة' : isPurchaseKu ? 'کاڵا' : 'Product'}</th>
              <th class="center" style="width:12%;">${isPurchaseAr ? 'رمز المادة' : isPurchaseKu ? 'ئایدی کاڵا' : 'Item ID'}</th>
              <th class="center" style="width:14%;">${isPurchaseAr ? 'التصنيف' : isPurchaseKu ? 'هاوپۆل' : 'Category'}</th>
              <th class="center" style="width:6%;min-width:36px;">${isPurchaseAr ? 'الكمية' : isPurchaseKu ? 'بڕ' : 'Qty'}</th>
              <th class="right" style="width:16%;min-width:80px;white-space:nowrap;">${isUsdBase ? (isPurchaseAr ? 'التكلفة ($)' : isPurchaseKu ? 'تێچوو ($)' : 'Cost ($)') : (isPurchaseAr ? 'التكلفة' : isPurchaseKu ? 'تێچوو' : 'Cost')}</th>
              <th class="right" style="width:20%;min-width:80px;white-space:nowrap;">${isUsdBase ? (isPurchaseAr ? 'المجموع ($)' : isPurchaseKu ? 'کۆ ($)' : 'Total ($)') : (isPurchaseAr ? 'المجموع' : isPurchaseKu ? 'کۆ' : 'Total')}</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </div>`;

  // ── Financial ──
  const paidAmount = purchaseDebt?.paidAmount ?? (purchase.paymentStatus === 'paid' || purchase.paymentStatus === 'fib' ? purchase.totalIQD : 0);
  const remainingAmount = purchaseDebt?.remainingAmount ?? (purchase.paymentStatus === 'paid' || purchase.paymentStatus === 'fib' ? 0 : Math.max(0, purchase.totalIQD - paidAmount));
  const subtotalUSD = effectiveExchangeRate > 0 ? (purchase.totalIQD / effectiveExchangeRate) : 0;

  const financialCard = `
    <div class="card">
      <div class="card-label">${ku(isPurchaseAr ? 'ملخص الشراء المالي' : isPurchaseKu ? 'پوختەی دارایی کڕین' : 'PURCHASE SUMMARY')}</div>
      <div class="fin-row">
        <span>${ku(isPurchaseAr ? 'إجمالي التكلفة:' : isPurchaseKu ? 'کۆی تێچوو:' : 'Subtotal:')}</span>
        <span class="fin-amount en-num" dir="ltr">${fmtRow(purchase.totalIQD)}</span>
      </div>
      <div class="total-block">
        <div class="total-row">
          <span class="total-label">${ku(isPurchaseAr ? 'إجمالي تكلفة الشراء (IQD)' : isPurchaseKu ? 'کۆی گشتی کڕین' : 'Total Cost (IQD)')}</span>
          <span class="total-amount en-num" dir="ltr">${fmtIQD(purchase.totalIQD)} IQD</span>
        </div>
        <div class="total-divider"></div>
        <div class="total-row">
          <span class="total-sub-label">${ku(isPurchaseAr ? 'المجموع الكلي بالدولار' : isPurchaseKu ? 'کۆی گشتی بە دۆلار' : 'Total in USD')}</span>
          <span class="total-sub-amount en-num" dir="ltr">$${fmtUSD(subtotalUSD)} USD</span>
        </div>
      </div>
      ${purchaseSettings.showPaymentMethod ? `
      <div class="fin-row" style="margin-top:3px;">
        <span>${ku(isPurchaseAr ? 'طريقة السداد:' : isPurchaseKu ? 'شێوازی دران:' : 'Payment:')}</span>
        <span class="fin-amount">${purchase.paymentStatus === 'fib' ? 'FIB' : (purchase.paymentStatus === 'debt' ? (isPurchaseAr ? 'آجل (دين)' : isPurchaseKu ? 'قەرز' : 'Debt') : (isPurchaseAr ? 'نقداً' : isPurchaseKu ? 'کاش (نەقد)' : 'Cash'))}</span>
      </div>` : ''}
      ${(purchaseSettings.showRemainingDebt && (purchase.paymentStatus === 'debt' || remainingAmount > 0)) ? `
      <div class="fin-row" style="margin-top:2px;">
        <span style="color:#b91c1c;font-weight:700;">${ku(isPurchaseAr ? 'الدين المتبقي:' : isPurchaseKu ? 'قەرزی ماوە:' : 'Remaining Debt:')}</span>
        <span class="fin-amount fin-amount-debt en-num" dir="ltr">${fmtRow(remainingAmount)}</span>
      </div>` : (purchaseSettings.showRemainingDebt ? `
      <div class="fin-row" style="margin-top:2px;">
        <span style="color:#047857;font-weight:700;">${ku(isPurchaseAr ? 'الدين المتبقي:' : isPurchaseKu ? 'قەرزی ماوە:' : 'Remaining Debt:')}</span>
        <span class="fin-amount fin-amount-paid en-num" dir="ltr">0 IQD</span>
      </div>` : '')}
    </div>`;

  // ── Optional blocks ──
  const blockTextStyle = isKurdish ? `direction:rtl;text-align:${kuAlign};white-space:pre-wrap;` : '';

  const notesCard = purchaseSettings.showNotes ? `
    <div class="card">
      <div class="card-label">${ku(isPurchaseAr ? 'ملاحظات الشراء' : isPurchaseKu ? 'تێبینیەکانی کڕین' : 'PURCHASE NOTES')}</div>
      ${purchase.warranty ? `
      <div style="margin-bottom: 6px;">
        <div style="font-size: 11px; font-weight: 700; color: #475569; margin-bottom: 2px;">${ku(isPurchaseAr ? 'ضمان المورد:' : isPurchaseKu ? 'گرەنتی دابینکەر:' : 'Supplier Warranty:')}</div>
        <p class="block-text" style="${blockTextStyle}">${escHtml(purchase.warranty)}</p>
      </div>
      <div style="margin: 6px 0; border-top: 1px dashed #e2e8f0;"></div>
      ` : `
      <div style="margin-bottom: 6px;">
        <div style="font-size: 11px; font-weight: 700; color: #475569; margin-bottom: 2px;">${ku(isPurchaseAr ? 'ضمان المورد:' : isPurchaseKu ? 'گرەنتی دابینکەر:' : 'Supplier Warranty:')}</div>
        <p class="block-text" style="${blockTextStyle}">${isPurchaseAr ? 'ضمان رسمي لمدة 1 سنة من الشركة الموردة.' : isPurchaseKu ? 'گرەنتی فەرمی ١ ساڵ لە کۆمپانیای دابینکەرەوە.' : '1-year official supplier warranty.'}</p>
      </div>
      <div style="margin: 6px 0; border-top: 1px dashed #e2e8f0;"></div>
      `}
      <div>
        <div style="font-size: 11px; font-weight: 700; color: #475569; margin-bottom: 2px;">${ku(isPurchaseAr ? 'ملاحظات الفحص والاستلام:' : isPurchaseKu ? 'تێبینی و پشکنین:' : 'Inspection Notes:')}</div>
        <p class="block-text" style="${blockTextStyle}">${purchase.notes ? escHtml(purchase.notes) : (purchaseSettings.customFooterNote ? escHtml(purchaseSettings.customFooterNote) : (isPurchaseAr ? 'وصل شراء وتوثيق استلام البضائع في النظام' : isPurchaseKu ? 'وەسڵی کڕین و تۆمارکردنی کاڵاکان لە سیستەم' : 'Purchase voucher and warehouse inventory intake record'))}</p>
      </div>
    </div>` : '';

  const purchaseDateTime = purchase.date ?? purchase.createdAt;

  const defaultPolicy = isPurchaseAr
    ? 'تم استلام كافة المواد وفقاً لفاتورة المورد الرسمية وتم إدخالها إلى نظام المخزن.'
    : isPurchaseKu
    ? 'سەرجەم کاڵاکان بەپێی فاکتوورەی فەرمی دابینکەر وەرگیراون و داخڵی سیستەمی کۆگا کراون.'
    : 'Goods received according to supplier official invoice and registered in warehouse.';
  const aboutPolicyText = (purchase.aboutPolicy ?? useSettingsStore.getState().invoiceAboutPolicy ?? '').trim() || defaultPolicy;
  const aboutPolicySection = purchaseSettings.showAboutPolicy !== false ? `
  <div class="policy-card">
    <div class="policy-label">${ku(isPurchaseAr ? 'سياسة الشراء والاستلام' : isPurchaseKu ? 'سیاسەتی وەرگرتن و کڕین' : 'PROCUREMENT POLICY')}</div>
    <p class="policy-text">${escHtml(aboutPolicyText)}</p>
  </div>` : '';

  const cleanPurchaseNum = (purchase.purchaseNumber || '').replace(/^#/, '');

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
      ${purchaseSettings.showBusinessAddress && business.address ? `<div class="biz-meta">${escHtml(business.address)}</div>` : ''}
      ${purchaseSettings.showBusinessPhone && business.phone ? `<div class="biz-meta">${escHtml(business.phone)}</div>` : ''}
    </div>
    <div class="col-supplier">
      ${supplierColumn}
    </div>
    <div class="col-invoice">
      <div class="inv-label">${ku(isPurchaseAr ? 'وصل شراء' : isPurchaseKu ? 'وەسڵی کڕین' : 'PURCHASE VOUCHER')}</div>
      ${purchaseSettings.showInvoiceNumber ? `
      <div class="inv-meta-row inv-meta-row-title">
        <span class="row-value row-value-ltr">#${escHtml(cleanPurchaseNum)}</span>
      </div>` : ''}
      ${purchaseSettings.showDate ? `
      <div class="inv-meta-row">
        <span class="row-label">${ku(isPurchaseAr ? 'التاريخ:' : isPurchaseKu ? 'بەروار:' : 'Date:')}</span>
        <span class="row-value row-value-ltr">${escHtml(formatDate(purchaseDateTime))}</span>
      </div>
      <div class="inv-meta-row">
        <span class="row-label">${ku(isPurchaseAr ? 'الوقت:' : isPurchaseKu ? 'کات:' : 'Time:')}</span>
        <span class="row-value row-value-ltr">${escHtml(formatTime(purchaseDateTime))}</span>
      </div>` : ''}
      ${purchaseSettings.showPaymentMethod ? `
      <div class="inv-status-row">
        ${statusBadge}
      </div>` : ''}
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

  ${purchaseSettings.showSignature !== false ? `
  <div style="display:flex;justify-content:space-between;align-items:flex-end;padding:24px 32px 10px;page-break-inside:avoid;direction:${isKurdish ? 'rtl' : 'ltr'};">
    <div style="text-align:center;width:150px;">
      <div style="border-top:1px solid #94a3b8;padding-top:6px;font-size:11.5px;color:#475569;font-weight:600;">${ku(isPurchaseAr ? 'توقيع مستلم المخزن' : isPurchaseKu ? 'واژووی وەرگری مەخزەن' : 'Warehouse Receiver')}</div>
    </div>
    <div style="text-align:center;width:150px;">
      <div style="border-top:1px solid #94a3b8;padding-top:6px;font-size:11.5px;color:#475569;font-weight:600;">${ku(isPurchaseAr ? 'توقيع مسؤول المشتريات' : isPurchaseKu ? 'واژووی سەرپەرشتیاری کڕین' : 'Procurement Manager')}</div>
    </div>
  </div>` : ''}

</div>

<div class="footer">
  ${ku(isPurchaseAr ? 'وصل شراء' : isPurchaseKu ? 'وەسڵی کڕین' : 'Purchase Voucher')} &nbsp;·&nbsp; ${ku(isPurchaseAr ? 'نظام فروشيار' : isPurchaseKu ? 'سیستەمی فرۆشیار' : 'Froshiar System')} · ${PDF_BRAND_WEBSITE} &nbsp;·&nbsp; #${escHtml(cleanPurchaseNum)}
</div>

</body>
</html>`;
}
