import type { Sale } from '@/types/sales';
import type { Purchase } from '@/types/purchases';

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

function fmt(amount: number): string {
  return amount.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}

function formatDate(isoString: string): string {
  try {
    return new Date(isoString).toLocaleDateString('en-US', {
      year: 'numeric', month: 'long', day: 'numeric',
    });
  } catch {
    return isoString;
  }
}

export function buildInvoiceHTML(sale: Sale, business: BusinessInfo, dir: 'ltr' | 'rtl' = 'ltr'): string {
  const items = sale.items ?? [];

  const logoHTML = business.logoUri
    ? `<img src="${business.logoUri}" style="height:52px;object-fit:contain;margin-bottom:8px;display:block;" />`
    : '';

  const itemRows = items.map((item, i) => `
    <tr class="${i % 2 === 0 ? 'row-even' : 'row-odd'}">
      <td class="center">${i + 1}</td>
      <td>
        <span class="item-name">${escHtml(item.productName)}</span>
        ${item.itemId ? `<span class="item-id-badge">#${escHtml(item.itemId)}</span>` : ''}
      </td>
      <td class="center">${item.quantity}</td>
      <td class="right">${fmt(item.sellingPrice)} IQD</td>
      <td class="right">${item.discount > 0 ? fmt(item.discount) + ' IQD' : '—'}</td>
      <td class="right bold">${fmt(item.lineTotal)} IQD</td>
    </tr>
  `).join('');

  const customerBlock = (sale.customerName || sale.customerPhone || sale.customerAddress) ? `
    <div class="card">
      <h3 class="card-title">Customer Information</h3>
      ${sale.customerName    ? `<div class="info-row"><span class="label">Name</span><span>${escHtml(sale.customerName)}</span></div>` : ''}
      ${sale.customerPhone   ? `<div class="info-row"><span class="label">Phone</span><span>${escHtml(sale.customerPhone)}</span></div>` : ''}
      ${sale.customerAddress ? `<div class="info-row"><span class="label">Address</span><span>${escHtml(sale.customerAddress)}</span></div>` : ''}
    </div>
  ` : '';

  const warrantyBlock = sale.warranty ? `
    <div class="card">
      <h3 class="card-title">Warranty</h3>
      <p class="notes-text">${escHtml(sale.warranty)}</p>
    </div>
  ` : '';

  const notesBlock = sale.notes ? `
    <div class="card">
      <h3 class="card-title">Notes</h3>
      <p class="notes-text">${escHtml(sale.notes)}</p>
    </div>
  ` : '';

  const debtRow = sale.remainingDebt > 0 ? `
    <div class="total-row debt-row">
      <span>Remaining Debt</span>
      <span class="debt-amount">${fmt(sale.remainingDebt)} IQD</span>
    </div>
  ` : '';

  const paymentBadge = sale.paymentMethod === 'cash'
    ? '<span class="badge badge-green">Cash</span>'
    : sale.paymentMethod === 'fib'
      ? '<span class="badge badge-blue">FIB</span>'
      : '<span class="badge badge-orange">Debt</span>';

  const lang = dir === 'rtl' ? 'ku' : 'en';

  return `<!DOCTYPE html>
<html lang="${lang}" dir="${dir}">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Invoice ${escHtml(sale.invoiceNumber)}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #f8fafc; color: #1e293b; font-size: 14px; }

  .header { background: linear-gradient(135deg, #1E40AF 0%, #3B82F6 100%); color: white; padding: 32px 24px; }
  .header-inner { display: flex; justify-content: space-between; align-items: flex-start; gap: 16px; }
  .business-info h1 { font-size: 22px; font-weight: 700; margin-bottom: 4px; }
  .business-info p { opacity: 0.85; font-size: 13px; line-height: 1.5; }
  .invoice-meta { text-align: ${dir === 'rtl' ? 'left' : 'right'}; }
  .invoice-number { font-size: 18px; font-weight: 700; margin-bottom: 4px; }
  .invoice-date { opacity: 0.85; font-size: 13px; }
  .payment-badge-row { margin-top: 8px; }

  .badge { display: inline-block; padding: 3px 10px; border-radius: 12px; font-size: 12px; font-weight: 600; }
  .badge-green { background: rgba(16,185,129,0.25); color: #d1fae5; border: 1px solid rgba(16,185,129,0.4); }
  .badge-blue  { background: rgba(255,255,255,0.2);  color: white;   border: 1px solid rgba(255,255,255,0.4); }
  .badge-orange{ background: rgba(245,158,11,0.25); color: #fef3c7; border: 1px solid rgba(245,158,11,0.4); }

  .body { padding: 20px 24px; }

  .card { background: white; border-radius: 12px; padding: 16px 20px; margin-bottom: 16px; box-shadow: 0 1px 3px rgba(0,0,0,0.08); }
  .card-title { font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; color: #64748b; margin-bottom: 12px; }

  .info-row { display: flex; justify-content: space-between; padding: 4px 0; font-size: 13px; color: #334155; }
  .label { color: #64748b; }

  table { width: 100%; border-collapse: collapse; }
  th { background: #f1f5f9; color: #475569; font-size: 11px; font-weight: 600; text-transform: uppercase; padding: 10px 8px; }
  td { padding: 10px 8px; font-size: 13px; border-bottom: 1px solid #f1f5f9; vertical-align: middle; }
  .row-odd { background: #fafbfc; }
  .center { text-align: center; }
  .right { text-align: right; }
  .bold { font-weight: 600; }

  .item-name { display: block; font-weight: 500; color: #1e293b; }
  .item-id-badge { display: inline-block; margin-top: 2px; font-size: 11px; color: #3B82F6; background: #eff6ff; padding: 1px 6px; border-radius: 4px; }

  .totals-card { background: white; border-radius: 12px; padding: 16px 20px; margin-bottom: 16px; box-shadow: 0 1px 3px rgba(0,0,0,0.08); }
  .total-row { display: flex; justify-content: space-between; padding: 6px 0; font-size: 14px; color: #475569; }
  .total-row.grand { font-size: 17px; font-weight: 700; color: #1E40AF; border-top: 2px solid #e2e8f0; margin-top: 8px; padding-top: 12px; }
  .total-row.paid { color: #10B981; font-weight: 500; }
  .total-row.debt-row { color: #ef4444; font-weight: 500; }
  .debt-amount { font-weight: 700; }

  .notes-text { color: #475569; font-size: 13px; line-height: 1.6; }

  .footer { text-align: center; padding: 20px 24px; color: #94a3b8; font-size: 12px; }
  .footer strong { color: #64748b; display: block; font-size: 14px; margin-bottom: 4px; }
</style>
</head>
<body>

<div class="header">
  <div class="header-inner">
    <div class="business-info">
      ${logoHTML}
      <h1>${escHtml(business.name || 'Business')}</h1>
      ${business.phone   ? `<p>${escHtml(business.phone)}</p>` : ''}
      ${business.address ? `<p>${escHtml(business.address)}</p>` : ''}
    </div>
    <div class="invoice-meta">
      <div class="invoice-number">${escHtml(sale.invoiceNumber)}</div>
      <div class="invoice-date">${formatDate(sale.createdAt)}</div>
      <div class="payment-badge-row">${paymentBadge}</div>
    </div>
  </div>
</div>

<div class="body">

  ${customerBlock}
  ${warrantyBlock}

  <div class="card">
    <h3 class="card-title">Items</h3>
    <table>
      <thead>
        <tr>
          <th class="center">#</th>
          <th>Item</th>
          <th class="center">Qty</th>
          <th class="right">Price</th>
          <th class="right">Disc</th>
          <th class="right">Total</th>
        </tr>
      </thead>
      <tbody>
        ${itemRows}
      </tbody>
    </table>
  </div>

  <div class="totals-card">
    <div class="total-row">
      <span>Subtotal</span>
      <span>${fmt(sale.subtotal)} IQD</span>
    </div>
    ${sale.discountTotal > 0 ? `
    <div class="total-row">
      <span>Discount</span>
      <span>− ${fmt(sale.discountTotal)} IQD</span>
    </div>` : ''}
    <div class="total-row grand">
      <span>Grand Total</span>
      <span>${fmt(sale.grandTotal)} IQD</span>
    </div>
    ${sale.paidAmount > 0 && sale.paymentMethod === 'debt' ? `
    <div class="total-row paid">
      <span>Paid</span>
      <span>${fmt(sale.paidAmount)} IQD</span>
    </div>` : ''}
    ${debtRow}
  </div>

  ${notesBlock}

</div>

<div class="footer">
  <strong>Thank you for your purchase!</strong>
  Powered by ManagerX
</div>

</body>
</html>`;
}

// ─── Purchase Invoice ─────────────────────────────────────────────────────────

export function buildPurchaseInvoiceHTML(
  purchase: Purchase,
  business: BusinessInfo,
  dir: 'ltr' | 'rtl' = 'ltr'
): string {
  const hasIds = purchase.itemIds.some((v) => v.trim());
  const lang = dir === 'rtl' ? 'ku' : 'en';

  const logoHTML = business.logoUri
    ? `<img src="${business.logoUri}" style="height:52px;object-fit:contain;margin-bottom:8px;display:block;" />`
    : '';

  const idsBlock = hasIds ? (() => {
    if (purchase.idType === 'shared') {
      return `
        <div class="card">
          <h3 class="card-title">Item ID</h3>
          <div class="info-row"><span class="label">Shared ID</span><span>${escHtml(purchase.itemIds[0] ?? '')}</span></div>
        </div>`;
    }
    const chips = purchase.itemIds
      .map((v, i) => `<span class="id-chip">${i + 1}. ${escHtml(v)}</span>`)
      .join('');
    return `
      <div class="card">
        <h3 class="card-title">Item IDs (${purchase.itemIds.length})</h3>
        <div class="chips-wrap">${chips}</div>
      </div>`;
  })() : '';

  const supplierBlock = (purchase.supplierName || purchase.supplierPhone || purchase.supplierAddress) ? `
    <div class="card">
      <h3 class="card-title">Supplier</h3>
      ${purchase.supplierName    ? `<div class="info-row"><span class="label">Name</span><span>${escHtml(purchase.supplierName)}</span></div>` : ''}
      ${purchase.supplierPhone   ? `<div class="info-row"><span class="label">Phone</span><span>${escHtml(purchase.supplierPhone)}</span></div>` : ''}
      ${purchase.supplierAddress ? `<div class="info-row"><span class="label">Address</span><span>${escHtml(purchase.supplierAddress)}</span></div>` : ''}
    </div>` : '';

  const additionalRows = [
    purchase.warranty    ? `<div class="info-row"><span class="label">Warranty</span><span>${escHtml(purchase.warranty)}</span></div>` : '',
    purchase.description ? `<div class="info-row"><span class="label">Description</span><span>${escHtml(purchase.description)}</span></div>` : '',
    purchase.notes       ? `<div class="info-row"><span class="label">Notes</span><span>${escHtml(purchase.notes)}</span></div>` : '',
  ].filter(Boolean).join('');

  const additionalBlock = additionalRows ? `
    <div class="card">
      <h3 class="card-title">Additional Info</h3>
      ${additionalRows}
    </div>` : '';

  const statusBadge = purchase.paymentStatus === 'paid'
    ? '<span class="badge badge-green">Paid</span>'
    : '<span class="badge badge-orange">Debt</span>';

  return `<!DOCTYPE html>
<html lang="${lang}" dir="${dir}">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Purchase Invoice ${escHtml(purchase.purchaseNumber)}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #f8fafc; color: #1e293b; font-size: 14px; }
  .header { background: linear-gradient(135deg, #1E40AF 0%, #3B82F6 100%); color: white; padding: 32px 24px; }
  .header-inner { display: flex; justify-content: space-between; align-items: flex-start; gap: 16px; }
  .business-info h1 { font-size: 22px; font-weight: 700; margin-bottom: 4px; }
  .business-info p { opacity: 0.85; font-size: 13px; line-height: 1.5; }
  .invoice-meta { text-align: ${dir === 'rtl' ? 'left' : 'right'}; }
  .invoice-number { font-size: 18px; font-weight: 700; margin-bottom: 4px; }
  .invoice-date { opacity: 0.85; font-size: 13px; margin-bottom: 8px; }
  .badge { display: inline-block; padding: 3px 10px; border-radius: 12px; font-size: 12px; font-weight: 600; }
  .badge-green  { background: rgba(16,185,129,0.25); color: #d1fae5; border: 1px solid rgba(16,185,129,0.4); }
  .badge-orange { background: rgba(245,158,11,0.25); color: #fef3c7; border: 1px solid rgba(245,158,11,0.4); }
  .body { padding: 20px 24px; }
  .card { background: white; border-radius: 12px; padding: 16px 20px; margin-bottom: 16px; box-shadow: 0 1px 3px rgba(0,0,0,0.08); }
  .card-title { font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; color: #64748b; margin-bottom: 12px; }
  .info-row { display: flex; justify-content: space-between; padding: 5px 0; font-size: 13px; color: #334155; border-bottom: 1px solid #f8fafc; }
  .info-row:last-child { border-bottom: none; }
  .label { color: #64748b; }
  .total-box { background: linear-gradient(135deg, #eff6ff, #dbeafe); border: 2px solid #bfdbfe; border-radius: 12px; padding: 20px; text-align: center; margin-bottom: 16px; }
  .total-amount { font-size: 28px; font-weight: 800; color: #1E40AF; }
  .total-meta { font-size: 13px; color: #64748b; margin-top: 6px; }
  .chips-wrap { display: flex; flex-wrap: wrap; gap: 6px; padding-top: 4px; }
  .id-chip { background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 6px; padding: 4px 10px; font-size: 13px; font-weight: 600; color: #1E40AF; }
  .footer { text-align: center; padding: 20px 24px; color: #94a3b8; font-size: 12px; }
  .footer strong { color: #64748b; display: block; font-size: 14px; margin-bottom: 4px; }
</style>
</head>
<body>

<div class="header">
  <div class="header-inner">
    <div class="business-info">
      ${logoHTML}
      <h1>${escHtml(business.name || 'Business')}</h1>
      ${business.phone   ? `<p>${escHtml(business.phone)}</p>` : ''}
      ${business.address ? `<p>${escHtml(business.address)}</p>` : ''}
    </div>
    <div class="invoice-meta">
      <div class="invoice-number">${escHtml(purchase.purchaseNumber)}</div>
      <div class="invoice-date">${formatDate(purchase.date)}</div>
      ${statusBadge}
    </div>
  </div>
</div>

<div class="body">

  ${supplierBlock}

  <div class="card">
    <h3 class="card-title">Product</h3>
    <div class="info-row"><span class="label">Product Name</span><span>${escHtml(purchase.productName)}</span></div>
    ${purchase.category ? `<div class="info-row"><span class="label">Category</span><span>${escHtml(purchase.category)}</span></div>` : ''}
    <div class="info-row"><span class="label">Quantity</span><span>${purchase.quantity}</span></div>
    <div class="info-row"><span class="label">Purchase Price (IQD)</span><span>${fmt(purchase.buyPriceIQD)} IQD</span></div>
    <div class="info-row"><span class="label">Purchase Price (USD)</span><span>$${purchase.buyPriceUSD.toFixed(2)}</span></div>
    <div class="info-row"><span class="label">Exchange Rate</span><span>1 USD = ${fmt(purchase.exchangeRate)} IQD</span></div>
    ${purchase.warranty ? `<div class="info-row"><span class="label">Warranty</span><span>${escHtml(purchase.warranty)}</span></div>` : ''}
  </div>

  ${idsBlock}

  <div class="total-box">
    <div class="total-amount">${fmt(purchase.totalIQD)} IQD</div>
    <div class="total-meta">Grand Total &nbsp;|&nbsp; ${escHtml(purchase.purchaseNumber)} &nbsp;|&nbsp; ${formatDate(purchase.date)}</div>
  </div>

  ${additionalBlock}

</div>

<div class="footer">
  <strong>Purchase Invoice</strong>
  Powered by ManagerX
</div>

</body>
</html>`;
}
