import type { SupplierWithStats } from '@/types/suppliers';
import type { Purchase } from '@/types/purchases';
import type { PurchaseDebt } from '@/types/debt';
import { fmtIQD, fmtUSD, fmtPct, formatDate as fmtDate, formatDateTime as fmtDateTime } from '@/utils/formatters';

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


function statusBadge(status: string): string {
  const settled = status === 'settled';
  return `<span style="background:${settled ? '#DCFCE7' : '#FEF3C7'};color:${settled ? '#059669' : '#D97706'};font-size:11px;font-weight:700;padding:3px 10px;border-radius:20px;border:1px solid ${settled ? '#BBF7D0' : '#FDE68A'};">${settled ? 'Settled' : 'Active'}</span>`;
}

function paymentBadge(status: string): string {
  const paid = status === 'paid';
  return `<span style="background:${paid ? '#DCFCE7' : '#FEF3C7'};color:${paid ? '#059669' : '#D97706'};font-size:11px;font-weight:700;padding:3px 10px;border-radius:20px;border:1px solid ${paid ? '#BBF7D0' : '#FDE68A'};">${paid ? 'Paid' : 'Debt'}</span>`;
}

export function buildSupplierReportHTML(
  supplier: SupplierWithStats,
  purchases: Purchase[],
  debts: PurchaseDebt[],
  business: BusinessInfo,
  dir: 'ltr' | 'rtl' = 'ltr'
): string {
  const lang = 'en';
  const now = fmtDateTime(new Date().toISOString());
  const memberSince = fmtDate(supplier.createdAt);
  const activeDebts = debts.filter((d) => d.status === 'active' && d.remainingAmount > 0);
  const totalSpent = purchases.reduce((sum, p) => sum + p.totalIQD, 0);
  const totalPaid = debts.reduce((sum, d) => sum + d.paidAmount, 0);
  const totalRemaining = activeDebts.reduce((sum, d) => sum + d.remainingAmount, 0);

  const logoHTML = business.logoUri
    ? `<img src="${business.logoUri}" style="height:60px;max-width:160px;object-fit:contain;display:block;background:white;border-radius:8px;padding:4px;margin-bottom:10px;" alt="logo" />`
    : '';

  const debtRows = activeDebts.length === 0
    ? `<tr><td colspan="5" style="text-align:center;color:#94A3B8;padding:18px;font-style:italic;">No outstanding debts</td></tr>`
    : activeDebts.map((d) => `
        <tr>
          <td style="font-weight:600;">${d.purchaseNumber ? escHtml(d.purchaseNumber) : '&mdash;'}</td>
          <td style="text-align:right;">${fmtIQD(d.originalAmount)} IQD</td>
          <td style="text-align:right;color:#059669;font-weight:600;">${fmtIQD(d.paidAmount)} IQD</td>
          <td style="text-align:right;color:#DC2626;font-weight:700;">${fmtIQD(d.remainingAmount)} IQD</td>
          <td style="text-align:center;">${statusBadge(d.status)}</td>
        </tr>`).join('');

  const purchaseRows = purchases.length === 0
    ? `<tr><td colspan="6" style="text-align:center;color:#94A3B8;padding:18px;font-style:italic;">No purchases recorded</td></tr>`
    : purchases.map((p) => `
        <tr>
          <td style="color:#64748B;">${fmtDate(p.date || p.createdAt)}</td>
          <td style="font-weight:700;color:#1E40AF;">${escHtml(p.purchaseNumber)}</td>
          <td style="color:#334155;font-size:12px;max-width:180px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${escHtml(p.productName)}</td>
          <td style="text-align:right;">${p.quantity}</td>
          <td style="text-align:right;font-weight:600;">${fmtIQD(p.totalIQD)} IQD</td>
          <td style="text-align:center;">${paymentBadge(p.paymentStatus)}</td>
        </tr>`).join('');

  return `<!DOCTYPE html>
<html lang="${lang}" dir="${dir}">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1.0"/>
<title>Supplier Report &mdash; ${escHtml(supplier.name)}</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    direction: ltr;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif;
    background: #F0F4F8;
    color: #1E293B;
    font-size: 13.5px;
    line-height: 1.5;
  }
  .page { max-width: 720px; margin: 0 auto; background: #fff; }

  .header {
    background: linear-gradient(135deg, #1E3A8A 0%, #2563EB 60%, #3B82F6 100%);
    color: #fff;
    padding: 36px 32px 28px;
  }
  .header-top { display: flex; justify-content: space-between; align-items: flex-start; gap: 16px; margin-bottom: 16px; }
  .biz-name { font-size: 21px; font-weight: 800; letter-spacing: -0.3px; }
  .biz-sub  { font-size: 12.5px; opacity: 0.82; margin-top: 3px; line-height: 1.5; }
  .report-badge {
    background: rgba(255,255,255,0.18);
    border: 1px solid rgba(255,255,255,0.3);
    border-radius: 20px;
    padding: 5px 14px;
    font-size: 12px;
    font-weight: 700;
    white-space: nowrap;
  }
  .header-date { font-size: 11px; opacity: 0.72; }
  .header-divider { border: none; border-top: 1px solid rgba(255,255,255,0.2); margin-top: 16px; }

  .supplier-section { padding: 24px 32px; border-bottom: 1px solid #F1F5F9; }
  .section-label {
    font-size: 10.5px; font-weight: 700;
    color: #94A3B8; text-transform: uppercase;
    letter-spacing: 0.8px; margin-bottom: 12px;
    padding-bottom: 8px; border-bottom: 1px solid #F1F5F9;
  }
  .supplier-name { font-size: 23px; font-weight: 800; color: #0F172A; margin-bottom: 8px; letter-spacing: -0.3px; }
  .info-row { display: flex; gap: 20px; flex-wrap: wrap; }
  .info-item { display: flex; align-items: center; gap: 5px; font-size: 13px; color: #475569; }

  .stats-grid { display: grid; grid-template-columns: repeat(4, 1fr); border-bottom: 1px solid #F1F5F9; }
  .stat-box { padding: 18px 16px; border-right: 1px solid #F1F5F9; }
  .stat-box:last-child { border-right: none; }
  .stat-val { font-size: 17px; font-weight: 800; color: #0F172A; word-break: break-word; }
  .stat-val.debt { color: #DC2626; }
  .stat-lbl { font-size: 10px; color: #94A3B8; font-weight: 700; margin-top: 4px; text-transform: uppercase; letter-spacing: 0.6px; }

  .section { padding: 22px 32px; border-bottom: 1px solid #F1F5F9; }
  .section:last-child { border-bottom: none; }

  .table-wrap { border-radius: 8px; overflow: hidden; border: 1px solid #E2E8F0; }
  table { width: 100%; border-collapse: collapse; }
  th {
    background: #F1F5F9; padding: 10px 10px;
    text-align: left; font-size: 10.5px;
    font-weight: 700; color: #64748B;
    text-transform: uppercase; letter-spacing: 0.5px;
    border-bottom: 1px solid #E2E8F0;
  }
  td { padding: 10px 10px; border-bottom: 1px solid #F1F5F9; font-size: 12.5px; color: #334155; vertical-align: middle; }
  tr:last-child td { border-bottom: none; }

  .notes-box {
    background: #F8FAFC;
    border: 1px solid #E8EEF4;
    border-radius: 10px;
    padding: 14px 16px;
    font-size: 13px;
    color: #475569;
    line-height: 1.65;
  }

  .footer {
    padding: 18px 32px 22px;
    background: #F8FAFC;
    text-align: center;
    font-size: 11.5px;
    color: #94A3B8;
    border-top: 1px solid #E2E8F0;
  }

  @media print {
    body { background: white; }
    .page { max-width: 100%; }
    .stats-grid { border: 1px solid #ddd; }
  }
</style>
</head>
<body>
<div class="page">

  <div class="header">
    <div class="header-top">
      <div>
        ${logoHTML}
        <div class="biz-name">${escHtml(business.name || 'Business')}</div>
        <div class="biz-sub">
          ${business.phone ? escHtml(business.phone) : ''}
          ${business.phone && business.address ? ' &middot; ' : ''}
          ${business.address ? escHtml(business.address) : ''}
        </div>
      </div>
      <div style="text-align:${dir === 'rtl' ? 'left' : 'right'};">
        <div class="report-badge">Supplier Report</div>
        <div class="header-date" style="margin-top:6px;">Generated: ${now}</div>
      </div>
    </div>
    <hr class="header-divider" />
  </div>

  <div class="supplier-section">
    <div class="section-label">Supplier</div>
    <div class="supplier-name">${escHtml(supplier.name)}</div>
    <div class="info-row">
      ${supplier.phone   ? `<div class="info-item">&#128222; ${escHtml(supplier.phone)}</div>` : ''}
      ${supplier.address ? `<div class="info-item">&#128205; ${escHtml(supplier.address)}</div>` : ''}
      <div class="info-item">&#128197; Since ${memberSince}</div>
    </div>
  </div>

  <div class="stats-grid">
    <div class="stat-box">
      <div class="stat-val">${fmtIQD(totalSpent)}</div>
      <div class="stat-lbl">Total Spent (IQD)</div>
    </div>
    <div class="stat-box">
      <div class="stat-val">${purchases.length}</div>
      <div class="stat-lbl">Total Purchases</div>
    </div>
    <div class="stat-box">
      <div class="stat-val ${totalRemaining > 0 ? 'debt' : ''}">${fmtIQD(totalRemaining)}</div>
      <div class="stat-lbl">Remaining Debt (IQD)</div>
    </div>
    <div class="stat-box">
      <div class="stat-val" style="color:#059669;">${fmtIQD(totalPaid)}</div>
      <div class="stat-lbl">Total Paid (IQD)</div>
    </div>
  </div>

  <div class="section">
    <div class="section-label">Outstanding Debts (${activeDebts.length})</div>
    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Purchase #</th>
            <th style="text-align:right;">Original</th>
            <th style="text-align:right;">Paid</th>
            <th style="text-align:right;">Remaining</th>
            <th style="text-align:center;">Status</th>
          </tr>
        </thead>
        <tbody>${debtRows}</tbody>
      </table>
    </div>
  </div>

  <div class="section">
    <div class="section-label">Purchase History (${purchases.length} purchase${purchases.length !== 1 ? 's' : ''})</div>
    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Date</th>
            <th>Purchase #</th>
            <th>Product</th>
            <th style="text-align:right;">Qty</th>
            <th style="text-align:right;">Total</th>
            <th style="text-align:center;">Status</th>
          </tr>
        </thead>
        <tbody>${purchaseRows}</tbody>
      </table>
    </div>
  </div>

  ${supplier.notes ? `
  <div class="section">
    <div class="section-label">Notes</div>
    <div class="notes-box">${escHtml(supplier.notes)}</div>
  </div>` : ''}

  <div class="footer">
    <strong>${escHtml(business.name)}</strong> &middot; Supplier Report &middot; ${now}
  </div>

</div>
</body>
</html>`;
}
