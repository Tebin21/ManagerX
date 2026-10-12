import type { SalesDebtDetail, PurchaseDebt, DebtPayment, DebtOverviewSummary } from '@/types/debt';
import { fmtIQD, fmtUSD, fmtPct, formatDate, formatDateTime } from '@/utils/formatters';
import { KURDISH_FONT_FACE, PDF_BRAND_WEBSITE, PDF_DEVELOPED_BY_EN, kuSpan, isKurdishPdfActive, pdfDevelopedByText } from '@/lib/pdfFont';

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
    <p>Generated by <strong>${escHtml(business.name)}</strong> &middot; ${PDF_DEVELOPED_BY_EN} &middot; ${PDF_BRAND_WEBSITE} &middot; ${formatDateTime(new Date().toISOString())}</p>
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
    <p>Generated by <strong>${escHtml(business.name)}</strong> &middot; ${PDF_DEVELOPED_BY_EN} &middot; ${PDF_BRAND_WEBSITE} &middot; ${formatDateTime(new Date().toISOString())}</p>
  </div>

</div>
</body>
</html>`;
}

// ─── Debts Audit / List Report (Report, Sales, Purchase) ─────────────────────

export interface DebtReportSections {
  includeOverview: boolean;
  includeStats: boolean;
  includeSales: boolean;
  includePurchases: boolean;
}

export function buildDebtsAuditReportHTML(
  target: 'report' | 'sales' | 'purchase' | DebtReportSections,
  data: {
    summary?: DebtOverviewSummary | null;
    salesDebts?: SalesDebtDetail[];
    purchaseDebts?: PurchaseDebt[];
  },
  periodLabel: string,
  business: BusinessInfo,
  dir: 'ltr' | 'rtl' = 'rtl'
): string {
  const isKurdish = dir === 'rtl' || isKurdishPdfActive();
  const lang = isKurdish ? 'ku' : 'en';
  const ku = kuSpan;

  let sections: DebtReportSections;
  if (typeof target === 'object') {
    sections = {
      includeOverview: target.includeOverview ?? true,
      includeStats: target.includeStats ?? true,
      includeSales: target.includeSales ?? false,
      includePurchases: target.includePurchases ?? false,
    };
  } else if (target === 'sales') {
    sections = { includeOverview: false, includeStats: false, includeSales: true, includePurchases: false };
  } else if (target === 'purchase') {
    sections = { includeOverview: false, includeStats: false, includeSales: false, includePurchases: true };
  } else {
    // legacy 'report' tab: show overview + stats + both lists
    sections = { includeOverview: true, includeStats: true, includeSales: true, includePurchases: true };
  }

  // Ensure at least one section is enabled
  if (!sections.includeOverview && !sections.includeStats && !sections.includeSales && !sections.includePurchases) {
    sections = { includeOverview: true, includeStats: true, includeSales: true, includePurchases: true };
  }

  const now = new Date();
  const dateStr = formatDate(now.toISOString());
  const timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });

  let reportTitle = '';
  let reportPrefix = 'DAR';

  if (!sections.includeSales && !sections.includePurchases) {
    reportTitle = isKurdish ? 'ڕاپۆرتی ئاماری و پوختەی قەرزەکان' : 'Debt Statistical Summary Report';
    reportPrefix = 'DSR';
  } else if (!sections.includeOverview && !sections.includeStats && sections.includeSales && !sections.includePurchases) {
    reportTitle = isKurdish ? 'جەردی قەرزی کڕیاران' : 'Customer Debts Audit Report';
    reportPrefix = 'CSD';
  } else if (!sections.includeOverview && !sections.includeStats && !sections.includeSales && sections.includePurchases) {
    reportTitle = isKurdish ? 'جەردی قەرزی دابینکەران' : 'Supplier Debts Audit Report';
    reportPrefix = 'SPD';
  } else if (!sections.includeOverview && !sections.includeStats && sections.includeSales && sections.includePurchases) {
    reportTitle = isKurdish ? 'جەردی قەرزی کڕیاران و دابینکەران' : 'Customer & Supplier Debts Report';
    reportPrefix = 'CSD-SPD';
  } else {
    reportTitle = isKurdish ? 'ڕاپۆرتی گشتی و جەردی قەرزەکان' : 'General Debt Audit Report';
    reportPrefix = 'DAR';
  }

  const reportId = `${reportPrefix}-${now.toISOString().slice(0, 10).replace(/-/g, '')}-${Math.random().toString(16).slice(2, 6).toUpperCase()}`;

  const logoHTML = business.logoUri
    ? `<img src="${business.logoUri}" style="height:55px;max-width:140px;object-fit:contain;display:block;background:#fff;border-radius:8px;padding:4px;border:1px solid #E2E8F0;" alt="logo" />`
    : '';

  const sales = data.salesDebts || [];
  const purchases = data.purchaseDebts || [];

  const totalSalesOriginal = sales.reduce((s, d) => s + (d.originalAmount || 0), 0);
  const totalSalesPaid = sales.reduce((s, d) => s + (d.paidAmount || 0), 0);
  const totalSalesRemaining = sales.reduce((s, d) => s + (d.remainingAmount || 0), 0);

  const totalPurchaseOriginal = purchases.reduce((s, d) => s + (d.originalAmount || 0), 0);
  const totalPurchasePaid = purchases.reduce((s, d) => s + (d.paidAmount || 0), 0);
  const totalPurchaseRemaining = purchases.reduce((s, d) => s + (d.remainingAmount || 0), 0);

  const totalSalesDebt = data.summary?.totalSalesDebt ?? totalSalesRemaining;
  const totalPurchaseDebt = data.summary?.totalPurchaseDebt ?? totalPurchaseRemaining;
  const overdueCount = data.summary?.overdueCount ?? 0;
  const activeDebtsCount = (data.summary?.activeSalesCount ?? sales.length) + (data.summary?.activePurchaseCount ?? purchases.length);
  const netBalance = totalSalesDebt - totalPurchaseDebt;

  // Status badge helper
  const getBadgeHTML = (paid: number, remaining: number) => {
    if (remaining <= 0) {
      return `<span style="background:#ECFDF5;color:#047857;border:1px solid #A7F3D0;padding:2px 8px;border-radius:6px;font-size:11px;font-weight:700;">${isKurdish ? ku('پارەدراوە') : 'Paid'}</span>`;
    }
    if (paid > 0) {
      return `<span style="background:#FFFBEB;color:#B45309;border:1px solid #FDE68A;padding:2px 8px;border-radius:6px;font-size:11px;font-weight:700;">${isKurdish ? ku('بەشێک') : 'Partial'}</span>`;
    }
    return `<span style="background:#FEF2F2;color:#B91C1C;border:1px solid #FECACA;padding:2px 8px;border-radius:6px;font-size:11px;font-weight:700;">${isKurdish ? ku('پارەنەدراوە') : 'Unpaid'}</span>`;
  };

  const sectionsHTML: string[] = [];

  // ── SECTION 1: Overview & KPIs ──
  if (sections.includeOverview) {
    const netColor = netBalance >= 0 ? '#059669' : '#DC2626';
    const netLabel = netBalance >= 0
      ? (isKurdish ? 'باڵانس لە بەرژەوەندی ئێمەیە (کڕیاران زیاتر قەرزدارن)' : 'In Our Favor (Customers Owe More)')
      : (isKurdish ? 'باڵانس لە بەرژەوەندی دابینکەرانە (زیاتر قەرزدارین)' : 'In Suppliers Favor (We Owe More)');

    sectionsHTML.push(`
      <!-- Section: Overview & KPIs -->
      <div style="margin-bottom:24px;">
        ${(sections.includeSales || sections.includePurchases || sections.includeStats) ? `
          <div style="font-size:14px;font-weight:800;color:#0F172A;margin-bottom:14px;padding-bottom:6px;border-bottom:2px solid #E2E8F0;display:flex;justify-content:space-between;align-items:center;">
            <span>${isKurdish ? ku('پوختە و ئامارە گشتییەکان') : 'Overview & Key Metrics'}</span>
            <span style="font-size:11.5px;color:#64748B;font-weight:600;">${isKurdish ? ku('داشبۆرد') : 'Dashboard'}</span>
          </div>
        ` : ''}

        <!-- 4 Dashboard Metric Squares -->
        <div style="display:grid;grid-template-columns:repeat(4, 1fr);gap:12px;margin-bottom:16px;">
          <div style="background:#ECFDF5;border:1px solid #A7F3D0;border-radius:12px;padding:14px;text-align:center;">
            <div style="font-size:11px;font-weight:700;color:#047857;margin-bottom:6px;">${isKurdish ? ku('دەبێت کڕیار پێمان بدات') : 'Customers Owe Us'}</div>
            <div style="font-size:17px;font-weight:800;color:#065F46;"><span class="en-num" dir="ltr">${fmtIQD(totalSalesDebt)} IQD</span></div>
            <div style="font-size:10.5px;color:#059669;margin-top:4px;">${isKurdish ? ku('قەرزی کڕیاران') : 'Receivables'}</div>
          </div>

          <div style="background:#FEF2F2;border:1px solid #FECACA;border-radius:12px;padding:14px;text-align:center;">
            <div style="font-size:11px;font-weight:700;color:#B91C1C;margin-bottom:6px;">${isKurdish ? ku('دەبێت بیدەین بە دابینکەر') : 'We Owe Suppliers'}</div>
            <div style="font-size:17px;font-weight:800;color:#991B1B;"><span class="en-num" dir="ltr">${fmtIQD(totalPurchaseDebt)} IQD</span></div>
            <div style="font-size:10.5px;color:#DC2626;margin-top:4px;">${isKurdish ? ku('قەرزی دابینکەران') : 'Payables'}</div>
          </div>

          <div style="background:#FFFBEB;border:1px solid #FDE68A;border-radius:12px;padding:14px;text-align:center;">
            <div style="font-size:11px;font-weight:700;color:#B45309;margin-bottom:6px;">${isKurdish ? ku('بڕی دواکەوتوو') : 'Overdue Debts'}</div>
            <div style="font-size:17px;font-weight:800;color:#92400E;"><span class="en-num" dir="ltr">${overdueCount}</span></div>
            <div style="font-size:10.5px;color:#D97706;margin-top:4px;">${isKurdish ? ku('قەرزە دواکەوتووەکان') : 'Overdue Count'}</div>
          </div>

          <div style="background:#EEF2FF;border:1px solid #C7D2FE;border-radius:12px;padding:14px;text-align:center;">
            <div style="font-size:11px;font-weight:700;color:#4338CA;margin-bottom:6px;">${isKurdish ? ku('کۆی بڕی قەرزەکان') : 'Total Debts'}</div>
            <div style="font-size:17px;font-weight:800;color:#3730A3;"><span class="en-num" dir="ltr">${activeDebtsCount}</span></div>
            <div style="font-size:10.5px;color:#6366F1;margin-top:4px;">${isKurdish ? ku('قەرزە چالاکەکان') : 'Active Records'}</div>
          </div>
        </div>

        <!-- Net Balance Banner -->
        <div style="background:#FFFFFF;border:1px solid #E2E8F0;border-radius:12px;padding:14px 18px;display:flex;justify-content:space-between;align-items:center;">
          <div>
            <div style="font-size:12px;font-weight:700;color:#64748B;">${isKurdish ? ku('باڵانسی پوختەی قەرزەکان (قەرزی ماوە)') : 'Net Debt Balance'}</div>
            <div style="font-size:11.5px;color:${netColor};font-weight:600;margin-top:3px;">${netLabel}</div>
          </div>
          <div style="font-size:20px;font-weight:800;color:${netColor};">
            <span class="en-num" dir="ltr">${fmtIQD(Math.abs(netBalance))} IQD</span>
          </div>
        </div>
      </div>
    `);
  }

  // ── SECTION 2: Numerical Summary Breakdown (تەنها ژمارەکان - بێ ناوی کەسەکان) ──
  if (sections.includeStats) {
    sectionsHTML.push(`
      <!-- Section: Numerical Summary Breakdown -->
      <div style="margin-bottom:24px;">
        <div style="font-size:14px;font-weight:800;color:#0F172A;margin-bottom:12px;padding-bottom:6px;border-bottom:2px solid #E2E8F0;display:flex;justify-content:space-between;align-items:center;">
          <span>${isKurdish ? ku('پوختەی دارایی و ئامارەکان (تەنها ژمارەکان)') : 'Financial & Numerical Summary'}</span>
          <span style="font-size:11.5px;color:#64748B;font-weight:600;">${isKurdish ? ku('بێ ناوی کەسەکان') : 'Summary Only'}</span>
        </div>

        <div style="background:#FFFFFF;border:1px solid #E2E8F0;border-radius:12px;overflow:hidden;">
          <table style="width:100%;border-collapse:collapse;font-size:12px;">
            <thead>
              <tr style="background:#F1F5F9;border-bottom:1px solid #CBD5E1;">
                <th style="padding:10px;text-align:${dir === 'rtl' ? 'right' : 'left'};">${isKurdish ? ku('بەشی قەرز') : 'Debt Section'}</th>
                <th style="padding:10px;text-align:center;">${isKurdish ? ku('ژمارەی قەرز') : 'Count'}</th>
                <th style="padding:10px;text-align:${dir === 'rtl' ? 'left' : 'right'};">${isKurdish ? ku('کۆی قەرزی سەرەتایی') : 'Original Total'}</th>
                <th style="padding:10px;text-align:${dir === 'rtl' ? 'left' : 'right'};">${isKurdish ? ku('کۆی پارەی دراو') : 'Total Paid'}</th>
                <th style="padding:10px;text-align:${dir === 'rtl' ? 'left' : 'right'};">${isKurdish ? ku('کۆی قەرزی ماوە') : 'Remaining Total'}</th>
                <th style="padding:10px;text-align:center;">${isKurdish ? ku('ڕێژەی پارەدان') : '% Paid'}</th>
              </tr>
            </thead>
            <tbody>
              <!-- Customer Debts Row -->
              <tr style="border-bottom:1px solid #F1F5F9;background:#FFFFFF;">
                <td style="padding:11px 10px;font-weight:700;color:#047857;text-align:${dir === 'rtl' ? 'right' : 'left'};">
                  ${isKurdish ? ku('قەرزی کڕیاران (دەبێت پێمان بدەن)') : 'Customer Debts (Receivables)'}
                </td>
                <td style="padding:11px 10px;text-align:center;"><span class="en-num" dir="ltr">${sales.length}</span></td>
                <td style="padding:11px 10px;text-align:${dir === 'rtl' ? 'left' : 'right'};font-weight:700;color:#0F172A;"><span class="en-num" dir="ltr">${fmtIQD(totalSalesOriginal)} IQD</span></td>
                <td style="padding:11px 10px;text-align:${dir === 'rtl' ? 'left' : 'right'};color:#059669;font-weight:700;"><span class="en-num" dir="ltr">${fmtIQD(totalSalesPaid)} IQD</span></td>
                <td style="padding:11px 10px;text-align:${dir === 'rtl' ? 'left' : 'right'};color:#DC2626;font-weight:700;"><span class="en-num" dir="ltr">${fmtIQD(totalSalesRemaining)} IQD</span></td>
                <td style="padding:11px 10px;text-align:center;font-weight:700;color:#047857;"><span class="en-num" dir="ltr">${pctPaid(totalSalesPaid, totalSalesOriginal)}%</span></td>
              </tr>

              <!-- Supplier Debts Row -->
              <tr style="border-bottom:1px solid #F1F5F9;background:#FFFFFF;">
                <td style="padding:11px 10px;font-weight:700;color:#B91C1C;text-align:${dir === 'rtl' ? 'right' : 'left'};">
                  ${isKurdish ? ku('قەرزی دابینکەران (دەبێت بیدەین)') : 'Supplier Debts (Payables)'}
                </td>
                <td style="padding:11px 10px;text-align:center;"><span class="en-num" dir="ltr">${purchases.length}</span></td>
                <td style="padding:11px 10px;text-align:${dir === 'rtl' ? 'left' : 'right'};font-weight:700;color:#0F172A;"><span class="en-num" dir="ltr">${fmtIQD(totalPurchaseOriginal)} IQD</span></td>
                <td style="padding:11px 10px;text-align:${dir === 'rtl' ? 'left' : 'right'};color:#059669;font-weight:700;"><span class="en-num" dir="ltr">${fmtIQD(totalPurchasePaid)} IQD</span></td>
                <td style="padding:11px 10px;text-align:${dir === 'rtl' ? 'left' : 'right'};color:#DC2626;font-weight:700;"><span class="en-num" dir="ltr">${fmtIQD(totalPurchaseRemaining)} IQD</span></td>
                <td style="padding:11px 10px;text-align:center;font-weight:700;color:#B91C1C;"><span class="en-num" dir="ltr">${pctPaid(totalPurchasePaid, totalPurchaseOriginal)}%</span></td>
              </tr>

              <!-- Summary / Net Balance Row -->
              <tr style="background:#F8FAFC;font-weight:800;border-top:2px solid #CBD5E1;">
                <td style="padding:12px 10px;color:#0F172A;text-align:${dir === 'rtl' ? 'right' : 'left'};">
                  ${isKurdish ? ku('باڵانسی پوختەی قەرزەکان') : 'Net Debt Balance'}
                </td>
                <td style="padding:12px 10px;text-align:center;"><span class="en-num" dir="ltr">${activeDebtsCount}</span></td>
                <td style="padding:12px 10px;text-align:${dir === 'rtl' ? 'left' : 'right'};color:#0F172A;"><span class="en-num" dir="ltr">${fmtIQD(totalSalesOriginal + totalPurchaseOriginal)} IQD</span></td>
                <td style="padding:12px 10px;text-align:${dir === 'rtl' ? 'left' : 'right'};color:#059669;"><span class="en-num" dir="ltr">${fmtIQD(totalSalesPaid + totalPurchasePaid)} IQD</span></td>
                <td style="padding:12px 10px;text-align:${dir === 'rtl' ? 'left' : 'right'};color:${netBalance >= 0 ? '#059669' : '#DC2626'};"><span class="en-num" dir="ltr">${fmtIQD(Math.abs(netBalance))} IQD</span></td>
                <td style="padding:12px 10px;text-align:center;color:${netBalance >= 0 ? '#059669' : '#DC2626'};">
                  ${netBalance >= 0 ? (isKurdish ? ku('+بە قازانج') : '+Favor') : (isKurdish ? ku('-قەرزدارین') : '-Owe')}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    `);
  }

  // ── SECTION 2: Customer Debts (Sales) ──
  if (sections.includeSales) {
    const customerRows = sales.length === 0
      ? `<tr><td colspan="9" style="text-align:center;color:#94A3B8;padding:24px;">${isKurdish ? ku('هیچ قەرزێکی کڕیار لەم ماوەیەدا نەدۆزرایەوە') : 'No customer debts found for this period'}</td></tr>`
      : sales.map((d, idx) => `
        <tr style="background:${idx % 2 === 0 ? '#FFFFFF' : '#F8FAFC'};">
          <td style="text-align:center;color:#64748B;font-size:11px;"><span class="en-num" dir="ltr">${idx + 1}</span></td>
          <td style="font-weight:700;color:#0F172A;text-align:${dir === 'rtl' ? 'right' : 'left'};">
            ${escHtml(d.customerName)}
            ${d.customerPhone ? `<div style="font-size:10.5px;color:#64748B;"><span class="en-num" dir="ltr">${escHtml(d.customerPhone)}</span></div>` : ''}
          </td>
          <td style="text-align:center;"><span class="en-num" dir="ltr">#${escHtml(d.invoiceNumber)}</span></td>
          <td style="text-align:center;font-size:11.5px;color:#475569;"><span class="en-num" dir="ltr">${formatDate(d.createdAt)}</span></td>
          <td style="text-align:${dir === 'rtl' ? 'left' : 'right'};font-weight:700;color:#0F172A;"><span class="en-num" dir="ltr">${fmtIQD(d.originalAmount)} IQD</span></td>
          <td style="text-align:${dir === 'rtl' ? 'left' : 'right'};color:#059669;font-weight:600;"><span class="en-num" dir="ltr">${fmtIQD(d.paidAmount)} IQD</span></td>
          <td style="text-align:${dir === 'rtl' ? 'left' : 'right'};color:#DC2626;font-weight:700;"><span class="en-num" dir="ltr">${fmtIQD(d.remainingAmount)} IQD</span></td>
          <td style="text-align:center;">${getBadgeHTML(d.paidAmount, d.remainingAmount)}</td>
          <td style="text-align:center;font-size:11px;color:#64748B;"><span class="en-num" dir="ltr">${pctPaid(d.paidAmount, d.originalAmount)}%</span></td>
        </tr>
      `).join('');

    sectionsHTML.push(`
      <!-- Section: Customer Debts (Sales) -->
      <div style="margin-bottom:24px;">
        <div style="font-size:14px;font-weight:800;color:#0F172A;margin-bottom:12px;padding-bottom:6px;border-bottom:2px solid #E2E8F0;display:flex;justify-content:space-between;align-items:center;">
          <span>${isKurdish ? ku('قەرزی کڕیاران (فرۆشتن)') : 'Customer Debts (Sales)'}</span>
          <span style="font-size:12px;color:#64748B;font-weight:600;">${sales.length} ${isKurdish ? ku('قەرزدار') : 'debtors'}</span>
        </div>

        <!-- Customer Stats summary banner -->
        <div style="display:grid;grid-template-columns:repeat(4, 1fr);gap:12px;margin-bottom:14px;">
          <div style="background:#F8FAFC;border:1px solid #E2E8F0;border-radius:10px;padding:11px;text-align:center;">
            <div style="font-size:10.5px;color:#64748B;font-weight:600;">${isKurdish ? ku('کۆی قەرزی سەرەتایی') : 'Original Debt'}</div>
            <div style="font-size:15px;font-weight:800;color:#0F172A;margin-top:3px;"><span class="en-num" dir="ltr">${fmtIQD(totalSalesOriginal)} IQD</span></div>
          </div>
          <div style="background:#ECFDF5;border:1px solid #A7F3D0;border-radius:10px;padding:11px;text-align:center;">
            <div style="font-size:10.5px;color:#047857;font-weight:600;">${isKurdish ? ku('کۆی پارەدراو') : 'Total Paid'}</div>
            <div style="font-size:15px;font-weight:800;color:#065F46;margin-top:3px;"><span class="en-num" dir="ltr">${fmtIQD(totalSalesPaid)} IQD</span></div>
          </div>
          <div style="background:#FEF2F2;border:1px solid #FECACA;border-radius:10px;padding:11px;text-align:center;">
            <div style="font-size:10.5px;color:#B91C1C;font-weight:600;">${isKurdish ? ku('کۆی قەرزی ماوە') : 'Total Remaining'}</div>
            <div style="font-size:15px;font-weight:800;color:#991B1B;margin-top:3px;"><span class="en-num" dir="ltr">${fmtIQD(totalSalesRemaining)} IQD</span></div>
          </div>
          <div style="background:#EEF2FF;border:1px solid #C7D2FE;border-radius:10px;padding:11px;text-align:center;">
            <div style="font-size:10.5px;color:#4338CA;font-weight:600;">${isKurdish ? ku('ژمارەی قەرزەکان') : 'Debts Count'}</div>
            <div style="font-size:15px;font-weight:800;color:#3730A3;margin-top:3px;"><span class="en-num" dir="ltr">${sales.length}</span></div>
          </div>
        </div>

        <!-- Customer Audit Table -->
        <div style="background:#FFFFFF;border:1px solid #E2E8F0;border-radius:12px;overflow:hidden;">
          <table style="width:100%;border-collapse:collapse;font-size:12px;">
            <thead>
              <tr style="background:#F1F5F9;border-bottom:1px solid #CBD5E1;">
                <th style="padding:10px;text-align:center;width:35px;">#</th>
                <th style="padding:10px;text-align:${dir === 'rtl' ? 'right' : 'left'};">${isKurdish ? ku('ناوی کڕیار') : 'Customer'}</th>
                <th style="padding:10px;text-align:center;">${isKurdish ? ku('ژ. وەسڵ') : 'Invoice #'}</th>
                <th style="padding:10px;text-align:center;">${isKurdish ? ku('بەروار') : 'Date'}</th>
                <th style="padding:10px;text-align:${dir === 'rtl' ? 'left' : 'right'};">${isKurdish ? ku('کۆی گشتی') : 'Original'}</th>
                <th style="padding:10px;text-align:${dir === 'rtl' ? 'left' : 'right'};">${isKurdish ? ku('دراو') : 'Paid'}</th>
                <th style="padding:10px;text-align:${dir === 'rtl' ? 'left' : 'right'};">${isKurdish ? ku('ماوە') : 'Remaining'}</th>
                <th style="padding:10px;text-align:center;">${isKurdish ? ku('دۆخ') : 'Status'}</th>
                <th style="padding:10px;text-align:center;">${isKurdish ? ku('ڕێژە') : '%'}</th>
              </tr>
            </thead>
            <tbody>${customerRows}</tbody>
          </table>
        </div>
      </div>
    `);
  }

  // ── SECTION 3: Supplier Debts (Purchases) ──
  if (sections.includePurchases) {
    const purchaseRows = purchases.length === 0
      ? `<tr><td colspan="9" style="text-align:center;color:#94A3B8;padding:24px;">${isKurdish ? ku('هیچ قەرزێکی دابینکەر لەم ماوەیەدا نەدۆزرایەوە') : 'No supplier debts found for this period'}</td></tr>`
      : purchases.map((d, idx) => `
        <tr style="background:${idx % 2 === 0 ? '#FFFFFF' : '#F8FAFC'};">
          <td style="text-align:center;color:#64748B;font-size:11px;"><span class="en-num" dir="ltr">${idx + 1}</span></td>
          <td style="font-weight:700;color:#0F172A;text-align:${dir === 'rtl' ? 'right' : 'left'};">
            ${escHtml(d.supplierName)}
            ${d.supplierPhone ? `<div style="font-size:10.5px;color:#64748B;"><span class="en-num" dir="ltr">${escHtml(d.supplierPhone)}</span></div>` : ''}
          </td>
          <td style="text-align:center;"><span class="en-num" dir="ltr">#${escHtml(d.purchaseNumber || '—')}</span></td>
          <td style="text-align:center;font-size:11.5px;color:#475569;"><span class="en-num" dir="ltr">${formatDate(d.createdAt)}</span></td>
          <td style="text-align:${dir === 'rtl' ? 'left' : 'right'};font-weight:700;color:#0F172A;"><span class="en-num" dir="ltr">${fmtIQD(d.originalAmount)} IQD</span></td>
          <td style="text-align:${dir === 'rtl' ? 'left' : 'right'};color:#059669;font-weight:600;"><span class="en-num" dir="ltr">${fmtIQD(d.paidAmount)} IQD</span></td>
          <td style="text-align:${dir === 'rtl' ? 'left' : 'right'};color:#DC2626;font-weight:700;"><span class="en-num" dir="ltr">${fmtIQD(d.remainingAmount)} IQD</span></td>
          <td style="text-align:center;">${getBadgeHTML(d.paidAmount, d.remainingAmount)}</td>
          <td style="text-align:center;font-size:11px;color:#64748B;"><span class="en-num" dir="ltr">${pctPaid(d.paidAmount, d.originalAmount)}%</span></td>
        </tr>
      `).join('');

    sectionsHTML.push(`
      <!-- Section: Supplier Debts (Purchases) -->
      <div style="margin-bottom:20px;">
        <div style="font-size:14px;font-weight:800;color:#0F172A;margin-bottom:12px;padding-bottom:6px;border-bottom:2px solid #E2E8F0;display:flex;justify-content:space-between;align-items:center;">
          <span>${isKurdish ? ku('قەرزی دابینکەران (کڕین)') : 'Supplier Debts (Purchases)'}</span>
          <span style="font-size:12px;color:#64748B;font-weight:600;">${purchases.length} ${isKurdish ? ku('دابینکەر') : 'suppliers'}</span>
        </div>

        <!-- Supplier Stats summary banner -->
        <div style="display:grid;grid-template-columns:repeat(4, 1fr);gap:12px;margin-bottom:14px;">
          <div style="background:#F8FAFC;border:1px solid #E2E8F0;border-radius:10px;padding:11px;text-align:center;">
            <div style="font-size:10.5px;color:#64748B;font-weight:600;">${isKurdish ? ku('کۆی قەرزی سەرەتایی') : 'Original Debt'}</div>
            <div style="font-size:15px;font-weight:800;color:#0F172A;margin-top:3px;"><span class="en-num" dir="ltr">${fmtIQD(totalPurchaseOriginal)} IQD</span></div>
          </div>
          <div style="background:#ECFDF5;border:1px solid #A7F3D0;border-radius:10px;padding:11px;text-align:center;">
            <div style="font-size:10.5px;color:#047857;font-weight:600;">${isKurdish ? ku('کۆی پارەدراو') : 'Total Paid'}</div>
            <div style="font-size:15px;font-weight:800;color:#065F46;margin-top:3px;"><span class="en-num" dir="ltr">${fmtIQD(totalPurchasePaid)} IQD</span></div>
          </div>
          <div style="background:#FEF2F2;border:1px solid #FECACA;border-radius:10px;padding:11px;text-align:center;">
            <div style="font-size:10.5px;color:#B91C1C;font-weight:600;">${isKurdish ? ku('کۆی قەرزی ماوە') : 'Total Remaining'}</div>
            <div style="font-size:15px;font-weight:800;color:#991B1B;margin-top:3px;"><span class="en-num" dir="ltr">${fmtIQD(totalPurchaseRemaining)} IQD</span></div>
          </div>
          <div style="background:#EEF2FF;border:1px solid #C7D2FE;border-radius:10px;padding:11px;text-align:center;">
            <div style="font-size:10.5px;color:#4338CA;font-weight:600;">${isKurdish ? ku('ژمارەی قەرزەکان') : 'Debts Count'}</div>
            <div style="font-size:15px;font-weight:800;color:#3730A3;margin-top:3px;"><span class="en-num" dir="ltr">${purchases.length}</span></div>
          </div>
        </div>

        <!-- Supplier Audit Table -->
        <div style="background:#FFFFFF;border:1px solid #E2E8F0;border-radius:12px;overflow:hidden;">
          <table style="width:100%;border-collapse:collapse;font-size:12px;">
            <thead>
              <tr style="background:#F1F5F9;border-bottom:1px solid #CBD5E1;">
                <th style="padding:10px;text-align:center;width:35px;">#</th>
                <th style="padding:10px;text-align:${dir === 'rtl' ? 'right' : 'left'};">${isKurdish ? ku('ناوی دابینکەر') : 'Supplier'}</th>
                <th style="padding:10px;text-align:center;">${isKurdish ? ku('ژ. کڕین') : 'Purchase #'}</th>
                <th style="padding:10px;text-align:center;">${isKurdish ? ku('بەروار') : 'Date'}</th>
                <th style="padding:10px;text-align:${dir === 'rtl' ? 'left' : 'right'};">${isKurdish ? ku('کۆی گشتی') : 'Original'}</th>
                <th style="padding:10px;text-align:${dir === 'rtl' ? 'left' : 'right'};">${isKurdish ? ku('دراو') : 'Paid'}</th>
                <th style="padding:10px;text-align:${dir === 'rtl' ? 'left' : 'right'};">${isKurdish ? ku('ماوە') : 'Remaining'}</th>
                <th style="padding:10px;text-align:center;">${isKurdish ? ku('دۆخ') : 'Status'}</th>
                <th style="padding:10px;text-align:center;">${isKurdish ? ku('ڕێژە') : '%'}</th>
              </tr>
            </thead>
            <tbody>${purchaseRows}</tbody>
          </table>
        </div>
      </div>
    `);
  }

  const mainContentHTML = sectionsHTML.join('\n');

  return `<!DOCTYPE html>
<html lang="${lang}" dir="${dir}">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1.0"/>
<title>${reportTitle} — ${escHtml(business.name)}</title>
<style>
  ${KURDISH_FONT_FACE}
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    direction: ${dir};
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, 'Rudaw', sans-serif;
    background: #F8FAFC;
    color: #0F172A;
    font-size: 12.5px;
    line-height: 1.5;
  }
  .page {
    max-width: 920px;
    margin: 0 auto;
    background: #FFFFFF;
    padding: 28px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.05);
  }
  .header-card {
    background: linear-gradient(135deg, #0F172A 0%, #1E293B 100%);
    border-radius: 14px;
    padding: 22px 24px;
    color: #FFFFFF;
    margin-bottom: 22px;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  .biz-info h1 {
    font-size: 20px;
    font-weight: 800;
    margin-bottom: 4px;
    color: #F8FAFC;
  }
  .biz-info p {
    font-size: 11.5px;
    color: #94A3B8;
    line-height: 1.4;
  }
  .report-meta {
    text-align: ${dir === 'rtl' ? 'left' : 'right'};
  }
  .report-badge {
    display: inline-block;
    background: #D4AF37;
    color: #0F172A;
    font-size: 12px;
    font-weight: 800;
    padding: 4px 12px;
    border-radius: 20px;
    margin-bottom: 6px;
  }
  .meta-sub {
    font-size: 11px;
    color: #CBD5E1;
  }
  .meta-sub span {
    font-weight: 700;
  }
  .en-num {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif;
    unicode-bidi: embed;
  }
  .footer {
    border-top: 1px solid #E2E8F0;
    padding-top: 16px;
    margin-top: 24px;
    text-align: center;
    font-size: 11px;
    color: #94A3B8;
  }
</style>
</head>
<body>
<div class="page">
  <div class="header-card">
    <div style="display:flex;align-items:center;gap:16px;">
      ${logoHTML}
      <div class="biz-info">
        <h1>${escHtml(business.name)}</h1>
        <p>${business.phone ? `<span class="en-num" dir="ltr">${escHtml(business.phone)}</span>` : ''} ${business.address ? `&bull; ${escHtml(business.address)}` : ''}</p>
        <p style="margin-top:2px;">ID: <span class="en-num" dir="ltr">${reportId}</span></p>
      </div>
    </div>
    <div class="report-meta">
      <div class="report-badge">${reportTitle}</div>
      <div class="meta-sub">${isKurdish ? ku('ماوە: ') : 'Period: '}<span>${escHtml(periodLabel)}</span></div>
      <div class="meta-sub">${isKurdish ? ku('بەروار: ') : 'Date: '}<span><span class="en-num" dir="ltr">${dateStr} &bull; ${timeStr}</span></span></div>
    </div>
  </div>

  ${mainContentHTML}

  <div class="footer">
    <p>Generated by <strong>${escHtml(business.name)}</strong> &middot; ${PDF_DEVELOPED_BY_EN} &middot; ${PDF_BRAND_WEBSITE} &middot; <span class="en-num" dir="ltr">${dateStr} ${timeStr}</span></p>
  </div>
</div>
</body>
</html>`;
}

