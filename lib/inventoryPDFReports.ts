import type { InventoryProduct } from '@/types/inventory';
import { fmtIQD, fmtUSD, formatDate as fmtDate, formatDateShort, formatTime as fmtTime } from '@/utils/formatters';
import { KURDISH_FONT_FACE, PDF_BRAND_WEBSITE, pdfDevelopedByText, kuSpan, isKurdishPdfActive } from '@/lib/pdfFont';
import i18n from '@/lib/i18n';
import { useSettingsStore } from '@/store/settingsStore';

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
function t(key: string, opts?: Record<string, unknown>): string {
  return i18n.t(`inventoryReportPdf.${key}`, opts) as string;
}
// Wraps an already-translated label in the Bahij Janna/RTL span. Never wraps
// numbers, dates, or raw product data (names, IDs, category/supplier text).
const ku = kuSpan;


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

function getInventoryReceiptSettings() {
  return useSettingsStore.getState().inventoryReceiptSettings ?? {
    showBusinessHeader: true,
    showStatsCards: true,
    showSignatureArea: true,
    customFooterNote: '',
  };
}

function buildSignatureSection(isKurdish: boolean, isAr: boolean): string {
  const keeperText = isAr ? 'توقيع أمين المخزن' : isKurdish ? 'واژووی چاودێری کۆگا' : 'Warehouse Keeper';
  const supervisorText = isAr ? 'توقيع مشرف الجرد' : isKurdish ? 'واژووی سەرپەرشتیاری سەرژمێری' : 'Audit Supervisor';
  return `
  <div style="display:flex;justify-content:space-between;align-items:flex-end;padding:24px 10px 12px;page-break-inside:avoid;direction:${isKurdish ? 'rtl' : 'ltr'};">
    <div style="text-align:center;width:150px;">
      <div style="border-top:1px solid #94a3b8;padding-top:6px;font-size:11.5px;color:#475569;font-weight:600;">${ku(keeperText)}</div>
    </div>
    <div style="text-align:center;width:150px;">
      <div style="border-top:1px solid #94a3b8;padding-top:6px;font-size:11.5px;color:#475569;font-weight:600;">${ku(supervisorText)}</div>
    </div>
  </div>`;
}

// ─── Table Rendering ────────────────────────────────────────────────────────
// Natural CSS print table pagination: <thead> displays table-header-group so
// WebKit/Blink repeats it on every page, <tr> has page-break-inside: avoid so
// rows never split across page boundaries, and containers have overflow: visible
// so page splitting is clean and never generates awkward blank gaps.
function renderPaginatedTable(opts: {
  theadRowHTML: string;
  bodyRows: string[];
  tfootHTML?: string;
  headerBudgetPx?: number;
}): string {
  return `
    <div class="table-wrap">
      <table>
        <thead><tr>${opts.theadRowHTML}</tr></thead>
        <tbody>${opts.bodyRows.join('')}</tbody>
        ${opts.tfootHTML ? `<tfoot><tr>${opts.tfootHTML}</tr></tfoot>` : ''}
      </table>
    </div>`;
}

// ─── Shared white/monochrome CSS ──────────────────────────────────────────────
// Mirrors lib/invoiceTemplate.ts's SALES_CSS design tokens so inventory reports
// feel like part of the same Froshiar PDF system.

function reportCSS(isKurdish: boolean): string {
  const kuAlign = isKurdish ? 'right' : 'left';
  const numAlign = isKurdish ? 'left' : 'right';
  return `
    ${KURDISH_FONT_FACE}
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
      font-family: ${isKurdish ? `'Bahij Janna', 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif` : `'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, 'Bahij Janna', sans-serif`};
    }
    body {
      direction: ${isKurdish ? 'rtl' : 'ltr'};
      text-align: ${isKurdish ? 'right' : 'left'};
      font-family: ${isKurdish ? `'Bahij Janna', 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif` : `'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, 'Bahij Janna', sans-serif`};
      background: #ffffff;
      color: #000000;
      font-size: 13px;
      line-height: 1.5;
    }
    .ku-text { font-family: 'Bahij Janna', sans-serif !important; direction: rtl; unicode-bidi: isolate; font-weight: 400; letter-spacing: normal; text-transform: none; }
    .en-num, .font-mono, [dir="ltr"] {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif !important;
    }
    .page { max-width: 900px; margin: 0 auto; background: #fff; }

    /* ── Header ── */
    .header {
      padding: 18px 20px 14px;
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
    .body { padding: 12px 14px 20px; }

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
      border-radius: 8px;
      overflow: visible;
      margin-bottom: 18px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 11px;
      direction: ${isKurdish ? 'rtl' : 'ltr'};
      page-break-inside: auto;
      break-inside: auto;
      table-layout: fixed;
    }
    thead { display: table-header-group; }
    tfoot { display: table-footer-group; }
    thead tr {
      background: #f8fafc;
      page-break-inside: avoid;
      break-inside: avoid;
    }
    tbody tr {
      page-break-inside: avoid !important;
      break-inside: avoid !important;
    }
    th, td {
      page-break-inside: avoid !important;
      break-inside: avoid !important;
    }
    th {
      padding: 8px 6px;
      text-align: ${kuAlign};
      font-size: 10px;
      font-weight: ${isKurdish ? 400 : 700};
      text-transform: ${isKurdish ? 'none' : 'uppercase'};
      letter-spacing: 0.3px;
      color: #000000;
      border-bottom: 1.5px solid #e2e8f0;
      vertical-align: middle;
      box-sizing: border-box;
    }
    td {
      padding: 6px 6px;
      border-bottom: 1px solid #f1f5f9;
      vertical-align: middle;
      color: #000000;
      font-size: 11px;
      line-height: 1.35;
      box-sizing: border-box;
    }
    tbody tr:nth-child(even) { background: #f8fafc; }
    tr:last-child td { border-bottom: none; }
    tfoot tr {
      background: #f8fafc;
      page-break-inside: avoid;
      break-inside: avoid;
    }
    tfoot td {
      border-top: 2px solid #e2e8f0;
      font-weight: ${isKurdish ? 400 : 700};
      font-size: 11px;
      padding: 8px 6px;
      color: #000000;
      box-sizing: border-box;
    }

    /* ── Status badges (monochrome) ── */
    .badge-instock {
      display: inline-block;
      border: 1px solid #cbd5e1;
      border-radius: 12px;
      padding: 1.5px 5px;
      font-size: 9px;
      color: #475569;
      white-space: nowrap;
      box-sizing: border-box;
      line-height: 1.3;
    }
    .badge-lowstock {
      display: inline-block;
      border: 1.2px solid #000000;
      border-radius: 12px;
      padding: 1.5px 5px;
      font-size: 9px;
      font-weight: ${isKurdish ? 400 : 700};
      color: #000000;
      white-space: nowrap;
      box-sizing: border-box;
      line-height: 1.3;
    }
    .badge-outofstock {
      display: inline-block;
      background: #000000;
      border-radius: 12px;
      padding: 1.5px 5px;
      font-size: 9px;
      font-weight: ${isKurdish ? 400 : 700};
      color: #ffffff;
      white-space: nowrap;
      box-sizing: border-box;
      line-height: 1.3;
    }
    .badge-sold {
      font-style: ${isKurdish ? 'normal' : 'italic'};
      color: #94a3b8;
      font-size: 9.5px;
      white-space: nowrap;
    }

    /* ── Footer ── */
    .footer {
      background: #f8fafc;
      border-top: 1px solid #e2e8f0;
      text-align: center;
      padding: 14px 20px 18px;
      color: #94a3b8;
      font-size: 11px;
    }
    .footer strong { color: #475569; font-weight: 700; }

    /* ── Print / A4 ── */
    @page { size: A4; margin: 10mm 8mm; }
    thead { display: table-header-group; }
    tr { page-break-inside: avoid !important; break-inside: avoid !important; }
    @media print {
      body { background: #fff; }
      .page { width: 100% !important; max-width: 100% !important; margin: 0 !important; }
      .table-wrap { overflow: visible !important; border-radius: 0; }
      thead tr { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .kpi-card { -webkit-print-color-adjust: exact; print-color-adjust: exact; page-break-inside: avoid; break-inside: avoid; }
      .period-row { page-break-inside: avoid; break-inside: avoid; }
      .header { page-break-inside: avoid; break-inside: avoid; }
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
  const isKurdish = isKurdishPdfActive();
  const isAr = i18n.language === 'ar';
  const lang = isAr ? 'ar' : isKurdish ? 'ku' : 'en';
  const dir = isKurdish ? 'rtl' : 'ltr';
  const kuAlign = isKurdish ? 'right' : 'left';
  const numAlign = isKurdish ? 'left' : 'right';
  const now = new Date();
  const dateStr = fmtDate(now);
  const timeStr = fmtTime(now);
  const reportId = genReportId('INV');
  const totalQuantity = products.reduce((s, p) => s + p.quantity, 0);
  const totalValueIQD = products.reduce((s, p) => s + p.purchasePrice * p.quantity, 0);
  const estProfit = products.reduce((s, p) => s + (p.sellingPrice - p.purchasePrice) * p.quantity, 0);

  const baseCurrency = useSettingsStore.getState().baseCurrency || 'IQD';
  const rate = useSettingsStore.getState().exchangeRate || 1310;
  const isUsd = baseCurrency === 'USD';
  const fmtMoney = (val: number) => isUsd ? `$${fmtUSD(val / rate)}` : `${fmtIQD(val)}&nbsp;IQD`;

  const inventorySettings = useSettingsStore.getState().inventoryReceiptSettings ?? {
    showBusinessHeader: true,
    showStatsCards: true,
    showSignatureArea: true,
    customFooterNote: '',
  };

  const rows = products.map((p) => {
    const isSold = !p.isActive || (p.idMode === 'unique' && p.quantity === 0);
    const isLow  = !isSold && lowStockIds.has(p.id);
    const totalVal = fmtMoney(p.purchasePrice * p.quantity);

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
        <td style="width:22%;font-weight:${isKurdish ? 400 : 600};text-align:${kuAlign};unicode-bidi:plaintext;word-break:break-word;overflow-wrap:break-word;">${escHtml(p.name)}</td>
        <td style="width:9%;color:#475569;font-size:10px;text-align:${kuAlign};unicode-bidi:plaintext;word-break:break-all;">${escHtml(p.itemId ?? '—')}</td>
        <td style="width:11%;color:#475569;text-align:${kuAlign};unicode-bidi:plaintext;word-break:break-word;overflow-wrap:break-word;">${escHtml(p.category)}</td>
        <td style="width:5%;text-align:center;font-weight:${isKurdish ? 400 : 600};white-space:nowrap;">${isSold ? `<span style="color:#94a3b8;font-style:${isKurdish ? 'normal' : 'italic'};">—</span>` : String(p.quantity)}</td>
        <td style="width:12%;text-align:${numAlign};direction:ltr;unicode-bidi:isolate;white-space:nowrap !important;font-variant-numeric:tabular-nums;color:#475569;">${fmtMoney(p.purchasePrice)}</td>
        <td style="width:12%;text-align:${numAlign};direction:ltr;unicode-bidi:isolate;white-space:nowrap !important;font-variant-numeric:tabular-nums;color:#000000;font-weight:${isKurdish ? 400 : 600};">${fmtMoney(p.sellingPrice)}</td>
        <td style="width:13%;text-align:${numAlign};direction:ltr;unicode-bidi:isolate;white-space:nowrap !important;font-variant-numeric:tabular-nums;font-weight:${isKurdish ? 400 : 700};">${totalVal}</td>
        <td style="width:10%;color:#475569;text-align:${kuAlign};unicode-bidi:plaintext;word-break:break-word;overflow-wrap:break-word;">${escHtml(p.supplierName ?? '—')}</td>
        <td style="width:6%;text-align:center;white-space:nowrap;">${statusCell}</td>
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
        <div class="kpi-value">${fmtMoney(totalValueIQD)}</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-label">${isKurdish ? ku(escHtml(t('estProfit'))) : 'Est. Profit'}</div>
        <div class="kpi-value">${fmtMoney(estProfit)}</div>
      </div>
    </div>

    <div class="section-label">${allProductsLabel}</div>
    ${renderPaginatedTable({
      theadRowHTML: `
            <th style="width:22%;text-align:${kuAlign};">${isKurdish ? ku(escHtml(t('product'))) : 'Product'}</th>
            <th style="width:9%;text-align:${kuAlign};">${isKurdish ? ku(escHtml(t('id'))) : 'ID'}</th>
            <th style="width:11%;text-align:${kuAlign};">${isKurdish ? ku(escHtml(t('category'))) : 'Category'}</th>
            <th style="width:5%;text-align:center;">${isKurdish ? ku(escHtml(t('qty'))) : 'Qty'}</th>
            <th style="width:12%;text-align:${numAlign};white-space:nowrap;">${isKurdish ? ku(escHtml(t('buyPrice'))) : 'Buy Price'}</th>
            <th style="width:12%;text-align:${numAlign};white-space:nowrap;">${isKurdish ? ku(escHtml(t('sellPrice'))) : 'Sell Price'}</th>
            <th style="width:13%;text-align:${numAlign};white-space:nowrap;">${isKurdish ? ku(escHtml(t('totalValue'))) : 'Total Value'}</th>
            <th style="width:10%;text-align:${kuAlign};">${isKurdish ? ku(escHtml(t('supplier'))) : 'Supplier'}</th>
            <th style="width:6%;text-align:center;">${isKurdish ? ku(escHtml(t('status'))) : 'Status'}</th>`,
      bodyRows: rows,
      tfootHTML: `
            <td colspan="6" style="text-align:${kuAlign};color:#475569;font-weight:500;">${isKurdish ? ku(escHtml(t('totalInventoryValue'))) : 'Total Inventory Value:'}</td>
            <td style="text-align:${numAlign};direction:ltr;unicode-bidi:isolate;white-space:nowrap !important;font-variant-numeric:tabular-nums;font-weight:700;">${fmtMoney(totalValueIQD)}</td>
            <td colspan="2"></td>`,
    })}

  ${inventorySettings.customFooterNote ? `
  <div style="margin: 16px 0; padding: 10px 14px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; font-size: 11.5px; color: #334155;">
    ${ku(escHtml(inventorySettings.customFooterNote))}
  </div>` : ''}

  ${inventorySettings.showSignatureArea !== false ? buildSignatureSection(isKurdish, isAr) : ''}

  </div>

  <div class="footer">
    ${isKurdish
      ? `${ku(pdfDevelopedByText())} · ${PDF_BRAND_WEBSITE} &middot; ${dateStr} &middot; ${timeStr}`
      : `${pdfDevelopedByText()} · ${PDF_BRAND_WEBSITE} &middot; ${dateStr} at ${timeStr}`}
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
  const isKurdish = isKurdishPdfActive();
  const isAr = i18n.language === 'ar';
  const inventorySettings = getInventoryReceiptSettings();
  const lang = isAr ? 'ar' : isKurdish ? 'ku' : 'en';
  const dir = isKurdish ? 'rtl' : 'ltr';
  const kuAlign = isKurdish ? 'right' : 'left';
  const now = new Date();
  const dateStr = fmtDate(now);
  const timeStr = fmtTime(now);
  const reportId = genReportId('LSK');

  const rows = products.map((p) => `
    <tr>
      <td style="width:32%;font-weight:${isKurdish ? 400 : 600};text-align:${kuAlign};unicode-bidi:plaintext;word-break:break-word;overflow-wrap:break-word;">${escHtml(p.name)}</td>
      <td style="width:14%;color:#475569;font-size:10px;text-align:${kuAlign};unicode-bidi:plaintext;word-break:break-all;">${escHtml(p.itemId ?? '—')}</td>
      <td style="width:18%;color:#475569;text-align:${kuAlign};unicode-bidi:plaintext;word-break:break-word;overflow-wrap:break-word;">${escHtml(p.category)}</td>
      <td style="width:10%;text-align:center;font-weight:${isKurdish ? 400 : 700};color:#000000;white-space:nowrap;">${p.quantity}</td>
      <td style="width:14%;color:#475569;text-align:${kuAlign};unicode-bidi:plaintext;word-break:break-word;overflow-wrap:break-word;">${escHtml(p.supplierName ?? '—')}</td>
      <td style="width:12%;text-align:center;white-space:nowrap;"><span class="badge-lowstock">${isKurdish ? ku(escHtml(t('lowStockBadge'))) : 'Low Stock'} &#9888;</span></td>
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
            <th style="width:32%;text-align:${kuAlign};">${isKurdish ? ku(escHtml(t('product'))) : 'Product'}</th>
            <th style="width:14%;text-align:${kuAlign};">${isKurdish ? ku(escHtml(t('id'))) : 'ID'}</th>
            <th style="width:18%;text-align:${kuAlign};">${isKurdish ? ku(escHtml(t('category'))) : 'Category'}</th>
            <th style="width:10%;text-align:center;">${isKurdish ? ku(escHtml(t('qtyRemaining'))) : 'Qty Remaining'}</th>
            <th style="width:14%;text-align:${kuAlign};">${isKurdish ? ku(escHtml(t('supplier'))) : 'Supplier'}</th>
            <th style="width:12%;text-align:center;">${isKurdish ? ku(escHtml(t('status'))) : 'Status'}</th>`,
      bodyRows: rows,
    })}
  ${inventorySettings.customFooterNote ? `
  <div style="margin: 16px 0; padding: 10px 14px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; font-size: 11.5px; color: #334155;">
    ${ku(escHtml(inventorySettings.customFooterNote))}
  </div>` : ''}

  ${inventorySettings.showSignatureArea !== false ? buildSignatureSection(isKurdish, isAr) : ''}

  </div>

  <div class="footer">
    ${isKurdish
      ? `${ku(pdfDevelopedByText())} · ${PDF_BRAND_WEBSITE} &middot; ${dateStr} &middot; ${timeStr}`
      : `${pdfDevelopedByText()} · ${PDF_BRAND_WEBSITE} &middot; ${dateStr} at ${timeStr}`}
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
  const isKurdish = isKurdishPdfActive();
  const isAr = i18n.language === 'ar';
  const inventorySettings = getInventoryReceiptSettings();
  const lang = isAr ? 'ar' : isKurdish ? 'ku' : 'en';
  const dir = isKurdish ? 'rtl' : 'ltr';
  const kuAlign = isKurdish ? 'right' : 'left';
  const now = new Date();
  const dateStr = fmtDate(now);
  const timeStr = fmtTime(now);
  const reportId = genReportId('OOS');

  const rows = products.map((p) => `
    <tr>
      <td style="width:34%;font-weight:${isKurdish ? 400 : 600};text-align:${kuAlign};unicode-bidi:plaintext;word-break:break-word;overflow-wrap:break-word;">${escHtml(p.name)}</td>
      <td style="width:14%;color:#475569;font-size:10px;text-align:${kuAlign};unicode-bidi:plaintext;word-break:break-all;">${escHtml(p.itemId ?? '—')}</td>
      <td style="width:18%;color:#475569;text-align:${kuAlign};unicode-bidi:plaintext;word-break:break-word;overflow-wrap:break-word;">${escHtml(p.category)}</td>
      <td style="width:10%;text-align:center;font-weight:${isKurdish ? 400 : 700};color:#000000;white-space:nowrap;">${p.quantity}</td>
      <td style="width:12%;color:#475569;text-align:${kuAlign};unicode-bidi:plaintext;word-break:break-word;overflow-wrap:break-word;">${escHtml(p.supplierName ?? '—')}</td>
      <td style="width:12%;text-align:center;white-space:nowrap;"><span class="badge-outofstock">${isKurdish ? ku(escHtml(t('outOfStock'))) : 'Out of Stock'}</span></td>
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
            <th style="width:34%;text-align:${kuAlign};">${isKurdish ? ku(escHtml(t('product'))) : 'Product'}</th>
            <th style="width:14%;text-align:${kuAlign};">${isKurdish ? ku(escHtml(t('id'))) : 'ID'}</th>
            <th style="width:18%;text-align:${kuAlign};">${isKurdish ? ku(escHtml(t('category'))) : 'Category'}</th>
            <th style="width:10%;text-align:center;">${isKurdish ? ku(escHtml(t('qtyRemaining'))) : 'Qty Remaining'}</th>
            <th style="width:12%;text-align:${kuAlign};">${isKurdish ? ku(escHtml(t('supplier'))) : 'Supplier'}</th>
            <th style="width:12%;text-align:center;">${isKurdish ? ku(escHtml(t('status'))) : 'Status'}</th>`,
      bodyRows: rows,
    })}
  ${inventorySettings.customFooterNote ? `
  <div style="margin: 16px 0; padding: 10px 14px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; font-size: 11.5px; color: #334155;">
    ${ku(escHtml(inventorySettings.customFooterNote))}
  </div>` : ''}

  ${inventorySettings.showSignatureArea !== false ? buildSignatureSection(isKurdish, isAr) : ''}

  </div>

  <div class="footer">
    ${isKurdish
      ? `${ku(pdfDevelopedByText())} · ${PDF_BRAND_WEBSITE} &middot; ${dateStr} &middot; ${timeStr}`
      : `${pdfDevelopedByText()} · ${PDF_BRAND_WEBSITE} &middot; ${dateStr} at ${timeStr}`}
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
  const isKurdish = isKurdishPdfActive();
  const isAr = i18n.language === 'ar';
  const lang = isAr ? 'ar' : isKurdish ? 'ku' : 'en';
  const dir = isKurdish ? 'rtl' : 'ltr';
  const kuAlign = isKurdish ? 'right' : 'left';
  const numAlign = isKurdish ? 'left' : 'right';
  const now = new Date();
  const dateStr = fmtDate(now);
  const timeStr = fmtTime(now);
  const reportId = genReportId('CAT');
  const categoryNameSafe = escHtml(categoryName);

  const totalQty   = products.reduce((s, p) => s + p.quantity, 0);
  const totalValue = products.reduce((s, p) => s + p.purchasePrice * p.quantity, 0);
  const estProfit  = products.reduce((s, p) => s + (p.sellingPrice - p.purchasePrice) * p.quantity, 0);

  const baseCurrency = useSettingsStore.getState().baseCurrency || 'IQD';
  const rate = useSettingsStore.getState().exchangeRate || 1310;
  const isUsd = baseCurrency === 'USD';
  const fmtMoney = (val: number) => isUsd ? `$${fmtUSD(val / rate)}` : `${fmtIQD(val)}&nbsp;IQD`;

  const inventorySettings = useSettingsStore.getState().inventoryReceiptSettings ?? {
    showBusinessHeader: true,
    showStatsCards: true,
    showSignatureArea: true,
    customFooterNote: '',
  };

  const rows = products.map((p) => {
    const val = fmtMoney(p.purchasePrice * p.quantity);
    const isSold = !p.isActive || (p.idMode === 'unique' && p.quantity === 0);
    return `
      <tr>
        <td style="width:26%;font-weight:${isKurdish ? 400 : 600};text-align:${kuAlign};unicode-bidi:plaintext;word-break:break-word;overflow-wrap:break-word;">${escHtml(p.name)}</td>
        <td style="width:10%;color:#475569;font-size:10px;text-align:${kuAlign};unicode-bidi:plaintext;word-break:break-all;">${escHtml(p.itemId ?? '—')}</td>
        <td style="width:8%;text-align:center;font-weight:${isKurdish ? 400 : 600};white-space:nowrap;">${isSold ? `<span style="color:#94a3b8;font-style:${isKurdish ? 'normal' : 'italic'};">—</span>` : String(p.quantity)}</td>
        <td style="width:14%;text-align:${numAlign};direction:ltr;unicode-bidi:isolate;white-space:nowrap !important;font-variant-numeric:tabular-nums;color:#475569;">${fmtMoney(p.purchasePrice)}</td>
        <td style="width:14%;text-align:${numAlign};direction:ltr;unicode-bidi:isolate;white-space:nowrap !important;font-variant-numeric:tabular-nums;color:#000000;font-weight:${isKurdish ? 400 : 600};">${fmtMoney(p.sellingPrice)}</td>
        <td style="width:14%;text-align:${numAlign};direction:ltr;unicode-bidi:isolate;white-space:nowrap !important;font-variant-numeric:tabular-nums;font-weight:${isKurdish ? 400 : 700};">${val}</td>
        <td style="width:14%;color:#475569;text-align:${kuAlign};unicode-bidi:plaintext;word-break:break-word;overflow-wrap:break-word;">${escHtml(p.supplierName ?? '—')}</td>
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
        <div class="kpi-value">${fmtMoney(totalValue)}</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-label">${isKurdish ? ku(escHtml(t('estProfit'))) : 'Est. Profit'}</div>
        <div class="kpi-value">${fmtMoney(estProfit)}</div>
      </div>
    </div>

    <div class="section-label">${sectionLabel}</div>
    ${renderPaginatedTable({
      theadRowHTML: `
            <th style="width:26%;text-align:${kuAlign};">${isKurdish ? ku(escHtml(t('product'))) : 'Product'}</th>
            <th style="width:10%;text-align:${kuAlign};">${isKurdish ? ku(escHtml(t('id'))) : 'ID'}</th>
            <th style="width:8%;text-align:center;">${isKurdish ? ku(escHtml(t('qty'))) : 'Qty'}</th>
            <th style="width:14%;text-align:${numAlign};white-space:nowrap;">${isKurdish ? ku(escHtml(t('buyPrice'))) : 'Buy Price'}</th>
            <th style="width:14%;text-align:${numAlign};white-space:nowrap;">${isKurdish ? ku(escHtml(t('sellPrice'))) : 'Sell Price'}</th>
            <th style="width:14%;text-align:${numAlign};white-space:nowrap;">${isKurdish ? ku(escHtml(t('totalValue'))) : 'Total Value'}</th>
            <th style="width:14%;text-align:${kuAlign};">${isKurdish ? ku(escHtml(t('supplier'))) : 'Supplier'}</th>`,
      bodyRows: rows,
      tfootHTML: `
            <td colspan="5" style="text-align:${kuAlign};color:#475569;font-weight:500;">${isKurdish ? ku(escHtml(t('categoryTotalValue'))) : 'Category Total Value:'}</td>
            <td style="text-align:${numAlign};direction:ltr;unicode-bidi:isolate;white-space:nowrap !important;font-variant-numeric:tabular-nums;font-weight:700;">${fmtMoney(totalValue)}</td>
            <td></td>`,
    })}

  ${inventorySettings.customFooterNote ? `
  <div style="margin: 16px 0; padding: 10px 14px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; font-size: 11.5px; color: #334155;">
    ${ku(escHtml(inventorySettings.customFooterNote))}
  </div>` : ''}

  ${inventorySettings.showSignatureArea !== false ? buildSignatureSection(isKurdish, isAr) : ''}

  </div>

  <div class="footer">
    ${isKurdish
      ? `${ku(pdfDevelopedByText())} · ${PDF_BRAND_WEBSITE} &middot; ${dateStr} &middot; ${timeStr}`
      : `${pdfDevelopedByText()} · ${PDF_BRAND_WEBSITE} &middot; ${dateStr} at ${timeStr}`}
  </div>

</div>
</body>
</html>`;
}
