import type { SalesDebtDetail, PurchaseDebt, DebtPayment } from '@/types/debt';

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

function fmt(n: number): string {
  return n.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  });
}

function formatDateTime(dateStr: string): string {
  return new Date(dateStr).toLocaleString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: 'numeric', minute: '2-digit',
  });
}

function pctPaid(paid: number, original: number): string {
  if (original <= 0) return '0%';
  return `${Math.round((paid / original) * 100)}%`;
}

// ─── Sales Debt Report ────────────────────────────────────────────────────────

export function buildSalesDebtReportHTML(
  debt: SalesDebtDetail,
  payments: DebtPayment[],
  business: BusinessInfo,
  dir: 'ltr' | 'rtl' = 'ltr'
): string {
  const lang = dir === 'rtl' ? 'ku' : 'en';

  const logoHTML = business.logoUri
    ? `<img src="${business.logoUri}" style="height:60px;object-fit:contain;" />`
    : '';

  const paymentsRows = payments.length === 0
    ? `<tr><td colspan="3" style="text-align:center;color:#9CA3AF;padding:16px;">No payments recorded yet</td></tr>`
    : payments.map((p) => `
        <tr>
          <td>${formatDateTime(p.createdAt)}</td>
          <td style="color:#16A34A;font-weight:700;">+${fmt(p.amount)} IQD</td>
          <td style="color:#1E40AF;">${fmt(p.remainingAfter)} IQD</td>
        </tr>
      `).join('');

  const statusColor_ = debt.remainingAmount <= 0 ? '#16A34A' : '#DC2626';
  const statusLabel  = debt.remainingAmount <= 0 ? 'SETTLED' : 'ACTIVE';

  return `<!DOCTYPE html>
<html lang="${lang}" dir="${dir}">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, 'Helvetica Neue', Arial, sans-serif; background: #F9FAFB; color: #111827; }
    .page { max-width: 680px; margin: 0 auto; background: #fff; }

    .header { background: linear-gradient(135deg, #1E40AF 0%, #3B82F6 100%); color: white; padding: 32px 28px 24px; }
    .header-top { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 20px; }
    .biz-name { font-size: 22px; font-weight: 800; }
    .biz-sub { font-size: 13px; opacity: 0.8; margin-top: 3px; }
    .report-title { font-size: 13px; font-weight: 700; opacity: 0.85; background: rgba(255,255,255,0.15); padding: 4px 12px; border-radius: 20px; text-align: ${dir === 'rtl' ? 'left' : 'right'}; }
    .report-date { font-size: 11px; opacity: 0.7; margin-top: 4px; text-align: ${dir === 'rtl' ? 'left' : 'right'}; }

    .party-box { background: rgba(255,255,255,0.12); border-radius: 12px; padding: 16px; }
    .party-name { font-size: 18px; font-weight: 800; margin-bottom: 6px; }
    .party-meta { display: flex; gap: 16px; flex-wrap: wrap; }
    .party-meta span { font-size: 12px; opacity: 0.85; }

    .section { padding: 20px 28px; border-bottom: 1px solid #F3F4F6; }
    .section-title { font-size: 13px; font-weight: 700; color: #6B7280; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 14px; }

    .status-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; }
    .stat-cell { background: #F9FAFB; border-radius: 10px; padding: 12px; text-align: center; }
    .stat-label { font-size: 11px; color: #9CA3AF; margin-bottom: 4px; }
    .stat-value { font-size: 17px; font-weight: 800; color: #111827; }
    .stat-value.green { color: #16A34A; }
    .stat-value.red { color: #DC2626; }
    .stat-value.blue { color: #1E40AF; }

    .status-pill { display: inline-block; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 700; margin-top: 8px; }

    .progress-bar-bg { background: #E5E7EB; border-radius: 6px; height: 10px; margin: 12px 0 4px; }
    .progress-bar-fill { background: #1E40AF; border-radius: 6px; height: 10px; }
    .progress-label { font-size: 12px; color: #6B7280; }

    table { width: 100%; border-collapse: collapse; }
    th { background: #F9FAFB; padding: 10px 14px; text-align: left; font-size: 12px; font-weight: 700; color: #6B7280; }
    td { padding: 10px 14px; font-size: 13px; border-bottom: 1px solid #F3F4F6; }
    tr:last-child td { border-bottom: none; }

    .footer { padding: 20px 28px; text-align: center; background: #F9FAFB; }
    .footer p { font-size: 11px; color: #9CA3AF; }
  </style>
</head>
<body>
<div class="page">

  <!-- Header -->
  <div class="header">
    <div class="header-top">
      <div>
        ${logoHTML}
        <div class="biz-name">${escHtml(business.name)}</div>
        <div class="biz-sub">${escHtml(business.phone)}${business.address ? ' &middot; ' + escHtml(business.address) : ''}</div>
      </div>
      <div>
        <div class="report-title">DEBT REPORT</div>
        <div class="report-date">Generated ${formatDate(new Date().toISOString())}</div>
      </div>
    </div>
    <div class="party-box">
      <div class="party-name">${escHtml(debt.customerName)}</div>
      <div class="party-meta">
        ${debt.customerPhone   ? `<span>Ph: ${escHtml(debt.customerPhone)}</span>` : ''}
        ${debt.customerAddress ? `<span>Addr: ${escHtml(debt.customerAddress)}</span>` : ''}
        <span>Invoice: ${escHtml(debt.invoiceNumber)}</span>
      </div>
    </div>
  </div>

  <!-- Summary -->
  <div class="section">
    <div class="section-title">Debt Summary</div>
    <div class="status-grid">
      <div class="stat-cell">
        <div class="stat-label">Original Amount</div>
        <div class="stat-value blue">${fmt(debt.originalAmount)} IQD</div>
      </div>
      <div class="stat-cell">
        <div class="stat-label">Total Paid</div>
        <div class="stat-value green">${fmt(debt.paidAmount)} IQD</div>
      </div>
      <div class="stat-cell">
        <div class="stat-label">Remaining</div>
        <div class="stat-value ${debt.remainingAmount > 0 ? 'red' : 'green'}">${fmt(debt.remainingAmount)} IQD</div>
      </div>
    </div>
    <div class="progress-bar-bg">
      <div class="progress-bar-fill" style="width:${pctPaid(debt.paidAmount, debt.originalAmount)};background:${debt.remainingAmount <= 0 ? '#16A34A' : '#1E40AF'};"></div>
    </div>
    <div class="progress-label">${pctPaid(debt.paidAmount, debt.originalAmount)} paid</div>
    <div style="margin-top:8px;">
      <span class="status-pill" style="background:${debt.remainingAmount <= 0 ? '#D1FAE5' : '#FEE2E2'};color:${statusColor_};">${statusLabel}</span>
    </div>
  </div>

  <!-- Invoice info -->
  <div class="section">
    <div class="section-title">Invoice Details</div>
    <table>
      <tr><td style="color:#6B7280;width:140px;">Invoice #</td><td style="font-weight:700;">${escHtml(debt.invoiceNumber)}</td></tr>
      <tr><td style="color:#6B7280;">Date</td><td>${formatDate(debt.createdAt)}</td></tr>
      ${debt.warranty  ? `<tr><td style="color:#6B7280;">Warranty</td><td>${escHtml(debt.warranty)}</td></tr>` : ''}
      ${debt.saleNotes ? `<tr><td style="color:#6B7280;">Notes</td><td>${escHtml(debt.saleNotes)}</td></tr>` : ''}
    </table>
  </div>

  <!-- Payment history -->
  <div class="section">
    <div class="section-title">Payment History (${payments.length} payment${payments.length !== 1 ? 's' : ''})</div>
    <table>
      <thead>
        <tr>
          <th>Date &amp; Time</th>
          <th>Amount Paid</th>
          <th>Remaining After</th>
        </tr>
      </thead>
      <tbody>
        ${paymentsRows}
      </tbody>
    </table>
  </div>

  <!-- Footer -->
  <div class="footer">
    <p>Generated by ${escHtml(business.name)} &middot; ManagerX &middot; ${formatDateTime(new Date().toISOString())}</p>
  </div>

</div>
</body>
</html>`;
}

// ─── Purchase Debt Report ─────────────────────────────────────────────────────

export function buildPurchaseDebtReportHTML(
  debt: PurchaseDebt,
  payments: DebtPayment[],
  business: BusinessInfo,
  dir: 'ltr' | 'rtl' = 'ltr'
): string {
  const lang = dir === 'rtl' ? 'ku' : 'en';

  const logoHTML = business.logoUri
    ? `<img src="${business.logoUri}" style="height:60px;object-fit:contain;" />`
    : '';

  const paymentsRows = payments.length === 0
    ? `<tr><td colspan="3" style="text-align:center;color:#9CA3AF;padding:16px;">No payments recorded yet</td></tr>`
    : payments.map((p) => `
        <tr>
          <td>${formatDateTime(p.createdAt)}</td>
          <td style="color:#16A34A;font-weight:700;">+${fmt(p.amount)} IQD</td>
          <td style="color:#DC2626;">${fmt(p.remainingAfter)} IQD</td>
        </tr>
      `).join('');

  const statusLabel = debt.remainingAmount <= 0 ? 'SETTLED' : 'ACTIVE';

  return `<!DOCTYPE html>
<html lang="${lang}" dir="${dir}">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, 'Helvetica Neue', Arial, sans-serif; background: #F9FAFB; color: #111827; }
    .page { max-width: 680px; margin: 0 auto; background: #fff; }

    .header { background: linear-gradient(135deg, #7F1D1D 0%, #DC2626 100%); color: white; padding: 32px 28px 24px; }
    .header-top { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 20px; }
    .biz-name { font-size: 22px; font-weight: 800; }
    .biz-sub { font-size: 13px; opacity: 0.8; margin-top: 3px; }
    .report-title { font-size: 13px; font-weight: 700; opacity: 0.85; background: rgba(255,255,255,0.15); padding: 4px 12px; border-radius: 20px; text-align: ${dir === 'rtl' ? 'left' : 'right'}; }
    .report-date { font-size: 11px; opacity: 0.7; margin-top: 4px; text-align: ${dir === 'rtl' ? 'left' : 'right'}; }

    .party-box { background: rgba(255,255,255,0.12); border-radius: 12px; padding: 16px; }
    .party-name { font-size: 18px; font-weight: 800; margin-bottom: 6px; }
    .party-meta { display: flex; gap: 16px; flex-wrap: wrap; }
    .party-meta span { font-size: 12px; opacity: 0.85; }

    .section { padding: 20px 28px; border-bottom: 1px solid #F3F4F6; }
    .section-title { font-size: 13px; font-weight: 700; color: #6B7280; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 14px; }

    .status-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; }
    .stat-cell { background: #F9FAFB; border-radius: 10px; padding: 12px; text-align: center; }
    .stat-label { font-size: 11px; color: #9CA3AF; margin-bottom: 4px; }
    .stat-value { font-size: 17px; font-weight: 800; color: #111827; }
    .stat-value.green { color: #16A34A; }
    .stat-value.red { color: #DC2626; }

    .status-pill { display: inline-block; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 700; margin-top: 8px; }

    .progress-bar-bg { background: #E5E7EB; border-radius: 6px; height: 10px; margin: 12px 0 4px; }
    .progress-bar-fill { border-radius: 6px; height: 10px; }
    .progress-label { font-size: 12px; color: #6B7280; }

    table { width: 100%; border-collapse: collapse; }
    th { background: #F9FAFB; padding: 10px 14px; text-align: left; font-size: 12px; font-weight: 700; color: #6B7280; }
    td { padding: 10px 14px; font-size: 13px; border-bottom: 1px solid #F3F4F6; }
    tr:last-child td { border-bottom: none; }

    .footer { padding: 20px 28px; text-align: center; background: #F9FAFB; }
    .footer p { font-size: 11px; color: #9CA3AF; }
  </style>
</head>
<body>
<div class="page">

  <!-- Header -->
  <div class="header">
    <div class="header-top">
      <div>
        ${logoHTML}
        <div class="biz-name">${escHtml(business.name)}</div>
        <div class="biz-sub">${escHtml(business.phone)}${business.address ? ' &middot; ' + escHtml(business.address) : ''}</div>
      </div>
      <div>
        <div class="report-title">SUPPLIER DEBT REPORT</div>
        <div class="report-date">Generated ${formatDate(new Date().toISOString())}</div>
      </div>
    </div>
    <div class="party-box">
      <div class="party-name">${escHtml(debt.supplierName)}</div>
      <div class="party-meta">
        ${debt.supplierPhone   ? `<span>Ph: ${escHtml(debt.supplierPhone)}</span>` : ''}
        ${debt.supplierAddress ? `<span>Addr: ${escHtml(debt.supplierAddress)}</span>` : ''}
        ${debt.purchaseNumber  ? `<span>Ref: ${escHtml(debt.purchaseNumber)}</span>` : ''}
      </div>
    </div>
  </div>

  <!-- Summary -->
  <div class="section">
    <div class="section-title">Payment Summary</div>
    <div class="status-grid">
      <div class="stat-cell">
        <div class="stat-label">Total Owed</div>
        <div class="stat-value">${fmt(debt.originalAmount)} IQD</div>
      </div>
      <div class="stat-cell">
        <div class="stat-label">Paid to Supplier</div>
        <div class="stat-value green">${fmt(debt.paidAmount)} IQD</div>
      </div>
      <div class="stat-cell">
        <div class="stat-label">Still Owe</div>
        <div class="stat-value ${debt.remainingAmount > 0 ? 'red' : 'green'}">${fmt(debt.remainingAmount)} IQD</div>
      </div>
    </div>
    <div class="progress-bar-bg">
      <div class="progress-bar-fill" style="width:${pctPaid(debt.paidAmount, debt.originalAmount)};background:${debt.remainingAmount <= 0 ? '#16A34A' : '#DC2626'};"></div>
    </div>
    <div class="progress-label">${pctPaid(debt.paidAmount, debt.originalAmount)} paid</div>
    <div style="margin-top:8px;">
      <span class="status-pill" style="background:${debt.remainingAmount <= 0 ? '#D1FAE5' : '#FEE2E2'};color:${debt.remainingAmount <= 0 ? '#16A34A' : '#DC2626'};">${statusLabel}</span>
    </div>
  </div>

  <!-- Purchase info -->
  <div class="section">
    <div class="section-title">Purchase Reference</div>
    <table>
      <tr><td style="color:#6B7280;width:140px;">Reference #</td><td style="font-weight:700;">${debt.purchaseNumber ? escHtml(debt.purchaseNumber) : '&mdash;'}</td></tr>
      <tr><td style="color:#6B7280;">Date</td><td>${formatDate(debt.createdAt)}</td></tr>
      ${debt.notes ? `<tr><td style="color:#6B7280;">Notes</td><td>${escHtml(debt.notes)}</td></tr>` : ''}
    </table>
  </div>

  <!-- Payment history -->
  <div class="section">
    <div class="section-title">Payments Made (${payments.length} payment${payments.length !== 1 ? 's' : ''})</div>
    <table>
      <thead>
        <tr>
          <th>Date &amp; Time</th>
          <th>Amount Paid</th>
          <th>Still Owed After</th>
        </tr>
      </thead>
      <tbody>
        ${paymentsRows}
      </tbody>
    </table>
  </div>

  <!-- Footer -->
  <div class="footer">
    <p>Generated by ${escHtml(business.name)} &middot; ManagerX &middot; ${formatDateTime(new Date().toISOString())}</p>
  </div>

</div>
</body>
</html>`;
}
