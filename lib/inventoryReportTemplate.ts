import type { InventoryProduct, InventoryStats } from '@/types/inventory';
import { fmtIQD, fmtUSD, fmtPct } from '@/utils/formatters';
import { KURDISH_FONT_FACE } from '@/lib/pdfFont';

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


function summaryCard(label: string, value: string, bg: string, textColor: string, borderColor: string): string {
  return `
    <div style="background:${bg};border-radius:12px;padding:16px 14px;border:1px solid ${borderColor};flex:1;min-width:0;">
      <div style="font-size:10.5px;font-weight:700;color:${textColor};text-transform:uppercase;letter-spacing:0.8px;margin-bottom:7px;">${label}</div>
      <div style="font-size:17px;font-weight:800;color:${textColor};line-height:1.2;">${value}</div>
    </div>`;
}

export function buildInventoryReportHTML(
  products: InventoryProduct[],
  stats: InventoryStats,
  business: BusinessInfo,
  dir: 'ltr' | 'rtl' = 'ltr'
): string {
  const lang = 'en';
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
      ? `<span style="color:#94A3B8;font-style:italic;font-size:12px;">Sold</span>`
      : isLow
        ? `<span style="color:#92400E;font-weight:700;">${p.quantity} &#9888;</span>`
        : `<span style="font-weight:600;">${p.quantity}</span>`;

    const statusCell = p.paymentStatus === 'paid'
      ? `<span style="background:#DCFCE7;color:#166534;padding:3px 9px;border-radius:20px;font-size:11px;font-weight:700;border:1px solid #BBF7D0;">Paid</span>`
      : `<span style="background:#FEF3C7;color:#92400E;padding:3px 9px;border-radius:20px;font-size:11px;font-weight:700;border:1px solid #FDE68A;">Debt</span>`;

    return `
      <tr>
        <td style="font-weight:600;color:#0F172A;">${escHtml(p.name)}</td>
        <td style="color:#64748B;">${escHtml(p.category)}</td>
        <td style="text-align:center;">${qtyCell}</td>
        <td style="text-align:right;color:#475569;">${fmtIQD(p.purchasePrice)} IQD</td>
        <td style="text-align:right;color:#2563EB;font-weight:600;">${fmtIQD(p.sellingPrice)} IQD</td>
        <td style="text-align:right;font-weight:700;color:#0F172A;">${value} IQD</td>
        <td style="color:#64748B;">${escHtml(p.supplierName ?? '—')}</td>
        <td style="text-align:center;">${statusCell}</td>
      </tr>`;
  }).join('');

  return `<!DOCTYPE html>
<html lang="${lang}" dir="${dir}">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>Inventory Report</title>
<style>
  ${KURDISH_FONT_FACE}
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    direction: ltr;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, 'Rudaw', sans-serif;
    background: #F0F4F8;
    color: #0F172A;
    font-size: 14px;
    line-height: 1.5;
  }
  .page { max-width: 900px; margin: 0 auto; background: #fff; }

  .header {
    background: linear-gradient(135deg, #1E3A8A 0%, #2563EB 60%, #3B82F6 100%);
    color: white;
    padding: 36px 32px 28px;
  }
  .header-inner { display: flex; justify-content: space-between; align-items: flex-start; gap: 20px; }
  .biz-name { font-size: 22px; font-weight: 800; letter-spacing: -0.3px; }
  .biz-meta { opacity: 0.82; font-size: 12.5px; margin-top: 4px; line-height: 1.6; }
  .report-title-col { text-align: ${dir === 'rtl' ? 'left' : 'right'}; }
  .report-title { font-size: 18px; font-weight: 800; margin-bottom: 4px; }
  .report-sub { opacity: 0.82; font-size: 12.5px; }
  .header-divider { border: none; border-top: 1px solid rgba(255,255,255,0.2); margin: 20px 0 0; }

  .body { padding: 28px 32px; }

  .summary-row { display: flex; gap: 12px; margin-bottom: 16px; }
  .breakdown-row { display: flex; gap: 12px; margin-bottom: 24px; }

  .section-label {
    font-size: 10.5px; font-weight: 700;
    text-transform: uppercase; letter-spacing: 0.8px;
    color: #94A3B8; margin-bottom: 12px;
    padding-bottom: 8px; border-bottom: 1px solid #F1F5F9;
  }

  .table-wrap { border-radius: 8px; overflow: hidden; border: 1px solid #E2E8F0; margin-bottom: 0; }
  table { width: 100%; border-collapse: collapse; font-size: 12.5px; }
  thead tr { background: linear-gradient(135deg, #1E3A8A 0%, #2563EB 100%); color: white; }
  th { padding: 11px 12px; text-align: left; font-size: 10.5px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; }
  td { padding: 10px 12px; border-bottom: 1px solid #F1F5F9; vertical-align: middle; }
  tr:last-child td { border-bottom: none; }
  tfoot tr { background: #F8FAFC; }
  tfoot td { border-top: 2px solid #E2E8F0; font-weight: 700; padding: 12px; }

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
        <div class="report-title">Inventory Report</div>
        <div class="report-sub">${dateStr} at ${timeStr}</div>
      </div>
    </div>
    <hr class="header-divider" />
  </div>

  <div class="body">

    <div class="section-label">Summary</div>
    <div class="summary-row">
      ${summaryCard('Total Products', fmtIQD(stats.totalProducts), '#EFF6FF', '#1E3A8A', '#BFDBFE')}
      ${summaryCard('Total Quantity', fmtIQD(stats.totalQuantity), '#F0FDF4', '#166534', '#BBF7D0')}
      ${summaryCard('Total Value (IQD)', `${fmtIQD(stats.totalValueIQD)} IQD`, '#EFF6FF', '#1E40AF', '#BFDBFE')}
      ${summaryCard('Low Stock', fmtIQD(stats.lowStockCount), stats.lowStockCount > 0 ? '#FFFBEB' : '#F0FDF4', stats.lowStockCount > 0 ? '#92400E' : '#166534', stats.lowStockCount > 0 ? '#FDE68A' : '#BBF7D0')}
    </div>

    <div class="breakdown-row">
      <div style="flex:1;background:#F0FDF4;border-radius:12px;padding:14px 18px;border:1px solid #BBF7D0;">
        <div style="font-size:10.5px;font-weight:700;color:#166534;text-transform:uppercase;letter-spacing:0.8px;margin-bottom:5px;">Paid Products</div>
        <div style="font-size:20px;font-weight:800;color:#166534;">${fmtIQD(stats.paidCount)}</div>
      </div>
      <div style="flex:1;background:#FFFBEB;border-radius:12px;padding:14px 18px;border:1px solid #FDE68A;">
        <div style="font-size:10.5px;font-weight:700;color:#92400E;text-transform:uppercase;letter-spacing:0.8px;margin-bottom:5px;">Debt Products</div>
        <div style="font-size:20px;font-weight:800;color:#92400E;">${fmtIQD(stats.debtCount)}</div>
      </div>
    </div>

    <div class="section-label">All Products (${products.length})</div>
    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Product</th>
            <th>Category</th>
            <th style="text-align:center;">Qty</th>
            <th style="text-align:right;">Buy Price</th>
            <th style="text-align:right;">Sell Price</th>
            <th style="text-align:right;">Value</th>
            <th>Supplier</th>
            <th style="text-align:center;">Status</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
        <tfoot>
          <tr>
            <td colspan="5" style="text-align:right;color:#475569;padding-right:12px;">Total Inventory Value:</td>
            <td style="text-align:right;color:#1E3A8A;font-size:14px;">${fmtIQD(stats.totalValueIQD)} IQD</td>
            <td colspan="2"></td>
          </tr>
        </tfoot>
      </table>
    </div>

  </div>

  <div class="footer">
    Generated by <strong>${escHtml(business.name)}</strong> &middot; ManagerX &middot; ${dateStr} at ${timeStr}
  </div>

</div>
</body>
</html>`;
}
