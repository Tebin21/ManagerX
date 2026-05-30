import type { CustomerWithStats } from '@/types/customers';
import type { Sale, Debt } from '@/types/sales';

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

function fmt(n: number) {
  return n.toLocaleString('en-US');
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

function statusBadge(status: string) {
  const color = status === 'settled' ? '#059669' : '#D97706';
  const bg    = status === 'settled' ? '#D1FAE5' : '#FEF3C7';
  const label = status === 'settled' ? 'Settled' : 'Active';
  return `<span style="background:${bg};color:${color};font-size:11px;font-weight:700;padding:2px 8px;border-radius:6px;">${label}</span>`;
}

export function buildCustomerReportHTML(
  customer: CustomerWithStats,
  sales: Sale[],
  debts: Debt[],
  business: BusinessInfo,
  dir: 'ltr' | 'rtl' = 'ltr'
): string {
  const lang = dir === 'rtl' ? 'ku' : 'en';
  const now = new Date().toLocaleString('en-US', {
    year: 'numeric', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
  const memberSince = fmtDate(customer.createdAt);
  const activeDebts = debts.filter((d) => d.status === 'active' && d.remainingAmount > 0);

  // ── Debt rows ──────────────────────────────────────────────────────────────
  const debtRows = activeDebts.length === 0
    ? `<tr><td colspan="5" style="text-align:center;color:#9CA3AF;padding:16px;">No outstanding debts</td></tr>`
    : activeDebts.map((d) => {
        const sale = sales.find((s) => s.id === d.saleId);
        return `
          <tr>
            <td>${sale?.invoiceNumber ? escHtml(sale.invoiceNumber) : '&mdash;'}</td>
            <td style="text-align:right">${fmt(d.originalAmount)} IQD</td>
            <td style="text-align:right">${fmt(d.paidAmount)} IQD</td>
            <td style="text-align:right;color:#DC2626;font-weight:700">${fmt(d.remainingAmount)} IQD</td>
            <td style="text-align:center">${statusBadge(d.status)}</td>
          </tr>`;
      }).join('');

  // ── Purchase rows ──────────────────────────────────────────────────────────
  const purchaseRows = sales.length === 0
    ? `<tr><td colspan="6" style="text-align:center;color:#9CA3AF;padding:16px;">No purchases recorded</td></tr>`
    : sales.map((s) => {
        const itemNames = (s.items ?? []).map((i) => escHtml(i.productName)).join(', ') || '&mdash;';
        const debt = debts.find((d) => d.saleId === s.id);
        const remaining = debt ? debt.remainingAmount : 0;
        return `
          <tr>
            <td>${fmtDate(s.createdAt)}</td>
            <td style="font-weight:700">${escHtml(s.invoiceNumber)}</td>
            <td style="color:#6B7280;font-size:12px;max-width:180px">${itemNames}</td>
            <td style="text-align:right">${fmt(s.grandTotal)} IQD</td>
            <td style="text-align:right;color:#059669">${fmt(s.paidAmount)} IQD</td>
            <td style="text-align:right;color:${remaining > 0 ? '#DC2626' : '#059669'};font-weight:${remaining > 0 ? '700' : '400'}">${remaining > 0 ? fmt(remaining) + ' IQD' : '&mdash;'}</td>
          </tr>`;
      }).join('');

  return `<!DOCTYPE html>
<html lang="${lang}" dir="${dir}">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1.0"/>
<title>Customer Report &mdash; ${escHtml(customer.name)}</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: -apple-system, 'Helvetica Neue', Arial, sans-serif; background: #F9FAFB; color: #111827; font-size: 13px; }
  .page { max-width: 720px; margin: 0 auto; background: #fff; }

  /* Header */
  .header { background: linear-gradient(135deg, #1E40AF, #3B82F6); color: #fff; padding: 28px 32px; }
  .header-top { display: flex; justify-content: space-between; align-items: flex-start; }
  .biz-name { font-size: 20px; font-weight: 800; letter-spacing: -0.3px; }
  .biz-sub  { font-size: 12px; opacity: 0.8; margin-top: 3px; }
  .report-badge { background: rgba(255,255,255,0.2); border-radius: 10px; padding: 6px 14px; font-size: 12px; font-weight: 700; }
  .header-date { font-size: 11px; opacity: 0.7; margin-top: 6px; }

  /* Customer info */
  .customer-section { padding: 24px 32px; border-bottom: 1px solid #E5E7EB; }
  .section-label { font-size: 10px; font-weight: 700; color: #9CA3AF; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 12px; }
  .customer-name { font-size: 22px; font-weight: 800; color: #111827; margin-bottom: 6px; }
  .info-row { display: flex; gap: 24px; flex-wrap: wrap; margin-top: 4px; }
  .info-item { display: flex; align-items: center; gap: 5px; font-size: 13px; color: #374151; }
  .info-icon { color: #6B7280; font-size: 12px; }

  /* Stats */
  .stats-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 0; border-bottom: 1px solid #E5E7EB; }
  .stat-box { padding: 18px 20px; border-right: 1px solid #E5E7EB; }
  .stat-box:last-child { border-right: none; }
  .stat-val { font-size: 18px; font-weight: 800; color: #111827; }
  .stat-val.debt { color: #DC2626; }
  .stat-label { font-size: 10px; color: #9CA3AF; font-weight: 600; margin-top: 3px; text-transform: uppercase; letter-spacing: 0.5px; }

  /* Tables */
  .section { padding: 24px 32px; border-bottom: 1px solid #E5E7EB; }
  table { width: 100%; border-collapse: collapse; }
  th { background: #F3F4F6; font-size: 10px; font-weight: 700; color: #6B7280; text-transform: uppercase; letter-spacing: 0.5px; padding: 8px 10px; text-align: left; }
  td { padding: 10px 10px; border-bottom: 1px solid #F3F4F6; font-size: 12px; color: #374151; vertical-align: middle; }
  tr:last-child td { border-bottom: none; }

  /* Notes */
  .notes-box { background: #F9FAFB; border-radius: 10px; padding: 14px 16px; font-size: 13px; color: #374151; line-height: 1.6; }

  /* Footer */
  .footer { padding: 16px 32px; background: #F9FAFB; text-align: center; font-size: 11px; color: #9CA3AF; }
</style>
</head>
<body>
<div class="page">

  <!-- Header -->
  <div class="header">
    <div class="header-top">
      <div>
        <div class="biz-name">${escHtml(business.name)}</div>
        ${business.phone ? `<div class="biz-sub">${escHtml(business.phone)}${business.address ? ' &middot; ' + escHtml(business.address) : ''}</div>` : ''}
      </div>
      <div class="report-badge">Customer Report</div>
    </div>
    <div class="header-date">Generated: ${now}</div>
  </div>

  <!-- Customer Info -->
  <div class="customer-section">
    <div class="section-label">Customer</div>
    <div class="customer-name">${escHtml(customer.name)}</div>
    <div class="info-row">
      ${customer.phone   ? `<div class="info-item"><span class="info-icon">&#9742;</span>${escHtml(customer.phone)}</div>` : ''}
      ${customer.address ? `<div class="info-item"><span class="info-icon">&#9679;</span>${escHtml(customer.address)}</div>` : ''}
      <div class="info-item"><span class="info-icon">&#128197;</span>Member since ${memberSince}</div>
    </div>
  </div>

  <!-- Stats -->
  <div class="stats-grid">
    <div class="stat-box">
      <div class="stat-val">${fmt(customer.totalPurchases)}</div>
      <div class="stat-label">Total Spent (IQD)</div>
    </div>
    <div class="stat-box">
      <div class="stat-val">${customer.saleCount}</div>
      <div class="stat-label">Total Invoices</div>
    </div>
    <div class="stat-box">
      <div class="stat-val ${customer.remainingDebt > 0 ? 'debt' : ''}">${fmt(customer.remainingDebt)}</div>
      <div class="stat-label">Remaining Debt (IQD)</div>
    </div>
    <div class="stat-box">
      <div class="stat-val">${memberSince}</div>
      <div class="stat-label">Member Since</div>
    </div>
  </div>

  <!-- Active Debts -->
  <div class="section">
    <div class="section-label">Outstanding Debts</div>
    <table>
      <thead>
        <tr>
          <th>Invoice</th>
          <th style="text-align:right">Original</th>
          <th style="text-align:right">Paid</th>
          <th style="text-align:right">Remaining</th>
          <th style="text-align:center">Status</th>
        </tr>
      </thead>
      <tbody>${debtRows}</tbody>
    </table>
  </div>

  <!-- Purchase History -->
  <div class="section">
    <div class="section-label">Purchase History (${sales.length} invoices)</div>
    <table>
      <thead>
        <tr>
          <th>Date</th>
          <th>Invoice</th>
          <th>Items</th>
          <th style="text-align:right">Total</th>
          <th style="text-align:right">Paid</th>
          <th style="text-align:right">Remaining</th>
        </tr>
      </thead>
      <tbody>${purchaseRows}</tbody>
    </table>
  </div>

  ${customer.notes ? `
  <!-- Notes -->
  <div class="section">
    <div class="section-label">Notes</div>
    <div class="notes-box">${escHtml(customer.notes)}</div>
  </div>` : ''}

  <!-- Footer -->
  <div class="footer">
    ${escHtml(business.name)} &nbsp;&middot;&nbsp; Customer Report &nbsp;&middot;&nbsp; ${now}
  </div>

</div>
</body>
</html>`;
}
