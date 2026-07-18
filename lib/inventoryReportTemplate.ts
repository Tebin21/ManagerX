import type { InventoryProduct, InventoryStats } from '@/types/inventory';
import { fmtIQD, fmtUSD, fmtPct } from '@/utils/formatters';
import { KURDISH_FONT_FACE, PDF_BRAND_WEBSITE } from '@/lib/pdfFont';
import i18n from '@/lib/i18n';

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

// Kurdish summary cards drop the per-card color theming (blue/green/amber)
// in favor of a single neutral black/dark-gray palette -- only English keeps
// the colored cards.
function summaryCard(
  label: string,
  value: string,
  bg: string,
  textColor: string,
  borderColor: string,
  isKurdish: boolean,
): string {
  const cardBg     = isKurdish ? '#F8FAFC' : bg;
  const cardBorder = isKurdish ? '#E2E8F0' : borderColor;
  const labelColor = isKurdish ? '#475569' : textColor;
  const valueColor = isKurdish ? '#0F172A' : textColor;
  return `
    <div style="background:${cardBg};border-radius:12px;padding:16px 14px;border:1px solid ${cardBorder};flex:1;min-width:0;text-align:${isKurdish ? 'right' : 'left'};">
      <div style="font-size:${isKurdish ? '11px' : '10.5px'};font-weight:400;color:${labelColor};text-transform:${isKurdish ? 'none' : 'uppercase'};letter-spacing:${isKurdish ? 'normal' : '0.8px'};margin-bottom:7px;">${label}</div>
      <div style="font-size:${isKurdish ? '20px' : '17px'};font-weight:400;color:${valueColor};line-height:1.2;">${value}</div>
    </div>`;
}

export function buildInventoryReportHTML(
  products: InventoryProduct[],
  stats: InventoryStats,
  business: BusinessInfo,
  _dir: 'ltr' | 'rtl' = 'ltr',
): string {
  // PDF language follows the app's current language automatically, same as
  // every other report template -- there's no separate PDF language setting.
  // The `_dir` param is kept only for call-site signature compatibility.
  const isKurdish = i18n.language === 'ku';
  const dir = isKurdish ? 'rtl' : 'ltr';
  const lang = isKurdish ? 'ku' : 'en';
  const t = (key: string, opts?: Record<string, unknown>): string =>
    i18n.t(`inventoryReportPdf.${key}`, opts) as string;

  const now = new Date();
  const dateStr = now.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  const timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

  const logoHTML = business.logoUri
    ? `<img src="${business.logoUri}" style="height:60px;max-width:160px;object-fit:contain;display:block;background:white;border-radius:8px;padding:4px;margin-bottom:10px;" alt="logo" />`
    : '';

  const rows = products.map((p) => {
    const isSold = !p.isActive || (p.idMode === 'unique' && p.quantity === 0);
    const isLow  = p.isActive && p.quantity <= 3 && !isSold;
    const value  = fmtIQD(p.purchasePrice * p.quantity);

    const qtyCell = isSold
      ? (isKurdish
          ? `<span style="color:#64748B;font-size:12px;">${escHtml(t('sold'))}</span>`
          : `<span style="color:#94A3B8;font-style:italic;font-size:12px;">Sold</span>`)
      : isLow
        ? (isKurdish
            ? `<span style="color:#0F172A;">${p.quantity} &#9888;</span>`
            : `<span style="color:#92400E;font-weight:700;">${p.quantity} &#9888;</span>`)
        : (isKurdish
            ? `<span style="font-weight:400;">${p.quantity}</span>`
            : `<span style="font-weight:600;">${p.quantity}</span>`);

    const statusCell = p.paymentStatus === 'paid'
      ? (isKurdish
          ? `<span style="background:#F1F5F9;color:#0F172A;padding:3px 9px;border-radius:20px;font-size:11px;font-weight:400;border:1px solid #E2E8F0;">${escHtml(t('paid'))}</span>`
          : `<span style="background:#DCFCE7;color:#166534;padding:3px 9px;border-radius:20px;font-size:11px;font-weight:700;border:1px solid #BBF7D0;">Paid</span>`)
      : (isKurdish
          ? `<span style="background:#F1F5F9;color:#0F172A;padding:3px 9px;border-radius:20px;font-size:11px;font-weight:400;border:1px solid #E2E8F0;">${escHtml(t('debt'))}</span>`
          : `<span style="background:#FEF3C7;color:#92400E;padding:3px 9px;border-radius:20px;font-size:11px;font-weight:700;border:1px solid #FDE68A;">Debt</span>`);

    const nameStyle     = isKurdish ? 'font-weight:400;color:#0F172A;' : 'font-weight:600;color:#0F172A;';
    const buyPriceStyle = isKurdish
      ? 'direction:ltr;text-align:left;color:#475569;'
      : 'text-align:right;color:#475569;';
    const sellPriceStyle = isKurdish
      ? 'direction:ltr;text-align:left;color:#0F172A;font-weight:400;'
      : 'text-align:right;color:#A88924;font-weight:600;';
    const valueStyle = isKurdish
      ? 'direction:ltr;text-align:left;font-weight:400;color:#0F172A;'
      : 'text-align:right;font-weight:700;color:#0F172A;';

    return `
      <tr>
        <td style="${nameStyle}">${escHtml(p.name)}</td>
        <td style="color:#64748B;">${escHtml(p.category)}</td>
        <td style="text-align:center;">${qtyCell}</td>
        <td style="${buyPriceStyle}">${fmtIQD(p.purchasePrice)} IQD</td>
        <td style="${sellPriceStyle}">${fmtIQD(p.sellingPrice)} IQD</td>
        <td style="${valueStyle}">${value} IQD</td>
        <td style="color:#64748B;">${escHtml(p.supplierName ?? '—')}</td>
        <td style="text-align:center;">${statusCell}</td>
      </tr>`;
  }).join('');

  const allProductsLabel = isKurdish
    ? escHtml(t('allProducts', { count: products.length }))
    : `All Products (${products.length})`;

  return `<!DOCTYPE html>
<html lang="${lang}" dir="${dir}">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>${isKurdish ? escHtml(t('title')) : 'Inventory Report'}</title>
<style>
  ${KURDISH_FONT_FACE}
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    direction: ${dir};
    text-align: ${isKurdish ? 'right' : 'left'};
    font-family: ${isKurdish ? "'Rudaw', sans-serif" : "-apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, 'Rudaw', sans-serif"};
    font-weight: ${isKurdish ? 400 : 'normal'};
    background: #F0F4F8;
    color: #0F172A;
    font-size: 14px;
    line-height: 1.5;
  }
  .page { max-width: 900px; margin: 0 auto; background: #fff; }

  .header {
    background: linear-gradient(135deg, #3B300C 0%, #A88924 60%, #D4AF37 100%);
    color: white;
    padding: 36px 32px 28px;
  }
  /* Logo block stays pinned LTR and in place regardless of language --
     only the report-title column's own text becomes Kurdish/RTL. */
  .header-inner { display: flex; justify-content: space-between; align-items: flex-start; gap: 20px; direction: ltr; }
  .biz-name { font-size: 22px; font-weight: 800; letter-spacing: -0.3px; }
  .biz-meta { opacity: 0.82; font-size: 12.5px; margin-top: 4px; line-height: 1.6; }
  .report-title-col { text-align: right; }
  .report-title { font-size: ${isKurdish ? '42px' : '18px'}; font-weight: ${isKurdish ? 400 : 800}; margin-bottom: 4px; }
  .report-sub { opacity: 0.82; font-size: 12.5px; }
  .header-divider { border: none; border-top: 1px solid rgba(255,255,255,0.2); margin: 20px 0 0; }

  .body { padding: 28px 32px; }

  .summary-row { display: flex; gap: 12px; margin-bottom: 16px; }
  .breakdown-row { display: flex; gap: 12px; margin-bottom: 24px; }

  .section-label {
    font-size: ${isKurdish ? '15px' : '10.5px'}; font-weight: 400;
    text-transform: ${isKurdish ? 'none' : 'uppercase'}; letter-spacing: ${isKurdish ? 'normal' : '0.8px'};
    color: ${isKurdish ? '#1F2937' : '#94A3B8'}; margin-bottom: 12px;
    padding-bottom: 8px; border-bottom: 1px solid #F1F5F9;
  }

  .table-wrap { border-radius: 8px; overflow: hidden; border: 1px solid #E2E8F0; margin-bottom: 0; }
  table { width: 100%; border-collapse: collapse; font-size: 12.5px; direction: ${dir}; }
  thead tr { background: linear-gradient(135deg, #3B300C 0%, #A88924 100%); color: white; }
  th { padding: 11px 12px; text-align: ${isKurdish ? 'right' : 'left'}; font-size: 10.5px; font-weight: ${isKurdish ? 400 : 700}; text-transform: ${isKurdish ? 'none' : 'uppercase'}; letter-spacing: 0.5px; }
  td { padding: 10px 12px; border-bottom: 1px solid #F1F5F9; vertical-align: middle; }
  tr:last-child td { border-bottom: none; }
  tfoot tr { background: #F8FAFC; }
  tfoot td { border-top: 2px solid #E2E8F0; font-weight: ${isKurdish ? 400 : 700}; padding: 12px; }

  .footer {
    border-top: 1px solid #E2E8F0;
    text-align: center;
    padding: 18px 32px 22px;
    color: #94A3B8;
    font-size: 12px;
    background: #F8FAFC;
  }

  @media print {
    body { background: white; }
    .page { max-width: 100%; }
    thead tr { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  }
</style>
</head>
<body>
<div class="page">

  <div class="header">
    <div class="header-inner">
      <div>
        ${logoHTML}
        <div class="biz-name">${escHtml(business.name || 'Business')}</div>
        <div class="biz-meta">
          ${business.phone ? escHtml(business.phone) : ''}
          ${business.phone && business.address ? ' &middot; ' : ''}
          ${business.address ? escHtml(business.address) : ''}
        </div>
      </div>
      <div class="report-title-col">
        <div class="report-title">${isKurdish ? `<span dir="rtl">${escHtml(t('title'))}</span>` : 'Inventory Report'}</div>
        <div class="report-sub">${isKurdish ? `${dateStr} &middot; ${timeStr}` : `${dateStr} at ${timeStr}`}</div>
      </div>
    </div>
    <hr class="header-divider" />
  </div>

  <div class="body">

    <div class="section-label">${isKurdish ? escHtml(t('summary')) : 'Summary'}</div>
    <div class="summary-row">
      ${summaryCard(isKurdish ? escHtml(t('totalProducts')) : 'Total Products', fmtIQD(stats.totalProducts), '#FBF7EA', '#3B300C', '#EFE1B3', isKurdish)}
      ${summaryCard(isKurdish ? escHtml(t('totalQuantity')) : 'Total Quantity', fmtIQD(stats.totalQuantity), '#F0FDF4', '#166534', '#BBF7D0', isKurdish)}
      ${summaryCard(isKurdish ? escHtml(t('totalValueIQD')) : 'Total Value (IQD)', `${fmtIQD(stats.totalValueIQD)} IQD`, '#FBF7EA', '#5D4C14', '#EFE1B3', isKurdish)}
      ${summaryCard(isKurdish ? escHtml(t('lowStock')) : 'Low Stock', fmtIQD(stats.lowStockCount), stats.lowStockCount > 0 ? '#FFFBEB' : '#F0FDF4', stats.lowStockCount > 0 ? '#92400E' : '#166534', stats.lowStockCount > 0 ? '#FDE68A' : '#BBF7D0', isKurdish)}
    </div>

    <div class="breakdown-row">
      <div style="flex:1;background:${isKurdish ? '#F8FAFC' : '#F0FDF4'};border-radius:12px;padding:14px 18px;border:1px solid ${isKurdish ? '#E2E8F0' : '#BBF7D0'};text-align:${isKurdish ? 'right' : 'left'};">
        <div style="font-size:${isKurdish ? '11px' : '10.5px'};font-weight:400;color:${isKurdish ? '#475569' : '#166534'};text-transform:${isKurdish ? 'none' : 'uppercase'};letter-spacing:${isKurdish ? 'normal' : '0.8px'};margin-bottom:5px;">${isKurdish ? escHtml(t('paidProducts')) : 'Paid Products'}</div>
        <div style="font-size:${isKurdish ? '22px' : '20px'};font-weight:400;color:${isKurdish ? '#0F172A' : '#166534'};">${fmtIQD(stats.paidCount)}</div>
      </div>
      <div style="flex:1;background:${isKurdish ? '#F8FAFC' : '#FFFBEB'};border-radius:12px;padding:14px 18px;border:1px solid ${isKurdish ? '#E2E8F0' : '#FDE68A'};text-align:${isKurdish ? 'right' : 'left'};">
        <div style="font-size:${isKurdish ? '11px' : '10.5px'};font-weight:400;color:${isKurdish ? '#475569' : '#92400E'};text-transform:${isKurdish ? 'none' : 'uppercase'};letter-spacing:${isKurdish ? 'normal' : '0.8px'};margin-bottom:5px;">${isKurdish ? escHtml(t('debtProducts')) : 'Debt Products'}</div>
        <div style="font-size:${isKurdish ? '22px' : '20px'};font-weight:400;color:${isKurdish ? '#0F172A' : '#92400E'};">${fmtIQD(stats.debtCount)}</div>
      </div>
    </div>

    <div class="section-label">${allProductsLabel}</div>
    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th>${isKurdish ? escHtml(t('product')) : 'Product'}</th>
            <th>${isKurdish ? escHtml(t('category')) : 'Category'}</th>
            <th style="text-align:center;">${isKurdish ? escHtml(t('qty')) : 'Qty'}</th>
            <th style="text-align:${isKurdish ? 'left' : 'right'};">${isKurdish ? escHtml(t('buyPrice')) : 'Buy Price'}</th>
            <th style="text-align:${isKurdish ? 'left' : 'right'};">${isKurdish ? escHtml(t('sellPrice')) : 'Sell Price'}</th>
            <th style="text-align:${isKurdish ? 'left' : 'right'};">${isKurdish ? escHtml(t('value')) : 'Value'}</th>
            <th>${isKurdish ? escHtml(t('supplier')) : 'Supplier'}</th>
            <th style="text-align:center;">${isKurdish ? escHtml(t('status')) : 'Status'}</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
        <tfoot>
          <tr>
            <td colspan="5" style="text-align:right;color:#475569;padding-right:12px;">${isKurdish ? escHtml(t('totalInventoryValue')) : 'Total Inventory Value:'}</td>
            <td style="direction:ltr;text-align:left;color:${isKurdish ? '#0F172A' : '#3B300C'};font-size:14px;">${fmtIQD(stats.totalValueIQD)} IQD</td>
            <td colspan="2"></td>
          </tr>
        </tfoot>
      </table>
    </div>

  </div>

  <div class="footer">
    ${isKurdish ? escHtml(t('generatedBy')) : 'Generated by'} ${isKurdish ? escHtml(business.name) : `<strong>${escHtml(business.name)}</strong>`} &middot; ${isKurdish ? escHtml(i18n.t('common.developedBy') as string) : i18n.t('common.developedBy')} ${i18n.t('common.appName')} · ${PDF_BRAND_WEBSITE} &middot; ${dateStr} at ${timeStr}
  </div>

</div>
</body>
</html>`;
}
