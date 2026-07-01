import type { InventoryProduct } from '@/types/inventory';
import { fmtIQD, formatDate as fmtDate, formatDateShort, formatTime as fmtTime } from '@/utils/formatters';
import { KURDISH_FONT_FACE } from '@/lib/pdfFont';
import i18n from '@/lib/i18n';

interface BusinessInfo {
  name: string;
  phone: string;
  address: string;
  logoUri: string | null;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function escHtml(str: string): string {
  return (str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// Kurdish PDF language follows the app's current language automatically, same
// as every other report template -- there's no separate PDF language setting.
function isKurdishActive(): boolean {
  return i18n.language === 'ku';
}
function t(key: string, opts?: Record<string, unknown>): string {
  return i18n.t(`inventoryReportPdf.${key}`, opts) as string;
}
// Wraps an already-translated label in the Rudaw/RTL span. Never wraps
// numbers, dates, or raw product data (names, IDs, category/supplier text).
function ku(html: string): string {
  return isKurdishActive() ? `<span class="ku-text" dir="rtl">${html}</span>` : html;
}


function genReportId(prefix: 'INV' | 'LSK' | 'OOS' | 'CAT'): string {
  const now = new Date();
  const d = now.toISOString().slice(0, 10).replace(/-/g, '');
  const hex = Math.random().toString(16).slice(2, 6).toUpperCase();
  return `${prefix}-${d}-${hex}`;
}

function logoBlock(logoUri: string | null): string {
  if (!logoUri) return '';
  return `<img src="${logoUri}" style="height:54px;max-width:130px;object-fit:contain;display:block;background:#fff;border-radius:5px;padding:3px;margin-bottom:9px;" alt="logo" />`;
}

// ─── Manual row pagination ─────────────────────────────────────────────────
// expo-print's PDF pipeline (WebKit on iOS, Chromium print on Android) does
// not reliably honor `page-break-inside`/`break-inside: avoid` on <tr>, so a
// product row can still get sliced across a page boundary even with that CSS
// in place. Instead, row placement is decided here, in JS, before any HTML is
// emitted: for every row we check whether it fits in the space left on the
// current page; if it doesn't, a new page starts and the row is placed there
// instead. Each page is rendered as its own <table>, and a real (not "avoid")
// page-break-before is inserted between them -- that's a hard instruction to
// start a fresh page, not a fit-calculation hint, so it's honored reliably.
//
// The measurements below are computed directly from the fixed CSS in
// reportCSS() (row padding, font-size, line-height, borders) -- they track
// the real rendered height closely rather than being padded with a large
// blanket safety margin, so pages fill up almost completely instead of
// breaking early. The only deliberate slack is PAGE_CONTENT_HEIGHT_PX's
// one-row buffer (see below) plus MAX_ROWS_PER_PAGE, a backstop ceiling that
// only matters if a page's real content ever runs taller than expected.
const PX_PER_MM = 96 / 25.4;
// A4 (297mm) minus the @page 15mm top/bottom margins (~1009px), minus roughly
// one table row's worth of buffer -- this is the "leave about one row of
// slack before breaking" margin, not a large blanket safety cushion.
const PAGE_CONTENT_HEIGHT_PX = Math.floor((297 - 15 - 15) * PX_PER_MM) - 40;
const TABLE_HEADER_ROW_HEIGHT_PX = 40; // thead th row: padding 10+10 + line-height(10.5*1.5) + border
const TABLE_BODY_ROW_HEIGHT_PX = 40;   // tbody td row: padding 9+9 + line-height(12.5*1.5) + border
const REPORT_HEADER_NO_KPI_PX = 300;   // header block + period banner + section label (no KPI grid)
const REPORT_HEADER_WITH_KPI_PX = 400; // same, plus the KPI grid
// Backstop ceiling on rows per page, well above what the height estimates
// above would ever pack onto one page -- guards against the header-block
// estimate being off (e.g. extra-long wrapped business address) without
// forcing early breaks on ordinary pages.
const MAX_ROWS_PER_PAGE = 24;

// Splits `bodyRows` into per-page chunks so a row is never split across a
// page boundary: each row is checked against the remaining space on the
// current page (and against the hard row-count ceiling) before being placed
// there; if it doesn't fit, a new page starts and the row goes there instead.
function paginateRows<T>(bodyRows: T[], firstPageHeaderPx: number): T[][] {
  const pages: T[][] = [];
  let currentPage: T[] = [];
  let remaining = PAGE_CONTENT_HEIGHT_PX - firstPageHeaderPx - TABLE_HEADER_ROW_HEIGHT_PX;

  for (const row of bodyRows) {
    const pageFull = currentPage.length > 0 &&
      (TABLE_BODY_ROW_HEIGHT_PX > remaining || currentPage.length >= MAX_ROWS_PER_PAGE);
    if (pageFull) {
      pages.push(currentPage);
      currentPage = [];
      remaining = PAGE_CONTENT_HEIGHT_PX - TABLE_HEADER_ROW_HEIGHT_PX;
    }
    currentPage.push(row);
    remaining -= TABLE_BODY_ROW_HEIGHT_PX;
  }
  if (currentPage.length > 0) pages.push(currentPage);
  return pages;
}

// Renders `bodyRows` as one or more <table>s (one per page), each with its
// own repeated header row, forcing a real page break before every table
// after the first. `tfootHTML` (if given) is only attached to the last page.
function renderPaginatedTable(opts: {
  theadRowHTML: string;
  bodyRows: string[];
  tfootHTML?: string;
  headerBudgetPx: number;
}): string {
  const pages = paginateRows(opts.bodyRows, opts.headerBudgetPx);
  return pages.map((pageRows, i) => {
    const isFirst = i === 0;
    const isLast = i === pages.length - 1;
    return `
    <div class="table-wrap"${isFirst ? '' : ' style="page-break-before: always;"'}>
      <table>
        <thead><tr>${opts.theadRowHTML}</tr></thead>
        <tbody>${pageRows.join('')}</tbody>
        ${isLast && opts.tfootHTML ? `<tfoot><tr>${opts.tfootHTML}</tr></tfoot>` : ''}
      </table>
    </div>`;
  }).join('');
}

// ─── Shared white/monochrome CSS ──────────────────────────────────────────────
// Mirrors lib/invoiceTemplate.ts's SALES_CSS design tokens so inventory reports
// feel like part of the same ManagerX PDF system.

function reportCSS(isKurdish: boolean): string {
  const kuAlign = isKurdish ? 'right' : 'left';
  const numAlign = isKurdish ? 'left' : 'right';
  return `
    ${KURDISH_FONT_FACE}
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      direction: ${isKurdish ? 'rtl' : 'ltr'};
      text-align: ${isKurdish ? 'right' : 'left'};
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, 'Rudaw', sans-serif;
      background: #ffffff;
      color: #000000;
      font-size: 13px;
      line-height: 1.5;
    }
    .ku-text { font-family: 'Rudaw', sans-serif; direction: rtl; unicode-bidi: isolate; font-weight: 400; letter-spacing: normal; text-transform: none; }
    .page { max-width: 900px; margin: 0 auto; background: #fff; }

    /* ── Header ── */
    .header {
      padding: 24px 32px 20px;
      border-bottom: 1px solid #e2e8f0;
    }
    .header-inner {
      display: flex;
      direction: ltr;
      justify-content: space-between;
      align-items: flex-start;
      gap: 20px;
    }
    .biz-name { font-size: 17px; font-weight: ${isKurdish ? 400 : 800}; letter-spacing: -0.3px; color: #000000; }
    .biz-meta { color: #000000; font-size: 12px; margin-top: 4px; line-height: 1.6; }
    .report-title-col { text-align: right; }
    .report-title { font-size: 16px; font-weight: ${isKurdish ? 400 : 800}; letter-spacing: 0.5px; text-transform: ${isKurdish ? 'none' : 'uppercase'}; color: #000000; }
    .report-subtitle { color: #475569; font-size: 12px; margin-top: 3px; }
    .report-id {
      display: inline-block;
      margin-top: 8px;
      font-size: 11px;
      font-weight: ${isKurdish ? 400 : 700};
      letter-spacing: 0.8px;
      color: ${isKurdish ? '#000000' : '#94a3b8'};
      text-transform: uppercase;
    }
    .report-date { color: ${isKurdish ? '#000000' : '#94a3b8'}; font-size: 11.5px; margin-top: 4px; }

    /* ── Body ── */
    .body { padding: 22px 32px 32px; }

    /* ── Period banner ── */
    .period-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      padding: 12px 16px;
      margin-bottom: 20px;
    }
    .period-label {
      font-size: 10px;
      font-weight: ${isKurdish ? 400 : 700};
      text-transform: ${isKurdish ? 'none' : 'uppercase'};
      letter-spacing: ${isKurdish ? 'normal' : '1px'};
      color: #64748b;
    }
    .period-value { font-size: 14px; font-weight: ${isKurdish ? 400 : 700}; color: #000000; direction: ltr; unicode-bidi: isolate; }

    /* ── KPI grid ── */
    .kpi-grid { display: flex; gap: 10px; margin-bottom: 22px; }
    .kpi-card {
      flex: 1;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 14px;
      padding: 14px 14px 12px;
    }
    .kpi-label {
      font-size: 10px;
      font-weight: ${isKurdish ? 400 : 700};
      text-transform: ${isKurdish ? 'none' : 'uppercase'};
      letter-spacing: ${isKurdish ? 'normal' : '0.8px'};
      color: #64748b;
      margin-bottom: 6px;
      text-align: ${kuAlign};
    }
    .kpi-value { font-size: 17px; font-weight: ${isKurdish ? 400 : 800}; color: #000000; line-height: 1.2; text-align: ${kuAlign}; }

    /* ── Section label ── */
    .section-label {
      font-size: 10px;
      font-weight: ${isKurdish ? 400 : 700};
      text-transform: ${isKurdish ? 'none' : 'uppercase'};
      letter-spacing: ${isKurdish ? 'normal' : '0.8px'};
      color: #64748b;
      margin-bottom: 10px;
      padding-bottom: 7px;
      border-bottom: 1px solid #e2e8f0;
      text-align: ${kuAlign};
    }

    /* ── Table ── */
    .table-wrap {
      border: 1px solid #e2e8f0;
      border-radius: 14px;
      overflow: hidden;
    }
    table { width: 100%; border-collapse: collapse; font-size: 12.5px; direction: ${isKurdish ? 'rtl' : 'ltr'}; }
    thead tr { background: #f8fafc; }
    th {
      padding: 10px 11px;
      text-align: ${kuAlign};
      font-size: 10.5px;
      font-weight: ${isKurdish ? 400 : 700};
      text-transform: ${isKurdish ? 'none' : 'uppercase'};
      letter-spacing: 0.5px;
      color: #000000;
      white-space: nowrap;
      border-bottom: 1.5px solid #e2e8f0;
    }
    td {
      padding: 9px 11px;
      border-bottom: 1px solid #f1f5f9;
      vertical-align: middle;
      color: #000000;
    }
    tbody tr:nth-child(even) { background: #f8fafc; }
    tr:last-child td { border-bottom: none; }
    tfoot tr { background: #f8fafc; }
    tfoot td {
      border-top: 2px solid #e2e8f0;
      font-weight: ${isKurdish ? 400 : 700};
      font-size: 12.5px;
      padding: 11px;
      color: #000000;
    }

    /* ── Status badges (monochrome) ── */
    .badge-instock {
      display: inline-block;
      border: 1px solid #e2e8f0;
      border-radius: 20px;
      padding: 2px 8px;
      font-size: 10.5px;
      color: #475569;
      white-space: nowrap;
    }
    .badge-lowstock {
      display: inline-block;
      border: 1.5px solid #000000;
      border-radius: 20px;
      padding: 2px 8px;
      font-size: 10.5px;
      font-weight: ${isKurdish ? 400 : 700};
      color: #000000;
      white-space: nowrap;
    }
    .badge-outofstock {
      display: inline-block;
      background: #000000;
      border-radius: 20px;
      padding: 2px 8px;
      font-size: 10.5px;
      font-weight: ${isKurdish ? 400 : 700};
      color: #ffffff;
      white-space: nowrap;
    }
    .badge-sold {
      font-style: ${isKurdish ? 'normal' : 'italic'};
      color: #94a3b8;
      font-size: 11px;
    }

    /* ── Footer ── */
    .footer {
      background: #f8fafc;
      border-top: 1px solid #e2e8f0;
      text-align: center;
      padding: 14px 32px 18px;
      color: #94a3b8;
      font-size: 11px;
    }
    .footer strong { color: #475569; font-weight: 700; }

    /* ── Print / A4 ── */
    @page { size: A4; margin: 15mm; }
    thead { display: table-header-group; }
    tr { page-break-inside: avoid; }
    @media print {
      body { background: #fff; }
      .page { max-width: 100%; }
      thead tr { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .kpi-card { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    }
  `;
}

// ─── Shared header block ──────────────────────────────────────────────────────

// title/subtitle arrive pre-escaped and, for Kurdish, already ku()-wrapped --
// callers own that so raw data embedded in a subtitle (e.g. a category name)
// gets escaped before the translated label text around it does not.
function reportHeaderBlock(
  business: BusinessInfo,
  title: string,
  subtitle: string,
  reportId: string,
  dateStr: string,
  timeStr: string,
  isKurdish: boolean,
): string {
  // Kurdish puts the logo and business text side by side (logo left, name/
  // phone/address stacked to its right) instead of logo-above-text -- the
  // narrow logo-width column English uses cramps longer Kurdish business
  // names. English keeps its original stacked layout untouched.
  const bizBlock = isKurdish
    ? `<div style="display:flex;align-items:center;gap:10px;">
        ${logoBlock(business.logoUri)}
        <div>
          <div class="biz-name">${escHtml(business.name || 'Business')}</div>
          ${business.phone ? `<div class="biz-meta">${escHtml(business.phone)}</div>` : ''}
          ${business.address ? `<div class="biz-meta">${escHtml(business.address)}</div>` : ''}
        </div>
      </div>`
    : `<div>
        ${logoBlock(business.logoUri)}
        <div class="biz-name">${escHtml(business.name || 'Business')}</div>
        <div class="biz-meta">
          ${business.phone ? escHtml(business.phone) : ''}
          ${business.phone && business.address ? ' &middot; ' : ''}
          ${business.address ? escHtml(business.address) : ''}
        </div>
      </div>`;

  return `
  <div class="header">
    <div class="header-inner">
      ${bizBlock}
      <div class="report-title-col">
        <div class="report-title">${title}</div>
        ${subtitle ? `<div class="report-subtitle">${subtitle}</div>` : ''}
        <div class="report-id">${escHtml(reportId)}</div>
        <div class="report-date">${dateStr} &middot; ${timeStr}</div>
      </div>
    </div>
  </div>`;
}

function periodBannerBlock(periodLabel: string, isKurdish: boolean): string {
  const label = isKurdish ? ku(escHtml(t('period'))) : 'Period';
  return `
    <div class="period-row">
      <div class="period-label">${label}</div>
      <div class="period-value">${escHtml(periodLabel)}</div>
    </div>`;
}

// ─── Full Inventory Report ────────────────────────────────────────────────────

export function buildFullInventoryReportHTML(
  products: InventoryProduct[],
  business: BusinessInfo,
  lowStockIds: Set<number>,
  periodLabel: string,
  _dir: 'ltr' | 'rtl' = 'ltr',
): string {
  const isKurdish = isKurdishActive();
  const lang = isKurdish ? 'ku' : 'en';
  const dir = isKurdish ? 'rtl' : 'ltr';
  const kuAlign = isKurdish ? 'right' : 'left';
  const numAlign = isKurdish ? 'left' : 'right';
  const now = new Date();
  const dateStr = isKurdish ? formatDateShort(now) : fmtDate(now);
  const timeStr = fmtTime(now);
  const reportId = genReportId('INV');
  const totalQuantity = products.reduce((s, p) => s + p.quantity, 0);
  const totalValueIQD = products.reduce((s, p) => s + p.purchasePrice * p.quantity, 0);
  const estProfit = products.reduce((s, p) => s + (p.sellingPrice - p.purchasePrice) * p.quantity, 0);

  const rows = products.map((p) => {
    const isSold = !p.isActive || (p.idMode === 'unique' && p.quantity === 0);
    const isLow  = !isSold && lowStockIds.has(p.id);
    const totalVal = fmtIQD(p.purchasePrice * p.quantity);

    let statusCell: string;
    if (isSold) {
      statusCell = isKurdish
        ? `<span class="badge-sold">${ku(escHtml(t('sold')))}</span>`
        : `<span class="badge-sold">Sold</span>`;
    } else if (isLow) {
      statusCell = isKurdish
        ? `<span class="badge-lowstock">${ku(escHtml(t('lowStockBadge')))} &#9888;</span>`
        : `<span class="badge-lowstock">Low Stock &#9888;</span>`;
    } else {
      statusCell = isKurdish
        ? `<span class="badge-instock">${ku(escHtml(t('inStock')))}</span>`
        : `<span class="badge-instock">In Stock</span>`;
    }

    return `
      <tr>
        <td style="font-weight:${isKurdish ? 400 : 600};text-align:${kuAlign};unicode-bidi:plaintext;">${escHtml(p.name)}</td>
        <td style="color:#475569;font-size:11px;text-align:${kuAlign};unicode-bidi:plaintext;">${escHtml(p.itemId ?? '—')}</td>
        <td style="color:#475569;text-align:${kuAlign};unicode-bidi:plaintext;">${escHtml(p.category)}</td>
        <td style="text-align:center;font-weight:${isKurdish ? 400 : 600};">${isSold ? `<span style="color:#94a3b8;font-style:${isKurdish ? 'normal' : 'italic'};">—</span>` : String(p.quantity)}</td>
        <td style="text-align:${numAlign};direction:ltr;unicode-bidi:isolate;color:#475569;">${fmtIQD(p.purchasePrice)} IQD</td>
        <td style="text-align:${numAlign};direction:ltr;unicode-bidi:isolate;color:#000000;font-weight:${isKurdish ? 400 : 600};">${fmtIQD(p.sellingPrice)} IQD</td>
        <td style="text-align:${numAlign};direction:ltr;unicode-bidi:isolate;font-weight:${isKurdish ? 400 : 700};">${totalVal} IQD</td>
        <td style="color:#475569;text-align:${kuAlign};unicode-bidi:plaintext;">${escHtml(p.supplierName ?? '—')}</td>
        <td style="text-align:center;">${statusCell}</td>
      </tr>`;
  });

  const titleHTML = isKurdish ? ku(escHtml(t('title'))) : 'Inventory Report';
  const allProductsLabel = isKurdish
    ? ku(escHtml(t('allProducts', { count: products.length })))
    : `All Products (${products.length})`;

  return `<!DOCTYPE html>
<html lang="${lang}" dir="${dir}">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>${isKurdish ? escHtml(t('title')) : 'Full Inventory Report'}</title>
<style>${reportCSS(isKurdish)}</style>
</head>
<body>
<div class="page">

  ${reportHeaderBlock(business, titleHTML, '', reportId, dateStr, timeStr, isKurdish)}

  <div class="body">

    ${periodBannerBlock(periodLabel, isKurdish)}

    <div class="kpi-grid">
      <div class="kpi-card">
        <div class="kpi-label">${isKurdish ? ku(escHtml(t('totalProducts'))) : 'Total Products'}</div>
        <div class="kpi-value">${fmtIQD(products.length)}</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-label">${isKurdish ? ku(escHtml(t('totalQuantity'))) : 'Total Quantity'}</div>
        <div class="kpi-value">${fmtIQD(totalQuantity)}</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-label">${isKurdish ? ku(escHtml(t('totalValue'))) : 'Total Value'}</div>
        <div class="kpi-value">${fmtIQD(totalValueIQD)} IQD</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-label">${isKurdish ? ku(escHtml(t('estProfit'))) : 'Est. Profit'}</div>
        <div class="kpi-value">${fmtIQD(estProfit)} IQD</div>
      </div>
    </div>

    <div class="section-label">${allProductsLabel}</div>
    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th>${isKurdish ? ku(escHtml(t('product'))) : 'Product'}</th>
            <th>${isKurdish ? ku(escHtml(t('id'))) : 'ID'}</th>
            <th>${isKurdish ? ku(escHtml(t('category'))) : 'Category'}</th>
            <th style="text-align:center;">${isKurdish ? ku(escHtml(t('qty'))) : 'Qty'}</th>
            <th style="text-align:${numAlign};">${isKurdish ? ku(escHtml(t('buyPrice'))) : 'Buy Price'}</th>
            <th style="text-align:${numAlign};">${isKurdish ? ku(escHtml(t('sellPrice'))) : 'Sell Price'}</th>
            <th style="text-align:${numAlign};">${isKurdish ? ku(escHtml(t('totalValue'))) : 'Total Value'}</th>
            <th>${isKurdish ? ku(escHtml(t('supplier'))) : 'Supplier'}</th>
            <th style="text-align:center;">${isKurdish ? ku(escHtml(t('status'))) : 'Status'}</th>
          </tr>
        </thead>
        <tbody>${rows.join('')}</tbody>
        <tfoot>
          <tr>
            <td colspan="6" style="text-align:${kuAlign};color:#475569;font-weight:500;">${isKurdish ? ku(escHtml(t('totalInventoryValue'))) : 'Total Inventory Value:'}</td>
            <td style="text-align:${numAlign};direction:ltr;unicode-bidi:isolate;">${fmtIQD(totalValueIQD)} IQD</td>
            <td colspan="2"></td>
          </tr>
        </tfoot>
      </table>
    </div>

  </div>

  <div class="footer">
    ${isKurdish
      ? `${ku(escHtml(t('generatedBy')))} ${escHtml(business.name || 'Business')} &middot; ManagerX &middot; ${dateStr} &middot; ${timeStr}`
      : `Generated By: <strong>${escHtml(business.name || 'Business')}</strong> &middot; ManagerX &middot; ${dateStr} at ${timeStr}`}
  </div>

</div>
</body>
</html>`;
}

// ─── Low Stock Report ─────────────────────────────────────────────────────────

export function buildLowStockReportHTML(
  products: InventoryProduct[],
  business: BusinessInfo,
  periodLabel: string,
  _dir: 'ltr' | 'rtl' = 'ltr',
): string {
  const isKurdish = isKurdishActive();
  const lang = isKurdish ? 'ku' : 'en';
  const dir = isKurdish ? 'rtl' : 'ltr';
  const kuAlign = isKurdish ? 'right' : 'left';
  const now = new Date();
  const dateStr = isKurdish ? formatDateShort(now) : fmtDate(now);
  const timeStr = fmtTime(now);
  const reportId = genReportId('LSK');

  const rows = products.map((p) => `
    <tr>
      <td style="font-weight:${isKurdish ? 400 : 600};text-align:${kuAlign};unicode-bidi:plaintext;">${escHtml(p.name)}</td>
      <td style="color:#475569;font-size:11px;text-align:${kuAlign};unicode-bidi:plaintext;">${escHtml(p.itemId ?? '—')}</td>
      <td style="color:#475569;text-align:${kuAlign};unicode-bidi:plaintext;">${escHtml(p.category)}</td>
      <td style="text-align:center;font-weight:${isKurdish ? 400 : 700};color:#000000;">${p.quantity}</td>
      <td style="color:#475569;text-align:${kuAlign};unicode-bidi:plaintext;">${escHtml(p.supplierName ?? '—')}</td>
      <td style="text-align:center;"><span class="badge-lowstock">${isKurdish ? ku(escHtml(t('lowStockBadge'))) : 'Low Stock'} &#9888;</span></td>
    </tr>`);

  const titleHTML = isKurdish ? ku(escHtml(t('lowStockReportTitle'))) : 'Low Stock Report';
  const subtitleHTML = isKurdish
    ? ku(escHtml(t('lowStockSubtitle', { count: products.length })))
    : `${products.length} product${products.length !== 1 ? 's' : ''} below threshold`;
  const sectionLabel = isKurdish
    ? ku(escHtml(t('lowStockSection', { count: products.length })))
    : `Low Stock Products (${products.length})`;

  return `<!DOCTYPE html>
<html lang="${lang}" dir="${dir}">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>${isKurdish ? escHtml(t('lowStockReportTitle')) : 'Low Stock Report'}</title>
<style>${reportCSS(isKurdish)}</style>
</head>
<body>
<div class="page">

  ${reportHeaderBlock(business, titleHTML, subtitleHTML, reportId, dateStr, timeStr, isKurdish)}

  <div class="body">
    ${periodBannerBlock(periodLabel, isKurdish)}
    <div class="section-label">${sectionLabel}</div>
    ${renderPaginatedTable({
      theadRowHTML: `
            <th>${isKurdish ? ku(escHtml(t('product'))) : 'Product'}</th>
            <th>${isKurdish ? ku(escHtml(t('id'))) : 'ID'}</th>
            <th>${isKurdish ? ku(escHtml(t('category'))) : 'Category'}</th>
            <th style="text-align:center;">${isKurdish ? ku(escHtml(t('qtyRemaining'))) : 'Qty Remaining'}</th>
            <th>${isKurdish ? ku(escHtml(t('supplier'))) : 'Supplier'}</th>
            <th style="text-align:center;">${isKurdish ? ku(escHtml(t('status'))) : 'Status'}</th>`,
      bodyRows: rows,
      headerBudgetPx: REPORT_HEADER_NO_KPI_PX,
    })}
  </div>

  <div class="footer">
    ${isKurdish
      ? `${ku(escHtml(t('generatedBy')))} ${escHtml(business.name || 'Business')} &middot; ManagerX &middot; ${dateStr} &middot; ${timeStr}`
      : `Generated By: <strong>${escHtml(business.name || 'Business')}</strong> &middot; ManagerX &middot; ${dateStr} at ${timeStr}`}
  </div>

</div>
</body>
</html>`;
}

// ─── Out of Stock Report ──────────────────────────────────────────────────────

export function buildOutOfStockReportHTML(
  products: InventoryProduct[],
  business: BusinessInfo,
  periodLabel: string,
  _dir: 'ltr' | 'rtl' = 'ltr',
): string {
  const isKurdish = isKurdishActive();
  const lang = isKurdish ? 'ku' : 'en';
  const dir = isKurdish ? 'rtl' : 'ltr';
  const kuAlign = isKurdish ? 'right' : 'left';
  const now = new Date();
  const dateStr = isKurdish ? formatDateShort(now) : fmtDate(now);
  const timeStr = fmtTime(now);
  const reportId = genReportId('OOS');

  const rows = products.map((p) => `
    <tr>
      <td style="font-weight:${isKurdish ? 400 : 600};text-align:${kuAlign};unicode-bidi:plaintext;">${escHtml(p.name)}</td>
      <td style="color:#475569;font-size:11px;text-align:${kuAlign};unicode-bidi:plaintext;">${escHtml(p.itemId ?? '—')}</td>
      <td style="color:#475569;text-align:${kuAlign};unicode-bidi:plaintext;">${escHtml(p.category)}</td>
      <td style="text-align:center;font-weight:${isKurdish ? 400 : 700};color:#000000;">${p.quantity}</td>
      <td style="color:#475569;text-align:${kuAlign};unicode-bidi:plaintext;">${escHtml(p.supplierName ?? '—')}</td>
      <td style="text-align:center;"><span class="badge-outofstock">${isKurdish ? ku(escHtml(t('outOfStock'))) : 'Out of Stock'}</span></td>
    </tr>`);

  const titleHTML = isKurdish ? ku(escHtml(t('outOfStockReportTitle'))) : 'Out of Stock Report';
  const subtitleHTML = isKurdish
    ? ku(escHtml(t('outOfStockSubtitle', { count: products.length })))
    : `${products.length} product${products.length !== 1 ? 's' : ''} with zero quantity`;
  const sectionLabel = isKurdish
    ? ku(escHtml(t('outOfStockSection', { count: products.length })))
    : `Out of Stock Products (${products.length})`;

  return `<!DOCTYPE html>
<html lang="${lang}" dir="${dir}">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>${isKurdish ? escHtml(t('outOfStockReportTitle')) : 'Out of Stock Report'}</title>
<style>${reportCSS(isKurdish)}</style>
</head>
<body>
<div class="page">

  ${reportHeaderBlock(business, titleHTML, subtitleHTML, reportId, dateStr, timeStr, isKurdish)}

  <div class="body">
    ${periodBannerBlock(periodLabel, isKurdish)}
    <div class="section-label">${sectionLabel}</div>
    ${renderPaginatedTable({
      theadRowHTML: `
            <th>${isKurdish ? ku(escHtml(t('product'))) : 'Product'}</th>
            <th>${isKurdish ? ku(escHtml(t('id'))) : 'ID'}</th>
            <th>${isKurdish ? ku(escHtml(t('category'))) : 'Category'}</th>
            <th style="text-align:center;">${isKurdish ? ku(escHtml(t('qtyRemaining'))) : 'Qty Remaining'}</th>
            <th>${isKurdish ? ku(escHtml(t('supplier'))) : 'Supplier'}</th>
            <th style="text-align:center;">${isKurdish ? ku(escHtml(t('status'))) : 'Status'}</th>`,
      bodyRows: rows,
      headerBudgetPx: REPORT_HEADER_NO_KPI_PX,
    })}
  </div>

  <div class="footer">
    ${isKurdish
      ? `${ku(escHtml(t('generatedBy')))} ${escHtml(business.name || 'Business')} &middot; ManagerX &middot; ${dateStr} &middot; ${timeStr}`
      : `Generated By: <strong>${escHtml(business.name || 'Business')}</strong> &middot; ManagerX &middot; ${dateStr} at ${timeStr}`}
  </div>

</div>
</body>
</html>`;
}

// ─── Category Report ──────────────────────────────────────────────────────────

export function buildCategoryReportHTML(
  products: InventoryProduct[],
  categoryName: string,
  business: BusinessInfo,
  periodLabel: string,
  _dir: 'ltr' | 'rtl' = 'ltr',
): string {
  const isKurdish = isKurdishActive();
  const lang = isKurdish ? 'ku' : 'en';
  const dir = isKurdish ? 'rtl' : 'ltr';
  const kuAlign = isKurdish ? 'right' : 'left';
  const numAlign = isKurdish ? 'left' : 'right';
  const now = new Date();
  const dateStr = isKurdish ? formatDateShort(now) : fmtDate(now);
  const timeStr = fmtTime(now);
  const reportId = genReportId('CAT');
  const categoryNameSafe = escHtml(categoryName);

  const totalQty   = products.reduce((s, p) => s + p.quantity, 0);
  const totalValue = products.reduce((s, p) => s + p.purchasePrice * p.quantity, 0);
  const estProfit  = products.reduce((s, p) => s + (p.sellingPrice - p.purchasePrice) * p.quantity, 0);

  const rows = products.map((p) => {
    const val = fmtIQD(p.purchasePrice * p.quantity);
    const isSold = !p.isActive || (p.idMode === 'unique' && p.quantity === 0);
    return `
      <tr>
        <td style="font-weight:${isKurdish ? 400 : 600};text-align:${kuAlign};unicode-bidi:plaintext;">${escHtml(p.name)}</td>
        <td style="color:#475569;font-size:11px;text-align:${kuAlign};unicode-bidi:plaintext;">${escHtml(p.itemId ?? '—')}</td>
        <td style="text-align:center;font-weight:${isKurdish ? 400 : 600};">${isSold ? `<span style="color:#94a3b8;font-style:${isKurdish ? 'normal' : 'italic'};">—</span>` : String(p.quantity)}</td>
        <td style="text-align:${numAlign};direction:ltr;unicode-bidi:isolate;color:#475569;">${fmtIQD(p.purchasePrice)} IQD</td>
        <td style="text-align:${numAlign};direction:ltr;unicode-bidi:isolate;color:#000000;font-weight:${isKurdish ? 400 : 600};">${fmtIQD(p.sellingPrice)} IQD</td>
        <td style="text-align:${numAlign};direction:ltr;unicode-bidi:isolate;font-weight:${isKurdish ? 400 : 700};">${val} IQD</td>
        <td style="color:#475569;text-align:${kuAlign};unicode-bidi:plaintext;">${escHtml(p.supplierName ?? '—')}</td>
      </tr>`;
  });

  const titleHTML = isKurdish ? ku(escHtml(t('categoryReportTitle'))) : 'Category Report';
  const subtitleHTML = isKurdish
    ? ku(t('categorySubtitle', { name: categoryNameSafe }))
    : `Category: ${categoryNameSafe}`;
  const sectionLabel = isKurdish
    ? ku(t('categorySection', { name: categoryNameSafe, count: products.length }))
    : `${categoryNameSafe} — Products (${products.length})`;

  return `<!DOCTYPE html>
<html lang="${lang}" dir="${dir}">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>${isKurdish ? `${escHtml(t('categoryReportTitle'))} — ${categoryNameSafe}` : `Category Report — ${categoryNameSafe}`}</title>
<style>${reportCSS(isKurdish)}</style>
</head>
<body>
<div class="page">

  ${reportHeaderBlock(business, titleHTML, subtitleHTML, reportId, dateStr, timeStr, isKurdish)}

  <div class="body">

    ${periodBannerBlock(periodLabel, isKurdish)}

    <div class="kpi-grid">
      <div class="kpi-card">
        <div class="kpi-label">${isKurdish ? ku(escHtml(t('products'))) : 'Products'}</div>
        <div class="kpi-value">${products.length}</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-label">${isKurdish ? ku(escHtml(t('totalQuantity'))) : 'Total Quantity'}</div>
        <div class="kpi-value">${fmtIQD(totalQty)}</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-label">${isKurdish ? ku(escHtml(t('totalValue'))) : 'Total Value'}</div>
        <div class="kpi-value">${fmtIQD(totalValue)} IQD</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-label">${isKurdish ? ku(escHtml(t('estProfit'))) : 'Est. Profit'}</div>
        <div class="kpi-value">${fmtIQD(estProfit)} IQD</div>
      </div>
    </div>

    <div class="section-label">${sectionLabel}</div>
    ${renderPaginatedTable({
      theadRowHTML: `
            <th>${isKurdish ? ku(escHtml(t('product'))) : 'Product'}</th>
            <th>${isKurdish ? ku(escHtml(t('id'))) : 'ID'}</th>
            <th style="text-align:center;">${isKurdish ? ku(escHtml(t('qty'))) : 'Qty'}</th>
            <th style="text-align:${numAlign};">${isKurdish ? ku(escHtml(t('buyPrice'))) : 'Buy Price'}</th>
            <th style="text-align:${numAlign};">${isKurdish ? ku(escHtml(t('sellPrice'))) : 'Sell Price'}</th>
            <th style="text-align:${numAlign};">${isKurdish ? ku(escHtml(t('totalValue'))) : 'Total Value'}</th>
            <th>${isKurdish ? ku(escHtml(t('supplier'))) : 'Supplier'}</th>`,
      bodyRows: rows,
      tfootHTML: `
            <td colspan="5" style="text-align:${kuAlign};color:#475569;font-weight:500;">${isKurdish ? ku(escHtml(t('categoryTotalValue'))) : 'Category Total Value:'}</td>
            <td style="text-align:${numAlign};direction:ltr;unicode-bidi:isolate;">${fmtIQD(totalValue)} IQD</td>
            <td></td>`,
      headerBudgetPx: REPORT_HEADER_WITH_KPI_PX,
    })}

  </div>

  <div class="footer">
    ${isKurdish
      ? `${ku(escHtml(t('generatedBy')))} ${escHtml(business.name || 'Business')} &middot; ManagerX &middot; ${dateStr} &middot; ${timeStr}`
      : `Generated By: <strong>${escHtml(business.name || 'Business')}</strong> &middot; ManagerX &middot; ${dateStr} at ${timeStr}`}
  </div>

</div>
</body>
</html>`;
}
