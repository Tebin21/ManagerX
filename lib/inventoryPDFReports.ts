import type { InventoryProduct, InventoryStats } from '@/types/inventory';
import { fmtIQD, formatDate as fmtDate, formatTime as fmtTime } from '@/utils/formatters';

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


function genReportId(prefix: 'INV' | 'LSK' | 'CAT'): string {
  const now = new Date();
  const d = now.toISOString().slice(0, 10).replace(/-/g, '');
  const hex = Math.random().toString(16).slice(2, 6).toUpperCase();
  return `${prefix}-${d}-${hex}`;
}

function logoBlock(logoUri: string | null): string {
  if (!logoUri) return '';
  return `<img src="${logoUri}" style="height:54px;max-width:130px;object-fit:contain;display:block;background:#fff;border-radius:5px;padding:3px;margin-bottom:9px;" alt="logo" />`;
}

// ─── Shared monochrome CSS ────────────────────────────────────────────────────

function monochromeCSS(dir: 'ltr' | 'rtl'): string {
  const alignEnd = dir === 'rtl' ? 'left' : 'right';
  return `
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      direction: ltr;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif;
      background: #fff;
      color: #111;
      font-size: 13px;
      line-height: 1.5;
    }
    .page { max-width: 900px; margin: 0 auto; background: #fff; }

    /* ── Header ── */
    .header {
      background: #111111;
      color: #fff;
      padding: 32px 32px 26px;
    }
    .header-inner {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 20px;
    }
    .biz-name { font-size: 20px; font-weight: 800; letter-spacing: -0.2px; }
    .biz-meta { opacity: 0.65; font-size: 12px; margin-top: 4px; line-height: 1.6; }
    .report-title-col { text-align: ${alignEnd}; }
    .report-title { font-size: 16px; font-weight: 800; letter-spacing: 0.5px; text-transform: uppercase; }
    .report-subtitle { opacity: 0.72; font-size: 12px; margin-top: 3px; }
    .report-id {
      display: inline-block;
      margin-top: 8px;
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 0.8px;
      color: #fff;
      opacity: 0.55;
      text-transform: uppercase;
    }
    .report-date { opacity: 0.6; font-size: 11.5px; margin-top: 4px; }
    .header-divider { border: none; border-top: 1px solid rgba(255,255,255,0.15); margin: 20px 0 0; }

    /* ── Body ── */
    .body { padding: 26px 32px 32px; }

    /* ── KPI grid ── */
    .kpi-grid { display: flex; gap: 10px; margin-bottom: 22px; }
    .kpi-card {
      flex: 1;
      background: #F8F8F8;
      border: 1px solid #E5E5E5;
      border-radius: 10px;
      padding: 14px 14px 12px;
    }
    .kpi-label {
      font-size: 10px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.8px;
      color: #999;
      margin-bottom: 6px;
    }
    .kpi-value { font-size: 17px; font-weight: 800; color: #111; line-height: 1.2; }

    /* ── Section label ── */
    .section-label {
      font-size: 10px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.8px;
      color: #999;
      margin-bottom: 10px;
      padding-bottom: 7px;
      border-bottom: 1px solid #E8E8E8;
    }

    /* ── Table ── */
    .table-wrap {
      border: 1px solid #E5E5E5;
      border-radius: 8px;
      overflow: hidden;
    }
    table { width: 100%; border-collapse: collapse; font-size: 12px; }
    thead tr { background: #F2F2F2; }
    th {
      padding: 10px 11px;
      text-align: left;
      font-size: 10px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: #555;
      white-space: nowrap;
    }
    td {
      padding: 9px 11px;
      border-bottom: 1px solid #F0F0F0;
      vertical-align: middle;
      color: #222;
    }
    tr:last-child td { border-bottom: none; }
    tfoot tr { background: #F5F5F5; }
    tfoot td {
      border-top: 2px solid #DCDCDC;
      font-weight: 700;
      font-size: 12.5px;
      padding: 11px;
      color: #111;
    }

    /* ── Status badges (monochrome) ── */
    .badge-instock {
      display: inline-block;
      border: 1px solid #C8C8C8;
      border-radius: 20px;
      padding: 2px 8px;
      font-size: 10.5px;
      color: #555;
      white-space: nowrap;
    }
    .badge-lowstock {
      display: inline-block;
      border: 1.5px solid #555;
      border-radius: 20px;
      padding: 2px 8px;
      font-size: 10.5px;
      font-weight: 700;
      color: #111;
      white-space: nowrap;
    }
    .badge-sold {
      font-style: italic;
      color: #AAAAAA;
      font-size: 11px;
    }

    /* ── Footer ── */
    .footer {
      background: #F8F8F8;
      border-top: 1px solid #E5E5E5;
      text-align: center;
      padding: 14px 32px 18px;
      color: #AAAAAA;
      font-size: 11px;
    }
    .footer strong { color: #777; font-weight: 700; }

    /* ── Print / A4 ── */
    @page { size: A4; margin: 15mm; }
    thead { display: table-header-group; }
    tr { page-break-inside: avoid; }
    @media print {
      body { background: #fff; }
      .page { max-width: 100%; }
      thead tr { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .header { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
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
    <hr class="header-divider" />
  </div>`;
}

// ─── Full Inventory Report ────────────────────────────────────────────────────

export function buildFullInventoryReportHTML(
  products: InventoryProduct[],
  stats: InventoryStats,
  business: BusinessInfo,
  lowStockIds: Set<number>,
  dir: 'ltr' | 'rtl' = 'ltr',
): string {
  const lang = 'en';
  const now = new Date();
  const dateStr = fmtDate(now);
  const timeStr = fmtTime(now);
  const reportId = genReportId('INV');
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
        <td style="color:#666;font-size:11px;">${escHtml(p.itemId ?? '—')}</td>
        <td style="color:#666;">${escHtml(p.category)}</td>
        <td style="text-align:center;font-weight:600;">${isSold ? '<span style="color:#AAAAAA;font-style:italic;">—</span>' : String(p.quantity)}</td>
        <td style="text-align:right;color:#555;">${fmtIQD(p.purchasePrice)} IQD</td>
        <td style="text-align:right;color:#333;font-weight:600;">${fmtIQD(p.sellingPrice)} IQD</td>
        <td style="text-align:right;font-weight:700;">${totalVal} IQD</td>
        <td style="color:#666;">${escHtml(p.supplierName ?? '—')}</td>
        <td style="text-align:center;">${statusCell}</td>
      </tr>`;
  }).join('');

  return `<!DOCTYPE html>
<html lang="${lang}" dir="${dir}">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>Full Inventory Report</title>
<style>${monochromeCSS(dir)}</style>
</head>
<body>
<div class="page">

  ${reportHeaderBlock(business, 'Inventory Report', '', reportId, dateStr, timeStr)}

  <div class="body">

    <div class="kpi-grid">
      <div class="kpi-card">
        <div class="kpi-label">Total Products</div>
        <div class="kpi-value">${fmtIQD(stats.totalProducts)}</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-label">Total Quantity</div>
        <div class="kpi-value">${fmtIQD(stats.totalQuantity)}</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-label">Total Value</div>
        <div class="kpi-value">${fmtIQD(stats.totalValueIQD)} IQD</div>
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
            <td colspan="6" style="text-align:right;color:#666;font-weight:500;">Total Inventory Value:</td>
            <td style="text-align:right;">${fmtIQD(stats.totalValueIQD)} IQD</td>
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
      <td style="color:#666;font-size:11px;">${escHtml(p.itemId ?? '—')}</td>
      <td style="color:#666;">${escHtml(p.category)}</td>
      <td style="text-align:center;font-weight:700;color:#111;">${p.quantity}</td>
      <td style="color:#666;">${escHtml(p.supplierName ?? '—')}</td>
      <td style="text-align:center;"><span class="badge-lowstock">Low Stock &#9888;</span></td>
    </tr>`).join('');

  return `<!DOCTYPE html>
<html lang="${lang}" dir="${dir}">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>Low Stock Report</title>
<style>${monochromeCSS(dir)}</style>
</head>
<body>
<div class="page">

  ${reportHeaderBlock(business, 'Low Stock Report', `${products.length} product${products.length !== 1 ? 's' : ''} below threshold`, reportId, dateStr, timeStr)}

  <div class="body">
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

// ─── Category Report ──────────────────────────────────────────────────────────

export function buildCategoryReportHTML(
  products: InventoryProduct[],
  categoryName: string,
  business: BusinessInfo,
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
        <td style="color:#666;font-size:11px;">${escHtml(p.itemId ?? '—')}</td>
        <td style="text-align:center;font-weight:600;">${isSold ? '<span style="color:#AAAAAA;font-style:italic;">—</span>' : String(p.quantity)}</td>
        <td style="text-align:right;color:#555;">${fmtIQD(p.purchasePrice)} IQD</td>
        <td style="text-align:right;color:#333;font-weight:600;">${fmtIQD(p.sellingPrice)} IQD</td>
        <td style="text-align:right;font-weight:700;">${val} IQD</td>
        <td style="color:#666;">${escHtml(p.supplierName ?? '—')}</td>
      </tr>`;
  }).join('');

  return `<!DOCTYPE html>
<html lang="${lang}" dir="${dir}">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>Category Report — ${escHtml(categoryName)}</title>
<style>${monochromeCSS(dir)}</style>
</head>
<body>
<div class="page">

  ${reportHeaderBlock(business, 'Category Report', `Category: ${categoryName}`, reportId, dateStr, timeStr)}

  <div class="body">

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
            <td colspan="5" style="text-align:right;color:#666;font-weight:500;">Category Total Value:</td>
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
