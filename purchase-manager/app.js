'use strict';

/* ============================================================
   Constants
   ============================================================ */
const RATE = 1310; // 1 USD = 1310 IQD
const STORAGE_KEY = 'pm_purchases';

const CATEGORIES = [
  { ku: 'ئەلیکترۆنیات',   en: 'Electronics' },
  { ku: 'جل و بەرگ',       en: 'Clothing'     },
  { ku: 'خواردنی خشک',     en: 'Food'         },
  { ku: 'خواردنی تازە',    en: 'Produce'      },
  { ku: 'دەرمان',          en: 'Medicine'     },
  { ku: 'ئامێر',           en: 'Tools'        },
  { ku: 'تر',              en: 'Other'        },
];

let currentLang = 'ku';
let currentPaymentStatus = 'paid';
let currentIdType = null; // 'shared' | 'custom'
let currentImageData = null;

/* ============================================================
   Storage helpers
   ============================================================ */
function load()  { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); }
function save(a) { localStorage.setItem(STORAGE_KEY, JSON.stringify(a)); }

/* ============================================================
   ID migration — ensure all ids are sequential integers
   ============================================================ */
function migrateIds() {
  const purchases = load();
  const needsMigration = purchases.some(p => typeof p.id !== 'number' || !Number.isInteger(p.id));
  if (!needsMigration) return;
  purchases.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
  purchases.forEach((p, i) => { p.id = i + 1; });
  save(purchases);
}

/* ============================================================
   Renumber after delete — sort by createdAt asc, reassign 1..n
   ============================================================ */
function renumberIds(purchases) {
  const sorted = [...purchases].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
  sorted.forEach((p, i) => { p.id = i + 1; });
  return sorted;
}

/* ============================================================
   Date helpers
   ============================================================ */
function setTodayDate() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm   = String(d.getMonth() + 1).padStart(2, '0');
  const dd   = String(d.getDate()).padStart(2, '0');
  document.getElementById('date').value = `${yyyy}-${mm}-${dd}`;
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  const [y, m, d] = dateStr.split('-');
  return `${d}/${m}/${y}`;
}

function formatTimestamp(isoStr) {
  const d = new Date(isoStr);
  return d.toLocaleString('en-GB', { day:'2-digit', month:'2-digit', year:'numeric', hour:'2-digit', minute:'2-digit' });
}

/* ============================================================
   Category options
   ============================================================ */
function renderCategoryOptions() {
  const sel = document.getElementById('category');
  // keep the blank option
  while (sel.options.length > 1) sel.remove(1);
  CATEGORIES.forEach(cat => {
    const opt = document.createElement('option');
    opt.value = cat.en;
    opt.textContent = `${cat.ku} / ${cat.en}`;
    sel.appendChild(opt);
  });
}

/* ============================================================
   Language toggle
   ============================================================ */
function updateLangUI() {
  const isKu = currentLang === 'ku';
  document.documentElement.setAttribute('dir',  isKu ? 'rtl' : 'ltr');
  document.documentElement.setAttribute('lang', currentLang);

  document.querySelectorAll('.ku').forEach(el => {
    el.style.display = isKu ? '' : 'none';
  });
  document.querySelectorAll('.en').forEach(el => {
    el.style.display = isKu ? 'none' : '';
  });

  document.getElementById('langToggle').textContent = isKu ? 'EN' : 'کو';

  // sync placeholders
  document.querySelectorAll('[data-ph-ku]').forEach(el => {
    el.placeholder = isKu ? el.dataset.phKu : (el.dataset.phEn || '');
  });
}

function toggleLang() {
  currentLang = currentLang === 'ku' ? 'en' : 'ku';
  updateLangUI();
}

/* ============================================================
   Tab switching
   ============================================================ */
function switchTab(tabId) {
  document.querySelectorAll('.tab-content').forEach(s => s.classList.remove('active'));
  document.querySelectorAll('.tab').forEach(b => b.classList.remove('active'));
  document.getElementById(tabId).classList.add('active');
  if (tabId === 'addTab') document.getElementById('tabAdd').classList.add('active');
  else                     document.getElementById('tabList').classList.add('active');
}

/* ============================================================
   Currency sync
   ============================================================ */
function round(n, decimals) {
  const f = Math.pow(10, decimals);
  return Math.round(n * f) / f;
}

function syncPrice(field, changed) {
  const iqdEl = document.getElementById(field + 'IQD');
  const usdEl = document.getElementById(field + 'USD');
  if (changed === 'iqd') {
    const iqd = parseFloat(iqdEl.value) || 0;
    usdEl.value = iqd > 0 ? round(iqd / RATE, 2) : '';
  } else {
    const usd = parseFloat(usdEl.value) || 0;
    iqdEl.value = usd > 0 ? round(usd * RATE, 0) : '';
  }
  recalcTotal();
}

function recalcTotal() {
  const qty   = parseInt(document.getElementById('qty').value)    || 0;
  const buyIQD = parseFloat(document.getElementById('buyIQD').value) || 0;
  const total  = qty * buyIQD;
  document.getElementById('autoTotalDisplay').textContent = total.toLocaleString('en-US');
}

/* ============================================================
   ID type selector
   ============================================================ */
function selectIdType(type) {
  currentIdType = type;
  document.querySelectorAll('.id-type-btn').forEach(b => {
    b.classList.toggle('active', b.dataset.type === type);
  });

  const sharedSection = document.getElementById('sharedIdSection');
  const customSection = document.getElementById('customIdSection');

  if (type === 'shared') {
    sharedSection.style.display = '';
    customSection.style.display = 'none';
  } else {
    sharedSection.style.display = 'none';
    customSection.style.display = '';
    const qty = parseInt(document.getElementById('qty').value) || 1;
    buildCustomIdRows(qty);
  }
}

function buildCustomIdRows(n) {
  const container = document.getElementById('customIdRows');
  const oldInputs = container.querySelectorAll('.custom-id-input');
  const oldValues = [];
  oldInputs.forEach(inp => oldValues.push(inp.value));

  container.innerHTML = '';

  for (let i = 0; i < n; i++) {
    const row = document.createElement('div');
    row.className = 'custom-id-row';

    const badge = document.createElement('span');
    badge.className = 'custom-id-badge';
    badge.textContent = i + 1;

    const inp = document.createElement('input');
    inp.type = 'text';
    inp.className = 'custom-id-input';
    inp.dataset.idx = i;
    inp.maxLength = 9;
    inp.placeholder = currentLang === 'ku' ? `ئایدی ${i + 1}` : `ID ${i + 1}`;
    if (i < oldValues.length) inp.value = oldValues[i];

    inp.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === 'Tab') {
        const nextInp = container.querySelector(`.custom-id-input[data-idx="${i + 1}"]`);
        if (nextInp) {
          e.preventDefault();
          nextInp.focus();
        }
      }
    });

    row.appendChild(badge);
    row.appendChild(inp);
    container.appendChild(row);
  }
}

function rebuildCustomIds(newQty) {
  if (currentIdType !== 'custom') return;
  buildCustomIdRows(newQty);
}

/* ============================================================
   Quantity change
   ============================================================ */
function onQtyChange() {
  recalcTotal();
  const qty = Math.min(100, Math.max(1, parseInt(document.getElementById('qty').value) || 1));
  rebuildCustomIds(qty);
}

/* ============================================================
   Image upload
   ============================================================ */
function handleImageUpload(e) {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = ev => {
    currentImageData = ev.target.result;
    document.getElementById('imagePlaceholder').style.display = 'none';
    const preview = document.getElementById('imagePreview');
    preview.src = currentImageData;
    preview.style.display = '';
    document.getElementById('removeImage').style.display = '';
  };
  reader.readAsDataURL(file);
}

function removeImage() {
  currentImageData = null;
  document.getElementById('imageInput').value = '';
  document.getElementById('imagePlaceholder').style.display = '';
  document.getElementById('imagePreview').style.display = 'none';
  document.getElementById('imagePreview').src = '';
  document.getElementById('removeImage').style.display = 'none';
}

/* ============================================================
   Payment status toggle
   ============================================================ */
function selectPayment(status) {
  currentPaymentStatus = status;
  document.querySelectorAll('.pay-btn').forEach(b => {
    b.classList.toggle('active', b.dataset.status === status);
  });
}

/* ============================================================
   Toast
   ============================================================ */
let toastTimer = null;
function showToast(msgKu, msgEn, type = 'error') {
  const el = document.getElementById('toast');
  el.textContent = currentLang === 'ku' ? msgKu : msgEn;
  el.className = `show ${type}`;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { el.className = ''; }, 3200);
}

/* ============================================================
   Validation
   ============================================================ */
function validateForm() {
  const supplier    = document.getElementById('supplier').value.trim();
  const date        = document.getElementById('date').value.trim();
  const productName = document.getElementById('productName').value.trim();
  const qty         = parseInt(document.getElementById('qty').value) || 0;
  const buyIQD      = parseFloat(document.getElementById('buyIQD').value) || 0;

  if (!supplier || !date || !productName || buyIQD <= 0) {
    showToast('زانیاری پێویستە داخڵ بکە', 'Please fill required fields', 'error');
    return false;
  }
  if (qty < 1) {
    showToast('بڕ دەبێت بچووکترین ١ بێت', 'Quantity must be at least 1', 'error');
    return false;
  }
  if (qty > 100) {
    showToast('بڕ دەبێت ١٠٠ یان کەمتر بێت', 'Quantity must be 100 or less', 'error');
    return false;
  }
  if (!currentIdType) {
    showToast('جۆری ئایدی هەڵبژێرە', 'Please select an ID type', 'error');
    return false;
  }
  return true;
}

/* ============================================================
   Save
   ============================================================ */
function handleSave() {
  if (!validateForm()) return;

  const qty    = parseInt(document.getElementById('qty').value);
  const buyIQD = parseFloat(document.getElementById('buyIQD').value) || 0;
  const buyUSD = parseFloat(document.getElementById('buyUSD').value) || 0;
  const sellIQD = parseFloat(document.getElementById('sellIQD').value) || 0;
  const sellUSD = parseFloat(document.getElementById('sellUSD').value) || 0;
  const total  = qty * buyIQD;
  const profit = (sellIQD - buyIQD) * qty;

  // Collect item IDs
  let itemIds = [];
  if (currentIdType === 'shared') {
    const v = document.getElementById('sharedIdValue').value.trim();
    itemIds = [v];
  } else {
    document.querySelectorAll('.custom-id-input').forEach(inp => {
      itemIds.push(inp.value.trim());
    });
  }

  const purchases = load();
  const newId     = purchases.length + 1;

  const purchase = {
    id:          newId,
    supplier:    document.getElementById('supplier').value.trim(),
    date:        document.getElementById('date').value.trim(),
    mobile:      document.getElementById('mobile').value.trim()      || null,
    address:     document.getElementById('address').value.trim()     || null,
    productName: document.getElementById('productName').value.trim(),
    qty,
    buyIQD,
    buyUSD,
    sellIQD,
    sellUSD,
    total,
    profit,
    category:    document.getElementById('category').value           || null,
    description: document.getElementById('description').value.trim() || null,
    notes:       document.getElementById('notes').value.trim()       || null,
    warranty:    document.getElementById('warranty').value.trim()    || null,
    status:      currentPaymentStatus,
    idType:      currentIdType,
    itemIds,
    image:       currentImageData,
    createdAt:   new Date().toISOString(),
  };

  purchases.unshift(purchase);
  save(purchases);

  showToast(
    `کڕین #${newId} پاشەکەوت کرا ✓`,
    `Purchase #${newId} saved ✓`,
    'success'
  );

  handleReset();
  switchTab('listTab');
  renderList();
}

/* ============================================================
   Reset
   ============================================================ */
function handleReset() {
  document.getElementById('supplier').value    = '';
  document.getElementById('mobile').value      = '';
  document.getElementById('address').value     = '';
  document.getElementById('productName').value = '';
  document.getElementById('qty').value         = '1';
  document.getElementById('buyIQD').value      = '';
  document.getElementById('buyUSD').value      = '';
  document.getElementById('sellIQD').value     = '';
  document.getElementById('sellUSD').value     = '';
  document.getElementById('warranty').value    = '';
  document.getElementById('description').value = '';
  document.getElementById('notes').value       = '';
  document.getElementById('category').value    = '';
  document.getElementById('sharedIdValue').value = '';
  document.getElementById('autoTotalDisplay').textContent = '0';

  setTodayDate();
  removeImage();

  // Reset ID type
  currentIdType = null;
  document.querySelectorAll('.id-type-btn').forEach(b => b.classList.remove('active'));
  document.getElementById('sharedIdSection').style.display = 'none';
  document.getElementById('customIdSection').style.display = 'none';
  document.getElementById('customIdRows').innerHTML = '';

  // Reset payment
  selectPayment('paid');
}

/* ============================================================
   Delete
   ============================================================ */
function handleDelete(id) {
  const msgKu = `کڕینی #${id} بە دایمی دەسڕێتەوە. ئایا دڵنیایت؟`;
  const msgEn = `Purchase #${id} will be permanently deleted. Are you sure?`;
  if (!confirm(currentLang === 'ku' ? msgKu : msgEn)) return;

  let purchases = load().filter(p => p.id !== id);
  purchases = renumberIds(purchases);
  save(purchases);
  renderList();
  showToast('کڕین سڕایەوە', 'Purchase deleted', 'success');
}

/* ============================================================
   Render list
   ============================================================ */
function renderList() {
  const container = document.getElementById('listContainer');
  const purchases = load();

  if (purchases.length === 0) {
    container.innerHTML = `
      <div class="list-empty">
        <div class="list-empty-icon">📦</div>
        <div class="list-empty-title">
          <span class="ku" ${currentLang === 'en' ? 'style="display:none"' : ''}>هیچ کڕینێک تۆمار نەکراوە</span>
          <span class="en" ${currentLang === 'ku' ? 'style="display:none"' : ''}>No purchases recorded yet</span>
        </div>
        <div class="list-empty-sub">
          <span class="ku" ${currentLang === 'en' ? 'style="display:none"' : ''}>یەکەم کڕینەکەت زیاد بکە</span>
          <span class="en" ${currentLang === 'ku' ? 'style="display:none"' : ''}>Add your first purchase above</span>
        </div>
      </div>`;
    return;
  }

  container.innerHTML = purchases.map(p => `
    <div class="purchase-card">
      <div class="purchase-card-header">
        <span class="purchase-id-badge">#${p.id}</span>
        <span class="purchase-supplier">${escHtml(p.supplier)}</span>
        <span class="purchase-date">${formatDate(p.date)}</span>
      </div>
      <div class="purchase-card-body">
        <div class="purchase-detail-row">
          <span class="purchase-label">
            <span class="ku" ${currentLang === 'en' ? 'style="display:none"' : ''}>بەرهەم</span>
            <span class="en" ${currentLang === 'ku' ? 'style="display:none"' : ''}>Product</span>
          </span>
          <span class="purchase-value">${escHtml(p.productName)}</span>
        </div>
        <div class="purchase-detail-row">
          <span class="purchase-label">
            <span class="ku" ${currentLang === 'en' ? 'style="display:none"' : ''}>بڕ</span>
            <span class="en" ${currentLang === 'ku' ? 'style="display:none"' : ''}>Qty</span>
          </span>
          <span class="purchase-value">${p.qty}</span>
        </div>
        <div class="purchase-detail-row">
          <span class="purchase-label">
            <span class="ku" ${currentLang === 'en' ? 'style="display:none"' : ''}>کۆی گشتی</span>
            <span class="en" ${currentLang === 'ku' ? 'style="display:none"' : ''}>Total</span>
          </span>
          <span class="purchase-total">${p.total.toLocaleString('en-US')} IQD</span>
        </div>
        <div class="purchase-detail-row">
          <span class="purchase-label">
            <span class="ku" ${currentLang === 'en' ? 'style="display:none"' : ''}>دۆخی پارەدان</span>
            <span class="en" ${currentLang === 'ku' ? 'style="display:none"' : ''}>Payment</span>
          </span>
          <span class="status-badge ${p.status === 'paid' ? 'status-paid' : 'status-debt'}">
            ${p.status === 'paid'
              ? `<span class="ku" ${currentLang === 'en' ? 'style="display:none"' : ''}>پارەدراوە</span><span class="en" ${currentLang === 'ku' ? 'style="display:none"' : ''}>Paid</span>`
              : `<span class="ku" ${currentLang === 'en' ? 'style="display:none"' : ''}>قەرزە</span><span class="en" ${currentLang === 'ku' ? 'style="display:none"' : ''}>Debt</span>`
            }
          </span>
        </div>
      </div>
      <div class="purchase-card-actions">
        <button class="btn-pdf" onclick="handlePrintInvoice(${p.id})">
          <span class="ku" ${currentLang === 'en' ? 'style="display:none"' : ''}>🖨 چاپکردنی وەسڵ</span>
          <span class="en" ${currentLang === 'ku' ? 'style="display:none"' : ''}>🖨 Print Invoice</span>
        </button>
        <button class="btn-delete" onclick="handleDelete(${p.id})">
          <span class="ku" ${currentLang === 'en' ? 'style="display:none"' : ''}>سڕینەوە</span>
          <span class="en" ${currentLang === 'ku' ? 'style="display:none"' : ''}>Delete</span>
        </button>
      </div>
    </div>
  `).join('');
}

/* ============================================================
   XSS guard
   ============================================================ */
function escHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/* ============================================================
   Invoice HTML builder
   ============================================================ */
function buildInvoiceHTML(p) {
  const ts = formatTimestamp(p.createdAt);

  // IDs section
  let idsSection = '';
  const hasIds = p.itemIds && p.itemIds.some(v => v && v.trim());
  if (hasIds) {
    if (p.idType === 'shared') {
      idsSection = `
        <div class="inv-section">
          <div class="inv-section-title">ئایدی / ID</div>
          <div class="inv-row">
            <span class="inv-label">ئایدی هاوبەش / Shared ID</span>
            <span class="inv-value">${escHtml(p.itemIds[0])}</span>
          </div>
        </div>`;
    } else {
      const chips = p.itemIds.map((v, i) =>
        `<span style="display:inline-block;background:#EFF6FF;border:1px solid #BFDBFE;border-radius:6px;padding:3px 10px;font-size:13px;font-weight:600;color:#1E40AF;margin:3px;">${i + 1}. ${escHtml(v)}</span>`
      ).join('');
      idsSection = `
        <div class="inv-section">
          <div class="inv-section-title">ئایدیەکان / Item IDs</div>
          <div style="padding:4px 0;">${chips}</div>
        </div>`;
    }
  }

  // Additional section (description + notes only; warranty/category shown in product section)
  let additionalRows = '';
  if (p.description) additionalRows += row('وەسف / Description', escHtml(p.description));
  if (p.notes)       additionalRows += row('تێبینی / Notes',     escHtml(p.notes));

  const statusLabel = p.status === 'paid' ? 'پارەدراوە / Paid' : 'قەرزە / Debt';
  const statusColor = p.status === 'paid' ? '#16A34A' : '#DC2626';
  const statusBg    = p.status === 'paid' ? '#DCFCE7' : '#FEE2E2';

  return `<!DOCTYPE html>
<html dir="rtl" lang="ku">
<head>
<meta charset="UTF-8"/>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: -apple-system, Arial, sans-serif; color: #1E293B; font-size: 14px; }
  .inv-wrap { max-width: 600px; margin: 0 auto; padding: 20px; }
  .inv-header { background: linear-gradient(135deg,#1E40AF,#3B82F6); color:#fff; border-radius:12px; padding:24px; margin-bottom:20px; text-align:center; }
  .inv-header h1 { font-size:22px; font-weight:800; margin-bottom:4px; }
  .inv-header p { font-size:13px; opacity:0.85; }
  .inv-section { background:#fff; border:1px solid #E2E8F0; border-radius:10px; padding:16px; margin-bottom:14px; }
  .inv-section-title { font-size:11px; font-weight:700; text-transform:uppercase; letter-spacing:0.8px; color:#64748B; border-bottom:1px solid #F1F5F9; padding-bottom:8px; margin-bottom:12px; }
  .inv-row { display:flex; justify-content:space-between; align-items:center; padding:5px 0; border-bottom:1px solid #F8FAFC; }
  .inv-row:last-child { border-bottom:none; }
  .inv-label { font-size:12px; color:#64748B; font-weight:600; }
  .inv-value { font-size:13px; font-weight:700; color:#1E293B; text-align:left; }
  .inv-total-box { background:linear-gradient(135deg,#EFF6FF,#DBEAFE); border:2px solid #BFDBFE; border-radius:12px; padding:20px; text-align:center; margin-bottom:14px; }
  .inv-total-amount { font-size:28px; font-weight:800; color:#1E40AF; }
  .inv-total-meta { font-size:13px; color:#64748B; margin-top:6px; }
  .inv-footer { text-align:center; font-size:11px; color:#94A3B8; padding-top:10px; }
  .status-pill { display:inline-block; padding:4px 14px; border-radius:20px; font-size:12px; font-weight:700; background:${statusBg}; color:${statusColor}; }
</style>
</head>
<body>
<div class="inv-wrap">

  <div class="inv-header">
    <h1>وەسڵی کڕین / Purchase Invoice</h1>
    <p>#${p.id} &nbsp;|&nbsp; ${formatDate(p.date)}</p>
    <p style="font-size:11px;margin-top:4px;opacity:0.7;">دروستکراو / Generated: ${ts}</p>
  </div>

  <div class="inv-section">
    <div class="inv-section-title">دابینکەر / Supplier</div>
    ${row('ناو / Name', escHtml(p.supplier))}
    ${p.mobile  ? row('مۆبایل / Mobile', escHtml(p.mobile))   : ''}
    ${p.address ? row('ناونیشان / Address', escHtml(p.address)) : ''}
  </div>

  <div class="inv-section">
    <div class="inv-section-title">بەرهەم / Product</div>
    ${row('ناوی بەرهەم / Product Name', escHtml(p.productName))}
    ${p.category ? row('جۆر / Category', escHtml(p.category)) : ''}
    ${row('بڕ / Quantity', String(p.qty))}
    ${row('نرخی کڕین IQD', p.buyIQD.toLocaleString('en-US') + ' IQD')}
    ${row('نرخی کڕین USD', '$' + p.buyUSD.toFixed(2))}
    ${p.warranty ? row('گەرەنتی / Warranty', escHtml(p.warranty)) : ''}
  </div>

  ${idsSection}

  <div class="inv-section">
    <div class="inv-section-title">زانیاری دیکە / Additional Info</div>
    <div class="inv-row">
      <span class="inv-label">دۆخی پارەدان / Payment</span>
      <span class="status-pill">${statusLabel}</span>
    </div>
    ${additionalRows}
  </div>

  <div class="inv-total-box">
    <div class="inv-total-amount">${p.total.toLocaleString('en-US')} IQD</div>
    <div class="inv-total-meta">
      کۆی گشتی / Grand Total &nbsp;|&nbsp; وەسڵ / Invoice #${p.id} &nbsp;|&nbsp; ${formatDate(p.date)}
    </div>
  </div>

  <div class="inv-footer">
    Purchase Manager &nbsp;|&nbsp; Generated: ${ts}
  </div>

</div>
</body>
</html>`;
}

function row(label, value) {
  return `<div class="inv-row"><span class="inv-label">${label}</span><span class="inv-value">${value}</span></div>`;
}

/* ============================================================
   Print invoice
   ============================================================ */
function handlePrintInvoice(id) {
  const purchases = load();
  const p = purchases.find(x => x.id === id);
  if (!p) return;
  const html = buildInvoiceHTML(p);
  document.getElementById('printArea').innerHTML = html;
  window.print();
}

/* ============================================================
   Event listeners
   ============================================================ */
function attachEventListeners() {
  document.getElementById('langToggle').addEventListener('click', toggleLang);
  document.getElementById('tabAdd').addEventListener('click',  () => switchTab('addTab'));
  document.getElementById('tabList').addEventListener('click', () => { switchTab('listTab'); renderList(); });

  document.getElementById('buyIQD').addEventListener('input',  () => syncPrice('buy',  'iqd'));
  document.getElementById('buyUSD').addEventListener('input',  () => syncPrice('buy',  'usd'));
  document.getElementById('sellIQD').addEventListener('input', () => syncPrice('sell', 'iqd'));
  document.getElementById('sellUSD').addEventListener('input', () => syncPrice('sell', 'usd'));

  document.getElementById('qty').addEventListener('input', onQtyChange);

  document.querySelectorAll('.id-type-btn').forEach(b => {
    b.addEventListener('click', () => selectIdType(b.dataset.type));
  });

  document.getElementById('btnSave').addEventListener('click',  handleSave);
  document.getElementById('btnReset').addEventListener('click', handleReset);

  document.getElementById('imageUploadArea').addEventListener('click', e => {
    if (e.target.id === 'removeImage' || e.target.closest('#removeImage')) return;
    document.getElementById('imageInput').click();
  });
  document.getElementById('imageInput').addEventListener('change', handleImageUpload);
  document.getElementById('removeImage').addEventListener('click', e => {
    e.stopPropagation();
    removeImage();
  });

  document.querySelectorAll('.pay-btn').forEach(b => {
    b.addEventListener('click', () => selectPayment(b.dataset.status));
  });
}

/* ============================================================
   Init
   ============================================================ */
document.addEventListener('DOMContentLoaded', () => {
  migrateIds();
  setTodayDate();
  renderCategoryOptions();
  attachEventListeners();
  updateLangUI();
  renderList();
});
