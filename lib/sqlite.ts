import * as SQLite from 'expo-sqlite';
import type {
  Product, SaleItem, Sale, Debt,
  IdMode, PaymentMethod, SaleStatus, DebtStatus,
} from '@/types/sales';
import type { Purchase, PurchasePaymentStatus, PurchaseIdType } from '@/types/purchases';
import type { InventoryProduct, InventoryStats, NewProductData } from '@/types/inventory';
import type { Customer, CustomerWithStats, UpdateSaleInput } from '@/types/customers';
import type { PurchaseDebt, SalesDebtDetail, DebtPayment, DebtOverviewSummary } from '@/types/debt';

let db: SQLite.SQLiteDatabase | null = null;

export async function getDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (!db) {
    db = await SQLite.openDatabaseAsync('managerx.db');
  }
  return db;
}

export async function initializeDatabase(): Promise<void> {
  const database = await getDatabase();

  await database.execAsync(`
    PRAGMA journal_mode = WAL;

    CREATE TABLE IF NOT EXISTS businesses (
      id INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      type TEXT,
      phone TEXT,
      address TEXT,
      logo_path TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS products (
      id              INTEGER PRIMARY KEY AUTOINCREMENT,
      name            TEXT    NOT NULL,
      category        TEXT    NOT NULL DEFAULT 'General',
      item_id         TEXT,
      id_mode         TEXT    NOT NULL DEFAULT 'repeatable',
      purchase_price  REAL    NOT NULL DEFAULT 0,
      selling_price   REAL    NOT NULL DEFAULT 0,
      quantity        INTEGER NOT NULL DEFAULT 0,
      unit            TEXT    NOT NULL DEFAULT 'pcs',
      description     TEXT,
      is_active       INTEGER NOT NULL DEFAULT 1,
      created_at      TEXT    NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at      TEXT    NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS customers (
      id               INTEGER PRIMARY KEY AUTOINCREMENT,
      name             TEXT NOT NULL,
      phone            TEXT,
      address          TEXT,
      total_purchases  REAL NOT NULL DEFAULT 0,
      created_at       TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS sales (
      id                INTEGER PRIMARY KEY AUTOINCREMENT,
      invoice_number    TEXT NOT NULL UNIQUE,
      customer_id       INTEGER REFERENCES customers(id) ON DELETE SET NULL,
      customer_name     TEXT,
      customer_phone    TEXT,
      customer_address  TEXT,
      warranty          TEXT,
      notes             TEXT,
      payment_method    TEXT NOT NULL DEFAULT 'cash',
      subtotal          REAL NOT NULL DEFAULT 0,
      discount_total    REAL NOT NULL DEFAULT 0,
      grand_total       REAL NOT NULL DEFAULT 0,
      paid_amount       REAL NOT NULL DEFAULT 0,
      remaining_debt    REAL NOT NULL DEFAULT 0,
      status            TEXT NOT NULL DEFAULT 'completed',
      created_at        TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at        TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS sale_items (
      id              INTEGER PRIMARY KEY AUTOINCREMENT,
      sale_id         INTEGER NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
      product_id      INTEGER NOT NULL REFERENCES products(id),
      product_name    TEXT    NOT NULL,
      item_id         TEXT,
      id_mode         TEXT    NOT NULL DEFAULT 'repeatable',
      purchase_price  REAL    NOT NULL DEFAULT 0,
      selling_price   REAL    NOT NULL DEFAULT 0,
      quantity        INTEGER NOT NULL DEFAULT 1,
      discount        REAL    NOT NULL DEFAULT 0,
      line_total      REAL    NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS debts (
      id                INTEGER PRIMARY KEY AUTOINCREMENT,
      sale_id           INTEGER NOT NULL UNIQUE REFERENCES sales(id) ON DELETE CASCADE,
      customer_name     TEXT NOT NULL,
      customer_phone    TEXT,
      original_amount   REAL NOT NULL,
      paid_amount       REAL NOT NULL DEFAULT 0,
      remaining_amount  REAL NOT NULL,
      status            TEXT NOT NULL DEFAULT 'active',
      created_at        TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at        TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS invoice_counter (
      id           INTEGER PRIMARY KEY CHECK (id = 1),
      last_number  INTEGER NOT NULL DEFAULT 0,
      last_date    TEXT    NOT NULL DEFAULT ''
    );

    INSERT OR IGNORE INTO invoice_counter (id, last_number, last_date) VALUES (1, 0, '');

    CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
    CREATE INDEX IF NOT EXISTS idx_products_item_id  ON products(item_id);
    CREATE INDEX IF NOT EXISTS idx_sales_created_at  ON sales(created_at);
    CREATE INDEX IF NOT EXISTS idx_sale_items_sale   ON sale_items(sale_id);

    CREATE TABLE IF NOT EXISTS purchases (
      id               INTEGER PRIMARY KEY AUTOINCREMENT,
      purchase_number  TEXT NOT NULL UNIQUE,
      date             TEXT NOT NULL DEFAULT CURRENT_DATE,
      supplier_name    TEXT,
      supplier_phone   TEXT,
      supplier_address TEXT,
      product_name     TEXT NOT NULL,
      category         TEXT,
      quantity         INTEGER NOT NULL DEFAULT 1,
      buy_price_iqd    REAL NOT NULL DEFAULT 0,
      buy_price_usd    REAL NOT NULL DEFAULT 0,
      sell_price_iqd   REAL NOT NULL DEFAULT 0,
      sell_price_usd   REAL NOT NULL DEFAULT 0,
      total_iqd        REAL NOT NULL DEFAULT 0,
      profit_iqd       REAL NOT NULL DEFAULT 0,
      id_type          TEXT,
      item_ids         TEXT NOT NULL DEFAULT '[]',
      warranty         TEXT,
      description      TEXT,
      notes            TEXT,
      payment_status   TEXT NOT NULL DEFAULT 'paid',
      created_at       TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at       TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS purchase_counter (
      id           INTEGER PRIMARY KEY CHECK (id = 1),
      last_number  INTEGER NOT NULL DEFAULT 0,
      last_date    TEXT    NOT NULL DEFAULT ''
    );

    INSERT OR IGNORE INTO purchase_counter (id, last_number, last_date) VALUES (1, 0, '');

    CREATE INDEX IF NOT EXISTS idx_purchases_created_at ON purchases(created_at);

    CREATE TABLE IF NOT EXISTS purchase_debts (
      id               INTEGER PRIMARY KEY AUTOINCREMENT,
      purchase_id      INTEGER REFERENCES purchases(id) ON DELETE SET NULL,
      supplier_name    TEXT NOT NULL,
      supplier_phone   TEXT,
      supplier_address TEXT,
      purchase_number  TEXT,
      original_amount  REAL NOT NULL DEFAULT 0,
      paid_amount      REAL NOT NULL DEFAULT 0,
      remaining_amount REAL NOT NULL DEFAULT 0,
      status           TEXT NOT NULL DEFAULT 'active',
      notes            TEXT,
      last_payment_at  TEXT,
      created_at       TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at       TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS debt_payments (
      id              INTEGER PRIMARY KEY AUTOINCREMENT,
      debt_id         INTEGER NOT NULL,
      debt_type       TEXT NOT NULL DEFAULT 'sales',
      amount          REAL NOT NULL,
      remaining_after REAL NOT NULL,
      note            TEXT,
      created_at      TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS expenses (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      amount     REAL    NOT NULL DEFAULT 0,
      category   TEXT    NOT NULL DEFAULT 'Other',
      note       TEXT,
      date       TEXT    NOT NULL DEFAULT CURRENT_DATE,
      created_at TEXT    NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT    NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses(date);

    CREATE TABLE IF NOT EXISTS suppliers (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      name        TEXT    NOT NULL,
      phone       TEXT,
      address     TEXT,
      notes       TEXT,
      total_spent REAL    NOT NULL DEFAULT 0,
      created_at  TEXT    NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at  TEXT    NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS idx_suppliers_name ON suppliers(name);

    CREATE TABLE IF NOT EXISTS purchase_items (
      id             INTEGER PRIMARY KEY AUTOINCREMENT,
      purchase_id    INTEGER NOT NULL REFERENCES purchases(id) ON DELETE CASCADE,
      product_name   TEXT    NOT NULL,
      category       TEXT,
      quantity       INTEGER NOT NULL DEFAULT 1,
      buy_price_iqd  REAL    NOT NULL DEFAULT 0,
      buy_price_usd  REAL    NOT NULL DEFAULT 0,
      sell_price_iqd REAL    NOT NULL DEFAULT 0,
      sell_price_usd REAL    NOT NULL DEFAULT 0,
      line_total_iqd REAL    NOT NULL DEFAULT 0,
      id_type        TEXT,
      item_ids       TEXT    NOT NULL DEFAULT '[]',
      created_at     TEXT    NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS idx_purchase_items_purchase ON purchase_items(purchase_id);

    CREATE TABLE IF NOT EXISTS reports_cache (
      key        TEXT PRIMARY KEY,
      data       TEXT NOT NULL,
      expires_at TEXT NOT NULL
    );
  `);

  await runMigrations(database);
}

async function runMigrations(database: SQLite.SQLiteDatabase): Promise<void> {
  const migrations = [
    `ALTER TABLE products ADD COLUMN purchase_id INTEGER`,
    `ALTER TABLE products ADD COLUMN supplier_name TEXT`,
    `ALTER TABLE products ADD COLUMN supplier_phone TEXT`,
    `ALTER TABLE products ADD COLUMN supplier_address TEXT`,
    `ALTER TABLE products ADD COLUMN purchase_date TEXT`,
    `ALTER TABLE products ADD COLUMN payment_status TEXT DEFAULT 'paid'`,
    `ALTER TABLE products ADD COLUMN warranty TEXT`,
    `ALTER TABLE products ADD COLUMN image_uri TEXT`,
    `ALTER TABLE products ADD COLUMN buy_price_usd REAL DEFAULT 0`,
    `ALTER TABLE products ADD COLUMN sell_price_usd REAL DEFAULT 0`,
    `ALTER TABLE customers ADD COLUMN notes TEXT`,
    `ALTER TABLE customers ADD COLUMN updated_at TEXT DEFAULT CURRENT_TIMESTAMP`,
    `ALTER TABLE debts ADD COLUMN last_payment_at TEXT`,
    `CREATE TABLE IF NOT EXISTS expenses (id INTEGER PRIMARY KEY AUTOINCREMENT, amount REAL NOT NULL DEFAULT 0, category TEXT NOT NULL DEFAULT 'Other', note TEXT, date TEXT NOT NULL DEFAULT CURRENT_DATE, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)`,
    `CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses(date)`,
    `CREATE TABLE IF NOT EXISTS suppliers (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, phone TEXT, address TEXT, notes TEXT, total_spent REAL NOT NULL DEFAULT 0, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)`,
    `CREATE INDEX IF NOT EXISTS idx_suppliers_name ON suppliers(name)`,
    `CREATE TABLE IF NOT EXISTS purchase_items (id INTEGER PRIMARY KEY AUTOINCREMENT, purchase_id INTEGER NOT NULL REFERENCES purchases(id) ON DELETE CASCADE, product_name TEXT NOT NULL, category TEXT, quantity INTEGER NOT NULL DEFAULT 1, buy_price_iqd REAL NOT NULL DEFAULT 0, buy_price_usd REAL NOT NULL DEFAULT 0, sell_price_iqd REAL NOT NULL DEFAULT 0, sell_price_usd REAL NOT NULL DEFAULT 0, line_total_iqd REAL NOT NULL DEFAULT 0, id_type TEXT, item_ids TEXT NOT NULL DEFAULT '[]', created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)`,
    `CREATE INDEX IF NOT EXISTS idx_purchase_items_purchase ON purchase_items(purchase_id)`,
    `CREATE TABLE IF NOT EXISTS reports_cache (key TEXT PRIMARY KEY, data TEXT NOT NULL, expires_at TEXT NOT NULL)`,
    `ALTER TABLE purchases ADD COLUMN supplier_id INTEGER`,
    // Backfill purchase_items from existing purchases (one item per purchase)
    `INSERT OR IGNORE INTO purchase_items (purchase_id, product_name, category, quantity, buy_price_iqd, buy_price_usd, sell_price_iqd, sell_price_usd, line_total_iqd, id_type, item_ids) SELECT id, product_name, COALESCE(category,'General'), quantity, buy_price_iqd, buy_price_usd, sell_price_iqd, sell_price_usd, total_iqd, id_type, item_ids FROM purchases WHERE id NOT IN (SELECT DISTINCT purchase_id FROM purchase_items)`,
    // Exchange rate snapshot column on purchases
    `ALTER TABLE purchases ADD COLUMN exchange_rate REAL DEFAULT 1310`,
    // Exchange rate audit log table
    `CREATE TABLE IF NOT EXISTS exchange_rates (id INTEGER PRIMARY KEY AUTOINCREMENT, rate REAL NOT NULL, note TEXT, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)`,
    // Seed the initial rate so the history is never empty
    `INSERT OR IGNORE INTO exchange_rates (id, rate, note) VALUES (1, 1310, 'Initial rate')`,
  ];
  for (const sql of migrations) {
    try { await database.execAsync(sql); } catch { /* column already exists */ }
  }
}

// ─── Business ────────────────────────────────────────────────────────────────

export async function saveBusiness(data: {
  name: string;
  type: string;
  phone: string;
  address: string;
  logoPath?: string;
}): Promise<void> {
  const database = await getDatabase();

  await database.runAsync(
    `INSERT OR REPLACE INTO businesses (id, name, type, phone, address, logo_path)
     VALUES (1, ?, ?, ?, ?, ?)`,
    [data.name, data.type, data.phone, data.address, data.logoPath ?? null]
  );
}

export async function loadBusiness(): Promise<{
  name: string;
  type: string;
  phone: string;
  address: string;
  logoPath: string | null;
} | null> {
  const database = await getDatabase();

  const row = await database.getFirstAsync<{
    name: string;
    type: string;
    phone: string;
    address: string;
    logo_path: string | null;
  }>('SELECT * FROM businesses WHERE id = 1');

  if (!row) return null;

  return {
    name: row.name,
    type: row.type,
    phone: row.phone,
    address: row.address,
    logoPath: row.logo_path,
  };
}

export async function saveSetting(key: string, value: string): Promise<void> {
  const database = await getDatabase();
  await database.runAsync(
    'INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)',
    [key, value]
  );
}

export async function loadSetting(key: string): Promise<string | null> {
  const database = await getDatabase();
  const row = await database.getFirstAsync<{ value: string }>(
    'SELECT value FROM settings WHERE key = ?',
    [key]
  );
  return row?.value ?? null;
}

// ─── Invoice Counter ──────────────────────────────────────────────────────────

export async function generateInvoiceNumber(): Promise<string> {
  const database = await getDatabase();

  return database.withTransactionAsync(async () => {
    const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const row = await database.getFirstAsync<{ last_number: number; last_date: string }>(
      'SELECT last_number, last_date FROM invoice_counter WHERE id = 1'
    );

    const nextNumber = row && row.last_date === today ? row.last_number + 1 : 1;

    await database.runAsync(
      'UPDATE invoice_counter SET last_number = ?, last_date = ? WHERE id = 1',
      [nextNumber, today]
    );

    return `INV-${today}-${String(nextNumber).padStart(4, '0')}`;
  });
}

// ─── Products ────────────────────────────────────────────────────────────────

function rowToProduct(row: Record<string, unknown>): Product {
  return {
    id: row.id as number,
    name: row.name as string,
    category: row.category as string,
    itemId: row.item_id as string | null,
    idMode: row.id_mode as IdMode,
    purchasePrice: row.purchase_price as number,
    sellingPrice: row.selling_price as number,
    quantity: row.quantity as number,
    unit: row.unit as string,
    description: row.description as string | null,
    isActive: (row.is_active as number) === 1,
    imageUri: (row.image_uri as string | null) ?? null,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

export async function getAllProducts(): Promise<Product[]> {
  const database = await getDatabase();
  const rows = await database.getAllAsync<Record<string, unknown>>(
    'SELECT * FROM products ORDER BY name ASC'
  );
  return rows.map(rowToProduct);
}

export async function getProductById(id: number): Promise<Product | null> {
  const database = await getDatabase();
  const row = await database.getFirstAsync<Record<string, unknown>>(
    'SELECT * FROM products WHERE id = ?', [id]
  );
  return row ? rowToProduct(row) : null;
}

export async function searchProducts(query: string, category?: string): Promise<Product[]> {
  const database = await getDatabase();
  const q = `%${query}%`;

  if (category && category !== 'all') {
    const rows = await database.getAllAsync<Record<string, unknown>>(
      `SELECT * FROM products
       WHERE (name LIKE ? OR item_id LIKE ?) AND category = ?
       ORDER BY name ASC`,
      [q, q, category]
    );
    return rows.map(rowToProduct);
  }

  const rows = await database.getAllAsync<Record<string, unknown>>(
    'SELECT * FROM products WHERE name LIKE ? OR item_id LIKE ? ORDER BY name ASC',
    [q, q]
  );
  return rows.map(rowToProduct);
}

export async function getProductCategories(): Promise<string[]> {
  const database = await getDatabase();
  const rows = await database.getAllAsync<{ category: string }>(
    'SELECT DISTINCT category FROM products ORDER BY category ASC'
  );
  return rows.map((r) => r.category);
}

// ─── Inventory Products ───────────────────────────────────────────────────────

function rowToInventoryProduct(row: Record<string, unknown>): InventoryProduct {
  return {
    id: row.id as number,
    name: row.name as string,
    category: row.category as string,
    itemId: row.item_id as string | null,
    idMode: row.id_mode as IdMode,
    purchasePrice: row.purchase_price as number,
    sellingPrice: row.selling_price as number,
    quantity: row.quantity as number,
    unit: row.unit as string,
    description: row.description as string | null,
    isActive: (row.is_active as number) === 1,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
    purchaseId: (row.purchase_id as number | null) ?? null,
    supplierName: (row.supplier_name as string | null) ?? null,
    supplierPhone: (row.supplier_phone as string | null) ?? null,
    supplierAddress: (row.supplier_address as string | null) ?? null,
    purchaseDate: (row.purchase_date as string | null) ?? null,
    paymentStatus: ((row.payment_status as string) ?? 'paid') as 'paid' | 'debt',
    warranty: (row.warranty as string | null) ?? null,
    imageUri: (row.image_uri as string | null) ?? null,
    buyPriceUsd: (row.buy_price_usd as number) ?? 0,
    sellPriceUsd: (row.sell_price_usd as number) ?? 0,
  };
}

export async function insertProduct(data: NewProductData): Promise<number> {
  const database = await getDatabase();
  const result = await database.runAsync(
    `INSERT INTO products (
      name, category, item_id, id_mode,
      purchase_price, selling_price, quantity, unit, description, is_active,
      purchase_id, supplier_name, supplier_phone, supplier_address, purchase_date,
      payment_status, warranty, image_uri, buy_price_usd, sell_price_usd
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      data.name,
      data.category,
      data.itemId ?? null,
      data.idMode,
      data.purchasePrice,
      data.sellingPrice,
      data.quantity,
      data.unit,
      data.description ?? null,
      data.isActive ? 1 : 0,
      data.purchaseId ?? null,
      data.supplierName ?? null,
      data.supplierPhone ?? null,
      data.supplierAddress ?? null,
      data.purchaseDate ?? null,
      data.paymentStatus,
      data.warranty ?? null,
      data.imageUri ?? null,
      data.buyPriceUsd,
      data.sellPriceUsd,
    ]
  );
  return result.lastInsertRowId;
}

export async function updateProduct(id: number, data: Partial<NewProductData>): Promise<void> {
  const database = await getDatabase();
  const fields: string[] = [];
  const values: unknown[] = [];

  if (data.name !== undefined)           { fields.push('name = ?');            values.push(data.name); }
  if (data.category !== undefined)       { fields.push('category = ?');        values.push(data.category); }
  if (data.itemId !== undefined)         { fields.push('item_id = ?');          values.push(data.itemId); }
  if (data.idMode !== undefined)         { fields.push('id_mode = ?');          values.push(data.idMode); }
  if (data.purchasePrice !== undefined)  { fields.push('purchase_price = ?');   values.push(data.purchasePrice); }
  if (data.buyPriceUsd !== undefined)    { fields.push('buy_price_usd = ?');    values.push(data.buyPriceUsd); }
  if (data.sellingPrice !== undefined)   { fields.push('selling_price = ?');    values.push(data.sellingPrice); }
  if (data.sellPriceUsd !== undefined)   { fields.push('sell_price_usd = ?');   values.push(data.sellPriceUsd); }
  if (data.quantity !== undefined)       { fields.push('quantity = ?');         values.push(data.quantity); }
  if (data.unit !== undefined)           { fields.push('unit = ?');             values.push(data.unit); }
  if (data.description !== undefined)    { fields.push('description = ?');      values.push(data.description); }
  if (data.warranty !== undefined)       { fields.push('warranty = ?');         values.push(data.warranty); }
  if (data.imageUri !== undefined)       { fields.push('image_uri = ?');        values.push(data.imageUri); }
  if (data.paymentStatus !== undefined)  { fields.push('payment_status = ?');   values.push(data.paymentStatus); }
  if (data.supplierName !== undefined)   { fields.push('supplier_name = ?');    values.push(data.supplierName); }
  if (data.supplierPhone !== undefined)  { fields.push('supplier_phone = ?');   values.push(data.supplierPhone); }
  if (data.supplierAddress !== undefined){ fields.push('supplier_address = ?'); values.push(data.supplierAddress); }

  if (fields.length === 0) return;
  fields.push('updated_at = CURRENT_TIMESTAMP');
  values.push(id);

  await database.runAsync(
    `UPDATE products SET ${fields.join(', ')} WHERE id = ?`,
    values as SQLite.SQLiteBindValue[]
  );
}

export async function deleteProduct(id: number): Promise<void> {
  const database = await getDatabase();
  await database.runAsync('DELETE FROM products WHERE id = ?', [id]);
}

export async function deleteProductsByPurchaseId(purchaseId: number): Promise<void> {
  const database = await getDatabase();
  await database.runAsync('DELETE FROM products WHERE purchase_id = ?', [purchaseId]);
}

export async function getAllInventoryProducts(): Promise<InventoryProduct[]> {
  const database = await getDatabase();
  const rows = await database.getAllAsync<Record<string, unknown>>(
    'SELECT * FROM products ORDER BY created_at DESC'
  );
  return rows.map(rowToInventoryProduct);
}

export async function getInventoryProductById(id: number): Promise<InventoryProduct | null> {
  const database = await getDatabase();
  const row = await database.getFirstAsync<Record<string, unknown>>(
    'SELECT * FROM products WHERE id = ?', [id]
  );
  return row ? rowToInventoryProduct(row) : null;
}

export async function getInventoryStats(): Promise<InventoryStats> {
  const database = await getDatabase();
  const row = await database.getFirstAsync<{
    totalProducts: number;
    totalQuantity: number;
    totalValueIQD: number;
    lowStockCount: number;
    paidCount: number;
    debtCount: number;
  }>(`
    SELECT
      COUNT(CASE WHEN is_active = 1 THEN 1 END)                   AS totalProducts,
      COALESCE(SUM(CASE WHEN is_active = 1 THEN quantity END), 0)  AS totalQuantity,
      COALESCE(SUM(CASE WHEN is_active = 1 THEN quantity * purchase_price END), 0) AS totalValueIQD,
      COUNT(CASE WHEN is_active = 1 AND quantity <= 3 THEN 1 END)  AS lowStockCount,
      COUNT(CASE WHEN payment_status = 'paid' THEN 1 END)          AS paidCount,
      COUNT(CASE WHEN payment_status = 'debt' THEN 1 END)          AS debtCount
    FROM products
  `);
  return row ?? { totalProducts: 0, totalQuantity: 0, totalValueIQD: 0, lowStockCount: 0, paidCount: 0, debtCount: 0 };
}

export async function getSalesByProductId(productId: number): Promise<Array<SaleItem & { invoiceNumber: string; saleCreatedAt: string }>> {
  const database = await getDatabase();
  const rows = await database.getAllAsync<Record<string, unknown>>(
    `SELECT si.*, s.invoice_number, s.created_at AS sale_created_at
     FROM sale_items si
     JOIN sales s ON si.sale_id = s.id
     WHERE si.product_id = ?
     ORDER BY s.created_at DESC`,
    [productId]
  );
  return rows.map((row) => ({
    id: row.id as number,
    saleId: row.sale_id as number,
    productId: row.product_id as number,
    productName: row.product_name as string,
    itemId: row.item_id as string | null,
    idMode: row.id_mode as IdMode,
    purchasePrice: row.purchase_price as number,
    sellingPrice: row.selling_price as number,
    quantity: row.quantity as number,
    discount: row.discount as number,
    lineTotal: row.line_total as number,
    invoiceNumber: row.invoice_number as string,
    saleCreatedAt: row.sale_created_at as string,
  }));
}

export async function reduceProductQuantity(id: number, delta: number): Promise<void> {
  const database = await getDatabase();
  await database.runAsync(
    'UPDATE products SET quantity = MAX(0, quantity - ?), updated_at = CURRENT_TIMESTAMP WHERE id = ?',
    [delta, id]
  );
}

export async function restoreProductQuantity(id: number, delta: number): Promise<void> {
  const database = await getDatabase();
  await database.runAsync(
    'UPDATE products SET quantity = quantity + ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
    [delta, id]
  );
}

export async function markUniqueItemSold(id: number): Promise<void> {
  const database = await getDatabase();
  await database.runAsync(
    'UPDATE products SET quantity = 0, is_active = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
    [id]
  );
}

export async function restoreUniqueItem(id: number): Promise<void> {
  const database = await getDatabase();
  await database.runAsync(
    'UPDATE products SET quantity = 1, is_active = 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
    [id]
  );
}

// ─── Customers ───────────────────────────────────────────────────────────────

export async function upsertCustomer(input: {
  name: string;
  phone: string;
  address?: string;
}): Promise<number> {
  const database = await getDatabase();

  const existing = await database.getFirstAsync<{ id: number }>(
    'SELECT id FROM customers WHERE name = ? AND phone = ?',
    [input.name, input.phone]
  );

  if (existing) return existing.id;

  const result = await database.runAsync(
    'INSERT INTO customers (name, phone, address) VALUES (?, ?, ?)',
    [input.name, input.phone, input.address ?? null]
  );
  return result.lastInsertRowId;
}

// ─── Customer Management ─────────────────────────────────────────────────────

function rowToCustomerWithStats(row: Record<string, unknown>): CustomerWithStats {
  return {
    id: row.id as number,
    name: row.name as string,
    phone: (row.phone as string | null) ?? null,
    address: (row.address as string | null) ?? null,
    totalPurchases: (row.total_purchases as number) ?? 0,
    notes: (row.notes as string | null) ?? null,
    createdAt: row.created_at as string,
    updatedAt: (row.updated_at as string) ?? row.created_at as string,
    saleCount: (row.sale_count as number) ?? 0,
    remainingDebt: (row.remaining_debt as number) ?? 0,
    lastPurchaseDate: (row.last_purchase_date as string | null) ?? null,
  };
}

const CUSTOMER_STATS_QUERY = `
  SELECT c.*,
    COUNT(DISTINCT s.id) AS sale_count,
    COALESCE(SUM(CASE WHEN d.status = 'active' THEN d.remaining_amount ELSE 0 END), 0) AS remaining_debt,
    MAX(s.created_at) AS last_purchase_date
  FROM customers c
  LEFT JOIN sales s ON s.customer_id = c.id
  LEFT JOIN debts d ON d.sale_id = s.id
  GROUP BY c.id
`;

export async function getAllCustomersWithStats(): Promise<CustomerWithStats[]> {
  const database = await getDatabase();
  const rows = await database.getAllAsync<Record<string, unknown>>(
    `${CUSTOMER_STATS_QUERY} ORDER BY c.total_purchases DESC`
  );
  return rows.map(rowToCustomerWithStats);
}

export async function getCustomerByIdWithStats(id: number): Promise<CustomerWithStats | null> {
  const database = await getDatabase();
  const row = await database.getFirstAsync<Record<string, unknown>>(
    `${CUSTOMER_STATS_QUERY} HAVING c.id = ?`,
    [id]
  );
  return row ? rowToCustomerWithStats(row) : null;
}

export async function getCustomerByPhone(phone: string): Promise<Customer | null> {
  const database = await getDatabase();
  const row = await database.getFirstAsync<Record<string, unknown>>(
    'SELECT * FROM customers WHERE phone = ? LIMIT 1',
    [phone]
  );
  if (!row) return null;
  return {
    id: row.id as number,
    name: row.name as string,
    phone: (row.phone as string | null) ?? null,
    address: (row.address as string | null) ?? null,
    totalPurchases: (row.total_purchases as number) ?? 0,
    notes: (row.notes as string | null) ?? null,
    createdAt: row.created_at as string,
    updatedAt: (row.updated_at as string) ?? row.created_at as string,
  };
}

export async function searchCustomersWithStats(query: string): Promise<CustomerWithStats[]> {
  const database = await getDatabase();
  const q = `%${query}%`;
  const rows = await database.getAllAsync<Record<string, unknown>>(
    `${CUSTOMER_STATS_QUERY} HAVING c.name LIKE ? OR c.phone LIKE ? ORDER BY c.total_purchases DESC`,
    [q, q]
  );
  return rows.map(rowToCustomerWithStats);
}

export async function updateCustomer(
  id: number,
  data: Partial<{ name: string; phone: string; address: string; notes: string }>
): Promise<void> {
  const database = await getDatabase();
  const fields: string[] = [];
  const values: unknown[] = [];

  if (data.name    !== undefined) { fields.push('name = ?');    values.push(data.name); }
  if (data.phone   !== undefined) { fields.push('phone = ?');   values.push(data.phone); }
  if (data.address !== undefined) { fields.push('address = ?'); values.push(data.address); }
  if (data.notes   !== undefined) { fields.push('notes = ?');   values.push(data.notes); }
  if (fields.length === 0) return;

  fields.push('updated_at = CURRENT_TIMESTAMP');
  values.push(id);
  await database.runAsync(
    `UPDATE customers SET ${fields.join(', ')} WHERE id = ?`,
    values as SQLite.SQLiteBindValue[]
  );
}

export async function getSalesByCustomerId(customerId: number): Promise<Sale[]> {
  const database = await getDatabase();
  const rows = await database.getAllAsync<Record<string, unknown>>(
    'SELECT * FROM sales WHERE customer_id = ? ORDER BY created_at DESC',
    [customerId]
  );
  const sales = rows.map(rowToSale);
  for (const sale of sales) {
    const itemRows = await database.getAllAsync<Record<string, unknown>>(
      'SELECT * FROM sale_items WHERE sale_id = ?', [sale.id]
    );
    sale.items = itemRows.map(rowToSaleItem);
  }
  return sales;
}

export async function getDebtsByCustomerId(customerId: number): Promise<Debt[]> {
  const database = await getDatabase();
  const rows = await database.getAllAsync<Record<string, unknown>>(
    `SELECT d.* FROM debts d
     JOIN sales s ON d.sale_id = s.id
     WHERE s.customer_id = ?
     ORDER BY d.created_at DESC`,
    [customerId]
  );
  return rows.map((row) => ({
    id: row.id as number,
    saleId: row.sale_id as number,
    customerName: row.customer_name as string,
    customerPhone: (row.customer_phone as string | null) ?? null,
    originalAmount: row.original_amount as number,
    paidAmount: row.paid_amount as number,
    remainingAmount: row.remaining_amount as number,
    status: row.status as 'active' | 'settled',
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  }));
}

export async function addPaymentToDebt(debtId: number, amount: number): Promise<void> {
  const database = await getDatabase();
  await database.withTransactionAsync(async () => {
    const debt = await database.getFirstAsync<{ sale_id: number; remaining_amount: number }>(
      'SELECT sale_id, remaining_amount FROM debts WHERE id = ?', [debtId]
    );
    if (!debt) return;

    const clamped = Math.min(amount, debt.remaining_amount);
    const newRemaining = Math.max(0, debt.remaining_amount - clamped);

    await database.runAsync(
      `UPDATE debts SET
        paid_amount = paid_amount + ?,
        remaining_amount = ?,
        status = CASE WHEN ? <= 0 THEN 'settled' ELSE 'active' END,
        last_payment_at = CURRENT_TIMESTAMP,
        updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [clamped, newRemaining, newRemaining, debtId]
    );

    await database.runAsync(
      `UPDATE sales SET
        paid_amount = paid_amount + ?,
        remaining_debt = MAX(0, remaining_debt - ?),
        updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [clamped, clamped, debt.sale_id]
    );

    await database.runAsync(
      `INSERT INTO debt_payments (debt_id, debt_type, amount, remaining_after)
       VALUES (?, 'sales', ?, ?)`,
      [debtId, clamped, newRemaining]
    );
  });
}

export async function updateSaleInfo(id: number, data: UpdateSaleInput): Promise<void> {
  const database = await getDatabase();
  await database.withTransactionAsync(async () => {
    const sale = await database.getFirstAsync<{
      customer_id: number; grand_total: number; remaining_debt: number; discount_total: number;
    }>('SELECT customer_id, grand_total, remaining_debt, discount_total FROM sales WHERE id = ?', [id]);
    if (!sale) return;

    const fields: string[] = [];
    const values: unknown[] = [];

    if (data.customerName !== undefined)    { fields.push('customer_name = ?');    values.push(data.customerName); }
    if (data.customerPhone !== undefined)   { fields.push('customer_phone = ?');   values.push(data.customerPhone); }
    if (data.customerAddress !== undefined) { fields.push('customer_address = ?'); values.push(data.customerAddress); }
    if (data.warranty !== undefined)        { fields.push('warranty = ?');         values.push(data.warranty); }
    if (data.notes !== undefined)           { fields.push('notes = ?');            values.push(data.notes); }

    let newGrandTotal = sale.grand_total;
    let newRemaining = sale.remaining_debt;

    if (data.discountDelta && data.discountDelta > 0) {
      newGrandTotal = Math.max(0, sale.grand_total - data.discountDelta);
      newRemaining  = Math.max(0, sale.remaining_debt - data.discountDelta);
      fields.push('discount_total = ?', 'grand_total = ?', 'remaining_debt = ?');
      values.push(sale.discount_total + data.discountDelta, newGrandTotal, newRemaining);

      // Sync customer total_purchases
      if (sale.customer_id) {
        await database.runAsync(
          'UPDATE customers SET total_purchases = total_purchases - ? + ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
          [sale.grand_total, newGrandTotal, sale.customer_id]
        );
      }

      // Sync debt record
      const debt = await database.getFirstAsync<{ id: number; remaining_amount: number }>(
        'SELECT id, remaining_amount FROM debts WHERE sale_id = ?', [id]
      );
      if (debt) {
        const newDebtRemaining = Math.max(0, debt.remaining_amount - data.discountDelta);
        await database.runAsync(
          `UPDATE debts SET
            remaining_amount = ?,
            status = CASE WHEN ? <= 0 THEN 'settled' ELSE 'active' END,
            updated_at = CURRENT_TIMESTAMP
           WHERE id = ?`,
          [newDebtRemaining, newDebtRemaining, debt.id]
        );
      }
    }

    if (data.extraPayment && data.extraPayment > 0) {
      const clamped = Math.min(data.extraPayment, newRemaining);
      newRemaining = Math.max(0, newRemaining - clamped);
      fields.push('paid_amount = paid_amount + ?', 'remaining_debt = ?');
      values.push(clamped, newRemaining);

      const debt = await database.getFirstAsync<{ id: number; remaining_amount: number }>(
        'SELECT id, remaining_amount FROM debts WHERE sale_id = ?', [id]
      );
      if (debt) {
        const newDebtRemaining = Math.max(0, debt.remaining_amount - clamped);
        await database.runAsync(
          `UPDATE debts SET
            paid_amount = paid_amount + ?,
            remaining_amount = ?,
            status = CASE WHEN ? <= 0 THEN 'settled' ELSE 'active' END,
            updated_at = CURRENT_TIMESTAMP
           WHERE id = ?`,
          [clamped, newDebtRemaining, newDebtRemaining, debt.id]
        );
      }
    }

    if (fields.length > 0) {
      fields.push('updated_at = CURRENT_TIMESTAMP');
      values.push(id);
      await database.runAsync(
        `UPDATE sales SET ${fields.join(', ')} WHERE id = ?`,
        values as SQLite.SQLiteBindValue[]
      );
    }
  });
}

// ─── Sales ───────────────────────────────────────────────────────────────────

function rowToSale(row: Record<string, unknown>): Sale {
  return {
    id: row.id as number,
    invoiceNumber: row.invoice_number as string,
    customerId: row.customer_id as number | null,
    customerName: row.customer_name as string | null,
    customerPhone: row.customer_phone as string | null,
    customerAddress: row.customer_address as string | null,
    warranty: row.warranty as string | null,
    notes: row.notes as string | null,
    paymentMethod: row.payment_method as PaymentMethod,
    subtotal: row.subtotal as number,
    discountTotal: row.discount_total as number,
    grandTotal: row.grand_total as number,
    paidAmount: row.paid_amount as number,
    remainingDebt: row.remaining_debt as number,
    status: row.status as SaleStatus,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

function rowToSaleItem(row: Record<string, unknown>): SaleItem {
  return {
    id: row.id as number,
    saleId: row.sale_id as number,
    productId: row.product_id as number,
    productName: row.product_name as string,
    itemId: row.item_id as string | null,
    idMode: row.id_mode as IdMode,
    purchasePrice: row.purchase_price as number,
    sellingPrice: row.selling_price as number,
    quantity: row.quantity as number,
    discount: row.discount as number,
    lineTotal: row.line_total as number,
  };
}

export async function insertSale(
  saleData: Omit<Sale, 'id' | 'createdAt' | 'updatedAt' | 'items'>,
  items: Omit<SaleItem, 'id' | 'saleId'>[]
): Promise<number> {
  const database = await getDatabase();

  return database.withTransactionAsync(async () => {
    const saleResult = await database.runAsync(
      `INSERT INTO sales (
        invoice_number, customer_id, customer_name, customer_phone,
        customer_address, warranty, notes, payment_method,
        subtotal, discount_total, grand_total, paid_amount, remaining_debt, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        saleData.invoiceNumber,
        saleData.customerId ?? null,
        saleData.customerName ?? null,
        saleData.customerPhone ?? null,
        saleData.customerAddress ?? null,
        saleData.warranty ?? null,
        saleData.notes ?? null,
        saleData.paymentMethod,
        saleData.subtotal,
        saleData.discountTotal,
        saleData.grandTotal,
        saleData.paidAmount,
        saleData.remainingDebt,
        saleData.status,
      ]
    );

    const saleId = saleResult.lastInsertRowId;

    for (const item of items) {
      await database.runAsync(
        `INSERT INTO sale_items (
          sale_id, product_id, product_name, item_id, id_mode,
          purchase_price, selling_price, quantity, discount, line_total
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          saleId,
          item.productId,
          item.productName,
          item.itemId ?? null,
          item.idMode,
          item.purchasePrice,
          item.sellingPrice,
          item.quantity,
          item.discount,
          item.lineTotal,
        ]
      );

      if (item.idMode === 'unique') {
        await database.runAsync(
          'UPDATE products SET quantity = 0, is_active = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
          [item.productId]
        );
      } else {
        await database.runAsync(
          'UPDATE products SET quantity = MAX(0, quantity - ?), updated_at = CURRENT_TIMESTAMP WHERE id = ?',
          [item.quantity, item.productId]
        );
      }
    }

    if (saleData.remainingDebt > 0) {
      await database.runAsync(
        `INSERT INTO debts (
          sale_id, customer_name, customer_phone,
          original_amount, paid_amount, remaining_amount, status
        ) VALUES (?, ?, ?, ?, ?, ?, 'active')`,
        [
          saleId,
          saleData.customerName ?? 'Unknown',
          saleData.customerPhone ?? null,
          saleData.grandTotal,
          saleData.paidAmount,
          saleData.remainingDebt,
        ]
      );
    }

    if (saleData.customerId) {
      await database.runAsync(
        'UPDATE customers SET total_purchases = total_purchases + ? WHERE id = ?',
        [saleData.grandTotal, saleData.customerId]
      );
    }

    return saleId;
  });
}

export async function getAllSales(): Promise<Sale[]> {
  const database = await getDatabase();
  const rows = await database.getAllAsync<Record<string, unknown>>(
    'SELECT * FROM sales ORDER BY created_at DESC'
  );
  return rows.map(rowToSale);
}

export async function getSaleById(id: number): Promise<Sale | null> {
  const database = await getDatabase();
  const row = await database.getFirstAsync<Record<string, unknown>>(
    'SELECT * FROM sales WHERE id = ?', [id]
  );
  if (!row) return null;

  const sale = rowToSale(row);
  const itemRows = await database.getAllAsync<Record<string, unknown>>(
    'SELECT * FROM sale_items WHERE sale_id = ?', [id]
  );
  sale.items = itemRows.map(rowToSaleItem);
  return sale;
}

export async function searchSales(query: string): Promise<Sale[]> {
  const database = await getDatabase();
  const q = `%${query}%`;
  const rows = await database.getAllAsync<Record<string, unknown>>(
    `SELECT * FROM sales
     WHERE invoice_number LIKE ? OR customer_name LIKE ?
     ORDER BY created_at DESC`,
    [q, q]
  );
  return rows.map(rowToSale);
}

export async function deleteSale(id: number): Promise<void> {
  const database = await getDatabase();

  await database.withTransactionAsync(async () => {
    const itemRows = await database.getAllAsync<Record<string, unknown>>(
      'SELECT * FROM sale_items WHERE sale_id = ?', [id]
    );

    for (const row of itemRows) {
      const item = rowToSaleItem(row);
      if (item.idMode === 'unique') {
        await database.runAsync(
          'UPDATE products SET quantity = 1, is_active = 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
          [item.productId]
        );
      } else {
        await database.runAsync(
          'UPDATE products SET quantity = quantity + ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
          [item.quantity, item.productId]
        );
      }
    }

    await database.runAsync('DELETE FROM sales WHERE id = ?', [id]);
  });
}

// ─── Purchases ────────────────────────────────────────────────────────────────

export async function generatePurchaseNumber(): Promise<string> {
  const database = await getDatabase();

  return database.withTransactionAsync(async () => {
    const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const row = await database.getFirstAsync<{ last_number: number; last_date: string }>(
      'SELECT last_number, last_date FROM purchase_counter WHERE id = 1'
    );

    const nextNumber = row && row.last_date === today ? row.last_number + 1 : 1;

    await database.runAsync(
      'UPDATE purchase_counter SET last_number = ?, last_date = ? WHERE id = 1',
      [nextNumber, today]
    );

    return `PUR-${today}-${String(nextNumber).padStart(4, '0')}`;
  });
}

function rowToPurchase(row: Record<string, unknown>): Purchase {
  let itemIds: string[] = [];
  try {
    itemIds = JSON.parse(row.item_ids as string) as string[];
  } catch {
    itemIds = [];
  }
  return {
    id: row.id as number,
    purchaseNumber: row.purchase_number as string,
    date: row.date as string,
    supplierName: row.supplier_name as string | null,
    supplierPhone: row.supplier_phone as string | null,
    supplierAddress: row.supplier_address as string | null,
    productName: row.product_name as string,
    category: row.category as string | null,
    quantity: row.quantity as number,
    buyPriceIQD: row.buy_price_iqd as number,
    buyPriceUSD: row.buy_price_usd as number,
    sellPriceIQD: row.sell_price_iqd as number,
    sellPriceUSD: row.sell_price_usd as number,
    totalIQD:     row.total_iqd as number,
    profitIQD:    row.profit_iqd as number,
    exchangeRate: (row.exchange_rate as number) ?? 1310,
    idType: (row.id_type as PurchaseIdType) ?? null,
    itemIds,
    warranty: row.warranty as string | null,
    description: row.description as string | null,
    notes: row.notes as string | null,
    paymentStatus: row.payment_status as PurchasePaymentStatus,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

export async function insertPurchase(
  data: Omit<Purchase, 'id' | 'createdAt' | 'updatedAt'>
): Promise<number> {
  const database = await getDatabase();
  const result = await database.runAsync(
    `INSERT INTO purchases (
      purchase_number, date, supplier_name, supplier_phone, supplier_address,
      product_name, category, quantity,
      buy_price_iqd, buy_price_usd, sell_price_iqd, sell_price_usd,
      total_iqd, profit_iqd, exchange_rate, id_type, item_ids,
      warranty, description, notes, payment_status
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      data.purchaseNumber,
      data.date,
      data.supplierName ?? null,
      data.supplierPhone ?? null,
      data.supplierAddress ?? null,
      data.productName,
      data.category ?? null,
      data.quantity,
      data.buyPriceIQD,
      data.buyPriceUSD,
      data.sellPriceIQD,
      data.sellPriceUSD,
      data.totalIQD,
      data.profitIQD,
      data.exchangeRate,
      data.idType ?? null,
      JSON.stringify(data.itemIds),
      data.warranty ?? null,
      data.description ?? null,
      data.notes ?? null,
      data.paymentStatus,
    ]
  );
  return result.lastInsertRowId;
}

export async function getAllPurchases(): Promise<Purchase[]> {
  const database = await getDatabase();
  const rows = await database.getAllAsync<Record<string, unknown>>(
    'SELECT * FROM purchases ORDER BY created_at DESC'
  );
  return rows.map(rowToPurchase);
}

export async function getPurchaseById(id: number): Promise<Purchase | null> {
  const database = await getDatabase();
  const row = await database.getFirstAsync<Record<string, unknown>>(
    'SELECT * FROM purchases WHERE id = ?', [id]
  );
  return row ? rowToPurchase(row) : null;
}

export async function deletePurchase(id: number): Promise<void> {
  const database = await getDatabase();
  await database.runAsync('DELETE FROM purchase_debts WHERE purchase_id = ?', [id]);
  await database.runAsync('DELETE FROM products WHERE purchase_id = ?', [id]);
  await database.runAsync('DELETE FROM purchases WHERE id = ?', [id]);
}

// ─── Debt Management ──────────────────────────────────────────────────────────

export interface DebtWithContext extends Debt {
  invoiceNumber: string;
  saleGrandTotal: number;
}

export async function getAllActiveDebts(): Promise<DebtWithContext[]> {
  const database = await getDatabase();
  const rows = await database.getAllAsync<Record<string, unknown>>(
    `SELECT d.*, s.invoice_number, s.grand_total AS sale_grand_total
     FROM debts d
     JOIN sales s ON d.sale_id = s.id
     WHERE d.status = 'active' AND d.remaining_amount > 0
     ORDER BY d.created_at DESC`
  );
  return rows.map((row) => ({
    id:              row.id as number,
    saleId:          row.sale_id as number,
    customerName:    row.customer_name as string,
    customerPhone:   (row.customer_phone as string | null) ?? null,
    originalAmount:  row.original_amount as number,
    paidAmount:      row.paid_amount as number,
    remainingAmount: row.remaining_amount as number,
    status:          row.status as 'active' | 'settled',
    createdAt:       row.created_at as string,
    updatedAt:       row.updated_at as string,
    invoiceNumber:   row.invoice_number as string,
    saleGrandTotal:  row.sale_grand_total as number,
  }));
}

export async function getDebtSummary(): Promise<{
  totalActive: number;
  totalRemaining: number;
  totalSettled: number;
}> {
  const database = await getDatabase();
  const row = await database.getFirstAsync<{
    total_active: number;
    total_remaining: number;
    total_settled: number;
  }>(
    `SELECT
      COUNT(CASE WHEN status='active' THEN 1 END) AS total_active,
      COALESCE(SUM(CASE WHEN status='active' THEN remaining_amount END), 0) AS total_remaining,
      COUNT(CASE WHEN status='settled' THEN 1 END) AS total_settled
     FROM debts`
  );
  return {
    totalActive:    row?.total_active    ?? 0,
    totalRemaining: row?.total_remaining ?? 0,
    totalSettled:   row?.total_settled   ?? 0,
  };
}

// ─── Reports & Analytics ──────────────────────────────────────────────────────

export interface ReportSummary {
  totalRevenue:    number;
  totalProfit:     number;
  totalSales:      number;
  totalDebt:       number;
  avgOrderValue:   number;
}

export interface TopProduct {
  productName: string;
  totalQty:    number;
  totalRevenue: number;
}

export interface TopCustomer {
  name:            string;
  phone:           string | null;
  totalPurchases:  number;
  saleCount:       number;
}

export interface RevenuePoint {
  period: string;
  revenue: number;
  profit: number;
  sales: number;
}

export async function getReportSummary(from?: string, to?: string): Promise<ReportSummary> {
  const database = await getDatabase();
  const where = from && to
    ? `WHERE s.created_at >= '${from}' AND s.created_at <= '${to}'`
    : '';
  const row = await database.getFirstAsync<Record<string, number>>(
    `SELECT
      COALESCE(SUM(s.paid_amount), 0)                                            AS total_revenue,
      COALESCE(SUM((si.selling_price - si.purchase_price) * si.quantity), 0)    AS total_profit,
      COUNT(DISTINCT s.id)                                                        AS total_sales,
      COALESCE(SUM(CASE WHEN d.status='active' THEN d.remaining_amount END), 0) AS total_debt
     FROM sales s
     LEFT JOIN sale_items si ON si.sale_id = s.id
     LEFT JOIN debts d ON d.sale_id = s.id
     ${where}`
  );
  const rev   = row?.total_revenue ?? 0;
  const cnt   = row?.total_sales ?? 0;
  return {
    totalRevenue:  rev,
    totalProfit:   row?.total_profit ?? 0,
    totalSales:    cnt,
    totalDebt:     row?.total_debt ?? 0,
    avgOrderValue: cnt > 0 ? rev / cnt : 0,
  };
}

export async function getTopProducts(limit = 5, from?: string, to?: string): Promise<TopProduct[]> {
  const database = await getDatabase();
  const where = from && to
    ? `WHERE s.created_at >= '${from}' AND s.created_at <= '${to}'`
    : '';
  const rows = await database.getAllAsync<Record<string, unknown>>(
    `SELECT si.product_name, SUM(si.quantity) AS total_qty, SUM(si.line_total) AS total_revenue
     FROM sale_items si
     JOIN sales s ON si.sale_id = s.id
     ${where}
     GROUP BY si.product_name
     ORDER BY total_qty DESC
     LIMIT ?`,
    [limit]
  );
  return rows.map((r) => ({
    productName:  r.product_name as string,
    totalQty:     r.total_qty    as number,
    totalRevenue: r.total_revenue as number,
  }));
}

export async function getTopCustomers(limit = 5): Promise<TopCustomer[]> {
  const database = await getDatabase();
  const rows = await database.getAllAsync<Record<string, unknown>>(
    `SELECT c.name, c.phone, c.total_purchases, COUNT(s.id) AS sale_count
     FROM customers c
     LEFT JOIN sales s ON s.customer_id = c.id
     GROUP BY c.id
     ORDER BY c.total_purchases DESC
     LIMIT ?`,
    [limit]
  );
  return rows.map((r) => ({
    name:           r.name as string,
    phone:          (r.phone as string | null) ?? null,
    totalPurchases: r.total_purchases as number,
    saleCount:      r.sale_count as number,
  }));
}

export async function getRevenueByMonth(months = 6): Promise<RevenuePoint[]> {
  const database = await getDatabase();
  const rows = await database.getAllAsync<Record<string, unknown>>(
    `SELECT
       strftime('%Y-%m', s.created_at) AS period,
       COALESCE(SUM(s.paid_amount), 0) AS revenue,
       COALESCE(SUM((si.selling_price - si.purchase_price) * si.quantity), 0) AS profit,
       COUNT(DISTINCT s.id) AS sales
     FROM sales s
     LEFT JOIN sale_items si ON si.sale_id = s.id
     WHERE s.created_at >= date('now', '-${months} months')
     GROUP BY period
     ORDER BY period ASC`
  );
  return rows.map((r) => ({
    period:  r.period  as string,
    revenue: r.revenue as number,
    profit:  r.profit  as number,
    sales:   r.sales   as number,
  }));
}

// ─── Purchase Debts ───────────────────────────────────────────────────────────

export async function createPurchaseDebt(
  purchaseId: number,
  data: {
    supplierName: string;
    supplierPhone: string | null;
    supplierAddress: string | null;
    purchaseNumber: string;
    originalAmount: number;
    notes: string | null;
  }
): Promise<number> {
  const database = await getDatabase();
  const result = await database.runAsync(
    `INSERT INTO purchase_debts
       (purchase_id, supplier_name, supplier_phone, supplier_address, purchase_number,
        original_amount, remaining_amount, notes)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      purchaseId,
      data.supplierName,
      data.supplierPhone,
      data.supplierAddress,
      data.purchaseNumber,
      data.originalAmount,
      data.originalAmount,
      data.notes,
    ]
  );
  return result.lastInsertRowId;
}

function rowToPurchaseDebt(row: Record<string, unknown>): PurchaseDebt {
  return {
    id:              row.id as number,
    purchaseId:      (row.purchase_id as number | null) ?? null,
    purchaseNumber:  (row.purchase_number as string | null) ?? null,
    supplierName:    row.supplier_name as string,
    supplierPhone:   (row.supplier_phone as string | null) ?? null,
    supplierAddress: (row.supplier_address as string | null) ?? null,
    originalAmount:  row.original_amount as number,
    paidAmount:      row.paid_amount as number,
    remainingAmount: row.remaining_amount as number,
    status:          row.status as 'active' | 'settled',
    notes:           (row.notes as string | null) ?? null,
    lastPaymentAt:   (row.last_payment_at as string | null) ?? null,
    createdAt:       row.created_at as string,
    updatedAt:       row.updated_at as string,
  };
}

export async function getAllPurchaseDebts(): Promise<PurchaseDebt[]> {
  const database = await getDatabase();
  const rows = await database.getAllAsync<Record<string, unknown>>(
    `SELECT * FROM purchase_debts WHERE remaining_amount > 0 ORDER BY created_at DESC`
  );
  return rows.map(rowToPurchaseDebt);
}

export async function getPurchaseDebtById(id: number): Promise<PurchaseDebt | null> {
  const database = await getDatabase();
  const row = await database.getFirstAsync<Record<string, unknown>>(
    `SELECT * FROM purchase_debts WHERE id = ?`, [id]
  );
  return row ? rowToPurchaseDebt(row) : null;
}

export async function addPaymentToPurchaseDebt(id: number, amount: number): Promise<void> {
  const database = await getDatabase();
  await database.withTransactionAsync(async () => {
    const debt = await database.getFirstAsync<{ remaining_amount: number }>(
      'SELECT remaining_amount FROM purchase_debts WHERE id = ?', [id]
    );
    if (!debt) return;

    const clamped = Math.min(amount, debt.remaining_amount);
    const newRemaining = Math.max(0, debt.remaining_amount - clamped);

    await database.runAsync(
      `UPDATE purchase_debts SET
        paid_amount = paid_amount + ?,
        remaining_amount = ?,
        status = CASE WHEN ? <= 0 THEN 'settled' ELSE 'active' END,
        last_payment_at = CURRENT_TIMESTAMP,
        updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [clamped, newRemaining, newRemaining, id]
    );

    await database.runAsync(
      `INSERT INTO debt_payments (debt_id, debt_type, amount, remaining_after)
       VALUES (?, 'purchase', ?, ?)`,
      [id, clamped, newRemaining]
    );
  });
}

// ─── Sales Debts (Detailed) ───────────────────────────────────────────────────

function rowToSalesDebtDetail(row: Record<string, unknown>): SalesDebtDetail {
  return {
    id:              row.id as number,
    saleId:          row.sale_id as number,
    customerName:    row.customer_name as string,
    customerPhone:   (row.customer_phone as string | null) ?? null,
    originalAmount:  row.original_amount as number,
    paidAmount:      row.paid_amount as number,
    remainingAmount: row.remaining_amount as number,
    status:          row.status as 'active' | 'settled',
    lastPaymentAt:   (row.last_payment_at as string | null) ?? null,
    createdAt:       row.created_at as string,
    updatedAt:       row.updated_at as string,
    invoiceNumber:   row.invoice_number as string,
    customerAddress: (row.customer_address as string | null) ?? null,
    warranty:        (row.warranty as string | null) ?? null,
    saleNotes:       (row.sale_notes as string | null) ?? null,
  };
}

export async function getAllSalesDebtsDetailed(): Promise<SalesDebtDetail[]> {
  const database = await getDatabase();
  const rows = await database.getAllAsync<Record<string, unknown>>(
    `SELECT d.*, s.invoice_number, s.customer_address,
            s.warranty, s.notes AS sale_notes
     FROM debts d
     JOIN sales s ON d.sale_id = s.id
     WHERE d.remaining_amount > 0
     ORDER BY d.created_at DESC`
  );
  return rows.map(rowToSalesDebtDetail);
}

export async function getSalesDebtById(id: number): Promise<SalesDebtDetail | null> {
  const database = await getDatabase();
  const row = await database.getFirstAsync<Record<string, unknown>>(
    `SELECT d.*, s.invoice_number, s.customer_address,
            s.warranty, s.notes AS sale_notes
     FROM debts d
     JOIN sales s ON d.sale_id = s.id
     WHERE d.id = ?`,
    [id]
  );
  return row ? rowToSalesDebtDetail(row) : null;
}

// ─── Debt Payments History ────────────────────────────────────────────────────

export async function getDebtPayments(
  debtId: number,
  debtType: 'sales' | 'purchase'
): Promise<DebtPayment[]> {
  const database = await getDatabase();
  const rows = await database.getAllAsync<Record<string, unknown>>(
    `SELECT * FROM debt_payments
     WHERE debt_id = ? AND debt_type = ?
     ORDER BY created_at DESC`,
    [debtId, debtType]
  );
  return rows.map((row) => ({
    id:             row.id as number,
    debtId:         row.debt_id as number,
    debtType:       row.debt_type as 'sales' | 'purchase',
    amount:         row.amount as number,
    remainingAfter: row.remaining_after as number,
    note:           (row.note as string | null) ?? null,
    createdAt:      row.created_at as string,
  }));
}

// ─── Debt Overview Summary ────────────────────────────────────────────────────

export async function getDebtOverviewSummary(): Promise<DebtOverviewSummary> {
  const database = await getDatabase();

  const salesRow = await database.getFirstAsync<{ total: number; cnt: number }>(
    `SELECT COALESCE(SUM(remaining_amount), 0) AS total, COUNT(*) AS cnt
     FROM debts WHERE remaining_amount > 0`
  );

  const purchaseRow = await database.getFirstAsync<{ total: number; cnt: number }>(
    `SELECT COALESCE(SUM(remaining_amount), 0) AS total, COUNT(*) AS cnt
     FROM purchase_debts WHERE remaining_amount > 0`
  );

  // Count overdue: no payment in 30+ days
  const overdueRow = await database.getFirstAsync<{ cnt: number }>(
    `SELECT COUNT(*) AS cnt FROM (
       SELECT id FROM debts
       WHERE remaining_amount > 0
         AND (julianday('now') - julianday(COALESCE(last_payment_at, created_at))) > 30
       UNION ALL
       SELECT id FROM purchase_debts
       WHERE remaining_amount > 0
         AND (julianday('now') - julianday(COALESCE(last_payment_at, created_at))) > 30
     )`
  );

  return {
    totalSalesDebt:      salesRow?.total    ?? 0,
    totalPurchaseDebt:   purchaseRow?.total  ?? 0,
    activeSalesCount:    salesRow?.cnt       ?? 0,
    activePurchaseCount: purchaseRow?.cnt    ?? 0,
    overdueCount:        overdueRow?.cnt     ?? 0,
  };
}

// ─── Extended Report Functions ────────────────────────────────────────────────

export interface SalesReportData {
  totalRevenue: number;
  totalSales: number;
  totalItemsSold: number;
  totalDiscounts: number;
  cashRevenue: number;
  fibRevenue: number;
  debtRevenue: number;
  cashCount: number;
  fibCount: number;
  debtCount: number;
  avgOrderValue: number;
}

export async function getSalesReportData(from?: string, to?: string): Promise<SalesReportData> {
  const database = await getDatabase();
  const where = from && to
    ? `WHERE s.created_at >= '${from}' AND s.created_at <= '${to}'`
    : '';
  const row = await database.getFirstAsync<Record<string, number>>(`
    SELECT
      COALESCE(SUM(s.paid_amount), 0)                                              AS totalRevenue,
      COUNT(DISTINCT s.id)                                                          AS totalSales,
      COALESCE(SUM(si.quantity), 0)                                                 AS totalItemsSold,
      COALESCE(SUM(s.discount_total), 0)                                            AS totalDiscounts,
      COALESCE(SUM(CASE WHEN s.payment_method='cash' THEN s.paid_amount END), 0)   AS cashRevenue,
      COALESCE(SUM(CASE WHEN s.payment_method='fib'  THEN s.paid_amount END), 0)   AS fibRevenue,
      COALESCE(SUM(CASE WHEN s.payment_method='debt' THEN s.paid_amount END), 0)   AS debtRevenue,
      COUNT(CASE WHEN s.payment_method='cash' THEN 1 END)                          AS cashCount,
      COUNT(CASE WHEN s.payment_method='fib'  THEN 1 END)                          AS fibCount,
      COUNT(CASE WHEN s.payment_method='debt' THEN 1 END)                          AS debtCount
    FROM sales s
    LEFT JOIN sale_items si ON si.sale_id = s.id
    ${where}
  `);
  const rev = row?.totalRevenue ?? 0;
  const cnt = row?.totalSales ?? 0;
  return {
    totalRevenue:   rev,
    totalSales:     cnt,
    totalItemsSold: row?.totalItemsSold ?? 0,
    totalDiscounts: row?.totalDiscounts ?? 0,
    cashRevenue:    row?.cashRevenue    ?? 0,
    fibRevenue:     row?.fibRevenue     ?? 0,
    debtRevenue:    row?.debtRevenue    ?? 0,
    cashCount:      row?.cashCount      ?? 0,
    fibCount:       row?.fibCount       ?? 0,
    debtCount:      row?.debtCount      ?? 0,
    avgOrderValue:  cnt > 0 ? rev / cnt : 0,
  };
}

export interface PurchaseReportData {
  totalCost: number;
  totalPurchases: number;
  totalUnits: number;
  paidCost: number;
  debtCost: number;
  paidCount: number;
  debtCount: number;
  uniqueSuppliers: number;
  topSupplier: string | null;
  topSupplierCost: number;
}

export async function getPurchaseReportData(from?: string, to?: string): Promise<PurchaseReportData> {
  const database = await getDatabase();
  const where = from && to
    ? `WHERE created_at >= '${from}' AND created_at <= '${to}'`
    : '';
  const row = await database.getFirstAsync<Record<string, unknown>>(`
    SELECT
      COALESCE(SUM(total_iqd), 0)                                                AS totalCost,
      COUNT(*)                                                                    AS totalPurchases,
      COALESCE(SUM(quantity), 0)                                                  AS totalUnits,
      COALESCE(SUM(CASE WHEN payment_status='paid' THEN total_iqd END), 0)       AS paidCost,
      COALESCE(SUM(CASE WHEN payment_status='debt' THEN total_iqd END), 0)       AS debtCost,
      COUNT(CASE WHEN payment_status='paid' THEN 1 END)                          AS paidCount,
      COUNT(CASE WHEN payment_status='debt' THEN 1 END)                          AS debtCount,
      COUNT(DISTINCT supplier_name)                                               AS uniqueSuppliers
    FROM purchases ${where}
  `);
  const topRow = await database.getFirstAsync<{ supplier_name: string | null; supplier_cost: number }>(
    `SELECT supplier_name, SUM(total_iqd) AS supplier_cost
     FROM purchases ${where}
     GROUP BY supplier_name ORDER BY supplier_cost DESC LIMIT 1`
  );
  return {
    totalCost:       (row?.totalCost       as number) ?? 0,
    totalPurchases:  (row?.totalPurchases  as number) ?? 0,
    totalUnits:      (row?.totalUnits      as number) ?? 0,
    paidCost:        (row?.paidCost        as number) ?? 0,
    debtCost:        (row?.debtCost        as number) ?? 0,
    paidCount:       (row?.paidCount       as number) ?? 0,
    debtCount:       (row?.debtCount       as number) ?? 0,
    uniqueSuppliers: (row?.uniqueSuppliers as number) ?? 0,
    topSupplier:     topRow?.supplier_name ?? null,
    topSupplierCost: topRow?.supplier_cost ?? 0,
  };
}

export interface ProfitLossData {
  grossRevenue: number;
  totalCOGS: number;
  grossProfit: number;
  grossMarginPct: number;
  totalExpenses: number;
  netProfit: number;
  netMarginPct: number;
  expenseBreakdown: { category: string; total: number }[];
}

export async function getProfitLossData(from?: string, to?: string): Promise<ProfitLossData> {
  const database = await getDatabase();
  const saleWhere = from && to
    ? `WHERE s.created_at >= '${from}' AND s.created_at <= '${to}'`
    : '';
  const expWhere = from && to
    ? `WHERE date >= '${from.slice(0, 10)}' AND date <= '${to.slice(0, 10)}'`
    : '';

  const salesRow = await database.getFirstAsync<Record<string, number>>(`
    SELECT
      COALESCE(SUM(s.paid_amount), 0)                          AS grossRevenue,
      COALESCE(SUM(si.purchase_price * si.quantity), 0)        AS totalCOGS
    FROM sales s
    LEFT JOIN sale_items si ON si.sale_id = s.id
    ${saleWhere}
  `);
  const expRow = await database.getFirstAsync<{ total: number }>(
    `SELECT COALESCE(SUM(amount), 0) AS total FROM expenses ${expWhere}`
  );
  const expBreakdown = await database.getAllAsync<{ category: string; total: number }>(
    `SELECT category, COALESCE(SUM(amount), 0) AS total
     FROM expenses ${expWhere}
     GROUP BY category ORDER BY total DESC`
  );

  const grossRevenue = salesRow?.grossRevenue ?? 0;
  const totalCOGS    = salesRow?.totalCOGS    ?? 0;
  const grossProfit  = grossRevenue - totalCOGS;
  const totalExpenses = expRow?.total ?? 0;
  const netProfit    = grossProfit - totalExpenses;

  return {
    grossRevenue,
    totalCOGS,
    grossProfit,
    grossMarginPct: grossRevenue > 0 ? (grossProfit / grossRevenue) * 100 : 0,
    totalExpenses,
    netProfit,
    netMarginPct: grossRevenue > 0 ? (netProfit / grossRevenue) * 100 : 0,
    expenseBreakdown: expBreakdown,
  };
}

export interface InventoryReportSummary {
  totalProducts: number;
  activeProducts: number;
  totalStockUnits: number;
  stockValueCost: number;
  stockValueSell: number;
  potentialProfit: number;
  outOfStockCount: number;
  lowStockCount: number;
  categoryCounts: { category: string; count: number; value: number }[];
}

export async function getInventoryReportSummary(): Promise<InventoryReportSummary> {
  const database = await getDatabase();
  const row = await database.getFirstAsync<Record<string, number>>(`
    SELECT
      COUNT(*)                                                                          AS totalProducts,
      COUNT(CASE WHEN is_active=1 THEN 1 END)                                          AS activeProducts,
      COALESCE(SUM(CASE WHEN is_active=1 THEN quantity END), 0)                        AS totalStockUnits,
      COALESCE(SUM(CASE WHEN is_active=1 THEN purchase_price * quantity END), 0)       AS stockValueCost,
      COALESCE(SUM(CASE WHEN is_active=1 THEN selling_price * quantity END), 0)        AS stockValueSell,
      COUNT(CASE WHEN is_active=1 AND quantity=0 THEN 1 END)                           AS outOfStockCount,
      COUNT(CASE WHEN is_active=1 AND quantity BETWEEN 1 AND 3 THEN 1 END)             AS lowStockCount
    FROM products
  `);
  const cats = await database.getAllAsync<{ category: string; count: number; value: number }>(
    `SELECT category, COUNT(*) AS count, COALESCE(SUM(purchase_price * quantity), 0) AS value
     FROM products WHERE is_active=1
     GROUP BY category ORDER BY value DESC`
  );
  const cost = row?.stockValueCost ?? 0;
  const sell = row?.stockValueSell ?? 0;
  return {
    totalProducts:   row?.totalProducts   ?? 0,
    activeProducts:  row?.activeProducts  ?? 0,
    totalStockUnits: row?.totalStockUnits ?? 0,
    stockValueCost:  cost,
    stockValueSell:  sell,
    potentialProfit: sell - cost,
    outOfStockCount: row?.outOfStockCount ?? 0,
    lowStockCount:   row?.lowStockCount   ?? 0,
    categoryCounts:  cats,
  };
}

export interface DebtReportData {
  totalSalesDebt: number;
  totalPurchaseDebt: number;
  combinedDebt: number;
  activeSalesCount: number;
  activePurchaseCount: number;
  overdueCount: number;
  collectionRate: number;
  salesDebtOriginal: number;
  salesDebtCollected: number;
  purchaseDebtOriginal: number;
  purchaseDebtPaid: number;
}

export async function getDebtReportData(): Promise<DebtReportData> {
  const database = await getDatabase();
  const salesRow = await database.getFirstAsync<Record<string, number>>(`
    SELECT
      COALESCE(SUM(remaining_amount), 0) AS total,
      COUNT(*) AS cnt,
      COALESCE(SUM(original_amount), 0)  AS original,
      COALESCE(SUM(paid_amount), 0)      AS collected
    FROM debts WHERE remaining_amount > 0
  `);
  const purchaseRow = await database.getFirstAsync<Record<string, number>>(`
    SELECT
      COALESCE(SUM(remaining_amount), 0) AS total,
      COUNT(*) AS cnt,
      COALESCE(SUM(original_amount), 0)  AS original,
      COALESCE(SUM(paid_amount), 0)      AS paid
    FROM purchase_debts WHERE remaining_amount > 0
  `);
  const overdueRow = await database.getFirstAsync<{ cnt: number }>(`
    SELECT COUNT(*) AS cnt FROM (
      SELECT id FROM debts
      WHERE remaining_amount > 0
        AND (julianday('now') - julianday(COALESCE(last_payment_at, created_at))) > 30
      UNION ALL
      SELECT id FROM purchase_debts
      WHERE remaining_amount > 0
        AND (julianday('now') - julianday(COALESCE(last_payment_at, created_at))) > 30
    )
  `);

  const salesOrig = salesRow?.original  ?? 0;
  const salesColl = salesRow?.collected ?? 0;

  return {
    totalSalesDebt:       salesRow?.total    ?? 0,
    totalPurchaseDebt:    purchaseRow?.total  ?? 0,
    combinedDebt:         (salesRow?.total ?? 0) + (purchaseRow?.total ?? 0),
    activeSalesCount:     salesRow?.cnt       ?? 0,
    activePurchaseCount:  purchaseRow?.cnt    ?? 0,
    overdueCount:         overdueRow?.cnt     ?? 0,
    collectionRate:       salesOrig > 0 ? (salesColl / salesOrig) * 100 : 0,
    salesDebtOriginal:    salesOrig,
    salesDebtCollected:   salesColl,
    purchaseDebtOriginal: purchaseRow?.original ?? 0,
    purchaseDebtPaid:     purchaseRow?.paid      ?? 0,
  };
}

export interface ProfitableProduct {
  productName: string;
  totalQty: number;
  totalRevenue: number;
  totalCost: number;
  grossProfit: number;
  marginPct: number;
}

export async function getMostProfitableProducts(
  limit = 5,
  from?: string,
  to?: string
): Promise<ProfitableProduct[]> {
  const database = await getDatabase();
  const where = from && to
    ? `WHERE s.created_at >= '${from}' AND s.created_at <= '${to}'`
    : '';
  const rows = await database.getAllAsync<Record<string, unknown>>(`
    SELECT
      si.product_name,
      SUM(si.quantity)                                              AS total_qty,
      SUM(si.line_total)                                            AS total_revenue,
      SUM(si.purchase_price * si.quantity)                         AS total_cost,
      SUM((si.selling_price - si.purchase_price) * si.quantity)    AS gross_profit
    FROM sale_items si
    JOIN sales s ON si.sale_id = s.id
    ${where}
    GROUP BY si.product_name
    ORDER BY gross_profit DESC
    LIMIT ?
  `, [limit]);
  return rows.map((r) => {
    const rev    = r.total_revenue as number;
    const profit = r.gross_profit  as number;
    return {
      productName: r.product_name as string,
      totalQty:    r.total_qty    as number,
      totalRevenue: rev,
      totalCost:   r.total_cost   as number,
      grossProfit: profit,
      marginPct:   rev > 0 ? (profit / rev) * 100 : 0,
    };
  });
}

export interface DailyRevenuePoint {
  date: string;
  revenue: number;
  profit: number;
}

export async function getDailyRevenueChart(days = 30): Promise<DailyRevenuePoint[]> {
  const database = await getDatabase();
  const rows = await database.getAllAsync<Record<string, unknown>>(`
    SELECT
      date(s.created_at) AS date,
      COALESCE(SUM(s.paid_amount), 0)                                               AS revenue,
      COALESCE(SUM((si.selling_price - si.purchase_price) * si.quantity), 0)       AS profit
    FROM sales s
    LEFT JOIN sale_items si ON si.sale_id = s.id
    WHERE s.created_at >= date('now', '-${days} days')
    GROUP BY date(s.created_at)
    ORDER BY date ASC
  `);
  return rows.map((r) => ({
    date:    r.date    as string,
    revenue: r.revenue as number,
    profit:  r.profit  as number,
  }));
}

// ─── Expenses ─────────────────────────────────────────────────────────────────

export interface Expense {
  id: number;
  amount: number;
  category: string;
  note: string | null;
  date: string;
  createdAt: string;
  updatedAt: string;
}

export async function createExpense(data: {
  amount: number;
  category: string;
  note?: string;
  date?: string;
}): Promise<number> {
  const database = await getDatabase();
  const result = await database.runAsync(
    `INSERT INTO expenses (amount, category, note, date) VALUES (?, ?, ?, ?)`,
    [
      data.amount,
      data.category,
      data.note ?? null,
      data.date ?? new Date().toISOString().slice(0, 10),
    ]
  );
  return result.lastInsertRowId;
}

export async function getAllExpenses(from?: string, to?: string): Promise<Expense[]> {
  const database = await getDatabase();
  const where = from && to
    ? `WHERE date >= '${from.slice(0, 10)}' AND date <= '${to.slice(0, 10)}'`
    : '';
  const rows = await database.getAllAsync<Record<string, unknown>>(
    `SELECT * FROM expenses ${where} ORDER BY date DESC, created_at DESC`
  );
  return rows.map((r) => ({
    id:        r.id        as number,
    amount:    r.amount    as number,
    category:  r.category  as string,
    note:      (r.note as string | null) ?? null,
    date:      r.date      as string,
    createdAt: r.created_at as string,
    updatedAt: r.updated_at as string,
  }));
}

export async function deleteExpense(id: number): Promise<void> {
  const database = await getDatabase();
  await database.runAsync('DELETE FROM expenses WHERE id = ?', [id]);
}

export async function getExpenseTotals(from?: string, to?: string): Promise<{
  total: number;
  byCategory: { category: string; total: number }[];
}> {
  const database = await getDatabase();
  const where = from && to
    ? `WHERE date >= '${from.slice(0, 10)}' AND date <= '${to.slice(0, 10)}'`
    : '';
  const totalRow = await database.getFirstAsync<{ total: number }>(
    `SELECT COALESCE(SUM(amount), 0) AS total FROM expenses ${where}`
  );
  const cats = await database.getAllAsync<{ category: string; total: number }>(
    `SELECT category, COALESCE(SUM(amount), 0) AS total
     FROM expenses ${where}
     GROUP BY category ORDER BY total DESC`
  );
  return { total: totalRow?.total ?? 0, byCategory: cats };
}

// ─── Exchange Rates ───────────────────────────────────────────────────────────

export interface ExchangeRateEntry {
  id: number;
  rate: number;
  note: string | null;
  createdAt: string;
}

export async function saveExchangeRateHistory(
  rate: number,
  note?: string
): Promise<void> {
  const database = await getDatabase();
  await database.runAsync(
    `INSERT INTO exchange_rates (rate, note) VALUES (?, ?)`,
    [rate, note ?? null]
  );
}

export async function getExchangeRateHistory(
  limit = 20
): Promise<ExchangeRateEntry[]> {
  const database = await getDatabase();
  const rows = await database.getAllAsync<Record<string, unknown>>(
    `SELECT * FROM exchange_rates ORDER BY created_at DESC LIMIT ?`,
    [limit]
  );
  return rows.map((r) => ({
    id:        r.id        as number,
    rate:      r.rate      as number,
    note:      (r.note     as string | null) ?? null,
    createdAt: r.created_at as string,
  }));
}

// ─── Purchase Items ───────────────────────────────────────────────────────────

export interface PurchaseItem {
  id: number;
  purchaseId: number;
  productName: string;
  category: string | null;
  quantity: number;
  buyPriceIQD: number;
  buyPriceUSD: number;
  sellPriceIQD: number;
  sellPriceUSD: number;
  lineTotalIQD: number;
  idType: string | null;
  itemIds: string[];
  createdAt: string;
}

function rowToPurchaseItem(row: Record<string, unknown>): PurchaseItem {
  return {
    id:           row.id            as number,
    purchaseId:   row.purchase_id   as number,
    productName:  row.product_name  as string,
    category:     (row.category     as string | null) ?? null,
    quantity:     row.quantity      as number,
    buyPriceIQD:  row.buy_price_iqd as number,
    buyPriceUSD:  row.buy_price_usd as number,
    sellPriceIQD: row.sell_price_iqd as number,
    sellPriceUSD: row.sell_price_usd as number,
    lineTotalIQD: row.line_total_iqd as number,
    idType:       (row.id_type       as string | null) ?? null,
    itemIds:      JSON.parse((row.item_ids as string) || '[]') as string[],
    createdAt:    row.created_at     as string,
  };
}

export async function insertPurchaseItem(
  purchaseId: number,
  item: Omit<PurchaseItem, 'id' | 'purchaseId' | 'createdAt'>
): Promise<number> {
  const database = await getDatabase();
  const result = await database.runAsync(
    `INSERT INTO purchase_items
       (purchase_id, product_name, category, quantity, buy_price_iqd, buy_price_usd,
        sell_price_iqd, sell_price_usd, line_total_iqd, id_type, item_ids)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      purchaseId,
      item.productName,
      item.category ?? null,
      item.quantity,
      item.buyPriceIQD,
      item.buyPriceUSD,
      item.sellPriceIQD,
      item.sellPriceUSD,
      item.lineTotalIQD,
      item.idType ?? null,
      JSON.stringify(item.itemIds),
    ]
  );
  return result.lastInsertRowId;
}

export async function getPurchaseItemsByPurchaseId(purchaseId: number): Promise<PurchaseItem[]> {
  const database = await getDatabase();
  const rows = await database.getAllAsync<Record<string, unknown>>(
    'SELECT * FROM purchase_items WHERE purchase_id = ? ORDER BY id ASC',
    [purchaseId]
  );
  return rows.map(rowToPurchaseItem);
}

// ─── Reports Cache ────────────────────────────────────────────────────────────

export async function getCachedReport<T>(key: string): Promise<T | null> {
  const database = await getDatabase();
  const row = await database.getFirstAsync<{ data: string; expires_at: string }>(
    'SELECT data, expires_at FROM reports_cache WHERE key = ?',
    [key]
  );
  if (!row) return null;
  if (new Date(row.expires_at) <= new Date()) {
    await database.runAsync('DELETE FROM reports_cache WHERE key = ?', [key]);
    return null;
  }
  try {
    return JSON.parse(row.data) as T;
  } catch {
    return null;
  }
}

export async function setCachedReport<T>(
  key: string,
  data: T,
  ttlSeconds = 300
): Promise<void> {
  const database = await getDatabase();
  const expiresAt = new Date(Date.now() + ttlSeconds * 1000).toISOString();
  await database.runAsync(
    'INSERT OR REPLACE INTO reports_cache (key, data, expires_at) VALUES (?, ?, ?)',
    [key, JSON.stringify(data), expiresAt]
  );
}

export async function clearReportsCache(): Promise<void> {
  const database = await getDatabase();
  await database.runAsync('DELETE FROM reports_cache');
}
