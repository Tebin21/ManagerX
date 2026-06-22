import type {
  SalesReportData, PurchaseReportData, ProfitLossData,
  InventoryReportSummary, DebtReportData, Expense,
  FinancialSummaryCards,
} from '@/lib/sqlite';
import type { DateRange } from '@/types/reports';
import { fmtIQD, fmtPct, formatDate as fmtDate, formatTime } from '@/utils/formatters';
import { KURDISH_FONT_FACE } from '@/lib/pdfFont';

interface BusinessInfo {
  name: string;
  phone: string;
  address: string;
  logoUri: string | null;
}

export interface LossAnalysis {
  totalLossAmount: number;
  lossSaleCount: number;
  lossItemCount: number;
  topLossProducts: { productName: string; lossAmount: number; qty: number }[];
}

export interface FinancialExportData {
  financialCards:  FinancialSummaryCards    | null;
  salesData:       SalesReportData          | null;
  purchaseData:    PurchaseReportData       | null;
  plData:          ProfitLossData           | null;
  inventoryData:   InventoryReportSummary   | null;
  debtData:        DebtReportData           | null;
  lossAnalysis:    LossAnalysis             | null;
  expenses:        Expense[];
  dateRange:       DateRange;
}

function escHtml(str: string): string {
  return (str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function lossVal(n: number): string {
  return n > 0 ? `(${fmtIQD(n)})` : fmtIQD(0);
}

function reportId(): string {
  const ts = Date.now().toString(36).toUpperCase();
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `FIN-${ts}-${rand}`;
}

export function buildFinancialReportHTML(
  data: FinancialExportData,
  business: BusinessInfo,
  dir: 'ltr' | 'rtl' = 'ltr',
): string {
  const lang = 'en';
  const {
    financialCards, salesData, purchaseData, plData,
    inventoryData, debtData, lossAnalysis, expenses, dateRange,
  } = data;

  const periodLabel = dateRange.key === 'custom'
    ? `${fmtDate(dateRange.from)} – ${fmtDate(dateRange.to)}`
    : escHtml(dateRange.label);

  const id = reportId();
  const now = new Date().toISOString();

  // ── Header presentation ────────────────────────────────────────────────────
  const monogram = (business.name ?? '').trim().charAt(0).toUpperCase() || 'B';
  const logoHTML = business.logoUri
    ? `<img src="${business.logoUri}" class="logo-img" alt="logo" />`
    : `<div class="logo-mono">${escHtml(monogram)}</div>`;
  const reportTypeLabel = dateRange.key === 'custom' ? 'Custom Range' : escHtml(dateRange.label);
  const generatedDate = fmtDate(now);
  const generatedTime = formatTime(now);

  // ── Primary metrics ────────────────────────────────────────────────────────
  const totalSales        = financialCards?.totalSales            ?? 0;
  const netProfit         = financialCards?.netProfit             ?? 0;
  const totalLoss         = financialCards?.totalLoss             ?? 0;
  const remainingDebt     = financialCards?.remainingCustomerDebt ?? 0;

  // ── Financial details ──────────────────────────────────────────────────────
  const grossRevenue      = plData?.grossRevenue    ?? salesData?.totalRevenue ?? 0;
  const totalCOGS         = plData?.totalCOGS       ?? 0;
  const grossProfit       = plData?.grossProfit     ?? 0;
  const netProfitPL       = plData?.netProfit       ?? 0;
  const totalExpenses     = plData?.totalExpenses   ?? 0;
  const cashRevenue       = salesData?.cashRevenue  ?? 0;
  const fibRevenue        = salesData?.fibRevenue   ?? 0;
  const invoiceCount      = salesData?.totalSales   ?? 0;
  const debtCollected     = debtData?.salesDebtCollected  ?? 0;
  const customerDebtLeft  = debtData?.totalSalesDebt      ?? 0;
  const purchaseCost      = purchaseData?.totalCost       ?? 0;
  const stockValue        = inventoryData?.stockValueSell  ?? 0;
  const potentialProfit   = inventoryData?.potentialProfit ?? 0;
  const customerCount     = debtData?.activeSalesCount    ?? 0;
  const supplierCount     = purchaseData?.uniqueSuppliers ?? 0;

  // ── Loss analysis ──────────────────────────────────────────────────────────
  const lossTotal     = lossAnalysis?.totalLossAmount ?? totalLoss;
  const lossSaleCount = lossAnalysis?.lossSaleCount   ?? 0;
  const lossItemCount = lossAnalysis?.lossItemCount   ?? 0;
  const topLossProds  = lossAnalysis?.topLossProducts ?? [];

  // ── Purchase analysis ──────────────────────────────────────────────────────
  const paidCost          = purchaseData?.paidCost           ?? 0;
  const debtCost          = purchaseData?.debtCost           ?? 0;
  const totalPurchases    = purchaseData?.totalPurchases     ?? 0;
  const topSupplier       = purchaseData?.topSupplier        ?? null;
  const topSupplierCost   = purchaseData?.topSupplierCost    ?? 0;

  // ── Debt analysis ──────────────────────────────────────────────────────────
  const combinedDebt          = debtData?.combinedDebt         ?? 0;
  const salesDebtOriginal     = debtData?.salesDebtOriginal    ?? 0;
  const salesDebtCollected    = debtData?.salesDebtCollected   ?? 0;
  const totalSalesDebt        = debtData?.totalSalesDebt       ?? 0;
  const purchaseDebtOriginal  = debtData?.purchaseDebtOriginal ?? 0;
  const purchaseDebtPaid      = debtData?.purchaseDebtPaid     ?? 0;
  const totalPurchaseDebt     = debtData?.totalPurchaseDebt    ?? 0;
  const overdueCount          = debtData?.overdueCount         ?? 0;
  const collectionRate        = debtData?.collectionRate       ?? 0;
  const debtAllZero = combinedDebt === 0 && salesDebtOriginal === 0 && purchaseDebtOriginal === 0;

  // ── Loss products rows (only ever interpolated when non-empty) ────────────
  const lossProductRows = topLossProds.map((p, i) => `
        <tr>
          <td style="font-weight:700;">#${i + 1} &nbsp;${escHtml(p.productName)}</td>
          <td class="right">${fmtIQD(p.qty)}</td>
          <td class="right" style="font-weight:700;">${lossVal(p.lossAmount)} IQD</td>
        </tr>
      `).join('');

  // ── Expense rows (only ever interpolated when non-empty) ───────────────────
  const expRows = expenses.map((e) => `
        <tr>
          <td>${fmtDate(e.date)}</td>
          <td>${escHtml(e.category)}</td>
          <td class="right" style="font-weight:700;">${lossVal(e.amount)} IQD</td>
        </tr>
      `).join('');

  const expTotal = expenses.reduce((s, e) => s + e.amount, 0);

  const CSS = `
    ${KURDISH_FONT_FACE}
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      direction: ltr;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, 'Rudaw', sans-serif;
      background: #ffffff;
      color: #000000;
      font-size: 14px;
      line-height: 1.5;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }

    /* ── Header: 3-column (Business | Report Type | Report Info) ── */
    .header {
      padding: 24px 32px 20px;
      border-bottom: 1px solid #e2e8f0;
    }
    .header-cols {
      display: flex;
      align-items: flex-start;
      page-break-inside: avoid;
    }
    .col-business, .col-report, .col-meta {
      flex: 1 1 33%;
      min-width: 0;
      overflow-wrap: break-word;
      word-break: break-word;
    }
    .col-business { padding-right: 18px; }
    .col-report   { padding: 0 18px; border-left: 1px solid #e2e8f0; }
    .col-meta     { padding-left: 18px; border-left: 1px solid #e2e8f0; }

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
    .inv-label { font-size: 10.5px; font-weight: 700; text-transform: uppercase; letter-spacing: 1.4px; color: #000000; margin-bottom: 8px; }
    .inv-meta-title { font-size: 17px; font-weight: 800; color: #000000; margin-bottom: 6px; }
    .inv-meta-line { font-size: 12.5px; color: #000000; margin-bottom: 2px; }

    /* ── Body / Cards ── */
    .body { padding: 18px 32px 24px; }
    .card {
      border: 1px solid #e2e8f0;
      border-radius: 14px;
      padding: 18px 20px;
      margin-bottom: 16px;
      page-break-inside: avoid;
    }
    .card-label {
      font-size: 10px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 1.1px;
      color: #000000;
      margin-bottom: 12px;
    }

    /* ── Dense label/value rows (sections with many rows) ── */
    .kv-table { width: 100%; border-collapse: collapse; }
    .kv-table tr.kv-row td { padding: 6px 4px; font-size: 13px; vertical-align: baseline; }
    .kv-table tr.kv-row td.kv-lbl { color: #000000; font-weight: 500; width: 62%; }
    .kv-table tr.kv-row td.kv-val { color: #000000; font-weight: 700; text-align: right; }
    .kv-table tr.kv-divider td { border-top: 1px solid #e2e8f0; padding-top: 10px; }

    /* ── Stand-out section totals (no fill, ever) ── */
    .total-block {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
      padding-top: 12px;
      margin-top: 6px;
      border-top: 1px solid #e2e8f0;
    }
    .total-label { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: #000000; }
    .total-amount { font-size: 26px; font-weight: 800; color: #000000; letter-spacing: -0.4px; }

    /* ── Executive Summary ── */
    .metric-row {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
      padding: 8px 0;
      border-bottom: 1px solid #f1f5f9;
    }
    .metric-row:last-child { border-bottom: none; }
    .metric-label { font-size: 12.5px; font-weight: 600; color: #000000; }
    .metric-note { display: block; font-size: 10.5px; font-weight: 400; color: #94a3b8; margin-top: 1px; }
    .metric-value { font-size: 16px; font-weight: 800; color: #000000; letter-spacing: -0.2px; white-space: nowrap; }

    .empty-line { font-size: 13px; color: #000000; padding: 4px 0; }

    /* ── Itemized tables ── */
    .table-card {
      border: 1px solid #e2e8f0;
      border-radius: 14px;
      overflow: hidden;
      margin-bottom: 16px;
    }
    table { width: 100%; border-collapse: collapse; page-break-inside: auto; }
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
    .right { text-align: right; }
    tfoot .total-row td {
      font-weight: 800;
      color: #000000;
      border-top: 1.5px solid #e2e8f0;
      border-bottom: none;
      background: #ffffff;
    }

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

  return `<!DOCTYPE html>
<html lang="${lang}" dir="ltr">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Financial Report &mdash; ${escHtml(business.name)}</title>
  <style>${CSS}</style>
</head>
<body>

  <!-- ═══════════════════════════════ HEADER ═══════════════════════════════ -->
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
      <div class="col-report">
        <div class="inv-label">Financial Report</div>
        <div class="inv-meta-title">${reportTypeLabel}</div>
      </div>
      <div class="col-meta">
        <div class="inv-label">Report Info</div>
        <div class="inv-meta-line">Report ID: ${id}</div>
        <div class="inv-meta-line">Date: ${generatedDate}</div>
        <div class="inv-meta-line">Time: ${generatedTime}</div>
        ${dateRange.key === 'custom' ? `<div class="inv-meta-line">From: ${fmtDate(dateRange.from)}</div>` : ''}
        ${dateRange.key === 'custom' ? `<div class="inv-meta-line">To: ${fmtDate(dateRange.to)}</div>` : ''}
      </div>
    </div>
  </div>

  <div class="body">

    <!-- ═══════════════════════════ EXECUTIVE SUMMARY ═════════════════════════ -->
    <div class="card">
      <div class="card-label">Executive Summary</div>

      <div class="metric-row">
        <span class="metric-label">Total Sales<span class="metric-note">${invoiceCount} invoice${invoiceCount !== 1 ? 's' : ''}</span></span>
        <span class="metric-value">${fmtIQD(totalSales)} IQD</span>
      </div>
      <div class="metric-row">
        <span class="metric-label">Net Profit<span class="metric-note">${grossRevenue > 0 ? fmtPct(netProfitPL / grossRevenue * 100) + '% net margin' : 'No revenue'}</span></span>
        <span class="metric-value">${netProfit >= 0 ? fmtIQD(netProfit) : lossVal(Math.abs(netProfit))} IQD</span>
      </div>
      <div class="metric-row">
        <span class="metric-label">Total Loss<span class="metric-note">${lossItemCount > 0 ? lossItemCount + ' item' + (lossItemCount !== 1 ? 's' : '') + ' sold below cost' : 'No loss items'}</span></span>
        <span class="metric-value">${lossVal(totalLoss)} IQD</span>
      </div>
      <div class="metric-row">
        <span class="metric-label">Remaining Debt<span class="metric-note">${customerCount} active debt${customerCount !== 1 ? 's' : ''}</span></span>
        <span class="metric-value">${fmtIQD(remainingDebt)} IQD</span>
      </div>
    </div>

    <!-- ═══════════════════════════ FINANCIAL DETAILS ════════════════════════ -->
    <div class="card">
      <div class="card-label">Financial Details</div>
      <table class="kv-table">
        <tr class="kv-row"><td class="kv-lbl">Gross Sales Revenue</td><td class="kv-val">${fmtIQD(grossRevenue)} IQD</td></tr>
        <tr class="kv-row"><td class="kv-lbl">Cost of Goods Sold (COGS)</td><td class="kv-val">${lossVal(totalCOGS)} IQD</td></tr>
        <tr class="kv-row"><td class="kv-lbl" style="font-weight:700;">Gross Profit</td><td class="kv-val">${fmtIQD(grossProfit)} IQD</td></tr>

        <tr class="kv-divider"><td colspan="2"></td></tr>
        <tr class="kv-row"><td class="kv-lbl">Cash Payments Received</td><td class="kv-val">${fmtIQD(cashRevenue)} IQD</td></tr>
        <tr class="kv-row"><td class="kv-lbl">FIB Payments Received</td><td class="kv-val">${fmtIQD(fibRevenue)} IQD</td></tr>
        <tr class="kv-row"><td class="kv-lbl">Total Debt Collected</td><td class="kv-val">${fmtIQD(debtCollected)} IQD</td></tr>
        <tr class="kv-row"><td class="kv-lbl">Remaining Customer Debt</td><td class="kv-val">${fmtIQD(customerDebtLeft)} IQD</td></tr>

        <tr class="kv-divider"><td colspan="2"></td></tr>
        <tr class="kv-row"><td class="kv-lbl">Total Purchases Cost</td><td class="kv-val">${lossVal(purchaseCost)} IQD</td></tr>
        <tr class="kv-row"><td class="kv-lbl">Business Expenses</td><td class="kv-val">${lossVal(totalExpenses)} IQD</td></tr>
        <tr class="kv-row"><td class="kv-lbl">Inventory Value (sell price)</td><td class="kv-val">${fmtIQD(stockValue)} IQD</td></tr>
        <tr class="kv-row"><td class="kv-lbl">Expected Profit (remaining stock)</td><td class="kv-val">${fmtIQD(potentialProfit)} IQD</td></tr>

        <tr class="kv-divider"><td colspan="2"></td></tr>
        <tr class="kv-row"><td class="kv-lbl">Number of Sales Invoices</td><td class="kv-val">${fmtIQD(invoiceCount)}</td></tr>
        <tr class="kv-row"><td class="kv-lbl">Active Customer Debts</td><td class="kv-val">${fmtIQD(customerCount)}</td></tr>
        <tr class="kv-row"><td class="kv-lbl">Number of Suppliers</td><td class="kv-val">${fmtIQD(supplierCount)}</td></tr>
      </table>

      <div class="total-block">
        <span class="total-label">Net Profit (after all costs)</span>
        <span class="total-amount">${netProfitPL >= 0 ? fmtIQD(netProfitPL) : lossVal(Math.abs(netProfitPL))} IQD</span>
      </div>
    </div>

    <!-- ════════════════════════════ LOSS ANALYSIS ═══════════════════════════ -->
    <div class="card">
      <div class="card-label">Loss Analysis</div>
      <table class="kv-table">
        <tr class="kv-row"><td class="kv-lbl">Loss Invoices (contain below-cost items)</td><td class="kv-val">${fmtIQD(lossSaleCount)}</td></tr>
        <tr class="kv-row"><td class="kv-lbl">Loss Line Items (items sold below cost)</td><td class="kv-val">${fmtIQD(lossItemCount)}</td></tr>
      </table>

      <div class="total-block">
        <span class="total-label">Total Business Loss</span>
        <span class="total-amount">${lossVal(lossTotal)} IQD</span>
      </div>
    </div>

    ${topLossProds.length > 0 ? `
    <div class="table-card">
      <table>
        <thead>
          <tr>
            <th style="text-align:left;">Product</th>
            <th class="right">Qty Sold</th>
            <th class="right">Loss Amount</th>
          </tr>
        </thead>
        <tbody>${lossProductRows}</tbody>
      </table>
    </div>` : ''}

    <!-- ═══════════════════════════ PURCHASE ANALYSIS ════════════════════════ -->
    <div class="card">
      <div class="card-label">Purchase Analysis</div>
      <table class="kv-table">
        <tr class="kv-row"><td class="kv-lbl">Paid to Suppliers</td><td class="kv-val">${fmtIQD(paidCost)} IQD</td></tr>
        <tr class="kv-row"><td class="kv-lbl">On Credit (Supplier Debt)</td><td class="kv-val">${fmtIQD(debtCost)} IQD</td></tr>
        <tr class="kv-row"><td class="kv-lbl">Number of Purchase Transactions</td><td class="kv-val">${fmtIQD(totalPurchases)}</td></tr>
        <tr class="kv-row"><td class="kv-lbl">Unique Suppliers</td><td class="kv-val">${fmtIQD(supplierCount)}</td></tr>
        ${topSupplier ? `<tr class="kv-row"><td class="kv-lbl">Top Supplier</td><td class="kv-val">${escHtml(topSupplier)} &mdash; ${fmtIQD(topSupplierCost)} IQD</td></tr>` : ''}
      </table>

      <div class="total-block">
        <span class="total-label">Total Inventory Purchases</span>
        <span class="total-amount">${fmtIQD(purchaseCost)} IQD</span>
      </div>
    </div>

    <!-- ════════════════════════════ DEBT ANALYSIS ═══════════════════════════ -->
    ${debtAllZero ? `
    <div class="card">
      <div class="card-label">Debt Analysis</div>
      <p class="empty-line">No outstanding customer or supplier debt for this period.</p>
    </div>` : `
    <div class="card">
      <div class="card-label">Debt Analysis</div>
      <table class="kv-table">
        <tr class="kv-row"><td class="kv-lbl">Customer Debt &mdash; Original Amount</td><td class="kv-val">${fmtIQD(salesDebtOriginal)} IQD</td></tr>
        <tr class="kv-row"><td class="kv-lbl">Customer Debt &mdash; Collected</td><td class="kv-val">${fmtIQD(salesDebtCollected)} IQD</td></tr>
        <tr class="kv-row"><td class="kv-lbl" style="font-weight:700;">Customer Debt &mdash; Remaining</td><td class="kv-val">${fmtIQD(totalSalesDebt)} IQD</td></tr>

        <tr class="kv-divider"><td colspan="2"></td></tr>
        <tr class="kv-row"><td class="kv-lbl">Supplier Debt &mdash; Original Amount</td><td class="kv-val">${fmtIQD(purchaseDebtOriginal)} IQD</td></tr>
        <tr class="kv-row"><td class="kv-lbl">Supplier Debt &mdash; Paid</td><td class="kv-val">${fmtIQD(purchaseDebtPaid)} IQD</td></tr>
        <tr class="kv-row"><td class="kv-lbl" style="font-weight:700;">Supplier Debt &mdash; Remaining</td><td class="kv-val">${fmtIQD(totalPurchaseDebt)} IQD</td></tr>

        <tr class="kv-divider"><td colspan="2"></td></tr>
        <tr class="kv-row"><td class="kv-lbl">Overdue Debts (&gt;30 days inactive)</td><td class="kv-val">${fmtIQD(overdueCount)}</td></tr>
        <tr class="kv-row"><td class="kv-lbl">Debt Collection Rate</td><td class="kv-val">${collectionRate.toFixed(1)}%</td></tr>
      </table>

      <div class="total-block">
        <span class="total-label">Combined Outstanding Debt</span>
        <span class="total-amount">${fmtIQD(combinedDebt)} IQD</span>
      </div>
    </div>`}

    <!-- ════════════════════════════ BUSINESS EXPENSES ═══════════════════════ -->
    ${expenses.length === 0 ? `
    <div class="card">
      <div class="card-label">Business Expenses</div>
      <p class="empty-line">No expenses recorded for this period.</p>
    </div>` : `
    <div class="table-card">
      <table>
        <thead>
          <tr>
            <th style="text-align:left;">Date</th>
            <th style="text-align:left;">Category</th>
            <th class="right">Amount</th>
          </tr>
        </thead>
        <tbody>${expRows}</tbody>
        <tfoot>
          <tr class="total-row">
            <td colspan="2">Total Expenses</td>
            <td class="right">${lossVal(expTotal)} IQD</td>
          </tr>
        </tfoot>
      </table>
    </div>`}

  </div>

  <!-- ════════════════════════════════ FOOTER ══════════════════════════════ -->
  <div class="footer">
    Generated by ManagerX &nbsp;&middot;&nbsp; ${generatedDate} ${generatedTime} &nbsp;&middot;&nbsp; ${periodLabel}
  </div>

</body>
</html>`;
}
