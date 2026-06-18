import type { Sale } from '@/types/sales';
import type { Purchase } from '@/types/purchases';
import { fmtIQD, fmtUSD, fmtPct, formatDateTime } from '@/utils/formatters';

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

// ─── Sales Invoice CSS ────────────────────────────────────────────────────────

const BASE_CSS = `
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    direction: ltr;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif;
    background: #ffffff;
    color: #111111;
    font-size: 14px;
    line-height: 1.5;
  }

  /* ── Header ── */
  .header {
    background: #ffffff;
    padding: 32px 32px 24px;
    border-bottom: 2px solid #111111;
  }
  .header-inner {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 20px;
  }
  .logo {
    height: 56px;
    max-width: 140px;
    object-fit: contain;
    margin-bottom: 10px;
    display: block;
    border: 1px solid #e5e5e5;
    border-radius: 6px;
    padding: 4px;
  }
  .biz-name { font-size: 20px; font-weight: 800; letter-spacing: -0.3px; color: #111; margin-bottom: 3px; }
  .biz-meta { font-size: 12px; color: #666; line-height: 1.6; }
  .inv-col { text-align: right; }
  .inv-label { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 1.2px; color: #999; margin-bottom: 6px; }
  .inv-number { font-size: 18px; font-weight: 800; letter-spacing: -0.3px; color: #111; margin-bottom: 3px; }
  .inv-date { font-size: 12px; color: #666; margin-bottom: 10px; }

  /* ── Payment Badges ── */
  .badge-cash {
    display: inline-block;
    border: 1.5px solid #111;
    padding: 3px 12px;
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 0.6px;
    text-transform: uppercase;
    color: #111;
  }
  .badge-fib {
    display: inline-block;
    border: 1.5px solid #111;
    padding: 3px 12px;
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 0.6px;
    text-transform: uppercase;
    color: #111;
  }
  .badge-debt {
    display: inline-block;
    border: 1.5px dashed #888;
    padding: 3px 12px;
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 0.6px;
    text-transform: uppercase;
    color: #666;
  }

  /* ── Body ── */
  .body { padding: 0 32px 24px; }

  /* ── Sections ── */
  .section { border-bottom: 1px solid #e5e5e5; padding: 20px 0; }
  .section-label {
    font-size: 9.5px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 1px;
    color: #999;
    margin-bottom: 12px;
  }

  /* ── Info rows ── */
  .info-row {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    gap: 16px;
    padding: 5px 0;
    font-size: 13px;
    border-bottom: 1px solid #f5f5f5;
  }
  .info-row:last-child { border-bottom: none; }
  .row-label { color: #888; font-size: 12.5px; min-width: 100px; flex-shrink: 0; }
  .row-value { color: #111; font-weight: 500; text-align: right; }

  /* ── Table ── */
  .table-wrap { border: 1px solid #e5e5e5; overflow: hidden; }
  table { width: 100%; border-collapse: collapse; }
  th {
    background: #f7f7f7;
    color: #999;
    font-size: 9.5px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.7px;
    padding: 9px 10px;
    border-bottom: 1px solid #e5e5e5;
  }
  td {
    padding: 10px 10px;
    font-size: 13px;
    border-bottom: 1px solid #f5f5f5;
    vertical-align: middle;
    color: #222;
  }
  tr:last-child td { border-bottom: none; }
  .center { text-align: center; }
  .right  { text-align: right; }
  .item-name { font-weight: 600; color: #111; font-size: 13px; display: block; }
  .item-id {
    display: inline-block;
    margin-top: 3px;
    font-size: 10px;
    color: #555;
    border: 1px solid #ddd;
    padding: 1px 6px;
    font-weight: 600;
  }
  .num-col { color: #bbb; font-size: 12px; font-weight: 600; text-align: center; }

  /* ── Financial rows ── */
  .fin-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 6px 0;
    font-size: 13.5px;
    color: #555;
    border-bottom: 1px solid #f5f5f5;
  }
  .fin-row:last-child { border-bottom: none; }
  .fin-row.grand {
    border-top: 2px solid #111;
    border-bottom: none;
    margin-top: 8px;
    padding-top: 13px;
    font-size: 17px;
    font-weight: 800;
    color: #111;
  }
  .fin-row.usd-conv {
    font-size: 11.5px;
    color: #999;
    padding-top: 3px;
    padding-bottom: 10px;
    border-bottom: 1px solid #ebebeb;
  }
  .fin-amount { font-weight: 600; min-width: 130px; text-align: right; }
  .fin-amount.grand-amt { font-weight: 800; }

  /* ── Block text ── */
  .block-text { font-size: 13px; color: #444; line-height: 1.7; }

  /* ── Signature ── */
  .sig-section {
    padding: 32px 0 8px;
    display: flex;
    justify-content: space-between;
    gap: 40px;
  }
  .sig-box { flex: 1; text-align: center; }
  .sig-space { height: 48px; }
  .sig-line { border-top: 1px solid #aaa; margin-bottom: 8px; }
  .sig-label {
    font-size: 9.5px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.9px;
    color: #999;
  }

  /* ── Footer ── */
  .footer {
    border-top: 1px solid #ebebeb;
    text-align: center;
    padding: 16px 32px 20px;
    color: #bbb;
    font-size: 11px;
  }

  @media print { body { background: white; } }
`;

// ─── Sales Invoice ─────────────────────────────────────────────────────────────

export function buildInvoiceHTML(
  sale: Sale,
  business: BusinessInfo,
  dir: 'ltr' | 'rtl' = 'ltr',
  exchangeRate: number = 1310
): string {
  const items = sale.items ?? [];
  const lang = 'en';

  const logoHTML = business.logoUri
    ? `<img src="${business.logoUri}" class="logo" alt="logo" />`
    : '';

  const bizContact = [business.phone, business.address]
    .map((v) => escHtml(v ?? ''))
    .filter(Boolean)
    .join(' &nbsp;·&nbsp; ');

  const paymentBadge = sale.paymentMethod === 'cash'
    ? '<span class="badge-cash">Cash</span>'
    : sale.paymentMethod === 'fib'
      ? '<span class="badge-fib">FIB</span>'
      : '<span class="badge-debt">Debt</span>';

  const itemRows = items.map((item, i) => `
    <tr>
      <td class="num-col">${i + 1}</td>
      <td>
        <span class="item-name">${escHtml(item.productName)}</span>
        ${item.itemId ? `<span class="item-id">#${escHtml(item.itemId)}</span>` : ''}
      </td>
      <td class="center">${item.quantity}</td>
      <td class="right">${fmtIQD(item.sellingPrice)} IQD</td>
      <td class="right">${item.discount > 0 ? fmtIQD(item.discount) + ' IQD' : '<span style="color:#ccc;">—</span>'}</td>
      <td class="right" style="font-weight:700;color:#111;">${fmtIQD(item.lineTotal)} IQD</td>
    </tr>
  `).join('');

  const customerBlock = (sale.customerName || sale.customerPhone || sale.customerAddress) ? `
    <div class="section">
      <div class="section-label">Customer</div>
      ${sale.customerName    ? `<div class="info-row"><span class="row-label">Name</span><span class="row-value">${escHtml(sale.customerName)}</span></div>` : ''}
      ${sale.customerPhone   ? `<div class="info-row"><span class="row-label">Phone</span><span class="row-value">${escHtml(sale.customerPhone)}</span></div>` : ''}
      ${sale.customerAddress ? `<div class="info-row"><span class="row-label">Address</span><span class="row-value">${escHtml(sale.customerAddress)}</span></div>` : ''}
    </div>
  ` : '';

  const warrantyBlock = sale.warranty ? `
    <div class="section">
      <div class="section-label">Warranty</div>
      <p class="block-text">${escHtml(sale.warranty)}</p>
    </div>
  ` : '';

  const notesBlock = sale.notes ? `
    <div class="section">
      <div class="section-label">Notes</div>
      <p class="block-text">${escHtml(sale.notes)}</p>
    </div>
  ` : '';

  const totalUSD = fmtUSD(sale.grandTotal / exchangeRate);

  const paidRow = sale.paidAmount > 0 && sale.paymentMethod === 'debt' ? `
    <div class="fin-row">
      <span>Amount Paid</span>
      <span class="fin-amount">${fmtIQD(sale.paidAmount)} IQD</span>
    </div>` : '';

  const debtRow = sale.remainingDebt > 0 ? `
    <div class="fin-row">
      <span>Remaining Debt</span>
      <span class="fin-amount" style="color:#333;font-weight:700;">${fmtIQD(sale.remainingDebt)} IQD</span>
    </div>` : '';

  return `<!DOCTYPE html>
<html lang="${lang}" dir="ltr">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Invoice ${escHtml(sale.invoiceNumber)}</title>
<style>${BASE_CSS}</style>
</head>
<body>

<div class="header">
  <div class="header-inner">
    <div class="biz-info">
      ${logoHTML}
      <div class="biz-name">${escHtml(business.name || 'Business')}</div>
      ${bizContact ? `<div class="biz-meta">${bizContact}</div>` : ''}
    </div>
    <div class="inv-col">
      <div class="inv-label">Invoice</div>
      <div class="inv-number">${escHtml(sale.invoiceNumber)}</div>
      <div class="inv-date">${formatDateTime(sale.date ?? sale.createdAt)}</div>
      ${paymentBadge}
    </div>
  </div>
</div>

<div class="body">

  ${customerBlock}
  ${warrantyBlock}

  <div class="section">
    <div class="section-label">Items</div>
    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th class="center" style="width:32px;">#</th>
            <th style="text-align:left;">Item</th>
            <th class="center" style="width:44px;">Qty</th>
            <th class="right" style="width:100px;">Price</th>
            <th class="right" style="width:90px;">Disc</th>
            <th class="right" style="width:110px;">Total</th>
          </tr>
        </thead>
        <tbody>
          ${itemRows}
        </tbody>
      </table>
    </div>
  </div>

  <div class="section">
    <div class="section-label">Payment Summary</div>
    <div class="fin-row">
      <span>Subtotal</span>
      <span class="fin-amount">${fmtIQD(sale.subtotal)} IQD</span>
    </div>
    ${sale.discountTotal > 0 ? `
    <div class="fin-row">
      <span>Discount</span>
      <span class="fin-amount" style="color:#555;">− ${fmtIQD(sale.discountTotal)} IQD</span>
    </div>` : ''}
    <div class="fin-row grand">
      <span>Total</span>
      <span class="fin-amount grand-amt">${fmtIQD(sale.grandTotal)} IQD</span>
    </div>
    <div class="fin-row usd-conv">
      <span></span>
      <span>= ${totalUSD} USD &nbsp;·&nbsp; 100 USD = ${fmtIQD(exchangeRate * 100)} IQD</span>
    </div>
    ${paidRow}
    ${debtRow}
    <div class="fin-row" style="padding-top:8px;">
      <span>Payment Status</span>
      <span class="fin-amount">${paymentBadge}</span>
    </div>
  </div>

  ${notesBlock}

  <div class="sig-section">
    <div class="sig-box">
      <div class="sig-space"></div>
      <div class="sig-line"></div>
      <div class="sig-label">Business Signature</div>
    </div>
    <div class="sig-box">
      <div class="sig-space"></div>
      <div class="sig-line"></div>
      <div class="sig-label">Customer Signature</div>
    </div>
  </div>

</div>

<div class="footer">
  Invoice &nbsp;·&nbsp; Powered by ManagerX &nbsp;·&nbsp; ${escHtml(sale.invoiceNumber)}
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


const PURCHASE_CSS = `
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    direction: ltr;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif;
    background: #ffffff;
    color: #111111;
    font-size: 14px;
    line-height: 1.5;
  }

  /* ── Header ── */
  .header {
    background: #ffffff;
    padding: 32px 32px 24px;
    border-bottom: 2px solid #111111;
  }
  .header-inner {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 20px;
  }
  .logo {
    height: 56px;
    max-width: 140px;
    object-fit: contain;
    margin-bottom: 10px;
    display: block;
    border: 1px solid #e5e5e5;
    border-radius: 6px;
    padding: 4px;
  }
  .biz-name { font-size: 20px; font-weight: 800; letter-spacing: -0.3px; color: #111; margin-bottom: 3px; }
  .biz-meta { font-size: 12px; color: #666; line-height: 1.6; }
  .inv-col { text-align: right; }
  .inv-label { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 1.2px; color: #999; margin-bottom: 6px; }
  .inv-number { font-size: 18px; font-weight: 800; letter-spacing: -0.3px; color: #111; margin-bottom: 3px; }
  .inv-date { font-size: 12px; color: #666; margin-bottom: 10px; }
  .status-paid {
    display: inline-block;
    border: 1.5px solid #111;
    padding: 3px 12px;
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 0.6px;
    text-transform: uppercase;
    color: #111;
  }
  .status-debt {
    display: inline-block;
    border: 1.5px dashed #888;
    padding: 3px 12px;
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 0.6px;
    text-transform: uppercase;
    color: #666;
  }

  /* ── Body ── */
  .body { padding: 0 32px 24px; }

  /* ── Sections ── */
  .section { border-bottom: 1px solid #e5e5e5; padding: 20px 0; }
  .section-label {
    font-size: 9.5px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 1px;
    color: #999;
    margin-bottom: 12px;
  }

  /* ── Info rows ── */
  .info-row {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    gap: 16px;
    padding: 5px 0;
    font-size: 13px;
    border-bottom: 1px solid #f5f5f5;
  }
  .info-row:last-child { border-bottom: none; }
  .row-label { color: #888; font-size: 12.5px; min-width: 100px; flex-shrink: 0; }
  .row-value { color: #111; font-weight: 500; text-align: right; }

  /* ── Table ── */
  .table-wrap { border: 1px solid #e5e5e5; overflow: hidden; }
  table { width: 100%; border-collapse: collapse; }
  th {
    background: #f7f7f7;
    color: #999;
    font-size: 9.5px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.7px;
    padding: 9px 10px;
    border-bottom: 1px solid #e5e5e5;
  }
  td {
    padding: 10px 10px;
    font-size: 13px;
    border-bottom: 1px solid #f5f5f5;
    vertical-align: middle;
    color: #222;
  }
  tr:last-child td { border-bottom: none; }
  .center { text-align: center; }
  .right  { text-align: right; }
  .item-name { font-weight: 600; color: #111; font-size: 13px; display: block; }
  .item-id {
    display: inline-block;
    margin-top: 3px;
    font-size: 10px;
    color: #555;
    border: 1px solid #ddd;
    padding: 1px 6px;
    font-weight: 600;
  }
  .num-col { color: #bbb; font-size: 12px; font-weight: 600; text-align: center; }

  /* ── Financial ── */
  .fin-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 6px 0;
    font-size: 13.5px;
    color: #555;
    border-bottom: 1px solid #f5f5f5;
  }
  .fin-row:last-child { border-bottom: none; }
  .fin-row.grand {
    border-top: 2px solid #111;
    border-bottom: none;
    margin-top: 8px;
    padding-top: 13px;
    font-size: 17px;
    font-weight: 800;
    color: #111;
  }
  .fin-row.usd-conv {
    font-size: 11.5px;
    color: #999;
    padding-top: 3px;
    padding-bottom: 10px;
    border-bottom: 1px solid #ebebeb;
  }
  .fin-amount { font-weight: 600; min-width: 130px; text-align: right; }
  .fin-amount.grand-amt { font-weight: 800; }

  /* ── Block text ── */
  .block-text { font-size: 13px; color: #444; line-height: 1.7; }

  /* ── Signature ── */
  .sig-section {
    padding: 32px 0 8px;
    display: flex;
    justify-content: space-between;
    gap: 40px;
  }
  .sig-box { flex: 1; text-align: center; }
  .sig-space { height: 48px; }
  .sig-line { border-top: 1px solid #aaa; margin-bottom: 8px; }
  .sig-label {
    font-size: 9.5px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.9px;
    color: #999;
  }

  /* ── Footer ── */
  .footer {
    border-top: 1px solid #ebebeb;
    text-align: center;
    padding: 16px 32px 20px;
    color: #bbb;
    font-size: 11px;
  }

  @media print { body { background: white; } }
`;

export function buildPurchaseInvoiceHTML(
  purchase: Purchase,
  purchaseItems: PurchaseItemRow[],
  business: BusinessInfo,
  dir: 'ltr' | 'rtl' = 'ltr'
): string {
  const lang = 'en';

  const logoHTML = business.logoUri
    ? `<img src="${business.logoUri}" class="logo" alt="logo" />`
    : '';

  const statusBadge = purchase.paymentStatus === 'paid'
    ? '<span class="status-paid">Paid</span>'
    : '<span class="status-debt">Debt</span>';

  const bizContact = [business.phone, business.address]
    .map((v) => escHtml(v ?? ''))
    .filter(Boolean)
    .join(' &nbsp;·&nbsp; ');

  // ── Supplier ──
  const supplierBlock = (purchase.supplierName || purchase.supplierPhone || purchase.supplierAddress) ? `
    <div class="section">
      <div class="section-label">Supplier</div>
      ${purchase.supplierName    ? `<div class="info-row"><span class="row-label">Name</span><span class="row-value">${escHtml(purchase.supplierName)}</span></div>` : ''}
      ${purchase.supplierPhone   ? `<div class="info-row"><span class="row-label">Phone</span><span class="row-value">${escHtml(purchase.supplierPhone)}</span></div>` : ''}
      ${purchase.supplierAddress ? `<div class="info-row"><span class="row-label">Address</span><span class="row-value">${escHtml(purchase.supplierAddress)}</span></div>` : ''}
    </div>` : '';

  // ── Items table ──
  let itemsContent: string;
  if (purchaseItems.length > 0) {
    const rows = purchaseItems.map((item, i) => {
      const firstId = item.itemIds.find((v) => v.trim());
      return `
        <tr>
          <td class="num-col">${i + 1}</td>
          <td>
            <span class="item-name">${escHtml(item.productName)}</span>
            ${firstId ? `<span class="item-id">#${escHtml(firstId)}</span>` : ''}
          </td>
          <td class="center">${item.quantity}</td>
          <td class="right">${fmtIQD(item.buyPriceIQD)} IQD</td>
          <td class="right" style="font-weight:700;color:#111;">${fmtIQD(item.lineTotalIQD)} IQD</td>
        </tr>`;
    }).join('');
    itemsContent = `
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th class="center" style="width:32px;">#</th>
              <th style="text-align:left;">Product</th>
              <th class="center" style="width:44px;">Qty</th>
              <th class="right" style="width:120px;">Unit Price</th>
              <th class="right" style="width:120px;">Total</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </div>`;
  } else {
    const firstId = purchase.itemIds.find((v) => v.trim());
    itemsContent = `
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th class="center" style="width:32px;">#</th>
              <th style="text-align:left;">Product</th>
              <th class="center" style="width:44px;">Qty</th>
              <th class="right" style="width:120px;">Unit Price</th>
              <th class="right" style="width:120px;">Total</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td class="num-col">1</td>
              <td>
                <span class="item-name">${escHtml(purchase.productName)}</span>
                ${firstId ? `<span class="item-id">#${escHtml(firstId)}</span>` : ''}
              </td>
              <td class="center">${purchase.quantity}</td>
              <td class="right">${fmtIQD(purchase.buyPriceIQD)} IQD</td>
              <td class="right" style="font-weight:700;color:#111;">${fmtIQD(purchase.totalIQD)} IQD</td>
            </tr>
          </tbody>
        </table>
      </div>`;
  }

  // ── Financial ──
  const exchangeRate = purchase.exchangeRate > 0 ? purchase.exchangeRate : 1310;
  const totalUSD = fmtUSD(purchase.totalIQD / exchangeRate);

  const paidRows = purchase.paymentStatus === 'paid'
    ? `<div class="fin-row"><span>Amount Paid</span><span class="fin-amount">${fmtIQD(purchase.totalIQD)} IQD</span></div>
       <div class="fin-row"><span>Remaining Debt</span><span class="fin-amount">0 IQD</span></div>`
    : `<div class="fin-row"><span>Amount Paid</span><span class="fin-amount" style="color:#aaa;">—</span></div>
       <div class="fin-row"><span>Remaining Debt</span><span class="fin-amount" style="color:#aaa;">—</span></div>`;

  const financialSection = `
    <div class="fin-row"><span>Subtotal</span><span class="fin-amount">${fmtIQD(purchase.totalIQD)} IQD</span></div>
    <div class="fin-row grand"><span>Total</span><span class="fin-amount grand-amt">${fmtIQD(purchase.totalIQD)} IQD</span></div>
    <div class="fin-row usd-conv">
      <span></span>
      <span>= ${totalUSD} USD &nbsp;·&nbsp; 100 USD = ${fmtIQD(exchangeRate * 100)} IQD</span>
    </div>
    ${paidRows}
    <div class="fin-row" style="padding-top:8px;">
      <span>Payment Status</span>
      <span class="fin-amount">${statusBadge}</span>
    </div>`;

  // ── Optional blocks ──
  const warrantyBlock = purchase.warranty ? `
    <div class="section">
      <div class="section-label">Warranty</div>
      <p class="block-text">${escHtml(purchase.warranty)}</p>
    </div>` : '';

  const descriptionBlock = purchase.description ? `
    <div class="section">
      <div class="section-label">Description</div>
      <p class="block-text">${escHtml(purchase.description)}</p>
    </div>` : '';

  const notesBlock = purchase.notes ? `
    <div class="section">
      <div class="section-label">Notes</div>
      <p class="block-text">${escHtml(purchase.notes)}</p>
    </div>` : '';

  const dateTimeStr = formatDateTime(purchase.date ?? purchase.createdAt);

  return `<!DOCTYPE html>
<html lang="${lang}" dir="ltr">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Purchase Invoice ${escHtml(purchase.purchaseNumber)}</title>
<style>${PURCHASE_CSS}</style>
</head>
<body>

<div class="header">
  <div class="header-inner">
    <div class="biz-info">
      ${logoHTML}
      <div class="biz-name">${escHtml(business.name || 'Business')}</div>
      ${bizContact ? `<div class="biz-meta">${bizContact}</div>` : ''}
    </div>
    <div class="inv-col">
      <div class="inv-label">Purchase Invoice</div>
      <div class="inv-number">${escHtml(purchase.purchaseNumber)}</div>
      <div class="inv-date">${dateTimeStr}</div>
      ${statusBadge}
    </div>
  </div>
</div>

<div class="body">

  ${supplierBlock}

  <div class="section">
    <div class="section-label">Items</div>
    ${itemsContent}
  </div>

  <div class="section">
    <div class="section-label">Payment Summary</div>
    ${financialSection}
  </div>

  ${warrantyBlock}
  ${descriptionBlock}
  ${notesBlock}

  <div class="sig-section">
    <div class="sig-box">
      <div class="sig-space"></div>
      <div class="sig-line"></div>
      <div class="sig-label">Business Signature</div>
    </div>
    <div class="sig-box">
      <div class="sig-space"></div>
      <div class="sig-line"></div>
      <div class="sig-label">Supplier Signature</div>
    </div>
  </div>

</div>

<div class="footer">
  Purchase Invoice &nbsp;·&nbsp; Powered by ManagerX &nbsp;·&nbsp; ${escHtml(purchase.purchaseNumber)}
</div>

</body>
</html>`;
}
