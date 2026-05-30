import type {
  SalesReportData, PurchaseReportData, ProfitLossData,
  InventoryReportSummary, DebtReportData, ProfitableProduct,
  RevenuePoint, Expense,
} from '@/lib/sqlite';
import type { DateRange } from '@/types/reports';

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

function fmt(n: number): string {
  return n.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

function fmtDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  });
}

function fmtDateTime(dateStr: string): string {
  return new Date(dateStr).toLocaleString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: 'numeric', minute: '2-digit',
  });
}

function colorVal(n: number): string {
  return n >= 0 ? '#16A34A' : '#DC2626';
}

export function buildFullReportHTML(
  data: FullReportData,
  business: BusinessInfo,
  dir: 'ltr' | 'rtl' = 'ltr'
): string {
  const lang = dir === 'rtl' ? 'ku' : 'en';
  const { salesData, purchaseData, plData, inventoryData, debtData,
    topProfitable, monthlyRevenue, expenses, dateRange } = data;

  const logoHTML = business.logoUri
    ? `<img src="${business.logoUri}" style="height:56px;object-fit:contain;margin-bottom:8px;" />`
    : '';

  const periodLabel = dateRange.key === 'custom'
    ? `${fmtDate(dateRange.from)} – ${fmtDate(dateRange.to)}`
    : escHtml(dateRange.label);

  // ── Monthly revenue table ──────────────────────────────────────────────────
  const monthlyRows = monthlyRevenue.length === 0
    ? `<tr><td colspan="4" style="text-align:center;color:#9CA3AF;padding:12px;">No data</td></tr>`
    : monthlyRevenue.map((r) => `
        <tr>
          <td>${escHtml(r.period)}</td>
          <td style="font-weight:600;">${fmt(r.revenue)} IQD</td>
          <td style="color:${colorVal(r.profit)};font-weight:600;">${fmt(r.profit)} IQD</td>
          <td>${r.sales}</td>
        </tr>
      `).join('');

  // ── Top profitable products table ──────────────────────────────────────────
  const profRows = topProfitable.length === 0
    ? `<tr><td colspan="4" style="text-align:center;color:#9CA3AF;padding:12px;">No data</td></tr>`
    : topProfitable.map((p, i) => `
        <tr>
          <td><strong>#${i + 1}</strong></td>
          <td>${escHtml(p.productName)}</td>
          <td style="color:${colorVal(p.grossProfit)};font-weight:600;">${fmt(p.grossProfit)} IQD</td>
          <td>${p.marginPct.toFixed(1)}%</td>
        </tr>
      `).join('');

  // ── Expense rows ───────────────────────────────────────────────────────────
  const expRows = expenses.length === 0
    ? `<tr><td colspan="4" style="text-align:center;color:#9CA3AF;padding:12px;">No expenses recorded</td></tr>`
    : expenses.map((e) => `
        <tr>
          <td>${fmtDate(e.date)}</td>
          <td><span style="background:#F3F4F6;padding:2px 8px;border-radius:12px;font-size:11px;">${escHtml(e.category)}</span></td>
          <td>${e.note ? escHtml(e.note) : '&mdash;'}</td>
          <td style="font-weight:600;color:#DC2626;">${fmt(e.amount)} IQD</td>
        </tr>
      `).join('');

  return `<!DOCTYPE html>
<html lang="${lang}" dir="${dir}">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <style>
    * { margin:0; padding:0; box-sizing:border-box; }
    body { font-family:-apple-system,'Helvetica Neue',Arial,sans-serif; background:#F9FAFB; color:#111827; }
    .page { max-width:720px; margin:0 auto; background:#fff; }

    /* Header */
    .header { background:linear-gradient(135deg,#1E40AF 0%,#3B82F6 100%); color:#fff; padding:32px 28px 28px; }
    .header-top { display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:20px; }
    .biz-name { font-size:22px; font-weight:800; margin-bottom:4px; }
    .biz-sub  { font-size:13px; opacity:0.8; }
    .report-badge { background:rgba(255,255,255,0.15); padding:6px 14px; border-radius:20px; font-size:12px; font-weight:700; }
    .period-banner { background:rgba(255,255,255,0.12); border-radius:12px; padding:12px 16px; margin-top:12px; }
    .period-label { font-size:11px; opacity:0.75; margin-bottom:3px; }
    .period-value { font-size:15px; font-weight:700; }

    /* Sections */
    .section { padding:20px 28px; border-bottom:1px solid #F3F4F6; }
    .section-title { font-size:14px; font-weight:700; color:#1E40AF; text-transform:uppercase; letter-spacing:0.5px; margin-bottom:14px; }

    /* KPI grid */
    .kpi-grid { display:grid; grid-template-columns:repeat(3,1fr); gap:10px; }
    .kpi-cell { background:#F9FAFB; border-radius:10px; padding:12px; text-align:center; }
    .kpi-label { font-size:11px; color:#9CA3AF; margin-bottom:4px; }
    .kpi-value { font-size:17px; font-weight:800; color:#111827; }
    .kpi-value.green { color:#16A34A; }
    .kpi-value.red   { color:#DC2626; }
    .kpi-value.blue  { color:#1E40AF; }
    .kpi-value.amber { color:#D97706; }

    /* Tables */
    table { width:100%; border-collapse:collapse; }
    th { background:#F9FAFB; padding:9px 12px; text-align:left; font-size:11px; font-weight:700; color:#6B7280; border-bottom:2px solid #E5E7EB; }
    td { padding:9px 12px; font-size:13px; border-bottom:1px solid #F3F4F6; vertical-align:middle; }
    tr:last-child td { border-bottom:none; }
    tr:nth-child(even) td { background:#FAFAFA; }

    /* P&L flow */
    .pl-row { display:flex; justify-content:space-between; padding:8px 0; border-bottom:1px solid #F3F4F6; }
    .pl-row:last-child { border-bottom:none; font-weight:700; font-size:16px; margin-top:4px; padding-top:12px; }
    .pl-label { font-size:14px; color:#374151; }
    .pl-value { font-size:14px; font-weight:600; }
    .pl-indent { padding-left:16px; }
    .pl-subtotal { background:#EFF6FF; border-radius:8px; padding:10px 12px; margin:8px 0; display:flex; justify-content:space-between; }

    /* Split bars */
    .split-bar { height:8px; border-radius:4px; background:#E5E7EB; overflow:hidden; margin:6px 0 2px; }
    .split-fill { height:100%; border-radius:4px; }

    .footer { padding:20px 28px; text-align:center; background:#F9FAFB; }
    .footer p { font-size:11px; color:#9CA3AF; }
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
      <div style="text-align:${dir === 'rtl' ? 'left' : 'right'};">
        <div class="report-badge">BUSINESS REPORT</div>
        <div style="font-size:11px;opacity:0.7;margin-top:6px;">Generated ${fmtDateTime(new Date().toISOString())}</div>
      </div>
    </div>
    <div class="period-banner">
      <div class="period-label">REPORTING PERIOD</div>
      <div class="period-value">${periodLabel}</div>
    </div>
  </div>

  <!-- Overview KPIs -->
  <div class="section">
    <div class="section-title">Overview</div>
    <div class="kpi-grid">
      <div class="kpi-cell">
        <div class="kpi-label">Total Revenue</div>
        <div class="kpi-value blue">${fmt(salesData?.totalRevenue ?? 0)} IQD</div>
      </div>
      <div class="kpi-cell">
        <div class="kpi-label">Net Profit</div>
        <div class="kpi-value ${(plData?.netProfit ?? 0) >= 0 ? 'green' : 'red'}">${fmt(plData?.netProfit ?? 0)} IQD</div>
      </div>
      <div class="kpi-cell">
        <div class="kpi-label">Total Sales</div>
        <div class="kpi-value">${salesData?.totalSales ?? 0}</div>
      </div>
      <div class="kpi-cell">
        <div class="kpi-label">Purchase Cost</div>
        <div class="kpi-value">${fmt(purchaseData?.totalCost ?? 0)} IQD</div>
      </div>
      <div class="kpi-cell">
        <div class="kpi-label">Outstanding Debt</div>
        <div class="kpi-value amber">${fmt(debtData?.combinedDebt ?? 0)} IQD</div>
      </div>
      <div class="kpi-cell">
        <div class="kpi-label">Total Expenses</div>
        <div class="kpi-value red">${fmt(plData?.totalExpenses ?? 0)} IQD</div>
      </div>
    </div>
  </div>

  <!-- Sales Breakdown -->
  <div class="section">
    <div class="section-title">Sales Breakdown</div>
    <table>
      <thead>
        <tr><th>Payment Method</th><th>Count</th><th>Revenue</th></tr>
      </thead>
      <tbody>
        <tr><td>Cash</td><td>${salesData?.cashCount ?? 0}</td><td style="font-weight:600;">${fmt(salesData?.cashRevenue ?? 0)} IQD</td></tr>
        <tr><td>FIB</td><td>${salesData?.fibCount ?? 0}</td><td style="font-weight:600;">${fmt(salesData?.fibRevenue ?? 0)} IQD</td></tr>
        <tr><td>Credit / Debt</td><td>${salesData?.debtCount ?? 0}</td><td style="font-weight:600;">${fmt(salesData?.debtRevenue ?? 0)} IQD</td></tr>
        <tr style="background:#EFF6FF;">
          <td style="font-weight:700;">Total</td>
          <td style="font-weight:700;">${salesData?.totalSales ?? 0}</td>
          <td style="font-weight:700;color:#1E40AF;">${fmt(salesData?.totalRevenue ?? 0)} IQD</td>
        </tr>
      </tbody>
    </table>
    ${salesData?.totalDiscounts ? `<p style="margin-top:8px;font-size:12px;color:#6B7280;">Total Discounts Given: <strong>${fmt(salesData.totalDiscounts)} IQD</strong></p>` : ''}
  </div>

  <!-- Monthly Revenue -->
  <div class="section">
    <div class="section-title">Monthly Revenue (Last 6 Months)</div>
    <table>
      <thead>
        <tr><th>Month</th><th>Revenue</th><th>Profit</th><th>Sales</th></tr>
      </thead>
      <tbody>${monthlyRows}</tbody>
    </table>
  </div>

  <!-- Profit & Loss -->
  <div class="section">
    <div class="section-title">Profit &amp; Loss</div>
    <div class="pl-row">
      <span class="pl-label">Gross Revenue</span>
      <span class="pl-value" style="color:#1E40AF;">${fmt(plData?.grossRevenue ?? 0)} IQD</span>
    </div>
    <div class="pl-row pl-indent">
      <span class="pl-label" style="color:#6B7280;">Cost of Goods Sold (COGS)</span>
      <span class="pl-value" style="color:#DC2626;">&minus;${fmt(plData?.totalCOGS ?? 0)} IQD</span>
    </div>
    <div class="pl-subtotal">
      <span style="font-weight:700;">Gross Profit</span>
      <span style="font-weight:700;color:${colorVal(plData?.grossProfit ?? 0)};">${fmt(plData?.grossProfit ?? 0)} IQD (${(plData?.grossMarginPct ?? 0).toFixed(1)}%)</span>
    </div>
    ${(plData?.expenseBreakdown ?? []).map((e) => `
      <div class="pl-row pl-indent">
        <span class="pl-label" style="color:#6B7280;">${escHtml(e.category)}</span>
        <span class="pl-value" style="color:#DC2626;">&minus;${fmt(e.total)} IQD</span>
      </div>
    `).join('')}
    <div class="pl-row">
      <span class="pl-label">Total Expenses</span>
      <span class="pl-value" style="color:#DC2626;">&minus;${fmt(plData?.totalExpenses ?? 0)} IQD</span>
    </div>
    <div class="pl-row" style="border-top:2px solid #E5E7EB;margin-top:8px;">
      <span style="font-size:16px;font-weight:800;">Net Profit</span>
      <span style="font-size:16px;font-weight:800;color:${colorVal(plData?.netProfit ?? 0)};">${fmt(plData?.netProfit ?? 0)} IQD</span>
    </div>
  </div>

  <!-- Purchases -->
  <div class="section">
    <div class="section-title">Purchases</div>
    <div class="kpi-grid" style="margin-bottom:12px;">
      <div class="kpi-cell">
        <div class="kpi-label">Total Cost</div>
        <div class="kpi-value">${fmt(purchaseData?.totalCost ?? 0)} IQD</div>
      </div>
      <div class="kpi-cell">
        <div class="kpi-label">Paid</div>
        <div class="kpi-value green">${fmt(purchaseData?.paidCost ?? 0)} IQD</div>
      </div>
      <div class="kpi-cell">
        <div class="kpi-label">On Credit</div>
        <div class="kpi-value amber">${fmt(purchaseData?.debtCost ?? 0)} IQD</div>
      </div>
    </div>
    ${purchaseData?.topSupplier ? `<p style="font-size:12px;color:#6B7280;">Top Supplier: <strong>${escHtml(purchaseData.topSupplier)}</strong> (${fmt(purchaseData.topSupplierCost)} IQD)</p>` : ''}
  </div>

  <!-- Debt Overview -->
  <div class="section">
    <div class="section-title">Debt Overview</div>
    <div class="kpi-grid">
      <div class="kpi-cell">
        <div class="kpi-label">Customers Owe</div>
        <div class="kpi-value amber">${fmt(debtData?.totalSalesDebt ?? 0)} IQD</div>
      </div>
      <div class="kpi-cell">
        <div class="kpi-label">We Owe Suppliers</div>
        <div class="kpi-value red">${fmt(debtData?.totalPurchaseDebt ?? 0)} IQD</div>
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
        <div class="kpi-value blue">${fmt(inventoryData?.stockValueSell ?? 0)} IQD</div>
      </div>
      <div class="kpi-cell">
        <div class="kpi-label">Potential Profit</div>
        <div class="kpi-value green">${fmt(inventoryData?.potentialProfit ?? 0)} IQD</div>
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
        <div class="kpi-value">${fmt(inventoryData?.totalStockUnits ?? 0)}</div>
      </div>
    </div>
  </div>

  <!-- Top Profitable Products -->
  <div class="section">
    <div class="section-title">Most Profitable Products</div>
    <table>
      <thead>
        <tr><th>#</th><th>Product</th><th>Gross Profit</th><th>Margin</th></tr>
      </thead>
      <tbody>${profRows}</tbody>
    </table>
  </div>

  <!-- Expenses -->
  <div class="section">
    <div class="section-title">Expenses (${periodLabel})</div>
    <table>
      <thead>
        <tr><th>Date</th><th>Category</th><th>Note</th><th>Amount</th></tr>
      </thead>
      <tbody>${expRows}</tbody>
    </table>
    ${expenses.length > 0 ? `<p style="margin-top:8px;font-size:13px;font-weight:700;text-align:right;color:#DC2626;">Total: ${fmt(expenses.reduce((s, e) => s + e.amount, 0))} IQD</p>` : ''}
  </div>

  <!-- Footer -->
  <div class="footer">
    <p>Generated by <strong>${escHtml(business.name)}</strong> &middot; ManagerX &middot; ${fmtDateTime(new Date().toISOString())}</p>
  </div>

</div>
</body>
</html>`;
}
