import type { InventoryProduct } from '@/types/inventory';
import { fmtIQD, formatDate as fmtDate, formatTime as fmtTime } from '@/utils/formatters';
import { KURDISH_FONT_FACE } from '@/lib/pdfFont';

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

// ─── Shared white/monochrome CSS ──────────────────────────────────────────────
// Mirrors lib/invoiceTemplate.ts's SALES_CSS design tokens so inventory reports
// feel like part of the same ManagerX PDF system.

function reportCSS(dir: 'ltr' | 'rtl'): string {
  const alignEnd = dir === 'rtl' ? 'left' : 'right';
  return `
    ${KURDISH_FONT_FACE}
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      direction: ltr;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, 'Rudaw', sans-serif;
      background: #ffffff;
      color: #000000;
      font-size: 13px;
      line-height: 1.5;
    }
    .page { max-width: 900px; margin: 0 auto; background: #fff; }

    /* ── Header ── */
    .header {
      padding: 24px 32px 20px;
      border-bottom: 1px solid #e2e8f0;
    }
    .header-inner {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 20px;
    }
    .biz-name { font-size: 17px; font-weight: 800; letter-spacing: -0.3px; color: #000000; }
    .biz-meta { color: #000000; font-size: 12px; margin-top: 4px; line-height: 1.6; }
    .report-title-col { text-align: ${alignEnd}; }
    .report-title { font-size: 16px; font-weight: 800; letter-spacing: 0.5px; text-transform: uppercase; color: #000000; }
    .report-subtitle { color: #475569; font-size: 12px; margin-top: 3px; }
    .report-id {
      display: inline-block;
      margin-top: 8px;
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 0.8px;
      color: #94a3b8;
      text-transform: uppercase;
    }
    .report-date { color: #94a3b8; font-size: 11.5px; margin-top: 4px; }

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
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 1px;
      color: #64748b;
    }
    .period-value { font-size: 14px; font-weight: 700; color: #000000; }

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
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.8px;
      color: #64748b;
      margin-bottom: 6px;
    }
    .kpi-value { font-size: 17px; font-weight: 800; color: #000000; line-height: 1.2; }

    /* ── Section label ── */
    .section-label {
      font-size: 10px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.8px;
      color: #64748b;
      margin-bottom: 10px;
      padding-bottom: 7px;
      border-bottom: 1px solid #e2e8f0;
    }

    /* ── Table ── */
    .table-wrap {
      border: 1px solid #e2e8f0;
      border-radius: 14px;
      overflow: hidden;
    }
    table { width: 100%; border-collapse: collapse; font-size: 12.5px; }
    thead tr { background: #f8fafc; }
    th {
      padding: 10px 11px;
      text-align: left;
      font-size: 10.5px;
      font-weight: 700;
      text-transform: uppercase;
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
      font-weight: 700;
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
      font-weight: 700;
      color: #000000;
      white-space: nowrap;
    }
    .badge-outofstock {
      display: inline-block;
      background: #000000;
      border-radius: 20px;
      padding: 2px 8px;
      font-size: 10.5px;
      font-weight: 700;
      color: #ffffff;
      white-space: nowrap;
    }
    .badge-sold {
      font-style: italic;
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

function reportHeaderBlock(
  business: BusinessInfo,
  title: string,
  subtitle: string,
  reportId: string,
  dateStr: string,
  timeStr: string,
): string {
  return `
  <div class="header">
    <div class="header-inner">
      <div>
        ${logoBlock(business.logoUri)}
        <div class="biz-name">${escHtml(business.name || 'Business')}</div>
        <div class="biz-meta">
          ${business.phone ? escHtml(business.phone) : ''}
          ${business.phone && business.address ? ' &middot; ' : ''}
          ${business.address ? escHtml(business.address) : ''}
        </div>
      </div>
      <div class="report-title-col">
        <div class="report-title">${escHtml(title)}</div>
        ${subtitle ? `<div class="report-subtitle">${escHtml(subtitle)}</div>` : ''}
        <div class="report-id">${escHtml(reportId)}</div>
        <div class="report-date">${dateStr} &middot; ${timeStr}</div>
      </div>
    </div>
  </div>`;
}

function periodBannerBlock(periodLabel: string): string {
  return `
    <div class="period-row">
      <div class="period-label">Period</div>
      <div class="period-value">${escHtml(periodLabel)}</div>
    </div>`;
}

// ─── Full Inventory Report ────────────────────────────────────────────────────

export function buildFullInventoryReportHTML(
  products: InventoryProduct[],
  business: BusinessInfo,
  lowStockIds: Set<number>,
  periodLabel: string,
  dir: 'ltr' | 'rtl' = 'ltr',
): string {
  const lang = 'en';
  const now = new Date();
  const dateStr = fmtDate(now);
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
      statusCell = `<span class="badge-sold">Sold</span>`;
    } else if (isLow) {
      statusCell = `<span class="badge-lowstock">Low Stock &#9888;</span>`;
    } else {
      statusCell = `<span class="badge-instock">In Stock</span>`;
    }

    return `
      <tr>
        <td style="font-weight:600;">${escHtml(p.name)}</td>
        <td style="color:#475569;font-size:11px;">${escHtml(p.itemId ?? '—')}</td>
        <td style="color:#475569;">${escHtml(p.category)}</td>
        <td style="text-align:center;font-weight:600;">${isSold ? '<span style="color:#94a3b8;font-style:italic;">—</span>' : String(p.quantity)}</td>
        <td style="text-align:right;color:#475569;">${fmtIQD(p.purchasePrice)} IQD</td>
        <td style="text-align:right;color:#000000;font-weight:600;">${fmtIQD(p.sellingPrice)} IQD</td>
        <td style="text-align:right;font-weight:700;">${totalVal} IQD</td>
        <td style="color:#475569;">${escHtml(p.supplierName ?? '—')}</td>
        <td style="text-align:center;">${statusCell}</td>
      </tr>`;
  }).join('');

  return `<!DOCTYPE html>
<html lang="${lang}" dir="${dir}">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>Full Inventory Report</title>
<style>${reportCSS(dir)}</style>
</head>
<body>
<div class="page">

  ${reportHeaderBlock(business, 'Inventory Report', '', reportId, dateStr, timeStr)}

  <div class="body">

    ${periodBannerBlock(periodLabel)}

    <div class="kpi-grid">
      <div class="kpi-card">
        <div class="kpi-label">Total Products</div>
        <div class="kpi-value">${fmtIQD(products.length)}</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-label">Total Quantity</div>
        <div class="kpi-value">${fmtIQD(totalQuantity)}</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-label">Total Value</div>
        <div class="kpi-value">${fmtIQD(totalValueIQD)} IQD</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-label">Est. Profit</div>
        <div class="kpi-value">${fmtIQD(estProfit)} IQD</div>
      </div>
    </div>

    <div class="section-label">All Products (${products.length})</div>
    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Product</th>
            <th>ID</th>
            <th>Category</th>
            <th style="text-align:center;">Qty</th>
            <th style="text-align:right;">Buy Price</th>
            <th style="text-align:right;">Sell Price</th>
            <th style="text-align:right;">Total Value</th>
            <th>Supplier</th>
            <th style="text-align:center;">Status</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
        <tfoot>
          <tr>
            <td colspan="6" style="text-align:right;color:#475569;font-weight:500;">Total Inventory Value:</td>
            <td style="text-align:right;">${fmtIQD(totalValueIQD)} IQD</td>
            <td colspan="2"></td>
          </tr>
        </tfoot>
      </table>
    </div>

  </div>

  <div class="footer">
    Generated By: <strong>${escHtml(business.name || 'Business')}</strong> &middot; ManagerX &middot; ${dateStr} at ${timeStr}
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
  dir: 'ltr' | 'rtl' = 'ltr',
): string {
  const lang = 'en';
  const now = new Date();
  const dateStr = fmtDate(now);
  const timeStr = fmtTime(now);
  const reportId = genReportId('LSK');

  const rows = products.map((p) => `
    <tr>
      <td style="font-weight:600;">${escHtml(p.name)}</td>
      <td style="color:#475569;font-size:11px;">${escHtml(p.itemId ?? '—')}</td>
      <td style="color:#475569;">${escHtml(p.category)}</td>
      <td style="text-align:center;font-weight:700;color:#000000;">${p.quantity}</td>
      <td style="color:#475569;">${escHtml(p.supplierName ?? '—')}</td>
      <td style="text-align:center;"><span class="badge-lowstock">Low Stock &#9888;</span></td>
    </tr>`).join('');

  return `<!DOCTYPE html>
<html lang="${lang}" dir="${dir}">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>Low Stock Report</title>
<style>${reportCSS(dir)}</style>
</head>
<body>
<div class="page">

  ${reportHeaderBlock(business, 'Low Stock Report', `${products.length} product${products.length !== 1 ? 's' : ''} below threshold`, reportId, dateStr, timeStr)}

  <div class="body">
    ${periodBannerBlock(periodLabel)}
    <div class="section-label">Low Stock Products (${products.length})</div>
    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Product</th>
            <th>ID</th>
            <th>Category</th>
            <th style="text-align:center;">Qty Remaining</th>
            <th>Supplier</th>
            <th style="text-align:center;">Status</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
  </div>

  <div class="footer">
    Generated By: <strong>${escHtml(business.name || 'Business')}</strong> &middot; ManagerX &middot; ${dateStr} at ${timeStr}
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
  dir: 'ltr' | 'rtl' = 'ltr',
): string {
  const lang = 'en';
  const now = new Date();
  const dateStr = fmtDate(now);
  const timeStr = fmtTime(now);
  const reportId = genReportId('OOS');

  const rows = products.map((p) => `
    <tr>
      <td style="font-weight:600;">${escHtml(p.name)}</td>
      <td style="color:#475569;font-size:11px;">${escHtml(p.itemId ?? '—')}</td>
      <td style="color:#475569;">${escHtml(p.category)}</td>
      <td style="text-align:center;font-weight:700;color:#000000;">${p.quantity}</td>
      <td style="color:#475569;">${escHtml(p.supplierName ?? '—')}</td>
      <td style="text-align:center;"><span class="badge-outofstock">Out of Stock</span></td>
    </tr>`).join('');

  return `<!DOCTYPE html>
<html lang="${lang}" dir="${dir}">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>Out of Stock Report</title>
<style>${reportCSS(dir)}</style>
</head>
<body>
<div class="page">

  ${reportHeaderBlock(business, 'Out of Stock Report', `${products.length} product${products.length !== 1 ? 's' : ''} with zero quantity`, reportId, dateStr, timeStr)}

  <div class="body">
    ${periodBannerBlock(periodLabel)}
    <div class="section-label">Out of Stock Products (${products.length})</div>
    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Product</th>
            <th>ID</th>
            <th>Category</th>
            <th style="text-align:center;">Qty Remaining</th>
            <th>Supplier</th>
            <th style="text-align:center;">Status</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
  </div>

  <div class="footer">
    Generated By: <strong>${escHtml(business.name || 'Business')}</strong> &middot; ManagerX &middot; ${dateStr} at ${timeStr}
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
  dir: 'ltr' | 'rtl' = 'ltr',
): string {
  const lang = 'en';
  const now = new Date();
  const dateStr = fmtDate(now);
  const timeStr = fmtTime(now);
  const reportId = genReportId('CAT');

  const totalQty   = products.reduce((s, p) => s + p.quantity, 0);
  const totalValue = products.reduce((s, p) => s + p.purchasePrice * p.quantity, 0);
  const estProfit  = products.reduce((s, p) => s + (p.sellingPrice - p.purchasePrice) * p.quantity, 0);

  const rows = products.map((p) => {
    const val = fmtIQD(p.purchasePrice * p.quantity);
    const isSold = !p.isActive || (p.idMode === 'unique' && p.quantity === 0);
    return `
      <tr>
        <td style="font-weight:600;">${escHtml(p.name)}</td>
        <td style="color:#475569;font-size:11px;">${escHtml(p.itemId ?? '—')}</td>
        <td style="text-align:center;font-weight:600;">${isSold ? '<span style="color:#94a3b8;font-style:italic;">—</span>' : String(p.quantity)}</td>
        <td style="text-align:right;color:#475569;">${fmtIQD(p.purchasePrice)} IQD</td>
        <td style="text-align:right;color:#000000;font-weight:600;">${fmtIQD(p.sellingPrice)} IQD</td>
        <td style="text-align:right;font-weight:700;">${val} IQD</td>
        <td style="color:#475569;">${escHtml(p.supplierName ?? '—')}</td>
      </tr>`;
  }).join('');

  return `<!DOCTYPE html>
<html lang="${lang}" dir="${dir}">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>Category Report — ${escHtml(categoryName)}</title>
<style>${reportCSS(dir)}</style>
</head>
<body>
<div class="page">

  ${reportHeaderBlock(business, 'Category Report', `Category: ${categoryName}`, reportId, dateStr, timeStr)}

  <div class="body">

    ${periodBannerBlock(periodLabel)}

    <div class="kpi-grid">
      <div class="kpi-card">
        <div class="kpi-label">Products</div>
        <div class="kpi-value">${products.length}</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-label">Total Quantity</div>
        <div class="kpi-value">${fmtIQD(totalQty)}</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-label">Total Value</div>
        <div class="kpi-value">${fmtIQD(totalValue)} IQD</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-label">Est. Profit</div>
        <div class="kpi-value">${fmtIQD(estProfit)} IQD</div>
      </div>
    </div>

    <div class="section-label">${escHtml(categoryName)} — Products (${products.length})</div>
    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Product</th>
            <th>ID</th>
            <th style="text-align:center;">Qty</th>
            <th style="text-align:right;">Buy Price</th>
            <th style="text-align:right;">Sell Price</th>
            <th style="text-align:right;">Total Value</th>
            <th>Supplier</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
        <tfoot>
          <tr>
            <td colspan="5" style="text-align:right;color:#475569;font-weight:500;">Category Total Value:</td>
            <td style="text-align:right;">${fmtIQD(totalValue)} IQD</td>
            <td></td>
          </tr>
        </tfoot>
      </table>
    </div>

  </div>

  <div class="footer">
    Generated By: <strong>${escHtml(business.name || 'Business')}</strong> &middot; ManagerX &middot; ${dateStr} at ${timeStr}
  </div>

</div>
</body>
</html>`;
}
