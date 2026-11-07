import type { Quotation } from '@/types/quotation';
import i18n from '@/lib/i18n';
import { fmtIQD, fmtUSD, formatDate, formatTime } from '@/utils/formatters';
import { KURDISH_FONT_FACE, PDF_BRAND_WEBSITE, pdfDevelopedByText, kuSpan, isKurdishPdfActive } from '@/lib/pdfFont';
import { useSettingsStore } from '@/store/settingsStore';
import type { ReceiptCurrencyMode } from '@/lib/invoiceTemplate';

interface BusinessInfo {
  name: string;
  phone: string;
  address: string;
  logoUri: string | null;
}

import { escHtml, sanitizeImageUri } from '@/lib/security';

export function buildQuotationHTML(
  quotation: Quotation,
  business: BusinessInfo,
  dir: 'ltr' | 'rtl' = 'ltr',
  currencyMode: ReceiptCurrencyMode = 'both'
): string {
  const isKurdish = dir === 'rtl' || isKurdishPdfActive();
  const currentLang = i18n.language || (isKurdish ? 'ku' : 'en');
  const isAr = currentLang === 'ar';
  const isKu = currentLang === 'ku' || (isKurdish && !isAr);
  const isRtl = isAr || isKu || dir === 'rtl';
  const lang = isAr ? 'ar' : isKu ? 'ku' : 'en';
  const pageDir = isRtl ? 'rtl' : 'ltr';
  const ku = kuSpan;
  const kuAlign = isRtl ? 'right' : 'left';
  const numAlign = isRtl ? 'left' : 'right';

  const quotationSettings = useSettingsStore.getState().quotationReceiptSettings ?? {
    showBusinessPhone: true,
    showBusinessAddress: true,
    showCustomerName: true,
    showCustomerPhone: true,
    showQuotationNumber: true,
    showDate: true,
    showValidUntil: true,
    showQty: true,
    showItemPrice: true,
    showDiscount: true,
    showItemBarcode: true,
    showAboutPolicy: true,
    showNotes: true,
    showSignature: true,
    customFooterNote: '',
  };

  const baseCurrency = useSettingsStore.getState().baseCurrency || 'IQD';
  const isSystemUsd = baseCurrency === 'USD';

  const effectiveMode = quotation.currencyMode || currencyMode || 'both';
  const isUsdOnly = effectiveMode === 'usd';
  const isIqdOnly = effectiveMode === 'iqd';
  const isBoth = effectiveMode === 'both';
  const rate = quotation.exchangeRate || useSettingsStore.getState().exchangeRate || 1310;

  // When system is USD (or mode is usd), all item prices and subtotal are in USD!
  const isItemUsd = isSystemUsd || isUsdOnly;
  const fmtRow = (val: number) => isItemUsd ? `$${fmtUSD(val / rate)}` : `${fmtIQD(val)}&nbsp;IQD`;

  const totalUSD = fmtUSD(quotation.grandTotal / rate);
  const totalIQD = fmtIQD(quotation.grandTotal);

  let grandTotalPrimary = `${totalIQD}&nbsp;IQD`;
  let grandTotalSecondary = '';

  if (isUsdOnly) {
    grandTotalPrimary = `$${totalUSD} USD`;
    grandTotalSecondary = '';
  } else if (isIqdOnly) {
    grandTotalPrimary = `${totalIQD}&nbsp;IQD`;
    grandTotalSecondary = '';
  } else {
    // Both mode:
    if (isSystemUsd) {
      grandTotalPrimary = `$${totalUSD} USD`;
      grandTotalSecondary = `≈ ${totalIQD}&nbsp;IQD`;
    } else {
      grandTotalPrimary = `${totalIQD}&nbsp;IQD`;
      grandTotalSecondary = `≈ $${totalUSD} USD`;
    }
  }

  const monogram = (business.name ?? '').trim().charAt(0).toUpperCase() || 'B';
  const safeLogoUri = sanitizeImageUri(business.logoUri);
  const logoHTML = safeLogoUri
    ? `<img src="${safeLogoUri}" class="logo-img" alt="logo" />`
    : `<div class="logo-mono">${escHtml(monogram)}</div>`;

  const items = quotation.items || [];
  const itemRows = items.length > 0 ? items.map((item, idx) => `
    <tr>
      <td class="num-col" style="width:5%;"><span class="en-num" dir="ltr">${idx + 1}</span></td>
      <td style="width:37%;text-align:${kuAlign};">
        <span class="item-name">${escHtml(item.productName)}</span>
      </td>
      <td class="center" style="width:12%;">
        ${item.itemId ? `<span class="id-chip"><span class="en-num" dir="ltr">${escHtml(item.itemId)}</span></span>` : '<span class="muted-cell">—</span>'}
      </td>
      <td class="center" style="width:6%;font-weight:700;"><span class="en-num" dir="ltr">${item.quantity}</span></td>
      <td class="price-col" style="width:13%;">${item.discount > 0 ? `<span class="en-num" dir="ltr" style="text-decoration:line-through;color:#94a3b8;font-size:0.9em;margin-inline-end:4px;">${fmtRow(item.unitPrice)}</span><span class="en-num" dir="ltr" style="font-weight:700;">${fmtRow(item.unitPrice - item.discount)}</span>` : `<span class="en-num" dir="ltr">${fmtRow(item.unitPrice)}</span>`}</td>
      <td class="price-col" style="width:11%;">${item.discount > 0 ? `<span class="en-num" dir="ltr" style="font-weight:600;color:#d97706;">− ${fmtRow(item.discount)}</span>` : '<span class="muted-cell">—</span>'}</td>
      <td class="price-col" style="width:16%;font-weight:800;color:#000000;"><span class="en-num" dir="ltr">${fmtRow(item.lineTotal)}</span></td>
    </tr>
  `).join('') : `<tr><td colspan="7" class="empty-row">${isAr ? ku('لا توجد عناصر في عرض السعر هذا') : isKu ? ku('هیچ بەرهەمێک لەم عەرزەدا نییە') : 'No items in this quotation'}</td></tr>`;

  const aboutPolicyText = (quotation.aboutPolicy ?? useSettingsStore.getState().invoiceAboutPolicy ?? '').trim();
  const aboutPolicySection = aboutPolicyText ? `
  <div class="policy-card">
    <div class="policy-label">${isAr ? ku('حول الشركة والسياسة') : isKu ? ku('دەربارەی کۆمپانیا و سیاسەت') : 'About & Business Policy'}</div>
    <div class="policy-text">${ku(escHtml(aboutPolicyText))}</div>
  </div>` : '';

  return `<!DOCTYPE html>
<html lang="${lang}" dir="${pageDir}">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1.0"/>
<meta name="format-detection" content="telephone=no, date=no, address=no, email=no"/>
<title>Froshiar-${escHtml(quotation.quotationNumber)}</title>
<style>
  ${KURDISH_FONT_FACE}
  * {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
    font-family: ${isKurdish ? `'Bahij Janna', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif` : `'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif`};
  }
  a, a:link, a:visited, a:hover, a:active {
    color: #000000 !important;
    text-decoration: none !important;
  }
  body {
    direction: ${pageDir};
    font-family: ${isKurdish ? `'Bahij Janna', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif` : `'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif`};
    background: #ffffff;
    color: #000000;
    font-size: 13.5px;
    line-height: 1.5;
  }
  .page {
    max-width: 820px;
    margin: 0 auto;
    background: #ffffff;
    padding: 24px 28px;
    direction: ${pageDir};
  }

  /* ── Header Top ── */
  .header-top {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    padding-bottom: 18px;
    border-bottom: 2px solid #000000;
    gap: 16px;
    direction: ${pageDir};
  }
  .biz-info {
    display: flex;
    align-items: center;
    gap: 14px;
    text-align: ${isKurdish ? 'left' : 'left'};
    flex-direction: ${isKurdish ? 'row-reverse' : 'row'};
  }
  .logo-img { height: 60px; max-width: 130px; object-fit: contain; }
  .logo-mono {
    width: 52px; height: 52px; border-radius: 10px;
    background: #000000; color: #ffffff;
    font-size: 24px; font-weight: 800;
    display: flex; align-items: center; justify-content: center;
  }
  .biz-title { font-size: 20px; font-weight: 800; color: #000000; letter-spacing: -0.3px; }
  .biz-meta { font-size: 12px; color: #444444; margin-top: 3px; line-height: 1.4; }

  .doc-badge-col {
    text-align: ${isKurdish ? 'right' : 'right'};
    display: flex;
    flex-direction: column;
    align-items: ${isKurdish ? 'flex-start' : 'flex-end'};
    direction: ${pageDir};
  }
  .doc-badge {
    display: inline-block;
    background: #000000;
    color: #ffffff;
    padding: 5px 14px;
    border-radius: 6px;
    font-size: 13px;
    font-weight: 800;
    letter-spacing: 0.5px;
    margin-bottom: 6px;
  }
  .doc-meta-item {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 12px;
    color: #000000;
    margin-top: 3px;
    direction: ${pageDir};
  }
  .doc-meta-item .meta-lbl {
    color: #444444;
    font-weight: 600;
  }
  .doc-meta-item b {
    color: #000000;
    font-weight: 700;
  }

  /* ── Quotation Disclaimer Notice (Monochrome, Elegant, Delicate) ── */
  .notice-banner {
    margin: 16px 0;
    background: #FAFAFA;
    border: 1px solid #D4D4D4;
    border-radius: 8px;
    padding: 10px 16px;
    display: flex;
    align-items: center;
    gap: 12px;
    direction: ${pageDir};
  }
  .notice-icon-box {
    width: 26px;
    height: 26px;
    border-radius: 6px;
    background: #FFFFFF;
    border: 1px solid #D4D4D4;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 13px;
    color: #000000;
    flex-shrink: 0;
  }
  .notice-content {
    flex: 1;
    text-align: ${isKurdish ? 'right' : 'left'};
  }
  .notice-text-main {
    font-size: 12.5px;
    font-weight: 700;
    color: #000000;
    line-height: 1.4;
  }
  .notice-text-sub {
    font-size: 11px;
    color: #444444;
    margin-top: 2px;
    line-height: 1.35;
  }

  /* ── Company / Customer Information Box ── */
  .info-box {
    background: #FAFAFA;
    border: 1px solid #D4D4D4;
    border-radius: 8px;
    padding: 12px 16px;
    margin-bottom: 18px;
    display: flex;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: 12px;
    direction: ${pageDir};
  }
  .info-group {
    flex: 1 1 200px;
    text-align: ${isKurdish ? 'right' : 'left'};
  }
  .info-group-label {
    font-size: 10.5px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.6px;
    color: #444444;
    margin-bottom: 4px;
  }
  .info-group-value { font-size: 14px; font-weight: 700; color: #000000; }
  .info-group-sub { font-size: 12px; color: #333333; margin-top: 2px; }
  .validity-group {
    display: flex;
    justify-content: ${isKurdish ? 'flex-start' : 'flex-end'};
    align-items: center;
    flex: 0 0 auto;
  }
  .validity-box {
    background: #FFFFFF;
    border: 2px solid #000000;
    border-radius: 8px;
    padding: 8px 18px;
    text-align: center;
    min-width: 160px;
    box-shadow: 0 1px 3px rgba(0,0,0,0.04);
  }
  .validity-label {
    font-size: 11px;
    font-weight: 700;
    color: #444444;
    margin-bottom: 2px;
  }
  .validity-value {
    font-size: 21px;
    font-weight: 900;
    color: #000000;
    line-height: 1.2;
    letter-spacing: -0.3px;
  }
  .validity-sub {
    font-size: 10px;
    font-weight: 600;
    color: #555555;
    margin-top: 2px;
  }

  /* ── Items Table ── */
  .table-wrap {
    border: 1px solid #D4D4D4;
    border-radius: 8px;
    overflow: visible;
    margin-bottom: 18px;
    direction: ${pageDir};
  }
  table {
    width: 100%;
    border-collapse: collapse;
    direction: ${pageDir};
    page-break-inside: auto;
    break-inside: auto;
    table-layout: fixed;
  }
  thead { display: table-header-group; }
  tbody tr { page-break-inside: avoid !important; break-inside: avoid !important; }
  th, td { page-break-inside: avoid !important; break-inside: avoid !important; box-sizing: border-box; }
  th {
    background: #F4F4F5;
    padding: 8px 8px;
    font-size: 10px;
    font-weight: 700;
    color: #000000;
    border-bottom: 1px solid #D4D4D4;
  }
  td {
    padding: 8px 8px;
    font-size: 11.5px;
    border-bottom: 1px solid #E5E5E5;
    color: #000000;
  }
  tr:nth-child(even) td { background: #FAFAFA; }
  tr:last-child td { border-bottom: none; }
  .num-col { text-align: center; font-weight: 700; color: #000000; width: 36px; white-space: nowrap; }
  .center { text-align: center; }
  .price-col { text-align: ${isKurdish ? 'left' : 'right'}; font-variant-numeric: tabular-nums; white-space: nowrap !important; }
  .item-name { font-weight: 700; color: #000000; font-size: 12px; word-break: break-word; overflow-wrap: break-word; line-height: 1.35; }
  .id-chip {
    display: inline-block;
    padding: 2px 5px;
    border-radius: 4px;
    background: #F4F4F5;
    border: 1px solid #D4D4D4;
    font-size: 9.5px;
    font-weight: 600;
    color: #000000;
    word-break: break-all;
  }
  .muted-cell { color: #888888; }
  .empty-row { text-align: center; padding: 28px; color: #888888; font-style: italic; }

  /* ── Notes / Validity Box ── */
  .notes-box {
    background: #FAFAFA;
    border: 1px solid #D4D4D4;
    border-radius: 8px;
    padding: 12px 16px;
    margin-bottom: 16px;
    font-size: 12.5px;
    color: #000000;
    direction: ${pageDir};
    text-align: ${isKurdish ? 'right' : 'left'};
  }
  .notes-title {
    font-weight: 700;
    color: #000000;
    margin-bottom: 4px;
    font-size: 13px;
  }
  .notes-body {
    line-height: 1.6;
    color: #333333;
  }

  /* ── Company Policy / About Section at Top ── */
  .policy-card {
    background: #FAFAFA;
    border: 1px solid #D4D4D4;
    border-radius: 8px;
    padding: 8px 12px;
    margin-bottom: 12px;
    page-break-inside: avoid;
    direction: ${pageDir};
    text-align: ${isKurdish ? 'right' : 'left'};
  }
  .policy-label {
    font-size: 11px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    color: #444444;
    margin-bottom: 3px;
    text-align: ${isKurdish ? 'right' : 'left'};
  }
  .policy-text {
    font-size: 11.5px;
    color: #000000;
    line-height: 1.55;
    white-space: pre-wrap;
    overflow-wrap: break-word;
    word-break: break-word;
    text-align: ${isKurdish ? 'right' : 'left'};
  }

  /* ── Top Summary Pair (Financial on LEFT, Notes on RIGHT) ── */
  .top-summary-pair {
    display: flex;
    flex-direction: row;
    justify-content: space-between;
    align-items: flex-start;
    gap: 14px;
    margin-bottom: 14px;
    direction: ltr;
  }
  .top-summary-pair > div {
    flex: 0 1 48%;
    max-width: 48%;
    min-width: 0;
    direction: ${pageDir};
  }
  .totals-top-card {
    background: #FAFAFA;
    border: 1px solid #D4D4D4;
    border-radius: 8px;
    padding: 8px 12px;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    direction: ${pageDir};
  }
  .notes-top-card {
    background: #FAFAFA;
    border: 1px solid #D4D4D4;
    border-radius: 8px;
    padding: 8px 12px;
    direction: ${pageDir};
    text-align: ${isKurdish ? 'right' : 'left'};
  }
  .card-top-label {
    font-size: 11px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.6px;
    color: #444444;
    margin-bottom: 4px;
  }
  .tot-line {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 2.5px 0;
    font-size: 12px;
    direction: ${pageDir};
  }
  .tot-label {
    color: #000000;
    font-weight: 600;
  }
  .tot-grand-box {
    background: #000000;
    color: #ffffff;
    border-radius: 6px;
    padding: 5px 10px;
    margin-top: 5px;
    text-align: center;
  }
  .tot-grand-label {
    font-size: 9px;
    font-weight: 700;
    color: #d4d4d4;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    margin-bottom: 1px;
  }
  .tot-grand-amount {
    font-size: 14px;
    font-weight: 800;
    color: #ffffff;
    letter-spacing: -0.2px;
    line-height: 1.2;
  }
  .tot-grand-sub {
    font-size: 10px;
    font-weight: 600;
    color: #a3a3a3;
    margin-top: 1px;
  }
  .notes-body {
    line-height: 1.5;
    color: #333333;
    font-size: 11.5px;
  }

  /* ── Stamp & Signature ── */
  .signatures-row {
    display: flex;
    justify-content: space-between;
    margin-top: 28px;
    padding-top: 18px;
    border-top: 1px dashed #D4D4D4;
    direction: ${pageDir};
  }
  .sig-block {
    text-align: center;
    width: 200px;
  }
  .sig-line {
    border-bottom: 1px solid #000000;
    height: 38px;
    margin-bottom: 6px;
  }
  .sig-label { font-size: 11.5px; font-weight: 700; color: #444444; }

  /* ── Footer ── */
  .footer {
    text-align: center;
    margin-top: 26px;
    padding-top: 12px;
    border-top: 1px solid #E5E5E5;
    font-size: 11px;
    color: #666666;
    direction: ${pageDir};
  }

  .en-num {
    unicode-bidi: isolate;
    direction: ltr;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
    color: inherit;
  }

  @media print {
    body { background: white; }
    .table-wrap { overflow: visible !important; border-radius: 0; }
    table { page-break-inside: auto !important; break-inside: auto !important; }
    thead { display: table-header-group !important; }
    tfoot { display: table-footer-group !important; }
    tbody tr { page-break-inside: avoid !important; break-inside: avoid !important; }
    th, td { page-break-inside: avoid !important; break-inside: avoid !important; }
    .header-top, .notes-top-card, .policy-card, .top-summary-pair, .signatures-row {
      page-break-inside: avoid !important;
      break-inside: avoid !important;
    }
  }
</style>
</head>
<body>
<div class="page">
  <!-- Header Top -->
  <div class="header-top">
    <!-- Right side in RTL (Quotation Title, Number, Date, Time) -->
    <div class="doc-badge-col">
      <div class="doc-badge">${isAr ? ku('عرض أسعار') : isKu ? ku('وەسڵی عەرزی نرخ') : 'PRICE QUOTATION'}</div>
      ${quotationSettings.showQuotationNumber ? `
      <div class="doc-meta-item">
        <span class="meta-lbl">${isAr ? ku('رقم العرض:') : isKu ? ku('ژمارەی عەرز:') : 'Quote No:'}</span>
        <b class="en-num" dir="ltr">${escHtml(quotation.quotationNumber)}</b>
      </div>` : ''}
      ${quotationSettings.showDate ? `
      <div class="doc-meta-item">
        <span class="meta-lbl">${isAr ? ku('التاريخ:') : isKu ? ku('بەروار:') : 'Date:'}</span>
        <b class="en-num" dir="ltr">${escHtml(formatDate(quotation.date || quotation.createdAt))}</b>
      </div>
      <div class="doc-meta-item">
        <span class="meta-lbl">${isAr ? ku('الوقت:') : isKu ? ku('کات:') : 'Time:'}</span>
        <b class="en-num" dir="ltr">${escHtml(formatTime(quotation.time || quotation.createdAt))}</b>
      </div>` : ''}
      ${quotation.printCount && quotation.printCount > 0 ? `
      <div class="doc-meta-item">
        <span class="meta-lbl">${isAr ? ku('عدد مرات الطباعة:') : isKu ? ku('ژمارەی چاپ:') : 'Print Count:'}</span>
        <b class="en-num" dir="ltr">${quotation.printCount} ${isAr ? ku('مرات') : isKu ? ku('جار') : 'times'}</b>
      </div>` : ''}
    </div>

    <!-- Left side in RTL (Business Info: Logo, Name, Phone, Address) -->
    <div class="biz-info">
      ${logoHTML}
      <div>
        <div class="biz-title">${ku(escHtml(business.name))}</div>
        ${quotationSettings.showBusinessPhone && business.phone ? `<div class="biz-meta"><span style="color:#444444;">${isAr ? ku('الهاتف:') : isKu ? ku('تەلەفۆن:') : 'Tel:'}</span> <span class="en-num" dir="ltr">${escHtml(business.phone)}</span></div>` : ''}
        ${quotationSettings.showBusinessAddress && business.address ? `<div class="biz-meta"><span style="color:#444444;">${isAr ? ku('العنوان:') : isKu ? ku('ناونیشان:') : 'Address:'}</span> ${ku(escHtml(business.address))}</div>` : ''}
      </div>
    </div>
  </div>

  <!-- Quotation Disclaimer Notice (Monochrome, Delicate, Pristine, No Emojis, No Stock Mention) -->
  <div class="notice-banner">
    <div class="notice-icon-box">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#000000" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="12" cy="12" r="10"></circle>
        <line x1="12" y1="16" x2="12" y2="12"></line>
        <line x1="12" y1="8" x2="12.01" y2="8"></line>
      </svg>
    </div>
    <div class="notice-content">
      <div class="notice-text-main">
        ${isAr
          ? ku('هذا المستند هو عرض أسعار فقط وليس فاتورة مبيعات')
          : isKu
          ? ku('ئەم وەسڵە تەنها بۆ عەرزی نرخە و وەسڵی فرۆشتن نییە')
          : 'THIS DOCUMENT IS A PRICE QUOTATION ONLY AND NOT A SALES INVOICE'}
      </div>
      <div class="notice-text-sub">
        ${isAr
          ? ku('جميع الأسعار مقترحة للشركة والزبون.')
          : isKu
          ? ku('سەرجەم نرخەکان پێشنیارکراون بۆ شەریکە و کڕیار.')
          : 'All prices are offered for quotation purposes.'}
      </div>
    </div>
  </div>

  <!-- Customer / Company Information -->
  <div class="info-box">
    <div class="info-group">
      <div class="info-group-label">${isAr ? ku('يُقدم إلى (الشركة / العميل):') : isKu ? ku('پێشکەش دەکرێت بە (کۆمپانیا / کڕیار):') : 'Presented To (Company / Client):'}</div>
      ${quotationSettings.showCustomerName ? `<div class="info-group-value">${ku(escHtml(quotation.customerName || (isAr ? 'الشركة / العميل المحترم' : isKu ? 'شەریکە / کڕیاری گشتی' : 'Valued Company / Client')))}</div>` : ''}
      ${quotationSettings.showCustomerPhone && quotation.customerPhone ? `<div class="info-group-sub"><span style="color:#444444;">${isAr ? ku('الهاتف:') : isKu ? ku('تەلەفۆن:') : 'Tel:'}</span> <span class="en-num" dir="ltr">${escHtml(quotation.customerPhone)}</span></div>` : ''}
      ${quotation.customerAddress ? `<div class="info-group-sub"><span style="color:#444444;">${isAr ? ku('العنوان:') : isKu ? ku('ناونیشان:') : 'Address:'}</span> ${ku(escHtml(quotation.customerAddress))}</div>` : ''}
    </div>
    ${quotationSettings.showValidUntil ? `
    <div class="info-group validity-group" style="text-align:${isRtl ? 'left' : 'right'};">
      <div class="validity-box">
        <div class="validity-label">${isAr ? ku('صلاحية عرض السعر') : isKu ? ku('ماوەی کارپێکردنی عەرز') : 'Quotation Validity'}</div>
        <div class="validity-value">${isAr ? ku(`${quotation.validityDays || 7} أيام`) : isKu ? ku(`${quotation.validityDays || 7} ڕۆژ`) : `${quotation.validityDays || 7} Days`}</div>
        <div class="validity-sub">${isAr ? ku('الأسعار ثابتة لهذه المدة') : isKu ? ku('بۆ ئەم ماوەیە جێگیرە') : 'Fixed for this period'}</div>
      </div>
    </div>` : ''}
  </div>

  ${aboutPolicySection}

  <!-- Top Summary Pair: Totals on LEFT, Notes on RIGHT (above Items Table) -->
  <div class="top-summary-pair">
    <div class="totals-top-card">
      <div class="card-top-label">${isAr ? ku('ملخص الأسعار والتكلفة') : isKu ? ku('پوختەی نرخ و تێچوو') : 'Price Summary'}</div>
      <div class="tot-line sub">
        <span class="tot-label">${isAr ? ku('المجموع الجزئي:') : isKu ? ku('کۆی سەرەتایی:') : 'Subtotal:'}</span>
        <span class="en-num" dir="ltr" style="font-weight:700;">${fmtRow(quotation.subtotal)}</span>
      </div>
      ${quotation.discountTotal > 0 ? `
      <div class="tot-line discount">
        <span class="tot-label" style="color:#d97706;">${isAr ? ku('الخصم:') : isKu ? ku('داشکاندن:') : 'Discount:'}</span>
        <span class="en-num" dir="ltr" style="color:#d97706;font-weight:700;">− ${fmtRow(quotation.discountTotal)}</span>
      </div>` : ''}
      <div class="tot-grand-box">
        <div class="tot-grand-label">${isAr ? ku('المجموع الكلي للعرض') : isKu ? ku('کۆی گشتی عەرز') : 'Grand Total'}</div>
        <div class="tot-grand-amount en-num" dir="ltr">${grandTotalPrimary}</div>
        ${grandTotalSecondary ? `<div class="tot-grand-sub en-num" dir="ltr">${grandTotalSecondary}</div>` : ''}
      </div>
    </div>

    <div class="notes-top-card">
      <div class="card-top-label">${isAr ? ku('الملاحظات والشروط') : isKu ? ku('تێبینی و مەرجەکان') : 'Notes & Terms'}</div>
      <div class="notes-body">${ku(escHtml(quotation.notes || (isAr ? 'جميع الأسعار ثابتة للمدة المحددة وغير قابلة للتغيير.' : isKu ? 'سەرجەم نرخەکان بۆ ماوەی دیاریکراو جێگیرن و ناگۆڕدرێن.' : 'All prices are valid and fixed for the stated period.')))}</div>
    </div>
  </div>

  <!-- Table of Items (RTL Native, No Unwanted Tag Under Table) -->
  <div class="table-wrap">
    <table>
      <thead>
        <tr>
          <th class="num-col" style="width:5%;min-width:28px;">#</th>
          <th style="width:37%;text-align:${kuAlign};">${isAr ? ku('اسم المادة') : isKu ? ku('ناوی بەرهەم') : 'Product Name'}</th>
          <th class="center" style="width:12%;min-width:65px;">${isAr ? ku('الرمز') : isKu ? ku('کۆد') : 'Item ID'}</th>
          <th class="center" style="width:6%;min-width:35px;">${isAr ? ku('الكمية') : isKu ? ku('بڕ') : 'Qty'}</th>
          <th class="price-col" style="width:13%;min-width:85px;white-space:nowrap;">${isAr ? ku('سعر الوحدة') : isKu ? ku('نرخی تاک') : 'Unit Price'}</th>
          <th class="price-col" style="width:11%;min-width:75px;white-space:nowrap;">${isAr ? ku('الخصم') : isKu ? ku('داشکاندن') : 'Discount'}</th>
          <th class="price-col" style="width:16%;min-width:95px;white-space:nowrap;">${isAr ? ku('المجموع') : isKu ? ku('کۆی نرخ') : 'Total'}</th>
        </tr>
      </thead>
      <tbody>
        ${itemRows}
      </tbody>
    </table>
  </div>

  ${quotationSettings.showSignature ? `
  <!-- Signatures -->
  <div class="signatures-row">
    <div class="sig-block">
      <div class="sig-line"></div>
      <div class="sig-label">${isAr ? ku('توقيع وختم البائع') : isKu ? ku('واژۆ و مۆری فرۆشیار') : 'Seller Stamp & Signature'}</div>
    </div>
    <div class="sig-block">
      <div class="sig-line"></div>
      <div class="sig-label">${isAr ? ku('توقيع المدير / العميل') : isKu ? ku('واژۆی بەڕێوەبەر / کڕیار') : 'Manager / Client Signature'}</div>
    </div>
  </div>` : ''}

  <!-- Footer -->
  <div class="footer">
    ${quotationSettings.customFooterNote ? `<div style="margin-bottom:6px;font-weight:700;color:#1E293B;">${ku(escHtml(quotationSettings.customFooterNote))}</div>` : ''}
    ${isAr ? ku('وصل رسمي لعرض الأسعار — نظام فروشيار') : isKu ? ku('وەسڵی فەرمی عەرزی نرخ — سیستەمی فرۆشیار') : 'Official Price Quotation — Powered by Froshiar'}
  </div>
</div>
</body>
</html>`;
}
