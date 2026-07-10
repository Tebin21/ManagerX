import type { Sale } from '@/types/sales';
import type { Purchase } from '@/types/purchases';
import {
  fmtIQD, fmtUSD, fmtPct, formatDate, formatTime,
  getPaymentStatus,
} from '@/utils/formatters';
import { KURDISH_FONT_FACE } from '@/lib/pdfFont';
import i18n from '@/lib/i18n';

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

// PDF language follows the app's current language automatically. `t()`
// reads from the invoicePdf i18n namespace; `ku()` wraps already-translated
// label text in an RTL-shaped, Rudaw-fonted span without ever touching the
// position/width/alignment of the element it sits inside -- numbers, IDs,
// dates, and user-entered data (names/addresses/etc.) never pass through
// `ku()`, so they always keep rendering as plain LTR/Latin-digit text.
function isKurdishActive(): boolean {
  return i18n.language === 'ku';
}
function t(key: string, opts?: Record<string, unknown>): string {
  return i18n.t(`invoicePdf.${key}`, opts) as string;
}
function ku(html: string): string {
  return isKurdishActive() ? `<span class="ku-text" dir="rtl">${html}</span>` : html;
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
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, 'Rudaw', sans-serif;
    background: #ffffff;
    color: #000000;
    font-size: 14px;
    line-height: 1.5;
  }
  .ku-text { font-family: 'Rudaw', sans-serif; direction: rtl; unicode-bidi: isolate; }
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
  .pill-partial { background: #fff7ed; color: #b45309; border: 1px solid #fed7aa; }
  .pill-debt    { background: #fef2f2; color: #b91c1c; border: 1px solid #fecaca; }

  /* ── Body ── */
  .body { padding: 18px 32px 24px; }

  /* ── Cards ── */
  .card {
    border: 1px solid #e2e8f0;
    border-radius: 14px;
    padding: 18px 20px;
    margin-bottom: 16px;
    page-break-inside: avoid;
  }
  .card-tint { background: #f8fafc; }
  .card-label {
    font-size: ${isKurdish ? '14px' : '10px'};
    font-weight: ${isKurdish ? '400' : '700'};
    text-transform: uppercase;
    letter-spacing: ${isKurdish ? 'normal' : '1.1px'};
    color: #000000;
    margin-bottom: 12px;
    text-align: ${kuAlign};
  }
  ${!isKurdish ? '.col-customer .card-label { font-size: 10px; text-align: left; }' : ''}

  /* ── Customer info rows: compact, label hugs value ── */
  .info-row { display: flex; flex-direction: ${isKurdish ? 'row-reverse' : 'row'}; align-items: baseline; gap: 6px; padding: 3px 0; font-size: 13px; }
  .row-label { color: #000000; font-weight: ${isKurdish ? '400' : '700'}; }
  .row-value { color: #000000; font-weight: 500; }

  /* ── Table ── */
  .table-card {
    border: 1px solid #e2e8f0;
    border-radius: 14px;
    overflow: hidden;
    margin-bottom: 16px;
  }
  table { width: 100%; border-collapse: collapse; page-break-inside: auto; direction: ${isKurdish ? 'rtl' : 'ltr'}; }
  thead { display: table-header-group; }
  tbody tr { page-break-inside: avoid; }
  th {
    background: #f8fafc;
    color: #000000;
    font-size: 10.5px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.8px;
    padding: 12px 14px;
    border-bottom: 1.5px solid #e2e8f0;
  }
  td {
    padding: 11px 14px;
    font-size: 13px;
    border-bottom: 1px solid #f1f5f9;
    vertical-align: middle;
    color: #000000;
  }
  tbody tr:last-child td { border-bottom: none; }
  tbody tr:nth-child(even) { background: #f8fafc; }
  .center { text-align: center; }
  .right  { text-align: ${numAlign}; unicode-bidi: isolate; direction: ltr; }
  .item-name { font-weight: 600; color: #000000; font-size: 13px; display: block; unicode-bidi: plaintext; }
  .id-chip {
    display: inline-block;
    font-size: 9.5px;
    color: #000000;
    border: 1px solid #e2e8f0;
    border-radius: 6px;
    padding: 1px 6px;
    font-weight: 600;
    unicode-bidi: isolate;
    direction: ltr;
  }
  .num-col { color: #000000; font-size: 12px; font-weight: 700; text-align: center; unicode-bidi: isolate; direction: ltr; }
  .empty-row { text-align: center; color: #000000; padding: 26px 14px; font-size: 13px; }
  .muted-cell { color: #94a3b8; }

  /* ── Financial ── */
  .fin-row {
    display: flex;
    flex-direction: ${isKurdish ? 'row-reverse' : 'row'};
    justify-content: space-between;
    align-items: center;
    padding: 7px 0;
    font-size: 13.5px;
    color: #000000;
  }
  .fin-amount { font-weight: 600; color: #000000; }

  .total-block {
    display: flex;
    flex-direction: ${isKurdish ? 'row-reverse' : 'row'};
    justify-content: space-between;
    align-items: baseline;
    padding-top: 12px;
    margin-top: 6px;
    border-top: 1px solid #e2e8f0;
  }
  .total-label { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: #000000; }
  .total-amount { font-size: 26px; font-weight: 800; color: #000000; letter-spacing: -0.4px; }

  /* ── USD conversion ── */
  .usd-row { display: flex; justify-content: space-between; align-items: baseline; }
  .usd-stack { width: 100%; }
  .usd-label { font-size: ${isKurdish ? '14px' : '10px'}; font-weight: ${isKurdish ? '400' : '700'}; text-transform: uppercase; letter-spacing: ${isKurdish ? 'normal' : '1.1px'}; color: #000000; margin-bottom: 6px; text-align: ${kuAlign}; }
  .usd-amount { font-size: 21px; font-weight: 800; color: #000000; }

  /* ── Block text ── */
  .block-text { font-size: 13px; color: #000000; line-height: 1.7; overflow-wrap: break-word; word-break: break-word; }

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
  exchangeRate: number = 1310
): string {
  const items = sale.items ?? [];
  const isKurdish = isKurdishActive();
  const lang = isKurdish ? 'ku' : 'en';
  const kuAlign = isKurdish ? 'right' : 'left';

  const monogram = (business.name ?? '').trim().charAt(0).toUpperCase() || 'B';
  const logoHTML = business.logoUri
    ? `<img src="${business.logoUri}" class="logo-img" alt="logo" />`
    : `<div class="logo-mono">${escHtml(monogram)}</div>`;

  const paymentStatus = getPaymentStatus(sale);
  const statusKey = paymentStatus === 'paid' ? 'statusPaid' : paymentStatus === 'partial' ? 'statusPartial' : 'statusUnpaid';
  const pillClass = paymentStatus === 'paid' ? 'pill-paid' : paymentStatus === 'partial' ? 'pill-partial' : 'pill-debt';
  const statusBadge = `<span class="pill ${pillClass}">${ku(t(statusKey))}</span>`;

  // ── Customer (rendered inside the header's middle column) ──
  const customerColumn = (sale.customerName || sale.customerPhone || sale.customerAddress) ? `
      <div class="card-label">${ku(t('customer'))}</div>
      ${sale.customerName    ? `<div class="info-row"><span class="row-label">${ku(t('name'))}:</span><span class="row-value">${escHtml(sale.customerName)}</span></div>` : ''}
      ${sale.customerPhone   ? `<div class="info-row"><span class="row-label">${ku(t('phone'))}:</span><span class="row-value">${escHtml(sale.customerPhone)}</span></div>` : ''}
      ${sale.customerAddress ? `<div class="info-row"><span class="row-label">${ku(t('address'))}:</span><span class="row-value">${escHtml(sale.customerAddress)}</span></div>` : ''}` : '';

  // ── Items table — Product ID is always its own column, never hidden ──
  const itemRows = items.length > 0 ? items.map((item, i) => `
    <tr>
      <td class="num-col">${i + 1}</td>
      <td style="text-align:${kuAlign};"><span class="item-name">${escHtml(item.productName)}</span></td>
      <td class="center">${item.itemId ? `<span class="id-chip">${escHtml(item.itemId)}</span>` : '<span class="muted-cell">—</span>'}</td>
      <td class="center">${item.quantity}</td>
      <td class="right">${fmtIQD(item.sellingPrice)} IQD</td>
      <td class="right">${item.discount > 0 ? fmtIQD(item.discount) + ' IQD' : '<span class="muted-cell">—</span>'}</td>
      <td class="right" style="font-weight:700;">${fmtIQD(item.lineTotal)} IQD</td>
    </tr>
  `).join('') : `<tr><td colspan="7" class="empty-row">${ku(t('noItems'))}</td></tr>`;

  const dateTimeValue = sale.date ?? sale.createdAt;

  const blockTextStyle = isKurdish ? `direction:rtl;text-align:${kuAlign};white-space:pre-wrap;` : '';

  const warrantyBlock = sale.warranty ? `
    <div class="card">
      <div class="card-label">${ku(t('warranty'))}</div>
      <p class="block-text" style="${blockTextStyle}">${escHtml(sale.warranty)}</p>
    </div>` : '';

  const notesText = sale.notes ? escHtml(sale.notes) : ku(t('noNotes'));
  const notesBlock = `
    <div class="card">
      <div class="card-label">${ku(t('notes'))}</div>
      <p class="block-text" style="${blockTextStyle}">${notesText}</p>
    </div>`;

  const infoPair = `<div class="info-pair">${warrantyBlock}${notesBlock}</div>`;

  const totalUSD = fmtUSD(sale.grandTotal / exchangeRate);

  const paidRow = sale.paidAmount > 0 && sale.paymentMethod === 'debt' ? `
    <div class="fin-row">
      <span>${ku(t('amountPaid'))}</span>
      <span class="fin-amount">${fmtIQD(sale.paidAmount)} IQD</span>
    </div>` : '';

  const debtRow = sale.remainingDebt > 0 ? `
    <div class="fin-row">
      <span>${ku(t('remainingDebt'))}</span>
      <span class="fin-amount" style="font-weight:700;">${fmtIQD(sale.remainingDebt)} IQD</span>
    </div>` : '';

  const financialCard = `
    <div class="card">
      <div class="card-label">${ku(t('paymentSummary'))}</div>
      <div class="fin-row">
        <span>${ku(t('subtotal'))}</span>
        <span class="fin-amount">${fmtIQD(sale.subtotal)} IQD</span>
      </div>
      ${sale.discountTotal > 0 ? `
      <div class="fin-row">
        <span>${ku(t('itemDiscountTotal'))}</span>
        <span class="fin-amount">− ${fmtIQD(sale.discountTotal)} IQD</span>
      </div>` : ''}
      ${sale.globalDiscount > 0 ? `
      <div class="fin-row">
        <span>${ku(t('cartDiscountTotal'))}</span>
        <span class="fin-amount">− ${fmtIQD(sale.globalDiscount)} IQD</span>
      </div>` : ''}
      <div class="total-block">
        <span class="total-label">${ku(t('totalIqd'))}</span>
        <span class="total-amount">${fmtIQD(sale.grandTotal)} IQD</span>
      </div>
      ${paidRow}
      ${debtRow}
    </div>`;

  const usdCard = `
    <div class="card card-tint">
      <div class="usd-row">
        <div class="usd-stack">
          <div class="usd-label">${ku(t('totalUsd'))}</div>
          <div class="usd-amount">$${totalUSD}</div>
        </div>
      </div>
    </div>`;

  return `<!DOCTYPE html>
<html lang="${lang}" dir="ltr">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Invoice ${escHtml(sale.invoiceNumber)}</title>
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
      <div class="inv-meta-title">${ku(t('invoiceNumberLabel'))} #${escHtml(sale.invoiceNumber)}</div>
      <div class="inv-meta-line">${ku(t('date'))}: ${escHtml(formatDate(dateTimeValue))}</div>
      <div class="inv-meta-line">${ku(t('time'))}: ${escHtml(formatTime(dateTimeValue))}</div>
      <div class="inv-status-row">
        <span class="inv-meta-line">${ku(t('status'))}:</span>
        ${statusBadge}
      </div>
    </div>
  </div>
</div>

<div class="body">

  ${infoPair}

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

  ${financialCard}
  ${usdCard}

</div>

<div class="footer">
  ${ku(t('salesInvoiceLabel'))} &nbsp;·&nbsp; ${ku(t('poweredBy'))} ${t('common.appName')} &nbsp;·&nbsp; ${escHtml(sale.invoiceNumber)}
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
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, 'Rudaw', sans-serif;
    background: #ffffff;
    color: #000000;
    font-size: 14px;
    line-height: 1.5;
  }
  .ku-text { font-family: 'Rudaw', sans-serif; direction: rtl; unicode-bidi: isolate; }
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
  .pill-debt { background: #fef2f2; color: #b91c1c; border: 1px solid #fecaca; }

  /* ── Body ── */
  .body { padding: 18px 32px 24px; }

  /* ── Cards ── */
  .card {
    border: 1px solid #e2e8f0;
    border-radius: 14px;
    padding: 18px 20px;
    margin-bottom: 16px;
    page-break-inside: avoid;
  }
  .card-tint { background: #f8fafc; }
  .card-label {
    font-size: ${isKurdish ? '14px' : '10px'};
    font-weight: ${isKurdish ? '400' : '700'};
    text-transform: uppercase;
    letter-spacing: ${isKurdish ? 'normal' : '1.1px'};
    color: #000000;
    margin-bottom: 12px;
    text-align: ${kuAlign};
  }
  ${!isKurdish ? '.col-supplier .card-label { font-size: 10px; text-align: left; }' : ''}

  /* ── Supplier info rows: compact, label hugs value ── */
  .info-row { display: flex; flex-direction: ${isKurdish ? 'row-reverse' : 'row'}; align-items: baseline; gap: 6px; padding: 3px 0; font-size: 13px; }
  .row-label { color: #000000; font-weight: ${isKurdish ? '400' : '700'}; }
  .row-value { color: #000000; font-weight: 500; }

  /* ── Table ── */
  .table-card {
    border: 1px solid #e2e8f0;
    border-radius: 14px;
    overflow: hidden;
    margin-bottom: 16px;
  }
  table { width: 100%; border-collapse: collapse; page-break-inside: auto; direction: ${isKurdish ? 'rtl' : 'ltr'}; }
  thead { display: table-header-group; }
  tbody tr { page-break-inside: avoid; }
  th {
    background: #f8fafc;
    color: #000000;
    font-size: 10.5px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.8px;
    padding: 12px 14px;
    border-bottom: 1.5px solid #e2e8f0;
  }
  td {
    padding: 11px 14px;
    font-size: 13px;
    border-bottom: 1px solid #f1f5f9;
    vertical-align: middle;
    color: #000000;
  }
  tbody tr:last-child td { border-bottom: none; }
  tbody tr:nth-child(even) { background: #f8fafc; }
  .center { text-align: center; }
  .right  { text-align: ${numAlign}; unicode-bidi: isolate; direction: ltr; }
  .item-name { font-weight: 600; color: #000000; font-size: 13px; display: block; unicode-bidi: plaintext; }
  .item-id {
    display: inline-block;
    margin-top: 3px;
    font-size: 9.5px;
    color: #000000;
    border: 1px solid #e2e8f0;
    border-radius: 6px;
    padding: 1px 6px;
    font-weight: 600;
    unicode-bidi: isolate;
    direction: ltr;
  }
  .num-col { color: #000000; font-size: 12px; font-weight: 700; text-align: center; unicode-bidi: isolate; direction: ltr; }

  /* ── Financial ── */
  .fin-row {
    display: flex;
    flex-direction: ${isKurdish ? 'row-reverse' : 'row'};
    justify-content: space-between;
    align-items: center;
    padding: 7px 0;
    font-size: 13.5px;
    color: #000000;
  }
  .fin-amount { font-weight: 600; color: #000000; }
  .fin-amount.muted { color: #000000; font-weight: 600; }

  .total-block {
    display: flex;
    flex-direction: ${isKurdish ? 'row-reverse' : 'row'};
    justify-content: space-between;
    align-items: baseline;
    padding-bottom: 14px;
    margin-bottom: 8px;
    border-bottom: 1px solid #e2e8f0;
  }
  .total-label { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: #000000; }
  .total-amount { font-size: 26px; font-weight: 800; color: #000000; letter-spacing: -0.4px; }

  /* ── USD conversion ── */
  .usd-row { display: flex; justify-content: space-between; align-items: baseline; }
  .usd-stack { width: 100%; }
  .usd-label { font-size: ${isKurdish ? '14px' : '10px'}; font-weight: ${isKurdish ? '400' : '700'}; text-transform: uppercase; letter-spacing: ${isKurdish ? 'normal' : '1.1px'}; color: #000000; margin-bottom: 6px; text-align: ${kuAlign}; }
  .usd-amount { font-size: 21px; font-weight: 800; color: #000000; }

  /* ── Block text ── */
  .block-text { font-size: 13px; color: #000000; line-height: 1.7; }

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
  dir: 'ltr' | 'rtl' = 'ltr'
): string {
  const isKurdish = isKurdishActive();
  const lang = isKurdish ? 'ku' : 'en';
  const kuAlign = isKurdish ? 'right' : 'left';

  const monogram = (business.name ?? '').trim().charAt(0).toUpperCase() || 'B';
  const logoHTML = business.logoUri
    ? `<img src="${business.logoUri}" class="logo-img" alt="logo" />`
    : `<div class="logo-mono">${escHtml(monogram)}</div>`;

  const statusBadge = purchase.paymentStatus === 'paid'
    ? `<span class="pill pill-paid">${ku(t('statusPaid'))}</span>`
    : `<span class="pill pill-debt">${ku(t('statusDebt'))}</span>`;

  // ── Supplier (rendered inside the header's middle column) ──
  const supplierColumn = (purchase.supplierName || purchase.supplierPhone || purchase.supplierAddress) ? `
      <div class="card-label">${ku(t('supplier'))}</div>
      ${purchase.supplierName    ? `<div class="info-row"><span class="row-label">${ku(t('name'))}:</span><span class="row-value">${escHtml(purchase.supplierName)}</span></div>` : ''}
      ${purchase.supplierPhone   ? `<div class="info-row"><span class="row-label">${ku(t('phone'))}:</span><span class="row-value">${escHtml(purchase.supplierPhone)}</span></div>` : ''}
      ${purchase.supplierAddress ? `<div class="info-row"><span class="row-label">${ku(t('address'))}:</span><span class="row-value">${escHtml(purchase.supplierAddress)}</span></div>` : ''}` : '';

  // ── Items table ──
  const displayRows: PurchaseDisplayRow[] = purchaseItems.length > 0
    ? purchaseItems.flatMap((item) => expandPurchaseRow(item.productName, item.quantity, item.buyPriceIQD, item.lineTotalIQD, item.itemIds))
    : expandPurchaseRow(purchase.productName, purchase.quantity, purchase.buyPriceIQD, purchase.totalIQD, purchase.itemIds);

  const rows = displayRows.map((row, i) => `
        <tr>
          <td class="num-col">${i + 1}</td>
          <td style="text-align:${kuAlign};">
            <span class="item-name">${escHtml(row.name)}</span>
            ${row.idChip ? `<span class="item-id">${ku(t('itemIdLabel'))}: ${escHtml(row.idChip)}</span>` : ''}
          </td>
          <td class="center">${row.qty}</td>
          <td class="right">${fmtIQD(row.unitPriceIQD)} IQD</td>
          <td class="right" style="font-weight:700;">${fmtIQD(row.totalIQD)} IQD</td>
        </tr>`).join('');

  const itemsContent = `
      <div class="table-card">
        <table>
          <thead>
            <tr>
              <th class="center" style="width:36px;">#</th>
              <th style="text-align:${kuAlign};">${ku(t('colProduct'))}</th>
              <th class="center" style="width:60px;">${ku(t('colQty'))}</th>
              <th class="right" style="width:130px;">${ku(t('colUnitPriceIqd'))}</th>
              <th class="right" style="width:130px;">${ku(t('totalIqd'))}</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </div>`;

  // ── Financial ──
  const exchangeRate = purchase.exchangeRate > 0 ? purchase.exchangeRate : 1310;
  const totalUSD = fmtUSD(purchase.totalIQD / exchangeRate);

  const paidRows = purchase.paymentStatus === 'paid'
    ? `<div class="fin-row"><span>${ku(t('amountPaid'))}</span><span class="fin-amount">${fmtIQD(purchase.totalIQD)} IQD</span></div>
       <div class="fin-row"><span>${ku(t('remainingDebt'))}</span><span class="fin-amount">0 IQD</span></div>`
    : `<div class="fin-row"><span>${ku(t('amountPaid'))}</span><span class="fin-amount muted">—</span></div>
       <div class="fin-row"><span>${ku(t('remainingDebt'))}</span><span class="fin-amount muted">—</span></div>`;

  const financialCard = `
    <div class="card">
      <div class="card-label">${ku(t('paymentSummary'))}</div>
      <div class="total-block">
        <span class="total-label">${ku(t('totalIqd'))}</span>
        <span class="total-amount">${fmtIQD(purchase.totalIQD)} IQD</span>
      </div>
      ${paidRows}
      <div class="fin-row">
        <span>${ku(t('paymentStatusLabel'))}</span>
        <span>${statusBadge}</span>
      </div>
    </div>`;

  const usdCard = `
    <div class="card card-tint">
      <div class="usd-row">
        <div class="usd-stack">
          <div class="usd-label">${ku(t('totalUsd'))}</div>
          <div class="usd-amount">$${totalUSD}</div>
        </div>
      </div>
    </div>`;

  // ── Optional blocks ──
  const blockTextStyle = isKurdish ? `direction:rtl;text-align:${kuAlign};white-space:pre-wrap;` : '';

  const warrantyBlock = purchase.warranty ? `
    <div class="card">
      <div class="card-label">${ku(t('warranty'))}</div>
      <p class="block-text" style="${blockTextStyle}">${escHtml(purchase.warranty)}</p>
    </div>` : '';

  const descriptionBlock = purchase.description ? `
    <div class="card">
      <div class="card-label">${ku(t('description'))}</div>
      <p class="block-text" style="${blockTextStyle}">${escHtml(purchase.description)}</p>
    </div>` : '';

  const notesBlock = purchase.notes ? `
    <div class="card">
      <div class="card-label">${ku(t('notes'))}</div>
      <p class="block-text" style="${blockTextStyle}">${escHtml(purchase.notes)}</p>
    </div>` : '';

  const infoPair = `<div class="info-pair">${warrantyBlock}${notesBlock}</div>`;

  const purchaseDateTime = purchase.date ?? purchase.createdAt;

  return `<!DOCTYPE html>
<html lang="${lang}" dir="ltr">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Purchase Invoice ${escHtml(purchase.purchaseNumber)}</title>
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
      <div class="inv-meta-title">${ku(t('invoiceNumberLabel'))} #${escHtml(purchase.purchaseNumber)}</div>
      <div class="inv-meta-line">${ku(t('date'))}: ${escHtml(formatDate(purchaseDateTime))}</div>
      <div class="inv-meta-line">${ku(t('time'))}: ${escHtml(formatTime(purchaseDateTime))}</div>
      <div class="inv-status-row">
        <span class="inv-meta-line">${ku(t('status'))}:</span>
        ${statusBadge}
      </div>
    </div>
  </div>
</div>

<div class="body">

  ${itemsContent}

  ${financialCard}
  ${usdCard}

  ${infoPair}
  ${descriptionBlock}

</div>

<div class="footer">
  ${ku(t('purchaseInvoiceLabel'))} &nbsp;·&nbsp; ${ku(t('poweredBy'))} ${t('common.appName')} &nbsp;·&nbsp; ${escHtml(purchase.purchaseNumber)}
</div>

</body>
</html>`;
}
