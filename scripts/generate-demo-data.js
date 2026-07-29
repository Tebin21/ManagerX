/**
 * Generates a complete, internally-consistent demo business dataset for Froshiar,
 * in the exact current backup format (schemaVersion 2) produced by lib/backup.ts's
 * exportBackup(). Output is meant to be restored via Settings -> Data Management ->
 * Restore Backup. Contains ONLY fictional business data (no owner/account/logo/
 * theme/device settings).
 *
 * Usage: node scripts/generate-demo-data.js
 */

'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// ─── Seeded PRNG (mulberry32) ──────────────────────────────────────────────────

function mulberry32(seed) {
  let a = seed >>> 0;
  return function rand() {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rand = mulberry32(20260729);

function randInt(min, max) { return Math.floor(rand() * (max - min + 1)) + min; }
function randFloat(min, max) { return rand() * (max - min) + min; }
function choice(arr) { return arr[randInt(0, arr.length - 1)]; }
function chance(p) { return rand() < p; }
function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = randInt(0, i);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
function uuid() { return crypto.randomUUID(); }
function round(n, step) { return Math.round(n / step) * step; }
function clamp(n, lo, hi) { return Math.max(lo, Math.min(hi, n)); }

function slugify(s) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

// ─── Date helpers ───────────────────────────────────────────────────────────────
// Matches the mixed date-format convention observed in froshiar-demo-data.json:
// most `_at` columns store SQLite's space-separated local timestamp; a handful of
// app-set timestamps (sales.date/created_at, debt_payments, *_debts.last_payment_at)
// store full ISO-8601.

const RANGE_START = new Date('2026-01-05T09:00:00Z').getTime();
const RANGE_END   = new Date('2026-07-25T18:00:00Z').getTime();

function randomTimeInRange(startMs, endMs) {
  return new Date(randInt(startMs, endMs));
}

function pad(n) { return String(n).padStart(2, '0'); }

function sqlTs(d) {
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())} ` +
    `${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())}`;
}
function isoTs(d) { return d.toISOString(); }
function dateOnly(d) { return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`; }

function addMinutes(d, mins) { return new Date(d.getTime() + mins * 60000); }
function addDays(d, days) { return new Date(d.getTime() + days * 86400000); }

// ─── Static reference data ─────────────────────────────────────────────────────

const CATEGORIES = [
  ['Phones', 'PHN'], ['Phone Cases', 'CAS'], ['Chargers', 'CHG'], ['Power Banks', 'PWB'],
  ['Headphones', 'HDP'], ['Bluetooth Speakers', 'SPK'], ['Smart Watches', 'SWA'], ['Tablets', 'TAB'],
  ['Laptop Accessories', 'LAP'], ['Gaming', 'GAM'], ['Keyboards', 'KEY'], ['Mouse', 'MOU'],
  ['USB', 'USB'], ['Memory Cards', 'MEM'], ['Hard Drives', 'HDD'], ['Flash Drives', 'FLD'],
  ['Networking', 'NET'], ['Printers', 'PRN'], ['Office', 'OFC'], ['Stationery', 'STA'],
  ['Kitchen', 'KIT'], ['Beauty', 'BEA'], ['Home', 'HOM'], ['Electrical', 'ELE'],
  ['Lighting', 'LIT'], ['Camera', 'CAM'], ['Tools', 'TLS'], ['Car Accessories', 'CAR'],
  ['Cleaning', 'CLN'], ['Miscellaneous', 'MSC'],
];
if (CATEGORIES.length !== 30) throw new Error(`Expected 30 categories, got ${CATEGORIES.length}`);

// [category, productCount] — must sum to exactly 78.
const PRODUCT_COUNTS = [
  ['Phones', 5], ['Phone Cases', 4], ['Chargers', 5], ['Power Banks', 3],
  ['Headphones', 5], ['Bluetooth Speakers', 3], ['Smart Watches', 3], ['Tablets', 2],
  ['Laptop Accessories', 3], ['Gaming', 3], ['Keyboards', 2], ['Mouse', 2],
  ['USB', 3], ['Memory Cards', 2], ['Hard Drives', 2], ['Flash Drives', 2],
  ['Networking', 2], ['Printers', 2], ['Office', 2], ['Stationery', 2],
  ['Kitchen', 2], ['Beauty', 2], ['Home', 2], ['Electrical', 2],
  ['Lighting', 2], ['Camera', 2], ['Tools', 2], ['Car Accessories', 3],
  ['Cleaning', 2], ['Miscellaneous', 2],
];
const TOTAL_PRODUCTS = PRODUCT_COUNTS.reduce((s, [, c]) => s + c, 0);
if (TOTAL_PRODUCTS !== 78) throw new Error(`Expected 78 total products, got ${TOTAL_PRODUCTS}`);

// price ranges in IQD: [minBuy, maxBuy, minMarginMult, maxMarginMult]
const PRICE_RANGES = {
  'Phones': [250000, 650000, 1.22, 1.4],
  'Phone Cases': [3000, 8000, 1.8, 2.5],
  'Chargers': [8000, 20000, 1.5, 2.0],
  'Power Banks': [15000, 35000, 1.4, 1.8],
  'Headphones': [10000, 60000, 1.4, 1.8],
  'Bluetooth Speakers': [20000, 70000, 1.3, 1.6],
  'Smart Watches': [60000, 250000, 1.3, 1.5],
  'Tablets': [150000, 400000, 1.2, 1.35],
  'Laptop Accessories': [10000, 40000, 1.5, 2.0],
  'Gaming': [15000, 60000, 1.4, 1.7],
  'Keyboards': [15000, 45000, 1.4, 1.7],
  'Mouse': [8000, 25000, 1.5, 1.8],
  'USB': [3000, 12000, 1.8, 2.3],
  'Memory Cards': [8000, 35000, 1.3, 1.6],
  'Hard Drives': [60000, 180000, 1.2, 1.4],
  'Flash Drives': [6000, 20000, 1.5, 1.9],
  'Networking': [25000, 80000, 1.3, 1.6],
  'Printers': [120000, 300000, 1.2, 1.35],
  'Office': [5000, 20000, 1.5, 2.0],
  'Stationery': [1000, 8000, 1.8, 2.5],
  'Kitchen': [20000, 70000, 1.3, 1.7],
  'Beauty': [15000, 50000, 1.4, 1.8],
  'Home': [10000, 40000, 1.4, 1.8],
  'Electrical': [8000, 35000, 1.4, 1.8],
  'Lighting': [5000, 25000, 1.5, 2.0],
  'Camera': [60000, 200000, 1.25, 1.45],
  'Tools': [15000, 50000, 1.4, 1.7],
  'Car Accessories': [10000, 40000, 1.4, 1.8],
  'Cleaning': [40000, 150000, 1.25, 1.5],
  'Miscellaneous': [8000, 30000, 1.4, 1.8],
};

const PRODUCT_NAMES = {
  'Phones': [
    'Zynko Nova 12 Smartphone (128GB)', 'Corex Pulse X Smartphone (256GB)',
    'Halox Aria 8 Smartphone (128GB)', 'Draven Edge S Smartphone (64GB)',
    'Nimbus Vibe 5G Smartphone (256GB)', 'Zynko Nova 12 Lite (64GB)',
  ],
  'Phone Cases': [
    'Zynko Nova Silicone Case', 'Universal Shockproof Phone Case',
    'Corex Pulse Clear TPU Case', 'Leather Flip Wallet Case', 'Rugged Armor Case with Stand',
  ],
  'Chargers': [
    'Corex 20W Fast Charger', 'USB-C 65W GaN Charger', 'Dual-Port 30W Wall Charger',
    'Wireless Charging Pad 15W', 'Car Fast Charger 45W', 'MagSafe-Style Wireless Charger',
  ],
  'Power Banks': ['Nimbus 10000mAh Power Bank', 'Halox 20000mAh Fast Charge Power Bank', 'Corex Slim 5000mAh Power Bank'],
  'Headphones': [
    'Draven Over-Ear Bluetooth Headphones', 'Zynko Wireless Earbuds Pro',
    'Halox Noise Cancelling Earbuds', 'Corex Sport Wireless Earphones', 'Nimbus Studio Headphones',
  ],
  'Bluetooth Speakers': ['Nimbus Portable Bluetooth Speaker', 'Halox Mini Speaker Waterproof', 'Corex Party Speaker 40W'],
  'Smart Watches': ['Pulsevia X3 Smartwatch', 'Corex Fit Smartwatch LTE', 'Zynko Watch Active 2'],
  'Tablets': ['Zynko Tab 10 (64GB)', 'Corex Pad Mini (128GB)'],
  'Laptop Accessories': ['Aluminum Laptop Stand', 'Laptop Cooling Pad', 'USB-C Docking Station 8-in-1'],
  'Gaming': ['Draven Gaming Controller', 'RGB Gaming Mouse Pad XL', 'Gaming Headset with Mic'],
  'Keyboards': ['Mechanical Gaming Keyboard RGB', 'Wireless Slim Keyboard'],
  'Mouse': ['Wireless Optical Mouse', 'Gaming Mouse 6400 DPI'],
  'USB': ['USB-C to USB-A Cable 1m', 'USB Hub 4-Port', 'USB-C to Lightning Cable 1m'],
  'Memory Cards': ['MicroSD Card 128GB Class 10', 'SD Card 64GB UHS-I'],
  'Hard Drives': ['External HDD 1TB USB 3.0', 'Portable SSD 512GB'],
  'Flash Drives': ['USB Flash Drive 64GB', 'USB Flash Drive 32GB Metal'],
  'Networking': ['Wi-Fi Router AC1200', 'Network Switch 8-Port'],
  'Printers': ['Inkjet All-in-One Printer', 'Label Printer Portable'],
  'Office': ['Desk Organizer Set', 'Heavy Duty Stapler Set'],
  'Stationery': ['Notebook A5 Hardcover', 'Ballpoint Pen Set (12pcs)'],
  'Kitchen': ['Electric Kettle 1.7L', 'Stainless Steel Knife Set'],
  'Beauty': ['Hair Dryer 2200W', 'Electric Trimmer Kit'],
  'Home': ['LED Desk Lamp', 'Digital Wall Clock'],
  'Electrical': ['Extension Cord 5m (4-Socket)', 'Voltage Stabilizer 1000VA'],
  'Lighting': ['LED Bulb 12W (Pack of 4)', 'Smart LED Strip Light 5m'],
  'Camera': ['Action Camera 4K', 'Webcam Full HD 1080p'],
  'Tools': ['Cordless Drill Set', 'Tool Kit 45-Piece'],
  'Car Accessories': ['Car Phone Mount', 'Car Vacuum Cleaner Portable', 'Car Dash Camera 1080p'],
  'Cleaning': ['Robot Vacuum Cleaner', 'Steam Mop Cleaner'],
  'Miscellaneous': ['Digital Kitchen Scale', 'Travel Adapter Universal'],
};

const KURD_FIRST = [
  'Awat', 'Rebin', 'Rebaz', 'Sarkawt', 'Halgurd', 'Zana', 'Kawa', 'Hemin', 'Aram', 'Bnar',
  'Shene', 'Berivan', 'Roza', 'Sara', 'Avan', 'Lawen', 'Rewan', 'Dashne', 'Nian', 'Havin',
  'Peshraw', 'Diyar', 'Rawa', 'Soran', 'Bahoz', 'Hawre', 'Karwan', 'Nawroz', 'Chia', 'Aveen',
  'Gona', 'Ranj', 'Zheen', 'Sazan', 'Delal', 'Sirwan', 'Yad', 'Chnoor', 'Barzan', 'Xelat',
  'Rasti', 'Bawer', 'Helan', 'Mizgin', 'Snur', 'Tara', 'Viyan', 'Zerya', 'Rukhosh', 'Dilan',
];
const KURD_LAST = [
  'Hama', 'Sleman', 'Rashid', 'Ahmad', 'Karim', 'Faraj', 'Mahmud', 'Aziz', 'Qadir', 'Saeed',
  'Rasul', 'Amin', 'Hussein', 'Jamal', 'Najat', 'Omar', 'Salih', 'Tofiq', 'Wali', 'Yousif',
];
const CITIES = ['Erbil', 'Sulaymaniyah', 'Duhok', 'Halabja', 'Zakho', 'Koya', 'Ranya', 'Chamchamal', 'Shaqlawa', 'Soran'];
const NEIGHBORHOODS = ['Empire District', 'Bakhtiari', 'Dream City', 'Italian Village', '120m Street', 'Malls Road', 'Zanko', 'Iskan', 'Bahar Street', 'Gulan Street'];

function randomPhone() {
  const prefix = choice(['0750', '0751', '0752', '0770', '0771', '0773', '0774', '0790', '0791']);
  return `${prefix} ${randInt(100, 999)} ${randInt(1000, 9999)}`;
}
function randomAddress() { return `${choice(NEIGHBORHOODS)}, ${choice(CITIES)}, Kurdistan Region, Iraq`; }
function randomPersonName(usedNames) {
  let name;
  do { name = `${choice(KURD_FIRST)} ${choice(KURD_LAST)}`; } while (usedNames.has(name));
  usedNames.add(name);
  return name;
}

// ─── ID tables & counters ──────────────────────────────────────────────────────

const db = {
  businesses: [], settings: [], categories: [], products: [], inventory_history: [],
  customers: [], sales: [], sale_items: [],
  debts: [], invoice_counter: [], purchases: [], purchase_items: [], purchase_counter: [],
  purchase_debts: [], purchase_audit_log: [], debt_payments: [], expenses: [], suppliers: [], exchange_rates: [],
};
const nextId = {};
function alloc(table) {
  nextId[table] = (nextId[table] || 0) + 1;
  return nextId[table];
}

// ─── 1. Business ────────────────────────────────────────────────────────────────

const BUSINESS_NAME = 'Rojhelat Mobile & Electronics';
const businessCreated = new Date(RANGE_START);
db.businesses.push({
  id: alloc('businesses'),
  name: BUSINESS_NAME,
  type: 'electronics',
  phone: '0770 445 5678',
  address: 'Erbil, Kurdistan Region, Iraq',
  logo_path: null,
  created_at: sqlTs(businessCreated),
  uuid: uuid(),
});

// ─── 2. Categories ──────────────────────────────────────────────────────────────

const categoryIdByName = {};
for (const [name] of CATEGORIES) {
  const id = alloc('categories');
  categoryIdByName[name] = id;
  db.categories.push({ id, name, created_at: sqlTs(businessCreated), uuid: uuid() });
}

// ─── 3. Suppliers ───────────────────────────────────────────────────────────────

const SUPPLIER_NAMES = [
  'Hewler Electronics Wholesale', 'Zagros Mobile Imports', 'Newroz Tech Supplies',
  'Sulav Gadgets Trading', 'Rojava Electronics Co.', 'Peshraw Import Export',
  'Zhinan Digital Distributors', 'Halo Tech Wholesale', 'Kurdistan Mobile Supply', 'Sterk Electronics Trading',
];
const suppliers = SUPPLIER_NAMES.map((name) => {
  const id = alloc('suppliers');
  const created = randomTimeInRange(RANGE_START, RANGE_START + 20 * 86400000);
  const s = {
    id, name, phone: randomPhone(), address: randomAddress(), notes: null,
    total_spent: 0, // filled in after purchases are generated
    created_at: sqlTs(created), updated_at: sqlTs(created), uuid: uuid(),
  };
  return s;
});

// ─── 4. Customers ───────────────────────────────────────────────────────────────

const usedCustomerNames = new Set();
const N_CUSTOMERS = 55;
const customers = [];
for (let i = 0; i < N_CUSTOMERS; i++) {
  const id = alloc('customers');
  const created = randomTimeInRange(RANGE_START, RANGE_END);
  // Tagging: ~35% cash-only, ~45% repeat, ~20% debt-bearing (repeat and debt can overlap in spirit,
  // but we keep them distinct tags to guarantee coverage of every required customer type).
  let tag;
  const r = rand();
  if (r < 0.35) tag = 'cash-only';
  else if (r < 0.80) tag = 'repeat';
  else tag = 'debt';
  customers.push({
    id, name: randomPersonName(usedCustomerNames), phone: randomPhone(), address: randomAddress(),
    total_purchases: 0, notes: null, created_at: sqlTs(created), updated_at: sqlTs(created), uuid: uuid(),
    tag,
  });
}

// ─── 5. Products ────────────────────────────────────────────────────────────────

const itemIdSeqByPrefix = {};
function nextItemId(prefix) {
  itemIdSeqByPrefix[prefix] = (itemIdSeqByPrefix[prefix] || 1000);
  const id = `${prefix}-${itemIdSeqByPrefix[prefix]}`;
  itemIdSeqByPrefix[prefix]++;
  return id;
}

const products = [];
for (const [catName, count] of PRODUCT_COUNTS) {
  const prefix = CATEGORIES.find(([n]) => n === catName)[1];
  const namePool = shuffle(PRODUCT_NAMES[catName]);
  if (namePool.length < count) throw new Error(`Not enough name variants for ${catName}`);
  const [minBuy, maxBuy, minMult, maxMult] = PRICE_RANGES[catName];
  for (let i = 0; i < count; i++) {
    const id = alloc('products');
    const name = namePool[i];
    const buyPrice = round(randFloat(minBuy, maxBuy), minBuy >= 100000 ? 5000 : (minBuy >= 10000 ? 500 : 100));
    const mult = randFloat(minMult, maxMult);
    const sellPrice = round(buyPrice * mult, minBuy >= 100000 ? 5000 : (minBuy >= 10000 ? 500 : 100));
    // popularity: 1 (slow mover) .. 3 (hot seller) — drives both initial stock size and
    // how often the product gets picked during sales simulation, so a realistic subset
    // (roughly the popularity-3 tier) plausibly sells out by the end of the range.
    const popRoll = rand();
    const popularity = popRoll < 0.55 ? 1 : (popRoll < 0.85 ? 2 : 3);
    const primaryQty = popularity === 3 ? randInt(15, 35) : popularity === 2 ? randInt(30, 70) : randInt(60, 120);
    products.push({
      id, name, category: catName, item_id: nextItemId(prefix), id_mode: 'repeatable',
      purchase_price: buyPrice, selling_price: sellPrice,
      quantity: primaryQty, // provisional — recomputed after sales simulation
      unit: 'pcs', description: null, is_active: 1,
      buy_price_usd: Math.round((buyPrice / 1310) * 100) / 100,
      sell_price_usd: Math.round((sellPrice / 1310) * 100) / 100,
      low_stock_threshold: chance(0.15) ? randInt(3, 10) : null,
      low_stock_enabled: null,
      store_visible: 0, image_remote_url: null, website_description: null,
      // filled in by the primary purchase below:
      purchase_id: null, supplier_name: null, supplier_phone: null, supplier_address: null,
      purchase_date: null, payment_status: null, warranty: chance(0.6) ? choice(['6 Months', '12 Months', '12 Months International', '3 Months']) : null,
      notes: null,
      image_uri: null, // filled in below once we know its id
      uuid: uuid(),
      _popularity: popularity, _primaryQty: primaryQty, _remainingStock: primaryQty, _soldUnits: 0,
    });
  }
}
if (products.length !== 78) throw new Error(`Expected 78 products, built ${products.length}`);
for (const p of products) {
  p.image_uri = `https://picsum.photos/seed/froshiar-${slugify(p.name)}-${p.id}/640/640`;
}

// ─── 6. Purchases + purchase_items + purchase_debts + debt_payments ───────────

function makeDebtPaymentSchedule(originalAmount, startDate, endDate, debtType) {
  // Returns { paidAmount, status, lastPaymentAt, payments: [{amount, remainingAfter, note, createdAt}] }
  const outcome = rand();
  const payments = [];
  let paid = 0;
  let cursor = addDays(startDate, randInt(1, 10));
  const maxCursor = endDate;

  if (outcome < 0.30) {
    // fully settled via 1-3 payments
    const nPayments = randInt(1, 3);
    let remaining = originalAmount;
    for (let i = 0; i < nPayments; i++) {
      const isLast = i === nPayments - 1;
      const amt = isLast ? remaining : round(remaining * randFloat(0.3, 0.6), 500);
      remaining = Math.max(0, remaining - amt);
      paid += amt;
      if (cursor.getTime() > maxCursor.getTime()) cursor = new Date(maxCursor);
      payments.push({
        amount: amt, remainingAfter: remaining,
        note: isLast ? 'Final payment' : (i === 0 ? 'Initial payment' : 'Partial payment'),
        createdAt: cursor,
      });
      cursor = addDays(cursor, randInt(5, 20));
    }
    paid = originalAmount;
  } else if (outcome < 0.70) {
    // partially paid, 1-2 payments, remaining > 0
    const nPayments = randInt(1, 2);
    const targetFraction = randFloat(0.2, 0.75);
    let remaining = originalAmount;
    let paidSoFar = 0;
    for (let i = 0; i < nPayments; i++) {
      const totalTarget = round(originalAmount * targetFraction, 500);
      const amt = i === nPayments - 1
        ? Math.max(500, totalTarget - paidSoFar)
        : round(totalTarget / nPayments, 500);
      remaining = Math.max(0, remaining - amt);
      paidSoFar += amt;
      if (cursor.getTime() > maxCursor.getTime()) cursor = new Date(maxCursor);
      payments.push({
        amount: amt, remainingAfter: remaining,
        note: i === 0 ? 'Initial payment' : 'Partial payment',
        createdAt: cursor,
      });
      cursor = addDays(cursor, randInt(5, 20));
    }
    paid = paidSoFar;
  } else {
    // untouched — no payments at all
    paid = 0;
  }

  const remainingAmount = Math.max(0, originalAmount - paid);
  const status = remainingAmount <= 0 ? 'settled' : 'active';
  const lastPaymentAt = payments.length ? payments[payments.length - 1].createdAt : null;
  return { paidAmount: paid, remainingAmount, status, lastPaymentAt, payments };
}

function createPurchase({ product, supplier, date, quantity, buyPrice, sellPrice, isPrimary }) {
  const id = alloc('purchases');
  const purchaseNumber = pad4(alloc('__purchase_seq'));
  const totalIqd = quantity * buyPrice;
  const profitIqd = quantity * (sellPrice - buyPrice);
  const created = date;
  const isDebt = chance(0.25);
  const paymentStatus = isDebt ? 'debt' : 'paid';

  const purchase = {
    id, purchase_number: purchaseNumber, date: dateOnly(date),
    supplier_name: supplier.name, supplier_phone: supplier.phone, supplier_address: supplier.address,
    product_name: product.name, category: product.category, quantity,
    buy_price_iqd: buyPrice, buy_price_usd: Math.round((buyPrice / 1310) * 100) / 100,
    sell_price_iqd: sellPrice, sell_price_usd: Math.round((sellPrice / 1310) * 100) / 100,
    total_iqd: totalIqd, profit_iqd: profitIqd, exchange_rate: 1310,
    id_type: 'shared', item_ids: JSON.stringify([product.item_id]),
    warranty: product.warranty, description: null, notes: null,
    payment_status: paymentStatus, supplier_id: supplier.id,
    created_at: sqlTs(created), updated_at: sqlTs(created), archived_at: null,
    uuid: uuid(),
  };
  db.purchases.push(purchase);

  db.purchase_items.push({
    id: alloc('purchase_items'), purchase_id: id, product_name: product.name, category: product.category,
    quantity, buy_price_iqd: buyPrice, buy_price_usd: purchase.buy_price_usd,
    sell_price_iqd: sellPrice, sell_price_usd: purchase.sell_price_usd,
    line_total_iqd: totalIqd, id_type: 'shared', item_ids: purchase.item_ids,
    created_at: sqlTs(created), uuid: uuid(),
  });

  supplier._totalSpent = (supplier._totalSpent || 0) + totalIqd;

  if (isPrimary) {
    product.purchase_id = id;
    product.supplier_name = supplier.name;
    product.supplier_phone = supplier.phone;
    product.supplier_address = supplier.address;
    product.purchase_date = purchase.date;
    product.payment_status = paymentStatus;
  }

  if (isDebt) {
    const schedule = makeDebtPaymentSchedule(totalIqd, date, RANGE_END < date.getTime() ? date : new Date(RANGE_END), 'purchase');
    const debtId = alloc('purchase_debts');
    db.purchase_debts.push({
      id: debtId, purchase_id: id, supplier_name: supplier.name, supplier_phone: supplier.phone,
      supplier_address: supplier.address, purchase_number: purchaseNumber,
      original_amount: totalIqd, paid_amount: schedule.paidAmount, remaining_amount: schedule.remainingAmount,
      status: schedule.status, notes: null,
      last_payment_at: schedule.lastPaymentAt ? isoTs(schedule.lastPaymentAt) : null,
      created_at: sqlTs(created),
      updated_at: schedule.lastPaymentAt ? isoTs(schedule.lastPaymentAt) : sqlTs(created),
      uuid: uuid(),
    });
    for (const p of schedule.payments) {
      db.debt_payments.push({
        id: alloc('debt_payments'), debt_id: debtId, debt_type: 'purchase',
        amount: p.amount, remaining_after: p.remainingAfter, note: p.note,
        created_at: isoTs(p.createdAt), uuid: uuid(),
      });
    }
    if (paymentStatus === 'debt' && schedule.status === 'settled') {
      // Mirrors app behavior: once a purchase debt is fully settled, the purchase's own
      // payment_status flips back to 'paid' (see addPaymentToPurchaseDebt in lib/sqlite.ts).
      purchase.payment_status = 'paid';
      if (isPrimary) product.payment_status = 'paid';
    }
  }

  return purchase;
}

function pad4(n) { return String(n).padStart(4, '0'); }

// 78 primary purchases (one per product), scattered across the first ~5 months.
const PRIMARY_WINDOW_END = RANGE_START + (RANGE_END - RANGE_START) * 0.7;
for (const product of products) {
  const supplier = choice(suppliers);
  const date = randomTimeInRange(RANGE_START, PRIMARY_WINDOW_END);
  createPurchase({
    product, supplier, date, quantity: product._primaryQty,
    buyPrice: product.purchase_price, sellPrice: product.selling_price, isPrimary: true,
  });
}

// ~50 standalone restock purchases across the full range, on top of existing products.
const N_RESTOCKS = 50;
for (let i = 0; i < N_RESTOCKS; i++) {
  const product = choice(products);
  const supplier = choice(suppliers);
  const date = randomTimeInRange(RANGE_START + 5 * 86400000, RANGE_END);
  const priceDrift = randFloat(0.9, 1.12);
  const buyPrice = round(product.purchase_price * priceDrift, 500);
  const sellPrice = product.selling_price;
  createPurchase({
    product, supplier, date, quantity: randInt(10, 60),
    buyPrice, sellPrice, isPrimary: false,
  });
}

db.purchase_counter.push({ id: 1, last_number: nextId.__purchase_seq || 0, last_date: '' });

// ─── 7. Sales + sale_items + debts + debt_payments ─────────────────────────────

const N_SALES = 360;
const saleDates = [];
for (let i = 0; i < N_SALES; i++) saleDates.push(randomTimeInRange(RANGE_START, RANGE_END));
saleDates.sort((a, b) => a - b);

const debtCustomers = customers.filter((c) => c.tag === 'debt');
const repeatCustomers = customers.filter((c) => c.tag === 'repeat');
const cashCustomers = customers.filter((c) => c.tag === 'cash-only');

// Guarantee every 'debt' customer gets at least one debt sale, and every 'repeat'
// customer gets multiple sales, by biasing the per-sale customer pick with a queue.
const debtGuaranteeQueue = shuffle(debtCustomers.slice());
const repeatUsageCount = new Map(repeatCustomers.map((c) => [c.id, 0]));

function pickWeightedProducts(n) {
  const available = products.filter((p) => p._remainingStock > 0);
  if (available.length === 0) return [];
  const picked = [];
  const pool = shuffle(available);
  // weight by popularity: build a weighted list, prefer higher popularity
  const weighted = [];
  for (const p of pool) {
    const w = p._popularity === 3 ? 5 : p._popularity === 2 ? 2 : 1;
    for (let i = 0; i < w; i++) weighted.push(p);
  }
  const seen = new Set();
  let attempts = 0;
  while (picked.length < n && attempts < 200) {
    attempts++;
    const cand = choice(weighted);
    if (seen.has(cand.id) || cand._remainingStock <= 0) continue;
    seen.add(cand.id);
    picked.push(cand);
  }
  return picked;
}

let totalSalesGenerated = 0;
for (const date of saleDates) {
  const itemRoll = rand();
  const nItems = itemRoll < 0.60 ? 1 : itemRoll < 0.90 ? 2 : 3;
  const chosenProducts = pickWeightedProducts(nItems);
  if (chosenProducts.length === 0) continue; // everything sold out — skip this slot

  const saleId = alloc('sales');
  const invoiceNumber = pad4(alloc('__invoice_seq'));

  const saleItems = [];
  let subtotal = 0;
  for (const product of chosenProducts) {
    const maxQty = Math.min(5, product._remainingStock);
    const qty = randInt(1, Math.max(1, maxQty));
    product._remainingStock -= qty;
    product._soldUnits += qty;
    const discount = chance(0.05) ? round(product.selling_price * qty * randFloat(0.02, 0.08), 500) : 0;
    const lineTotal = product.selling_price * qty - discount;
    subtotal += lineTotal;
    saleItems.push({
      id: alloc('sale_items'), sale_id: saleId, product_id: product.id, product_name: product.name,
      item_id: product.item_id, id_mode: product.id_mode,
      purchase_price: product.purchase_price, selling_price: product.selling_price,
      quantity: qty, discount, line_total: lineTotal, uuid: uuid(),
    });
  }

  // pick a customer
  let customer;
  let paymentMethod;
  if (debtGuaranteeQueue.length && chance(0.5)) {
    customer = debtGuaranteeQueue.shift();
    paymentMethod = 'debt';
  } else {
    const r = rand();
    if (r < 0.30 && repeatCustomers.length) {
      customer = choice(repeatCustomers);
      repeatUsageCount.set(customer.id, (repeatUsageCount.get(customer.id) || 0) + 1);
      paymentMethod = chance(0.22) ? 'debt' : 'cash';
    } else if (r < 0.55 && cashCustomers.length) {
      customer = choice(cashCustomers);
      paymentMethod = 'cash';
    } else if (debtCustomers.length && chance(0.18)) {
      customer = choice(debtCustomers);
      paymentMethod = chance(0.6) ? 'debt' : 'cash';
    } else {
      customer = choice(customers);
      paymentMethod = customer.tag === 'cash-only' ? 'cash' : (chance(0.2) ? 'debt' : 'cash');
    }
  }

  const globalDiscountRoll = chance(0.1);
  const globalDiscountType = globalDiscountRoll ? choice(['percentage', 'amount']) : 'none';
  let globalDiscount = 0;
  if (globalDiscountType === 'percentage') globalDiscount = round(subtotal * randFloat(0.03, 0.08), 500);
  else if (globalDiscountType === 'amount') globalDiscount = round(randFloat(2000, 10000), 500);
  const discountTotal = saleItems.reduce((s, it) => s + it.discount, 0);
  const grandTotal = Math.max(0, subtotal - globalDiscount);

  let paidAmount, remainingDebt;
  if (paymentMethod === 'debt' && grandTotal > 1000) {
    paidAmount = round(grandTotal * randFloat(0, 0.7), 500);
    remainingDebt = grandTotal - paidAmount;
    if (remainingDebt <= 0) { paidAmount = Math.max(0, grandTotal - 1000); remainingDebt = grandTotal - paidAmount; }
  } else {
    paymentMethod = 'cash';
    paidAmount = grandTotal;
    remainingDebt = 0;
  }

  const sale = {
    id: saleId, invoice_number: invoiceNumber, customer_id: customer.id,
    customer_name: customer.name, customer_phone: customer.phone, customer_address: customer.address,
    warranty: chosenProducts[0].warranty, notes: null, payment_method: paymentMethod,
    subtotal, discount_total: discountTotal, global_discount_type: globalDiscountType, global_discount: globalDiscount,
    grand_total: grandTotal, paid_amount: paidAmount, remaining_debt: remainingDebt,
    status: 'completed', exchange_rate: 1310,
    date: isoTs(date), created_at: isoTs(date), updated_at: sqlTs(date),
    uuid: uuid(),
  };
  db.sales.push(sale);
  db.sale_items.push(...saleItems);
  customer.total_purchases += grandTotal;
  totalSalesGenerated++;

  if (remainingDebt > 0) {
    const schedule = makeDebtPaymentSchedule(remainingDebt, date, new Date(RANGE_END), 'sales');
    const debtId = alloc('debts');
    db.debts.push({
      id: debtId, sale_id: saleId, customer_name: customer.name, customer_phone: customer.phone,
      original_amount: remainingDebt, paid_amount: schedule.paidAmount, remaining_amount: schedule.remainingAmount,
      status: schedule.status, created_at: sqlTs(date),
      updated_at: schedule.lastPaymentAt ? isoTs(schedule.lastPaymentAt) : sqlTs(date),
      last_payment_at: schedule.lastPaymentAt ? isoTs(schedule.lastPaymentAt) : null,
      uuid: uuid(),
    });
    for (const p of schedule.payments) {
      db.debt_payments.push({
        id: alloc('debt_payments'), debt_id: debtId, debt_type: 'sales',
        amount: p.amount, remaining_after: p.remainingAfter, note: p.note,
        created_at: isoTs(p.createdAt), uuid: uuid(),
      });
    }
    // Mirror addPaymentToDebt's cascade: partial/settled payments on the sales debt
    // update the parent sale's own paid_amount/remaining_debt too.
    sale.paid_amount = paidAmount + schedule.paidAmount;
    sale.remaining_debt = remainingDebt - schedule.paidAmount;
  }
}

db.invoice_counter.push({ id: 1, last_number: nextId.__invoice_seq || 0, last_date: '' });

// ─── 8. Finalize product quantities + inventory_history for sold-out items ────

let soldOutCount = 0;
for (const product of products) {
  product.quantity = product._remainingStock;
  if (product.quantity === 0) {
    soldOutCount++;
    const archived = addDays(new Date(RANGE_END), -randInt(0, 3));
    db.inventory_history.push({
      id: alloc('inventory_history'), product_id: product.id, product_name: product.name,
      category: product.category, image_uri: product.image_uri, item_id: product.item_id,
      purchase_price: product.purchase_price, selling_price: product.selling_price,
      quantity_sold: product._soldUnits, final_quantity: 0, status: 'sold_out',
      archived_at: sqlTs(archived), purchase_id: product.purchase_id, uuid: uuid(),
    });
  }
}

// Strip internal-only fields before emitting products.
for (const p of products) {
  delete p._popularity; delete p._primaryQty; delete p._remainingStock; delete p._soldUnits;
}
db.products.push(...products);

// Emit customers/suppliers (strip internal tag/accumulator fields).
for (const c of customers) {
  db.customers.push({
    id: c.id, name: c.name, phone: c.phone, address: c.address,
    total_purchases: round(c.total_purchases, 1), notes: c.notes,
    created_at: c.created_at, updated_at: c.updated_at, uuid: c.uuid,
  });
}
for (const s of suppliers) {
  db.suppliers.push({
    id: s.id, name: s.name, phone: s.phone, address: s.address, notes: s.notes,
    total_spent: s._totalSpent || 0, created_at: s.created_at, updated_at: s.updated_at, uuid: s.uuid,
  });
}

// ─── 9. Expenses ────────────────────────────────────────────────────────────────

const EXPENSE_TEMPLATES = [
  { reason: 'Shop Rent', category: 'Other', amount: [400000, 500000], monthly: true },
  { reason: 'Electricity Bill', category: 'Utilities', amount: [60000, 100000], monthly: true },
  { reason: 'Internet Bill', category: 'Utilities', amount: [25000, 40000], monthly: true },
  { reason: 'Water Bill', category: 'Utilities', amount: [12000, 22000], monthly: true },
  { reason: 'Employee Salary', category: 'Other', amount: [400000, 650000], monthly: true },
  { reason: 'Fuel', category: 'Transport', amount: [30000, 55000], monthly: true },
  { reason: 'Transportation', category: 'Transport', amount: [15000, 35000], monthly: false },
  { reason: 'Packaging', category: 'Other', amount: [10000, 30000], monthly: false },
  { reason: 'Office Supplies', category: 'Other', amount: [8000, 25000], monthly: false },
  { reason: 'Maintenance', category: 'Other', amount: [15000, 45000], monthly: false },
  { reason: 'Marketing', category: 'Other', amount: [30000, 90000], monthly: false },
  { reason: 'Cleaning Supplies', category: 'Other', amount: [8000, 18000], monthly: false },
  { reason: 'Software Subscription', category: 'Other', amount: [15000, 35000], monthly: false },
  { reason: 'Taxes', category: 'Other', amount: [50000, 150000], monthly: false },
  { reason: 'Miscellaneous', category: 'Other', amount: [5000, 20000], monthly: false },
];

const monthStarts = [];
{
  let cursor = new Date(RANGE_START);
  cursor = new Date(Date.UTC(cursor.getUTCFullYear(), cursor.getUTCMonth(), 1));
  const endDate = new Date(RANGE_END);
  while (cursor.getTime() <= endDate.getTime()) {
    monthStarts.push(new Date(cursor));
    cursor = new Date(Date.UTC(cursor.getUTCFullYear(), cursor.getUTCMonth() + 1, 1));
  }
}

for (const monthStart of monthStarts) {
  const monthEndExclusive = new Date(Date.UTC(monthStart.getUTCFullYear(), monthStart.getUTCMonth() + 1, 1));
  const clampedEnd = new Date(Math.min(monthEndExclusive.getTime() - 1, RANGE_END));
  const clampedStart = new Date(Math.max(monthStart.getTime(), RANGE_START));
  if (clampedStart.getTime() > clampedEnd.getTime()) continue;

  for (const tmpl of EXPENSE_TEMPLATES) {
    if (!tmpl.monthly && !chance(0.55)) continue; // occasional expenses skip some months
    const date = randomTimeInRange(clampedStart.getTime(), clampedEnd.getTime());
    const amount = round(randFloat(tmpl.amount[0], tmpl.amount[1]), 500);
    db.expenses.push({
      id: alloc('expenses'), amount, category: tmpl.category, note: null, reason: tmpl.reason,
      date: dateOnly(date), created_at: sqlTs(date), updated_at: sqlTs(date), uuid: uuid(),
    });
  }
}

// ─── 10. Exchange rates ─────────────────────────────────────────────────────────

db.exchange_rates.push(
  { id: alloc('exchange_rates'), rate: 1310, note: 'Initial rate', created_at: sqlTs(new Date(RANGE_START)), uuid: uuid() },
  { id: alloc('exchange_rates'), rate: 1310, note: 'Rate confirmed', created_at: sqlTs(new Date(RANGE_START + (RANGE_END - RANGE_START) * 0.5)), uuid: uuid() },
);

// ─── 11. Assemble backup ────────────────────────────────────────────────────────

const backup = {
  meta: {
    schemaVersion: 2,
    version: '2.0',
    backupDate: new Date().toISOString(),
    appVersion: '1.0.0',
    platform: 'android',
  },
  database: db,
  stores: {
    business: JSON.stringify({
      name: BUSINESS_NAME,
      phone: '0770 445 5678',
      address: 'Erbil, Kurdistan Region, Iraq',
    }),
    settings: JSON.stringify({
      exchangeRate: 1310,
      rateUpdatedAt: sqlTs(new Date(RANGE_END)),
      globalLowStockEnabled: true,
      globalLowStockThreshold: 5,
    }),
  },
};

// ─── 12. Internal arithmetic validation ────────────────────────────────────────

const errors = [];
function check(cond, msg) { if (!cond) errors.push(msg); }

check(db.products.length === 78, `expected 78 products, got ${db.products.length}`);
check(db.categories.length === 30, `expected 30 categories, got ${db.categories.length}`);

for (const p of db.products) check(p.quantity >= 0, `negative quantity on product ${p.id}`);

const productById = new Map(db.products.map((p) => [p.id, p]));
const purchaseById = new Map(db.purchases.map((p) => [p.id, p]));
const supplierById = new Map(db.suppliers.map((s) => [s.id, s]));
const customerById = new Map(db.customers.map((c) => [c.id, c]));
const saleById = new Map(db.sales.map((s) => [s.id, s]));

for (const p of db.products) {
  check(purchaseById.has(p.purchase_id), `product ${p.id} has dangling purchase_id ${p.purchase_id}`);
}
for (const pur of db.purchases) {
  check(supplierById.has(pur.supplier_id), `purchase ${pur.id} has dangling supplier_id`);
}
for (const si of db.sale_items) {
  check(productById.has(si.product_id), `sale_item ${si.id} has dangling product_id`);
  check(saleById.has(si.sale_id), `sale_item ${si.id} has dangling sale_id`);
}
for (const s of db.sales) {
  check(customerById.has(s.customer_id), `sale ${s.id} has dangling customer_id`);
  const items = db.sale_items.filter((si) => si.sale_id === s.id);
  const computedSubtotal = items.reduce((sum, it) => sum + it.line_total, 0);
  check(Math.abs(computedSubtotal - s.subtotal) < 1, `sale ${s.id} subtotal mismatch: ${computedSubtotal} vs ${s.subtotal}`);
  const computedGrand = Math.max(0, s.subtotal - s.global_discount);
  check(Math.abs(computedGrand - s.grand_total) < 1, `sale ${s.id} grand_total mismatch`);
  check(Math.abs((s.paid_amount + s.remaining_debt) - s.grand_total) < 1, `sale ${s.id} paid+remaining != grand_total`);
  check(s.remaining_debt >= 0, `sale ${s.id} negative remaining_debt`);
}
for (const d of db.debts) {
  check(saleById.has(d.sale_id), `debt ${d.id} has dangling sale_id`);
  check(Math.abs((d.original_amount - d.paid_amount) - d.remaining_amount) < 1, `debt ${d.id} remaining_amount mismatch`);
  const paySum = db.debt_payments.filter((p) => p.debt_type === 'sales' && p.debt_id === d.id).reduce((s, p) => s + p.amount, 0);
  check(Math.abs(paySum - d.paid_amount) < 1, `debt ${d.id} payment sum mismatch: ${paySum} vs ${d.paid_amount}`);
  check((d.remaining_amount <= 0) === (d.status === 'settled'), `debt ${d.id} status/remaining mismatch`);
}
for (const pd of db.purchase_debts) {
  check(purchaseById.has(pd.purchase_id), `purchase_debt ${pd.id} has dangling purchase_id`);
  check(Math.abs((pd.original_amount - pd.paid_amount) - pd.remaining_amount) < 1, `purchase_debt ${pd.id} remaining_amount mismatch`);
  const paySum = db.debt_payments.filter((p) => p.debt_type === 'purchase' && p.debt_id === pd.id).reduce((s, p) => s + p.amount, 0);
  check(Math.abs(paySum - pd.paid_amount) < 1, `purchase_debt ${pd.id} payment sum mismatch`);
  check((pd.remaining_amount <= 0) === (pd.status === 'settled'), `purchase_debt ${pd.id} status/remaining mismatch`);
}

const invoiceNumbers = new Set(db.sales.map((s) => s.invoice_number));
check(invoiceNumbers.size === db.sales.length, 'duplicate invoice_number found');
const purchaseNumbers = new Set(db.purchases.map((p) => p.purchase_number));
check(purchaseNumbers.size === db.purchases.length, 'duplicate purchase_number found');
const itemIds = new Set(db.products.map((p) => p.item_id));
check(itemIds.size === db.products.length, 'duplicate item_id found');

// customers.total_purchases reconciliation
const salesByCustomer = new Map();
for (const s of db.sales) salesByCustomer.set(s.customer_id, (salesByCustomer.get(s.customer_id) || 0) + s.grand_total);
for (const c of db.customers) {
  const expected = salesByCustomer.get(c.id) || 0;
  check(Math.abs(expected - c.total_purchases) < 1, `customer ${c.id} total_purchases mismatch: ${expected} vs ${c.total_purchases}`);
}
// suppliers.total_spent reconciliation
const purchasesBySupplier = new Map();
for (const pur of db.purchases) purchasesBySupplier.set(pur.supplier_id, (purchasesBySupplier.get(pur.supplier_id) || 0) + pur.total_iqd);
for (const s of db.suppliers) {
  const expected = purchasesBySupplier.get(s.id) || 0;
  check(Math.abs(expected - s.total_spent) < 1, `supplier ${s.id} total_spent mismatch`);
}

const REQUIRED_FIELD = {
  products: 'name', customers: 'name', suppliers: 'name', sales: 'invoice_number',
  purchases: 'purchase_number', categories: 'name', expenses: 'amount',
};
for (const [table, field] of Object.entries(REQUIRED_FIELD)) {
  const rows = db[table];
  if (rows.length && !(field in rows[0])) errors.push(`table ${table} row 0 missing required field ${field}`);
}

console.log('─── Generation summary ───');
for (const [table, rows] of Object.entries(db)) console.log(`  ${table}: ${rows.length} rows`);
console.log(`  sold-out products: ${soldOutCount} / 78 (${Math.round((soldOutCount / 78) * 100)}%)`);
console.log(`  debt sales: ${db.debts.length} / ${db.sales.length}`);
console.log(`  debt purchases: ${db.purchase_debts.length} / ${db.purchases.length}`);

if (errors.length) {
  console.error(`\n─── VALIDATION FAILED (${errors.length} errors) ───`);
  for (const e of errors.slice(0, 50)) console.error('  - ' + e);
  process.exit(1);
}
console.log('\n─── Internal arithmetic validation: PASS ───');

// ─── 13. Write output ───────────────────────────────────────────────────────────

const outPath = path.join(__dirname, '..', 'froshiar-demo-electronics-store.json');
fs.writeFileSync(outPath, JSON.stringify(backup, null, 2));
console.log(`\nWrote ${outPath}`);
