import type {
  SalesReportData, PurchaseReportData, ProfitLossData,
  InventoryReportSummary, DebtReportData, ProfitableProduct,
  RevenuePoint, Expense,
} from '@/lib/sqlite';
import type { DateRange } from '@/types/reports';
import { fmtIQD, fmtUSD, fmtPct, formatDate as fmtDate, formatDateTime as fmtDateTime } from '@/utils/formatters';
import { KURDISH_FONT_FACE } from '@/lib/pdfFont';

interface BusinessInfo {
  name: string;
  phone: string;
  address: string;
  logoUri: string | null;
}

export interface FullReportData {
  salesData:     SalesReportData     | null;
  purchaseData:  PurchaseReportData  | null;
  plData:        ProfitLossData      | null;
  inventoryData: InventoryReportSummary | null;
  debtData:      DebtReportData      | null;
  topProfitable: ProfitableProduct[];
  monthlyRevenue: RevenuePoint[];
  expenses:      Expense[];
  dateRange:     DateRange;
}

function escHtml(str: string): string {
  return (str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}


function colorVal(n: number): string {
  return n >= 0 ? '#059669' : '#DC2626';
}

export function buildFullReportHTML(
  data: FullReportData,
  business: BusinessInfo,
  dir: 'ltr' | 'rtl' = 'ltr'
): string {
  const lang = 'en';
  const { salesData, purchaseData, plData, inventoryData, debtData,
    topProfitable, monthlyRevenue, expenses, dateRange } = data;

  const logoHTML = business.logoUri
    ? `<img src="${business.logoUri}" style="height:60px;max-width:160px;object-fit:contain;display:block;background:white;border-radius:8px;padding:4px;margin-bottom:10px;" alt="logo" />`
    : '';

  const periodLabel = dateRange.key === 'custom'
    ? `${fmtDate(dateRange.from)} – ${fmtDate(dateRange.to)}`
    : escHtml(dateRange.label);

  // ── Monthly revenue rows ───────────────────────────────────────────────────
  const monthlyRows = monthlyRevenue.length === 0
    ? `<tr><td colspan="4" style="text-align:center;color:#94A3B8;padding:16px;font-style:italic;">No data</td></tr>`
    : monthlyRevenue.map((r) => `
        <tr>
          <td>${escHtml(r.period)}</td>
          <td style="font-weight:600;">${fmtIQD(r.revenue)} IQD</td>
          <td style="color:${colorVal(r.profit)};font-weight:600;">${fmtIQD(r.profit)} IQD</td>
          <td style="color:#64748B;">${r.sales}</td>
        </tr>
      `).join('');

  // ── Top profitable products rows ───────────────────────────────────────────
  const profRows = topProfitable.length === 0
    ? `<tr><td colspan="4" style="text-align:center;color:#94A3B8;padding:16px;font-style:italic;">No data</td></tr>`
    : topProfitable.map((p, i) => `
        <tr>
          <td style="font-weight:800;color:#64748B;">#${i + 1}</td>
          <td style="font-weight:600;">${escHtml(p.productName)}</td>
          <td style="color:${colorVal(p.grossProfit)};font-weight:700;">${fmtIQD(p.grossProfit)} IQD</td>
          <td style="color:#64748B;">${p.marginPct.toFixed(1)}%</td>
        </tr>
      `).join('');

  // ── Expense rows ───────────────────────────────────────────────────────────
  const expRows = expenses.length === 0
    ? `<tr><td colspan="4" style="text-align:center;color:#94A3B8;padding:16px;font-style:italic;">No expenses recorded</td></tr>`
    : expenses.map((e) => `
        <tr>
          <td style="color:#64748B;">${fmtDate(e.date)}</td>
          <td><span style="background:#F1F5F9;padding:3px 9px;border-radius:20px;font-size:11px;font-weight:700;color:#475569;">${escHtml(e.category)}</span></td>
          <td style="color:#64748B;">${e.note ? escHtml(e.note) : '&mdash;'}</td>
          <td style="font-weight:700;color:#DC2626;text-align:right;">${fmtIQD(e.amount)} IQD</td>
        </tr>
      `).join('');

  const expTotal = expenses.reduce((s, e) => s + e.amount, 0);

  return `<!DOCTYPE html>
<html lang="${lang}" dir="${dir}">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Business Report &mdash; ${escHtml(business.name)}</title>
  <style>
    ${KURDISH_FONT_FACE}
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      direction: ltr;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, 'Rudaw', sans-serif;
      background: #F0F4F8;
      color: #1E293B;
      font-size: 13.5px;
      line-height: 1.5;
    }
    .page { max-width: 720px; margin: 0 auto; background: #fff; }

    /* ── Header ── */
    .header {
      background: linear-gradient(135deg, #1E3A8A 0%, #2563EB 60%, #3B82F6 100%);
      color: #fff;
      padding: 36px 28px 24px;
    }
    .header-top { display: flex; justify-content: space-between; align-items: flex-start; gap: 16px; margin-bottom: 16px; }
    .biz-name { font-size: 22px; font-weight: 800; letter-spacing: -0.3px; margin-bottom: 4px; }
    .biz-sub  { font-size: 12.5px; opacity: 0.82; line-height: 1.5; }
    .report-badge {
      background: rgba(255,255,255,0.18);
      border: 1px solid rgba(255,255,255,0.3);
      padding: 5px 14px;
      border-radius: 20px;
      font-size: 12px;
      font-weight: 700;
      white-space: nowrap;
    }
    .gen-date { font-size: 11px; opacity: 0.7; margin-top: 5px; text-align: ${dir === 'rtl' ? 'left' : 'right'}; }
    .header-divider { border: none; border-top: 1px solid rgba(255,255,255,0.2); margin: 16px 0 16px; }
    .period-banner {
      background: rgba(255,255,255,0.12);
      border: 1px solid rgba(255,255,255,0.2);
      border-radius: 12px;
      padding: 12px 16px;
    }
    .period-lbl { font-size: 10.5px; opacity: 0.75; font-weight: 600; text-transform: uppercase; letter-spacing: 0.8px; margin-bottom: 4px; }
    .period-val { font-size: 15px; font-weight: 700; }

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

    /* ── KPI grid ── */
    .kpi-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; }
    .kpi-cell {
      background: #F8FAFC;
      border: 1px solid #E8EEF4;
      border-radius: 10px;
      padding: 13px 10px;
      text-align: center;
    }
    .kpi-label { font-size: 10.5px; color: #94A3B8; margin-bottom: 5px; font-weight: 600; }
    .kpi-value { font-size: 15px; font-weight: 800; color: #1E293B; line-height: 1.2; word-break: break-word; }
    .kpi-value.green { color: #059669; }
    .kpi-value.red   { color: #DC2626; }
    .kpi-value.blue  { color: #1E40AF; }
    .kpi-value.amber { color: #D97706; }

    /* ── Tables ── */
    .table-wrap { border-radius: 8px; overflow: hidden; border: 1px solid #E2E8F0; margin-top: 4px; }
    table { width: 100%; border-collapse: collapse; }
    th {
      background: #F1F5F9; padding: 10px 12px;
      text-align: left; font-size: 10.5px;
      font-weight: 700; color: #64748B;
      text-transform: uppercase; letter-spacing: 0.5px;
      border-bottom: 1px solid #E2E8F0;
    }
    td { padding: 10px 12px; font-size: 13px; border-bottom: 1px solid #F1F5F9; vertical-align: middle; color: #334155; }
    tr:last-child td { border-bottom: none; }
    .total-row td { background: #EFF6FF; font-weight: 700; color: #1E3A8A; border-top: 2px solid #BFDBFE; }

    /* ── P&L ── */
    .pl-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 8px 0;
      border-bottom: 1px solid #F1F5F9;
    }
    .pl-row:last-child { border-bottom: none; }
    .pl-label { font-size: 13.5px; color: #475569; }
    .pl-value { font-size: 13.5px; font-weight: 600; min-width: 140px; text-align: right; }
    .pl-indent { padding-left: 20px; }
    .pl-subtotal {
      background: #EFF6FF;
      border: 1px solid #BFDBFE;
      border-radius: 8px;
      padding: 10px 14px;
      margin: 10px 0;
      display: flex;
      justify-content: space-between;
    }
    .pl-net {
      border-top: 2px solid #1E40AF;
      margin-top: 10px;
      padding-top: 14px;
    }

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
      .kpi-cell { border: 1px solid #ddd; }
      .header { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
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
        <div class="report-badge">BUSINESS REPORT</div>
        <div class="gen-date">Generated ${fmtDateTime(new Date().toISOString())}</div>
      </div>
    </div>
    <hr class="header-divider" />
    <div class="period-banner">
      <div class="period-lbl">Reporting Period</div>
      <div class="period-val">${periodLabel}</div>
    </div>
  </div>

  <!-- Overview KPIs -->
  <div class="section">
    <div class="section-title">Overview</div>
    <div class="kpi-grid">
      <div class="kpi-cell">
        <div class="kpi-label">Total Revenue</div>
        <div class="kpi-value blue">${fmtIQD(salesData?.totalRevenue ?? 0)} IQD</div>
      </div>
      <div class="kpi-cell">
        <div class="kpi-label">Net Profit</div>
        <div class="kpi-value ${(plData?.netProfit ?? 0) >= 0 ? 'green' : 'red'}">${fmtIQD(plData?.netProfit ?? 0)} IQD</div>
      </div>
      <div class="kpi-cell">
        <div class="kpi-label">Total Sales</div>
        <div class="kpi-value">${salesData?.totalSales ?? 0}</div>
      </div>
      <div class="kpi-cell">
        <div class="kpi-label">Purchase Cost</div>
        <div class="kpi-value">${fmtIQD(purchaseData?.totalCost ?? 0)} IQD</div>
      </div>
      <div class="kpi-cell">
        <div class="kpi-label">Outstanding Debt</div>
        <div class="kpi-value amber">${fmtIQD(debtData?.combinedDebt ?? 0)} IQD</div>
      </div>
      <div class="kpi-cell">
        <div class="kpi-label">Total Expenses</div>
        <div class="kpi-value red">${fmtIQD(plData?.totalExpenses ?? 0)} IQD</div>
      </div>
    </div>
  </div>

  <!-- Sales Breakdown -->
  <div class="section">
    <div class="section-title">Sales Breakdown</div>
    <div class="table-wrap">
      <table>
        <thead>
          <tr><th>Payment Method</th><th>Count</th><th style="text-align:right;">Revenue</th></tr>
        </thead>
        <tbody>
          <tr>
            <td>Cash</td>
            <td>${salesData?.cashCount ?? 0}</td>
            <td style="text-align:right;font-weight:600;">${fmtIQD(salesData?.cashRevenue ?? 0)} IQD</td>
          </tr>
          <tr>
            <td>FIB</td>
            <td>${salesData?.fibCount ?? 0}</td>
            <td style="text-align:right;font-weight:600;">${fmtIQD(salesData?.fibRevenue ?? 0)} IQD</td>
          </tr>
          <tr>
            <td>Credit / Debt</td>
            <td>${salesData?.debtCount ?? 0}</td>
            <td style="text-align:right;font-weight:600;">${fmtIQD(salesData?.debtRevenue ?? 0)} IQD</td>
          </tr>
          <tr class="total-row">
            <td>Total</td>
            <td>${salesData?.totalSales ?? 0}</td>
            <td style="text-align:right;">${fmtIQD(salesData?.totalRevenue ?? 0)} IQD</td>
          </tr>
        </tbody>
      </table>
    </div>
    ${salesData?.totalDiscounts ? `<p style="margin-top:10px;font-size:12px;color:#64748B;">Total Discounts Given: <strong style="color:#D97706;">${fmtIQD(salesData.totalDiscounts)} IQD</strong></p>` : ''}
  </div>

  <!-- Monthly Revenue -->
  <div class="section">
    <div class="section-title">Monthly Revenue (Last 6 Months)</div>
    <div class="table-wrap">
      <table>
        <thead>
          <tr><th>Month</th><th style="text-align:right;">Revenue</th><th style="text-align:right;">Profit</th><th style="text-align:right;">Sales</th></tr>
        </thead>
        <tbody>${monthlyRows}</tbody>
      </table>
    </div>
  </div>

  <!-- Profit & Loss -->
  <div class="section">
    <div class="section-title">Profit &amp; Loss</div>
    <div class="pl-row">
      <span class="pl-label">Gross Revenue</span>
      <span class="pl-value" style="color:#1E40AF;">${fmtIQD(plData?.grossRevenue ?? 0)} IQD</span>
    </div>
    <div class="pl-row pl-indent">
      <span class="pl-label" style="color:#64748B;">Cost of Goods Sold (COGS)</span>
      <span class="pl-value" style="color:#DC2626;">&minus;${fmtIQD(plData?.totalCOGS ?? 0)} IQD</span>
    </div>
    <div class="pl-subtotal">
      <span style="font-weight:700;color:#1E293B;">Gross Profit</span>
      <span style="font-weight:700;color:${colorVal(plData?.grossProfit ?? 0)};">${fmtIQD(plData?.grossProfit ?? 0)} IQD (${(plData?.grossMarginPct ?? 0).toFixed(1)}%)</span>
    </div>
    ${(plData?.expenseBreakdown ?? []).map((e) => `
      <div class="pl-row pl-indent">
        <span class="pl-label" style="color:#64748B;">${escHtml(e.category)}</span>
        <span class="pl-value" style="color:#DC2626;">&minus;${fmtIQD(e.total)} IQD</span>
      </div>
    `).join('')}
    <div class="pl-row">
      <span class="pl-label" style="font-weight:600;">Total Expenses</span>
      <span class="pl-value" style="color:#DC2626;">&minus;${fmtIQD(plData?.totalExpenses ?? 0)} IQD</span>
    </div>
    <div class="pl-row pl-net">
      <span style="font-size:17px;font-weight:800;color:#1E293B;">Net Profit</span>
      <span style="font-size:17px;font-weight:800;color:${colorVal(plData?.netProfit ?? 0)};">${fmtIQD(plData?.netProfit ?? 0)} IQD</span>
    </div>
  </div>

  <!-- Purchases -->
  <div class="section">
    <div class="section-title">Purchases</div>
    <div class="kpi-grid" style="margin-bottom:12px;">
      <div class="kpi-cell">
        <div class="kpi-label">Total Cost</div>
        <div class="kpi-value">${fmtIQD(purchaseData?.totalCost ?? 0)} IQD</div>
      </div>
      <div class="kpi-cell">
        <div class="kpi-label">Paid</div>
        <div class="kpi-value green">${fmtIQD(purchaseData?.paidCost ?? 0)} IQD</div>
      </div>
      <div class="kpi-cell">
        <div class="kpi-label">On Credit</div>
        <div class="kpi-value amber">${fmtIQD(purchaseData?.debtCost ?? 0)} IQD</div>
      </div>
    </div>
    ${purchaseData?.topSupplier ? `<p style="font-size:12.5px;color:#64748B;">Top Supplier: <strong style="color:#1E293B;">${escHtml(purchaseData.topSupplier)}</strong> (${fmtIQD(purchaseData.topSupplierCost)} IQD)</p>` : ''}
  </div>

  <!-- Debt Overview -->
  <div class="section">
    <div class="section-title">Debt Overview</div>
    <div class="kpi-grid">
      <div class="kpi-cell">
        <div class="kpi-label">Customers Owe</div>
        <div class="kpi-value amber">${fmtIQD(debtData?.totalSalesDebt ?? 0)} IQD</div>
      </div>
      <div class="kpi-cell">
        <div class="kpi-label">We Owe Suppliers</div>
        <div class="kpi-value red">${fmtIQD(debtData?.totalPurchaseDebt ?? 0)} IQD</div>
      </div>
      <div class="kpi-cell">
        <div class="kpi-label">Overdue Debts</div>
        <div class="kpi-value ${(debtData?.overdueCount ?? 0) > 0 ? 'red' : ''}">${debtData?.overdueCount ?? 0}</div>
      </div>
    </div>
  </div>

  <!-- Inventory Snapshot -->
  <div class="section">
    <div class="section-title">Inventory Snapshot</div>
    <div class="kpi-grid">
      <div class="kpi-cell">
        <div class="kpi-label">Stock Value</div>
        <div class="kpi-value blue">${fmtIQD(inventoryData?.stockValueSell ?? 0)} IQD</div>
      </div>
      <div class="kpi-cell">
        <div class="kpi-label">Potential Profit</div>
        <div class="kpi-value green">${fmtIQD(inventoryData?.potentialProfit ?? 0)} IQD</div>
      </div>
      <div class="kpi-cell">
        <div class="kpi-label">Active Products</div>
        <div class="kpi-value">${inventoryData?.activeProducts ?? 0}</div>
      </div>
      <div class="kpi-cell">
        <div class="kpi-label">Low Stock</div>
        <div class="kpi-value ${(inventoryData?.lowStockCount ?? 0) > 0 ? 'amber' : ''}">${inventoryData?.lowStockCount ?? 0}</div>
      </div>
      <div class="kpi-cell">
        <div class="kpi-label">Out of Stock</div>
        <div class="kpi-value ${(inventoryData?.outOfStockCount ?? 0) > 0 ? 'red' : ''}">${inventoryData?.outOfStockCount ?? 0}</div>
      </div>
      <div class="kpi-cell">
        <div class="kpi-label">Total Units</div>
        <div class="kpi-value">${fmtIQD(inventoryData?.totalStockUnits ?? 0)}</div>
      </div>
    </div>
  </div>

  <!-- Top Profitable Products -->
  <div class="section">
    <div class="section-title">Most Profitable Products</div>
    <div class="table-wrap">
      <table>
        <thead>
          <tr><th style="width:36px;">#</th><th>Product</th><th style="text-align:right;">Gross Profit</th><th style="text-align:right;">Margin</th></tr>
        </thead>
        <tbody>${profRows}</tbody>
      </table>
    </div>
  </div>

  <!-- Expenses -->
  <div class="section">
    <div class="section-title">Expenses &mdash; ${periodLabel}</div>
    <div class="table-wrap">
      <table>
        <thead>
          <tr><th>Date</th><th>Category</th><th>Note</th><th style="text-align:right;">Amount</th></tr>
        </thead>
        <tbody>${expRows}</tbody>
      </table>
    </div>
    ${expenses.length > 0 ? `<p style="margin-top:10px;font-size:13.5px;font-weight:700;text-align:right;color:#DC2626;">Total: ${fmtIQD(expTotal)} IQD</p>` : ''}
  </div>

  <div class="footer">
    <p>Generated by <strong>${escHtml(business.name)}</strong> &middot; ManagerX &middot; ${fmtDateTime(new Date().toISOString())}</p>
  </div>

</div>
</body>
</html>`;
}
