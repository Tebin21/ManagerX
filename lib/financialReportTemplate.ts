import type {
  SalesReportData, PurchaseReportData, ProfitLossData,
  InventoryReportSummary, DebtReportData, Expense,
  FinancialSummaryCards,
} from '@/lib/sqlite';
import type { DateRange } from '@/types/reports';
import { fmtIQD, fmtPct, formatDate as fmtDate, formatTime } from '@/utils/formatters';
import { KURDISH_FONT_FACE } from '@/lib/pdfFont';
import i18n from '@/lib/i18n';

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
  // PDF language follows the app's current language automatically -- no
  // separate PDF language setting. Numbers, currency, IDs, and user-entered
  // data (business/supplier names, categories typed free-form) are NEVER
  // routed through `ku()`/`t()` and so always keep rendering in the base
  // font stack with plain LTR digits, regardless of app language.
  const isKurdish = i18n.language === 'ku';
  const lang = isKurdish ? 'ku' : 'en';
  const t = (key: string, opts?: Record<string, unknown>): string =>
    i18n.t(`financialReportPdf.${key}`, opts) as string;
  const tCat = (cat: string): string =>
    i18n.t(`reports.expenseCategories.${cat}`, { defaultValue: cat }) as string;
  // Wraps already-translated label/title text in an RTL-shaped, Rudaw-fonted,
  // never-heavy span -- never changes the position/width of the surrounding
  // element it sits inside. `heading` swaps in a slightly larger size so
  // section titles stay visually distinct without relying on bold weight.
  const ku = (html: string, heading = false): string =>
    isKurdish ? `<span class="ku-text${heading ? ' ku-heading' : ''}" dir="rtl">${html}</span>` : html;
  // Text/label columns read right-to-left; number/date/amount columns stay
  // left-aligned even in Kurdish, per the report's RTL convention.
  const kuAlign = isKurdish ? 'right' : 'left';
  const numAlign = isKurdish ? 'left' : 'right';

  const {
    financialCards, salesData, purchaseData, plData,
    inventoryData, debtData, lossAnalysis, expenses, dateRange,
  } = data;

  const periodLabel = dateRange.key === 'custom'
    ? `${fmtDate(dateRange.from)} – ${fmtDate(dateRange.to)}`
    : escHtml(dateRange.label);
  // dateRange.label is itself an already-localized string for non-custom
  // periods (built via i18n.t() at the call site), so it needs the same
  // Kurdish font/RTL treatment as any other translated label; the custom
  // range's formatted date string never does.
  const periodLabelIsTranslated = dateRange.key !== 'custom';

  const id = reportId();
  const now = new Date().toISOString();

  // ── Header presentation ────────────────────────────────────────────────────
  const monogram = (business.name ?? '').trim().charAt(0).toUpperCase() || 'B';
  const logoHTML = business.logoUri
    ? `<img src="${business.logoUri}" class="logo-img" alt="logo" />`
    : `<div class="logo-mono">${escHtml(monogram)}</div>`;
  const reportTypeLabel = dateRange.key === 'custom' ? i18n.t('reports.customRange') : escHtml(dateRange.label);
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
          <td style="font-weight:700;text-align:${kuAlign};">#${i + 1} &nbsp;${escHtml(p.productName)}</td>
          <td class="right">${fmtIQD(p.qty)}</td>
          <td class="right" style="font-weight:700;">${lossVal(p.lossAmount)} IQD</td>
        </tr>
      `).join('');

  // ── Expense rows (only ever interpolated when non-empty) ───────────────────
  const expRows = expenses.map((e) => `
        <tr>
          <td style="text-align:left;">${fmtDate(e.date)}</td>
          <td style="text-align:${kuAlign};">${ku(escHtml(tCat(e.category)))}</td>
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
    .ku-text {
      font-family: 'Rudaw', sans-serif;
      direction: rtl;
      unicode-bidi: isolate;
      font-weight: 400;
      letter-spacing: normal;
      text-transform: none;
    }
    .ku-heading { font-size: 16px; }

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
    }
    .card-label {
      font-size: ${isKurdish ? '19px' : '10px'};
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 1.1px;
      color: #000000;
      margin-bottom: 12px;
      text-align: ${isKurdish ? 'right' : 'left'};
    }

    /* ── Dense label/value rows (sections with many rows) ── */
    .kv-table { width: 100%; border-collapse: collapse; direction: ${isKurdish ? 'rtl' : 'ltr'}; }
    .kv-table tr.kv-row td { padding: 6px 4px; font-size: 13px; vertical-align: baseline; }
    .kv-table tr.kv-row td.kv-lbl { color: #000000; font-weight: 500; width: 62%; text-align: ${kuAlign}; }
    .kv-table tr.kv-row td.kv-val { color: #000000; font-weight: 700; text-align: ${numAlign}; }
    .kv-table tr.kv-divider td { border-top: 1px solid #e2e8f0; padding-top: 10px; }

    /* ── Stand-out section totals (no fill, ever) ── */
    .total-block {
      display: flex;
      flex-direction: ${isKurdish ? 'row-reverse' : 'row'};
      justify-content: space-between;
      align-items: baseline;
      padding-top: 12px;
      margin-top: 6px;
      border-top: 1px solid #e2e8f0;
      page-break-inside: avoid;
    }
    .total-label { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: #000000; }
    .total-amount { font-size: 26px; font-weight: 800; color: #000000; letter-spacing: -0.4px; }

    /* ── Executive Summary ── */
    .metric-row {
      display: flex;
      flex-direction: ${isKurdish ? 'row-reverse' : 'row'};
      justify-content: space-between;
      align-items: baseline;
      padding: 8px 0;
      border-bottom: 1px solid #f1f5f9;
      page-break-inside: avoid;
    }
    .metric-row:last-child { border-bottom: none; }
    .metric-label { font-size: 12.5px; font-weight: 600; color: #000000; }
    .metric-note { display: block; font-size: 10.5px; font-weight: 400; color: #94a3b8; margin-top: 1px; }
    .metric-value { font-size: 16px; font-weight: 800; color: #000000; letter-spacing: -0.2px; white-space: nowrap; }

    .empty-line { font-size: 13px; color: #000000; padding: 4px 0; text-align: ${kuAlign}; }

    /* ── Itemized tables ── */
    .table-card {
      border: 1px solid #e2e8f0;
      border-radius: 14px;
      overflow: hidden;
      margin-bottom: 16px;
    }
    table { width: 100%; border-collapse: collapse; page-break-inside: auto; direction: ${isKurdish ? 'rtl' : 'ltr'}; }
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
    .right { text-align: ${numAlign}; }
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
        <div class="inv-label">${ku(t('title'), true)}</div>
        <div class="inv-meta-title">${ku(reportTypeLabel)}</div>
      </div>
      <div class="col-meta">
        <div class="inv-label">${ku(t('reportInfo'), true)}</div>
        <div class="inv-meta-line">${ku(t('reportId'))}: ${id}</div>
        <div class="inv-meta-line">${ku(t('date'))}: ${generatedDate}</div>
        <div class="inv-meta-line">${ku(t('time'))}: ${generatedTime}</div>
        ${dateRange.key === 'custom' ? `<div class="inv-meta-line">${ku(t('from'))}: ${fmtDate(dateRange.from)}</div>` : ''}
        ${dateRange.key === 'custom' ? `<div class="inv-meta-line">${ku(t('to'))}: ${fmtDate(dateRange.to)}</div>` : ''}
      </div>
    </div>
  </div>

  <div class="body">

    <!-- ═══════════════════════════ EXECUTIVE SUMMARY ═════════════════════════ -->
    <div class="card">
      <div class="card-label">${ku(t('executiveSummary'))}</div>

      <div class="metric-row">
        <span class="metric-label">${ku(t('totalSales'))}<span class="metric-note">${ku(t('invoicesNote', { count: invoiceCount }))}</span></span>
        <span class="metric-value">${fmtIQD(totalSales)} IQD</span>
      </div>
      <div class="metric-row">
        <span class="metric-label">${ku(t('netProfit'))}<span class="metric-note">${ku(grossRevenue > 0 ? t('netMarginNote', { pct: fmtPct(netProfitPL / grossRevenue * 100) }) : t('noRevenue'))}</span></span>
        <span class="metric-value">${netProfit >= 0 ? fmtIQD(netProfit) : lossVal(Math.abs(netProfit))} IQD</span>
      </div>
      <div class="metric-row">
        <span class="metric-label">${ku(t('totalLoss'))}<span class="metric-note">${ku(lossItemCount > 0 ? t('lossItemsNote', { count: lossItemCount }) : t('noLossItems'))}</span></span>
        <span class="metric-value">${lossVal(totalLoss)} IQD</span>
      </div>
      <div class="metric-row">
        <span class="metric-label">${ku(t('remainingDebt'))}<span class="metric-note">${ku(t('activeDebtsNote', { count: customerCount }))}</span></span>
        <span class="metric-value">${fmtIQD(remainingDebt)} IQD</span>
      </div>
    </div>

    <!-- ═══════════════════════════ FINANCIAL DETAILS ════════════════════════ -->
    <div class="card">
      <div class="card-label">${ku(t('financialDetails'))}</div>
      <table class="kv-table">
        <tr class="kv-row"><td class="kv-lbl">${ku(t('grossSalesRevenue'))}</td><td class="kv-val">${fmtIQD(grossRevenue)} IQD</td></tr>
        <tr class="kv-row"><td class="kv-lbl">${ku(t('cogs'))}</td><td class="kv-val">${lossVal(totalCOGS)} IQD</td></tr>
        <tr class="kv-row"><td class="kv-lbl" style="font-weight:700;">${ku(t('grossProfit'))}</td><td class="kv-val">${fmtIQD(grossProfit)} IQD</td></tr>

        <tr class="kv-divider"><td colspan="2"></td></tr>
        <tr class="kv-row"><td class="kv-lbl">${ku(t('cashPaymentsReceived'))}</td><td class="kv-val">${fmtIQD(cashRevenue)} IQD</td></tr>
        <tr class="kv-row"><td class="kv-lbl">${ku(t('fibPaymentsReceived'))}</td><td class="kv-val">${fmtIQD(fibRevenue)} IQD</td></tr>
        <tr class="kv-row"><td class="kv-lbl">${ku(t('totalDebtCollected'))}</td><td class="kv-val">${fmtIQD(debtCollected)} IQD</td></tr>
        <tr class="kv-row"><td class="kv-lbl">${ku(t('remainingCustomerDebt'))}</td><td class="kv-val">${fmtIQD(customerDebtLeft)} IQD</td></tr>

        <tr class="kv-divider"><td colspan="2"></td></tr>
        <tr class="kv-row"><td class="kv-lbl">${ku(t('totalPurchasesCost'))}</td><td class="kv-val">${lossVal(purchaseCost)} IQD</td></tr>
        <tr class="kv-row"><td class="kv-lbl">${ku(t('businessExpenses'))}</td><td class="kv-val">${lossVal(totalExpenses)} IQD</td></tr>
        <tr class="kv-row"><td class="kv-lbl">${ku(t('inventoryValueSell'))}</td><td class="kv-val">${fmtIQD(stockValue)} IQD</td></tr>
        <tr class="kv-row"><td class="kv-lbl">${ku(t('expectedProfitStock'))}</td><td class="kv-val">${fmtIQD(potentialProfit)} IQD</td></tr>

        <tr class="kv-divider"><td colspan="2"></td></tr>
        <tr class="kv-row"><td class="kv-lbl">${ku(t('numSalesInvoices'))}</td><td class="kv-val">${fmtIQD(invoiceCount)}</td></tr>
        <tr class="kv-row"><td class="kv-lbl">${ku(t('activeCustomerDebts'))}</td><td class="kv-val">${fmtIQD(customerCount)}</td></tr>
        <tr class="kv-row"><td class="kv-lbl">${ku(t('numSuppliers'))}</td><td class="kv-val">${fmtIQD(supplierCount)}</td></tr>
      </table>

      <div class="total-block">
        <span class="total-label">${ku(t('netProfitAfterCosts'))}</span>
        <span class="total-amount">${netProfitPL >= 0 ? fmtIQD(netProfitPL) : lossVal(Math.abs(netProfitPL))} IQD</span>
      </div>
    </div>

    <!-- ════════════════════════════ LOSS ANALYSIS ═══════════════════════════ -->
    <div class="card">
      <div class="card-label">${ku(t('lossAnalysis'))}</div>
      <table class="kv-table">
        <tr class="kv-row"><td class="kv-lbl">${ku(t('lossInvoicesNote'))}</td><td class="kv-val">${fmtIQD(lossSaleCount)}</td></tr>
        <tr class="kv-row"><td class="kv-lbl">${ku(t('lossLineItemsNote'))}</td><td class="kv-val">${fmtIQD(lossItemCount)}</td></tr>
      </table>

      <div class="total-block">
        <span class="total-label">${ku(t('totalBusinessLoss'))}</span>
        <span class="total-amount">${lossVal(lossTotal)} IQD</span>
      </div>
    </div>

    ${topLossProds.length > 0 ? `
    <div class="table-card">
      <table>
        <thead>
          <tr>
            <th style="text-align:${kuAlign};">${ku(t('product'))}</th>
            <th class="right">${ku(t('qtySold'))}</th>
            <th class="right">${ku(t('lossAmount'))}</th>
          </tr>
        </thead>
        <tbody>${lossProductRows}</tbody>
      </table>
    </div>` : ''}

    <!-- ═══════════════════════════ PURCHASE ANALYSIS ════════════════════════ -->
    <div class="card">
      <div class="card-label">${ku(t('purchaseAnalysis'))}</div>
      <table class="kv-table">
        <tr class="kv-row"><td class="kv-lbl">${ku(t('paidToSuppliers'))}</td><td class="kv-val">${fmtIQD(paidCost)} IQD</td></tr>
        <tr class="kv-row"><td class="kv-lbl">${ku(t('onCredit'))}</td><td class="kv-val">${fmtIQD(debtCost)} IQD</td></tr>
        <tr class="kv-row"><td class="kv-lbl">${ku(t('numPurchaseTransactions'))}</td><td class="kv-val">${fmtIQD(totalPurchases)}</td></tr>
        <tr class="kv-row"><td class="kv-lbl">${ku(t('uniqueSuppliers'))}</td><td class="kv-val">${fmtIQD(supplierCount)}</td></tr>
        ${topSupplier ? `<tr class="kv-row"><td class="kv-lbl">${ku(t('topSupplier'))}</td><td class="kv-val">${escHtml(topSupplier)} &mdash; ${fmtIQD(topSupplierCost)} IQD</td></tr>` : ''}
      </table>

      <div class="total-block">
        <span class="total-label">${ku(t('totalInventoryPurchases'))}</span>
        <span class="total-amount">${fmtIQD(purchaseCost)} IQD</span>
      </div>
    </div>

    <!-- ════════════════════════════ DEBT ANALYSIS ═══════════════════════════ -->
    ${debtAllZero ? `
    <div class="card">
      <div class="card-label">${ku(t('debtAnalysis'))}</div>
      <p class="empty-line">${ku(t('noOutstandingDebt'))}</p>
    </div>` : `
    <div class="card">
      <div class="card-label">${ku(t('debtAnalysis'))}</div>
      <table class="kv-table">
        <tr class="kv-row"><td class="kv-lbl">${ku(t('customerDebtOriginal'))}</td><td class="kv-val">${fmtIQD(salesDebtOriginal)} IQD</td></tr>
        <tr class="kv-row"><td class="kv-lbl">${ku(t('customerDebtCollected'))}</td><td class="kv-val">${fmtIQD(salesDebtCollected)} IQD</td></tr>
        <tr class="kv-row"><td class="kv-lbl" style="font-weight:700;">${ku(t('customerDebtRemaining'))}</td><td class="kv-val">${fmtIQD(totalSalesDebt)} IQD</td></tr>

        <tr class="kv-divider"><td colspan="2"></td></tr>
        <tr class="kv-row"><td class="kv-lbl">${ku(t('supplierDebtOriginal'))}</td><td class="kv-val">${fmtIQD(purchaseDebtOriginal)} IQD</td></tr>
        <tr class="kv-row"><td class="kv-lbl">${ku(t('supplierDebtPaid'))}</td><td class="kv-val">${fmtIQD(purchaseDebtPaid)} IQD</td></tr>
        <tr class="kv-row"><td class="kv-lbl" style="font-weight:700;">${ku(t('supplierDebtRemaining'))}</td><td class="kv-val">${fmtIQD(totalPurchaseDebt)} IQD</td></tr>

        <tr class="kv-divider"><td colspan="2"></td></tr>
        <tr class="kv-row"><td class="kv-lbl">${ku(t('overdueDebtsNote'))}</td><td class="kv-val">${fmtIQD(overdueCount)}</td></tr>
        <tr class="kv-row"><td class="kv-lbl">${ku(t('debtCollectionRate'))}</td><td class="kv-val">${collectionRate.toFixed(1)}%</td></tr>
      </table>

      <div class="total-block">
        <span class="total-label">${ku(t('combinedOutstandingDebt'))}</span>
        <span class="total-amount">${fmtIQD(combinedDebt)} IQD</span>
      </div>
    </div>`}

    <!-- ════════════════════════════ BUSINESS EXPENSES ═══════════════════════ -->
    ${expenses.length === 0 ? `
    <div class="card">
      <div class="card-label">${ku(t('businessExpenses'))}</div>
      <p class="empty-line">${ku(t('noExpensesPeriod'))}</p>
    </div>` : `
    <div class="table-card">
      <table>
        <thead>
          <tr>
            <th style="text-align:left;">${ku(t('date'))}</th>
            <th style="text-align:${kuAlign};">${ku(t('category'))}</th>
            <th class="right">${ku(t('amount'))}</th>
          </tr>
        </thead>
        <tbody>${expRows}</tbody>
        <tfoot>
          <tr class="total-row">
            <td colspan="2" style="text-align:${kuAlign};">${ku(t('totalExpenses'))}</td>
            <td class="right">${lossVal(expTotal)} IQD</td>
          </tr>
        </tfoot>
      </table>
    </div>`}

  </div>

  <!-- ════════════════════════════════ FOOTER ══════════════════════════════ -->
  <div class="footer">
    ${ku(t('generatedBy'))} ${t('common.appName')} &nbsp;&middot;&nbsp; ${generatedDate} ${generatedTime} &nbsp;&middot;&nbsp; ${periodLabelIsTranslated ? ku(periodLabel) : periodLabel}
  </div>

</body>
</html>`;
}
