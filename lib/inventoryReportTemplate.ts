import type { InventoryProduct, InventoryStats } from '@/types/inventory';

interface BusinessInfo {
  name: string;
  phone: string;
  address: string;
  logoUri: string | null;
}

export function buildInventoryReportHTML(
  products: InventoryProduct[],
  stats: InventoryStats,
  business: BusinessInfo,
  dir: 'ltr' | 'rtl' = 'ltr'
): string {
  const lang = dir === 'rtl' ? 'ku' : 'en';
  const now = new Date();
  const dateStr = now.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  const timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

  const rows = products.map((p) => {
    const isSold = !p.isActive || (p.idMode === 'unique' && p.quantity === 0);
    const isLow  = p.isActive && p.quantity <= 3 && !isSold;
    const value  = (p.purchasePrice * p.quantity).toLocaleString('en-US');

    const qtyCell = isSold
      ? `<span style="color:#6b7280;font-style:italic">Sold</span>`
      : isLow
        ? `<span style="color:#92400e;font-weight:700">${p.quantity} ⚠</span>`
        : `${p.quantity}`;

    const statusCell = p.paymentStatus === 'paid'
      ? `<span style="background:#dcfce7;color:#166534;padding:2px 8px;border-radius:12px;font-size:11px;font-weight:600">Paid</span>`
      : `<span style="background:#fef3c7;color:#92400e;padding:2px 8px;border-radius:12px;font-size:11px;font-weight:600">Debt</span>`;

    return `
      <tr>
        <td style="padding:10px 12px;border-bottom:1px solid #f1f5f9;font-weight:600;color:#0f172a">${escHtml(p.name)}</td>
        <td style="padding:10px 12px;border-bottom:1px solid #f1f5f9;color:#64748b">${escHtml(p.category)}</td>
        <td style="padding:10px 12px;border-bottom:1px solid #f1f5f9;text-align:center">${qtyCell}</td>
        <td style="padding:10px 12px;border-bottom:1px solid #f1f5f9;text-align:right;color:#0f172a">${p.purchasePrice.toLocaleString('en-US')} IQD</td>
        <td style="padding:10px 12px;border-bottom:1px solid #f1f5f9;text-align:right;color:#3b82f6;font-weight:600">${p.sellingPrice.toLocaleString('en-US')} IQD</td>
        <td style="padding:10px 12px;border-bottom:1px solid #f1f5f9;text-align:right;font-weight:700;color:#0f172a">${value} IQD</td>
        <td style="padding:10px 12px;border-bottom:1px solid #f1f5f9;color:#64748b">${escHtml(p.supplierName ?? '—')}</td>
        <td style="padding:10px 12px;border-bottom:1px solid #f1f5f9;text-align:center">${statusCell}</td>
      </tr>`;
  }).join('');

  return `<!DOCTYPE html>
<html lang="${lang}" dir="${dir}">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>Inventory Report</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: -apple-system, 'Segoe UI', Arial, sans-serif; background: #fff; color: #0f172a; font-size: 14px; }
  @media print {
    body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .no-print { display: none; }
  }
</style>
</head>
<body style="padding:32px 40px;max-width:900px;margin:auto">

  <!-- Header -->
  <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:32px;padding-bottom:24px;border-bottom:2px solid #1e40af">
    <div>
      <div style="font-size:24px;font-weight:800;color:#1e40af;margin-bottom:4px">${escHtml(business.name)}</div>
      ${business.phone ? `<div style="color:#64748b;font-size:13px">${escHtml(business.phone)}</div>` : ''}
      ${business.address ? `<div style="color:#64748b;font-size:13px">${escHtml(business.address)}</div>` : ''}
    </div>
    <div style="text-align:right">
      <div style="font-size:20px;font-weight:700;color:#0f172a">Inventory Report</div>
      <div style="color:#64748b;margin-top:4px;font-size:13px">${dateStr} at ${timeStr}</div>
    </div>
  </div>

  <!-- Summary -->
  <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:16px;margin-bottom:32px">
    ${summaryCard('Total Products', String(stats.totalProducts), '#eff6ff', '#1e40af')}
    ${summaryCard('Total Quantity', String(stats.totalQuantity), '#f0fdf4', '#166534')}
    ${summaryCard('Total Value', `${stats.totalValueIQD.toLocaleString('en-US')} IQD`, '#eff6ff', '#1e40af')}
    ${summaryCard('Low Stock', String(stats.lowStockCount), stats.lowStockCount > 0 ? '#fffbeb' : '#f0fdf4', stats.lowStockCount > 0 ? '#92400e' : '#166534')}
  </div>

  <!-- Debt / Paid breakdown -->
  <div style="display:flex;gap:16px;margin-bottom:32px">
    <div style="flex:1;background:#f0fdf4;border-radius:12px;padding:14px 18px;border:1px solid #bbf7d0">
      <div style="font-size:12px;font-weight:600;color:#166534;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:4px">Paid</div>
      <div style="font-size:20px;font-weight:800;color:#166534">${stats.paidCount} products</div>
    </div>
    <div style="flex:1;background:#fffbeb;border-radius:12px;padding:14px 18px;border:1px solid #fde68a">
      <div style="font-size:12px;font-weight:600;color:#92400e;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:4px">Debt</div>
      <div style="font-size:20px;font-weight:800;color:#92400e">${stats.debtCount} products</div>
    </div>
  </div>

  <!-- Products table -->
  <div style="margin-bottom:32px">
    <div style="font-size:14px;font-weight:700;color:#475569;text-transform:uppercase;letter-spacing:0.8px;margin-bottom:12px">
      All Products (${products.length})
    </div>
    <table style="width:100%;border-collapse:collapse;font-size:13px">
      <thead>
        <tr style="background:linear-gradient(135deg,#1e40af,#3b82f6);color:#fff">
          <th style="padding:11px 12px;text-align:left;border-radius:0;font-weight:600">Product</th>
          <th style="padding:11px 12px;text-align:left;font-weight:600">Category</th>
          <th style="padding:11px 12px;text-align:center;font-weight:600">Qty</th>
          <th style="padding:11px 12px;text-align:right;font-weight:600">Buy Price</th>
          <th style="padding:11px 12px;text-align:right;font-weight:600">Sell Price</th>
          <th style="padding:11px 12px;text-align:right;font-weight:600">Value</th>
          <th style="padding:11px 12px;text-align:left;font-weight:600">Supplier</th>
          <th style="padding:11px 12px;text-align:center;font-weight:600">Status</th>
        </tr>
      </thead>
      <tbody>
        ${rows}
      </tbody>
      <tfoot>
        <tr style="background:#f8fafc;font-weight:700">
          <td colspan="5" style="padding:12px;border-top:2px solid #e2e8f0;text-align:right;color:#475569">Total Inventory Value:</td>
          <td style="padding:12px;border-top:2px solid #e2e8f0;text-align:right;color:#1e40af;font-size:15px">
            ${stats.totalValueIQD.toLocaleString('en-US')} IQD
          </td>
          <td colspan="2" style="border-top:2px solid #e2e8f0"></td>
        </tr>
      </tfoot>
    </table>
  </div>

  <!-- Footer -->
  <div style="text-align:center;padding-top:24px;border-top:1px solid #e2e8f0;color:#94a3b8;font-size:12px">
    Generated by ManagerX · ${dateStr} at ${timeStr}
  </div>

</body>
</html>`;
}

function summaryCard(label: string, value: string, bg: string, color: string): string {
  return `
    <div style="background:${bg};border-radius:12px;padding:16px;border:1px solid ${color}22">
      <div style="font-size:11px;font-weight:600;color:${color};text-transform:uppercase;letter-spacing:0.5px;margin-bottom:6px">${label}</div>
      <div style="font-size:18px;font-weight:800;color:${color}">${value}</div>
    </div>`;
}

function escHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
