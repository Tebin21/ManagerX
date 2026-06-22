import type {
  SalesReportData, PurchaseReportData, ProfitLossData,
  InventoryReportSummary, DebtReportData, Expense,
  FinancialSummaryCards,
} from '@/lib/sqlite';
import type { DateRange } from '@/types/reports';
import { fmtIQD, fmtPct, formatDate as fmtDate, formatDateTime as fmtDateTime } from '@/utils/formatters';
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

  // ── Loss products rows ─────────────────────────────────────────────────────
  const lossProductRows = topLossProds.length === 0
    ? `<tr><td colspan="3" style="text-align:center;color:#888;padding:14px;font-style:italic;">No products sold below cost</td></tr>`
    : topLossProds.map((p, i) => `
        <tr>
          <td style="font-weight:700;color:#555;">#${i + 1} &nbsp;${escHtml(p.productName)}</td>
          <td style="text-align:right;">${fmtIQD(p.qty)}</td>
          <td style="text-align:right;font-weight:700;">${lossVal(p.lossAmount)} IQD</td>
        </tr>
      `).join('');

  // ── Expense rows ───────────────────────────────────────────────────────────
  const expRows = expenses.length === 0
    ? `<tr><td colspan="3" style="text-align:center;color:#888;padding:14px;font-style:italic;">No expenses recorded</td></tr>`
    : expenses.map((e) => `
        <tr>
          <td style="color:#555;">${fmtDate(e.date)}</td>
          <td>${escHtml(e.category)}</td>
          <td style="text-align:right;font-weight:700;">${lossVal(e.amount)} IQD</td>
        </tr>
      `).join('');

  const expTotal = expenses.reduce((s, e) => s + e.amount, 0);

  const CSS = `
    ${KURDISH_FONT_FACE}
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      direction: ltr;
      font-family: 'Arial', 'Helvetica Neue', Helvetica, 'Rudaw', sans-serif;
      background: #FFFFFF;
      color: #111111;
      font-size: 13px;
      line-height: 1.6;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .page { max-width: 794px; margin: 0 auto; }

    /* ── Header ── */
    .header {
      background: #111111;
      color: #FFFFFF;
      padding: 32px 32px 24px;
    }
    .header-top {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 20px;
    }
    .biz-name { font-size: 20px; font-weight: 700; letter-spacing: 0.3px; margin-bottom: 4px; }
    .biz-contact { font-size: 11px; color: #AAAAAA; }
    .report-badge-label { font-size: 9px; font-weight: 700; letter-spacing: 2.5px; text-transform: uppercase; color: #777777; margin-bottom: 4px; }
    .report-id { font-size: 11px; font-weight: 600; color: #CCCCCC; font-family: monospace; }
    .period-bar {
      border-top: 1px solid #333333;
      padding-top: 16px;
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
    }
    .period-label { font-size: 9px; text-transform: uppercase; letter-spacing: 1.5px; color: #777777; margin-bottom: 4px; }
    .period-value { font-size: 17px; font-weight: 700; color: #FFFFFF; }
    .gen-info { font-size: 10px; color: #777777; text-align: ${dir === 'rtl' ? 'left' : 'right'}; line-height: 1.7; }

    /* ── Primary Metrics ── */
    .primary-section {
      padding: 28px 32px 24px;
      border-bottom: 3px solid #111111;
    }
    .primary-section-label {
      font-size: 9px; font-weight: 700; text-transform: uppercase;
      letter-spacing: 2.5px; color: #777777;
      margin-bottom: 18px;
      padding-bottom: 10px;
      border-bottom: 1px solid #E0E0E0;
    }
    .primary-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 14px;
    }
    .primary-cell {
      border: 2px solid #111111;
      padding: 18px 16px 14px;
    }
    .primary-cell.inverted {
      background: #111111;
    }
    .primary-cell-label {
      font-size: 9px; font-weight: 700; text-transform: uppercase;
      letter-spacing: 1.8px; color: #777777; margin-bottom: 10px;
    }
    .primary-cell.inverted .primary-cell-label { color: #888888; }
    .primary-cell-value {
      font-size: 26px; font-weight: 800; color: #111111;
      letter-spacing: -0.5px; line-height: 1.15;
      word-break: break-all;
    }
    .primary-cell.inverted .primary-cell-value { color: #FFFFFF; }
    .primary-cell-currency {
      font-size: 10px; font-weight: 600; color: #999999; margin-top: 5px;
    }
    .primary-cell.inverted .primary-cell-currency { color: #666666; }
    .primary-cell-note {
      font-size: 10px; color: #888888; margin-top: 3px; font-style: italic;
    }

    /* ── Sections ── */
    .section { padding: 24px 32px; border-bottom: 1px solid #E0E0E0; }
    .section:last-of-type { border-bottom: none; }
    .section-title {
      font-size: 9px; font-weight: 700; text-transform: uppercase;
      letter-spacing: 2.5px; color: #444444;
      border-left: 3px solid #111111;
      padding-left: 10px;
      margin-bottom: 18px;
      line-height: 1.4;
    }

    /* ── Detail Table (label/value rows) ── */
    .detail-table { width: 100%; border-collapse: collapse; }
    .detail-table tr { border-bottom: 1px solid #EEEEEE; }
    .detail-table tr:last-child { border-bottom: none; }
    .detail-table td {
      padding: 10px 6px;
      font-size: 13px;
      vertical-align: middle;
    }
    .detail-table td.lbl { color: #555555; font-weight: 400; width: 58%; }
    .detail-table td.val { font-weight: 700; text-align: right; color: #111111; }
    .detail-table tr.subtotal td {
      background: #F0F0F0;
      font-weight: 800;
      color: #111111;
      border-top: 1px solid #CCCCCC;
      border-bottom: 1px solid #CCCCCC;
    }
    .detail-table tr.grand td {
      background: #111111;
      color: #FFFFFF;
      font-weight: 800;
      font-size: 14px;
    }
    .detail-table tr.spacer td { padding: 4px 0; border: none; }

    /* ── Clean Table (with header) ── */
    .table-wrap { border: 1px solid #DDDDDD; overflow: hidden; margin-top: 14px; }
    .clean-table { width: 100%; border-collapse: collapse; }
    .clean-table th {
      background: #222222;
      color: #FFFFFF;
      padding: 10px 12px;
      font-size: 9px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 1px;
      text-align: left;
    }
    .clean-table td {
      padding: 10px 12px;
      font-size: 12.5px;
      border-bottom: 1px solid #EEEEEE;
      color: #333333;
      vertical-align: middle;
    }
    .clean-table tr:last-child td { border-bottom: none; }
    .clean-table tr:nth-child(even) td { background: #F7F7F7; }
    .clean-table .total-row td {
      background: #EEEEEE;
      font-weight: 800;
      color: #111111;
      border-top: 2px solid #BBBBBB;
    }

    /* ── Divider ── */
    .sub-label {
      font-size: 9px; font-weight: 700; text-transform: uppercase;
      letter-spacing: 1.5px; color: #777777; margin: 16px 0 8px;
    }

    /* ── Footer ── */
    .footer {
      background: #111111;
      padding: 20px 32px;
    }
    .footer-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 16px;
    }
    .footer-lbl {
      font-size: 8px; font-weight: 700; text-transform: uppercase;
      letter-spacing: 1.8px; color: #666666; margin-bottom: 4px;
    }
    .footer-val { font-size: 11px; font-weight: 600; color: #CCCCCC; }

    @media print {
      body { background: white; font-size: 11px; }
      .page { max-width: none; }
      .section { page-break-inside: avoid; }
      .primary-section { page-break-inside: avoid; }
      .header { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .footer { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    }
  `;

  return `<!DOCTYPE html>
<html lang="${lang}" dir="${dir}">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Financial Report &mdash; ${escHtml(business.name)}</title>
  <style>${CSS}</style>
</head>
<body>
<div class="page">

  <!-- ═══════════════════════════════ HEADER ═══════════════════════════════ -->
  <div class="header">
    <div class="header-top">
      <div>
        <div class="biz-name">${escHtml(business.name || 'Business')}</div>
        <div class="biz-contact">${[business.phone, business.address].filter(Boolean).map(escHtml).join(' &middot; ')}</div>
      </div>
      <div style="text-align:${dir === 'rtl' ? 'left' : 'right'};">
        <div class="report-badge-label">Financial Report</div>
        <div class="report-id">${id}</div>
      </div>
    </div>
    <div class="period-bar">
      <div>
        <div class="period-label">Report Period</div>
        <div class="period-value">${periodLabel}</div>
      </div>
      <div class="gen-info">
        Generated<br>${fmtDateTime(now)}
      </div>
    </div>
  </div>

  <!-- ═══════════════════════════ PRIMARY METRICS ══════════════════════════ -->
  <div class="primary-section">
    <div class="primary-section-label">Key Financial Indicators</div>
    <div class="primary-grid">

      <div class="primary-cell inverted">
        <div class="primary-cell-label">Total Sales</div>
        <div class="primary-cell-value">${fmtIQD(totalSales)}</div>
        <div class="primary-cell-currency">Iraqi Dinar (IQD)</div>
        <div class="primary-cell-note">${invoiceCount} invoice${invoiceCount !== 1 ? 's' : ''}</div>
      </div>

      <div class="primary-cell">
        <div class="primary-cell-label">Net Profit</div>
        <div class="primary-cell-value">${netProfit >= 0 ? fmtIQD(netProfit) : lossVal(Math.abs(netProfit))}</div>
        <div class="primary-cell-currency">Iraqi Dinar (IQD)</div>
        <div class="primary-cell-note">${grossRevenue > 0 ? fmtPct(netProfitPL / grossRevenue * 100) + '% net margin' : 'No revenue'}</div>
      </div>

      <div class="primary-cell">
        <div class="primary-cell-label">Total Loss</div>
        <div class="primary-cell-value">${lossVal(totalLoss)}</div>
        <div class="primary-cell-currency">Iraqi Dinar (IQD)</div>
        <div class="primary-cell-note">${lossItemCount > 0 ? lossItemCount + ' item' + (lossItemCount !== 1 ? 's' : '') + ' sold below cost' : 'No loss items'}</div>
      </div>

      <div class="primary-cell">
        <div class="primary-cell-label">Remaining Debt</div>
        <div class="primary-cell-value">${fmtIQD(remainingDebt)}</div>
        <div class="primary-cell-currency">Iraqi Dinar (IQD)</div>
        <div class="primary-cell-note">${customerCount} active debt${customerCount !== 1 ? 's' : ''}</div>
      </div>

    </div>
  </div>

  <!-- ═══════════════════════════ FINANCIAL DETAILS ════════════════════════ -->
  <div class="section">
    <div class="section-title">Financial Details</div>
    <table class="detail-table">
      <tr><td class="lbl">Gross Sales Revenue</td><td class="val">${fmtIQD(grossRevenue)} IQD</td></tr>
      <tr><td class="lbl">Cost of Goods Sold (COGS)</td><td class="val">${lossVal(totalCOGS)} IQD</td></tr>
      <tr class="subtotal"><td class="lbl">Gross Profit</td><td class="val">${fmtIQD(grossProfit)} IQD</td></tr>
      <tr class="spacer"><td colspan="2"></td></tr>
      <tr><td class="lbl">Cash Payments Received</td><td class="val">${fmtIQD(cashRevenue)} IQD</td></tr>
      <tr><td class="lbl">FIB Payments Received</td><td class="val">${fmtIQD(fibRevenue)} IQD</td></tr>
      <tr><td class="lbl">Total Debt Collected</td><td class="val">${fmtIQD(debtCollected)} IQD</td></tr>
      <tr><td class="lbl">Remaining Customer Debt</td><td class="val">${fmtIQD(customerDebtLeft)} IQD</td></tr>
      <tr class="spacer"><td colspan="2"></td></tr>
      <tr><td class="lbl">Total Purchases Cost</td><td class="val">${lossVal(purchaseCost)} IQD</td></tr>
      <tr><td class="lbl">Business Expenses</td><td class="val">${lossVal(totalExpenses)} IQD</td></tr>
      <tr class="subtotal"><td class="lbl">Net Profit (after all costs)</td><td class="val">${netProfitPL >= 0 ? fmtIQD(netProfitPL) : lossVal(Math.abs(netProfitPL))} IQD</td></tr>
      <tr class="spacer"><td colspan="2"></td></tr>
      <tr><td class="lbl">Inventory Value (sell price)</td><td class="val">${fmtIQD(stockValue)} IQD</td></tr>
      <tr><td class="lbl">Expected Profit (remaining stock)</td><td class="val">${fmtIQD(potentialProfit)} IQD</td></tr>
      <tr class="spacer"><td colspan="2"></td></tr>
      <tr><td class="lbl">Number of Sales Invoices</td><td class="val">${fmtIQD(invoiceCount)}</td></tr>
      <tr><td class="lbl">Active Customer Debts</td><td class="val">${fmtIQD(customerCount)}</td></tr>
      <tr><td class="lbl">Number of Suppliers</td><td class="val">${fmtIQD(supplierCount)}</td></tr>
    </table>
  </div>

  <!-- ════════════════════════════ LOSS ANALYSIS ═══════════════════════════ -->
  <div class="section">
    <div class="section-title">Loss Analysis</div>
    <table class="detail-table">
      <tr class="grand">
        <td class="lbl" style="color:#FFFFFF;">Total Business Loss</td>
        <td class="val" style="color:#FFFFFF;">${lossVal(lossTotal)} IQD</td>
      </tr>
      <tr><td class="lbl">Loss Invoices (contain below-cost items)</td><td class="val">${fmtIQD(lossSaleCount)}</td></tr>
      <tr><td class="lbl">Loss Line Items (items sold below cost)</td><td class="val">${fmtIQD(lossItemCount)}</td></tr>
    </table>

    ${topLossProds.length > 0 ? `
    <div class="sub-label">Products Sold Below Cost</div>
    <div class="table-wrap">
      <table class="clean-table">
        <thead>
          <tr>
            <th>Product</th>
            <th style="text-align:right;">Qty Sold</th>
            <th style="text-align:right;">Loss Amount</th>
          </tr>
        </thead>
        <tbody>${lossProductRows}</tbody>
      </table>
    </div>` : ''}
  </div>

  <!-- ═══════════════════════════ PURCHASE ANALYSIS ════════════════════════ -->
  <div class="section">
    <div class="section-title">Purchase Analysis</div>
    <table class="detail-table">
      <tr class="subtotal"><td class="lbl">Total Inventory Purchases</td><td class="val">${fmtIQD(purchaseCost)} IQD</td></tr>
      <tr><td class="lbl">Paid to Suppliers</td><td class="val">${fmtIQD(paidCost)} IQD</td></tr>
      <tr><td class="lbl">On Credit (Supplier Debt)</td><td class="val">${fmtIQD(debtCost)} IQD</td></tr>
      <tr><td class="lbl">Number of Purchase Transactions</td><td class="val">${fmtIQD(totalPurchases)}</td></tr>
      <tr><td class="lbl">Unique Suppliers</td><td class="val">${fmtIQD(supplierCount)}</td></tr>
      ${topSupplier ? `<tr><td class="lbl">Top Supplier</td><td class="val">${escHtml(topSupplier)} &mdash; ${fmtIQD(topSupplierCost)} IQD</td></tr>` : ''}
    </table>
  </div>

  <!-- ════════════════════════════ DEBT ANALYSIS ═══════════════════════════ -->
  <div class="section">
    <div class="section-title">Debt Analysis</div>
    <table class="detail-table">
      <tr class="grand">
        <td class="lbl" style="color:#FFFFFF;">Combined Outstanding Debt</td>
        <td class="val" style="color:#FFFFFF;">${fmtIQD(combinedDebt)} IQD</td>
      </tr>
      <tr class="spacer"><td colspan="2"></td></tr>
      <tr><td class="lbl">Customer Debt &mdash; Original Amount</td><td class="val">${fmtIQD(salesDebtOriginal)} IQD</td></tr>
      <tr><td class="lbl">Customer Debt &mdash; Collected</td><td class="val">${fmtIQD(salesDebtCollected)} IQD</td></tr>
      <tr class="subtotal"><td class="lbl">Customer Debt &mdash; Remaining</td><td class="val">${fmtIQD(totalSalesDebt)} IQD</td></tr>
      <tr class="spacer"><td colspan="2"></td></tr>
      <tr><td class="lbl">Supplier Debt &mdash; Original Amount</td><td class="val">${fmtIQD(purchaseDebtOriginal)} IQD</td></tr>
      <tr><td class="lbl">Supplier Debt &mdash; Paid</td><td class="val">${fmtIQD(purchaseDebtPaid)} IQD</td></tr>
      <tr class="subtotal"><td class="lbl">Supplier Debt &mdash; Remaining</td><td class="val">${fmtIQD(totalPurchaseDebt)} IQD</td></tr>
      <tr class="spacer"><td colspan="2"></td></tr>
      <tr><td class="lbl">Overdue Debts (&gt;30 days inactive)</td><td class="val">${fmtIQD(overdueCount)}</td></tr>
      <tr><td class="lbl">Debt Collection Rate</td><td class="val">${collectionRate.toFixed(1)}%</td></tr>
    </table>
  </div>

  <!-- ════════════════════════════ BUSINESS EXPENSES ═══════════════════════ -->
  <div class="section">
    <div class="section-title">Business Expenses</div>
    <div class="table-wrap">
      <table class="clean-table">
        <thead>
          <tr>
            <th>Date</th>
            <th>Category</th>
            <th style="text-align:right;">Amount</th>
          </tr>
        </thead>
        <tbody>${expRows}</tbody>
        ${expenses.length > 0 ? `
        <tfoot>
          <tr class="total-row">
            <td colspan="2" style="font-weight:800;">Total Expenses</td>
            <td style="text-align:right;font-weight:800;">${lossVal(expTotal)} IQD</td>
          </tr>
        </tfoot>` : ''}
      </table>
    </div>
  </div>

  <!-- ════════════════════════════════ FOOTER ══════════════════════════════ -->
  <div class="footer">
    <div class="footer-grid">
      <div>
        <div class="footer-lbl">Generated By</div>
        <div class="footer-val">${escHtml(business.name)} &middot; ManagerX</div>
      </div>
      <div>
        <div class="footer-lbl">Generation Date</div>
        <div class="footer-val">${fmtDateTime(now)}</div>
      </div>
      <div>
        <div class="footer-lbl">Report Period</div>
        <div class="footer-val">${periodLabel}</div>
      </div>
    </div>
  </div>

</div>
</body>
</html>`;
}
