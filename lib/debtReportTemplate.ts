import type { SalesDebtDetail, PurchaseDebt, DebtPayment } from '@/types/debt';
import { fmtIQD, fmtUSD, fmtPct, formatDate, formatDateTime } from '@/utils/formatters';
import { KURDISH_FONT_FACE } from '@/lib/pdfFont';

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


function pctPaid(paid: number, original: number): number {
  if (original <= 0) return 0;
  return Math.min(100, Math.round((paid / original) * 100));
}

// ─── Shared CSS ───────────────────────────────────────────────────────────────

function sharedCSS(dir: 'ltr' | 'rtl'): string {
  return `
    ${KURDISH_FONT_FACE}
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      direction: ltr;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, 'Rudaw', sans-serif;
      background: #F0F4F8;
      color: #111827;
      font-size: 14px;
      line-height: 1.5;
    }
    .page { max-width: 720px; margin: 0 auto; background: #fff; }

    /* ── Header ── */
    .header { color: white; padding: 36px 28px 24px; }
    .header-top { display: flex; justify-content: space-between; align-items: flex-start; gap: 16px; margin-bottom: 20px; }
    .logo {
      height: 60px; max-width: 160px; object-fit: contain;
      margin-bottom: 10px; display: block;
      background: white; border-radius: 8px; padding: 4px;
    }
    .biz-name { font-size: 21px; font-weight: 800; letter-spacing: -0.3px; }
    .biz-sub { font-size: 12.5px; opacity: 0.82; margin-top: 3px; line-height: 1.5; }
    .report-badge {
      font-size: 12px; font-weight: 700;
      background: rgba(255,255,255,0.18);
      padding: 5px 14px; border-radius: 20px;
      text-align: ${dir === 'rtl' ? 'left' : 'right'};
      white-space: nowrap;
    }
    .report-date {
      font-size: 11px; opacity: 0.72; margin-top: 5px;
      text-align: ${dir === 'rtl' ? 'left' : 'right'};
    }
    .header-divider { border: none; border-top: 1px solid rgba(255,255,255,0.2); margin-bottom: 20px; }

    /* ── Party box ── */
    .party-box {
      background: rgba(255,255,255,0.14);
      border: 1px solid rgba(255,255,255,0.22);
      border-radius: 12px;
      padding: 16px 18px;
    }
    .party-name { font-size: 19px; font-weight: 800; margin-bottom: 7px; }
    .party-meta { display: flex; gap: 16px; flex-wrap: wrap; }
    .party-meta span { font-size: 12.5px; opacity: 0.88; }

    /* ── Sections ── */
    .section { padding: 22px 28px; border-bottom: 1px solid #F1F5F9; }
    .section:last-child { border-bottom: none; }
    .section-title {
      font-size: 10.5px; font-weight: 700;
      color: #94A3B8; text-transform: uppercase;
      letter-spacing: 0.8px; margin-bottom: 16px;
      padding-bottom: 8px;
      border-bottom: 1px solid #F1F5F9;
    }

    /* ── Stat grid ── */
    .status-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-bottom: 16px; }
    .stat-cell {
      background: #F8FAFC;
      border: 1px solid #E8EEF4;
      border-radius: 10px;
      padding: 14px 10px;
      text-align: center;
    }
    .stat-label { font-size: 11px; color: #94A3B8; margin-bottom: 5px; font-weight: 600; }
    .stat-value { font-size: 16px; font-weight: 800; color: #1E293B; line-height: 1.2; }
    .stat-value.green { color: #059669; }
    .stat-value.red   { color: #DC2626; }
    .stat-value.blue  { color: #5D4C14; }

    /* ── Progress bar ── */
    .progress-bar-bg { background: #E2E8F0; border-radius: 4px; height: 8px; margin: 4px 0 6px; overflow: hidden; }
    .progress-bar-fill { border-radius: 4px; height: 8px; min-width: 2px; }
    .progress-row { display: flex; justify-content: space-between; align-items: center; }
    .progress-label { font-size: 12px; color: #64748B; font-weight: 600; }
    .status-pill {
      display: inline-block; padding: 4px 14px;
      border-radius: 20px; font-size: 12px; font-weight: 700;
    }

    /* ── Tables ── */
    .table-wrap { border-radius: 8px; overflow: hidden; border: 1px solid #E2E8F0; }
    table { width: 100%; border-collapse: collapse; }
    th {
      background: #F1F5F9; padding: 10px 14px;
      text-align: left; font-size: 10.5px;
      font-weight: 700; color: #64748B;
      text-transform: uppercase; letter-spacing: 0.5px;
      border-bottom: 1px solid #E2E8F0;
    }
    td { padding: 11px 14px; font-size: 13px; border-bottom: 1px solid #F1F5F9; color: #334155; }
    tr:last-child td { border-bottom: none; }

    /* ── Detail table (two-col) ── */
    .detail-table td { padding: 8px 14px; }
    .detail-label { color: #64748B; width: 140px; font-size: 12.5px; }
    .detail-value { font-weight: 600; }

    /* ── Footer ── */
    .footer {
      padding: 18px 28px 22px;
      text-align: center;
      background: #F8FAFC;
      border-top: 1px solid #E2E8F0;
    }
    .footer p { font-size: 11.5px; color: #94A3B8; }

    @media print {
      body { background: white; }
      .stat-cell { border: 1px solid #ddd; }
    }
  `;
}

// ─── Sales Debt Report ────────────────────────────────────────────────────────

export function buildSalesDebtReportHTML(
  debt: SalesDebtDetail,
  payments: DebtPayment[],
  business: BusinessInfo,
  dir: 'ltr' | 'rtl' = 'ltr'
): string {
  const lang = 'en';
  const pct = pctPaid(debt.paidAmount, debt.originalAmount);

  const logoHTML = business.logoUri
    ? `<img src="${business.logoUri}" class="logo" alt="logo" />`
    : '';

  const paymentsRows = payments.length === 0
    ? `<tr><td colspan="3" style="text-align:center;color:#94A3B8;padding:18px;font-style:italic;">No payments recorded yet</td></tr>`
    : payments.map((p) => `
        <tr>
          <td>${formatDateTime(p.createdAt)}</td>
          <td style="color:#059669;font-weight:700;">+${fmtIQD(p.amount)} IQD</td>
          <td style="color:#5D4C14;font-weight:600;">${fmtIQD(p.remainingAfter)} IQD</td>
        </tr>
      `).join('');

  const settled = debt.remainingAmount <= 0;
  const fillColor = settled ? '#059669' : '#5D4C14';
  const statusStyle = settled
    ? 'background:#D1FAE5;color:#059669;'
    : 'background:#FEE2E2;color:#DC2626;';

  return `<!DOCTYPE html>
<html lang="${lang}" dir="${dir}">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Debt Report — ${escHtml(debt.customerName)}</title>
  <style>${sharedCSS(dir)}</style>
</head>
<body>
<div class="page">

  <div class="header" style="background:linear-gradient(135deg,#3B300C 0%,#A88924 60%,#D4AF37 100%);">
    <div class="header-top">
      <div>
        ${logoHTML}
        <div class="biz-name">${escHtml(business.name || 'Business')}</div>
        <div class="biz-sub">
          ${escHtml(business.phone)}
          ${business.phone && business.address ? ' &middot; ' : ''}
          ${escHtml(business.address)}
        </div>
      </div>
      <div>
        <div class="report-badge">DEBT REPORT</div>
        <div class="report-date">Generated ${formatDate(new Date().toISOString())}</div>
      </div>
    </div>
    <hr class="header-divider" />
    <div class="party-box">
      <div class="party-name">${escHtml(debt.customerName)}</div>
      <div class="party-meta">
        ${debt.customerPhone   ? `<span>&#128222; ${escHtml(debt.customerPhone)}</span>` : ''}
        ${debt.customerAddress ? `<span>&#128205; ${escHtml(debt.customerAddress)}</span>` : ''}
        <span>Invoice: <strong>${escHtml(debt.invoiceNumber)}</strong></span>
      </div>
    </div>
  </div>

  <div class="section">
    <div class="section-title">Debt Summary</div>
    <div class="status-grid">
      <div class="stat-cell">
        <div class="stat-label">Original Amount</div>
        <div class="stat-value blue">${fmtIQD(debt.originalAmount)}<br /><span style="font-size:11px;font-weight:600;"> IQD</span></div>
      </div>
      <div class="stat-cell">
        <div class="stat-label">Total Paid</div>
        <div class="stat-value green">${fmtIQD(debt.paidAmount)}<br /><span style="font-size:11px;font-weight:600;"> IQD</span></div>
      </div>
      <div class="stat-cell">
        <div class="stat-label">Remaining</div>
        <div class="stat-value ${debt.remainingAmount > 0 ? 'red' : 'green'}">${fmtIQD(debt.remainingAmount)}<br /><span style="font-size:11px;font-weight:600;"> IQD</span></div>
      </div>
    </div>
    <div class="progress-bar-bg">
      <div class="progress-bar-fill" style="width:${pct}%;background:${fillColor};"></div>
    </div>
    <div class="progress-row">
      <span class="progress-label">${pct}% paid</span>
      <span class="status-pill" style="${statusStyle}">${settled ? 'SETTLED' : 'ACTIVE'}</span>
    </div>
  </div>

  <div class="section">
    <div class="section-title">Invoice Details</div>
    <div class="table-wrap">
      <table class="detail-table">
        <tr><td class="detail-label">Invoice #</td><td class="detail-value">${escHtml(debt.invoiceNumber)}</td></tr>
        <tr><td class="detail-label">Date</td><td>${formatDate(debt.createdAt)}</td></tr>
        ${debt.warranty  ? `<tr><td class="detail-label">Warranty</td><td>${escHtml(debt.warranty)}</td></tr>` : ''}
        ${debt.saleNotes ? `<tr><td class="detail-label">Notes</td><td>${escHtml(debt.saleNotes)}</td></tr>` : ''}
      </table>
    </div>
  </div>

  <div class="section">
    <div class="section-title">Payment History (${payments.length} payment${payments.length !== 1 ? 's' : ''})</div>
    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Date &amp; Time</th>
            <th>Amount Paid</th>
            <th>Remaining After</th>
          </tr>
        </thead>
        <tbody>${paymentsRows}</tbody>
      </table>
    </div>
  </div>

  <div class="footer">
    <p>Generated by <strong>${escHtml(business.name)}</strong> &middot; Froshiar &middot; ${formatDateTime(new Date().toISOString())}</p>
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
  const lang = 'en';
  const pct = pctPaid(debt.paidAmount, debt.originalAmount);

  const logoHTML = business.logoUri
    ? `<img src="${business.logoUri}" class="logo" alt="logo" />`
    : '';

  const paymentsRows = payments.length === 0
    ? `<tr><td colspan="3" style="text-align:center;color:#94A3B8;padding:18px;font-style:italic;">No payments recorded yet</td></tr>`
    : payments.map((p) => `
        <tr>
          <td>${formatDateTime(p.createdAt)}</td>
          <td style="color:#059669;font-weight:700;">+${fmtIQD(p.amount)} IQD</td>
          <td style="color:#DC2626;font-weight:600;">${fmtIQD(p.remainingAfter)} IQD</td>
        </tr>
      `).join('');

  const settled = debt.remainingAmount <= 0;
  const fillColor = settled ? '#059669' : '#DC2626';
  const statusStyle = settled
    ? 'background:#D1FAE5;color:#059669;'
    : 'background:#FEE2E2;color:#DC2626;';

  return `<!DOCTYPE html>
<html lang="${lang}" dir="${dir}">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Supplier Debt Report — ${escHtml(debt.supplierName)}</title>
  <style>${sharedCSS(dir)}</style>
</head>
<body>
<div class="page">

  <div class="header" style="background:linear-gradient(135deg,#7F1D1D 0%,#B91C1C 60%,#DC2626 100%);">
    <div class="header-top">
      <div>
        ${logoHTML}
        <div class="biz-name">${escHtml(business.name || 'Business')}</div>
        <div class="biz-sub">
          ${escHtml(business.phone)}
          ${business.phone && business.address ? ' &middot; ' : ''}
          ${escHtml(business.address)}
        </div>
      </div>
      <div>
        <div class="report-badge">SUPPLIER DEBT REPORT</div>
        <div class="report-date">Generated ${formatDate(new Date().toISOString())}</div>
      </div>
    </div>
    <hr class="header-divider" />
    <div class="party-box">
      <div class="party-name">${escHtml(debt.supplierName)}</div>
      <div class="party-meta">
        ${debt.supplierPhone   ? `<span>&#128222; ${escHtml(debt.supplierPhone)}</span>` : ''}
        ${debt.supplierAddress ? `<span>&#128205; ${escHtml(debt.supplierAddress)}</span>` : ''}
        ${debt.purchaseNumber  ? `<span>Ref: <strong>${escHtml(debt.purchaseNumber)}</strong></span>` : ''}
      </div>
    </div>
  </div>

  <div class="section">
    <div class="section-title">Payment Summary</div>
    <div class="status-grid">
      <div class="stat-cell">
        <div class="stat-label">Total Owed</div>
        <div class="stat-value" style="color:#1E293B;">${fmtIQD(debt.originalAmount)}<br /><span style="font-size:11px;font-weight:600;"> IQD</span></div>
      </div>
      <div class="stat-cell">
        <div class="stat-label">Paid to Supplier</div>
        <div class="stat-value green">${fmtIQD(debt.paidAmount)}<br /><span style="font-size:11px;font-weight:600;"> IQD</span></div>
      </div>
      <div class="stat-cell">
        <div class="stat-label">Still Owe</div>
        <div class="stat-value ${debt.remainingAmount > 0 ? 'red' : 'green'}">${fmtIQD(debt.remainingAmount)}<br /><span style="font-size:11px;font-weight:600;"> IQD</span></div>
      </div>
    </div>
    <div class="progress-bar-bg">
      <div class="progress-bar-fill" style="width:${pct}%;background:${fillColor};"></div>
    </div>
    <div class="progress-row">
      <span class="progress-label">${pct}% paid</span>
      <span class="status-pill" style="${statusStyle}">${settled ? 'SETTLED' : 'ACTIVE'}</span>
    </div>
  </div>

  <div class="section">
    <div class="section-title">Purchase Reference</div>
    <div class="table-wrap">
      <table class="detail-table">
        <tr><td class="detail-label">Reference #</td><td class="detail-value">${debt.purchaseNumber ? escHtml(debt.purchaseNumber) : '&mdash;'}</td></tr>
        <tr><td class="detail-label">Date</td><td>${formatDate(debt.createdAt)}</td></tr>
        ${debt.notes ? `<tr><td class="detail-label">Notes</td><td>${escHtml(debt.notes)}</td></tr>` : ''}
      </table>
    </div>
  </div>

  <div class="section">
    <div class="section-title">Payments Made (${payments.length} payment${payments.length !== 1 ? 's' : ''})</div>
    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Date &amp; Time</th>
            <th>Amount Paid</th>
            <th>Still Owed After</th>
          </tr>
        </thead>
        <tbody>${paymentsRows}</tbody>
      </table>
    </div>
  </div>

  <div class="footer">
    <p>Generated by <strong>${escHtml(business.name)}</strong> &middot; Froshiar &middot; ${formatDateTime(new Date().toISOString())}</p>
  </div>

</div>
</body>
</html>`;
}
