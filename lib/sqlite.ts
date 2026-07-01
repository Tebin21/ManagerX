import * as SQLite from 'expo-sqlite';
import type {
  Product, SaleItem, Sale, Debt,
  IdMode, PaymentMethod, SaleStatus, DebtStatus,
  UpdateSaleCompleteInput, GlobalDiscountType,
} from '@/types/sales';
import type { Purchase, PurchasePaymentStatus, PurchaseIdType } from '@/types/purchases';
import type { InventoryProduct, InventoryStats, NewProductData } from '@/types/inventory';
import type { Customer, CustomerWithStats, UpdateSaleInput } from '@/types/customers';
import type { PurchaseDebt, SalesDebtDetail, DebtPayment, DebtOverviewSummary } from '@/types/debt';
import type { SoldProductRecord } from '@/types/soldProducts';
import type { Supplier, SupplierWithStats } from '@/types/suppliers';

export const DEFAULT_CATEGORY = 'General';

const dbPromise = SQLite.openDatabaseAsync('managerx.db').catch((err) => {
  console.error('[ManagerX] SQLite open failed:', err);
  throw err;
});

export async function getDatabase(): Promise<SQLite.SQLiteDatabase> {
  return dbPromise;
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
    `ALTER TABLE products ADD COLUMN notes TEXT`,
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
    // Add missing 'date' column to purchases (was in CREATE TABLE DDL but never migrated)
    `ALTER TABLE purchases ADD COLUMN date TEXT`,
    // Backfill date from created_at for rows that have no date yet
    `UPDATE purchases SET date = date(created_at) WHERE date IS NULL`,
    // Managed categories table
    `CREATE TABLE IF NOT EXISTS categories (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL UNIQUE, created_at TEXT DEFAULT CURRENT_TIMESTAMP)`,
    `CREATE INDEX IF NOT EXISTS idx_categories_name ON categories(name)`,
    // Populate from existing product/purchase categories
    `INSERT OR IGNORE INTO categories (name) SELECT DISTINCT category FROM products WHERE category IS NOT NULL AND category != '' UNION SELECT DISTINCT category FROM purchase_items WHERE category IS NOT NULL AND category != ''`,
    // Guarantee the default category always exists
    `INSERT OR IGNORE INTO categories (name) VALUES ('General')`,
    // Per-product low stock threshold (null = use global default)
    `ALTER TABLE products ADD COLUMN low_stock_threshold INTEGER`,
    // Per-product alert opt-in: NULL=follow global, 1=always on, 0=always off
    `ALTER TABLE products ADD COLUMN low_stock_enabled INTEGER`,
    // Inventory history — snapshots of sold-out or removed products
    `CREATE TABLE IF NOT EXISTS inventory_history (id INTEGER PRIMARY KEY AUTOINCREMENT, product_id INTEGER NOT NULL, product_name TEXT NOT NULL, category TEXT NOT NULL DEFAULT 'General', image_uri TEXT, item_id TEXT, purchase_price REAL NOT NULL DEFAULT 0, selling_price REAL NOT NULL DEFAULT 0, quantity_sold INTEGER NOT NULL DEFAULT 0, final_quantity INTEGER NOT NULL DEFAULT 0, status TEXT NOT NULL DEFAULT 'sold_out', archived_at TEXT DEFAULT CURRENT_TIMESTAMP, UNIQUE(product_id))`,
    `UPDATE invoice_counter SET last_number = MAX(last_number, (SELECT COUNT(*) FROM sales)), last_date = ''`,
    `UPDATE purchase_counter SET last_number = MAX(last_number, (SELECT COUNT(*) FROM purchases)), last_date = ''`,
    // Cart-level discount fields on sales
    `ALTER TABLE sales ADD COLUMN global_discount_type TEXT NOT NULL DEFAULT 'none'`,
    `ALTER TABLE sales ADD COLUMN global_discount REAL NOT NULL DEFAULT 0`,
    // Exchange rate snapshot on sales — preserves the rate active at time of sale
    `ALTER TABLE sales ADD COLUMN exchange_rate REAL NOT NULL DEFAULT 1310`,
    // User-editable transaction date/time for sales (separate from system created_at)
    `ALTER TABLE sales ADD COLUMN date TEXT`,
    `UPDATE sales SET date = datetime(created_at) WHERE date IS NULL`,
    // Duplicate-account prevention: unique indexes on customer/supplier name and phone
    `CREATE UNIQUE INDEX IF NOT EXISTS idx_customers_name_unique ON customers(LOWER(TRIM(name)))`,
    `CREATE UNIQUE INDEX IF NOT EXISTS idx_customers_phone_unique ON customers(phone) WHERE phone IS NOT NULL AND TRIM(phone) != ''`,
    `CREATE UNIQUE INDEX IF NOT EXISTS idx_suppliers_phone_unique ON suppliers(phone) WHERE phone IS NOT NULL AND TRIM(phone) != ''`,
    // Expense reason field — separates "what it was for" from optional note
    `ALTER TABLE expenses ADD COLUMN reason TEXT`,
    `UPDATE expenses SET reason = note, note = NULL WHERE reason IS NULL AND note IS NOT NULL`,
    // Purchase soft-delete: archived_at IS NULL means active
    `ALTER TABLE purchases ADD COLUMN archived_at TEXT`,
    // Purchase audit log — records every edit/archive with before/after values
    `CREATE TABLE IF NOT EXISTS purchase_audit_log (id INTEGER PRIMARY KEY AUTOINCREMENT, purchase_id INTEGER NOT NULL, action TEXT NOT NULL, changed_fields TEXT NOT NULL DEFAULT '[]', old_values TEXT NOT NULL DEFAULT '{}', new_values TEXT NOT NULL DEFAULT '{}', actor_id TEXT, actor_name TEXT, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)`,
    `CREATE INDEX IF NOT EXISTS idx_purchase_audit_log_purchase ON purchase_audit_log(purchase_id)`,
    // Link inventory_history snapshots back to their originating purchase, so sold-quantity
    // accounting survives a product being manually deleted after it was sold from.
    `ALTER TABLE inventory_history ADD COLUMN purchase_id INTEGER`,
    `CREATE INDEX IF NOT EXISTS idx_inventory_history_purchase ON inventory_history(purchase_id)`,
    // Online Store — per-product publish/hide flag for the public storefront
    `ALTER TABLE products ADD COLUMN store_visible INTEGER NOT NULL DEFAULT 0`,
    // Online Store — offline-first outbox of product changes waiting to sync to the website
    `CREATE TABLE IF NOT EXISTS sync_queue (id INTEGER PRIMARY KEY AUTOINCREMENT, entity_type TEXT NOT NULL DEFAULT 'product', entity_id INTEGER NOT NULL, operation TEXT NOT NULL, created_at TEXT DEFAULT CURRENT_TIMESTAMP, updated_at TEXT DEFAULT CURRENT_TIMESTAMP, UNIQUE(entity_type, entity_id))`,
    // Online Store — cloud-hosted copy of the product image, set after a successful
    // upload. NULL means "needs (re-)upload before the next sync can reference it".
    `ALTER TABLE products ADD COLUMN image_remote_url TEXT`,
    // Performance audit — missing indexes on hot join/filter columns used by
    // customer stats, reports, debt screens, and purchase deletion.
    `CREATE INDEX IF NOT EXISTS idx_sales_customer_id ON sales(customer_id)`,
    `CREATE INDEX IF NOT EXISTS idx_sale_items_product_id ON sale_items(product_id)`,
    `CREATE INDEX IF NOT EXISTS idx_products_purchase_id ON products(purchase_id)`,
    `CREATE INDEX IF NOT EXISTS idx_purchase_debts_purchase_id ON purchase_debts(purchase_id)`,
    `CREATE INDEX IF NOT EXISTS idx_purchase_debts_status ON purchase_debts(status)`,
    `CREATE INDEX IF NOT EXISTS idx_debts_status ON debts(status)`,
    `CREATE INDEX IF NOT EXISTS idx_debt_payments_debt_id ON debt_payments(debt_id)`,
    `CREATE INDEX IF NOT EXISTS idx_products_active_quantity ON products(is_active, quantity)`,
    // Online Store — short storefront-only product description (separate from the
    // generic `description` column, which is edit-screen-only and never synced/shown).
    `ALTER TABLE products ADD COLUMN website_description TEXT`,
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
  let invoiceNumber = '';

  await database.withTransactionAsync(async () => {
    const row = await database.getFirstAsync<{ last_number: number }>(
      'SELECT last_number FROM invoice_counter WHERE id = 1'
    );

    const nextNumber = (row?.last_number ?? 0) + 1;

    await database.runAsync(
      'UPDATE invoice_counter SET last_number = ? WHERE id = 1',
      [nextNumber]
    );

    invoiceNumber = String(nextNumber).padStart(4, '0');
  });

  return invoiceNumber;
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

export async function getProductsByItemId(itemId: string): Promise<number[]> {
  const database = await getDatabase();
  const rows = await database.getAllAsync<{ id: number }>(
    'SELECT id FROM products WHERE item_id = ? AND is_active = 1',
    [itemId]
  );
  return rows.map((r) => r.id);
}

export async function getProductCategories(): Promise<string[]> {
  const database = await getDatabase();
  const rows = await database.getAllAsync<{ name: string }>(
    `SELECT name FROM categories ORDER BY name ASC`
  );
  return rows.map((r) => r.name);
}

export async function getAllManagedCategories(): Promise<Array<{ name: string; productCount: number; isDefault: boolean }>> {
  const database = await getDatabase();
  const rows = await database.getAllAsync<{ name: string; product_count: number }>(
    `SELECT c.name,
            COUNT(CASE WHEN p.is_active = 1 THEN 1 END) AS product_count
     FROM categories c
     LEFT JOIN products p ON p.category = c.name
     GROUP BY c.name
     ORDER BY c.name ASC`
  );
  return rows.map((r) => ({ name: r.name, productCount: r.product_count, isDefault: r.name === DEFAULT_CATEGORY }));
}

export async function addManagedCategory(name: string): Promise<void> {
  const database = await getDatabase();
  const result = await database.runAsync(
    'INSERT OR IGNORE INTO categories (name) VALUES (?)',
    [name.trim()]
  );
  if (result.changes === 0) throw new Error('CATEGORY_ALREADY_EXISTS');
}

export async function deleteManagedCategory(name: string): Promise<void> {
  if (name === DEFAULT_CATEGORY) throw new Error('CATEGORY_IS_DEFAULT');
  const database = await getDatabase();
  const row = await database.getFirstAsync<{ cnt: number }>(
    'SELECT COUNT(*) AS cnt FROM products WHERE category = ? AND is_active = 1',
    [name]
  );
  const count = row?.cnt ?? 0;
  if (count > 0) throw new Error(`CATEGORY_HAS_PRODUCTS|${count}`);
  await database.runAsync('DELETE FROM categories WHERE name = ?', [name]);
}

export async function renameManagedCategory(oldName: string, newName: string): Promise<void> {
  if (oldName === DEFAULT_CATEGORY) throw new Error('CATEGORY_IS_DEFAULT');
  const trimmed = newName.trim();
  if (!trimmed) throw new Error('CATEGORY_NAME_REQUIRED');
  if (trimmed === oldName) return;

  const database = await getDatabase();
  const existing = await database.getFirstAsync<{ cnt: number }>(
    'SELECT COUNT(*) AS cnt FROM categories WHERE name = ?',
    [trimmed]
  );
  if ((existing?.cnt ?? 0) > 0) throw new Error('CATEGORY_ALREADY_EXISTS');

  await database.runAsync('UPDATE categories SET name = ? WHERE name = ?', [trimmed, oldName]);
  await database.runAsync(
    'UPDATE products SET category = ?, updated_at = CURRENT_TIMESTAMP WHERE category = ?',
    [trimmed, oldName]
  );
  // The rename changed every affected product's data, so each one needs to reach the
  // storefront on the next sync — same fan-out pattern used elsewhere for bulk updates.
  const rows = await database.getAllAsync<{ id: number }>('SELECT id FROM products WHERE category = ?', [trimmed]);
  for (const row of rows) await enqueueSyncChange(row.id, 'upsert');
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
    notes: (row.notes as string | null) ?? null,
    imageUri: (row.image_uri as string | null) ?? null,
    imageRemoteUrl: (row.image_remote_url as string | null) ?? null,
    buyPriceUsd: (row.buy_price_usd as number) ?? 0,
    sellPriceUsd: (row.sell_price_usd as number) ?? 0,
    lowStockThreshold: (row.low_stock_threshold as number | null) ?? null,
    lowStockEnabled: (row.low_stock_enabled as 1 | 0 | null) ?? null,
    storeVisible: (row.store_visible as number) === 1,
    websiteDescription: (row.website_description as string | null) ?? null,
  };
}

export async function insertProduct(data: NewProductData): Promise<number> {
  // No item-limit check here — the sole caller (store/purchaseStore.ts) already
  // does one atomic assertItemLimitNotExceeded() pre-flight check for the whole
  // purchase before looping over insertProduct() per custom item id. Re-checking
  // per row here was pure redundant overhead (a device-id lookup + Ed25519 verify
  // + full inventory-stats scan) for a value already validated atomically.
  const database = await getDatabase();

  // Online Store "bulk publish" policy — when on, every newly created product is
  // auto-published, regardless of where it was created (insertProduct is the sole
  // call site for product creation app-wide). Reads the setting key directly instead
  // of importing lib/onlineStore/storage.ts's getter, since that file already imports
  // loadSetting/saveSetting FROM this file — importing back would be circular.
  const bulkPublishEnabled = (await loadSetting('online_store_bulk_publish_enabled')) === '1';

  const result = await database.runAsync(
    `INSERT INTO products (
      name, category, item_id, id_mode,
      purchase_price, selling_price, quantity, unit, description, is_active,
      purchase_id, supplier_name, supplier_phone, supplier_address, purchase_date,
      payment_status, warranty, image_uri, buy_price_usd, sell_price_usd,
      website_description, store_visible
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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
      data.websiteDescription ?? null,
      bulkPublishEnabled ? 1 : 0,
    ]
  );

  await enqueueSyncChange(result.lastInsertRowId, 'upsert');
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
  if (data.notes !== undefined)          { fields.push('notes = ?');            values.push(data.notes); }
  if (data.imageUri !== undefined)       { fields.push('image_uri = ?');        values.push(data.imageUri);
                                            fields.push('image_remote_url = NULL'); }
  if (data.paymentStatus !== undefined)  { fields.push('payment_status = ?');   values.push(data.paymentStatus); }
  if (data.supplierName !== undefined)   { fields.push('supplier_name = ?');    values.push(data.supplierName); }
  if (data.supplierPhone !== undefined)  { fields.push('supplier_phone = ?');   values.push(data.supplierPhone); }
  if (data.supplierAddress !== undefined){ fields.push('supplier_address = ?'); values.push(data.supplierAddress); }
  if (data.lowStockThreshold !== undefined) { fields.push('low_stock_threshold = ?'); values.push(data.lowStockThreshold ?? null); }
  if (data.lowStockEnabled !== undefined)  { fields.push('low_stock_enabled = ?');  values.push(data.lowStockEnabled ?? null); }
  if (data.websiteDescription !== undefined) { fields.push('website_description = ?'); values.push(data.websiteDescription); }

  if (fields.length === 0) return;
  fields.push('updated_at = CURRENT_TIMESTAMP');
  values.push(id);

  await database.withTransactionAsync(async () => {
    await database.runAsync(
      `UPDATE products SET ${fields.join(', ')} WHERE id = ?`,
      values as SQLite.SQLiteBindValue[]
    );

    // Mirror the fields shared with a purchase back onto its header/line-item, so
    // Purchase History stays fresh when these are edited from the Inventory side.
    const sharedField =
      data.name !== undefined || data.category !== undefined ||
      data.sellingPrice !== undefined || data.sellPriceUsd !== undefined ||
      data.warranty !== undefined || data.description !== undefined || data.notes !== undefined;
    if (sharedField) {
      const row = await database.getFirstAsync<{ purchase_id: number | null }>(
        'SELECT purchase_id FROM products WHERE id = ?', [id]
      );
      if (row?.purchase_id != null) {
        await propagateToPurchase(database, row.purchase_id, {
          name: data.name,
          category: data.category,
          sellPriceIQD: data.sellingPrice,
          sellPriceUSD: data.sellPriceUsd,
          warranty: data.warranty,
          description: data.description,
          notes: data.notes,
        });
      }
    }
  });

  await enqueueSyncChange(id, 'upsert');
}

async function archiveProductToHistory(
  database: SQLite.SQLiteDatabase,
  productId: number,
  status: 'sold_out' | 'removed'
): Promise<void> {
  const productRow = await database.getFirstAsync<Record<string, unknown>>(
    'SELECT * FROM products WHERE id = ?',
    [productId]
  );
  if (!productRow) return;

  const soldRow = await database.getFirstAsync<{ total: number }>(
    'SELECT COALESCE(SUM(si.quantity), 0) AS total FROM sale_items si WHERE si.product_id = ?',
    [productId]
  );

  await database.runAsync(
    `INSERT OR REPLACE INTO inventory_history
      (product_id, product_name, category, image_uri, item_id,
       purchase_price, selling_price, quantity_sold, final_quantity, status, purchase_id, archived_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
    [
      productId,
      productRow.name as string,
      (productRow.category as string) ?? 'General',
      (productRow.image_uri as string | null) ?? null,
      (productRow.item_id as string | null) ?? null,
      (productRow.purchase_price as number) ?? 0,
      (productRow.selling_price as number) ?? 0,
      soldRow?.total ?? 0,
      (productRow.quantity as number) ?? 0,
      status,
      (productRow.purchase_id as number | null) ?? null,
    ]
  );
}

export async function deleteProduct(id: number): Promise<void> {
  const database = await getDatabase();
  await archiveProductToHistory(database, id, 'removed');
  await database.runAsync('DELETE FROM products WHERE id = ?', [id]);
  await enqueueSyncChange(id, 'delete');
}

export async function setProductStoreVisibility(id: number, visible: boolean): Promise<void> {
  const database = await getDatabase();
  await database.runAsync(
    'UPDATE products SET store_visible = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
    [visible ? 1 : 0, id]
  );
  await enqueueSyncChange(id, 'upsert');
}

// Bulk publish/unpublish ALL products in two single-statement operations (no per-row
// JS loop), so this stays instant regardless of catalog size (10 or 100,000+ rows).
// OFF uses 'upsert' (not 'delete') — same semantics as setProductStoreVisibility above:
// a hard 'delete' means "row no longer exists locally" (see deleteProduct), whereas this
// only flips store_visible, leaving local inventory untouched and keeping the per-product
// Switch in app/(app)/inventory/[id].tsx fully interoperable with this bulk action.
export async function bulkSetStoreVisibility(visible: boolean): Promise<number> {
  const database = await getDatabase();
  let affected = 0;
  await database.withTransactionAsync(async () => {
    const result = await database.runAsync(
      'UPDATE products SET store_visible = ?, updated_at = CURRENT_TIMESTAMP',
      [visible ? 1 : 0]
    );
    affected = result.changes;
    await database.runAsync(
      `INSERT INTO sync_queue (entity_type, entity_id, operation, updated_at)
       SELECT 'product', id, 'upsert', CURRENT_TIMESTAMP FROM products
       ON CONFLICT(entity_type, entity_id) DO UPDATE SET
         operation = excluded.operation,
         updated_at = excluded.updated_at`
    );
  });
  // Same dynamic-import fire-and-forget pattern as enqueueSyncChange below — avoids a
  // circular import (syncEngine.ts already imports FROM this file).
  import('./onlineStore/syncEngine').then((m) => m.scheduleSync()).catch(() => {});
  return affected;
}

// ─── Online Store Sync Queue ──────────────────────────────────────────────────
// Offline-first outbox: every product create/update/delete/stock-change enqueues
// a row here (deduped by entity, see UNIQUE(entity_type, entity_id) in the schema).
// lib/onlineStore/syncEngine.ts drains this queue whenever connectivity returns.

export async function enqueueSyncChange(
  productId: number,
  operation: 'upsert' | 'delete'
): Promise<void> {
  const database = await getDatabase();
  await database.runAsync(
    `INSERT INTO sync_queue (entity_type, entity_id, operation, updated_at)
     VALUES ('product', ?, ?, CURRENT_TIMESTAMP)
     ON CONFLICT(entity_type, entity_id) DO UPDATE SET
       operation = excluded.operation,
       updated_at = excluded.updated_at`,
    [productId, operation]
  );
  // Dynamic import avoids a circular import (syncEngine.ts already imports FROM
  // this file). Fire-and-forget — enqueueSyncChange is called inline inside bulk
  // loops (e.g. deleteProductsByPurchaseId) and must never block on a debounce
  // timer or a network call.
  import('./onlineStore/syncEngine').then((m) => m.scheduleSync()).catch(() => {});
}

export async function getPendingSyncCount(): Promise<number> {
  const database = await getDatabase();
  const row = await database.getFirstAsync<{ cnt: number }>(
    "SELECT COUNT(*) AS cnt FROM sync_queue WHERE entity_type = 'product'"
  );
  return row?.cnt ?? 0;
}

export interface PendingSyncItem {
  queueId: number;
  productId: number;
  operation: 'upsert' | 'delete';
  product: InventoryProduct | null;
}

export async function getPendingSyncProducts(): Promise<PendingSyncItem[]> {
  const database = await getDatabase();
  const rows = await database.getAllAsync<Record<string, unknown>>(
    "SELECT * FROM sync_queue WHERE entity_type = 'product' ORDER BY id ASC"
  );
  if (rows.length === 0) return [];

  const upsertIds = rows
    .filter((r) => r.operation === 'upsert')
    .map((r) => r.entity_id as number);

  // Batch the product lookup instead of one SELECT per sync_queue row — chunked
  // to stay under SQLite's bound-parameter limit (~999) for very large queues.
  const productById = new Map<number, InventoryProduct>();
  const CHUNK = 500;
  for (let i = 0; i < upsertIds.length; i += CHUNK) {
    const chunk = upsertIds.slice(i, i + CHUNK);
    const placeholders = chunk.map(() => '?').join(', ');
    const productRows = await database.getAllAsync<Record<string, unknown>>(
      `SELECT * FROM products WHERE id IN (${placeholders})`,
      chunk
    );
    for (const productRow of productRows) {
      productById.set(productRow.id as number, rowToInventoryProduct(productRow));
    }
  }

  return rows.map((row) => {
    const productId = row.entity_id as number;
    const operation = row.operation as 'upsert' | 'delete';
    return {
      queueId: row.id as number,
      productId,
      operation,
      product: operation === 'upsert' ? (productById.get(productId) ?? null) : null,
    };
  });
}

export async function clearSyncQueue(queueIds: number[]): Promise<void> {
  if (queueIds.length === 0) return;
  const database = await getDatabase();
  const placeholders = queueIds.map(() => '?').join(', ');
  await database.runAsync(`DELETE FROM sync_queue WHERE id IN (${placeholders})`, queueIds);
}

// Records the public URL returned after uploading a product's local image to the
// Online Store backend. Deliberately does NOT call enqueueSyncChange — this is
// completing an in-flight sync, not creating a new change to sync (that would
// retrigger scheduleSync() in a loop with itself).
export async function setProductImageRemoteUrl(id: number, url: string): Promise<void> {
  const database = await getDatabase();
  await database.runAsync('UPDATE products SET image_remote_url = ? WHERE id = ?', [url, id]);
}

export async function permanentDeleteFromHistory(historyId: number): Promise<void> {
  const database = await getDatabase();
  await database.runAsync('DELETE FROM inventory_history WHERE id = ?', [historyId]);
}

export async function restoreProductFromHistory(historyId: number): Promise<number | null> {
  const database = await getDatabase();
  const row = await database.getFirstAsync<Record<string, unknown>>(
    'SELECT * FROM inventory_history WHERE id = ?', [historyId]
  );
  if (!row) return null;
  const qty = Math.max(Number(row.final_quantity) || 0, 1);

  const { assertItemLimitNotExceeded } = await import('@/lib/itemLimit');
  await assertItemLimitNotExceeded(qty);

  const result = await database.runAsync(
    `INSERT INTO products (name, category, item_id, purchase_price, selling_price, quantity, image_uri, is_active)
     VALUES (?, ?, ?, ?, ?, ?, ?, 1)`,
    [
      row.product_name as string,
      row.category as string,
      (row.item_id as string | null) ?? null,
      row.purchase_price as number,
      row.selling_price as number,
      qty,
      (row.image_uri as string | null) ?? null,
    ]
  );
  await database.runAsync('DELETE FROM inventory_history WHERE id = ?', [historyId]);
  await enqueueSyncChange(result.lastInsertRowId, 'upsert');
  return result.lastInsertRowId;
}

export async function getAllInventoryHistory(): Promise<import('@/types/inventory').InventoryHistoryItem[]> {
  const database = await getDatabase();
  const rows = await database.getAllAsync<Record<string, unknown>>(`
    SELECT h.*
    FROM inventory_history h
    LEFT JOIN products p ON h.product_id = p.id
    WHERE p.id IS NULL OR p.quantity = 0
    ORDER BY h.archived_at DESC
  `);
  return rows.map((r) => ({
    id: r.id as number,
    productId: r.product_id as number,
    productName: r.product_name as string,
    category: r.category as string,
    imageUri: (r.image_uri as string | null) ?? null,
    itemId: (r.item_id as string | null) ?? null,
    purchasePrice: r.purchase_price as number,
    sellingPrice: r.selling_price as number,
    quantitySold: r.quantity_sold as number,
    finalQuantity: r.final_quantity as number,
    status: r.status as 'sold_out' | 'removed',
    archivedAt: r.archived_at as string,
  }));
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
      COUNT(CASE WHEN is_active = 1 AND quantity > 0 THEN 1 END)                          AS totalProducts,
      COALESCE(SUM(CASE WHEN is_active = 1 AND quantity > 0 THEN quantity END), 0)        AS totalQuantity,
      COALESCE(SUM(CASE WHEN is_active = 1 AND quantity > 0 THEN quantity * purchase_price END), 0) AS totalValueIQD,
      COUNT(CASE WHEN is_active = 1 AND quantity > 0 AND quantity <= 3 THEN 1 END)        AS lowStockCount,
      COUNT(CASE WHEN is_active = 1 AND quantity > 0 AND payment_status = 'paid' THEN 1 END)  AS paidCount,
      COUNT(CASE WHEN is_active = 1 AND quantity > 0 AND payment_status = 'debt' THEN 1 END)  AS debtCount
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

export async function getSoldProducts(): Promise<SoldProductRecord[]> {
  const database = await getDatabase();
  const rows = await database.getAllAsync<Record<string, unknown>>(`
    SELECT
      si.id,
      si.sale_id,
      si.product_id,
      si.product_name,
      si.item_id,
      si.quantity      AS sold_qty,
      si.selling_price,
      si.purchase_price,
      si.discount,
      si.line_total,
      (si.line_total * s.grand_total / NULLIF(s.subtotal - s.discount_total, 0) - si.purchase_price * si.quantity) AS profit,
      s.invoice_number,
      s.customer_name,
      s.customer_phone,
      s.customer_id,
      s.payment_method,
      s.status         AS sale_status,
      s.paid_amount,
      s.remaining_debt,
      s.grand_total,
      s.created_at     AS sold_date,
      p.image_uri
    FROM sale_items si
    JOIN sales s ON si.sale_id = s.id
    LEFT JOIN products p ON si.product_id = p.id
    WHERE s.status != 'cancelled'
    ORDER BY s.created_at DESC
  `);
  return rows.map((row) => ({
    id: row.id as number,
    saleId: row.sale_id as number,
    invoiceNumber: row.invoice_number as string,
    productId: row.product_id as number,
    productName: row.product_name as string,
    itemId: row.item_id as string | null,
    soldQty: row.sold_qty as number,
    sellingPrice: row.selling_price as number,
    purchasePrice: row.purchase_price as number,
    discount: row.discount as number,
    lineTotal: row.line_total as number,
    profit: row.profit as number,
    customerName: row.customer_name as string | null,
    customerPhone: row.customer_phone as string | null,
    customerId: row.customer_id as number | null,
    paymentMethod: row.payment_method as 'cash' | 'debt' | 'fib',
    saleStatus: row.sale_status as 'completed' | 'cancelled',
    paidAmount: row.paid_amount as number,
    remainingDebt: row.remaining_debt as number,
    soldDate: row.sold_date as string,
    imageUri: row.image_uri as string | null,
  }));
}

// ─── Customers ───────────────────────────────────────────────────────────────

export async function upsertCustomer(input: {
  name: string;
  phone: string;
  address?: string;
  selectedId?: number;
}): Promise<number> {
  if (input.selectedId) return input.selectedId;

  const database = await getDatabase();
  const trimName  = input.name.trim();
  const trimPhone = input.phone.trim();

  if (trimPhone) {
    const byPhone = await database.getFirstAsync<{ id: number; name: string }>(
      'SELECT id, name FROM customers WHERE phone = ?',
      [trimPhone]
    );
    if (byPhone) throw new Error(`DUPLICATE_PHONE:${byPhone.name}`);
  }

  const byName = await database.getFirstAsync<{ id: number }>(
    'SELECT id FROM customers WHERE LOWER(TRIM(name)) = LOWER(TRIM(?))',
    [trimName]
  );
  if (byName) throw new Error('DUPLICATE_NAME');

  const result = await database.runAsync(
    'INSERT INTO customers (name, phone, address) VALUES (?, ?, ?)',
    [trimName, trimPhone || null, input.address?.trim() || null]
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

export async function searchCustomersList(query: string): Promise<Customer[]> {
  const database = await getDatabase();
  const q = `%${query}%`;
  const rows = await database.getAllAsync<Record<string, unknown>>(
    `SELECT id, name, phone, address, total_purchases, notes, created_at,
            COALESCE(updated_at, created_at) AS updated_at
     FROM customers
     WHERE name LIKE ? OR phone LIKE ?
     ORDER BY name ASC LIMIT 8`,
    [q, q]
  );
  return rows.map((row) => ({
    id: row.id as number,
    name: row.name as string,
    phone: (row.phone as string | null) ?? null,
    address: (row.address as string | null) ?? null,
    totalPurchases: (row.total_purchases as number) ?? 0,
    notes: (row.notes as string | null) ?? null,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  }));
}

export async function updateCustomer(
  id: number,
  data: Partial<{ name: string; phone: string; address: string; notes: string }>
): Promise<void> {
  const database = await getDatabase();

  if (data.name !== undefined) {
    const trimName = data.name.trim();
    const byName = await database.getFirstAsync<{ id: number }>(
      'SELECT id FROM customers WHERE LOWER(TRIM(name)) = LOWER(TRIM(?)) AND id != ?',
      [trimName, id]
    );
    if (byName) throw new Error('DUPLICATE_NAME');
    data = { ...data, name: trimName };
  }
  if (data.phone !== undefined && data.phone.trim()) {
    const trimPhone = data.phone.trim();
    const byPhone = await database.getFirstAsync<{ id: number; name: string }>(
      'SELECT id, name FROM customers WHERE phone = ? AND id != ?',
      [trimPhone, id]
    );
    if (byPhone) throw new Error(`DUPLICATE_PHONE:${byPhone.name}`);
    data = { ...data, phone: trimPhone };
  }

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

export async function deleteCustomer(id: number): Promise<void> {
  const database = await getDatabase();

  const saleCheck = await database.getFirstAsync<{ cnt: number }>(
    'SELECT COUNT(*) AS cnt FROM sales WHERE customer_id = ?', [id]
  );
  if ((saleCheck?.cnt ?? 0) > 0) throw new Error('CUSTOMER_HAS_SALES');

  const debtCheck = await database.getFirstAsync<{ cnt: number }>(
    `SELECT COUNT(*) AS cnt FROM debts d
     JOIN sales s ON d.sale_id = s.id
     WHERE s.customer_id = ? AND d.status = 'active'`,
    [id]
  );
  if ((debtCheck?.cnt ?? 0) > 0) throw new Error('CUSTOMER_HAS_ACTIVE_DEBTS');

  await database.runAsync('DELETE FROM customers WHERE id = ?', [id]);
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

export async function addPaymentToDebt(debtId: number, amount: number, paymentDate?: string): Promise<void> {
  const database = await getDatabase();
  const ts = paymentDate ?? new Date().toISOString();
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
        last_payment_at = ?,
        updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [clamped, newRemaining, newRemaining, ts, debtId]
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
      `INSERT INTO debt_payments (debt_id, debt_type, amount, remaining_after, created_at)
       VALUES (?, 'sales', ?, ?, ?)`,
      [debtId, clamped, newRemaining, ts]
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

export async function updateSaleComplete(saleId: number, input: UpdateSaleCompleteInput): Promise<void> {
  const database = await getDatabase();

  await database.withTransactionAsync(async () => {
    // 1. Fetch the original sale record
    const origSale = await database.getFirstAsync<{
      customer_id: number | null;
      grand_total: number;
    }>('SELECT customer_id, grand_total FROM sales WHERE id = ?', [saleId]);
    if (!origSale) return;

    // 2. Fetch original sale items to restore inventory
    const origItems = await database.getAllAsync<Record<string, unknown>>(
      'SELECT * FROM sale_items WHERE sale_id = ?', [saleId]
    );

    // 3. Restore inventory for original items
    for (const row of origItems) {
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
      await enqueueSyncChange(item.productId, 'upsert');
    }

    // 4. Delete old sale_items
    await database.runAsync('DELETE FROM sale_items WHERE sale_id = ?', [saleId]);

    // 5. Insert new sale_items and decrement inventory
    for (const item of input.items) {
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
      await enqueueSyncChange(item.productId, 'upsert');
    }

    // 6. Update the sales record
    await database.runAsync(
      `UPDATE sales SET
        customer_id      = ?,
        customer_name    = ?,
        customer_phone   = ?,
        customer_address = ?,
        warranty         = ?,
        notes            = ?,
        payment_method   = ?,
        subtotal              = ?,
        discount_total        = ?,
        global_discount_type  = ?,
        global_discount       = ?,
        grand_total           = ?,
        paid_amount           = ?,
        remaining_debt        = ?,
        date                  = COALESCE(?, date),
        updated_at            = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [
        input.customerId ?? null,
        input.customerName,
        input.customerPhone,
        input.customerAddress ?? null,
        input.warranty ?? null,
        input.notes ?? null,
        input.paymentMethod,
        input.subtotal,
        input.discountTotal,
        input.globalDiscountType ?? 'none',
        input.globalDiscount ?? 0,
        input.grandTotal,
        input.paidAmount,
        input.remainingDebt,
        input.date ?? null,
        saleId,
      ]
    );

    // 7. Sync debt record
    const existingDebt = await database.getFirstAsync<{ id: number; paid_amount: number }>(
      'SELECT id, paid_amount FROM debts WHERE sale_id = ?', [saleId]
    );

    if (input.remainingDebt > 0) {
      if (existingDebt) {
        await database.runAsync(
          `UPDATE debts SET
            customer_name    = ?,
            customer_phone   = ?,
            original_amount  = ?,
            paid_amount      = ?,
            remaining_amount = ?,
            status           = 'active',
            updated_at       = CURRENT_TIMESTAMP
           WHERE id = ?`,
          [
            input.customerName,
            input.customerPhone,
            input.grandTotal,
            input.paidAmount,
            input.remainingDebt,
            existingDebt.id,
          ]
        );
      } else {
        await database.runAsync(
          `INSERT INTO debts (
            sale_id, customer_name, customer_phone,
            original_amount, paid_amount, remaining_amount, status
          ) VALUES (?, ?, ?, ?, ?, ?, 'active')`,
          [
            saleId,
            input.customerName,
            input.customerPhone,
            input.grandTotal,
            input.paidAmount,
            input.remainingDebt,
          ]
        );
      }
    } else if (existingDebt) {
      await database.runAsync(
        `UPDATE debts SET
          remaining_amount = 0,
          paid_amount      = original_amount,
          status           = 'settled',
          updated_at       = CURRENT_TIMESTAMP
         WHERE id = ?`,
        [existingDebt.id]
      );
    }

    // 8. Recalculate customer total_purchases
    const customerId = input.customerId ?? origSale.customer_id;
    if (customerId) {
      await database.runAsync(
        `UPDATE customers SET
          total_purchases = MAX(0, total_purchases - ? + ?),
          updated_at      = CURRENT_TIMESTAMP
         WHERE id = ?`,
        [origSale.grand_total, input.grandTotal, customerId]
      );
    }

    // 9. Clear reports cache
    await database.runAsync('DELETE FROM reports_cache');
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
    globalDiscountType: ((row.global_discount_type as string) ?? 'none') as GlobalDiscountType,
    globalDiscount: (row.global_discount as number) ?? 0,
    grandTotal: row.grand_total as number,
    paidAmount: row.paid_amount as number,
    remainingDebt: row.remaining_debt as number,
    status: row.status as SaleStatus,
    exchangeRateUsed: (row.exchange_rate as number) ?? 1310,
    date: (row.date as string | null) ?? (row.created_at as string),
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
  let saleId = 0;

  await database.withTransactionAsync(async () => {
    // Validate stock for repeatable items before any writes.
    // Throwing here causes the transaction to roll back — nothing is written.
    for (const item of items) {
      if (item.idMode === 'unique') continue;
      const row = await database.getFirstAsync<{ quantity: number }>(
        'SELECT quantity FROM products WHERE id = ?',
        [item.productId]
      );
      const available = row?.quantity ?? 0;
      if (item.quantity > available) {
        throw new Error(`STOCK_EXCEEDED|${item.productName}|${available}|${item.quantity}`);
      }
    }

    const saleResult = await database.runAsync(
      `INSERT INTO sales (
        invoice_number, customer_id, customer_name, customer_phone,
        customer_address, warranty, notes, payment_method,
        subtotal, discount_total, global_discount_type, global_discount,
        grand_total, paid_amount, remaining_debt, status, exchange_rate, date, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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
        saleData.globalDiscountType ?? 'none',
        saleData.globalDiscount ?? 0,
        saleData.grandTotal,
        saleData.paidAmount,
        saleData.remainingDebt,
        saleData.status,
        saleData.exchangeRateUsed,
        saleData.date ?? new Date().toISOString(),
        saleData.date ?? new Date().toISOString(),
      ]
    );

    saleId = saleResult.lastInsertRowId;

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
        await archiveProductToHistory(database, item.productId, 'sold_out');
      } else {
        await database.runAsync(
          'UPDATE products SET quantity = MAX(0, quantity - ?), updated_at = CURRENT_TIMESTAMP WHERE id = ?',
          [item.quantity, item.productId]
        );
        const newQtyRow = await database.getFirstAsync<{ quantity: number }>(
          'SELECT quantity FROM products WHERE id = ?',
          [item.productId]
        );
        if ((newQtyRow?.quantity ?? 1) === 0) {
          await archiveProductToHistory(database, item.productId, 'sold_out');
        }
      }
      await enqueueSyncChange(item.productId, 'upsert');
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

  });

  return saleId;
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

export async function deleteSale(id: number): Promise<void> {
  const database = await getDatabase();

  await database.withTransactionAsync(async () => {
    const saleRow = await database.getFirstAsync<{ customer_id: number | null; grand_total: number }>(
      'SELECT customer_id, grand_total FROM sales WHERE id = ?', [id]
    );

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
      await enqueueSyncChange(item.productId, 'upsert');
    }

    await database.runAsync('DELETE FROM sales WHERE id = ?', [id]);

    if (saleRow?.customer_id && saleRow.grand_total > 0) {
      await database.runAsync(
        `UPDATE customers
         SET total_purchases = MAX(0, total_purchases - ?),
             updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
        [saleRow.grand_total, saleRow.customer_id]
      );
    }
  });
}

// ─── Suppliers ────────────────────────────────────────────────────────────────

function rowToSupplierWithStats(row: Record<string, unknown>): SupplierWithStats {
  return {
    id: row.id as number,
    name: row.name as string,
    phone: (row.phone as string | null) ?? null,
    address: (row.address as string | null) ?? null,
    notes: (row.notes as string | null) ?? null,
    totalSpent: (row.total_spent as number) ?? 0,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
    purchaseCount: (row.purchase_count as number) ?? 0,
    lastPurchaseDate: (row.last_purchase_date as string | null) ?? null,
  };
}

export async function upsertSupplier(input: {
  name: string;
  phone?: string | null;
  address?: string | null;
  selectedId?: number;
}): Promise<number> {
  if (input.selectedId) return input.selectedId;

  const database = await getDatabase();
  const trimName  = input.name.trim();
  if (!trimName) throw new Error('Supplier name is required');
  const trimPhone = input.phone?.trim() ?? null;

  if (trimPhone) {
    const byPhone = await database.getFirstAsync<{ id: number; name: string }>(
      'SELECT id, name FROM suppliers WHERE phone = ?',
      [trimPhone]
    );
    if (byPhone) throw new Error(`DUPLICATE_PHONE:${byPhone.name}`);
  }

  const byName = await database.getFirstAsync<{ id: number }>(
    'SELECT id FROM suppliers WHERE LOWER(TRIM(name)) = LOWER(TRIM(?))',
    [trimName]
  );
  if (byName) throw new Error('DUPLICATE_NAME');

  const result = await database.runAsync(
    'INSERT INTO suppliers (name, phone, address) VALUES (?, ?, ?)',
    [trimName, trimPhone, input.address?.trim() ?? null]
  );
  return result.lastInsertRowId;
}

export async function getAllSuppliersWithStats(): Promise<SupplierWithStats[]> {
  const database = await getDatabase();
  const rows = await database.getAllAsync<Record<string, unknown>>(
    `SELECT s.*,
            COUNT(DISTINCT p.id) AS purchase_count,
            COALESCE(SUM(p.total_iqd), 0) AS total_spent_calc,
            MAX(p.created_at) AS last_purchase_date
     FROM suppliers s
     LEFT JOIN purchases p ON LOWER(p.supplier_name) = LOWER(s.name) AND p.archived_at IS NULL
     GROUP BY s.id
     ORDER BY total_spent_calc DESC`
  );
  return rows.map((row) => ({
    ...rowToSupplierWithStats(row),
    totalSpent: (row.total_spent_calc as number) ?? (row.total_spent as number) ?? 0,
  }));
}

export async function searchSuppliersList(query: string, limit = 8): Promise<Supplier[]> {
  const database = await getDatabase();
  const q = `%${query}%`;
  const rows = await database.getAllAsync<Record<string, unknown>>(
    `SELECT id, name, phone, address, notes, total_spent, created_at, updated_at
     FROM suppliers
     WHERE name LIKE ? OR phone LIKE ?
     ORDER BY name ASC LIMIT ?`,
    [q, q, limit]
  );
  return rows.map((row) => ({
    id: row.id as number,
    name: row.name as string,
    phone: (row.phone as string | null) ?? null,
    address: (row.address as string | null) ?? null,
    notes: (row.notes as string | null) ?? null,
    totalSpent: (row.total_spent as number) ?? 0,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  }));
}

export async function updateSupplier(id: number, data: {
  name?: string;
  phone?: string | null;
  address?: string | null;
  notes?: string | null;
}): Promise<void> {
  const database = await getDatabase();

  if (data.name !== undefined) {
    const trimName = data.name.trim();
    const byName = await database.getFirstAsync<{ id: number }>(
      'SELECT id FROM suppliers WHERE LOWER(TRIM(name)) = LOWER(TRIM(?)) AND id != ?',
      [trimName, id]
    );
    if (byName) throw new Error('DUPLICATE_NAME');
    data = { ...data, name: trimName };
  }
  if (data.phone !== undefined && data.phone && data.phone.trim()) {
    const trimPhone = data.phone.trim();
    const byPhone = await database.getFirstAsync<{ id: number; name: string }>(
      'SELECT id, name FROM suppliers WHERE phone = ? AND id != ?',
      [trimPhone, id]
    );
    if (byPhone) throw new Error(`DUPLICATE_PHONE:${byPhone.name}`);
    data = { ...data, phone: trimPhone };
  }

  const fields: string[] = [];
  const values: unknown[] = [];
  if (data.name !== undefined)    { fields.push('name = ?');    values.push(data.name); }
  if (data.phone !== undefined)   { fields.push('phone = ?');   values.push(data.phone); }
  if (data.address !== undefined) { fields.push('address = ?'); values.push(data.address); }
  if (data.notes !== undefined)   { fields.push('notes = ?');   values.push(data.notes); }
  if (fields.length === 0) return;
  fields.push('updated_at = CURRENT_TIMESTAMP');
  values.push(id);
  await database.runAsync(`UPDATE suppliers SET ${fields.join(', ')} WHERE id = ?`, values);
}

export async function deleteSupplier(id: number): Promise<void> {
  const database = await getDatabase();
  const debtCheck = await database.getFirstAsync<{ cnt: number }>(
    `SELECT COUNT(*) AS cnt FROM purchase_debts WHERE supplier_name = (SELECT name FROM suppliers WHERE id = ?) AND status = 'active'`,
    [id]
  );
  if ((debtCheck?.cnt ?? 0) > 0) throw new Error('SUPPLIER_HAS_ACTIVE_DEBTS');

  const purchaseCheck = await database.getFirstAsync<{ cnt: number }>(
    `SELECT COUNT(*) AS cnt FROM purchases WHERE LOWER(supplier_name) = LOWER((SELECT name FROM suppliers WHERE id = ?))`,
    [id]
  );
  if ((purchaseCheck?.cnt ?? 0) > 0) throw new Error('SUPPLIER_HAS_PURCHASES');

  await database.runAsync('DELETE FROM suppliers WHERE id = ?', [id]);
}

export async function getTopSuppliers(limit = 5): Promise<Array<{ name: string; phone: string | null; totalSpent: number; purchaseCount: number }>> {
  const database = await getDatabase();
  const rows = await database.getAllAsync<{ supplier_name: string; supplier_phone: string | null; total_spent: number; purchase_count: number }>(
    `SELECT supplier_name, supplier_phone,
            SUM(total_iqd) AS total_spent,
            COUNT(*) AS purchase_count
     FROM purchases
     WHERE supplier_name IS NOT NULL AND supplier_name != '' AND archived_at IS NULL
     GROUP BY supplier_name
     ORDER BY total_spent DESC
     LIMIT ?`,
    [limit]
  );
  return rows.map((r) => ({
    name: r.supplier_name,
    phone: r.supplier_phone ?? null,
    totalSpent: r.total_spent ?? 0,
    purchaseCount: r.purchase_count ?? 0,
  }));
}

export async function getPurchasesBySupplierName(supplierName: string): Promise<Purchase[]> {
  const database = await getDatabase();
  const rows = await database.getAllAsync<Record<string, unknown>>(
    'SELECT * FROM purchases WHERE LOWER(supplier_name) = LOWER(?) AND archived_at IS NULL ORDER BY created_at DESC',
    [supplierName]
  );
  return rows.map(rowToPurchase);
}

// ─── Purchases ────────────────────────────────────────────────────────────────

export async function generatePurchaseNumber(): Promise<string> {
  const database = await getDatabase();
  let purchaseNumber = '';

  await database.withTransactionAsync(async () => {
    const row = await database.getFirstAsync<{ last_number: number }>(
      'SELECT last_number FROM purchase_counter WHERE id = 1'
    );

    const nextNumber = (row?.last_number ?? 0) + 1;

    await database.runAsync(
      'UPDATE purchase_counter SET last_number = ? WHERE id = 1',
      [nextNumber]
    );

    purchaseNumber = String(nextNumber).padStart(4, '0');
  });

  return purchaseNumber;
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
    'SELECT * FROM purchases WHERE archived_at IS NULL ORDER BY created_at DESC'
  );
  return rows.map(rowToPurchase);
}

export async function getPurchaseById(id: number): Promise<Purchase | null> {
  const database = await getDatabase();
  const row = await database.getFirstAsync<Record<string, unknown>>(
    'SELECT * FROM purchases WHERE id = ?', [id]
  );
  if (!row) return null;

  const purchase = rowToPurchase(row);
  const productRow = await database.getFirstAsync<{ image_uri: string | null }>(
    'SELECT image_uri FROM products WHERE purchase_id = ? ORDER BY id ASC LIMIT 1', [id]
  );
  purchase.imageUri = productRow?.image_uri ?? null;
  return purchase;
}

// Sold quantity for a purchase = units sold from products still linked via purchase_id,
// plus a fallback for products that were manually deleted from Inventory after being sold
// (their purchase_id is preserved on the inventory_history snapshot instead).
export async function getSoldQuantityForPurchase(purchaseId: number): Promise<number> {
  const database = await getDatabase();

  const liveRow = await database.getFirstAsync<{ total: number }>(
    `SELECT COALESCE(SUM(si.quantity), 0) AS total
     FROM sale_items si
     JOIN products p ON p.id = si.product_id
     WHERE p.purchase_id = ?`,
    [purchaseId]
  );

  const orphanRow = await database.getFirstAsync<{ total: number }>(
    `SELECT COALESCE(SUM(ih.quantity_sold), 0) AS total
     FROM inventory_history ih
     WHERE ih.purchase_id = ?
       AND ih.product_id NOT IN (SELECT id FROM products)`,
    [purchaseId]
  );

  return (liveRow?.total ?? 0) + (orphanRow?.total ?? 0);
}

export interface PurchaseActor {
  id: string | null;
  name: string | null;
}

export async function archivePurchase(id: number, actor: PurchaseActor): Promise<void> {
  const database = await getDatabase();

  await database.withTransactionAsync(async () => {
    const existing = await database.getFirstAsync<Record<string, unknown>>(
      'SELECT * FROM purchases WHERE id = ?', [id]
    );
    if (!existing) throw new Error('Purchase not found');
    if (existing.archived_at) return;

    const soldQty = await getSoldQuantityForPurchase(id);
    if (soldQty > 0) throw new Error('PURCHASE_HAS_SALES');

    const activeDebt = await database.getFirstAsync<{ id: number }>(
      `SELECT id FROM purchase_debts WHERE purchase_id = ? AND status = 'active'`, [id]
    );
    if (activeDebt) throw new Error('PURCHASE_HAS_ACTIVE_DEBT');

    const productRows = await database.getAllAsync<{ id: number }>(
      'SELECT id FROM products WHERE purchase_id = ?', [id]
    );
    for (const row of productRows) {
      await archiveProductToHistory(database, row.id, 'removed');
      await database.runAsync('DELETE FROM products WHERE id = ?', [row.id]);
      await enqueueSyncChange(row.id, 'delete');
    }

    await database.runAsync(
      'UPDATE purchases SET archived_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [id]
    );

    await database.runAsync(
      `INSERT INTO purchase_audit_log (purchase_id, action, changed_fields, old_values, new_values, actor_id, actor_name)
       VALUES (?, 'archive', '[]', '{}', '{}', ?, ?)`,
      [id, actor.id, actor.name]
    );
  });
}

export interface UpdatePurchaseInput {
  date?: string;
  productName?: string;
  category?: string | null;
  quantity?: number;
  buyPriceIQD?: number;
  buyPriceUSD?: number;
  sellPriceIQD?: number;
  sellPriceUSD?: number;
  warranty?: string | null;
  description?: string | null;
  notes?: string | null;
  paymentStatus?: 'paid' | 'debt';
  imageUri?: string | null;
}

// Pushes the fields shared between a purchase and its linked product(s) onto the
// live `products` row(s) — keeps Inventory/Search/Reports/Sales/Dashboard in sync
// when these are edited from the Purchase side, since they all read from `products`.
async function propagateToProducts(
  database: SQLite.SQLiteDatabase,
  purchaseId: number,
  fields: {
    name?: string; category?: string | null;
    sellingPrice?: number; sellPriceUsd?: number;
    warranty?: string | null; description?: string | null; notes?: string | null;
    imageUri?: string | null;
  }
): Promise<void> {
  const setClauses: string[] = [];
  const values: unknown[] = [];
  if (fields.name !== undefined)         { setClauses.push('name = ?');           values.push(fields.name); }
  if (fields.category !== undefined)     { setClauses.push('category = ?');       values.push(fields.category); }
  if (fields.sellingPrice !== undefined) { setClauses.push('selling_price = ?');  values.push(fields.sellingPrice); }
  if (fields.sellPriceUsd !== undefined) { setClauses.push('sell_price_usd = ?'); values.push(fields.sellPriceUsd); }
  if (fields.warranty !== undefined)     { setClauses.push('warranty = ?');       values.push(fields.warranty); }
  if (fields.description !== undefined) { setClauses.push('description = ?');    values.push(fields.description); }
  if (fields.notes !== undefined)        { setClauses.push('notes = ?');          values.push(fields.notes); }
  if (fields.imageUri !== undefined)     { setClauses.push('image_uri = ?', 'image_remote_url = NULL'); values.push(fields.imageUri); }
  if (setClauses.length === 0) return;
  setClauses.push('updated_at = CURRENT_TIMESTAMP');
  values.push(purchaseId);
  await database.runAsync(
    `UPDATE products SET ${setClauses.join(', ')} WHERE purchase_id = ?`,
    values as SQLite.SQLiteBindValue[]
  );
}

// Reverse direction — pushes shared fields from a product edit back onto the
// purchase header and its purchase_items mirror, so Purchase History/Detail stay
// fresh when these are edited from the Inventory side. purchase_items has no
// warranty/description/notes/image columns, so those only land on `purchases`.
async function propagateToPurchase(
  database: SQLite.SQLiteDatabase,
  purchaseId: number,
  fields: {
    name?: string; category?: string | null;
    sellPriceIQD?: number; sellPriceUSD?: number;
    warranty?: string | null; description?: string | null; notes?: string | null;
  }
): Promise<void> {
  const pFields: string[] = [];
  const pValues: unknown[] = [];
  if (fields.name !== undefined)         { pFields.push('product_name = ?'); pValues.push(fields.name); }
  if (fields.category !== undefined)     { pFields.push('category = ?');     pValues.push(fields.category); }
  if (fields.sellPriceIQD !== undefined) { pFields.push('sell_price_iqd = ?'); pValues.push(fields.sellPriceIQD); }
  if (fields.sellPriceUSD !== undefined) { pFields.push('sell_price_usd = ?'); pValues.push(fields.sellPriceUSD); }
  if (fields.warranty !== undefined)     { pFields.push('warranty = ?');     pValues.push(fields.warranty); }
  if (fields.description !== undefined) { pFields.push('description = ?');  pValues.push(fields.description); }
  if (fields.notes !== undefined)        { pFields.push('notes = ?');        pValues.push(fields.notes); }
  if (pFields.length > 0) {
    pFields.push('updated_at = CURRENT_TIMESTAMP');
    pValues.push(purchaseId);
    await database.runAsync(`UPDATE purchases SET ${pFields.join(', ')} WHERE id = ?`, pValues as SQLite.SQLiteBindValue[]);
  }

  const piFields: string[] = [];
  const piValues: unknown[] = [];
  if (fields.name !== undefined)         { piFields.push('product_name = ?'); piValues.push(fields.name); }
  if (fields.category !== undefined)     { piFields.push('category = ?');     piValues.push(fields.category); }
  if (fields.sellPriceIQD !== undefined) { piFields.push('sell_price_iqd = ?'); piValues.push(fields.sellPriceIQD); }
  if (fields.sellPriceUSD !== undefined) { piFields.push('sell_price_usd = ?'); piValues.push(fields.sellPriceUSD); }
  if (piFields.length > 0) {
    piValues.push(purchaseId);
    await database.runAsync(`UPDATE purchase_items SET ${piFields.join(', ')} WHERE purchase_id = ?`, piValues as SQLite.SQLiteBindValue[]);
  }
}

export async function updatePurchase(id: number, input: UpdatePurchaseInput, actor: PurchaseActor): Promise<void> {
  const database = await getDatabase();

  await database.withTransactionAsync(async () => {
    const existing = await database.getFirstAsync<Record<string, unknown>>(
      'SELECT * FROM purchases WHERE id = ?', [id]
    );
    if (!existing) throw new Error('Purchase not found');

    const oldStatus = existing.payment_status as string;
    const oldQty    = existing.quantity as number;
    const idType    = (existing.id_type as PurchaseIdType | null) ?? null;
    const newQty    = input.quantity ?? oldQty;

    // Validate the quantity transition before writing anything.
    if (input.quantity !== undefined && newQty !== oldQty) {
      if (newQty < 0) throw new Error('QUANTITY_INVALID');
      const soldQty = await getSoldQuantityForPurchase(id);
      if (newQty < soldQty) throw new Error(`QUANTITY_BELOW_SOLD|${soldQty}`);
      if (idType === 'custom' && newQty > oldQty) throw new Error('CUSTOM_QTY_INCREASE_UNSUPPORTED');
    }

    const newBuy    = input.buyPriceIQD  ?? (existing.buy_price_iqd  as number);
    const newSell   = input.sellPriceIQD ?? (existing.sell_price_iqd as number);
    const newTotal  = newQty * newBuy;
    const newProfit = (newSell - newBuy) * newQty;

    const fields: string[] = [];
    const values: unknown[] = [];
    if (input.date        !== undefined) { fields.push('date = ?');          values.push(input.date); }
    if (input.productName !== undefined) { fields.push('product_name = ?');  values.push(input.productName); }
    if (input.category    !== undefined) { fields.push('category = ?');      values.push(input.category); }
    if (input.quantity    !== undefined) { fields.push('quantity = ?');      values.push(newQty); }
    if (input.buyPriceIQD !== undefined) { fields.push('buy_price_iqd = ?'); values.push(input.buyPriceIQD); }
    if (input.buyPriceUSD !== undefined) { fields.push('buy_price_usd = ?'); values.push(input.buyPriceUSD); }
    if (input.sellPriceIQD !== undefined){ fields.push('sell_price_iqd = ?');values.push(input.sellPriceIQD); }
    if (input.sellPriceUSD !== undefined){ fields.push('sell_price_usd = ?');values.push(input.sellPriceUSD); }
    if (input.warranty    !== undefined) { fields.push('warranty = ?');      values.push(input.warranty); }
    if (input.description !== undefined) { fields.push('description = ?');   values.push(input.description); }
    if (input.notes       !== undefined) { fields.push('notes = ?');         values.push(input.notes); }
    if (input.paymentStatus !== undefined) { fields.push('payment_status = ?'); values.push(input.paymentStatus); }

    fields.push('total_iqd = ?',  'profit_iqd = ?', 'updated_at = CURRENT_TIMESTAMP');
    values.push(newTotal, newProfit, id);

    await database.runAsync(`UPDATE purchases SET ${fields.join(', ')} WHERE id = ?`, values as SQLite.SQLiteBindValue[]);

    await propagateToProducts(database, id, {
      name: input.productName,
      category: input.category,
      sellingPrice: input.sellPriceIQD,
      sellPriceUsd: input.sellPriceUSD,
      warranty: input.warranty,
      description: input.description,
      notes: input.notes,
      imageUri: input.imageUri,
    });

    // Quantity-driven stock sync — never allow negative inventory.
    if (input.quantity !== undefined && newQty !== oldQty) {
      const delta = newQty - oldQty;
      if (idType === 'custom') {
        // Increase was already blocked above; only decrease reaches here.
        const unsold = await database.getAllAsync<{ id: number }>(
          `SELECT id FROM products WHERE purchase_id = ? AND is_active = 1 AND quantity > 0 ORDER BY id ASC LIMIT ?`,
          [id, Math.abs(delta)]
        );
        if (unsold.length < Math.abs(delta)) throw new Error('INSUFFICIENT_UNSOLD_ITEMS');
        for (const row of unsold) {
          await archiveProductToHistory(database, row.id, 'removed');
          await database.runAsync('DELETE FROM products WHERE id = ?', [row.id]);
          await enqueueSyncChange(row.id, 'delete');
        }
      } else {
        await database.runAsync(
          'UPDATE products SET quantity = MAX(0, quantity + ?), updated_at = CURRENT_TIMESTAMP WHERE purchase_id = ?',
          [delta, id]
        );
      }
    }

    // Cost propagation — keeps Inventory Value, Profit, Sales Analytics, and every
    // report correct immediately without touching a single report query, since they
    // all read live from products.purchase_price / sale_items.purchase_price.
    if (input.buyPriceIQD !== undefined || input.buyPriceUSD !== undefined) {
      const newBuyUsd = input.buyPriceUSD ?? (existing.buy_price_usd as number);
      await database.runAsync(
        'UPDATE products SET purchase_price = ?, buy_price_usd = ?, updated_at = CURRENT_TIMESTAMP WHERE purchase_id = ?',
        [newBuy, newBuyUsd, id]
      );
      await database.runAsync(
        `UPDATE sale_items SET purchase_price = ? WHERE product_id IN (SELECT id FROM products WHERE purchase_id = ?)`,
        [newBuy, id]
      );
    }

    // Online Store sync — any product still tied to this purchase may have just had
    // its name, quantity, or price touched above; re-queue all of them in one pass
    // rather than tracking every individual branch that can mutate products here.
    const syncRows = await database.getAllAsync<{ id: number }>(
      'SELECT id FROM products WHERE purchase_id = ?', [id]
    );
    for (const row of syncRows) await enqueueSyncChange(row.id, 'upsert');

    // Keep the purchase_items mirror row in sync (read by the purchase detail screen).
    {
      const piFields: string[] = [];
      const piValues: unknown[] = [];
      if (input.productName  !== undefined) { piFields.push('product_name = ?');  piValues.push(input.productName); }
      if (input.category     !== undefined) { piFields.push('category = ?');      piValues.push(input.category); }
      if (input.quantity     !== undefined) { piFields.push('quantity = ?');       piValues.push(newQty); }
      if (input.buyPriceIQD  !== undefined) { piFields.push('buy_price_iqd = ?');  piValues.push(input.buyPriceIQD); }
      if (input.buyPriceUSD  !== undefined) { piFields.push('buy_price_usd = ?');  piValues.push(input.buyPriceUSD); }
      if (input.sellPriceIQD !== undefined) { piFields.push('sell_price_iqd = ?'); piValues.push(input.sellPriceIQD); }
      if (input.sellPriceUSD !== undefined) { piFields.push('sell_price_usd = ?'); piValues.push(input.sellPriceUSD); }
      piFields.push('line_total_iqd = ?');
      piValues.push(newTotal, id);
      await database.runAsync(
        `UPDATE purchase_items SET ${piFields.join(', ')} WHERE purchase_id = ?`,
        piValues as SQLite.SQLiteBindValue[]
      );
    }

    if (input.paymentStatus !== undefined && input.paymentStatus !== oldStatus) {
      if (input.paymentStatus === 'paid') {
        await database.runAsync(
          `UPDATE purchase_debts SET status = 'settled', remaining_amount = 0, updated_at = CURRENT_TIMESTAMP
           WHERE purchase_id = ?`,
          [id]
        );
      } else if (input.paymentStatus === 'debt') {
        const existingDebt = await database.getFirstAsync<{ id: number }>(
          'SELECT id FROM purchase_debts WHERE purchase_id = ?', [id]
        );
        if (!existingDebt) {
          const suppName = (existing.supplier_name as string | null) ?? '';
          const suppPhone = (existing.supplier_phone as string | null) ?? null;
          await database.runAsync(
            `INSERT INTO purchase_debts (purchase_id, supplier_name, supplier_phone, original_amount, paid_amount, remaining_amount, status)
             VALUES (?, ?, ?, ?, 0, ?, 'active')`,
            [id, suppName, suppPhone, newTotal, newTotal]
          );
        } else {
          await database.runAsync(
            `UPDATE purchase_debts SET status = 'active', remaining_amount = original_amount, updated_at = CURRENT_TIMESTAMP
             WHERE purchase_id = ?`,
            [id]
          );
        }
      }
    } else if (input.buyPriceIQD !== undefined) {
      await database.runAsync(
        `UPDATE purchase_debts SET original_amount = ?, remaining_amount = MAX(0, ? - paid_amount), updated_at = CURRENT_TIMESTAMP
         WHERE purchase_id = ? AND status = 'active'`,
        [newTotal, newTotal, id]
      );
    }

    // Audit log — record only the fields that actually changed.
    const fieldMap: Array<[string, unknown, unknown]> = [
      ['date', existing.date, input.date],
      ['productName', existing.product_name, input.productName],
      ['category', existing.category, input.category],
      ['quantity', oldQty, input.quantity],
      ['buyPriceIQD', existing.buy_price_iqd, input.buyPriceIQD],
      ['buyPriceUSD', existing.buy_price_usd, input.buyPriceUSD],
      ['sellPriceIQD', existing.sell_price_iqd, input.sellPriceIQD],
      ['sellPriceUSD', existing.sell_price_usd, input.sellPriceUSD],
      ['warranty', existing.warranty, input.warranty],
      ['description', existing.description, input.description],
      ['notes', existing.notes, input.notes],
      ['paymentStatus', existing.payment_status, input.paymentStatus],
    ];

    const changedFields: string[] = [];
    const oldValues: Record<string, unknown> = {};
    const newValues: Record<string, unknown> = {};
    for (const [key, oldVal, newVal] of fieldMap) {
      if (newVal === undefined || newVal === oldVal) continue;
      changedFields.push(key);
      oldValues[key] = oldVal;
      newValues[key] = newVal;
    }

    if (changedFields.length > 0) {
      await database.runAsync(
        `INSERT INTO purchase_audit_log (purchase_id, action, changed_fields, old_values, new_values, actor_id, actor_name)
         VALUES (?, 'update', ?, ?, ?, ?, ?)`,
        [id, JSON.stringify(changedFields), JSON.stringify(oldValues), JSON.stringify(newValues), actor.id, actor.name]
      );
    }
  });
}

// ─── Debt Management ──────────────────────────────────────────────────────────

export interface DebtWithContext extends Debt {
  invoiceNumber: string;
  saleGrandTotal: number;
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
  const cutoff = `date('now', 'localtime', '-${months} months')`;

  const [revenueRows, profitRows] = await Promise.all([
    database.getAllAsync<{ period: string; revenue: number; sales: number }>(
      `SELECT strftime('%Y-%m', created_at, 'localtime') AS period,
              COALESCE(SUM(paid_amount), 0) AS revenue,
              COUNT(*) AS sales
       FROM sales WHERE date(created_at, 'localtime') >= ${cutoff}
       GROUP BY period ORDER BY period ASC`
    ),
    database.getAllAsync<{ period: string; profit: number }>(
      `SELECT strftime('%Y-%m', s.created_at, 'localtime') AS period,
              COALESCE(SUM(s.grand_total - cogs.total_cost), 0) AS profit
       FROM (SELECT sale_id, SUM(purchase_price * quantity) AS total_cost FROM sale_items GROUP BY sale_id) cogs
       JOIN sales s ON s.id = cogs.sale_id
       WHERE date(s.created_at, 'localtime') >= ${cutoff}
       GROUP BY period ORDER BY period ASC`
    ),
  ]);

  const profitMap = new Map(profitRows.map((r) => [r.period, r.profit]));
  return revenueRows.map((r) => ({
    period:  r.period,
    revenue: r.revenue,
    profit:  profitMap.get(r.period) ?? 0,
    sales:   r.sales,
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
    paidAmount?: number;
    notes: string | null;
  }
): Promise<number> {
  const database = await getDatabase();
  const actualPaid = Math.min(Math.max(0, data.paidAmount ?? 0), data.originalAmount);
  const remaining  = data.originalAmount - actualPaid;
  const status     = remaining <= 0 ? 'settled' : 'active';

  const result = await database.runAsync(
    `INSERT INTO purchase_debts
       (purchase_id, supplier_name, supplier_phone, supplier_address, purchase_number,
        original_amount, paid_amount, remaining_amount, status, notes)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      purchaseId,
      data.supplierName,
      data.supplierPhone,
      data.supplierAddress,
      data.purchaseNumber,
      data.originalAmount,
      actualPaid,
      remaining,
      status,
      data.notes,
    ]
  );

  if (actualPaid > 0) {
    await database.runAsync(
      `INSERT INTO debt_payments (debt_id, debt_type, amount, remaining_after, note, created_at)
       VALUES (?, 'purchase', ?, ?, 'Initial payment', CURRENT_TIMESTAMP)`,
      [result.lastInsertRowId, actualPaid, remaining]
    );
  }

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

export async function addPaymentToPurchaseDebt(id: number, amount: number, paymentDate?: string): Promise<void> {
  const database = await getDatabase();
  const ts = paymentDate ?? new Date().toISOString();
  await database.withTransactionAsync(async () => {
    const debt = await database.getFirstAsync<{ remaining_amount: number; purchase_id: number | null }>(
      'SELECT remaining_amount, purchase_id FROM purchase_debts WHERE id = ?', [id]
    );
    if (!debt) return;

    const clamped = Math.min(amount, debt.remaining_amount);
    const newRemaining = Math.max(0, debt.remaining_amount - clamped);

    await database.runAsync(
      `UPDATE purchase_debts SET
        paid_amount = paid_amount + ?,
        remaining_amount = ?,
        status = CASE WHEN ? <= 0 THEN 'settled' ELSE 'active' END,
        last_payment_at = ?,
        updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [clamped, newRemaining, newRemaining, ts, id]
    );

    await database.runAsync(
      `INSERT INTO debt_payments (debt_id, debt_type, amount, remaining_after, created_at)
       VALUES (?, 'purchase', ?, ?, ?)`,
      [id, clamped, newRemaining, ts]
    );

    if (newRemaining <= 0 && debt.purchase_id != null) {
      await database.runAsync(
        `UPDATE purchases SET payment_status = 'paid', updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
        [debt.purchase_id]
      );
      await database.runAsync(
        `UPDATE products SET payment_status = 'paid', updated_at = CURRENT_TIMESTAMP WHERE purchase_id = ?`,
        [debt.purchase_id]
      );
    }
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
  const hasRange   = Boolean(from && to);
  const saleWhere  = hasRange ? `WHERE created_at >= ? AND created_at <= ?` : '';
  const saleWhere2 = hasRange ? `WHERE s.created_at >= ? AND s.created_at <= ?` : '';
  const rangeParams: string[] = hasRange ? [from as string, to as string] : [];

  const [salesRow, itemsRow] = await Promise.all([
    database.getFirstAsync<Record<string, number>>(`
      SELECT
        COALESCE(SUM(paid_amount), 0)                                              AS totalRevenue,
        COUNT(*)                                                                    AS totalSales,
        COALESCE(SUM(discount_total + COALESCE(global_discount, 0)), 0)            AS totalDiscounts,
        COALESCE(SUM(CASE WHEN payment_method='cash' THEN paid_amount END), 0)    AS cashRevenue,
        COALESCE(SUM(CASE WHEN payment_method='fib'  THEN paid_amount END), 0)    AS fibRevenue,
        COALESCE(SUM(CASE WHEN payment_method='debt' THEN paid_amount END), 0)    AS debtRevenue,
        COUNT(CASE WHEN payment_method='cash' THEN 1 END)                         AS cashCount,
        COUNT(CASE WHEN payment_method='fib'  THEN 1 END)                         AS fibCount,
        COUNT(CASE WHEN payment_method='debt' THEN 1 END)                         AS debtCount
      FROM sales ${saleWhere}
    `, rangeParams),
    database.getFirstAsync<{ totalItemsSold: number }>(`
      SELECT COALESCE(SUM(si.quantity), 0) AS totalItemsSold
      FROM sale_items si JOIN sales s ON s.id = si.sale_id ${saleWhere2}
    `, rangeParams),
  ]);

  const rev = salesRow?.totalRevenue ?? 0;
  const cnt = salesRow?.totalSales   ?? 0;
  return {
    totalRevenue:   rev,
    totalSales:     cnt,
    totalItemsSold: itemsRow?.totalItemsSold ?? 0,
    totalDiscounts: salesRow?.totalDiscounts ?? 0,
    cashRevenue:    salesRow?.cashRevenue    ?? 0,
    fibRevenue:     salesRow?.fibRevenue     ?? 0,
    debtRevenue:    salesRow?.debtRevenue    ?? 0,
    cashCount:      salesRow?.cashCount      ?? 0,
    fibCount:       salesRow?.fibCount       ?? 0,
    debtCount:      salesRow?.debtCount      ?? 0,
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
  const saleLevelWhere = from && to
    ? `WHERE status != 'cancelled' AND created_at >= '${from}' AND created_at <= '${to}'`
    : `WHERE status != 'cancelled'`;
  const itemLevelWhere = from && to
    ? `WHERE s.status != 'cancelled' AND s.created_at >= '${from}' AND s.created_at <= '${to}'`
    : `WHERE s.status != 'cancelled'`;
  const expWhere = from && to
    ? `WHERE date >= '${from.slice(0, 10)}' AND date <= '${to.slice(0, 10)}'`
    : '';

  const [revenueRow, cogsRow] = await Promise.all([
    database.getFirstAsync<{ grossRevenue: number }>(
      `SELECT COALESCE(SUM(grand_total), 0) AS grossRevenue FROM sales ${saleLevelWhere}`
    ),
    database.getFirstAsync<{ totalCOGS: number }>(
      `SELECT COALESCE(SUM(si.purchase_price * si.quantity), 0) AS totalCOGS
       FROM sale_items si JOIN sales s ON s.id = si.sale_id ${itemLevelWhere}`
    ),
  ]);
  const salesRow = {
    grossRevenue: revenueRow?.grossRevenue ?? 0,
    totalCOGS:    cogsRow?.totalCOGS       ?? 0,
  };
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

export interface FinancialSummaryCards {
  totalSales: number;
  netProfit: number;
  totalLoss: number;
  remainingCustomerDebt: number;
}

export async function getFinancialSummaryCards(
  from?: string,
  to?: string,
): Promise<FinancialSummaryCards> {
  const database = await getDatabase();
  const saleLevelWhere = from && to
    ? `WHERE status = 'completed' AND created_at >= '${from}' AND created_at <= '${to}'`
    : `WHERE status = 'completed'`;
  const itemLevelWhere = from && to
    ? `WHERE s.status = 'completed' AND s.created_at >= '${from}' AND s.created_at <= '${to}'`
    : `WHERE s.status = 'completed'`;

  const [totalsRow, profitRow, debtRow] = await Promise.all([
    database.getFirstAsync<{ totalSales: number }>(
      `SELECT COALESCE(SUM(grand_total), 0) AS totalSales FROM sales ${saleLevelWhere}`
    ),
    database.getFirstAsync<{ netProfit: number; totalLoss: number }>(`
      SELECT
        COALESCE(SUM(CASE WHEN sale_profit > 0 THEN sale_profit ELSE 0 END), 0) AS netProfit,
        COALESCE(SUM(CASE WHEN sale_profit < 0 THEN -sale_profit ELSE 0 END), 0) AS totalLoss
      FROM (
        SELECT s.grand_total - COALESCE(cogs.total_cost, 0) AS sale_profit
        FROM sales s
        LEFT JOIN (
          SELECT sale_id, SUM(purchase_price * quantity) AS total_cost
          FROM sale_items GROUP BY sale_id
        ) cogs ON cogs.sale_id = s.id
        ${itemLevelWhere}
      )
    `),
    database.getFirstAsync<{ remaining: number }>(
      `SELECT COALESCE(SUM(remaining_amount), 0) AS remaining FROM debts WHERE status = 'active'`
    ),
  ]);

  return {
    totalSales:            totalsRow?.totalSales   ?? 0,
    netProfit:             profitRow?.netProfit     ?? 0,
    totalLoss:             profitRow?.totalLoss     ?? 0,
    remainingCustomerDebt: debtRow?.remaining       ?? 0,
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
      SUM(si.line_total * s.grand_total / NULLIF(s.subtotal - s.discount_total, 0))                                                       AS total_revenue,
      SUM(si.purchase_price * si.quantity)                                                                                                 AS total_cost,
      SUM(si.line_total * s.grand_total / NULLIF(s.subtotal - s.discount_total, 0) - si.purchase_price * si.quantity)                      AS gross_profit
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

// ─── Loss Analysis ────────────────────────────────────────────────────────────

export interface LossAnalysis {
  totalLossAmount: number;
  lossSaleCount:   number;
  lossItemCount:   number;
  topLossProducts: { productName: string; lossAmount: number; qty: number }[];
}

export async function getLossAnalysis(from?: string, to?: string): Promise<LossAnalysis> {
  const database = await getDatabase();
  const dateFilter = from && to
    ? `AND s.created_at >= '${from}' AND s.created_at <= '${to}'`
    : '';

  const summaryRow = await database.getFirstAsync<Record<string, number>>(`
    SELECT
      COUNT(DISTINCT si.sale_id)                                              AS lossSaleCount,
      COUNT(*)                                                                AS lossItemCount,
      COALESCE(SUM((si.purchase_price - si.selling_price) * si.quantity), 0) AS totalLossAmount
    FROM sale_items si
    JOIN sales s ON s.id = si.sale_id
    WHERE si.purchase_price > si.selling_price
      AND s.status = 'completed'
      ${dateFilter}
  `);

  const productRows = await database.getAllAsync<Record<string, unknown>>(`
    SELECT
      si.product_name,
      COALESCE(SUM((si.purchase_price - si.selling_price) * si.quantity), 0) AS lossAmount,
      SUM(si.quantity) AS qty
    FROM sale_items si
    JOIN sales s ON s.id = si.sale_id
    WHERE si.purchase_price > si.selling_price
      AND s.status = 'completed'
      ${dateFilter}
    GROUP BY si.product_name
    ORDER BY lossAmount DESC
    LIMIT 5
  `);

  return {
    totalLossAmount: summaryRow?.totalLossAmount ?? 0,
    lossSaleCount:   summaryRow?.lossSaleCount   ?? 0,
    lossItemCount:   summaryRow?.lossItemCount   ?? 0,
    topLossProducts: productRows.map((r) => ({
      productName: r.product_name as string,
      lossAmount:  r.lossAmount   as number,
      qty:         r.qty          as number,
    })),
  };
}

// ─── Expenses ─────────────────────────────────────────────────────────────────

export interface Expense {
  id: number;
  amount: number;
  category: string;      // kept for report grouping; not shown in UI
  reason: string | null; // primary description — what the money was spent on
  note: string | null;   // optional secondary note
  date: string;
  createdAt: string;
  updatedAt: string;
}

export async function createExpense(data: {
  amount: number;
  category: string;
  reason: string;
  note?: string;
  date?: string;
}): Promise<number> {
  const database = await getDatabase();
  const result = await database.runAsync(
    `INSERT INTO expenses (amount, category, reason, note, date) VALUES (?, ?, ?, ?, ?)`,
    [
      data.amount,
      data.category,
      data.reason,
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
    reason:    (r.reason as string | null) ?? null,
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

export async function updateExpense(
  id: number,
  data: { amount: number; category: string; reason: string; note?: string; date?: string }
): Promise<void> {
  const database = await getDatabase();
  await database.runAsync(
    `UPDATE expenses SET amount = ?, category = ?, reason = ?, note = ?, date = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
    [data.amount, data.category, data.reason, data.note ?? null, data.date ?? new Date().toISOString().slice(0, 10), id]
  );
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

// ─── Net Cash Balance ─────────────────────────────────────────────────────────

export interface NetCashBalanceData {
  cashReceived: number;       // sum(sales.paid_amount) — actual collected cash
  expensesTotal: number;      // sum(expenses.amount)
  unpaidCustomerDebt: number; // sum(debts.remaining_amount where active)
  netBalance: number;         // cashReceived - expensesTotal
}

export async function getNetCashBalance(): Promise<NetCashBalanceData> {
  const database = await getDatabase();

  const [cashRow, expRow, unpaidDebtRow] = await Promise.all([
    database.getFirstAsync<{ v: number }>(
      `SELECT COALESCE(SUM(paid_amount), 0) AS v FROM sales`
    ),
    database.getFirstAsync<{ v: number }>(
      `SELECT COALESCE(SUM(amount), 0) AS v FROM expenses`
    ),
    database.getFirstAsync<{ v: number }>(
      `SELECT COALESCE(SUM(remaining_amount), 0) AS v FROM debts WHERE status = 'active'`
    ),
  ]);

  const cashReceived       = cashRow?.v ?? 0;
  const expensesTotal      = expRow?.v  ?? 0;
  const unpaidCustomerDebt = unpaidDebtRow?.v ?? 0;
  const netBalance         = cashReceived - expensesTotal;

  return { cashReceived, expensesTotal, unpaidCustomerDebt, netBalance };
}

export async function getDashboardExpenseTotals(): Promise<{
  today: number;
  weekly: number;
  monthly: number;
  yearly: number;
}> {
  const database = await getDatabase();
  const now = new Date();
  const todayStr   = now.toISOString().slice(0, 10);
  const weekAgo    = new Date(now); weekAgo.setDate(now.getDate() - 7);
  const monthAgo   = new Date(now); monthAgo.setMonth(now.getMonth() - 1);
  const yearAgo    = new Date(now); yearAgo.setFullYear(now.getFullYear() - 1);

  const [todayRow, weekRow, monthRow, yearRow] = await Promise.all([
    database.getFirstAsync<{ v: number }>(
      `SELECT COALESCE(SUM(amount), 0) AS v FROM expenses WHERE date = ?`,
      [todayStr]
    ),
    database.getFirstAsync<{ v: number }>(
      `SELECT COALESCE(SUM(amount), 0) AS v FROM expenses WHERE date >= ?`,
      [weekAgo.toISOString().slice(0, 10)]
    ),
    database.getFirstAsync<{ v: number }>(
      `SELECT COALESCE(SUM(amount), 0) AS v FROM expenses WHERE date >= ?`,
      [monthAgo.toISOString().slice(0, 10)]
    ),
    database.getFirstAsync<{ v: number }>(
      `SELECT COALESCE(SUM(amount), 0) AS v FROM expenses WHERE date >= ?`,
      [yearAgo.toISOString().slice(0, 10)]
    ),
  ]);

  return {
    today:   todayRow?.v  ?? 0,
    weekly:  weekRow?.v   ?? 0,
    monthly: monthRow?.v  ?? 0,
    yearly:  yearRow?.v   ?? 0,
  };
}
