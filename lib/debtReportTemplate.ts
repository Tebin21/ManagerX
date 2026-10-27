import type { SalesDebtDetail, PurchaseDebt, DebtPayment, DebtOverviewSummary } from '@/types/debt';
import type { SaleItem } from '@/types/sales';
import type { Purchase } from '@/types/purchases';
import { fmtIQD, fmtUSD, fmtPct, formatDate, formatDateTime, formatTime } from '@/utils/formatters';
import { KURDISH_FONT_FACE, PDF_BRAND_WEBSITE, PDF_DEVELOPED_BY_EN, kuSpan, isKurdishPdfActive, pdfDevelopedByText } from '@/lib/pdfFont';
import { useSettingsStore } from '@/store/settingsStore';

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


function pctPaid(paid: number, original: number): number {
  if (original <= 0) return 0;
  return Math.min(100, Math.round((paid / original) * 100));
}

// ─── Shared CSS ───────────────────────────────────────────────────────────────

function sharedCSS(dir: 'ltr' | 'rtl'): string {
  return `
    ${KURDISH_FONT_FACE}
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      direction: ltr;
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, 'Bahij Janna', sans-serif;
      background: #F0F4F8;
      color: #111827;
      font-size: 14px;
      line-height: 1.5;
    }
    .page { max-width: 720px; margin: 0 auto; background: #fff; }

    /* ── Header ── */
    .header { color: white; padding: 36px 28px 24px; }
    .header-top { display: flex; justify-content: space-between; align-items: flex-start; gap: 16px; margin-bottom: 20px; }
    .logo {
      height: 60px; max-width: 160px; object-fit: contain;
      margin-bottom: 10px; display: block;
      background: white; border-radius: 8px; padding: 4px;
    }
    .biz-name { font-size: 21px; font-weight: 800; letter-spacing: -0.3px; }
    .biz-sub { font-size: 12.5px; opacity: 0.82; margin-top: 3px; line-height: 1.5; }
    .report-badge {
      font-size: 12px; font-weight: 700;
      background: rgba(255,255,255,0.18);
      padding: 5px 14px; border-radius: 20px;
      text-align: ${dir === 'rtl' ? 'left' : 'right'};
      white-space: nowrap;
    }
    .report-date {
      font-size: 11px; opacity: 0.72; margin-top: 5px;
      text-align: ${dir === 'rtl' ? 'left' : 'right'};
    }
    .header-divider { border: none; border-top: 1px solid rgba(255,255,255,0.2); margin-bottom: 20px; }

    /* ── Party box ── */
    .party-box {
      background: rgba(255,255,255,0.14);
      border: 1px solid rgba(255,255,255,0.22);
      border-radius: 12px;
      padding: 16px 18px;
    }
    .party-name { font-size: 19px; font-weight: 800; margin-bottom: 7px; }
    .party-meta { display: flex; gap: 16px; flex-wrap: wrap; }
    .party-meta span { font-size: 12.5px; opacity: 0.88; }

    /* ── Sections ── */
    .section { padding: 22px 28px; border-bottom: 1px solid #F1F5F9; }
    .section:last-child { border-bottom: none; }
    .section-title {
      font-size: 10.5px; font-weight: 700;
      color: #94A3B8; text-transform: uppercase;
      letter-spacing: 0.8px; margin-bottom: 16px;
      padding-bottom: 8px;
      border-bottom: 1px solid #F1F5F9;
    }

    /* ── Stat grid ── */
    .status-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-bottom: 16px; }
    .stat-cell {
      background: #F8FAFC;
      border: 1px solid #E8EEF4;
      border-radius: 10px;
      padding: 14px 10px;
      text-align: center;
    }
    .stat-label { font-size: 11px; color: #94A3B8; margin-bottom: 5px; font-weight: 600; }
    .stat-value { font-size: 16px; font-weight: 800; color: #1E293B; line-height: 1.2; }
    .stat-value.green { color: #059669; }
    .stat-value.red   { color: #DC2626; }
    .stat-value.blue  { color: #5D4C14; }

    /* ── Progress bar ── */
    .progress-bar-bg { background: #E2E8F0; border-radius: 4px; height: 8px; margin: 4px 0 6px; overflow: hidden; }
    .progress-bar-fill { border-radius: 4px; height: 8px; min-width: 2px; }
    .progress-row { display: flex; justify-content: space-between; align-items: center; }
    .progress-label { font-size: 12px; color: #64748B; font-weight: 600; }
    .status-pill {
      display: inline-block; padding: 4px 14px;
      border-radius: 20px; font-size: 12px; font-weight: 700;
    }

    /* ── Tables ── */
    .table-wrap { border-radius: 8px; overflow: hidden; border: 1px solid #E2E8F0; }
    table { width: 100%; border-collapse: collapse; }
    th {
      background: #F1F5F9; padding: 10px 14px;
      text-align: left; font-size: 10.5px;
      font-weight: 700; color: #64748B;
      text-transform: uppercase; letter-spacing: 0.5px;
      border-bottom: 1px solid #E2E8F0;
    }
    td { padding: 11px 14px; font-size: 13px; border-bottom: 1px solid #F1F5F9; color: #334155; }
    tr:last-child td { border-bottom: none; }

    /* ── Detail table (two-col) ── */
    .detail-table td { padding: 8px 14px; }
    .detail-label { color: #64748B; width: 140px; font-size: 12.5px; }
    .detail-value { font-weight: 600; }

    /* ── Footer ── */
    .footer {
      padding: 18px 28px 22px;
      text-align: center;
      background: #F8FAFC;
      border-top: 1px solid #E2E8F0;
    }
    .footer p { font-size: 11.5px; color: #94A3B8; }

    @media print {
      body { background: white; }
      .stat-cell { border: 1px solid #ddd; }
    }
  `;
}

// ─── Sales Debt Report ────────────────────────────────────────────────────────

export function buildSalesDebtReportHTML(
  debt: SalesDebtDetail,
  payments: DebtPayment[],
  business: BusinessInfo,
  dir: 'ltr' | 'rtl' = 'ltr',
  items?: SaleItem[]
): string {
  const isKurdish = dir === 'rtl' || isKurdishPdfActive();
  const lang = isKurdish ? 'ku' : 'en';
  const ku = kuSpan;
  const pct = pctPaid(debt.paidAmount, debt.originalAmount);

  const baseCurrency = useSettingsStore.getState().baseCurrency || 'IQD';
  const rate = useSettingsStore.getState().exchangeRate || 1310;
  const isUsd = baseCurrency === 'USD';
  const fmtMoney = (val: number) => isUsd ? `$${fmtUSD(val / rate)}` : `${fmtIQD(val)} IQD`;
  const fmtMoneyVal = (val: number) => isUsd ? `$${fmtUSD(val / rate)}` : fmtIQD(val);
  const curUnit = isUsd ? 'USD' : 'IQD';

  const logoHTML = business.logoUri
    ? `<img src="${business.logoUri}" class="logo" alt="logo" />`
    : '';

  const paymentsRows = payments.length === 0
    ? `<tr><td colspan="3" style="text-align:center;color:#94A3B8;padding:18px;font-style:italic;">${isKurdish ? ku('هیچ پارەدانێک تۆمار نەکراوە') : 'No payments recorded yet'}</td></tr>`
    : payments.map((p) => `
        <tr>
          <td><span class="en-num" dir="ltr">${formatDateTime(p.createdAt)}</span></td>
          <td style="color:#059669;font-weight:700;"><span class="en-num" dir="ltr">+${fmtMoney(p.amount)}</span></td>
          <td style="color:#5D4C14;font-weight:600;"><span class="en-num" dir="ltr">${fmtMoney(p.remainingAfter)}</span></td>
        </tr>
      `).join('');

  const settled = debt.remainingAmount <= 0;
  const fillColor = settled ? '#059669' : '#5D4C14';
  const statusStyle = settled
    ? 'background:#D1FAE5;color:#059669;'
    : 'background:#FEE2E2;color:#DC2626;';
  const statusLabel = settled
    ? (isKurdish ? ku('تەواوکراو') : 'SETTLED')
    : (isKurdish ? ku('چالاک') : 'ACTIVE');

  // Items & Batches Table HTML
  let itemsSectionHTML = '';
  if (items && items.length > 0) {
    itemsSectionHTML = `
      <div class="section">
        <div class="section-title">${isKurdish ? ku('کاڵا و وەجبەکانی ئەم قەرزە (بەستنەوەی فرۆشتن)') : 'Items & Batches of this Debt'}</div>
        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th style="width:30px;text-align:center;">#</th>
                <th style="text-align:${dir === 'rtl' ? 'right' : 'left'};">${isKurdish ? ku('ناوی کاڵا') : 'Product'}</th>
                <th style="text-align:center;">${isKurdish ? ku('وەجبە') : 'Batch #'}</th>
                <th style="text-align:center;">${isKurdish ? ku('بڕ') : 'Qty'}</th>
                <th style="text-align:${dir === 'rtl' ? 'left' : 'right'};">${isKurdish ? ku('نرخی دانە') : 'Unit Price'}</th>
                <th style="text-align:${dir === 'rtl' ? 'left' : 'right'};">${isKurdish ? ku('کۆی گشتی') : 'Total'}</th>
              </tr>
            </thead>
            <tbody>
              ${items.map((it, idx) => `
                <tr>
                  <td style="text-align:center;color:#64748B;font-size:11px;"><span class="en-num" dir="ltr">${idx + 1}</span></td>
                  <td style="font-weight:700;color:#0F172A;">
                    ${escHtml(it.productName)}
                    ${it.itemId ? `<span style="font-size:10px;color:#94A3B8;display:block;">ID: <span class="en-num" dir="ltr">${escHtml(it.itemId)}</span></span>` : ''}
                  </td>
                  <td style="text-align:center;">
                    <span style="background:#FEF9C3;color:#854D0E;border:1px solid #FDE047;border-radius:12px;padding:2px 8px;font-size:11px;font-weight:700;">
                      ${isKurdish ? ku(`وەجبەی ${it.batchNumber || 1}`) : `Batch #${it.batchNumber || 1}`}
                    </span>
                  </td>
                  <td style="text-align:center;font-weight:700;color:#0F172A;"><span class="en-num" dir="ltr">${it.quantity}</span></td>
                  <td style="text-align:${dir === 'rtl' ? 'left' : 'right'};"><span class="en-num" dir="ltr">${fmtMoney(it.sellingPrice || (it as any).unitPrice || 0)}</span></td>
                  <td style="text-align:${dir === 'rtl' ? 'left' : 'right'};font-weight:700;color:#0F172A;"><span class="en-num" dir="ltr">${fmtMoney(it.lineTotal)}</span></td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
        <div style="background:#FFFDF5;border:1px solid #FDE047;border-radius:8px;padding:9px 13px;margin-top:10px;font-size:11.5px;color:#854D0E;display:flex;align-items:center;gap:6px;">
          <span>📦</span>
          <span>${isKurdish ? ku(`ئەم قەرزە ڕاستەوخۆ پەیوەستە بە کاڵاکان و وەجبەکانی وەسڵی #${debt.invoiceNumber}.`) : `This debt is directly linked to the items and batches in invoice #${debt.invoiceNumber}.`}</span>
        </div>
      </div>
    `;
  } else if (debt.productsSummary) {
    itemsSectionHTML = `
      <div class="section">
        <div class="section-title">${isKurdish ? ku('کاڵا و وەجبەکانی ئەم قەرزە') : 'Items & Batches of this Debt'}</div>
        <div style="background:#FEF9C3;border:1px solid #FDE047;border-radius:8px;padding:12px 16px;color:#854D0E;font-size:12px;font-weight:600;line-height:1.6;">
          📦 ${escHtml(debt.productsSummary)}
        </div>
      </div>
    `;
  }

  return `<!DOCTYPE html>
<html lang="${lang}" dir="${dir}">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${isKurdish ? ku('ڕاپۆرتی قەرزی کڕیار') : 'Debt Report'} — ${escHtml(debt.customerName)}</title>
  <style>${sharedCSS(dir)}</style>
</head>
<body>
<div class="page">

  <div class="header" style="background:linear-gradient(135deg,#3B300C 0%,#A88924 60%,#D4AF37 100%);">
    <div class="header-top">
      <div>
        ${logoHTML}
        <div class="biz-name">${escHtml(business.name || 'Business')}</div>
        <div class="biz-sub">
          ${escHtml(business.phone)}
          ${business.phone && business.address ? ' &middot; ' : ''}
          ${escHtml(business.address)}
        </div>
      </div>
      <div>
        <div class="report-badge">${isKurdish ? ku('ڕاپۆرتی قەرز') : 'DEBT REPORT'}</div>
        <div class="report-date">${isKurdish ? ku('بەروار: ') : 'Generated '}<span class="en-num" dir="ltr">${formatDate(new Date().toISOString())}</span></div>
      </div>
    </div>
    <hr class="header-divider" />
    <div class="party-box">
      <div class="party-name">${escHtml(debt.customerName)}</div>
      <div class="party-meta">
        ${debt.customerPhone   ? `<span>&#128222; <span class="en-num" dir="ltr">${escHtml(debt.customerPhone)}</span></span>` : ''}
        ${debt.customerAddress ? `<span>&#128205; ${escHtml(debt.customerAddress)}</span>` : ''}
        <span>${isKurdish ? ku('ژ. وەسڵ: ') : 'Invoice: '}<strong>#${escHtml(debt.invoiceNumber)}</strong></span>
      </div>
    </div>
  </div>

  <div class="section">
    <div class="section-title">${isKurdish ? ku('پوختەی قەرز') : 'Debt Summary'}</div>
    <div class="status-grid">
      <div class="stat-cell">
        <div class="stat-label">${isKurdish ? ku('کۆی سەرەتایی') : 'Original Amount'}</div>
        <div class="stat-value blue"><span class="en-num" dir="ltr">${fmtMoneyVal(debt.originalAmount)}</span><br /><span style="font-size:11px;font-weight:600;"> ${curUnit}</span></div>
      </div>
      <div class="stat-cell">
        <div class="stat-label">${isKurdish ? ku('کۆی دراو') : 'Total Paid'}</div>
        <div class="stat-value green"><span class="en-num" dir="ltr">${fmtMoneyVal(debt.paidAmount)}</span><br /><span style="font-size:11px;font-weight:600;"> ${curUnit}</span></div>
      </div>
      <div class="stat-cell">
        <div class="stat-label">${isKurdish ? ku('قەرزی ماوە') : 'Remaining'}</div>
        <div class="stat-value ${debt.remainingAmount > 0 ? 'red' : 'green'}"><span class="en-num" dir="ltr">${fmtMoneyVal(debt.remainingAmount)}</span><br /><span style="font-size:11px;font-weight:600;"> ${curUnit}</span></div>
      </div>
    </div>
    <div class="progress-bar-bg">
      <div class="progress-bar-fill" style="width:${pct}%;background:${fillColor};"></div>
    </div>
    <div class="progress-row">
      <span class="progress-label"><span class="en-num" dir="ltr">${pct}%</span> ${isKurdish ? ku('دراوە') : 'paid'}</span>
      <span class="status-pill" style="${statusStyle}">${statusLabel}</span>
    </div>
  </div>

  ${itemsSectionHTML}

  <div class="section">
    <div class="section-title">${isKurdish ? ku('وردەکاریی وەسڵ') : 'Invoice Details'}</div>
    <div class="table-wrap">
      <table class="detail-table">
        <tr><td class="detail-label">${isKurdish ? ku('ژمارەی وەسڵ') : 'Invoice #'}</td><td class="detail-value"><span class="en-num" dir="ltr">#${escHtml(debt.invoiceNumber)}</span></td></tr>
        <tr><td class="detail-label">${isKurdish ? ku('بەروار') : 'Date'}</td><td><span class="en-num" dir="ltr">${formatDate(debt.createdAt)}</span></td></tr>
        ${debt.warranty  ? `<tr><td class="detail-label">${isKurdish ? ku('گەڕانەوە / گەرەنتی') : 'Warranty'}</td><td>${escHtml(debt.warranty)}</td></tr>` : ''}
        ${debt.saleNotes ? `<tr><td class="detail-label">${isKurdish ? ku('تێبینی') : 'Notes'}</td><td>${escHtml(debt.saleNotes)}</td></tr>` : ''}
      </table>
    </div>
  </div>

  <div class="section">
    <div class="section-title">${isKurdish ? ku(`مێژووی پارەدان (${payments.length})`) : `Payment History (${payments.length} payment${payments.length !== 1 ? 's' : ''})`}</div>
    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th>${isKurdish ? ku('بەروار و کات') : 'Date & Time'}</th>
            <th>${isKurdish ? ku('بڕی دراو') : 'Amount Paid'}</th>
            <th>${isKurdish ? ku('ماوە لە دوای پارەدان') : 'Remaining After'}</th>
          </tr>
        </thead>
        <tbody>${paymentsRows}</tbody>
      </table>
    </div>
  </div>

  <div class="footer">
    <p>Generated by <strong>${escHtml(business.name)}</strong> &middot; ${PDF_DEVELOPED_BY_EN} &middot; ${PDF_BRAND_WEBSITE} &middot; <span class="en-num" dir="ltr">${formatDateTime(new Date().toISOString())}</span></p>
  </div>

</div>
</body>
</html>`;
}

// ─── Purchase Debt Report ─────────────────────────────────────────────────────

export function buildPurchaseDebtReportHTML(
  debt: PurchaseDebt,
  payments: DebtPayment[],
  business: BusinessInfo,
  dir: 'ltr' | 'rtl' = 'ltr',
  purchase?: Purchase | null
): string {
  const isKurdish = dir === 'rtl' || isKurdishPdfActive();
  const lang = isKurdish ? 'ku' : 'en';
  const ku = kuSpan;
  const pct = pctPaid(debt.paidAmount, debt.originalAmount);

  const baseCurrency = useSettingsStore.getState().baseCurrency || 'IQD';
  const rate = useSettingsStore.getState().exchangeRate || 1310;
  const isUsd = baseCurrency === 'USD';
  const fmtMoney = (val: number) => isUsd ? `$${fmtUSD(val / rate)}` : `${fmtIQD(val)} IQD`;
  const fmtMoneyVal = (val: number) => isUsd ? `$${fmtUSD(val / rate)}` : fmtIQD(val);
  const curUnit = isUsd ? 'USD' : 'IQD';

  const logoHTML = business.logoUri
    ? `<img src="${business.logoUri}" class="logo" alt="logo" />`
    : '';

  const paymentsRows = payments.length === 0
    ? `<tr><td colspan="3" style="text-align:center;color:#94A3B8;padding:18px;font-style:italic;">${isKurdish ? ku('هیچ پارەدانێک تۆمار نەکراوە') : 'No payments recorded yet'}</td></tr>`
    : payments.map((p) => `
        <tr>
          <td><span class="en-num" dir="ltr">${formatDateTime(p.createdAt)}</span></td>
          <td style="color:#059669;font-weight:700;"><span class="en-num" dir="ltr">+${fmtMoney(p.amount)}</span></td>
          <td style="color:#DC2626;font-weight:600;"><span class="en-num" dir="ltr">${fmtMoney(p.remainingAfter)}</span></td>
        </tr>
      `).join('');

  const settled = debt.remainingAmount <= 0;
  const fillColor = settled ? '#059669' : '#DC2626';
  const statusStyle = settled
    ? 'background:#D1FAE5;color:#059669;'
    : 'background:#FEE2E2;color:#DC2626;';
  const statusLabel = settled
    ? (isKurdish ? ku('تەواوکراو') : 'SETTLED')
    : (isKurdish ? ku('چالاک') : 'ACTIVE');

  const prodName = debt.productName || purchase?.productName || '';
  const batchNum = debt.batchNumber || 1;
  const totalBatches = debt.totalBatches || 1;
  const batchQty = debt.batchQuantity || purchase?.quantity;

  return `<!DOCTYPE html>
<html lang="${lang}" dir="${dir}">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${isKurdish ? ku('ڕاپۆرتی قەرزی دابینکەر') : 'Supplier Debt Report'} — ${escHtml(debt.supplierName)}</title>
  <style>${sharedCSS(dir)}</style>
</head>
<body>
<div class="page">

  <div class="header" style="background:linear-gradient(135deg,#7F1D1D 0%,#B91C1C 60%,#DC2626 100%);">
    <div class="header-top">
      <div>
        ${logoHTML}
        <div class="biz-name">${escHtml(business.name || 'Business')}</div>
        <div class="biz-sub">
          ${escHtml(business.phone)}
          ${business.phone && business.address ? ' &middot; ' : ''}
          ${escHtml(business.address)}
        </div>
      </div>
      <div>
        <div class="report-badge">${isKurdish ? ku('قەرزی دابینکەر') : 'SUPPLIER DEBT REPORT'}</div>
        <div class="report-date">${isKurdish ? ku('بەروار: ') : 'Generated '}<span class="en-num" dir="ltr">${formatDate(new Date().toISOString())}</span></div>
      </div>
    </div>
    <hr class="header-divider" />
    <div class="party-box">
      <div class="party-name">${escHtml(debt.supplierName)}</div>
      <div class="party-meta">
        ${debt.supplierPhone   ? `<span>&#128222; <span class="en-num" dir="ltr">${escHtml(debt.supplierPhone)}</span></span>` : ''}
        ${debt.supplierAddress ? `<span>&#128205; ${escHtml(debt.supplierAddress)}</span>` : ''}
        ${debt.purchaseNumber  ? `<span>${isKurdish ? ku('ژ. کڕین: ') : 'Ref: '}<strong>#${escHtml(debt.purchaseNumber)}</strong></span>` : ''}
      </div>
    </div>
  </div>

  <div class="section">
    <div class="section-title">${isKurdish ? ku('پوختەی قەرز و پارەدان') : 'Payment Summary'}</div>
    <div class="status-grid">
      <div class="stat-cell">
        <div class="stat-label">${isKurdish ? ku('کۆی قەرز') : 'Total Owed'}</div>
        <div class="stat-value" style="color:#1E293B;"><span class="en-num" dir="ltr">${fmtMoneyVal(debt.originalAmount)}</span><br /><span style="font-size:11px;font-weight:600;"> ${curUnit}</span></div>
      </div>
      <div class="stat-cell">
        <div class="stat-label">${isKurdish ? ku('پارەی دراو') : 'Paid to Supplier'}</div>
        <div class="stat-value green"><span class="en-num" dir="ltr">${fmtMoneyVal(debt.paidAmount)}</span><br /><span style="font-size:11px;font-weight:600;"> ${curUnit}</span></div>
      </div>
      <div class="stat-cell">
        <div class="stat-label">${isKurdish ? ku('قەرزی ماوە') : 'Still Owe'}</div>
        <div class="stat-value ${debt.remainingAmount > 0 ? 'red' : 'green'}"><span class="en-num" dir="ltr">${fmtMoneyVal(debt.remainingAmount)}</span><br /><span style="font-size:11px;font-weight:600;"> ${curUnit}</span></div>
      </div>
    </div>
    <div class="progress-bar-bg">
      <div class="progress-bar-fill" style="width:${pct}%;background:${fillColor};"></div>
    </div>
    <div class="progress-row">
      <span class="progress-label"><span class="en-num" dir="ltr">${pct}%</span> ${isKurdish ? ku('دراوە') : 'paid'}</span>
      <span class="status-pill" style="${statusStyle}">${statusLabel}</span>
    </div>
  </div>

  <!-- Product & Batch Details -->
  ${prodName ? `
    <div class="section">
      <div class="section-title">${isKurdish ? ku('زانیاریی بەرهەم و وەجبەی ئەم قەرزە (بەستنەوەی کڕین)') : 'Product & Batch Details (Purchase Linkage)'}</div>
      <div class="table-wrap">
        <table class="detail-table">
          <tr>
            <td class="detail-label">${isKurdish ? ku('ناوی بەرهەم') : 'Product'}</td>
            <td class="detail-value" style="font-weight:700;color:#0F172A;">${escHtml(prodName)}</td>
          </tr>
          <tr>
            <td class="detail-label">${isKurdish ? ku('وەجبەی کڕین') : 'Batch #'}</td>
            <td class="detail-value">
              <span style="background:#FEF9C3;color:#854D0E;border:1px solid #FDE047;border-radius:12px;padding:3px 10px;font-size:11.5px;font-weight:700;">
                ${isKurdish ? ku(`وەجبەی ${batchNum}`) : `Batch #${batchNum}`}
                ${totalBatches > 1 ? (isKurdish ? ku(` (لە کۆی ${totalBatches} وەجبە)`) : ` (of ${totalBatches} batches)`) : ''}
              </span>
            </td>
          </tr>
          ${batchQty ? `
            <tr>
              <td class="detail-label">${isKurdish ? ku('بڕی وەجبە') : 'Batch Quantity'}</td>
              <td class="detail-value" style="font-weight:700;"><span class="en-num" dir="ltr">${batchQty}</span> ${isKurdish ? ku('دانە') : 'pcs'}</td>
            </tr>
          ` : ''}
          ${purchase?.expiryDate ? `
            <tr>
              <td class="detail-label">${isKurdish ? ku('بەرواری بەسەرچوون') : 'Expiry Date'}</td>
              <td class="detail-value" style="color:#D97706;font-weight:600;"><span class="en-num" dir="ltr">${formatDate(purchase.expiryDate)}</span></td>
            </tr>
          ` : ''}
          <tr>
            <td class="detail-label">${isKurdish ? ku('کۆی خەرجی وەجبە') : 'Batch Total Cost'}</td>
            <td class="detail-value" style="font-weight:700;"><span class="en-num" dir="ltr">${fmtMoney(debt.originalAmount)}</span></td>
          </tr>
          <tr>
            <td class="detail-label">${isKurdish ? ku('قەرزی ماوەی وەجبە') : 'Remaining Batch Debt'}</td>
            <td class="detail-value" style="font-weight:700;color:#DC2626;"><span class="en-num" dir="ltr">${fmtMoney(debt.remainingAmount)}</span></td>
          </tr>
        </table>
      </div>
      <div style="background:#FEF2F2;border:1px solid #FECACA;border-radius:8px;padding:9px 13px;margin-top:10px;font-size:11.5px;color:#991B1B;display:flex;align-items:center;gap:6px;">
        <span>📦</span>
        <span>${isKurdish
          ? ku(`ئەم قەرزە (${fmtMoney(debt.remainingAmount)}) تایبەتە بە کڕینی وەجبەی ${batchNum}ی بەرهەمی (${prodName}) لەم دابینکەرە.`)
          : `This debt (${fmtMoney(debt.remainingAmount)}) is tied to Batch #${batchNum} of (${prodName}) from this supplier.`}</span>
      </div>
    </div>
  ` : ''}

  <div class="section">
    <div class="section-title">${isKurdish ? ku('سەرچاوەی کڕین') : 'Purchase Reference'}</div>
    <div class="table-wrap">
      <table class="detail-table">
        <tr><td class="detail-label">${isKurdish ? ku('ژمارەی کڕین') : 'Reference #'}</td><td class="detail-value">${debt.purchaseNumber ? `<span class="en-num" dir="ltr">#${escHtml(debt.purchaseNumber)}</span>` : '&mdash;'}</td></tr>
        <tr><td class="detail-label">${isKurdish ? ku('بەروار') : 'Date'}</td><td><span class="en-num" dir="ltr">${formatDate(debt.createdAt)}</span></td></tr>
        ${debt.notes ? `<tr><td class="detail-label">${isKurdish ? ku('تێبینی') : 'Notes'}</td><td>${escHtml(debt.notes)}</td></tr>` : ''}
      </table>
    </div>
  </div>

  <div class="section">
    <div class="section-title">${isKurdish ? ku(`مێژووی پارەدان (${payments.length})`) : `Payments Made (${payments.length} payment${payments.length !== 1 ? 's' : ''})`}</div>
    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th>${isKurdish ? ku('بەروار و کات') : 'Date & Time'}</th>
            <th>${isKurdish ? ku('بڕی دراو') : 'Amount Paid'}</th>
            <th>${isKurdish ? ku('ماوە لە دوای پارەدان') : 'Still Owed After'}</th>
          </tr>
        </thead>
        <tbody>${paymentsRows}</tbody>
      </table>
    </div>
  </div>

  <div class="footer">
    <p>Generated by <strong>${escHtml(business.name)}</strong> &middot; ${PDF_DEVELOPED_BY_EN} &middot; ${PDF_BRAND_WEBSITE} &middot; <span class="en-num" dir="ltr">${formatDateTime(new Date().toISOString())}</span></p>
  </div>

</div>
</body>
</html>`;
}

// ─── Debts Audit / List Report (Report, Sales, Purchase) ─────────────────────

export interface DebtReportSections {
  includeOverview: boolean;
  includeStats: boolean;
  includeSales: boolean;
  includePurchases: boolean;
  includeBatches?: boolean;
}

export function buildDebtsAuditReportHTML(
  target: 'report' | 'sales' | 'purchase' | DebtReportSections,
  data: {
    summary?: DebtOverviewSummary | null;
    salesDebts?: SalesDebtDetail[];
    purchaseDebts?: PurchaseDebt[];
  },
  periodLabel: string,
  business: BusinessInfo,
  dir: 'ltr' | 'rtl' = 'rtl'
): string {
  const isKurdish = dir === 'rtl' || isKurdishPdfActive();
  const lang = isKurdish ? 'ku' : 'en';
  const ku = kuSpan;

  const baseCurrency = useSettingsStore.getState().baseCurrency || 'IQD';
  const rate = useSettingsStore.getState().exchangeRate || 1310;
  const isUsd = baseCurrency === 'USD';
  const fmtMoney = (val: number) => isUsd ? `$${fmtUSD(val / rate)}` : `${fmtIQD(val)} IQD`;

  let sections: DebtReportSections;
  if (typeof target === 'object') {
    sections = {
      includeOverview: target.includeOverview ?? true,
      includeStats: target.includeStats ?? true,
      includeSales: target.includeSales ?? false,
      includePurchases: target.includePurchases ?? false,
      includeBatches: target.includeBatches ?? true,
    };
  } else if (target === 'sales') {
    sections = { includeOverview: false, includeStats: false, includeSales: true, includePurchases: false, includeBatches: false };
  } else if (target === 'purchase') {
    sections = { includeOverview: false, includeStats: false, includeSales: false, includePurchases: true, includeBatches: false };
  } else {
    // legacy 'report' tab: show overview + stats + both lists + batches
    sections = { includeOverview: true, includeStats: true, includeSales: true, includePurchases: true, includeBatches: true };
  }

  // Ensure at least one section is enabled
  if (!sections.includeOverview && !sections.includeStats && !sections.includeSales && !sections.includePurchases && !sections.includeBatches) {
    sections = { includeOverview: true, includeStats: true, includeSales: true, includePurchases: true, includeBatches: true };
  }

  const now = new Date();
  const dateStr = formatDate(now.toISOString());
  const timeStr = formatTime(now);

  let reportTitle = '';
  let reportPrefix = 'DAR';

  if (!sections.includeSales && !sections.includePurchases && !sections.includeBatches) {
    reportTitle = isKurdish ? 'ڕاپۆرتی ئاماری و پوختەی قەرزەکان' : 'Debt Statistical Summary Report';
    reportPrefix = 'DSR';
  } else if (!sections.includeOverview && !sections.includeStats && !sections.includeSales && !sections.includePurchases && sections.includeBatches) {
    reportTitle = isKurdish ? 'ڕاپۆرتی وەجبەکانی قەرز' : 'Batches Debt Audit Report';
    reportPrefix = 'BD';
  } else if (!sections.includeOverview && !sections.includeStats && sections.includeSales && !sections.includePurchases && !sections.includeBatches) {
    reportTitle = isKurdish ? 'جەردی قەرزی کڕیاران' : 'Customer Debts Audit Report';
    reportPrefix = 'CSD';
  } else if (!sections.includeOverview && !sections.includeStats && !sections.includeSales && sections.includePurchases && !sections.includeBatches) {
    reportTitle = isKurdish ? 'جەردی قەرزی دابینکەران' : 'Supplier Debts Audit Report';
    reportPrefix = 'SPD';
  } else if (!sections.includeOverview && !sections.includeStats && sections.includeSales && sections.includePurchases) {
    reportTitle = isKurdish ? 'جەردی قەرزی کڕیاران و دابینکەران' : 'Customer & Supplier Debts Report';
    reportPrefix = 'CSD-SPD';
  } else {
    reportTitle = isKurdish ? 'ڕاپۆرتی گشتی و جەردی قەرزەکان' : 'General Debt Audit Report';
    reportPrefix = 'DAR';
  }

  const reportId = `${reportPrefix}-${now.toISOString().slice(0, 10).replace(/-/g, '')}-${Math.random().toString(16).slice(2, 6).toUpperCase()}`;

  const logoHTML = business.logoUri
    ? `<img src="${business.logoUri}" style="height:55px;max-width:140px;object-fit:contain;display:block;background:#fff;border-radius:8px;padding:4px;border:1px solid #E2E8F0;" alt="logo" />`
    : '';

  const sales = data.salesDebts || [];
  const purchases = data.purchaseDebts || [];

  const totalSalesOriginal = sales.reduce((s, d) => s + (d.originalAmount || 0), 0);
  const totalSalesPaid = sales.reduce((s, d) => s + (d.paidAmount || 0), 0);
  const totalSalesRemaining = sales.reduce((s, d) => s + (d.remainingAmount || 0), 0);

  const totalPurchaseOriginal = purchases.reduce((s, d) => s + (d.originalAmount || 0), 0);
  const totalPurchasePaid = purchases.reduce((s, d) => s + (d.paidAmount || 0), 0);
  const totalPurchaseRemaining = purchases.reduce((s, d) => s + (d.remainingAmount || 0), 0);

  const totalSalesDebt = data.summary?.totalSalesDebt ?? totalSalesRemaining;
  const totalPurchaseDebt = data.summary?.totalPurchaseDebt ?? totalPurchaseRemaining;
  const overdueCount = data.summary?.overdueCount ?? 0;
  const activeDebtsCount = (data.summary?.activeSalesCount ?? sales.length) + (data.summary?.activePurchaseCount ?? purchases.length);
  const netBalance = totalSalesDebt - totalPurchaseDebt;

  // Status badge helper
  const getBadgeHTML = (paid: number, remaining: number) => {
    if (remaining <= 0) {
      return `<span style="background:#ECFDF5;color:#047857;border:1px solid #A7F3D0;padding:2px 8px;border-radius:6px;font-size:11px;font-weight:700;">${isKurdish ? ku('پارەدراوە') : 'Paid'}</span>`;
    }
    if (paid > 0) {
      return `<span style="background:#FFFBEB;color:#B45309;border:1px solid #FDE68A;padding:2px 8px;border-radius:6px;font-size:11px;font-weight:700;">${isKurdish ? ku('بەشێک') : 'Partial'}</span>`;
    }
    return `<span style="background:#FEF2F2;color:#B91C1C;border:1px solid #FECACA;padding:2px 8px;border-radius:6px;font-size:11px;font-weight:700;">${isKurdish ? ku('پارەنەدراوە') : 'Unpaid'}</span>`;
  };

  const sectionsHTML: string[] = [];

  // ── SECTION 1: Overview & KPIs ──
  if (sections.includeOverview) {
    const netColor = netBalance >= 0 ? '#059669' : '#DC2626';
    const netLabel = netBalance >= 0
      ? (isKurdish ? 'باڵانس لە بەرژەوەندی ئێمەیە (کڕیاران زیاتر قەرزدارن)' : 'In Our Favor (Customers Owe More)')
      : (isKurdish ? 'باڵانس لە بەرژەوەندی دابینکەرانە (زیاتر قەرزدارین)' : 'In Suppliers Favor (We Owe More)');

    sectionsHTML.push(`
      <!-- Section: Overview & KPIs -->
      <div style="margin-bottom:24px;">
        ${(sections.includeSales || sections.includePurchases || sections.includeStats) ? `
          <div style="font-size:14px;font-weight:800;color:#0F172A;margin-bottom:14px;padding-bottom:6px;border-bottom:2px solid #E2E8F0;display:flex;justify-content:space-between;align-items:center;">
            <span>${isKurdish ? ku('پوختە و ئامارە گشتییەکان') : 'Overview & Key Metrics'}</span>
            <span style="font-size:11.5px;color:#64748B;font-weight:600;">${isKurdish ? ku('داشبۆرد') : 'Dashboard'}</span>
          </div>
        ` : ''}

        <!-- 4 Dashboard Metric Squares -->
        <div style="display:grid;grid-template-columns:repeat(4, 1fr);gap:12px;margin-bottom:16px;">
          <div style="background:#ECFDF5;border:1px solid #A7F3D0;border-radius:12px;padding:14px;text-align:center;">
            <div style="font-size:11px;font-weight:700;color:#047857;margin-bottom:6px;">${isKurdish ? ku('دەبێت کڕیار پێمان بدات') : 'Customers Owe Us'}</div>
            <div style="font-size:17px;font-weight:800;color:#065F46;"><span class="en-num" dir="ltr">${fmtMoney(totalSalesDebt)}</span></div>
            <div style="font-size:10.5px;color:#059669;margin-top:4px;">${isKurdish ? ku('قەرزی کڕیاران') : 'Receivables'}</div>
          </div>

          <div style="background:#FEF2F2;border:1px solid #FECACA;border-radius:12px;padding:14px;text-align:center;">
            <div style="font-size:11px;font-weight:700;color:#B91C1C;margin-bottom:6px;">${isKurdish ? ku('دەبێت بیدەین بە دابینکەر') : 'We Owe Suppliers'}</div>
            <div style="font-size:17px;font-weight:800;color:#991B1B;"><span class="en-num" dir="ltr">${fmtMoney(totalPurchaseDebt)}</span></div>
            <div style="font-size:10.5px;color:#DC2626;margin-top:4px;">${isKurdish ? ku('قەرزی دابینکەران') : 'Payables'}</div>
          </div>

          <div style="background:#FFFBEB;border:1px solid #FDE68A;border-radius:12px;padding:14px;text-align:center;">
            <div style="font-size:11px;font-weight:700;color:#B45309;margin-bottom:6px;">${isKurdish ? ku('بڕی دواکەوتوو') : 'Overdue Debts'}</div>
            <div style="font-size:17px;font-weight:800;color:#92400E;"><span class="en-num" dir="ltr">${overdueCount}</span></div>
            <div style="font-size:10.5px;color:#D97706;margin-top:4px;">${isKurdish ? ku('قەرزە دواکەوتووەکان') : 'Overdue Count'}</div>
          </div>

          <div style="background:#EEF2FF;border:1px solid #C7D2FE;border-radius:12px;padding:14px;text-align:center;">
            <div style="font-size:11px;font-weight:700;color:#4338CA;margin-bottom:6px;">${isKurdish ? ku('کۆی بڕی قەرزەکان') : 'Total Debts'}</div>
            <div style="font-size:17px;font-weight:800;color:#3730A3;"><span class="en-num" dir="ltr">${activeDebtsCount}</span></div>
            <div style="font-size:10.5px;color:#6366F1;margin-top:4px;">${isKurdish ? ku('قەرزە چالاکەکان') : 'Active Records'}</div>
          </div>
        </div>

        <!-- Net Balance Banner -->
        <div style="background:#FFFFFF;border:1px solid #E2E8F0;border-radius:12px;padding:14px 18px;display:flex;justify-content:space-between;align-items:center;">
          <div>
            <div style="font-size:12px;font-weight:700;color:#64748B;">${isKurdish ? ku('باڵانسی پوختەی قەرزەکان (قەرزی ماوە)') : 'Net Debt Balance'}</div>
            <div style="font-size:11.5px;color:${netColor};font-weight:600;margin-top:3px;">${netLabel}</div>
          </div>
          <div style="font-size:20px;font-weight:800;color:${netColor};">
            <span class="en-num" dir="ltr">${fmtMoney(Math.abs(netBalance))}</span>
          </div>
        </div>
      </div>
    `);
  }

  // ── SECTION 2: Numerical Summary Breakdown (تەنها ژمارەکان - بێ ناوی کەسەکان) ──
  if (sections.includeStats) {
    sectionsHTML.push(`
      <!-- Section: Numerical Summary Breakdown -->
      <div style="margin-bottom:24px;">
        <div style="font-size:14px;font-weight:800;color:#0F172A;margin-bottom:12px;padding-bottom:6px;border-bottom:2px solid #E2E8F0;display:flex;justify-content:space-between;align-items:center;">
          <span>${isKurdish ? ku('پوختەی دارایی و ئامارەکان (تەنها ژمارەکان)') : 'Financial & Numerical Summary'}</span>
          <span style="font-size:11.5px;color:#64748B;font-weight:600;">${isKurdish ? ku('بێ ناوی کەسەکان') : 'Summary Only'}</span>
        </div>

        <div style="background:#FFFFFF;border:1px solid #E2E8F0;border-radius:12px;overflow:hidden;">
          <table style="width:100%;border-collapse:collapse;font-size:12px;">
            <thead>
              <tr style="background:#F1F5F9;border-bottom:1px solid #CBD5E1;">
                <th style="padding:10px;text-align:${dir === 'rtl' ? 'right' : 'left'};">${isKurdish ? ku('بەشی قەرز') : 'Debt Section'}</th>
                <th style="padding:10px;text-align:center;">${isKurdish ? ku('ژمارەی قەرز') : 'Count'}</th>
                <th style="padding:10px;text-align:${dir === 'rtl' ? 'left' : 'right'};">${isKurdish ? ku('کۆی قەرزی سەرەتایی') : 'Original Total'}</th>
                <th style="padding:10px;text-align:${dir === 'rtl' ? 'left' : 'right'};">${isKurdish ? ku('کۆی پارەی دراو') : 'Total Paid'}</th>
                <th style="padding:10px;text-align:${dir === 'rtl' ? 'left' : 'right'};">${isKurdish ? ku('کۆی قەرزی ماوە') : 'Remaining Total'}</th>
                <th style="padding:10px;text-align:center;">${isKurdish ? ku('ڕێژەی پارەدان') : '% Paid'}</th>
              </tr>
            </thead>
            <tbody>
              <!-- Customer Debts Row -->
              <tr style="border-bottom:1px solid #F1F5F9;background:#FFFFFF;">
                <td style="padding:11px 10px;font-weight:700;color:#047857;text-align:${dir === 'rtl' ? 'right' : 'left'};">
                  ${isKurdish ? ku('قەرزی کڕیاران (دەبێت پێمان بدەن)') : 'Customer Debts (Receivables)'}
                </td>
                <td style="padding:11px 10px;text-align:center;"><span class="en-num" dir="ltr">${sales.length}</span></td>
                <td style="padding:11px 10px;text-align:${dir === 'rtl' ? 'left' : 'right'};font-weight:700;color:#0F172A;"><span class="en-num" dir="ltr">${fmtMoney(totalSalesOriginal)}</span></td>
                <td style="padding:11px 10px;text-align:${dir === 'rtl' ? 'left' : 'right'};color:#059669;font-weight:700;"><span class="en-num" dir="ltr">${fmtMoney(totalSalesPaid)}</span></td>
                <td style="padding:11px 10px;text-align:${dir === 'rtl' ? 'left' : 'right'};color:#DC2626;font-weight:700;"><span class="en-num" dir="ltr">${fmtMoney(totalSalesRemaining)}</span></td>
                <td style="padding:11px 10px;text-align:center;font-weight:700;color:#047857;"><span class="en-num" dir="ltr">${pctPaid(totalSalesPaid, totalSalesOriginal)}%</span></td>
              </tr>

              <!-- Supplier Debts Row -->
              <tr style="border-bottom:1px solid #F1F5F9;background:#FFFFFF;">
                <td style="padding:11px 10px;font-weight:700;color:#B91C1C;text-align:${dir === 'rtl' ? 'right' : 'left'};">
                  ${isKurdish ? ku('قەرزی دابینکەران (دەبێت بیدەین)') : 'Supplier Debts (Payables)'}
                </td>
                <td style="padding:11px 10px;text-align:center;"><span class="en-num" dir="ltr">${purchases.length}</span></td>
                <td style="padding:11px 10px;text-align:${dir === 'rtl' ? 'left' : 'right'};font-weight:700;color:#0F172A;"><span class="en-num" dir="ltr">${fmtMoney(totalPurchaseOriginal)}</span></td>
                <td style="padding:11px 10px;text-align:${dir === 'rtl' ? 'left' : 'right'};color:#059669;font-weight:700;"><span class="en-num" dir="ltr">${fmtMoney(totalPurchasePaid)}</span></td>
                <td style="padding:11px 10px;text-align:${dir === 'rtl' ? 'left' : 'right'};color:#DC2626;font-weight:700;"><span class="en-num" dir="ltr">${fmtMoney(totalPurchaseRemaining)}</span></td>
                <td style="padding:11px 10px;text-align:center;font-weight:700;color:#B91C1C;"><span class="en-num" dir="ltr">${pctPaid(totalPurchasePaid, totalPurchaseOriginal)}%</span></td>
              </tr>

              <!-- Summary / Net Balance Row -->
              <tr style="background:#F8FAFC;font-weight:800;border-top:2px solid #CBD5E1;">
                <td style="padding:12px 10px;color:#0F172A;text-align:${dir === 'rtl' ? 'right' : 'left'};">
                  ${isKurdish ? ku('باڵانسی پوختەی قەرزەکان') : 'Net Debt Balance'}
                </td>
                <td style="padding:12px 10px;text-align:center;"><span class="en-num" dir="ltr">${activeDebtsCount}</span></td>
                <td style="padding:12px 10px;text-align:${dir === 'rtl' ? 'left' : 'right'};color:#0F172A;"><span class="en-num" dir="ltr">${fmtMoney(totalSalesOriginal + totalPurchaseOriginal)}</span></td>
                <td style="padding:12px 10px;text-align:${dir === 'rtl' ? 'left' : 'right'};color:#059669;"><span class="en-num" dir="ltr">${fmtMoney(totalSalesPaid + totalPurchasePaid)}</span></td>
                <td style="padding:12px 10px;text-align:${dir === 'rtl' ? 'left' : 'right'};color:${netBalance >= 0 ? '#059669' : '#DC2626'};"><span class="en-num" dir="ltr">${fmtMoney(Math.abs(netBalance))}</span></td>
                <td style="padding:12px 10px;text-align:center;color:${netBalance >= 0 ? '#059669' : '#DC2626'};">
                  ${netBalance >= 0 ? (isKurdish ? ku('+بە قازانج') : '+Favor') : (isKurdish ? ku('-قەرزدارین') : '-Owe')}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    `);
  }

  // ── SECTION 2: Customer Debts (Sales) ──
  if (sections.includeSales) {
    const customerRows = sales.length === 0
      ? `<tr><td colspan="9" style="text-align:center;color:#94A3B8;padding:24px;">${isKurdish ? ku('هیچ قەرزێکی کڕیار لەم ماوەیەدا نەدۆزرایەوە') : 'No customer debts found for this period'}</td></tr>`
      : sales.map((d, idx) => `
        <tr style="background:${idx % 2 === 0 ? '#FFFFFF' : '#F8FAFC'};">
          <td style="text-align:center;color:#64748B;font-size:11px;"><span class="en-num" dir="ltr">${idx + 1}</span></td>
          <td style="font-weight:700;color:#0F172A;text-align:${dir === 'rtl' ? 'right' : 'left'};">
            ${escHtml(d.customerName)}
            ${d.customerPhone ? `<div style="font-size:10.5px;color:#64748B;"><span class="en-num" dir="ltr">${escHtml(d.customerPhone)}</span></div>` : ''}
            ${d.productsSummary ? `<div style="font-size:10px;color:#854D0E;background:#FEF9C3;border:1px solid #FDE047;border-radius:4px;padding:2px 6px;margin-top:3px;display:inline-block;line-height:1.3;">📦 ${escHtml(d.productsSummary)}</div>` : ''}
          </td>
          <td style="text-align:center;"><span class="en-num" dir="ltr">#${escHtml(d.invoiceNumber)}</span></td>
          <td style="text-align:center;font-size:11.5px;color:#475569;"><span class="en-num" dir="ltr">${formatDate(d.createdAt)}</span></td>
          <td style="text-align:${dir === 'rtl' ? 'left' : 'right'};font-weight:700;color:#0F172A;"><span class="en-num" dir="ltr">${fmtMoney(d.originalAmount)}</span></td>
          <td style="text-align:${dir === 'rtl' ? 'left' : 'right'};color:#059669;font-weight:600;"><span class="en-num" dir="ltr">${fmtMoney(d.paidAmount)}</span></td>
          <td style="text-align:${dir === 'rtl' ? 'left' : 'right'};color:#DC2626;font-weight:700;"><span class="en-num" dir="ltr">${fmtMoney(d.remainingAmount)}</span></td>
          <td style="text-align:center;">${getBadgeHTML(d.paidAmount, d.remainingAmount)}</td>
          <td style="text-align:center;font-size:11px;color:#64748B;"><span class="en-num" dir="ltr">${pctPaid(d.paidAmount, d.originalAmount)}%</span></td>
        </tr>
      `).join('');

    sectionsHTML.push(`
      <!-- Section: Customer Debts (Sales) -->
      <div style="margin-bottom:24px;">
        <div style="font-size:14px;font-weight:800;color:#0F172A;margin-bottom:12px;padding-bottom:6px;border-bottom:2px solid #E2E8F0;display:flex;justify-content:space-between;align-items:center;">
          <span>${isKurdish ? ku('قەرزی کڕیاران (فرۆشتن)') : 'Customer Debts (Sales)'}</span>
          <span style="font-size:12px;color:#64748B;font-weight:600;">${sales.length} ${isKurdish ? ku('قەرزدار') : 'debtors'}</span>
        </div>

        <!-- Customer Stats summary banner -->
        <div style="display:grid;grid-template-columns:repeat(4, 1fr);gap:12px;margin-bottom:14px;">
          <div style="background:#F8FAFC;border:1px solid #E2E8F0;border-radius:10px;padding:11px;text-align:center;">
            <div style="font-size:10.5px;color:#64748B;font-weight:600;">${isKurdish ? ku('کۆی قەرزی سەرەتایی') : 'Original Debt'}</div>
            <div style="font-size:15px;font-weight:800;color:#0F172A;margin-top:3px;"><span class="en-num" dir="ltr">${fmtMoney(totalSalesOriginal)}</span></div>
          </div>
          <div style="background:#ECFDF5;border:1px solid #A7F3D0;border-radius:10px;padding:11px;text-align:center;">
            <div style="font-size:10.5px;color:#047857;font-weight:600;">${isKurdish ? ku('کۆی پارەدراو') : 'Total Paid'}</div>
            <div style="font-size:15px;font-weight:800;color:#065F46;margin-top:3px;"><span class="en-num" dir="ltr">${fmtMoney(totalSalesPaid)}</span></div>
          </div>
          <div style="background:#FEF2F2;border:1px solid #FECACA;border-radius:10px;padding:11px;text-align:center;">
            <div style="font-size:10.5px;color:#B91C1C;font-weight:600;">${isKurdish ? ku('کۆی قەرزی ماوە') : 'Total Remaining'}</div>
            <div style="font-size:15px;font-weight:800;color:#991B1B;margin-top:3px;"><span class="en-num" dir="ltr">${fmtMoney(totalSalesRemaining)}</span></div>
          </div>
          <div style="background:#EEF2FF;border:1px solid #C7D2FE;border-radius:10px;padding:11px;text-align:center;">
            <div style="font-size:10.5px;color:#4338CA;font-weight:600;">${isKurdish ? ku('ژمارەی قەرزەکان') : 'Debts Count'}</div>
            <div style="font-size:15px;font-weight:800;color:#3730A3;margin-top:3px;"><span class="en-num" dir="ltr">${sales.length}</span></div>
          </div>
        </div>

        <!-- Customer Audit Table -->
        <div style="background:#FFFFFF;border:1px solid #E2E8F0;border-radius:12px;overflow:hidden;">
          <table style="width:100%;border-collapse:collapse;font-size:12px;">
            <thead>
              <tr style="background:#F1F5F9;border-bottom:1px solid #CBD5E1;">
                <th style="padding:10px;text-align:center;width:35px;">#</th>
                <th style="padding:10px;text-align:${dir === 'rtl' ? 'right' : 'left'};">${isKurdish ? ku('ناوی کڕیار و کاڵاکان') : 'Customer & Items'}</th>
                <th style="padding:10px;text-align:center;">${isKurdish ? ku('ژ. وەسڵ') : 'Invoice #'}</th>
                <th style="padding:10px;text-align:center;">${isKurdish ? ku('بەروار') : 'Date'}</th>
                <th style="padding:10px;text-align:${dir === 'rtl' ? 'left' : 'right'};">${isKurdish ? ku('کۆی گشتی') : 'Original'}</th>
                <th style="padding:10px;text-align:${dir === 'rtl' ? 'left' : 'right'};">${isKurdish ? ku('دراو') : 'Paid'}</th>
                <th style="padding:10px;text-align:${dir === 'rtl' ? 'left' : 'right'};">${isKurdish ? ku('ماوە') : 'Remaining'}</th>
                <th style="padding:10px;text-align:center;">${isKurdish ? ku('دۆخ') : 'Status'}</th>
                <th style="padding:10px;text-align:center;">${isKurdish ? ku('ڕێژە') : '%'}</th>
              </tr>
            </thead>
            <tbody>${customerRows}</tbody>
          </table>
        </div>
      </div>
    `);
  }

  // ── SECTION 3: Supplier Debts (Purchases) ──
  if (sections.includePurchases) {
    const purchaseRows = purchases.length === 0
      ? `<tr><td colspan="9" style="text-align:center;color:#94A3B8;padding:24px;">${isKurdish ? ku('هیچ قەرزێکی دابینکەر لەم ماوەیەدا نەدۆزرایەوە') : 'No supplier debts found for this period'}</td></tr>`
      : purchases.map((d, idx) => `
        <tr style="background:${idx % 2 === 0 ? '#FFFFFF' : '#F8FAFC'};">
          <td style="text-align:center;color:#64748B;font-size:11px;"><span class="en-num" dir="ltr">${idx + 1}</span></td>
          <td style="font-weight:700;color:#0F172A;text-align:${dir === 'rtl' ? 'right' : 'left'};">
            ${escHtml(d.supplierName)}
            ${d.supplierPhone ? `<div style="font-size:10.5px;color:#64748B;"><span class="en-num" dir="ltr">${escHtml(d.supplierPhone)}</span></div>` : ''}
            ${d.productName ? `<div style="font-size:10px;color:#991B1B;background:#FEF2F2;border:1px solid #FECACA;border-radius:4px;padding:2px 6px;margin-top:3px;display:inline-block;line-height:1.3;">📦 ${escHtml(d.productName)} &bull; ${isKurdish ? `وەجبەی ${d.batchNumber || 1}` : `Batch #${d.batchNumber || 1}`}${d.batchQuantity ? ` (${d.batchQuantity} دانە)` : ''}${d.totalBatches && d.totalBatches > 1 ? ` (کۆی ${d.totalBatches})` : ''}</div>` : ''}
          </td>
          <td style="text-align:center;"><span class="en-num" dir="ltr">#${escHtml(d.purchaseNumber || '—')}</span></td>
          <td style="text-align:center;font-size:11.5px;color:#475569;"><span class="en-num" dir="ltr">${formatDate(d.createdAt)}</span></td>
          <td style="text-align:${dir === 'rtl' ? 'left' : 'right'};font-weight:700;color:#0F172A;"><span class="en-num" dir="ltr">${fmtMoney(d.originalAmount)}</span></td>
          <td style="text-align:${dir === 'rtl' ? 'left' : 'right'};color:#059669;font-weight:600;"><span class="en-num" dir="ltr">${fmtMoney(d.paidAmount)}</span></td>
          <td style="text-align:${dir === 'rtl' ? 'left' : 'right'};color:#DC2626;font-weight:700;"><span class="en-num" dir="ltr">${fmtMoney(d.remainingAmount)}</span></td>
          <td style="text-align:center;">${getBadgeHTML(d.paidAmount, d.remainingAmount)}</td>
          <td style="text-align:center;font-size:11px;color:#64748B;"><span class="en-num" dir="ltr">${pctPaid(d.paidAmount, d.originalAmount)}%</span></td>
        </tr>
      `).join('');

    sectionsHTML.push(`
      <!-- Section: Supplier Debts (Purchases) -->
      <div style="margin-bottom:24px;">
        <div style="font-size:14px;font-weight:800;color:#0F172A;margin-bottom:12px;padding-bottom:6px;border-bottom:2px solid #E2E8F0;display:flex;justify-content:space-between;align-items:center;">
          <span>${isKurdish ? ku('قەرزی دابینکەران (کڕین)') : 'Supplier Debts (Purchases)'}</span>
          <span style="font-size:12px;color:#64748B;font-weight:600;">${purchases.length} ${isKurdish ? ku('دابینکەر') : 'suppliers'}</span>
        </div>

        <!-- Supplier Stats summary banner -->
        <div style="display:grid;grid-template-columns:repeat(4, 1fr);gap:12px;margin-bottom:14px;">
          <div style="background:#F8FAFC;border:1px solid #E2E8F0;border-radius:10px;padding:11px;text-align:center;">
            <div style="font-size:10.5px;color:#64748B;font-weight:600;">${isKurdish ? ku('کۆی قەرزی سەرەتایی') : 'Original Debt'}</div>
            <div style="font-size:15px;font-weight:800;color:#0F172A;margin-top:3px;"><span class="en-num" dir="ltr">${fmtMoney(totalPurchaseOriginal)}</span></div>
          </div>
          <div style="background:#ECFDF5;border:1px solid #A7F3D0;border-radius:10px;padding:11px;text-align:center;">
            <div style="font-size:10.5px;color:#047857;font-weight:600;">${isKurdish ? ku('کۆی پارەدراو') : 'Total Paid'}</div>
            <div style="font-size:15px;font-weight:800;color:#065F46;margin-top:3px;"><span class="en-num" dir="ltr">${fmtMoney(totalPurchasePaid)}</span></div>
          </div>
          <div style="background:#FEF2F2;border:1px solid #FECACA;border-radius:10px;padding:11px;text-align:center;">
            <div style="font-size:10.5px;color:#B91C1C;font-weight:600;">${isKurdish ? ku('کۆی قەرزی ماوە') : 'Total Remaining'}</div>
            <div style="font-size:15px;font-weight:800;color:#991B1B;margin-top:3px;"><span class="en-num" dir="ltr">${fmtMoney(totalPurchaseRemaining)}</span></div>
          </div>
          <div style="background:#EEF2FF;border:1px solid #C7D2FE;border-radius:10px;padding:11px;text-align:center;">
            <div style="font-size:10.5px;color:#4338CA;font-weight:600;">${isKurdish ? ku('ژمارەی قەرزەکان') : 'Debts Count'}</div>
            <div style="font-size:15px;font-weight:800;color:#3730A3;margin-top:3px;"><span class="en-num" dir="ltr">${purchases.length}</span></div>
          </div>
        </div>

        <!-- Supplier Audit Table -->
        <div style="background:#FFFFFF;border:1px solid #E2E8F0;border-radius:12px;overflow:hidden;">
          <table style="width:100%;border-collapse:collapse;font-size:12px;">
            <thead>
              <tr style="background:#F1F5F9;border-bottom:1px solid #CBD5E1;">
                <th style="padding:10px;text-align:center;width:35px;">#</th>
                <th style="padding:10px;text-align:${dir === 'rtl' ? 'right' : 'left'};">${isKurdish ? ku('ناوی دابینکەر و وەجبە') : 'Supplier & Batch'}</th>
                <th style="padding:10px;text-align:center;">${isKurdish ? ku('ژ. کڕین') : 'Purchase #'}</th>
                <th style="padding:10px;text-align:center;">${isKurdish ? ku('بەروار') : 'Date'}</th>
                <th style="padding:10px;text-align:${dir === 'rtl' ? 'left' : 'right'};">${isKurdish ? ku('کۆی گشتی') : 'Original'}</th>
                <th style="padding:10px;text-align:${dir === 'rtl' ? 'left' : 'right'};">${isKurdish ? ku('دراو') : 'Paid'}</th>
                <th style="padding:10px;text-align:${dir === 'rtl' ? 'left' : 'right'};">${isKurdish ? ku('ماوە') : 'Remaining'}</th>
                <th style="padding:10px;text-align:center;">${isKurdish ? ku('دۆخ') : 'Status'}</th>
                <th style="padding:10px;text-align:center;">${isKurdish ? ku('ڕێژە') : '%'}</th>
              </tr>
            </thead>
            <tbody>${purchaseRows}</tbody>
          </table>
        </div>
      </div>
    `);
  }

  // ── SECTION 4: Batches Linkage Breakdown (بەشی وەجبەکان و بەستنەوەی کاڵاکان) ──
  if (sections.includeBatches) {
    const supplierBatchesWithDebt = purchases.filter((d) => (d.productName || d.batchNumber));
    const customerDebtsWithItems = sales.filter((d) => d.productsSummary);

    const supplierBatchRows = supplierBatchesWithDebt.length === 0
      ? `<tr><td colspan="7" style="text-align:center;color:#94A3B8;padding:18px;">${isKurdish ? ku('هیچ وەجبەیەکی کڕین بە قەرز لەم ماوەیەدا نەدۆزرایەوە') : 'No supplier purchase batches with debt found'}</td></tr>`
      : supplierBatchesWithDebt.map((d, idx) => `
        <tr style="background:${idx % 2 === 0 ? '#FFFFFF' : '#F8FAFC'};">
          <td style="text-align:center;color:#64748B;font-size:11px;"><span class="en-num" dir="ltr">${idx + 1}</span></td>
          <td style="font-weight:700;color:#0F172A;text-align:${dir === 'rtl' ? 'right' : 'left'};">${escHtml(d.productName || '—')}</td>
          <td style="text-align:center;">
            <span style="background:#FEF9C3;color:#854D0E;border:1px solid #FDE047;border-radius:12px;padding:2px 8px;font-size:11px;font-weight:700;">
              ${isKurdish ? ku(`وەجبەی ${d.batchNumber || 1}`) : `Batch #${d.batchNumber || 1}`}
              ${d.totalBatches && d.totalBatches > 1 ? ` (${isKurdish ? `لە ${d.totalBatches}` : `of ${d.totalBatches}`})` : ''}
            </span>
          </td>
          <td style="text-align:center;font-weight:600;"><span class="en-num" dir="ltr">${d.batchQuantity || '—'}</span></td>
          <td style="text-align:${dir === 'rtl' ? 'right' : 'left'};color:#475569;">
            ${escHtml(d.supplierName)}
            ${d.purchaseNumber ? `<div style="font-size:10px;color:#94A3B8;"><span class="en-num" dir="ltr">#${escHtml(d.purchaseNumber)}</span></div>` : ''}
          </td>
          <td style="text-align:${dir === 'rtl' ? 'left' : 'right'};color:#DC2626;font-weight:700;"><span class="en-num" dir="ltr">${fmtMoney(d.remainingAmount)}</span></td>
          <td style="text-align:center;">${getBadgeHTML(d.paidAmount, d.remainingAmount)}</td>
        </tr>
      `).join('');

    const customerBatchRows = customerDebtsWithItems.length === 0
      ? `<tr><td colspan="6" style="text-align:center;color:#94A3B8;padding:18px;">${isKurdish ? ku('هیچ وەجبەیەکی فرۆشراو بە قەرز نەدۆزرایەوە') : 'No credit sales with items/batches found'}</td></tr>`
      : customerDebtsWithItems.map((d, idx) => `
        <tr style="background:${idx % 2 === 0 ? '#FFFFFF' : '#F8FAFC'};">
          <td style="text-align:center;color:#64748B;font-size:11px;"><span class="en-num" dir="ltr">${idx + 1}</span></td>
          <td style="font-weight:700;color:#0F172A;text-align:${dir === 'rtl' ? 'right' : 'left'};">
            ${escHtml(d.customerName)}
            <div style="font-size:10.5px;color:#64748B;"><span class="en-num" dir="ltr">#${escHtml(d.invoiceNumber)}</span></div>
          </td>
          <td style="text-align:${dir === 'rtl' ? 'right' : 'left'};font-weight:600;color:#854D0E;">
            <div style="background:#FFFDF5;border:1px solid #FDE047;border-radius:6px;padding:3px 8px;font-size:11.5px;display:inline-block;">
              📦 ${escHtml(d.productsSummary || '—')}
            </div>
          </td>
          <td style="text-align:${dir === 'rtl' ? 'left' : 'right'};font-weight:700;"><span class="en-num" dir="ltr">${fmtMoney(d.originalAmount)}</span></td>
          <td style="text-align:${dir === 'rtl' ? 'left' : 'right'};color:#DC2626;font-weight:700;"><span class="en-num" dir="ltr">${fmtMoney(d.remainingAmount)}</span></td>
          <td style="text-align:center;">${getBadgeHTML(d.paidAmount, d.remainingAmount)}</td>
        </tr>
      `).join('');

    sectionsHTML.push(`
      <!-- Section: Batches & Debts Linkage -->
      <div style="margin-bottom:24px;">
        <div style="font-size:14px;font-weight:800;color:#0F172A;margin-bottom:12px;padding-bottom:6px;border-bottom:2px solid #E2E8F0;display:flex;justify-content:space-between;align-items:center;">
          <span>${isKurdish ? ku('بەشی وەجبەکانی قەرز (بەستنەوەی وەجبە بە کڕین و فرۆشتن)') : 'Batches & Debts Linkage (Purchase & Sales)'}</span>
          <span style="font-size:11.5px;color:#64748B;font-weight:600;">${isKurdish ? ku('وەجبەکانی خاوەن قەرز') : 'Batches with Debt'}</span>
        </div>

        <!-- Batches KPI Cards -->
        <div style="display:grid;grid-template-columns:repeat(3, 1fr);gap:12px;margin-bottom:14px;">
          <div style="background:#FEF2F2;border:1px solid #FECACA;border-radius:10px;padding:12px;text-align:center;">
            <div style="font-size:11px;font-weight:700;color:#B91C1C;">${isKurdish ? ku('وەجبەکانی کڕین بە قەرز') : 'Supplier Batches on Credit'}</div>
            <div style="font-size:16px;font-weight:800;color:#991B1B;margin-top:4px;"><span class="en-num" dir="ltr">${supplierBatchesWithDebt.length}</span> ${isKurdish ? ku('وەجبە') : 'batches'}</div>
          </div>
          <div style="background:#FFFBEB;border:1px solid #FDE68A;border-radius:10px;padding:12px;text-align:center;">
            <div style="font-size:11px;font-weight:700;color:#B45309;">${isKurdish ? ku('فرۆشتنە فرە-وەجبەییەکان بە قەرز') : 'Credit Sales with Batches'}</div>
            <div style="font-size:16px;font-weight:800;color:#92400E;margin-top:4px;"><span class="en-num" dir="ltr">${customerDebtsWithItems.length}</span> ${isKurdish ? ku('وەسڵ') : 'invoices'}</div>
          </div>
          <div style="background:#F0FDF4;border:1px solid #BBF7D0;border-radius:10px;padding:12px;text-align:center;">
            <div style="font-size:11px;font-weight:700;color:#15803D;">${isKurdish ? ku('کۆی قەرزی سەر وەجبەکان') : 'Total Batch Debt'}</div>
            <div style="font-size:16px;font-weight:800;color:#166534;margin-top:4px;"><span class="en-num" dir="ltr">${fmtMoney(totalPurchaseRemaining + totalSalesRemaining)}</span></div>
          </div>
        </div>

        <!-- Table 1: Supplier Purchase Batches -->
        <div style="margin-bottom:16px;">
          <div style="font-size:12px;font-weight:700;color:#475569;margin-bottom:6px;display:flex;align-items:center;gap:6px;">
            <span>🏷️</span>
            <span>${isKurdish ? ku('وەجبەکانی کڕین لە دابینکەران کە قەرزیان ماوە') : 'Supplier Purchase Batches with Remaining Debt'}</span>
          </div>
          <div style="background:#FFFFFF;border:1px solid #E2E8F0;border-radius:10px;overflow:hidden;">
            <table style="width:100%;border-collapse:collapse;font-size:12px;">
              <thead>
                <tr style="background:#F1F5F9;border-bottom:1px solid #CBD5E1;">
                  <th style="padding:8px 10px;text-align:center;width:30px;">#</th>
                  <th style="padding:8px 10px;text-align:${dir === 'rtl' ? 'right' : 'left'};">${isKurdish ? ku('ناوی بەرهەم') : 'Product'}</th>
                  <th style="padding:8px 10px;text-align:center;">${isKurdish ? ku('وەجبە') : 'Batch #'}</th>
                  <th style="padding:8px 10px;text-align:center;">${isKurdish ? ku('بڕ') : 'Qty'}</th>
                  <th style="padding:8px 10px;text-align:${dir === 'rtl' ? 'right' : 'left'};">${isKurdish ? ku('دابینکەر') : 'Supplier'}</th>
                  <th style="padding:8px 10px;text-align:${dir === 'rtl' ? 'left' : 'right'};">${isKurdish ? ku('قەرزی ماوە') : 'Remaining'}</th>
                  <th style="padding:8px 10px;text-align:center;">${isKurdish ? ku('دۆخ') : 'Status'}</th>
                </tr>
              </thead>
              <tbody>${supplierBatchRows}</tbody>
            </table>
          </div>
        </div>

        <!-- Table 2: Customer Sales Batches -->
        <div>
          <div style="font-size:12px;font-weight:700;color:#475569;margin-bottom:6px;display:flex;align-items:center;gap:6px;">
            <span>🏷️</span>
            <span>${isKurdish ? ku('وەجبە فرۆشراوەکان بە کڕیاران کە قەرزیان ماوە') : 'Customer Credit Sales Linked to Product Batches'}</span>
          </div>
          <div style="background:#FFFFFF;border:1px solid #E2E8F0;border-radius:10px;overflow:hidden;">
            <table style="width:100%;border-collapse:collapse;font-size:12px;">
              <thead>
                <tr style="background:#F1F5F9;border-bottom:1px solid #CBD5E1;">
                  <th style="padding:8px 10px;text-align:center;width:30px;">#</th>
                  <th style="padding:8px 10px;text-align:${dir === 'rtl' ? 'right' : 'left'};">${isKurdish ? ku('ناوی کڕیار') : 'Customer'}</th>
                  <th style="padding:8px 10px;text-align:${dir === 'rtl' ? 'right' : 'left'};">${isKurdish ? ku('کاڵا و وەجبەکان') : 'Items & Batches'}</th>
                  <th style="padding:8px 10px;text-align:${dir === 'rtl' ? 'left' : 'right'};">${isKurdish ? ku('کۆی وەسڵ') : 'Original'}</th>
                  <th style="padding:8px 10px;text-align:${dir === 'rtl' ? 'left' : 'right'};">${isKurdish ? ku('قەرزی ماوە') : 'Remaining'}</th>
                  <th style="padding:8px 10px;text-align:center;">${isKurdish ? ku('دۆخ') : 'Status'}</th>
                </tr>
              </thead>
              <tbody>${customerBatchRows}</tbody>
            </table>
          </div>
        </div>

      </div>
    `);
  }

  const mainContentHTML = sectionsHTML.join('\n');

  return `<!DOCTYPE html>
<html lang="${lang}" dir="${dir}">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1.0"/>
<title>${reportTitle} — ${escHtml(business.name)}</title>
<style>
  ${KURDISH_FONT_FACE}
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    direction: ${dir};
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, 'Bahij Janna', sans-serif;
    background: #F8FAFC;
    color: #0F172A;
    font-size: 12.5px;
    line-height: 1.5;
  }
  .page {
    max-width: 920px;
    margin: 0 auto;
    background: #FFFFFF;
    padding: 28px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.05);
  }
  .header-card {
    background: linear-gradient(135deg, #0F172A 0%, #1E293B 100%);
    border-radius: 14px;
    padding: 22px 24px;
    color: #FFFFFF;
    margin-bottom: 22px;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  .biz-info h1 {
    font-size: 20px;
    font-weight: 800;
    margin-bottom: 4px;
    color: #F8FAFC;
  }
  .biz-info p {
    font-size: 11.5px;
    color: #94A3B8;
    line-height: 1.4;
  }
  .report-meta {
    text-align: ${dir === 'rtl' ? 'left' : 'right'};
  }
  .report-badge {
    display: inline-block;
    background: #D4AF37;
    color: #0F172A;
    font-size: 12px;
    font-weight: 800;
    padding: 4px 12px;
    border-radius: 20px;
    margin-bottom: 6px;
  }
  .meta-sub {
    font-size: 11px;
    color: #CBD5E1;
  }
  .meta-sub span {
    font-weight: 700;
  }
  .en-num {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif;
    unicode-bidi: embed;
  }
  .footer {
    border-top: 1px solid #E2E8F0;
    padding-top: 16px;
    margin-top: 24px;
    text-align: center;
    font-size: 11px;
    color: #94A3B8;
  }
</style>
</head>
<body>
<div class="page">
  <div class="header-card">
    <div style="display:flex;align-items:center;gap:16px;">
      ${logoHTML}
      <div class="biz-info">
        <h1>${escHtml(business.name)}</h1>
        <p>${business.phone ? `<span class="en-num" dir="ltr">${escHtml(business.phone)}</span>` : ''} ${business.address ? `&bull; ${escHtml(business.address)}` : ''}</p>
        <p style="margin-top:2px;">ID: <span class="en-num" dir="ltr">${reportId}</span></p>
      </div>
    </div>
    <div class="report-meta">
      <div class="report-badge">${reportTitle}</div>
      <div class="meta-sub">${isKurdish ? ku('ماوە: ') : 'Period: '}<span>${escHtml(periodLabel)}</span></div>
      <div class="meta-sub">${isKurdish ? ku('بەروار: ') : 'Date: '}<span><span class="en-num" dir="ltr">${dateStr} &bull; ${timeStr}</span></span></div>
    </div>
  </div>

  ${mainContentHTML}

  <div class="footer">
    <p>Generated by <strong>${escHtml(business.name)}</strong> &middot; ${PDF_DEVELOPED_BY_EN} &middot; ${PDF_BRAND_WEBSITE} &middot; <span class="en-num" dir="ltr">${dateStr} ${timeStr}</span></p>
  </div>
</div>
</body>
</html>`;
}

