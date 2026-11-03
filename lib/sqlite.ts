import * as SQLite from 'expo-sqlite';
import { Platform } from 'react-native';
import type {
  Product, SaleItem, Sale, Debt,
  IdMode, PaymentMethod, SaleStatus, DebtStatus,
  UpdateSaleCompleteInput, GlobalDiscountType, ProductBatch,
} from '@/types/sales';
import type { Purchase, PurchasePaymentStatus, PurchaseIdType } from '@/types/purchases';
import type { InventoryProduct, InventoryStats, NewProductData, DiscardedProduct, DiscardedLossStats, ProductPurchaseHistoryItem } from '@/types/inventory';
import type { Customer, CustomerWithStats, UpdateSaleInput } from '@/types/customers';
import type { PurchaseDebt, SalesDebtDetail, DebtPayment, DebtPaymentReceiptData, DebtOverviewSummary, FinancialLedgerEvent, LedgerEventType, DebtType } from '@/types/debt';
import type { SoldProductRecord } from '@/types/soldProducts';
import type { Supplier, SupplierWithStats } from '@/types/suppliers';
import { newUuid } from '@/lib/uuid';
import { toEnglishDigits } from '@/utils/formatters';

export const DEFAULT_CATEGORY = 'General';

const OLD_DB_NAME = 'managerx.db';
const DB_NAME = 'froshiar.db';

// One-time migration for the ManagerX -> Froshiar rebrand: expo-sqlite opens a
// database purely by filename, so switching the name the app looks for would
// silently hand every existing install a brand-new empty database unless the
// old file is copied across first. Copies (never deletes/moves) the old file,
// so it stays behind as a safety net; a no-op once the new file already exists.
async function migrateDatabaseFile(): Promise<void> {
  if (Platform.OS === 'web') return;
  const { File, Directory } = await import('expo-file-system');
  // SQLite.defaultDatabaseDirectory is a plain OS path (e.g. "/data/user/0/.../SQLite"),
  // not a "file://" URI — but expo-file-system's File/Directory constructors require an
  // absolute URI, or they throw "URI is not absolute". Give it a scheme before use.
  const dbDirUri = SQLite.defaultDatabaseDirectory.startsWith('file://')
    ? SQLite.defaultDatabaseDirectory
    : `file://${SQLite.defaultDatabaseDirectory}`;
  const dbDir = new Directory(dbDirUri);
  const newFile = new File(dbDir, DB_NAME);
  if (newFile.exists) return;
  const oldFile = new File(dbDir, OLD_DB_NAME);
  if (!oldFile.exists) return;
  oldFile.copy(newFile);
}

function sanitizeSqlParam(param: any): any {
  if (typeof param === 'string') {
    return /[٠-٩۰-۹٫٬]/.test(param) ? toEnglishDigits(param) : param;
  }
  if (Array.isArray(param)) {
    return param.map(sanitizeSqlParam);
  }
  if (param && typeof param === 'object' && !(param instanceof Date)) {
    const res: any = {};
    for (const k of Object.keys(param)) {
      res[k] = sanitizeSqlParam(param[k]);
    }
    return res;
  }
  return param;
}

function wrapDatabaseWithAutoEnglishDigits(rawDb: SQLite.SQLiteDatabase): SQLite.SQLiteDatabase {
  const origRunAsync = rawDb.runAsync.bind(rawDb);
  const origGetAllAsync = rawDb.getAllAsync.bind(rawDb);
  const origGetFirstAsync = rawDb.getFirstAsync.bind(rawDb);

  (rawDb as any).runAsync = async function (source: string, ...params: any[]) {
    const cleanParams = params.map(sanitizeSqlParam);
    return (origRunAsync as any)(source, ...cleanParams);
  };

  (rawDb as any).getAllAsync = async function (source: string, ...params: any[]) {
    const cleanParams = params.map(sanitizeSqlParam);
    return (origGetAllAsync as any)(source, ...cleanParams);
  };

  (rawDb as any).getFirstAsync = async function (source: string, ...params: any[]) {
    const cleanParams = params.map(sanitizeSqlParam);
    return (origGetFirstAsync as any)(source, ...cleanParams);
  };

  if (typeof (rawDb as any).getEachAsync === 'function') {
    const origGetEachAsync = (rawDb as any).getEachAsync.bind(rawDb);
    (rawDb as any).getEachAsync = function (source: string, ...params: any[]) {
      const cleanParams = params.map(sanitizeSqlParam);
      return origGetEachAsync(source, ...cleanParams);
    };
  }

  return rawDb;
}

const dbPromise = (async () => {
  try {
    await migrateDatabaseFile();
  } catch (err) {
    // Non-fatal — worst case the app opens a fresh empty database below,
    // rather than never starting at all.
    console.error('[Froshiar] Database migration failed:', err);
  }
  try {
    const db = await SQLite.openDatabaseAsync(DB_NAME);
    return wrapDatabaseWithAutoEnglishDigits(db);
  } catch (err) {
    console.error('[Froshiar] SQLite open failed:', err);
    throw err;
  }
})();
// Every caller of getDatabase() below awaits dbPromise directly and still
// receives the rejection — this handler only prevents an unhandled-rejection
// warning if a DB-open failure races ahead of the first getDatabase() call.
dbPromise.catch(() => { });

export async function getDatabase(): Promise<SQLite.SQLiteDatabase> {
  return dbPromise;
}

// Deletes every business-data row (products, sales, purchases, customers, debts,
// reports, etc.) and re-seeds the counter/rate rows the app needs to keep functioning.
// Used by the explicit "Reset app to factory defaults" flow (app/(app)/settings/data.tsx)
// and by authStore's automatic wipe when a different account signs in on a device that
// already holds another account's local business data — this app has no per-account data
// scoping, SQLite is fully device-local, so switching accounts must not leak the prior
// account's records to the newly signed-in user.
export async function wipeAllBusinessData(): Promise<void> {
  const database = await getDatabase();
  // Transactional so an app kill mid-wipe can't leave the DB in a half-reset
  // state (some tables cleared, others not) — it either fully commits or the
  // whole wipe is rolled back and the next attempt starts clean.
  await database.withTransactionAsync(async () => {
    for (const table of [
      'purchase_audit_log', 'purchase_items', 'purchase_debts', 'debt_payments',
      'sale_items', 'debts', 'sales', 'purchases',
      'products', 'customers', 'suppliers', 'expenses',
      'exchange_rates', 'reports_cache',
      'invoice_counter', 'purchase_counter',
      'inventory_history', 'categories',
      'settings', 'businesses',
      'sync_queue', 'discarded_products',
    ]) {
      await database.runAsync(`DELETE FROM ${table}`);
    }
    await database.runAsync(`INSERT OR REPLACE INTO invoice_counter (id, last_number, last_date) VALUES (1, 0, '')`);
    await database.runAsync(`INSERT OR REPLACE INTO purchase_counter (id, last_number, last_date) VALUES (1, 0, '')`);
    await database.runAsync(`INSERT OR REPLACE INTO exchange_rates (id, rate, note) VALUES (1, 1310, 'Initial rate')`);

    // Every DELETE above fired one cloud-sync AFTER DELETE trigger per row, flooding
    // cloud_sync_queue/cloud_tombstones with a tombstone-per-record. That's the wrong
    // shape for a factory reset or account deletion — those flows delete the user's
    // entire Firestore users/{uid} subtree in one explicit cloud call instead (see
    // lib/cloudSync/pushEngine.ts's deleteAllCloudData) — so just discard the noise here.
    await database.runAsync(`DELETE FROM cloud_sync_queue`);
    await database.runAsync(`DELETE FROM cloud_tombstones`);
  });
}

// Cheap existence check for the "does this device already hold business data"
// question the first-login/restore decision (store/authStore.ts's adoptSignedInUser)
// needs to answer before deciding whether to push, pull, or prompt for a merge.
export async function localBusinessDataExists(): Promise<boolean> {
  const database = await getDatabase();
  const row = await database.getFirstAsync<{ cnt: number }>(
    `SELECT (
      (SELECT COUNT(*) FROM products) +
      (SELECT COUNT(*) FROM customers) +
      (SELECT COUNT(*) FROM sales) +
      (SELECT COUNT(*) FROM purchases) +
      (SELECT COUNT(*) FROM expenses)
    ) AS cnt`
  );
  return (row?.cnt ?? 0) > 0;
}

// Queues every existing row in every cloud-synced table for push, regardless of
// whether it already has a pending cloud_sync_queue entry. Used once, to seed a
// brand-new cloud account from this device's pre-existing local data (see
// lib/cloudSync/restore.ts's pushFullLocalSnapshot) — ordinary edits are already
// captured incrementally by the AFTER INSERT/UPDATE/DELETE triggers below and never
// need this.
export async function enqueueFullCloudResync(): Promise<void> {
  const database = await getDatabase();
  for (const table of CLOUD_SYNC_MUTABLE_TABLES) {
    await database.runAsync(
      `INSERT OR REPLACE INTO cloud_sync_queue (entity_type, uuid, operation)
       SELECT '${table}', uuid, 'upsert' FROM ${table} WHERE uuid IS NOT NULL`
    );
  }
  for (const table of CLOUD_SYNC_IMMUTABLE_TABLES) {
    await database.runAsync(
      `INSERT OR REPLACE INTO cloud_sync_queue (entity_type, uuid, operation)
       SELECT '${table}', uuid, 'upsert' FROM ${table} WHERE uuid IS NOT NULL`
    );
  }
  // inventory_history isn't in either list above (see its own trigger comment),
  // but a first-time seed of an existing device's data must still capture any
  // sold/removed-product history that predates this device's first cloud sync.
  await database.runAsync(
    `INSERT OR REPLACE INTO cloud_sync_queue (entity_type, uuid, operation)
     SELECT 'inventory_history', uuid, 'upsert' FROM inventory_history WHERE uuid IS NOT NULL`
  );
  await database.runAsync(
    `INSERT OR REPLACE INTO cloud_sync_queue (entity_type, uuid, operation) VALUES ('businesses', 'singleton', 'upsert')`
  );
}

let dbInitPromise: Promise<void> | null = null;

// Idempotent — cloud-sync code paths (store/authStore.ts's adoptSignedInUserInner,
// lib/cloudSync/*) also await this before touching cloud_sync_queue/cloud_tombstones
// or the cloud triggers, since those are created in runMigrations() below rather
// than the initial synchronous CREATE TABLE block, and app/_layout.tsx fires this
// and Firebase auth init in parallel with no ordering between them.
export function initializeDatabase(): Promise<void> {
  if (!dbInitPromise) dbInitPromise = runInitializeDatabase();
  return dbInitPromise;
}

async function runInitializeDatabase(): Promise<void> {
  const database = await getDatabase();

  await database.execAsync(`
    PRAGMA journal_mode = WAL;
    PRAGMA recursive_triggers = ON;

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
      production_date TEXT,
      expiry_date     TEXT,
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
      line_total      REAL    NOT NULL DEFAULT 0,
      batch_number    INTEGER,
      purchase_id     INTEGER
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
      supplier_image_uri TEXT,
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
      production_date  TEXT,
      expiry_date      TEXT,
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
      created_at      TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      print_count     INTEGER DEFAULT 0,
      view_count      INTEGER DEFAULT 0
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
      image_uri   TEXT,
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
  await ensureDirectCustomer(database);
  await ensureDirectSupplier(database);
  await migrateEasternDigitsInDatabase(database);
}

async function migrateEasternDigitsInDatabase(database: SQLite.SQLiteDatabase): Promise<void> {
  try {
    const customers = await database.getAllAsync<{ id: number; phone: string | null }>(
      `SELECT id, phone FROM customers WHERE phone IS NOT NULL AND phone != ''`
    );
    for (const c of customers) {
      if (c.phone && /[٠-٩۰-۹]/.test(c.phone)) {
        await database.runAsync(`UPDATE customers SET phone = ? WHERE id = ?`, [toEnglishDigits(c.phone), c.id]);
      }
    }

    const suppliers = await database.getAllAsync<{ id: number; phone: string | null }>(
      `SELECT id, phone FROM suppliers WHERE phone IS NOT NULL AND phone != ''`
    );
    for (const s of suppliers) {
      if (s.phone && /[٠-٩۰-۹]/.test(s.phone)) {
        await database.runAsync(`UPDATE suppliers SET phone = ? WHERE id = ?`, [toEnglishDigits(s.phone), s.id]);
      }
    }

    const products = await database.getAllAsync<{ id: number; barcode: string | null; supplier_phone: string | null }>(
      `SELECT id, barcode, supplier_phone FROM products WHERE (barcode IS NOT NULL AND barcode != '') OR (supplier_phone IS NOT NULL AND supplier_phone != '')`
    );
    for (const p of products) {
      const newBarcode = p.barcode && /[٠-٩۰-۹]/.test(p.barcode) ? toEnglishDigits(p.barcode) : p.barcode;
      const newSupplierPhone = p.supplier_phone && /[٠-٩۰-۹]/.test(p.supplier_phone) ? toEnglishDigits(p.supplier_phone) : p.supplier_phone;
      if (newBarcode !== p.barcode || newSupplierPhone !== p.supplier_phone) {
        await database.runAsync(`UPDATE products SET barcode = ?, supplier_phone = ? WHERE id = ?`, [newBarcode, newSupplierPhone, p.id]);
      }
    }
  } catch (err) {
    console.warn('[SQLite] migrateEasternDigitsInDatabase error:', err);
  }
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
    // Guarantee the default category always exists if table is empty
    `INSERT OR IGNORE INTO categories (name) SELECT 'General' WHERE (SELECT COUNT(*) FROM categories) = 0`,
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
    // Short optional in-app note shown under the item name across Inventory/Sales/Edit
    // — distinct from `description` (purchase-mirrored) and `website_description`
    // (storefront-only). Never synced to the Online Store, never mirrored to purchases.
    `ALTER TABLE products ADD COLUMN item_description TEXT`,
    // Stable cross-device identity for merge-restore duplicate detection (see
    // lib/backup.ts). Autoincrement `id` collides across devices; `item_id` is
    // explicitly non-unique by design (repeatable id_mode). Nullable + partial
    // unique index so the column can exist before backfillUuids() populates it.
    ...UUID_TABLES.map((table) => `ALTER TABLE ${table} ADD COLUMN uuid TEXT`),
    ...UUID_TABLES.map(
      (table) => `CREATE UNIQUE INDEX IF NOT EXISTS idx_${table}_uuid ON ${table}(uuid) WHERE uuid IS NOT NULL`
    ),
    // Debt Payment History — denormalize event context directly onto debt_payments
    // so a customer/supplier's financial timeline survives even if the parent
    // debt/sale/purchase row is later deleted or the supplier is renamed.
    `ALTER TABLE debt_payments ADD COLUMN event_type TEXT NOT NULL DEFAULT 'payment'`,
    `ALTER TABLE debt_payments ADD COLUMN payment_method TEXT`,
    `ALTER TABLE debt_payments ADD COLUMN customer_id INTEGER`,
    `ALTER TABLE debt_payments ADD COLUMN supplier_name TEXT`,
    `ALTER TABLE debt_payments ADD COLUMN reference_number TEXT`,
    `ALTER TABLE debt_payments ADD COLUMN original_amount REAL`,
    `CREATE INDEX IF NOT EXISTS idx_debt_payments_customer_id ON debt_payments(customer_id)`,
    `CREATE INDEX IF NOT EXISTS idx_debt_payments_supplier_name ON debt_payments(supplier_name)`,

    // ── Cloud sync (Firestore) ──────────────────────────────────────────────
    // Push-side outbox: one pending row per (entity_type, uuid), populated by the
    // triggers below rather than call-site instrumentation, so no mutation path —
    // including bulk/raw-SQL ones like wipeAllBusinessData()'s unconditional
    // `DELETE FROM <table>` — can silently fail to reach the cloud sync engine.
    `CREATE TABLE IF NOT EXISTS cloud_sync_queue (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      entity_type TEXT NOT NULL,
      uuid TEXT NOT NULL,
      operation TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(entity_type, uuid)
    )`,
    `CREATE INDEX IF NOT EXISTS idx_cloud_sync_queue_entity ON cloud_sync_queue(entity_type)`,
    // Permanent local delete record so a later cloud pull can never resurrect a row
    // this device deliberately deleted.
    `CREATE TABLE IF NOT EXISTS cloud_tombstones (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      entity_type TEXT NOT NULL,
      uuid TEXT NOT NULL,
      deleted_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(entity_type, uuid)
    )`,
    `CREATE INDEX IF NOT EXISTS idx_cloud_tombstones_entity ON cloud_tombstones(entity_type)`,
    // `businesses` and `categories` had no updated_at column — local JSON restore
    // never needed one (both use "fill empty fields only"/natural-key merge, see
    // lib/backup.ts), but continuous two-way cloud sync needs real last-write-wins
    // on both once they can be edited from more than one device.
    // A non-constant default (CURRENT_TIMESTAMP) on ADD COLUMN fails on any table
    // that already has rows ("Cannot add a column with non-constant default"),
    // which is silently swallowed below — leaving updated_at permanently missing
    // on every device that had already set up a business before this shipped.
    // Add the column with no default (always succeeds) and backfill separately.
    `ALTER TABLE businesses ADD COLUMN updated_at TEXT`,
    `UPDATE businesses SET updated_at = COALESCE(updated_at, created_at, CURRENT_TIMESTAMP) WHERE updated_at IS NULL`,
    `ALTER TABLE categories ADD COLUMN updated_at TEXT`,
    `UPDATE categories SET updated_at = COALESCE(updated_at, created_at, CURRENT_TIMESTAMP) WHERE updated_at IS NULL`,
    // Cloud-sync outbox triggers. AFTER INSERT/UPDATE/DELETE on every in-scope
    // table, guarded on the row already having a uuid (so the one-time migration
    // seed inserts for `categories` and the pre-uuid backfill pass — both of which
    // write/patch uuid separately — don't enqueue garbage NULL-uuid entries; the
    // backfill's own UPDATE re-fires this trigger once the uuid is actually set).
    // NOTE: unlike `ALTER TABLE ADD COLUMN`, `CREATE TRIGGER IF NOT EXISTS` is not
    // additive-safe — changing a trigger's body in a future migration requires an
    // explicit `DROP TRIGGER IF EXISTS` first, or the old body silently keeps running.
    ...CLOUD_SYNC_MUTABLE_TABLES.flatMap((table) => [
      `CREATE TRIGGER IF NOT EXISTS trg_${table}_cloud_ins AFTER INSERT ON ${table}
       WHEN NEW.uuid IS NOT NULL
       BEGIN INSERT OR REPLACE INTO cloud_sync_queue (entity_type, uuid, operation) VALUES ('${table}', NEW.uuid, 'upsert'); END`,
      `CREATE TRIGGER IF NOT EXISTS trg_${table}_cloud_upd AFTER UPDATE ON ${table}
       WHEN NEW.uuid IS NOT NULL
       BEGIN INSERT OR REPLACE INTO cloud_sync_queue (entity_type, uuid, operation) VALUES ('${table}', NEW.uuid, 'upsert'); END`,
      `CREATE TRIGGER IF NOT EXISTS trg_${table}_cloud_del AFTER DELETE ON ${table}
       WHEN OLD.uuid IS NOT NULL
       BEGIN
         INSERT OR REPLACE INTO cloud_tombstones (entity_type, uuid, deleted_at) VALUES ('${table}', OLD.uuid, CURRENT_TIMESTAMP);
         INSERT OR REPLACE INTO cloud_sync_queue (entity_type, uuid, operation) VALUES ('${table}', OLD.uuid, 'delete');
       END`,
    ]),
    // Append-only children (never UPDATEd after insert — no `updated_at` column,
    // no code path updates them) only need an insert + delete(-cascade) trigger.
    ...CLOUD_SYNC_IMMUTABLE_TABLES.flatMap((table) => [
      `CREATE TRIGGER IF NOT EXISTS trg_${table}_cloud_ins AFTER INSERT ON ${table}
       WHEN NEW.uuid IS NOT NULL
       BEGIN INSERT OR REPLACE INTO cloud_sync_queue (entity_type, uuid, operation) VALUES ('${table}', NEW.uuid, 'upsert'); END`,
      `CREATE TRIGGER IF NOT EXISTS trg_${table}_cloud_del AFTER DELETE ON ${table}
       WHEN OLD.uuid IS NOT NULL
       BEGIN
         INSERT OR REPLACE INTO cloud_tombstones (entity_type, uuid, deleted_at) VALUES ('${table}', OLD.uuid, CURRENT_TIMESTAMP);
         INSERT OR REPLACE INTO cloud_sync_queue (entity_type, uuid, operation) VALUES ('${table}', OLD.uuid, 'delete');
       END`,
    ]),
    // `businesses` is a device-local singleton row (id=1) whose own `uuid` column
    // churns (saveBusiness's INSERT OR REPLACE never re-supplies it, so it reads
    // NULL until the next app-start backfill) — the cloud engine doesn't key the
    // business-profile doc by that uuid at all, it lives at the users/{uid} root
    // doc's `business` field (see lib/cloudSync/pushEngine.ts), so these two use a
    // fixed synthetic key instead and fire unconditionally.
    `CREATE TRIGGER IF NOT EXISTS trg_businesses_cloud_ins AFTER INSERT ON businesses
     BEGIN INSERT OR REPLACE INTO cloud_sync_queue (entity_type, uuid, operation) VALUES ('businesses', 'singleton', 'upsert'); END`,
    `CREATE TRIGGER IF NOT EXISTS trg_businesses_cloud_upd AFTER UPDATE ON businesses
     BEGIN INSERT OR REPLACE INTO cloud_sync_queue (entity_type, uuid, operation) VALUES ('businesses', 'singleton', 'upsert'); END`,
    // Invoice/purchase numbering and app preferences ride along on the same
    // users/{uid} root doc as the business profile (see pushBusinessProfile), so
    // an edit to either singleton counter just needs to enqueue the same fixed
    // 'businesses'/'singleton' key — no separate collection/queue-key needed.
    `CREATE TRIGGER IF NOT EXISTS trg_invoice_counter_cloud_upd AFTER UPDATE ON invoice_counter
     BEGIN INSERT OR REPLACE INTO cloud_sync_queue (entity_type, uuid, operation) VALUES ('businesses', 'singleton', 'upsert'); END`,
    `CREATE TRIGGER IF NOT EXISTS trg_purchase_counter_cloud_upd AFTER UPDATE ON purchase_counter
     BEGIN INSERT OR REPLACE INTO cloud_sync_queue (entity_type, uuid, operation) VALUES ('businesses', 'singleton', 'upsert'); END`,
    // inventory_history (sold/removed product archive) — write-once via
    // INSERT OR REPLACE on UNIQUE(product_id), which SQLite implements as a
    // delete-then-insert on conflict, not an UPDATE — so only insert/delete
    // triggers are needed/correct here (no _upd trigger, unlike the
    // CLOUD_SYNC_MUTABLE_TABLES block above).
    `CREATE TRIGGER IF NOT EXISTS trg_inventory_history_cloud_ins AFTER INSERT ON inventory_history
     WHEN NEW.uuid IS NOT NULL
     BEGIN INSERT OR REPLACE INTO cloud_sync_queue (entity_type, uuid, operation) VALUES ('inventory_history', NEW.uuid, 'upsert'); END`,
    `CREATE TRIGGER IF NOT EXISTS trg_inventory_history_cloud_del AFTER DELETE ON inventory_history
     WHEN OLD.uuid IS NOT NULL
     BEGIN
       INSERT OR REPLACE INTO cloud_tombstones (entity_type, uuid, deleted_at) VALUES ('inventory_history', OLD.uuid, CURRENT_TIMESTAMP);
       INSERT OR REPLACE INTO cloud_sync_queue (entity_type, uuid, operation) VALUES ('inventory_history', OLD.uuid, 'delete');
     END`,
    // Expiry and manufacturing date tracking for products and purchases
    `ALTER TABLE products ADD COLUMN production_date TEXT`,
    `ALTER TABLE products ADD COLUMN expiry_date TEXT`,
    `ALTER TABLE purchases ADD COLUMN production_date TEXT`,
    `ALTER TABLE purchases ADD COLUMN expiry_date TEXT`,
    `ALTER TABLE purchase_items ADD COLUMN production_date TEXT`,
    `ALTER TABLE purchase_items ADD COLUMN expiry_date TEXT`,
    `CREATE INDEX IF NOT EXISTS idx_products_expiry_date ON products(expiry_date)`,
    // Ensure existing remote images are mirrored to image_uri if image_uri is missing
    `UPDATE products SET image_uri = image_remote_url WHERE (image_uri IS NULL OR image_uri = '') AND image_remote_url IS NOT NULL AND image_remote_url != ''`,
    // Discarded products table for tracking expired/written-off items and their financial loss
    `CREATE TABLE IF NOT EXISTS discarded_products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      product_id INTEGER,
      product_name TEXT NOT NULL,
      category TEXT NOT NULL DEFAULT 'General',
      item_id TEXT,
      quantity INTEGER NOT NULL DEFAULT 1,
      unit TEXT NOT NULL DEFAULT 'pcs',
      purchase_price REAL NOT NULL DEFAULT 0,
      buy_price_usd REAL NOT NULL DEFAULT 0,
      selling_price REAL NOT NULL DEFAULT 0,
      sell_price_usd REAL NOT NULL DEFAULT 0,
      total_loss_iqd REAL NOT NULL DEFAULT 0,
      total_loss_usd REAL NOT NULL DEFAULT 0,
      expiry_date TEXT,
      production_date TEXT,
      image_uri TEXT,
      reason TEXT NOT NULL DEFAULT 'expired',
      notes TEXT,
      discarded_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      restored_at TEXT,
      uuid TEXT
    )`,
    `CREATE INDEX IF NOT EXISTS idx_discarded_products_date ON discarded_products(discarded_at)`,
    `CREATE INDEX IF NOT EXISTS idx_discarded_products_product ON discarded_products(product_id)`,
    `CREATE INDEX IF NOT EXISTS idx_discarded_products_restored ON discarded_products(restored_at)`,
    // Initial payment method tracking for debt purchases & sales
    `ALTER TABLE purchases ADD COLUMN initial_payment_method TEXT`,
    `ALTER TABLE sales ADD COLUMN initial_payment_method TEXT`,
    `ALTER TABLE debts ADD COLUMN initial_payment_method TEXT`,
    `ALTER TABLE purchase_debts ADD COLUMN initial_payment_method TEXT`,
    // Print and view counters for sales, purchases, and debt payment invoices
    `ALTER TABLE sales ADD COLUMN print_count INTEGER DEFAULT 0`,
    `ALTER TABLE sales ADD COLUMN view_count INTEGER DEFAULT 0`,
    `ALTER TABLE purchases ADD COLUMN print_count INTEGER DEFAULT 0`,
    `ALTER TABLE purchases ADD COLUMN view_count INTEGER DEFAULT 0`,
    `ALTER TABLE debt_payments ADD COLUMN print_count INTEGER DEFAULT 0`,
    `ALTER TABLE debt_payments ADD COLUMN view_count INTEGER DEFAULT 0`,
    // Batch tracking for FIFO sales
    `ALTER TABLE sale_items ADD COLUMN batch_number INTEGER`,
    `ALTER TABLE sale_items ADD COLUMN purchase_id INTEGER`,
    // Track default category with is_default column so it remains protected even after renaming
    `ALTER TABLE categories ADD COLUMN is_default INTEGER NOT NULL DEFAULT 0`,
    `UPDATE categories SET is_default = 1 WHERE name = 'General' AND (SELECT COUNT(*) FROM categories WHERE is_default = 1) = 0`,
    `UPDATE categories SET is_default = 1 WHERE (SELECT COUNT(*) FROM categories WHERE is_default = 1) = 0 AND id = (SELECT MIN(id) FROM categories)`,
    // Supplier brand logo and purchase supplier logo snapshot
    `ALTER TABLE suppliers ADD COLUMN image_uri TEXT`,
    `ALTER TABLE purchases ADD COLUMN supplier_image_uri TEXT`,
    // Standardize purchase numbers to F-00000 format (e.g. F-00001) if legacy numeric without prefix
    `UPDATE purchases SET purchase_number = 'F-' || substr('00000' || purchase_number, -5) WHERE purchase_number NOT LIKE 'F-%' AND purchase_number GLOB '[0-9]*'`,
    `UPDATE purchase_debts SET purchase_number = 'F-' || substr('00000' || purchase_number, -5) WHERE purchase_number NOT LIKE 'F-%' AND purchase_number GLOB '[0-9]*'`,
    // Employee creator tracking for granular activity scoping
    `ALTER TABLE sales ADD COLUMN created_by TEXT`,
    `ALTER TABLE sales ADD COLUMN created_by_email TEXT`,
    `ALTER TABLE purchases ADD COLUMN created_by TEXT`,
    `ALTER TABLE purchases ADD COLUMN created_by_email TEXT`,
    `ALTER TABLE debt_payments ADD COLUMN created_by TEXT`,
    `ALTER TABLE debt_payments ADD COLUMN created_by_email TEXT`,
    `ALTER TABLE expenses ADD COLUMN created_by TEXT`,
    `ALTER TABLE expenses ADD COLUMN created_by_email TEXT`,
    // Standardize sales invoice numbers to 5-digit F-00000 format
    `UPDATE OR IGNORE sales SET invoice_number = 'F-' || substr(invoice_number, 4) WHERE invoice_number LIKE 'F-00000%' AND length(invoice_number) = 8`,
    `UPDATE sales SET invoice_number = 'F-' || substr('00000' || invoice_number, -5) WHERE invoice_number NOT LIKE 'F-%' AND invoice_number GLOB '[0-9]*'`,
  ];
  for (const sql of migrations) {
    // Most failures here are the expected "column/table already exists" from a
    // re-run — but the catch is intentionally broad (idempotent statements can
    // fail for other reasons too, e.g. a locked DB), so a genuine typo in a
    // future migration would otherwise fail completely silently. Log it instead
    // of swallowing it outright; still non-fatal so one bad statement can't
    // block every migration after it or the app boot itself.
    try { await database.execAsync(sql); } catch (e) {
      if (__DEV__) console.warn('[Froshiar] migration statement failed (may be expected):', sql.slice(0, 80), e);
    }
  }
  await backfillUuids(database);
}

// Tables that need a stable `uuid` identity for merge-restore. Excludes the
// singleton counter tables (invoice_counter, purchase_counter) — those are
// merged by value (max-wins), not matched row-by-row (see lib/backup.ts).
const UUID_TABLES = [
  'businesses', 'categories', 'products', 'inventory_history',
  'customers', 'suppliers', 'sales', 'sale_items', 'debts',
  'purchases', 'purchase_items', 'purchase_debts', 'debt_payments',
  'expenses', 'exchange_rates', 'purchase_audit_log', 'discarded_products',
] as const;

// Cloud-sync (Firestore) table scope — a deliberately narrower set than
// UUID_TABLES/backup.ts's full local-JSON-backup scope (excludes
// inventory_history, exchange_rates, purchase_audit_log, reports_cache, the
// counter tables). "Mutable" here means the app actually re-edits the row after
// creation (updateProduct, updateCustomer, updateSaleInfo/updateSaleComplete,
// updatePurchase, updateExpense, debt payment recording, renameManagedCategory,
// ...) and so needs real last-write-wins by `updated_at` on cloud pull — this is
// a different, stricter classification than lib/backup.ts's mutable/immutable
// split, which only asks "should a one-off JSON restore ever overwrite an
// existing local row" (there, sales/purchases/expenses/debts are all treated as
// immutable, because an old backup must never roll back today's edited record;
// that rule doesn't hold for continuous two-way sync between two live devices,
// where a real edit on either side must actually propagate). `businesses` is
// handled separately (fixed synthetic key, see the trigger below) since its own
// `uuid` column churns on every save.
const CLOUD_SYNC_MUTABLE_TABLES = [
  'categories', 'products', 'customers', 'suppliers',
  'sales', 'purchases', 'expenses', 'debts', 'purchase_debts',
] as const;

// Append-only children — never UPDATEd after insert (no `updated_at` column,
// no update code path) — so only insert/delete need to reach the outbox.
const CLOUD_SYNC_IMMUTABLE_TABLES = ['sale_items', 'purchase_items', 'debt_payments'] as const;

// One-time-per-row backfill: any row inserted before the uuid column existed
// (or by a version of the app that predates it) gets a generated uuid. Cheap
// no-op on subsequent app starts once every row has one, since the WHERE
// clause returns nothing left to do.
async function backfillUuids(database: SQLite.SQLiteDatabase): Promise<void> {
  const { newUuid } = await import('@/lib/uuid');
  for (const table of UUID_TABLES) {
    const rows = await database.getAllAsync<{ id: number }>(
      `SELECT id FROM ${table} WHERE uuid IS NULL`
    );
    for (const row of rows) {
      await database.runAsync(`UPDATE ${table} SET uuid = ? WHERE id = ?`, [await newUuid(), row.id]);
    }
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

  // updated_at must be set here (not left to a column default) — INSERT OR REPLACE
  // is a delete+insert under the hood, so a DEFAULT CURRENT_TIMESTAMP would only
  // ever apply on the row's very first insert, not on subsequent saves. Without an
  // explicit fresh value here, every local edit after the first leaves updated_at
  // stale, and the cloud pull engine's LWW check in applyRootDoc() treats a stale/
  // falsy local timestamp as "always lose to any incoming doc" — silently clobbering
  // a just-made local edit with an older cloud echo before it even gets pushed.
  await database.runAsync(
    `INSERT OR REPLACE INTO businesses (id, name, type, phone, address, logo_path, updated_at)
     VALUES (1, ?, ?, ?, ?, ?, ?)`,
    [data.name, data.type, data.phone, data.address, data.logoPath ?? null, new Date().toISOString()]
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

// Queues a business-profile push for changes that never touch a SQLite row —
// app preferences (settingsStore/languageStore, AsyncStorage-only) and Online
// Store settings (the `settings` KV table) piggyback on the same users/{uid}
// root doc as the business profile/counters (see pushEngine.ts's
// pushBusinessProfile), so they reuse this same fixed synthetic queue key
// rather than needing their own row-level trigger. Also bumps a dedicated
// `cloud_prefs_updated_at` marker — the `preferences` sub-object on that root
// doc needs its own LWW timestamp independent of `business.updated_at`, since
// a settings-only edit shouldn't be starved by (or clobber) an unrelated
// business-profile edit made around the same time.
export async function enqueueBusinessProfilePush(): Promise<void> {
  const database = await getDatabase();
  await database.runAsync(
    `INSERT OR REPLACE INTO cloud_sync_queue (entity_type, uuid, operation) VALUES ('businesses', 'singleton', 'upsert')`
  );
  await saveSetting('cloud_prefs_updated_at', new Date().toISOString());
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

export async function getDatabaseOwner(): Promise<string | null> {
  try {
    const { getItemWithLegacyFallback } = await import('./migratedStorage');
    const raw = await getItemWithLegacyFallback('@froshiar_database_owner_uid');
    if (raw) return raw;
  } catch { }
  return loadSetting('database_owner_uid');
}

export async function setDatabaseOwner(uid: string | null): Promise<void> {
  try {
    const { default: AsyncStorage } = await import('@react-native-async-storage/async-storage');
    if (uid) {
      await AsyncStorage.setItem('@froshiar_database_owner_uid', uid);
    } else {
      await AsyncStorage.removeItem('@froshiar_database_owner_uid');
    }
  } catch { }
  if (uid) {
    await saveSetting('database_owner_uid', uid);
  }
}

// ─── Invoice Counter ──────────────────────────────────────────────────────────

function formatSequenceNumber(n: number): string {
  const width = Math.max(4, String(n).length + 1);
  return String(n).padStart(width, '0');
}

export function formatInvoiceNumber(n: number): string {
  return `F-${String(n).padStart(5, '0')}`;
}

export function formatPurchaseNumber(n: number): string {
  return `F-${String(n).padStart(5, '0')}`;
}

export function formatQuotationNumber(n: number): string {
  return `B-${String(n).padStart(4, '0')}`;
}

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

    invoiceNumber = formatInvoiceNumber(nextNumber);
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
    itemDescription: (row.item_description as string | null) ?? null,
    isActive: (row.is_active as number) === 1,
    imageUri: ((row.image_uri as string | null)?.trim() || (row.image_remote_url as string | null)?.trim() || null),
    imageRemoteUrl: (row.image_remote_url as string | null)?.trim() || null,
    productionDate: (row.production_date as string | null) ?? null,
    expiryDate: (row.expiry_date as string | null) ?? null,
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

export async function getProductByItemId(itemId: string): Promise<InventoryProduct | null> {
  const database = await getDatabase();
  const row = await database.getFirstAsync<Record<string, unknown>>(
    'SELECT * FROM products WHERE item_id = ? AND is_active = 1 ORDER BY id DESC LIMIT 1',
    [itemId]
  );
  return row ? rowToInventoryProduct(row) : null;
}

export async function getProductByItemIdAndName(itemId: string, name: string): Promise<InventoryProduct | null> {
  const database = await getDatabase();
  const row = await database.getFirstAsync<Record<string, unknown>>(
    'SELECT * FROM products WHERE item_id = ? AND LOWER(TRIM(name)) = LOWER(TRIM(?)) AND is_active = 1 ORDER BY id DESC LIMIT 1',
    [itemId, name]
  );
  return row ? rowToInventoryProduct(row) : null;
}

export async function getRepeatableProductByName(name: string): Promise<InventoryProduct | null> {
  const database = await getDatabase();
  const row = await database.getFirstAsync<Record<string, unknown>>(
    `SELECT * FROM products WHERE LOWER(TRIM(name)) = LOWER(TRIM(?)) AND id_mode = 'repeatable' AND is_active = 1 ORDER BY id DESC LIMIT 1`,
    [name]
  );
  return row ? rowToInventoryProduct(row) : null;
}

export async function getDefaultCategoryName(): Promise<string> {
  const database = await getDatabase();
  const row = await database.getFirstAsync<{ name: string }>(
    'SELECT name FROM categories WHERE is_default = 1 LIMIT 1'
  );
  return row?.name || DEFAULT_CATEGORY;
}

export async function getProductCategories(): Promise<string[]> {
  const database = await getDatabase();
  try {
    await database.runAsync(
      `INSERT OR IGNORE INTO categories (name, uuid, is_default, created_at, updated_at)
       SELECT DISTINCT TRIM(category), lower(hex(randomblob(16))), 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
       FROM products
       WHERE category IS NOT NULL AND TRIM(category) != ''`
    );
    await database.runAsync(
      `INSERT OR IGNORE INTO categories (name, uuid, is_default, created_at, updated_at)
       SELECT DISTINCT TRIM(category), lower(hex(randomblob(16))), 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
       FROM purchase_items
       WHERE category IS NOT NULL AND TRIM(category) != ''`
    );
  } catch (syncErr) {
    console.warn('[Categories] Auto-sync error in getProductCategories:', syncErr);
  }

  const rows = await database.getAllAsync<{ name: string }>(
    `SELECT c.name
     FROM (
       SELECT TRIM(name) AS name, COALESCE(is_default, 0) AS is_default FROM categories WHERE name IS NOT NULL AND TRIM(name) != ''
       UNION
       SELECT DISTINCT TRIM(category) AS name, 0 AS is_default FROM products WHERE category IS NOT NULL AND TRIM(category) != ''
       UNION
       SELECT DISTINCT TRIM(category) AS name, 0 AS is_default FROM purchase_items WHERE category IS NOT NULL AND TRIM(category) != ''
     ) c
     WHERE TRIM(c.name) != ''
     GROUP BY c.name
     ORDER BY MAX(COALESCE(c.is_default, 0)) DESC, c.name COLLATE NOCASE ASC`
  );
  return rows.map((r) => r.name);
}

export async function getAllManagedCategories(): Promise<Array<{ name: string; productCount: number; isDefault: boolean }>> {
  const database = await getDatabase();
  // Ensure all categories from products and purchase_items are populated into categories table
  try {
    await database.runAsync(
      `INSERT OR IGNORE INTO categories (name, uuid, is_default, created_at, updated_at)
       SELECT DISTINCT TRIM(category), lower(hex(randomblob(16))), 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
       FROM products
       WHERE category IS NOT NULL AND TRIM(category) != ''`
    );
    await database.runAsync(
      `INSERT OR IGNORE INTO categories (name, uuid, is_default, created_at, updated_at)
       SELECT DISTINCT TRIM(category), lower(hex(randomblob(16))), 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
       FROM purchase_items
       WHERE category IS NOT NULL AND TRIM(category) != ''`
    );

    // Guarantee EXACTLY one canonical category is marked as default (is_default = 1).
    let defaultRow = await database.getFirstAsync<{ id: number; name: string }>(
      'SELECT id, name FROM categories WHERE is_default = 1 LIMIT 1'
    );

    if (!defaultRow) {
      // Check if 'گشتی', 'General' or 'بنەڕەت' exists:
      const genRow = await database.getFirstAsync<{ id: number; name: string }>(
        "SELECT id, name FROM categories WHERE name = 'گشتی' OR name = 'General' OR name = 'بنەڕەت' ORDER BY id ASC LIMIT 1"
      );
      if (genRow) {
        await database.runAsync('UPDATE categories SET is_default = 1 WHERE id = ?', [genRow.id]);
        defaultRow = genRow;
      } else {
        // 'گشتی' does not exist in categories. Insert it as the default category!
        await database.runAsync(
          "INSERT OR IGNORE INTO categories (name, uuid, is_default, created_at, updated_at) VALUES ('گشتی', lower(hex(randomblob(16))), 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)"
        );
        await database.runAsync("UPDATE categories SET is_default = 1 WHERE name = 'گشتی'");
        defaultRow = await database.getFirstAsync<{ id: number; name: string }>(
          "SELECT id, name FROM categories WHERE name = 'گشتی' LIMIT 1"
        );
      }
    }

    if (defaultRow) {
      // Clean up duplicate unused General rows if a renamed default exists
      if (defaultRow.name !== 'General') {
        const genWithProducts = await database.getFirstAsync<{ cnt: number }>(
          "SELECT COUNT(*) AS cnt FROM products WHERE category = 'General' AND is_active = 1"
        );
        if ((genWithProducts?.cnt ?? 0) === 0) {
          await database.runAsync("DELETE FROM categories WHERE name = 'General' AND is_default = 0");
        }
      }
      // Ensure only this single row has is_default = 1
      await database.runAsync('UPDATE categories SET is_default = 0 WHERE id != ?', [defaultRow.id]);
    }
  } catch (syncErr) {
    console.warn('[Categories] Auto-sync error in getAllManagedCategories:', syncErr);
  }

  const rows = await database.getAllAsync<{ name: string; product_count: number; is_default: number | null }>(
    `SELECT c.name,
            MAX(COALESCE(c.is_default, 0)) AS is_default,
            COUNT(CASE WHEN p.is_active = 1 THEN 1 END) AS product_count
     FROM (
       SELECT TRIM(name) AS name, COALESCE(is_default, 0) AS is_default FROM categories WHERE name IS NOT NULL AND TRIM(name) != ''
       UNION
       SELECT DISTINCT TRIM(category) AS name, 0 AS is_default FROM products WHERE category IS NOT NULL AND TRIM(category) != ''
       UNION
       SELECT DISTINCT TRIM(category) AS name, 0 AS is_default FROM purchase_items WHERE category IS NOT NULL AND TRIM(category) != ''
     ) c
     LEFT JOIN products p ON LOWER(TRIM(p.category)) = LOWER(c.name)
     WHERE TRIM(c.name) != ''
     GROUP BY c.name
     ORDER BY MAX(COALESCE(c.is_default, 0)) DESC, c.name COLLATE NOCASE ASC`
  );
  return rows.map((r) => ({
    name: r.name,
    productCount: r.product_count,
    isDefault: (r.is_default ?? 0) === 1,
  }));
}

export async function addManagedCategory(name: string): Promise<void> {
  const trimmed = name.trim();
  if (!trimmed) throw new Error('CATEGORY_NAME_REQUIRED');

  const database = await getDatabase();
  const existing = await database.getFirstAsync<{ cnt: number }>(
    'SELECT COUNT(*) AS cnt FROM categories WHERE LOWER(TRIM(name)) = LOWER(?)',
    [trimmed]
  );
  if ((existing?.cnt ?? 0) > 0) throw new Error('CATEGORY_ALREADY_EXISTS');

  await database.runAsync(
    'INSERT INTO categories (name, uuid, is_default, created_at, updated_at) VALUES (?, lower(hex(randomblob(16))), 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)',
    [trimmed]
  );
}

export async function deleteManagedCategory(name: string): Promise<void> {
  const trimmed = name.trim();
  if (!trimmed) return;

  const database = await getDatabase();
  const cat = await database.getFirstAsync<{ is_default: number | null }>(
    'SELECT is_default FROM categories WHERE LOWER(TRIM(name)) = LOWER(?)',
    [trimmed]
  );
  if (
    (cat?.is_default ?? 0) === 1 ||
    trimmed === DEFAULT_CATEGORY ||
    trimmed === 'گشتی' ||
    trimmed === 'بنەڕەت'
  ) {
    throw new Error('CATEGORY_IS_DEFAULT');
  }

  // Find canonical default category to reassign products and items to
  const defaultRow = await database.getFirstAsync<{ name: string }>(
    'SELECT name FROM categories WHERE is_default = 1 LIMIT 1'
  );
  const targetCategory = defaultRow?.name || 'گشتی';

  // 1. Reassign products belonging to this category to the default category
  await database.runAsync(
    'UPDATE products SET category = ?, updated_at = CURRENT_TIMESTAMP WHERE LOWER(TRIM(category)) = LOWER(?)',
    [targetCategory, trimmed]
  );

  // 2. Reassign purchase_items
  await database.runAsync(
    'UPDATE purchase_items SET category = ? WHERE LOWER(TRIM(category)) = LOWER(?)',
    [targetCategory, trimmed]
  );

  // 3. Reassign inventory_history
  await database.runAsync(
    'UPDATE inventory_history SET category = ? WHERE LOWER(TRIM(category)) = LOWER(?)',
    [targetCategory, trimmed]
  );

  // 4. Delete the category record
  await database.runAsync(
    'DELETE FROM categories WHERE LOWER(TRIM(name)) = LOWER(?)',
    [trimmed]
  );

  // 5. Enqueue sync changes for affected products
  const rows = await database.getAllAsync<{ id: number }>(
    'SELECT id FROM products WHERE category = ?',
    [targetCategory]
  );
  for (const row of rows) {
    await enqueueSyncChange(row.id, 'upsert');
  }
}

export async function renameManagedCategory(oldName: string, newName: string): Promise<void> {
  const trimmed = newName.trim();
  if (!trimmed) throw new Error('CATEGORY_NAME_REQUIRED');
  if (trimmed === oldName) return;

  const database = await getDatabase();
  const existing = await database.getFirstAsync<{ cnt: number }>(
    'SELECT COUNT(*) AS cnt FROM categories WHERE name = ?',
    [trimmed]
  );
  if ((existing?.cnt ?? 0) > 0) throw new Error('CATEGORY_ALREADY_EXISTS');

  // Check if old category was default
  const oldCat = await database.getFirstAsync<{ id: number; is_default: number | null }>(
    'SELECT id, is_default FROM categories WHERE name = ?',
    [oldName]
  );
  const isDefaultCat = (oldCat?.is_default ?? 0) === 1 || oldName === DEFAULT_CATEGORY;

  if (!oldCat) {
    // If oldName didn't exist in categories table yet, insert the new one directly with proper default flag
    await database.runAsync(
      'INSERT OR REPLACE INTO categories (name, uuid, is_default, updated_at) VALUES (?, lower(hex(randomblob(16))), ?, CURRENT_TIMESTAMP)',
      [trimmed, isDefaultCat ? 1 : 0]
    );
  } else {
    await database.runAsync(
      'UPDATE categories SET name = ?, is_default = CASE WHEN ? = 1 THEN 1 ELSE is_default END, updated_at = CURRENT_TIMESTAMP WHERE name = ?',
      [trimmed, isDefaultCat ? 1 : 0, oldName]
    );
  }

  if (isDefaultCat) {
    // Clear is_default from any other category to ensure single default
    await database.runAsync('UPDATE categories SET is_default = 0 WHERE name != ?', [trimmed]);
  }

  await database.runAsync(
    'UPDATE products SET category = ?, updated_at = CURRENT_TIMESTAMP WHERE category = ?',
    [trimmed, oldName]
  );
  await database.runAsync(
    'UPDATE purchase_items SET category = ? WHERE category = ?',
    [trimmed, oldName]
  );
  await database.runAsync(
    'UPDATE inventory_history SET category = ? WHERE category = ?',
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
    paymentStatus: ((row.payment_status as string) ?? 'paid') as PurchasePaymentStatus,
    warranty: (row.warranty as string | null) ?? null,
    notes: (row.notes as string | null) ?? null,
    imageUri: ((row.image_uri as string | null)?.trim() || (row.image_remote_url as string | null)?.trim() || null),
    imageRemoteUrl: (row.image_remote_url as string | null) ?? null,
    buyPriceUsd: (row.buy_price_usd as number) ?? 0,
    sellPriceUsd: (row.sell_price_usd as number) ?? 0,
    lowStockThreshold: (row.low_stock_threshold as number | null) ?? null,
    lowStockEnabled: (row.low_stock_enabled as 1 | 0 | null) ?? null,
    storeVisible: (row.store_visible as number) === 1,
    websiteDescription: (row.website_description as string | null) ?? null,
    itemDescription: (row.item_description as string | null) ?? null,
    productionDate: (row.production_date as string | null) ?? null,
    expiryDate: (row.expiry_date as string | null) ?? null,
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

  if (data.category && data.category.trim()) {
    try {
      await database.runAsync(
        'INSERT OR IGNORE INTO categories (name, uuid) VALUES (?, lower(hex(randomblob(16))))',
        [data.category.trim()]
      );
    } catch { }
  }

  const result = await database.runAsync(
    `INSERT INTO products (
      name, category, item_id, id_mode,
      purchase_price, selling_price, quantity, unit, description, is_active,
      purchase_id, supplier_name, supplier_phone, supplier_address, purchase_date,
      payment_status, warranty, image_uri, buy_price_usd, sell_price_usd,
      website_description, item_description, store_visible, uuid,
      production_date, expiry_date
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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
      data.itemDescription ?? null,
      bulkPublishEnabled ? 1 : 0,
      await newUuid(),
      data.productionDate ?? null,
      data.expiryDate ?? null,
    ]
  );

  await enqueueSyncChange(result.lastInsertRowId, 'upsert');
  return result.lastInsertRowId;
}

export async function updateProduct(id: number, data: Partial<NewProductData>): Promise<void> {
  const database = await getDatabase();

  if (data.category !== undefined && data.category && data.category.trim()) {
    try {
      await database.runAsync(
        'INSERT OR IGNORE INTO categories (name, uuid) VALUES (?, lower(hex(randomblob(16))))',
        [data.category.trim()]
      );
    } catch { }
  }

  const fields: string[] = [];
  const values: unknown[] = [];

  if (data.name !== undefined) { fields.push('name = ?'); values.push(data.name); }
  if (data.category !== undefined) { fields.push('category = ?'); values.push(data.category); }
  if (data.itemId !== undefined) { fields.push('item_id = ?'); values.push(data.itemId); }
  if (data.idMode !== undefined) { fields.push('id_mode = ?'); values.push(data.idMode); }
  if (data.purchasePrice !== undefined) { fields.push('purchase_price = ?'); values.push(data.purchasePrice); }
  if (data.buyPriceUsd !== undefined) { fields.push('buy_price_usd = ?'); values.push(data.buyPriceUsd); }
  if (data.sellingPrice !== undefined) { fields.push('selling_price = ?'); values.push(data.sellingPrice); }
  if (data.sellPriceUsd !== undefined) { fields.push('sell_price_usd = ?'); values.push(data.sellPriceUsd); }
  if (data.quantity !== undefined) { fields.push('quantity = ?'); values.push(data.quantity); }
  if (data.unit !== undefined) { fields.push('unit = ?'); values.push(data.unit); }
  if (data.description !== undefined) { fields.push('description = ?'); values.push(data.description); }
  if (data.warranty !== undefined) { fields.push('warranty = ?'); values.push(data.warranty); }
  if (data.notes !== undefined) { fields.push('notes = ?'); values.push(data.notes); }
  if (data.imageUri !== undefined || data.imageRemoteUrl !== undefined) {
    const rawUri = (data.imageUri as string | null)?.trim() || null;
    const rawRemote = (data.imageRemoteUrl as string | null)?.trim() || null;
    const isRemote = rawUri && (rawUri.startsWith('http://') || rawUri.startsWith('https://'));
    if (!rawUri && !rawRemote) {
      fields.push('image_uri = NULL');
      fields.push('image_remote_url = NULL');
    } else if (isRemote) {
      fields.push('image_uri = ?');
      values.push(rawUri);
      fields.push('image_remote_url = ?');
      values.push(rawUri);
    } else if (rawRemote && !rawUri) {
      fields.push('image_uri = ?');
      values.push(rawRemote);
      fields.push('image_remote_url = ?');
      values.push(rawRemote);
    } else {
      fields.push('image_uri = ?');
      values.push(rawUri);
      if (rawRemote) {
        fields.push('image_remote_url = ?');
        values.push(rawRemote);
      } else {
        fields.push('image_remote_url = NULL');
      }
    }
  }
  if (data.paymentStatus !== undefined) { fields.push('payment_status = ?'); values.push(data.paymentStatus); }
  if (data.supplierName !== undefined) { fields.push('supplier_name = ?'); values.push(data.supplierName); }
  if (data.supplierPhone !== undefined) { fields.push('supplier_phone = ?'); values.push(data.supplierPhone); }
  if (data.supplierAddress !== undefined) { fields.push('supplier_address = ?'); values.push(data.supplierAddress); }
  if (data.lowStockThreshold !== undefined) { fields.push('low_stock_threshold = ?'); values.push(data.lowStockThreshold ?? null); }
  if (data.lowStockEnabled !== undefined) { fields.push('low_stock_enabled = ?'); values.push(data.lowStockEnabled ?? null); }
  if (data.websiteDescription !== undefined) { fields.push('website_description = ?'); values.push(data.websiteDescription); }
  if (data.itemDescription !== undefined) { fields.push('item_description = ?'); values.push(data.itemDescription); }
  if (data.productionDate !== undefined) { fields.push('production_date = ?'); values.push(data.productionDate); }
  if (data.expiryDate !== undefined) { fields.push('expiry_date = ?'); values.push(data.expiryDate); }

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
      data.purchasePrice !== undefined || data.buyPriceUsd !== undefined ||
      data.sellingPrice !== undefined || data.sellPriceUsd !== undefined ||
      data.warranty !== undefined || data.description !== undefined || data.notes !== undefined ||
      data.productionDate !== undefined || data.expiryDate !== undefined;
    if (sharedField) {
      const row = await database.getFirstAsync<{ purchase_id: number | null }>(
        'SELECT purchase_id FROM products WHERE id = ?', [id]
      );
      if (row?.purchase_id != null) {
        await propagateToPurchase(database, row.purchase_id, {
          name: data.name,
          category: data.category,
          buyPriceIQD: data.purchasePrice,
          buyPriceUSD: data.buyPriceUsd,
          sellPriceIQD: data.sellingPrice,
          sellPriceUSD: data.sellPriceUsd,
          warranty: data.warranty,
          description: data.description,
          notes: data.notes,
          productionDate: data.productionDate,
          expiryDate: data.expiryDate,
        });
      }
    }

    if (data.purchasePrice !== undefined) {
      await database.runAsync(
        'UPDATE sale_items SET purchase_price = ? WHERE product_id = ?',
        [data.purchasePrice, id]
      );
    }
  });

  await enqueueSyncChange(id, 'upsert');
}

export interface RestockProductData {
  quantity: number;
  purchasePrice: number;
  buyPriceUsd: number;
  sellingPrice: number;
  sellPriceUsd: number;
  purchaseId?: number | null;
  supplierName?: string | null;
  supplierPhone?: string | null;
  supplierAddress?: string | null;
  purchaseDate?: string | null;
  imageUri?: string | null;
  itemDescription?: string | null;
  category?: string | null;
  productionDate?: string | null;
  expiryDate?: string | null;
}

export async function restockExistingProduct(productId: number, data: RestockProductData): Promise<void> {
  const database = await getDatabase();
  const fields: string[] = [
    'quantity = quantity + ?',
    'purchase_price = ?',
    'buy_price_usd = ?',
    'selling_price = ?',
    'sell_price_usd = ?',
    'is_active = 1',
    'updated_at = CURRENT_TIMESTAMP',
  ];
  const values: unknown[] = [
    data.quantity,
    data.purchasePrice,
    data.buyPriceUsd,
    data.sellingPrice,
    data.sellPriceUsd,
  ];

  if (data.purchaseId !== undefined) {
    fields.push('purchase_id = ?');
    values.push(data.purchaseId);
  }
  if (data.purchaseDate !== undefined) {
    fields.push('purchase_date = ?');
    values.push(data.purchaseDate);
  }
  if (data.supplierName) {
    fields.push('supplier_name = ?');
    values.push(data.supplierName);
  }
  if (data.supplierPhone) {
    fields.push('supplier_phone = ?');
    values.push(data.supplierPhone);
  }
  if (data.supplierAddress) {
    fields.push('supplier_address = ?');
    values.push(data.supplierAddress);
  }
  if (data.imageUri) {
    fields.push('image_uri = ?');
    values.push(data.imageUri);
  }
  if (data.itemDescription) {
    fields.push('item_description = ?');
    values.push(data.itemDescription);
  }
  if (data.category) {
    fields.push('category = ?');
    values.push(data.category);
  }
  if (data.productionDate) {
    fields.push('production_date = ?');
    values.push(data.productionDate);
  }
  if (data.expiryDate) {
    fields.push('expiry_date = ?');
    values.push(data.expiryDate);
  }

  values.push(productId);
  await database.runAsync(
    `UPDATE products SET ${fields.join(', ')} WHERE id = ?`,
    values as SQLite.SQLiteBindValue[]
  );

  await enqueueSyncChange(productId, 'upsert');
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
      ((productRow.image_uri as string | null)?.trim() || (productRow.image_remote_url as string | null)?.trim() || null),
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

    // SQLite's ON CONFLICT...DO UPDATE upsert isn't supported by the on-device
    // build (was throwing 'near "DO": syntax error'), so dedupe via a bulk
    // UPDATE followed by an INSERT of only the rows that didn't already exist.
    // Still two single-statement operations, no per-row JS loop.
    const updateSql = `UPDATE sync_queue SET operation = 'upsert', updated_at = CURRENT_TIMESTAMP
       WHERE entity_type = 'product'
         AND entity_id IN (SELECT id FROM products)`;
    console.log('[Froshiar][sync_queue] bulk update', updateSql); // TEMP: debug logging for sync upsert fix
    try {
      await database.runAsync(updateSql);
    } catch (err) {
      console.error('[Froshiar][sync_queue] bulk update failed:', updateSql, err); // TEMP
      throw err;
    }

    const insertSql = `INSERT INTO sync_queue (entity_type, entity_id, operation, updated_at)
       SELECT 'product', id, 'upsert', CURRENT_TIMESTAMP FROM products
       WHERE id NOT IN (SELECT entity_id FROM sync_queue WHERE entity_type = 'product')`;
    console.log('[Froshiar][sync_queue] bulk insert', insertSql); // TEMP: debug logging for sync upsert fix
    try {
      await database.runAsync(insertSql);
    } catch (err) {
      console.error('[Froshiar][sync_queue] bulk insert failed:', insertSql, err); // TEMP
      throw err;
    }
  });
  // Same dynamic-import fire-and-forget pattern as enqueueSyncChange below — avoids a
  // circular import (syncEngine.ts already imports FROM this file).
  import('./onlineStore/syncEngine').then((m) => m.scheduleSync()).catch(() => { });
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
  // SQLite's ON CONFLICT...DO UPDATE upsert isn't supported by the on-device
  // build (was throwing 'near "DO": syntax error'), so dedupe via UPDATE first,
  // then INSERT only if no existing row was found.
  const runQueueUpsert = async () => {
    const updateSql = `UPDATE sync_queue SET operation = ?, updated_at = CURRENT_TIMESTAMP
       WHERE entity_type = 'product' AND entity_id = ?`;
    console.log('[Froshiar][sync_queue] update', updateSql, [operation, productId]); // TEMP: debug logging for sync upsert fix
    let updateResult;
    try {
      updateResult = await database.runAsync(updateSql, [operation, productId]);
    } catch (err) {
      console.error('[Froshiar][sync_queue] update failed:', updateSql, [operation, productId], err); // TEMP
      throw err;
    }

    if (updateResult.changes === 0) {
      const insertSql = `INSERT INTO sync_queue (entity_type, entity_id, operation, updated_at)
         VALUES ('product', ?, ?, CURRENT_TIMESTAMP)`;
      console.log('[Froshiar][sync_queue] insert', insertSql, [productId, operation]); // TEMP: debug logging for sync upsert fix
      try {
        await database.runAsync(insertSql, [productId, operation]);
      } catch (err) {
        console.error('[Froshiar][sync_queue] insert failed:', insertSql, [productId, operation], err); // TEMP
        throw err;
      }
    }
  };

  // enqueueSyncChange is called both standalone (e.g. renameCategory) and from inside
  // other functions' own withTransactionAsync (insertSale, updateSaleComplete, deleteSale,
  // archivePurchase, updatePurchase). expo-sqlite's withTransactionAsync has no reentrancy
  // guard — opening a second one here while already inside a transaction issues a nested
  // BEGIN, which SQLite rejects and rolls back the outer (caller's) transaction. Only open
  // our own transaction when we're not already inside one.
  if (database.isInTransactionSync()) {
    await runQueueUpsert();
  } else {
    await database.withTransactionAsync(runQueueUpsert);
  }
  // Dynamic import avoids a circular import (syncEngine.ts already imports FROM
  // this file). Fire-and-forget — enqueueSyncChange is called inline inside bulk
  // loops (e.g. deleteProductsByPurchaseId) and must never block on a debounce
  // timer or a network call.
  import('./onlineStore/syncEngine').then((m) => m.scheduleSync()).catch(() => { });
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

// Enqueues any active store products that have a local image but whose remote
// URL hasn't been uploaded yet (e.g. initial upload or recovering from a transient failure
// or slug change).
export async function enqueueProductsWithPendingImages(currentSlug?: string): Promise<number> {
  const database = await getDatabase();
  let query = `
    INSERT INTO sync_queue (entity_type, entity_id, operation, updated_at)
    SELECT 'product', id, 'upsert', CURRENT_TIMESTAMP FROM products
    WHERE store_visible = 1
      AND image_uri IS NOT NULL
      AND image_uri != ''
      AND (
        image_remote_url IS NULL
        OR image_remote_url = ''
  `;
  const params: any[] = [];
  if (currentSlug && currentSlug.trim()) {
    query += ` OR image_remote_url NOT LIKE ?`;
    params.push(`%/uploads/${currentSlug.trim()}/%`);
  }
  query += `
      )
      AND id NOT IN (SELECT entity_id FROM sync_queue WHERE entity_type = 'product')
  `;
  const result = await database.runAsync(query, params);
  return result.changes;
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
    `INSERT INTO products (name, category, item_id, purchase_price, selling_price, quantity, image_uri, is_active, uuid)
     VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?)`,
    [
      row.product_name as string,
      row.category as string,
      (row.item_id as string | null) ?? null,
      row.purchase_price as number,
      row.selling_price as number,
      qty,
      (row.image_uri as string | null) ?? null,
      await newUuid(),
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

// ─── Discarded Products (Expiry Write-offs) ─────────────────────────────────

export async function discardProduct(
  productId: number,
  quantity: number,
  reason: string = 'expired',
  notes?: string
): Promise<{ discardId: number; totalLossIqd: number; totalLossUsd: number }> {
  const database = await getDatabase();
  const product = await database.getFirstAsync<Record<string, unknown>>(
    'SELECT * FROM products WHERE id = ?',
    [productId]
  );
  if (!product) {
    throw new Error(`Product with ID ${productId} not found`);
  }

  const currentQty = Number(product.quantity) || 0;
  const discardQty = Math.max(1, Math.min(quantity, currentQty > 0 ? currentQty : quantity));
  const purchasePriceIqd = Number(product.purchase_price) || 0;
  let buyPriceUsd = Number(product.buy_price_usd) || 0;

  // Retrieve exchange rate if conversion is needed
  let exchangeRate = 1310;
  try {
    const rateRow = await database.getFirstAsync<{ rate: number }>(
      'SELECT rate FROM exchange_rates ORDER BY created_at DESC LIMIT 1'
    );
    if (rateRow && rateRow.rate > 0) {
      exchangeRate = rateRow.rate;
    }
  } catch { }

  let totalLossIqd = purchasePriceIqd * discardQty;
  let totalLossUsd = buyPriceUsd * discardQty;

  if (totalLossIqd === 0 && totalLossUsd > 0) {
    totalLossIqd = totalLossUsd * exchangeRate;
  } else if (totalLossUsd === 0 && totalLossIqd > 0) {
    totalLossUsd = totalLossIqd / exchangeRate;
  }

  const newQty = Math.max(0, currentQty - discardQty);

  // Update product quantity in inventory
  await database.runAsync(
    'UPDATE products SET quantity = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
    [newQty, productId]
  );

  // Insert into discarded_products
  const uuid = await newUuid();
  const result = await database.runAsync(
    `INSERT INTO discarded_products (
      product_id, product_name, category, item_id, quantity, unit,
      purchase_price, buy_price_usd, selling_price, sell_price_usd,
      total_loss_iqd, total_loss_usd, expiry_date, production_date,
      image_uri, reason, notes, discarded_at, uuid
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, ?)`,
    [
      productId,
      String(product.name ?? ''),
      String(product.category ?? 'General'),
      (product.item_id as string | null) ?? null,
      discardQty,
      String(product.unit ?? 'pcs'),
      purchasePriceIqd,
      buyPriceUsd,
      Number(product.selling_price) || 0,
      Number(product.sell_price_usd) || 0,
      totalLossIqd,
      totalLossUsd,
      (product.expiry_date as string | null) ?? null,
      (product.production_date as string | null) ?? null,
      ((product.image_uri as string | null)?.trim() || (product.image_remote_url as string | null)?.trim() || null),
      reason,
      notes ?? null,
      uuid,
    ]
  );

  await clearReportsCache();
  return {
    discardId: result.lastInsertRowId,
    totalLossIqd,
    totalLossUsd,
  };
}

export async function restoreDiscardedProduct(discardId: number): Promise<{
  success: boolean;
  restoredQuantity: number;
  productId: number | null;
}> {
  const database = await getDatabase();
  const row = await database.getFirstAsync<Record<string, unknown>>(
    'SELECT * FROM discarded_products WHERE id = ?',
    [discardId]
  );
  if (!row) {
    return { success: false, restoredQuantity: 0, productId: null };
  }

  const qty = Math.max(1, Number(row.quantity) || 1);
  const productId = row.product_id ? Number(row.product_id) : null;

  if (productId) {
    const existing = await database.getFirstAsync<{ id: number; quantity: number }>(
      'SELECT id, quantity FROM products WHERE id = ?',
      [productId]
    );
    if (existing) {
      await database.runAsync(
        'UPDATE products SET quantity = quantity + ?, is_active = 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [qty, productId]
      );
    } else {
      // Re-create the product if it was deleted
      const uuid = await newUuid();
      await database.runAsync(
        `INSERT INTO products (
          name, category, item_id, purchase_price, buy_price_usd, selling_price, sell_price_usd,
          quantity, unit, expiry_date, production_date, image_uri, is_active, uuid
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?)`,
        [
          String(row.product_name ?? ''),
          String(row.category ?? 'General'),
          (row.item_id as string | null) ?? null,
          Number(row.purchase_price) || 0,
          Number(row.buy_price_usd) || 0,
          Number(row.selling_price) || 0,
          Number(row.sell_price_usd) || 0,
          qty,
          String(row.unit ?? 'pcs'),
          (row.expiry_date as string | null) ?? null,
          (row.production_date as string | null) ?? null,
          (row.image_uri as string | null) ?? null,
          uuid,
        ]
      );
    }
  }

  // Mark discarded_products as restored
  await database.runAsync(
    'UPDATE discarded_products SET restored_at = CURRENT_TIMESTAMP WHERE id = ?',
    [discardId]
  );

  await clearReportsCache();
  return { success: true, restoredQuantity: qty, productId };
}

export async function permanentDeleteDiscardedProduct(discardId: number): Promise<void> {
  const database = await getDatabase();
  await database.runAsync('DELETE FROM discarded_products WHERE id = ?', [discardId]);
  await clearReportsCache();
}

export async function getDiscardedProducts(onlyActive: boolean = true): Promise<DiscardedProduct[]> {
  const database = await getDatabase();
  const where = onlyActive ? 'WHERE d.restored_at IS NULL' : '';
  const rows = await database.getAllAsync<Record<string, unknown>>(
    `SELECT d.*,
            COALESCE(NULLIF(d.image_uri, ''), NULLIF(p.image_uri, ''), NULLIF(p.image_remote_url, '')) AS effective_image_uri
     FROM discarded_products d
     LEFT JOIN products p ON d.product_id = p.id
     ${where}
     ORDER BY d.discarded_at DESC`
  );
  return rows.map((r) => ({
    id: Number(r.id),
    productId: r.product_id ? Number(r.product_id) : null,
    productName: String(r.product_name ?? ''),
    category: String(r.category ?? 'General'),
    itemId: (r.item_id as string | null) ?? null,
    quantity: Number(r.quantity) || 1,
    unit: String(r.unit ?? 'pcs'),
    purchasePrice: Number(r.purchase_price) || 0,
    buyPriceUsd: Number(r.buy_price_usd) || 0,
    sellingPrice: Number(r.selling_price) || 0,
    sellPriceUsd: Number(r.sell_price_usd) || 0,
    totalLossIqd: Number(r.total_loss_iqd) || 0,
    totalLossUsd: Number(r.total_loss_usd) || 0,
    expiryDate: (r.expiry_date as string | null) ?? null,
    productionDate: (r.production_date as string | null) ?? null,
    imageUri: (r.effective_image_uri as string | null) ?? (r.image_uri as string | null) ?? null,
    reason: String(r.reason ?? 'expired'),
    notes: (r.notes as string | null) ?? null,
    discardedAt: String(r.discarded_at ?? ''),
    restoredAt: (r.restored_at as string | null) ?? null,
    uuid: (r.uuid as string | null) ?? undefined,
  }));
}

export async function getDiscardedLossStats(
  from?: string,
  to?: string
): Promise<DiscardedLossStats> {
  const database = await getDatabase();
  const hasRange = Boolean(from && to);
  const dateFilter = hasRange ? `AND discarded_at >= ? AND discarded_at <= ?` : '';
  const params: SQLite.SQLiteBindValue[] = hasRange ? [from!, to!] : [];
  const row = await database.getFirstAsync<{
    lossIqd: number;
    lossUsd: number;
    itemsCount: number;
    unitsCount: number;
  }>(`
    SELECT
      COALESCE(SUM(total_loss_iqd), 0) AS lossIqd,
      COALESCE(SUM(total_loss_usd), 0) AS lossUsd,
      COUNT(*) AS itemsCount,
      COALESCE(SUM(quantity), 0) AS unitsCount
    FROM discarded_products
    WHERE restored_at IS NULL
    ${dateFilter}
  `, params);

  return {
    totalLossIqd: row?.lossIqd ?? 0,
    totalLossUsd: row?.lossUsd ?? 0,
    totalItemsCount: row?.itemsCount ?? 0,
    totalUnitsCount: row?.unitsCount ?? 0,
  };
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
      COUNT(CASE WHEN is_active = 1 AND quantity > 0 AND (payment_status = 'paid' OR payment_status = 'fib') THEN 1 END)  AS paidCount,
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

export async function getProductPurchaseHistory(
  productId: number,
  productName: string,
  itemId?: string | null
): Promise<ProductPurchaseHistoryItem[]> {
  const database = await getDatabase();
  const trimmedName = productName.trim().toLowerCase();

  // Query from purchases and purchase_items
  const rows = await database.getAllAsync<Record<string, unknown>>(`
    SELECT 
      p.id as purchase_id,
      p.purchase_number,
      p.date,
      p.supplier_name,
      p.supplier_phone,
      p.supplier_address,
      COALESCE(pi.buy_price_iqd, p.buy_price_iqd) as buy_price_iqd,
      COALESCE(pi.buy_price_usd, p.buy_price_usd) as buy_price_usd,
      COALESCE(pi.sell_price_iqd, p.sell_price_iqd) as sell_price_iqd,
      COALESCE(pi.sell_price_usd, p.sell_price_usd) as sell_price_usd,
      COALESCE(pi.quantity, p.quantity) as quantity,
      COALESCE(pi.line_total_iqd, p.total_iqd) as line_total_iqd,
      p.payment_status,
      p.created_at
    FROM purchases p
    LEFT JOIN purchase_items pi ON pi.purchase_id = p.id
    WHERE LOWER(TRIM(COALESCE(pi.product_name, p.product_name))) = ?
       OR p.id = (SELECT purchase_id FROM products WHERE id = ?)
       ${itemId ? `OR p.item_ids LIKE ? OR (pi.item_ids IS NOT NULL AND pi.item_ids LIKE ?)` : ''}
    GROUP BY p.id
    ORDER BY p.date DESC, p.created_at DESC
  `, itemId
    ? [trimmedName, productId, `%"${itemId}"%`, `%"${itemId}"%`]
    : [trimmedName, productId]
  );

  return rows.map((r) => ({
    id: r.purchase_id as number,
    purchaseId: r.purchase_id as number,
    purchaseNumber: (r.purchase_number as string) || `P-${r.purchase_id}`,
    date: r.date as string,
    supplierName: (r.supplier_name as string | null) ?? null,
    supplierPhone: (r.supplier_phone as string | null) ?? null,
    supplierAddress: (r.supplier_address as string | null) ?? null,
    buyPriceIQD: Number(r.buy_price_iqd) || 0,
    buyPriceUSD: Number(r.buy_price_usd) || 0,
    sellPriceIQD: Number(r.sell_price_iqd) || 0,
    sellPriceUSD: Number(r.sell_price_usd) || 0,
    quantity: Number(r.quantity) || 1,
    lineTotalIQD: Number(r.line_total_iqd) || 0,
    paymentStatus: ((r.payment_status as string) || 'paid') as 'paid' | 'fib' | 'debt',
    createdAt: r.created_at as string,
  }));
}

export async function getProductBatches(
  productId: number,
  productName: string,
  itemId?: string | null
): Promise<ProductBatch[]> {
  const database = await getDatabase();
  const trimmedName = (productName || '').trim().toLowerCase();

  // Check if expiry tracking is enabled
  let isExpiryEnabled = false;
  try {
    const { useSettingsStore } = await import('@/store/settingsStore');
    isExpiryEnabled = !!useSettingsStore.getState().expiryTrackingEnabled;
    if (!isExpiryEnabled) {
      const settingVal = await loadSetting('expiry_tracking_enabled');
      isExpiryEnabled = settingVal === '1';
    }
  } catch {
    try {
      const settingVal = await loadSetting('expiry_tracking_enabled');
      isExpiryEnabled = settingVal === '1';
    } catch { }
  }

  const productRow = await database.getFirstAsync<Record<string, unknown>>(
    'SELECT * FROM products WHERE id = ?',
    [productId]
  );

  const orderByClause = isExpiryEnabled
    ? `ORDER BY 
         CASE 
           WHEN COALESCE(pi.expiry_date, p.expiry_date) IS NOT NULL 
                AND TRIM(COALESCE(pi.expiry_date, p.expiry_date)) != '' 
           THEN 0 
           ELSE 1 
         END ASC,
         COALESCE(pi.expiry_date, p.expiry_date) ASC,
         p.date ASC, 
         p.created_at ASC, 
         p.id ASC`
    : `ORDER BY p.date ASC, p.created_at ASC, p.id ASC`;

  const rows = await database.getAllAsync<Record<string, unknown>>(`
    SELECT 
      p.id as purchase_id,
      p.purchase_number,
      p.date,
      p.supplier_name,
      p.supplier_phone,
      p.supplier_address,
      COALESCE(pi.buy_price_iqd, p.buy_price_iqd) as buy_price_iqd,
      COALESCE(pi.buy_price_usd, p.buy_price_usd) as buy_price_usd,
      COALESCE(pi.sell_price_iqd, p.sell_price_iqd) as sell_price_iqd,
      COALESCE(pi.sell_price_usd, p.sell_price_usd) as sell_price_usd,
      COALESCE(pi.quantity, p.quantity) as quantity,
      COALESCE(pi.production_date, p.production_date) as production_date,
      COALESCE(pi.expiry_date, p.expiry_date) as expiry_date,
      p.created_at
    FROM purchases p
    LEFT JOIN purchase_items pi ON pi.purchase_id = p.id
    WHERE LOWER(TRIM(COALESCE(pi.product_name, p.product_name))) = ?
       OR p.id = (SELECT purchase_id FROM products WHERE id = ?)
       ${itemId ? `OR p.item_ids LIKE ? OR (pi.item_ids IS NOT NULL AND pi.item_ids LIKE ?)` : ''}
    GROUP BY p.id
    ${orderByClause}
  `, itemId
    ? [trimmedName, productId, `%"${itemId}"%`, `%"${itemId}"%`]
    : [trimmedName, productId]
  );

  const currentStock = Number(productRow?.quantity) || 0;
  if (currentStock <= 0) {
    return [];
  }

  if (!rows || rows.length === 0) {
    return [{
      batchNum: 1,
      purchaseId: productRow?.purchase_id ? Number(productRow.purchase_id) : null,
      purchaseNumber: 'B-1',
      date: (productRow?.purchase_date || productRow?.created_at || new Date().toISOString()) as string,
      buyPriceIQD: Number(productRow?.purchase_price) || 0,
      buyPriceUSD: Number(productRow?.buy_price_usd) || 0,
      sellPriceIQD: Number(productRow?.selling_price) || 0,
      sellPriceUSD: Number(productRow?.sell_price_usd) || 0,
      quantity: currentStock,
      productionDate: (productRow?.production_date as string) || null,
      expiryDate: (productRow?.expiry_date as string) || null,
      supplierName: (productRow?.supplier_name as string) || null,
      isOldest: true,
    }];
  }

  // 1. Sort purchases chronologically to calculate FIFO stock depletion
  const chronologicalRows = [...rows].sort((a, b) => {
    const dateA = (a.date || a.created_at || '') as string;
    const dateB = (b.date || b.created_at || '') as string;
    if (dateA !== dateB) return dateA.localeCompare(dateB);
    return Number(a.purchase_id) - Number(b.purchase_id);
  });

  const totalPurchased = chronologicalRows.reduce((sum, r) => sum + (Number(r.quantity) || 0), 0);
  let totalSold = Math.max(0, totalPurchased - currentStock);

  // 2. Deplete sold items from oldest purchases; drop any batch that is completely sold out
  const activeBatchesRaw: Array<Record<string, unknown> & { availableQty: number }> = [];

  for (const r of chronologicalRows) {
    const origQty = Number(r.quantity) || 0;
    if (totalSold >= origQty) {
      // Entire batch already sold out -> DO NOT show in sales
      totalSold -= origQty;
      continue;
    }

    const remainingQty = origQty - totalSold;
    totalSold = 0;

    if (remainingQty > 0) {
      activeBatchesRaw.push({
        ...r,
        availableQty: remainingQty,
      });
    }
  }

  // If manual stock was adjusted higher than purchases, assign the remainder to the newest batch
  const totalActiveQty = activeBatchesRaw.reduce((sum, b) => sum + b.availableQty, 0);
  if (currentStock > totalActiveQty && activeBatchesRaw.length > 0) {
    activeBatchesRaw[activeBatchesRaw.length - 1].availableQty += (currentStock - totalActiveQty);
  } else if (activeBatchesRaw.length === 0 && currentStock > 0) {
    const latestPurchase = chronologicalRows[chronologicalRows.length - 1];
    activeBatchesRaw.push({
      ...latestPurchase,
      availableQty: currentStock,
    });
  }

  // 3. When expiry tracking is active, prioritize closest expiry date among the remaining in-stock batches
  if (isExpiryEnabled && activeBatchesRaw.length > 1) {
    activeBatchesRaw.sort((a, b) => {
      const expA = (a.expiry_date as string | null)?.trim() || null;
      const expB = (b.expiry_date as string | null)?.trim() || null;
      if (expA && expB) {
        if (expA !== expB) return expA.localeCompare(expB);
      } else if (expA && !expB) {
        return -1;
      } else if (!expA && expB) {
        return 1;
      }
      const dateA = (a.date || a.created_at || '') as string;
      const dateB = (b.date || b.created_at || '') as string;
      if (dateA !== dateB) return dateA.localeCompare(dateB);
      return Number(a.purchase_id) - Number(b.purchase_id);
    });
  }

  return activeBatchesRaw.map((r, index) => ({
    batchNum: index + 1,
    purchaseId: Number(r.purchase_id),
    purchaseNumber: (r.purchase_number as string) || `P-${r.purchase_id}`,
    date: (r.date || r.created_at || new Date().toISOString()) as string,
    buyPriceIQD: Number(r.buy_price_iqd) || 0,
    buyPriceUSD: Number(r.buy_price_usd) || 0,
    sellPriceIQD: Number(r.sell_price_iqd) || (Number(productRow?.selling_price) || 0),
    sellPriceUSD: Number(r.sell_price_usd) || (Number(productRow?.sell_price_usd) || 0),
    quantity: r.availableQty,
    productionDate: (r.production_date as string) || null,
    expiryDate: (r.expiry_date as string) || null,
    supplierName: (r.supplier_name as string) || null,
    isOldest: index === 0,
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
      COALESCE(p.image_uri, p.image_remote_url) AS image_uri
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

export const DIRECT_CUSTOMER_NAME = 'کڕیاری ڕاستەوخۆ';

export function isDirectCustomerName(name?: string | null): boolean {
  if (!name) return false;
  const n = name.trim().toLowerCase();
  return (
    n === DIRECT_CUSTOMER_NAME.toLowerCase() ||
    n === 'direct customer' ||
    n === 'walk-in customer' ||
    n === 'کڕیاری راستەوخۆ' ||
    n === 'کڕیاری دەستبەجێ' ||
    n === 'الزبون المباشر' ||
    n === 'عميل مباشر' ||
    n === 'زبون مباشر'
  );
}

export async function ensureDirectCustomer(db?: SQLite.SQLiteDatabase): Promise<number> {
  const database = db ?? (await getDatabase());
  const row = await database.getFirstAsync<{ id: number }>(
    `SELECT id FROM customers 
     WHERE LOWER(TRIM(name)) = LOWER(TRIM(?))
        OR LOWER(TRIM(name)) = 'direct customer'
        OR LOWER(TRIM(name)) = 'walk-in customer'
     LIMIT 1`,
    [DIRECT_CUSTOMER_NAME]
  );
  let directId: number;
  if (row) {
    directId = row.id;
  } else {
    const uuid = await newUuid();
    const res = await database.runAsync(
      'INSERT INTO customers (name, phone, address, notes, uuid) VALUES (?, NULL, NULL, ?, ?)',
      [DIRECT_CUSTOMER_NAME, 'سیستەم • فرۆشتنی ڕاستەوخۆ', uuid]
    );
    directId = res.lastInsertRowId;
  }

  // Backfill any prior direct sales that had customer_id IS NULL
  try {
    await database.runAsync(
      `UPDATE sales SET customer_id = ? 
       WHERE customer_id IS NULL 
         AND (customer_name = ? OR customer_name = 'Direct Customer' OR customer_name = 'Walk-in Customer')`,
      [directId, DIRECT_CUSTOMER_NAME]
    );
  } catch { }

  return directId;
}

export async function getOrCreateDirectCustomer(): Promise<number> {
  return ensureDirectCustomer();
}

export async function upsertCustomer(input: {
  name: string;
  phone: string;
  address?: string;
  selectedId?: number;
}): Promise<number> {
  const database = await getDatabase();
  const trimName = input.name.trim();

  // If this is the direct customer, always route to ensureDirectCustomer!
  if (isDirectCustomerName(trimName)) {
    return ensureDirectCustomer(database);
  }

  if (input.selectedId) return input.selectedId;

  const trimPhone = toEnglishDigits(input.phone.trim());

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
    'INSERT INTO customers (name, phone, address, uuid) VALUES (?, ?, ?, ?)',
    [trimName, trimPhone || null, input.address?.trim() || null, await newUuid()]
  );
  return result.lastInsertRowId;
}

export async function getOrCreateCustomerAccount(input: {
  name: string;
  phone?: string | null;
  address?: string | null;
  selectedId?: number | null;
}): Promise<number> {
  const database = await getDatabase();
  const trimName = input.name.trim();
  if (!trimName) return 0;
  if (isDirectCustomerName(trimName)) {
    return ensureDirectCustomer(database);
  }

  if (input.selectedId) {
    return input.selectedId;
  }

  const trimPhone = input.phone ? toEnglishDigits(input.phone.trim()) : '';

  if (trimPhone) {
    const existing = await database.getFirstAsync<{ id: number }>(
      'SELECT id FROM customers WHERE phone = ?',
      [trimPhone]
    );
    if (existing) return existing.id;
  }

  const existingByName = await database.getFirstAsync<{ id: number }>(
    'SELECT id FROM customers WHERE LOWER(TRIM(name)) = LOWER(TRIM(?))',
    [trimName]
  );
  if (existingByName) return existingByName.id;

  const result = await database.runAsync(
    'INSERT INTO customers (name, phone, address, uuid) VALUES (?, ?, ?, ?)',
    [trimName, trimPhone || null, input.address?.trim() || null, await newUuid()]
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
  data: Partial<{ name: string; phone: string | null; address: string | null; notes: string | null }>
): Promise<void> {
  const database = await getDatabase();

  const cust = await database.getFirstAsync<{ name: string; phone: string | null }>(
    'SELECT name, phone FROM customers WHERE id = ?',
    [id]
  );
  if (cust && isDirectCustomerName(cust.name) && data.name !== undefined && data.name !== null && !isDirectCustomerName(data.name)) {
    throw new Error('CANNOT_RENAME_DIRECT_CUSTOMER');
  }

  let finalName: string | undefined = undefined;
  if (data.name !== undefined && data.name !== null) {
    const trimName = data.name.trim();
    if (trimName) {
      const byName = await database.getFirstAsync<{ id: number }>(
        'SELECT id FROM customers WHERE LOWER(TRIM(name)) = LOWER(TRIM(?)) AND id != ?',
        [trimName, id]
      );
      if (byName) throw new Error('DUPLICATE_NAME');
      finalName = trimName;
    }
  }

  let finalPhone: string | null | undefined = undefined;
  if (data.phone !== undefined) {
    if (data.phone && data.phone.trim()) {
      const trimPhone = toEnglishDigits(data.phone.trim());
      const byPhone = await database.getFirstAsync<{ id: number; name: string }>(
        'SELECT id, name FROM customers WHERE phone = ? AND id != ?',
        [trimPhone, id]
      );
      if (byPhone) throw new Error(`DUPLICATE_PHONE:${byPhone.name}`);
      finalPhone = trimPhone;
    } else {
      finalPhone = null;
    }
  }

  let finalAddress: string | null | undefined = undefined;
  if (data.address !== undefined) {
    finalAddress = data.address && data.address.trim() ? data.address.trim() : null;
  }

  let finalNotes: string | null | undefined = undefined;
  if (data.notes !== undefined) {
    finalNotes = data.notes && data.notes.trim() ? data.notes.trim() : null;
  }

  const fields: string[] = [];
  const values: unknown[] = [];

  if (finalName !== undefined) { fields.push('name = ?'); values.push(finalName); }
  if (finalPhone !== undefined) { fields.push('phone = ?'); values.push(finalPhone); }
  if (finalAddress !== undefined) { fields.push('address = ?'); values.push(finalAddress); }
  if (finalNotes !== undefined) { fields.push('notes = ?'); values.push(finalNotes); }
  if (fields.length === 0) return;

  fields.push('updated_at = CURRENT_TIMESTAMP');
  values.push(id);
  await database.runAsync(
    `UPDATE customers SET ${fields.join(', ')} WHERE id = ?`,
    values as SQLite.SQLiteBindValue[]
  );

  const oldName = cust?.name;
  if (finalName !== undefined) {
    if (oldName) {
      await database.runAsync(
        'UPDATE sales SET customer_name = ? WHERE customer_id = ? OR (customer_id IS NULL AND customer_name = ?)',
        [finalName, id, oldName]
      );
      await database.runAsync(
        `UPDATE debts SET customer_name = ? WHERE sale_id IN (SELECT id FROM sales WHERE customer_id = ? OR customer_name = ?) OR customer_name = ?`,
        [finalName, id, finalName, oldName]
      );
    } else {
      await database.runAsync(
        'UPDATE sales SET customer_name = ? WHERE customer_id = ?',
        [finalName, id]
      );
      await database.runAsync(
        `UPDATE debts SET customer_name = ? WHERE sale_id IN (SELECT id FROM sales WHERE customer_id = ?)`,
        [finalName, id]
      );
    }
  }

  if (finalPhone !== undefined) {
    await database.runAsync(
      'UPDATE sales SET customer_phone = ? WHERE customer_id = ?',
      [finalPhone, id]
    );
    await database.runAsync(
      `UPDATE debts SET customer_phone = ? WHERE sale_id IN (SELECT id FROM sales WHERE customer_id = ?)`,
      [finalPhone, id]
    );
  }

  if (finalAddress !== undefined) {
    await database.runAsync(
      'UPDATE sales SET customer_address = ? WHERE customer_id = ?',
      [finalAddress, id]
    );
  }
}

export async function deleteCustomer(id: number): Promise<void> {
  const database = await getDatabase();

  const cust = await database.getFirstAsync<{ name: string }>(
    'SELECT name FROM customers WHERE id = ?',
    [id]
  );
  if (cust && isDirectCustomerName(cust.name)) {
    throw new Error('CANNOT_DELETE_DIRECT_CUSTOMER');
  }

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
      `SELECT si.*, p.item_description AS item_description
       FROM sale_items si
       LEFT JOIN products p ON p.id = si.product_id
       WHERE si.sale_id = ?`, [sale.id]
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

export async function addPaymentToDebt(
  debtId: number,
  amount: number,
  paymentDate?: string,
  paymentMethod: string = 'cash'
): Promise<DebtPaymentReceiptData> {
  const database = await getDatabase();
  const ts = paymentDate ?? new Date().toISOString();
  let receipt: DebtPaymentReceiptData | null = null;

  await database.withTransactionAsync(async () => {
    const debt = await database.getFirstAsync<{
      sale_id: number;
      remaining_amount: number;
      original_amount: number;
      customer_name?: string | null;
      customer_phone?: string | null;
    }>(
      'SELECT sale_id, remaining_amount, original_amount, customer_name, customer_phone FROM debts WHERE id = ?',
      [debtId]
    );
    if (!debt) throw new Error(`Debt not found for id ${debtId}`);

    const sale = await database.getFirstAsync<{
      customer_id: number | null;
      customer_name: string | null;
      customer_phone: string | null;
      customer_address: string | null;
      invoice_number: string | null;
    }>(
      'SELECT customer_id, customer_name, customer_phone, customer_address, invoice_number FROM sales WHERE id = ?',
      [debt.sale_id]
    );

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

    let createdBy: string | null = null;
    let createdByEmail: string | null = null;
    try {
      const mgmt = require('@/store/managementStore').useManagementStore.getState();
      const auth = require('@/store/authStore').useAuthStore.getState();
      createdBy = mgmt.isEmployee
        ? (mgmt.currentEmployeeAccount?.displayName || mgmt.currentEmployeeAccount?.email || 'کارمەند')
        : (auth.user?.displayName || auth.user?.email || 'فرۆشیار');
      createdByEmail = mgmt.isEmployee
        ? (mgmt.currentEmployeeAccount?.email?.toLowerCase() || '')
        : (auth.user?.email?.toLowerCase() || '');
    } catch { }

    const insertRes = await database.runAsync(
      `INSERT INTO debt_payments (
         debt_id, debt_type, amount, remaining_after, created_at, uuid,
         event_type, customer_id, reference_number, original_amount, payment_method,
         created_by, created_by_email
       ) VALUES (?, 'sales', ?, ?, ?, ?, 'payment', ?, ?, ?, ?, ?, ?)`,
      [debtId, clamped, newRemaining, ts, await newUuid(), sale?.customer_id ?? null, sale?.invoice_number ?? null, debt.original_amount, paymentMethod, createdBy, createdByEmail]
    );

    const paymentId = insertRes.lastInsertRowId;
    const paymentNumber = `DP-${String(paymentId).padStart(5, '0')}`;
    const partyName = debt.customer_name || sale?.customer_name || 'کڕیار';
    const partyPhone = debt.customer_phone || sale?.customer_phone || null;
    const partyAddress = sale?.customer_address || null;

    receipt = {
      id: paymentId,
      paymentNumber,
      debtId,
      debtType: 'sales',
      partyName,
      partyPhone,
      partyAddress,
      referenceNumber: sale?.invoice_number ?? null,
      amount: clamped,
      previousBalance: debt.remaining_amount,
      remainingAfter: newRemaining,
      paymentMethod,
      note: null,
      createdAt: ts,
      originalAmount: debt.original_amount,
    };
  });

  if (!receipt) {
    throw new Error('Failed to create debt payment receipt');
  }
  return receipt;
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

    if (data.customerName !== undefined) { fields.push('customer_name = ?'); values.push(data.customerName); }
    if (data.customerPhone !== undefined) { fields.push('customer_phone = ?'); values.push(data.customerPhone); }
    if (data.customerAddress !== undefined) { fields.push('customer_address = ?'); values.push(data.customerAddress); }
    if (data.warranty !== undefined) { fields.push('warranty = ?'); values.push(data.warranty); }
    if (data.notes !== undefined) { fields.push('notes = ?'); values.push(data.notes); }

    let newGrandTotal = sale.grand_total;
    let newRemaining = sale.remaining_debt;

    if (data.discountDelta && data.discountDelta > 0) {
      newGrandTotal = Math.max(0, sale.grand_total - data.discountDelta);
      newRemaining = Math.max(0, sale.remaining_debt - data.discountDelta);
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
      invoice_number: string | null;
    }>('SELECT customer_id, grand_total, invoice_number FROM sales WHERE id = ?', [saleId]);
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
          purchase_price, selling_price, quantity, discount, line_total, uuid,
          batch_number, purchase_id
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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
          await newUuid(),
          item.batchNumber ?? null,
          item.purchaseId ?? null,
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
        const newDebtResult = await database.runAsync(
          `INSERT INTO debts (
            sale_id, customer_name, customer_phone,
            original_amount, paid_amount, remaining_amount, status, uuid
          ) VALUES (?, ?, ?, ?, ?, ?, 'active', ?)`,
          [
            saleId,
            input.customerName,
            input.customerPhone,
            input.grandTotal,
            input.paidAmount,
            input.remainingDebt,
            await newUuid(),
          ]
        );

        await database.runAsync(
          `INSERT INTO debt_payments (
             debt_id, debt_type, amount, remaining_after, created_at, uuid,
             event_type, customer_id, reference_number, original_amount
           ) VALUES (?, 'sales', ?, ?, CURRENT_TIMESTAMP, ?, 'debt_created', ?, ?, ?)`,
          [
            newDebtResult.lastInsertRowId,
            input.grandTotal,
            input.remainingDebt,
            await newUuid(),
            input.customerId ?? origSale.customer_id ?? null,
            origSale.invoice_number,
            input.grandTotal,
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
    initialPaymentMethod: (row.initial_payment_method as 'cash' | 'fib' | null) ?? null,
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
    printCount: (row.print_count as number) ?? 0,
    viewCount: (row.view_count as number) ?? 0,
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
    batchNumber: row.resolved_batch_number != null
      ? Number(row.resolved_batch_number)
      : (row.batch_number != null ? Number(row.batch_number) : null),
    purchaseId: row.purchase_id != null ? Number(row.purchase_id) : null,
    itemDescription: (row.item_description as string | null | undefined) ?? null,
  };
}

export async function insertSale(
  saleData: Omit<Sale, 'id' | 'createdAt' | 'updatedAt' | 'items'>,
  items: Omit<SaleItem, 'id' | 'saleId'>[]
): Promise<number> {
  const { assertSalesLimit } = await import('@/lib/usageLimits');
  await assertSalesLimit();

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
        grand_total, paid_amount, remaining_debt, status, exchange_rate, date, created_at, uuid,
        initial_payment_method, created_by, created_by_email
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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
        await newUuid(),
        saleData.initialPaymentMethod ?? null,
        saleData.createdBy ?? null,
        saleData.createdByEmail ?? null,
      ]
    );

    saleId = saleResult.lastInsertRowId;

    for (const item of items) {
      await database.runAsync(
        `INSERT INTO sale_items (
          sale_id, product_id, product_name, item_id, id_mode,
          purchase_price, selling_price, quantity, discount, line_total, uuid,
          batch_number, purchase_id
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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
          await newUuid(),
          item.batchNumber ?? null,
          item.purchaseId ?? null,
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
      const debtResult = await database.runAsync(
        `INSERT INTO debts (
          sale_id, customer_name, customer_phone,
          original_amount, paid_amount, remaining_amount, status, uuid,
          initial_payment_method
        ) VALUES (?, ?, ?, ?, ?, ?, 'active', ?, ?)`,
        [
          saleId,
          saleData.customerName ?? 'Unknown',
          saleData.customerPhone ?? null,
          saleData.grandTotal,
          saleData.paidAmount,
          saleData.remainingDebt,
          await newUuid(),
          saleData.paidAmount > 0 ? (saleData.initialPaymentMethod ?? 'cash') : null,
        ]
      );

      await database.runAsync(
        `INSERT INTO debt_payments (
           debt_id, debt_type, amount, remaining_after, created_at, uuid,
           event_type, customer_id, reference_number, original_amount
         ) VALUES (?, 'sales', ?, ?, CURRENT_TIMESTAMP, ?, 'debt_created', ?, ?, ?)`,
        [
          debtResult.lastInsertRowId,
          saleData.grandTotal,
          saleData.remainingDebt,
          await newUuid(),
          saleData.customerId ?? null,
          saleData.invoiceNumber,
          saleData.grandTotal,
        ]
      );

      if (saleData.paidAmount > 0) {
        await database.runAsync(
          `INSERT INTO debt_payments (
             debt_id, debt_type, amount, remaining_after, note, created_at, uuid,
             event_type, customer_id, reference_number, original_amount, payment_method
           ) VALUES (?, 'sales', ?, ?, 'Initial payment', CURRENT_TIMESTAMP, ?, 'payment', ?, ?, ?, ?)`,
          [
            debtResult.lastInsertRowId,
            saleData.paidAmount,
            saleData.remainingDebt,
            await newUuid(),
            saleData.customerId ?? null,
            saleData.invoiceNumber,
            saleData.grandTotal,
            saleData.initialPaymentMethod ?? 'cash',
          ]
        );
      }
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
    `SELECT si.*, p.item_description AS item_description,
            COALESCE(
              si.batch_number,
              CASE 
                WHEN si.purchase_id IS NOT NULL THEN (
                  SELECT COUNT(*)
                  FROM purchases p2
                  WHERE LOWER(TRIM(p2.product_name)) = LOWER(TRIM(si.product_name))
                    AND (p2.date < (SELECT date FROM purchases WHERE id = si.purchase_id)
                         OR (p2.date = (SELECT date FROM purchases WHERE id = si.purchase_id) AND p2.id <= si.purchase_id))
                )
                WHEN (SELECT COUNT(*) FROM purchases p3 WHERE LOWER(TRIM(p3.product_name)) = LOWER(TRIM(si.product_name))) > 0 THEN 1
                ELSE NULL
              END
            ) AS resolved_batch_number
     FROM sale_items si
     LEFT JOIN products p ON p.id = si.product_id
     WHERE si.sale_id = ?`, [id]
  );
  sale.items = itemRows.map(rowToSaleItem);
  return sale;
}

export async function incrementSalePrintCount(saleId: number): Promise<number> {
  const database = await getDatabase();
  await database.runAsync(
    'UPDATE sales SET print_count = COALESCE(print_count, 0) + 1 WHERE id = ?',
    [saleId]
  );
  const row = await database.getFirstAsync<{ print_count: number }>(
    'SELECT print_count FROM sales WHERE id = ?',
    [saleId]
  );
  return row?.print_count ?? 1;
}

export async function incrementSaleViewCount(saleId: number): Promise<number> {
  const database = await getDatabase();
  await database.runAsync(
    'UPDATE sales SET view_count = COALESCE(view_count, 0) + 1 WHERE id = ?',
    [saleId]
  );
  const row = await database.getFirstAsync<{ view_count: number }>(
    'SELECT view_count FROM sales WHERE id = ?',
    [saleId]
  );
  return row?.view_count ?? 1;
}

export async function attachItemsToSales(sales: Sale[]): Promise<Sale[]> {
  const needsItems = sales.filter((s) => !s.items || s.items.length === 0);
  if (needsItems.length === 0) return sales;
  const database = await getDatabase();
  const ids = needsItems.map((s) => s.id);
  const CHUNK = 500;
  const itemsBySaleId = new Map<number, SaleItem[]>();
  for (let i = 0; i < ids.length; i += CHUNK) {
    const chunk = ids.slice(i, i + CHUNK);
    const placeholders = chunk.map(() => '?').join(', ');
    const rows = await database.getAllAsync<Record<string, unknown>>(
      `SELECT si.*, p.item_description AS item_description
       FROM sale_items si
       LEFT JOIN products p ON p.id = si.product_id
       WHERE si.sale_id IN (${placeholders})`,
      chunk
    );
    for (const row of rows) {
      const item = rowToSaleItem(row);
      const list = itemsBySaleId.get(item.saleId) ?? [];
      list.push(item);
      itemsBySaleId.set(item.saleId, list);
    }
  }
  return sales.map((s) => ({
    ...s,
    items: s.items && s.items.length > 0 ? s.items : (itemsBySaleId.get(s.id) ?? []),
  }));
}

// Lightweight product-name/item-ID lookup for sales-history search, kept
// separate from getAllSales() so the main list load never pays for a join
// across every invoice's line items.
export async function getSaleItemsSearchIndex(): Promise<Record<number, string>> {
  const database = await getDatabase();
  const rows = await database.getAllAsync<{ sale_id: number; product_name: string; item_id: string | null }>(
    'SELECT sale_id, product_name, item_id FROM sale_items'
  );
  const index: Record<number, string> = {};
  for (const row of rows) {
    const part = row.item_id ? `${row.product_name} ${row.item_id}` : row.product_name;
    index[row.sale_id] = index[row.sale_id] ? `${index[row.sale_id]} ${part}` : part;
  }
  return index;
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
    imageUri: (row.image_uri as string | null) ?? null,
    totalSpent: (row.total_spent as number) ?? 0,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
    purchaseCount: (row.purchase_count as number) ?? 0,
    lastPurchaseDate: (row.last_purchase_date as string | null) ?? null,
  };
}

export const DIRECT_SUPPLIER_NAME = 'دابینکەری ڕاستەوخۆ';

export function isDirectSupplierName(name?: string | null): boolean {
  if (!name) return false;
  const n = name.trim().toLowerCase();
  return (
    n === DIRECT_SUPPLIER_NAME.toLowerCase() ||
    n === 'direct supplier' ||
    n === 'walk-in supplier' ||
    n === 'دابینکەری راستەوخۆ' ||
    n === 'دابینکەری دەستبەجێ' ||
    n === 'المورد المباشر' ||
    n === 'مورد مباشر'
  );
}

export async function ensureDirectSupplier(db?: SQLite.SQLiteDatabase): Promise<number> {
  const database = db ?? (await getDatabase());
  const row = await database.getFirstAsync<{ id: number }>(
    `SELECT id FROM suppliers 
     WHERE LOWER(TRIM(name)) = LOWER(TRIM(?))
        OR LOWER(TRIM(name)) = 'direct supplier'
        OR LOWER(TRIM(name)) = 'walk-in supplier'
        OR LOWER(TRIM(name)) = 'دابینکەری راستەوخۆ'
     LIMIT 1`,
    [DIRECT_SUPPLIER_NAME]
  );
  let directId: number;
  if (row) {
    directId = row.id;
  } else {
    let uuidVal: string | null = null;
    try {
      uuidVal = await newUuid();
    } catch { }

    let hasUuid = false;
    try {
      const cols = await database.getAllAsync<{ name: string }>("PRAGMA table_info('suppliers')");
      hasUuid = cols.some((c) => c.name === 'uuid');
    } catch { }

    if (hasUuid && uuidVal) {
      const res = await database.runAsync(
        'INSERT INTO suppliers (name, phone, address, notes, uuid) VALUES (?, NULL, NULL, ?, ?)',
        [DIRECT_SUPPLIER_NAME, 'سیستەم • دابینکەری ڕاستەوخۆ', uuidVal]
      );
      directId = res.lastInsertRowId;
    } else {
      const res = await database.runAsync(
        'INSERT INTO suppliers (name, phone, address, notes) VALUES (?, NULL, NULL, ?)',
        [DIRECT_SUPPLIER_NAME, 'سیستەم • دابینکەری ڕاستەوخۆ']
      );
      directId = res.lastInsertRowId;
    }
  }

  // Backfill any prior direct purchases that have supplier_name matching
  try {
    await database.runAsync(
      `UPDATE purchases SET supplier_name = ?
       WHERE supplier_name IS NOT NULL
         AND (LOWER(TRIM(supplier_name)) = 'direct supplier' OR LOWER(TRIM(supplier_name)) = 'دابینکەری راستەوخۆ')`,
      [DIRECT_SUPPLIER_NAME]
    );
  } catch { }

  return directId;
}

export async function getOrCreateDirectSupplier(): Promise<number> {
  return ensureDirectSupplier();
}

export async function findSupplierByNameOrPhone(name?: string | null, phone?: string | null): Promise<Supplier | null> {
  const database = await getDatabase();
  const trimName = name?.trim();
  const trimPhone = phone ? toEnglishDigits(phone.trim()) : null;

  if (trimName && !isDirectSupplierName(trimName)) {
    const row = await database.getFirstAsync<Record<string, unknown>>(
      'SELECT id, name, phone, address, notes, image_uri, total_spent, created_at, updated_at FROM suppliers WHERE LOWER(TRIM(name)) = LOWER(TRIM(?))',
      [trimName]
    );
    if (row) {
      return {
        id: row.id as number,
        name: row.name as string,
        phone: (row.phone as string | null) ?? null,
        address: (row.address as string | null) ?? null,
        notes: (row.notes as string | null) ?? null,
        imageUri: (row.image_uri as string | null) ?? null,
        totalSpent: (row.total_spent as number) ?? 0,
        createdAt: row.created_at as string,
        updatedAt: row.updated_at as string,
      };
    }
  }

  if (trimPhone) {
    const row = await database.getFirstAsync<Record<string, unknown>>(
      'SELECT id, name, phone, address, notes, image_uri, total_spent, created_at, updated_at FROM suppliers WHERE phone = ?',
      [trimPhone]
    );
    if (row) {
      return {
        id: row.id as number,
        name: row.name as string,
        phone: (row.phone as string | null) ?? null,
        address: (row.address as string | null) ?? null,
        notes: (row.notes as string | null) ?? null,
        imageUri: (row.image_uri as string | null) ?? null,
        totalSpent: (row.total_spent as number) ?? 0,
        createdAt: row.created_at as string,
        updatedAt: row.updated_at as string,
      };
    }
  }

  return null;
}

export async function upsertSupplier(input: {
  name: string;
  phone?: string | null;
  address?: string | null;
  selectedId?: number;
  imageUri?: string | null;
}): Promise<number> {
  const database = await getDatabase();
  const trimName = input.name ? input.name.trim() : '';

  if (isDirectSupplierName(trimName)) {
    return await ensureDirectSupplier(database);
  }

  const trimPhone = input.phone ? toEnglishDigits(input.phone.trim()) : null;
  const trimAddress = input.address?.trim() ?? null;
  const imageUri = input.imageUri?.trim() || null;

  // 1. If explicit selectedId was provided and exists in DB, update any missing details and return it
  if (input.selectedId) {
    const existing = await database.getFirstAsync<{ id: number; phone: string | null; address: string | null; image_uri: string | null }>(
      'SELECT id, phone, address, image_uri FROM suppliers WHERE id = ?',
      [input.selectedId]
    );
    if (existing) {
      if ((trimPhone && !existing.phone) || (trimAddress && !existing.address) || (imageUri && imageUri !== existing.image_uri)) {
        await database.runAsync(
          'UPDATE suppliers SET phone = COALESCE(phone, ?), address = COALESCE(address, ?), image_uri = COALESCE(?, image_uri), updated_at = CURRENT_TIMESTAMP WHERE id = ?',
          [trimPhone, trimAddress, imageUri, existing.id]
        );
      }
      return existing.id;
    }
  }

  if (!trimName) throw new Error('Supplier name is required');

  // 2. Check if a supplier exists by exact or case-insensitive name
  const byName = await database.getFirstAsync<{ id: number; phone: string | null; address: string | null; image_uri: string | null }>(
    'SELECT id, phone, address, image_uri FROM suppliers WHERE LOWER(TRIM(name)) = LOWER(TRIM(?))',
    [trimName]
  );
  if (byName) {
    if ((trimPhone && !byName.phone) || (trimAddress && !byName.address) || (imageUri && imageUri !== byName.image_uri)) {
      await database.runAsync(
        'UPDATE suppliers SET phone = COALESCE(phone, ?), address = COALESCE(address, ?), image_uri = COALESCE(?, image_uri), updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [trimPhone, trimAddress, imageUri, byName.id]
      );
    }
    return byName.id;
  }

  // 3. Check if a supplier exists with this phone number
  if (trimPhone) {
    const byPhone = await database.getFirstAsync<{ id: number; name: string; address: string | null; image_uri: string | null }>(
      'SELECT id, name, address, image_uri FROM suppliers WHERE phone = ?',
      [trimPhone]
    );
    if (byPhone) {
      if ((trimAddress && !byPhone.address) || (imageUri && imageUri !== byPhone.image_uri)) {
        await database.runAsync(
          'UPDATE suppliers SET address = COALESCE(address, ?), image_uri = COALESCE(?, image_uri), updated_at = CURRENT_TIMESTAMP WHERE id = ?',
          [trimAddress, imageUri, byPhone.id]
        );
      }
      return byPhone.id;
    }
  }

  // 4. Truly new supplier: create fresh record
  const result = await database.runAsync(
    'INSERT INTO suppliers (name, phone, address, image_uri, uuid) VALUES (?, ?, ?, ?, ?)',
    [trimName, trimPhone, trimAddress, imageUri, await newUuid()]
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
    `SELECT id, name, phone, address, notes, image_uri, total_spent, created_at, updated_at
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
    imageUri: (row.image_uri as string | null) ?? null,
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
  imageUri?: string | null;
}): Promise<void> {
  const database = await getDatabase();

  const current = await database.getFirstAsync<{ name: string }>(
    'SELECT name FROM suppliers WHERE id = ?',
    [id]
  );
  if (current && isDirectSupplierName(current.name)) {
    if (data.name !== undefined && !isDirectSupplierName(data.name)) {
      throw new Error('CANNOT_RENAME_DIRECT_SUPPLIER');
    }
  }

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
    const trimPhone = toEnglishDigits(data.phone.trim());
    const byPhone = await database.getFirstAsync<{ id: number; name: string }>(
      'SELECT id, name FROM suppliers WHERE phone = ? AND id != ?',
      [trimPhone, id]
    );
    if (byPhone) throw new Error(`DUPLICATE_PHONE:${byPhone.name}`);
    data = { ...data, phone: trimPhone };
  }

  const fields: string[] = [];
  const values: unknown[] = [];
  if (data.name !== undefined) { fields.push('name = ?'); values.push(data.name); }
  if (data.phone !== undefined) { fields.push('phone = ?'); values.push(data.phone); }
  if (data.address !== undefined) { fields.push('address = ?'); values.push(data.address); }
  if (data.notes !== undefined) { fields.push('notes = ?'); values.push(data.notes); }
  if (data.imageUri !== undefined) { fields.push('image_uri = ?'); values.push(data.imageUri); }
  if (fields.length === 0) return;
  fields.push('updated_at = CURRENT_TIMESTAMP');
  values.push(id);
  await database.runAsync(`UPDATE suppliers SET ${fields.join(', ')} WHERE id = ?`, values as SQLite.SQLiteBindValue[]);
}

export async function deleteSupplier(id: number): Promise<void> {
  const database = await getDatabase();

  const supp = await database.getFirstAsync<{ name: string }>(
    'SELECT name FROM suppliers WHERE id = ?',
    [id]
  );
  if (supp && isDirectSupplierName(supp.name)) {
    throw new Error('CANNOT_DELETE_DIRECT_SUPPLIER');
  }

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

    purchaseNumber = formatPurchaseNumber(nextNumber);
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
    supplierImageUri: (row.supplier_image_uri as string | null) ?? null,
    productName: row.product_name as string,
    category: row.category as string | null,
    quantity: row.quantity as number,
    buyPriceIQD: row.buy_price_iqd as number,
    buyPriceUSD: row.buy_price_usd as number,
    sellPriceIQD: row.sell_price_iqd as number,
    sellPriceUSD: row.sell_price_usd as number,
    totalIQD: row.total_iqd as number,
    profitIQD: row.profit_iqd as number,
    exchangeRate: (row.exchange_rate as number) ?? 1310,
    idType: (row.id_type as PurchaseIdType) ?? null,
    itemIds,
    warranty: row.warranty as string | null,
    description: row.description as string | null,
    notes: row.notes as string | null,
    paymentStatus: row.payment_status as PurchasePaymentStatus,
    initialPaymentMethod: (row.initial_payment_method as 'cash' | 'fib' | null) ?? null,
    productionDate: (row.production_date as string | null) ?? null,
    expiryDate: (row.expiry_date as string | null) ?? null,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
    printCount: (row.print_count as number) ?? 0,
    viewCount: (row.view_count as number) ?? 0,
  };
}

export async function insertPurchase(
  data: Omit<Purchase, 'id' | 'createdAt' | 'updatedAt'>
): Promise<number> {
  const database = await getDatabase();
  const result = await database.runAsync(
    `INSERT INTO purchases (
      purchase_number, date, supplier_name, supplier_phone, supplier_address, supplier_image_uri,
      product_name, category, quantity,
      buy_price_iqd, buy_price_usd, sell_price_iqd, sell_price_usd,
      total_iqd, profit_iqd, exchange_rate, id_type, item_ids,
      warranty, description, notes, payment_status, uuid,
      production_date, expiry_date, initial_payment_method,
      created_by, created_by_email
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      data.purchaseNumber,
      data.date,
      data.supplierName ?? null,
      data.supplierPhone ?? null,
      data.supplierAddress ?? null,
      data.supplierImageUri ?? null,
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
      await newUuid(),
      data.productionDate ?? null,
      data.expiryDate ?? null,
      data.initialPaymentMethod ?? null,
      data.createdBy ?? null,
      data.createdByEmail ?? null,
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
  const productRow = await database.getFirstAsync<{ image_uri: string | null; image_remote_url: string | null; item_description: string | null }>(
    'SELECT image_uri, image_remote_url, item_description FROM products WHERE purchase_id = ? ORDER BY id ASC LIMIT 1', [id]
  );
  purchase.imageUri = productRow?.image_uri || productRow?.image_remote_url || null;
  purchase.itemDescription = purchase.description || productRow?.item_description || null;
  return purchase;
}

export async function incrementPurchasePrintCount(purchaseId: number): Promise<number> {
  const database = await getDatabase();
  await database.runAsync(
    'UPDATE purchases SET print_count = COALESCE(print_count, 0) + 1 WHERE id = ?',
    [purchaseId]
  );
  const row = await database.getFirstAsync<{ print_count: number }>(
    'SELECT print_count FROM purchases WHERE id = ?',
    [purchaseId]
  );
  return row?.print_count ?? 1;
}

export async function incrementPurchaseViewCount(purchaseId: number): Promise<number> {
  const database = await getDatabase();
  await database.runAsync(
    'UPDATE purchases SET view_count = COALESCE(view_count, 0) + 1 WHERE id = ?',
    [purchaseId]
  );
  const row = await database.getFirstAsync<{ view_count: number }>(
    'SELECT view_count FROM purchases WHERE id = ?',
    [purchaseId]
  );
  return row?.view_count ?? 1;
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
      `INSERT INTO purchase_audit_log (purchase_id, action, changed_fields, old_values, new_values, actor_id, actor_name, uuid)
       VALUES (?, 'archive', '[]', '{}', '{}', ?, ?, ?)`,
      [id, actor.id, actor.name, await newUuid()]
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
  paymentStatus?: PurchasePaymentStatus;
  imageUri?: string | null;
  productionDate?: string | null;
  expiryDate?: string | null;
}

// Pushes the fields shared between a purchase and its linked product(s) onto the
// live `products` row(s) — keeps Inventory/Search/Reports/Sales/Dashboard in sync
// when these are edited from the Purchase side, since they all read from `products`.
async function propagateToProducts(
  database: SQLite.SQLiteDatabase,
  purchaseId: number,
  fields: {
    name?: string; category?: string | null;
    purchasePrice?: number; buyPriceUsd?: number;
    sellingPrice?: number; sellPriceUsd?: number;
    warranty?: string | null; description?: string | null; notes?: string | null;
    imageUri?: string | null;
    productionDate?: string | null;
    expiryDate?: string | null;
  }
): Promise<void> {
  const setClauses: string[] = [];
  const values: unknown[] = [];
  if (fields.name !== undefined) { setClauses.push('name = ?'); values.push(fields.name); }
  if (fields.category !== undefined) { setClauses.push('category = ?'); values.push(fields.category); }
  if (fields.purchasePrice !== undefined) { setClauses.push('purchase_price = ?'); values.push(fields.purchasePrice); }
  if (fields.buyPriceUsd !== undefined) { setClauses.push('buy_price_usd = ?'); values.push(fields.buyPriceUsd); }
  if (fields.sellingPrice !== undefined) { setClauses.push('selling_price = ?'); values.push(fields.sellingPrice); }
  if (fields.sellPriceUsd !== undefined) { setClauses.push('sell_price_usd = ?'); values.push(fields.sellPriceUsd); }
  if (fields.warranty !== undefined) { setClauses.push('warranty = ?'); values.push(fields.warranty); }
  if (fields.description !== undefined) { setClauses.push('description = ?'); values.push(fields.description); }
  if (fields.notes !== undefined) { setClauses.push('notes = ?'); values.push(fields.notes); }
  if (fields.imageUri !== undefined) {
    const rawUri = (fields.imageUri as string | null)?.trim() || null;
    const isRemote = rawUri && (rawUri.startsWith('http://') || rawUri.startsWith('https://'));
    if (!rawUri) {
      setClauses.push('image_uri = NULL', 'image_remote_url = NULL');
    } else if (isRemote) {
      setClauses.push('image_uri = ?', 'image_remote_url = ?');
      values.push(rawUri, rawUri);
    } else {
      setClauses.push('image_uri = ?', 'image_remote_url = NULL');
      values.push(rawUri);
    }
  }
  if (fields.productionDate !== undefined) { setClauses.push('production_date = ?'); values.push(fields.productionDate); }
  if (fields.expiryDate !== undefined) { setClauses.push('expiry_date = ?'); values.push(fields.expiryDate); }
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
    buyPriceIQD?: number; buyPriceUSD?: number;
    sellPriceIQD?: number; sellPriceUSD?: number;
    warranty?: string | null; description?: string | null; notes?: string | null;
    productionDate?: string | null;
    expiryDate?: string | null;
  }
): Promise<void> {
  const pFields: string[] = [];
  const pValues: unknown[] = [];
  if (fields.name !== undefined) { pFields.push('product_name = ?'); pValues.push(fields.name); }
  if (fields.category !== undefined) { pFields.push('category = ?'); pValues.push(fields.category); }
  if (fields.buyPriceIQD !== undefined) { pFields.push('buy_price_iqd = ?'); pValues.push(fields.buyPriceIQD); }
  if (fields.buyPriceUSD !== undefined) { pFields.push('buy_price_usd = ?'); pValues.push(fields.buyPriceUSD); }
  if (fields.sellPriceIQD !== undefined) { pFields.push('sell_price_iqd = ?'); pValues.push(fields.sellPriceIQD); }
  if (fields.sellPriceUSD !== undefined) { pFields.push('sell_price_usd = ?'); pValues.push(fields.sellPriceUSD); }
  if (fields.warranty !== undefined) { pFields.push('warranty = ?'); pValues.push(fields.warranty); }
  if (fields.description !== undefined) { pFields.push('description = ?'); pValues.push(fields.description); }
  if (fields.notes !== undefined) { pFields.push('notes = ?'); pValues.push(fields.notes); }
  if (fields.productionDate !== undefined) { pFields.push('production_date = ?'); pValues.push(fields.productionDate); }
  if (fields.expiryDate !== undefined) { pFields.push('expiry_date = ?'); pValues.push(fields.expiryDate); }

  // If buying price or selling price is being updated, recalculate total_iqd, profit_iqd, and debts
  if (fields.buyPriceIQD !== undefined || fields.sellPriceIQD !== undefined) {
    const existing = await database.getFirstAsync<{ quantity: number; buy_price_iqd: number; sell_price_iqd: number }>(
      'SELECT quantity, buy_price_iqd, sell_price_iqd FROM purchases WHERE id = ?',
      [purchaseId]
    );
    if (existing) {
      const buyPrice = fields.buyPriceIQD ?? existing.buy_price_iqd;
      const sellPrice = fields.sellPriceIQD ?? existing.sell_price_iqd;
      const newTotal = existing.quantity * buyPrice;
      const newProfit = (sellPrice - buyPrice) * existing.quantity;
      pFields.push('total_iqd = ?', 'profit_iqd = ?');
      pValues.push(newTotal, newProfit);

      await database.runAsync(
        `UPDATE purchase_debts SET
           original_amount = ?,
           remaining_amount = MAX(0, ? - paid_amount),
           updated_at = CURRENT_TIMESTAMP
         WHERE purchase_id = ?`,
        [newTotal, newTotal, purchaseId]
      );
    }
  }

  if (pFields.length > 0) {
    pFields.push('updated_at = CURRENT_TIMESTAMP');
    pValues.push(purchaseId);
    await database.runAsync(`UPDATE purchases SET ${pFields.join(', ')} WHERE id = ?`, pValues as SQLite.SQLiteBindValue[]);
  }

  const piFields: string[] = [];
  const piValues: unknown[] = [];
  if (fields.name !== undefined) { piFields.push('product_name = ?'); piValues.push(fields.name); }
  if (fields.category !== undefined) { piFields.push('category = ?'); piValues.push(fields.category); }
  if (fields.buyPriceIQD !== undefined) { piFields.push('buy_price_iqd = ?'); piValues.push(fields.buyPriceIQD); }
  if (fields.buyPriceUSD !== undefined) { piFields.push('buy_price_usd = ?'); piValues.push(fields.buyPriceUSD); }
  if (fields.sellPriceIQD !== undefined) { piFields.push('sell_price_iqd = ?'); piValues.push(fields.sellPriceIQD); }
  if (fields.sellPriceUSD !== undefined) { piFields.push('sell_price_usd = ?'); piValues.push(fields.sellPriceUSD); }
  if (fields.buyPriceIQD !== undefined) {
    piFields.push('line_total_iqd = quantity * ?');
    piValues.push(fields.buyPriceIQD);
  }
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
    const oldQty = existing.quantity as number;
    const idType = (existing.id_type as PurchaseIdType | null) ?? null;
    const newQty = input.quantity ?? oldQty;

    // Validate the quantity transition before writing anything.
    if (input.quantity !== undefined && newQty !== oldQty) {
      if (newQty < 0) throw new Error('QUANTITY_INVALID');
      const soldQty = await getSoldQuantityForPurchase(id);
      if (newQty < soldQty) throw new Error(`QUANTITY_BELOW_SOLD|${soldQty}`);
      if (idType === 'custom' && newQty > oldQty) throw new Error('CUSTOM_QTY_INCREASE_UNSUPPORTED');
    }

    const newBuy = input.buyPriceIQD ?? (existing.buy_price_iqd as number);
    const newSell = input.sellPriceIQD ?? (existing.sell_price_iqd as number);
    const newTotal = newQty * newBuy;
    const newProfit = (newSell - newBuy) * newQty;

    const fields: string[] = [];
    const values: unknown[] = [];
    if (input.date !== undefined) { fields.push('date = ?'); values.push(input.date); }
    if (input.productName !== undefined) { fields.push('product_name = ?'); values.push(input.productName); }
    if (input.category !== undefined) { fields.push('category = ?'); values.push(input.category); }
    if (input.quantity !== undefined) { fields.push('quantity = ?'); values.push(newQty); }
    if (input.buyPriceIQD !== undefined) { fields.push('buy_price_iqd = ?'); values.push(input.buyPriceIQD); }
    if (input.buyPriceUSD !== undefined) { fields.push('buy_price_usd = ?'); values.push(input.buyPriceUSD); }
    if (input.sellPriceIQD !== undefined) { fields.push('sell_price_iqd = ?'); values.push(input.sellPriceIQD); }
    if (input.sellPriceUSD !== undefined) { fields.push('sell_price_usd = ?'); values.push(input.sellPriceUSD); }
    if (input.warranty !== undefined) { fields.push('warranty = ?'); values.push(input.warranty); }
    if (input.description !== undefined) { fields.push('description = ?'); values.push(input.description); }
    if (input.notes !== undefined) { fields.push('notes = ?'); values.push(input.notes); }
    if (input.paymentStatus !== undefined) { fields.push('payment_status = ?'); values.push(input.paymentStatus); }
    if (input.productionDate !== undefined) { fields.push('production_date = ?'); values.push(input.productionDate); }
    if (input.expiryDate !== undefined) { fields.push('expiry_date = ?'); values.push(input.expiryDate); }

    fields.push('total_iqd = ?', 'profit_iqd = ?', 'updated_at = CURRENT_TIMESTAMP');
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
      productionDate: input.productionDate,
      expiryDate: input.expiryDate,
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
      if (input.productName !== undefined) { piFields.push('product_name = ?'); piValues.push(input.productName); }
      if (input.category !== undefined) { piFields.push('category = ?'); piValues.push(input.category); }
      if (input.quantity !== undefined) { piFields.push('quantity = ?'); piValues.push(newQty); }
      if (input.buyPriceIQD !== undefined) { piFields.push('buy_price_iqd = ?'); piValues.push(input.buyPriceIQD); }
      if (input.buyPriceUSD !== undefined) { piFields.push('buy_price_usd = ?'); piValues.push(input.buyPriceUSD); }
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
            `INSERT INTO purchase_debts (purchase_id, supplier_name, supplier_phone, original_amount, paid_amount, remaining_amount, status, uuid)
             VALUES (?, ?, ?, ?, 0, ?, 'active', ?)`,
            [id, suppName, suppPhone, newTotal, newTotal, await newUuid()]
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
        `INSERT INTO purchase_audit_log (purchase_id, action, changed_fields, old_values, new_values, actor_id, actor_name, uuid)
         VALUES (?, 'update', ?, ?, ?, ?, ?, ?)`,
        [id, JSON.stringify(changedFields), JSON.stringify(oldValues), JSON.stringify(newValues), actor.id, actor.name, await newUuid()]
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
  totalRevenue: number;
  totalProfit: number;
  totalSales: number;
  totalDebt: number;
  avgOrderValue: number;
}

export interface TopProduct {
  productName: string;
  totalQty: number;
  totalRevenue: number;
}

export interface TopCustomer {
  name: string;
  phone: string | null;
  totalPurchases: number;
  saleCount: number;
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
    name: r.name as string,
    phone: (r.phone as string | null) ?? null,
    totalPurchases: r.total_purchases as number,
    saleCount: r.sale_count as number,
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
    period: r.period,
    revenue: r.revenue,
    profit: profitMap.get(r.period) ?? 0,
    sales: r.sales,
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
    paymentMethod?: string;
    notes: string | null;
  }
): Promise<number> {
  const database = await getDatabase();
  const actualPaid = Math.min(Math.max(0, data.paidAmount ?? 0), data.originalAmount);
  const remaining = data.originalAmount - actualPaid;
  const status = remaining <= 0 ? 'settled' : 'active';
  const method = actualPaid > 0 ? (data.paymentMethod ?? 'cash') : null;

  const result = await database.runAsync(
    `INSERT INTO purchase_debts
       (purchase_id, supplier_name, supplier_phone, supplier_address, purchase_number,
        original_amount, paid_amount, remaining_amount, status, notes, uuid, initial_payment_method)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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
      await newUuid(),
      method,
    ]
  );

  await database.runAsync(
    `INSERT INTO debt_payments (
       debt_id, debt_type, amount, remaining_after, created_at, uuid,
       event_type, supplier_name, reference_number, original_amount
     ) VALUES (?, 'purchase', ?, ?, CURRENT_TIMESTAMP, ?, 'debt_created', ?, ?, ?)`,
    [result.lastInsertRowId, data.originalAmount, remaining, await newUuid(), data.supplierName, data.purchaseNumber, data.originalAmount]
  );

  if (actualPaid > 0) {
    await database.runAsync(
      `INSERT INTO debt_payments (
         debt_id, debt_type, amount, remaining_after, note, created_at, uuid,
         event_type, supplier_name, reference_number, original_amount, payment_method
       ) VALUES (?, 'purchase', ?, ?, 'Initial payment', CURRENT_TIMESTAMP, ?, 'payment', ?, ?, ?, ?)`,
      [result.lastInsertRowId, actualPaid, remaining, await newUuid(), data.supplierName, data.purchaseNumber, data.originalAmount, data.paymentMethod ?? 'cash']
    );
  }

  return result.lastInsertRowId;
}

function rowToPurchaseDebt(row: Record<string, unknown>): PurchaseDebt {
  return {
    id: row.id as number,
    purchaseId: (row.purchase_id as number | null) ?? null,
    purchaseNumber: (row.purchase_number as string | null) ?? null,
    supplierName: row.supplier_name as string,
    supplierPhone: (row.supplier_phone as string | null) ?? null,
    supplierAddress: (row.supplier_address as string | null) ?? null,
    originalAmount: row.original_amount as number,
    paidAmount: row.paid_amount as number,
    remainingAmount: row.remaining_amount as number,
    status: row.status as 'active' | 'settled',
    notes: (row.notes as string | null) ?? null,
    lastPaymentAt: (row.last_payment_at as string | null) ?? null,
    initialPaymentMethod: (row.initial_payment_method as 'cash' | 'fib' | null) ?? null,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
    productName: (row.product_name as string | null) ?? null,
    batchNumber: row.batch_number != null ? Number(row.batch_number) : null,
    totalBatches: row.total_batches != null ? Number(row.total_batches) : null,
    batchQuantity: row.batch_quantity != null ? Number(row.batch_quantity) : null,
    purchaseDate: (row.purchase_date as string | null) ?? null,
    productId: row.product_id != null ? Number(row.product_id) : null,
  };
}

export async function getAllPurchaseDebts(): Promise<PurchaseDebt[]> {
  const database = await getDatabase();
  const rows = await database.getAllAsync<Record<string, unknown>>(
    `SELECT pd.*,
            p.product_name,
            p.quantity AS batch_quantity,
            p.date AS purchase_date,
            (
              SELECT COUNT(*)
              FROM purchases p2
              WHERE LOWER(TRIM(p2.product_name)) = LOWER(TRIM(p.product_name))
                AND (p2.date < p.date OR (p2.date = p.date AND p2.id <= p.id))
            ) AS batch_number,
            (
              SELECT COUNT(*)
              FROM purchases p3
              WHERE LOWER(TRIM(p3.product_name)) = LOWER(TRIM(p.product_name))
            ) AS total_batches,
            (
              SELECT id FROM products pr WHERE LOWER(TRIM(pr.name)) = LOWER(TRIM(p.product_name)) LIMIT 1
            ) AS product_id
     FROM purchase_debts pd
     LEFT JOIN purchases p ON p.id = pd.purchase_id
     WHERE pd.remaining_amount > 0
     ORDER BY pd.created_at DESC`
  );
  return rows.map(rowToPurchaseDebt);
}

export async function getPurchaseDebtById(id: number): Promise<PurchaseDebt | null> {
  const database = await getDatabase();
  const row = await database.getFirstAsync<Record<string, unknown>>(
    `SELECT pd.*,
            p.product_name,
            p.quantity AS batch_quantity,
            p.date AS purchase_date,
            (
              SELECT COUNT(*)
              FROM purchases p2
              WHERE LOWER(TRIM(p2.product_name)) = LOWER(TRIM(p.product_name))
                AND (p2.date < p.date OR (p2.date = p.date AND p2.id <= p.id))
            ) AS batch_number,
            (
              SELECT COUNT(*)
              FROM purchases p3
              WHERE LOWER(TRIM(p3.product_name)) = LOWER(TRIM(p.product_name))
            ) AS total_batches,
            (
              SELECT id FROM products pr WHERE LOWER(TRIM(pr.name)) = LOWER(TRIM(p.product_name)) LIMIT 1
            ) AS product_id
     FROM purchase_debts pd
     LEFT JOIN purchases p ON p.id = pd.purchase_id
     WHERE pd.id = ?`,
    [id]
  );
  return row ? rowToPurchaseDebt(row) : null;
}

export async function getPurchaseDebtByPurchaseId(purchaseId: number): Promise<PurchaseDebt | null> {
  const database = await getDatabase();
  const row = await database.getFirstAsync<Record<string, unknown>>(
    `SELECT * FROM purchase_debts WHERE purchase_id = ? ORDER BY created_at DESC LIMIT 1`, [purchaseId]
  );
  return row ? rowToPurchaseDebt(row) : null;
}

export async function addPaymentToPurchaseDebt(
  id: number,
  amount: number,
  paymentDate?: string,
  paymentMethod: string = 'cash'
): Promise<DebtPaymentReceiptData> {
  const database = await getDatabase();
  const ts = paymentDate ?? new Date().toISOString();
  let receipt: DebtPaymentReceiptData | null = null;

  await database.withTransactionAsync(async () => {
    const debt = await database.getFirstAsync<{
      remaining_amount: number;
      purchase_id: number | null;
      supplier_name: string;
      supplier_phone: string | null;
      supplier_address: string | null;
      purchase_number: string | null;
      original_amount: number;
    }>(
      'SELECT remaining_amount, purchase_id, supplier_name, supplier_phone, supplier_address, purchase_number, original_amount FROM purchase_debts WHERE id = ?',
      [id]
    );
    if (!debt) throw new Error(`Purchase debt not found for id ${id}`);

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

    let createdBy: string | null = null;
    let createdByEmail: string | null = null;
    try {
      const mgmt = require('@/store/managementStore').useManagementStore.getState();
      const auth = require('@/store/authStore').useAuthStore.getState();
      createdBy = mgmt.isEmployee
        ? (mgmt.currentEmployeeAccount?.displayName || mgmt.currentEmployeeAccount?.email || 'کارمەند')
        : (auth.user?.displayName || auth.user?.email || 'فرۆشیار');
      createdByEmail = mgmt.isEmployee
        ? (mgmt.currentEmployeeAccount?.email?.toLowerCase() || '')
        : (auth.user?.email?.toLowerCase() || '');
    } catch { }

    const insertRes = await database.runAsync(
      `INSERT INTO debt_payments (
         debt_id, debt_type, amount, remaining_after, created_at, uuid,
         event_type, supplier_name, reference_number, original_amount, payment_method,
         created_by, created_by_email
       ) VALUES (?, 'purchase', ?, ?, ?, ?, 'payment', ?, ?, ?, ?, ?, ?)`,
      [id, clamped, newRemaining, ts, await newUuid(), debt.supplier_name, debt.purchase_number, debt.original_amount, paymentMethod, createdBy, createdByEmail]
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

    const paymentId = insertRes.lastInsertRowId;
    const paymentNumber = `DP-${String(paymentId).padStart(5, '0')}`;

    receipt = {
      id: paymentId,
      paymentNumber,
      debtId: id,
      debtType: 'purchase',
      partyName: debt.supplier_name || 'دابینکەر',
      partyPhone: debt.supplier_phone || null,
      partyAddress: debt.supplier_address || null,
      referenceNumber: debt.purchase_number || null,
      amount: clamped,
      previousBalance: debt.remaining_amount,
      remainingAfter: newRemaining,
      paymentMethod,
      note: null,
      createdAt: ts,
      originalAmount: debt.original_amount,
    };
  });

  if (!receipt) {
    throw new Error('Failed to create purchase debt payment receipt');
  }
  return receipt;
}

// ─── Sales Debts (Detailed) ───────────────────────────────────────────────────

function rowToSalesDebtDetail(row: Record<string, unknown>): SalesDebtDetail {
  return {
    id: row.id as number,
    saleId: row.sale_id as number,
    customerName: row.customer_name as string,
    customerPhone: (row.customer_phone as string | null) ?? null,
    originalAmount: row.original_amount as number,
    paidAmount: row.paid_amount as number,
    remainingAmount: row.remaining_amount as number,
    status: row.status as 'active' | 'settled',
    lastPaymentAt: (row.last_payment_at as string | null) ?? null,
    initialPaymentMethod: (row.initial_payment_method as 'cash' | 'fib' | null) ?? null,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
    invoiceNumber: row.invoice_number as string,
    customerAddress: (row.customer_address as string | null) ?? null,
    warranty: (row.warranty as string | null) ?? null,
    saleNotes: (row.sale_notes as string | null) ?? null,
    productsSummary: (row.products_summary as string | null) ?? null,
    itemsCount: row.items_count != null ? Number(row.items_count) : undefined,
  };
}

export async function getAllSalesDebtsDetailed(): Promise<SalesDebtDetail[]> {
  const database = await getDatabase();
  const rows = await database.getAllAsync<Record<string, unknown>>(
    `SELECT d.*, s.invoice_number, s.customer_address,
            s.warranty, s.notes AS sale_notes,
            (
              SELECT GROUP_CONCAT(
                si.product_name || CASE 
                  WHEN si.batch_number IS NOT NULL AND si.batch_number > 0 THEN ' (وەجبەی ' || si.batch_number || char(8207) || ')'
                  WHEN (SELECT COUNT(*) FROM purchases p_sub WHERE LOWER(TRIM(p_sub.product_name)) = LOWER(TRIM(si.product_name))) > 0 THEN ' (وەجبەی 1' || char(8207) || ')'
                  ELSE ''
                END,
                ' ، '
              )
              FROM sale_items si
              WHERE si.sale_id = d.sale_id
            ) AS products_summary,
            (
              SELECT COUNT(DISTINCT si.product_id)
              FROM sale_items si
              WHERE si.sale_id = d.sale_id
            ) AS items_count
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
            s.warranty, s.notes AS sale_notes,
            (
              SELECT GROUP_CONCAT(
                si.product_name || CASE 
                  WHEN si.batch_number IS NOT NULL AND si.batch_number > 0 THEN ' (وەجبەی ' || si.batch_number || char(8207) || ')'
                  WHEN (SELECT COUNT(*) FROM purchases p_sub WHERE LOWER(TRIM(p_sub.product_name)) = LOWER(TRIM(si.product_name))) > 0 THEN ' (وەجبەی 1' || char(8207) || ')'
                  ELSE ''
                END,
                ' ، '
              )
              FROM sale_items si
              WHERE si.sale_id = d.sale_id
            ) AS products_summary,
            (
              SELECT COUNT(DISTINCT si.product_id)
              FROM sale_items si
              WHERE si.sale_id = d.sale_id
            ) AS items_count
     FROM debts d
     JOIN sales s ON d.sale_id = s.id
     WHERE d.id = ?`,
    [id]
  );
  return row ? rowToSalesDebtDetail(row) : null;
}

export async function getSalesDebtBySaleId(saleId: number): Promise<SalesDebtDetail | null> {
  const database = await getDatabase();
  const row = await database.getFirstAsync<Record<string, unknown>>(
    `SELECT d.*, s.invoice_number, s.customer_address,
            s.warranty, s.notes AS sale_notes,
            (
              SELECT GROUP_CONCAT(
                si.product_name || CASE 
                  WHEN si.batch_number IS NOT NULL AND si.batch_number > 0 THEN ' (وەجبەی ' || si.batch_number || char(8207) || ')'
                  WHEN (SELECT COUNT(*) FROM purchases p_sub WHERE LOWER(TRIM(p_sub.product_name)) = LOWER(TRIM(si.product_name))) > 0 THEN ' (وەجبەی 1' || char(8207) || ')'
                  ELSE ''
                END,
                ' ، '
              )
              FROM sale_items si
              WHERE si.sale_id = d.sale_id
            ) AS products_summary,
            (
              SELECT COUNT(DISTINCT si.product_id)
              FROM sale_items si
              WHERE si.sale_id = d.sale_id
            ) AS items_count
     FROM debts d
     JOIN sales s ON d.sale_id = s.id
     WHERE d.sale_id = ?`,
    [saleId]
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
     WHERE debt_id = ? AND debt_type = ? AND event_type = 'payment'
     ORDER BY created_at DESC`,
    [debtId, debtType]
  );
  return rows.map((row) => ({
    id: row.id as number,
    debtId: row.debt_id as number,
    debtType: row.debt_type as 'sales' | 'purchase',
    amount: row.amount as number,
    remainingAfter: row.remaining_after as number,
    paymentMethod: (row.payment_method as string | null) ?? null,
    note: (row.note as string | null) ?? null,
    createdAt: row.created_at as string,
  }));
}

// ─── Financial Timeline (Debt Payment History) ────────────────────────────────
// Permanent, per-customer/per-supplier ledger of debt lifecycle events, built
// from debt_payments rows (which are never deleted when a debt is settled).
// Unlike getDebtPayments (used by the active-debt detail screens), this reads
// 'debt_created' and 'payment' rows for ALL debts — active and settled — and
// derives a 'debt_fully_paid' marker client-side, so it survives even after a
// debt disappears from the active Debt screen.

function rowToLedgerEvent(row: Record<string, unknown>): FinancialLedgerEvent {
  return {
    type: row.event_type as LedgerEventType,
    paymentId: row.id as number,
    debtId: row.debt_id as number,
    debtType: row.debt_type as DebtType,
    referenceNumber: (row.reference_number as string | null) ?? null,
    amount: row.amount as number,
    remainingAfter: row.remaining_after as number,
    paymentMethod: (row.payment_method as string | null) ?? null,
    note: (row.note as string | null) ?? null,
    createdAt: row.created_at as string,
  };
}

function deriveFullyPaidEvents(events: FinancialLedgerEvent[]): FinancialLedgerEvent[] {
  const byDebt = new Map<number, FinancialLedgerEvent[]>();
  for (const event of events) {
    const group = byDebt.get(event.debtId);
    if (group) group.push(event); else byDebt.set(event.debtId, [event]);
  }

  const settledMarkers: FinancialLedgerEvent[] = [];
  for (const group of byDebt.values()) {
    const last = group[group.length - 1];
    if (last.remainingAfter <= 0) {
      settledMarkers.push({
        type: 'debt_fully_paid',
        paymentId: null,
        debtId: last.debtId,
        debtType: last.debtType,
        referenceNumber: last.referenceNumber,
        amount: 0,
        remainingAfter: 0,
        paymentMethod: null,
        note: null,
        createdAt: last.createdAt,
      });
    }
  }

  return [...events, ...settledMarkers].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );
}

export async function getCustomerFinancialTimeline(customerId: number): Promise<FinancialLedgerEvent[]> {
  const database = await getDatabase();
  const rows = await database.getAllAsync<Record<string, unknown>>(
    `SELECT * FROM debt_payments
     WHERE debt_type = 'sales' AND (
       customer_id = ?
       OR (customer_id IS NULL AND debt_id IN (
         SELECT d.id FROM debts d JOIN sales s ON d.sale_id = s.id WHERE s.customer_id = ?
       ))
     )
     ORDER BY created_at ASC`,
    [customerId, customerId]
  );
  return deriveFullyPaidEvents(rows.map(rowToLedgerEvent));
}

export async function getSupplierFinancialTimeline(supplierName: string): Promise<FinancialLedgerEvent[]> {
  const database = await getDatabase();
  const rows = await database.getAllAsync<Record<string, unknown>>(
    `SELECT * FROM debt_payments
     WHERE debt_type = 'purchase' AND (
       LOWER(TRIM(supplier_name)) = LOWER(TRIM(?))
       OR (supplier_name IS NULL AND debt_id IN (
         SELECT id FROM purchase_debts WHERE LOWER(TRIM(supplier_name)) = LOWER(TRIM(?))
       ))
     )
     ORDER BY created_at ASC`,
    [supplierName, supplierName]
  );
  return deriveFullyPaidEvents(rows.map(rowToLedgerEvent));
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
    totalSalesDebt: salesRow?.total ?? 0,
    totalPurchaseDebt: purchaseRow?.total ?? 0,
    activeSalesCount: salesRow?.cnt ?? 0,
    activePurchaseCount: purchaseRow?.cnt ?? 0,
    overdueCount: overdueRow?.cnt ?? 0,
  };
}

// ─── Debt Payment Receipts ────────────────────────────────────────────────────

export async function getAllDebtPaymentReceipts(): Promise<DebtPaymentReceiptData[]> {
  const database = await getDatabase();
  const rows = await database.getAllAsync<Record<string, unknown>>(`
    SELECT
      dp.id,
      dp.debt_id,
      dp.debt_type,
      dp.amount,
      dp.remaining_after,
      dp.payment_method,
      dp.note,
      dp.created_at,
      dp.original_amount,
      dp.reference_number,
      COALESCE(dp.print_count, 0) AS print_count,
      COALESCE(dp.view_count, 0) AS view_count,
      CASE
        WHEN dp.debt_type = 'sales' THEN COALESCE(d.customer_name, s.customer_name, c.name, 'کڕیار')
        ELSE COALESCE(dp.supplier_name, pd.supplier_name, sup.name, 'دابینکەر')
      END AS party_name,
      CASE
        WHEN dp.debt_type = 'sales' THEN COALESCE(d.customer_phone, s.customer_phone, c.phone)
        ELSE COALESCE(pd.supplier_phone, sup.phone)
      END AS party_phone,
      CASE
        WHEN dp.debt_type = 'sales' THEN s.customer_address
        ELSE COALESCE(pd.supplier_address, sup.address)
      END AS party_address,
      CASE
        WHEN dp.debt_type = 'sales' THEN COALESCE(dp.reference_number, s.invoice_number)
        ELSE COALESCE(dp.reference_number, pd.purchase_number)
      END AS resolved_ref_number
    FROM debt_payments dp
    LEFT JOIN debts d ON dp.debt_type = 'sales' AND dp.debt_id = d.id
    LEFT JOIN sales s ON d.sale_id = s.id
    LEFT JOIN customers c ON dp.customer_id = c.id
    LEFT JOIN purchase_debts pd ON dp.debt_type = 'purchase' AND dp.debt_id = pd.id
    LEFT JOIN suppliers sup ON pd.supplier_name = sup.name
    WHERE dp.event_type = 'payment'
    ORDER BY dp.created_at DESC, dp.id DESC
  `);

  return rows.map((row) => {
    const id = row.id as number;
    const amount = (row.amount as number) || 0;
    const remainingAfter = (row.remaining_after as number) || 0;
    const originalAmount = (row.original_amount as number) || (remainingAfter + amount);
    return {
      id,
      paymentNumber: `DP-${String(id).padStart(5, '0')}`,
      debtId: row.debt_id as number,
      debtType: (row.debt_type as 'sales' | 'purchase') || 'sales',
      partyName: (row.party_name as string) || (row.debt_type === 'purchase' ? 'دابینکەر' : 'کڕیار'),
      partyPhone: (row.party_phone as string | null) ?? null,
      partyAddress: (row.party_address as string | null) ?? null,
      referenceNumber: (row.resolved_ref_number as string | null) ?? (row.reference_number as string | null) ?? null,
      amount,
      previousBalance: remainingAfter + amount,
      remainingAfter,
      paymentMethod: (row.payment_method as string) || 'cash',
      note: (row.note as string | null) ?? null,
      createdAt: (row.created_at as string) || new Date().toISOString(),
      originalAmount,
      printCount: (row.print_count as number) || 0,
      viewCount: (row.view_count as number) || 0,
    };
  });
}

export async function getDebtPaymentReceiptById(id: number): Promise<DebtPaymentReceiptData | null> {
  const database = await getDatabase();
  const row = await database.getFirstAsync<Record<string, unknown>>(`
    SELECT
      dp.id,
      dp.debt_id,
      dp.debt_type,
      dp.amount,
      dp.remaining_after,
      dp.payment_method,
      dp.note,
      dp.created_at,
      dp.original_amount,
      dp.reference_number,
      COALESCE(dp.print_count, 0) AS print_count,
      COALESCE(dp.view_count, 0) AS view_count,
      CASE
        WHEN dp.debt_type = 'sales' THEN COALESCE(d.customer_name, s.customer_name, c.name, 'کڕیار')
        ELSE COALESCE(dp.supplier_name, pd.supplier_name, sup.name, 'دابینکەر')
      END AS party_name,
      CASE
        WHEN dp.debt_type = 'sales' THEN COALESCE(d.customer_phone, s.customer_phone, c.phone)
        ELSE COALESCE(pd.supplier_phone, sup.phone)
      END AS party_phone,
      CASE
        WHEN dp.debt_type = 'sales' THEN s.customer_address
        ELSE COALESCE(pd.supplier_address, sup.address)
      END AS party_address,
      CASE
        WHEN dp.debt_type = 'sales' THEN COALESCE(dp.reference_number, s.invoice_number)
        ELSE COALESCE(dp.reference_number, pd.purchase_number)
      END AS resolved_ref_number
    FROM debt_payments dp
    LEFT JOIN debts d ON dp.debt_type = 'sales' AND dp.debt_id = d.id
    LEFT JOIN sales s ON d.sale_id = s.id
    LEFT JOIN customers c ON dp.customer_id = c.id
    LEFT JOIN purchase_debts pd ON dp.debt_type = 'purchase' AND dp.debt_id = pd.id
    LEFT JOIN suppliers sup ON pd.supplier_name = sup.name
    WHERE dp.id = ?
  `, [id]);

  if (!row) return null;
  const amount = (row.amount as number) || 0;
  const remainingAfter = (row.remaining_after as number) || 0;
  const originalAmount = (row.original_amount as number) || (remainingAfter + amount);
  return {
    id,
    paymentNumber: `DP-${String(id).padStart(5, '0')}`,
    debtId: row.debt_id as number,
    debtType: (row.debt_type as 'sales' | 'purchase') || 'sales',
    partyName: (row.party_name as string) || (row.debt_type === 'purchase' ? 'دابینکەر' : 'کڕیار'),
    partyPhone: (row.party_phone as string | null) ?? null,
    partyAddress: (row.party_address as string | null) ?? null,
    referenceNumber: (row.resolved_ref_number as string | null) ?? (row.reference_number as string | null) ?? null,
    amount,
    previousBalance: remainingAfter + amount,
    remainingAfter,
    paymentMethod: (row.payment_method as string) || 'cash',
    note: (row.note as string | null) ?? null,
    createdAt: (row.created_at as string) || new Date().toISOString(),
    originalAmount,
    printCount: (row.print_count as number) || 0,
    viewCount: (row.view_count as number) || 0,
  };
}

export async function incrementDebtReceiptPrintCount(paymentId: number): Promise<number> {
  const database = await getDatabase();
  await database.runAsync(
    'UPDATE debt_payments SET print_count = COALESCE(print_count, 0) + 1 WHERE id = ?',
    [paymentId]
  );
  const row = await database.getFirstAsync<{ print_count: number }>(
    'SELECT print_count FROM debt_payments WHERE id = ?',
    [paymentId]
  );
  return row?.print_count ?? 1;
}

export async function incrementDebtReceiptViewCount(paymentId: number): Promise<number> {
  const database = await getDatabase();
  await database.runAsync(
    'UPDATE debt_payments SET view_count = COALESCE(view_count, 0) + 1 WHERE id = ?',
    [paymentId]
  );
  const row = await database.getFirstAsync<{ view_count: number }>(
    'SELECT view_count FROM debt_payments WHERE id = ?',
    [paymentId]
  );
  return row?.view_count ?? 1;
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
  const hasRange = Boolean(from && to);
  const saleWhere = hasRange ? `WHERE created_at >= ? AND created_at <= ?` : '';
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
  const cnt = salesRow?.totalSales ?? 0;
  return {
    totalRevenue: rev,
    totalSales: cnt,
    totalItemsSold: itemsRow?.totalItemsSold ?? 0,
    totalDiscounts: salesRow?.totalDiscounts ?? 0,
    cashRevenue: salesRow?.cashRevenue ?? 0,
    fibRevenue: salesRow?.fibRevenue ?? 0,
    debtRevenue: salesRow?.debtRevenue ?? 0,
    cashCount: salesRow?.cashCount ?? 0,
    fibCount: salesRow?.fibCount ?? 0,
    debtCount: salesRow?.debtCount ?? 0,
    avgOrderValue: cnt > 0 ? rev / cnt : 0,
  };
}

export interface PurchaseReportData {
  totalCost: number;
  totalPurchases: number;
  totalUnits: number;
  paidCost: number;
  fibCost: number;
  debtCost: number;
  paidCount: number;
  fibCount: number;
  debtCount: number;
  uniqueSuppliers: number;
  topSupplier: string | null;
  topSupplierCost: number;
}

export async function getPurchaseReportData(from?: string, to?: string): Promise<PurchaseReportData> {
  const database = await getDatabase();
  const hasRange = Boolean(from && to);
  const where = hasRange
    ? `WHERE created_at >= ? AND created_at <= ?`
    : '';
  const params: SQLite.SQLiteBindValue[] = hasRange ? [from!, to!] : [];
  const row = await database.getFirstAsync<Record<string, unknown>>(`
    SELECT
      COALESCE(SUM(total_iqd), 0)                                                AS totalCost,
      COUNT(*)                                                                    AS totalPurchases,
      COALESCE(SUM(quantity), 0)                                                  AS totalUnits,
      COALESCE(SUM(CASE WHEN payment_status='paid' THEN total_iqd END), 0)       AS paidCost,
      COALESCE(SUM(CASE WHEN payment_status='fib'  THEN total_iqd END), 0)       AS fibCost,
      COALESCE(SUM(CASE WHEN payment_status='debt' THEN total_iqd END), 0)       AS debtCost,
      COUNT(CASE WHEN payment_status='paid' THEN 1 END)                          AS paidCount,
      COUNT(CASE WHEN payment_status='fib'  THEN 1 END)                          AS fibCount,
      COUNT(CASE WHEN payment_status='debt' THEN 1 END)                          AS debtCount,
      COUNT(DISTINCT supplier_name)                                               AS uniqueSuppliers
    FROM purchases ${where}
  `, params);
  const topRow = await database.getFirstAsync<{ supplier_name: string | null; supplier_cost: number }>(
    `SELECT supplier_name, SUM(total_iqd) AS supplier_cost
     FROM purchases ${where}
     GROUP BY supplier_name ORDER BY supplier_cost DESC LIMIT 1`,
    params
  );
  return {
    totalCost: (row?.totalCost as number) ?? 0,
    totalPurchases: (row?.totalPurchases as number) ?? 0,
    totalUnits: (row?.totalUnits as number) ?? 0,
    paidCost: (row?.paidCost as number) ?? 0,
    fibCost: (row?.fibCost as number) ?? 0,
    debtCost: (row?.debtCost as number) ?? 0,
    paidCount: (row?.paidCount as number) ?? 0,
    fibCount: (row?.fibCount as number) ?? 0,
    debtCount: (row?.debtCount as number) ?? 0,
    uniqueSuppliers: (row?.uniqueSuppliers as number) ?? 0,
    topSupplier: topRow?.supplier_name ?? null,
    topSupplierCost: topRow?.supplier_cost ?? 0,
  };
}

export interface ProfitLossData {
  grossRevenue: number;
  totalCOGS: number;
  grossProfit: number;
  grossMarginPct: number;
  totalExpenses: number;
  discardLoss?: number;
  discardLossUsd?: number;
  netProfit: number;
  netMarginPct: number;
  expenseBreakdown: { category: string; total: number }[];
}

export async function getProfitLossData(from?: string, to?: string): Promise<ProfitLossData> {
  const database = await getDatabase();
  const hasRange = Boolean(from && to);
  const saleLevelWhere = hasRange
    ? `WHERE status != 'cancelled' AND created_at >= ? AND created_at <= ?`
    : `WHERE status != 'cancelled'`;
  const itemLevelWhere = hasRange
    ? `WHERE s.status != 'cancelled' AND s.created_at >= ? AND s.created_at <= ?`
    : `WHERE s.status != 'cancelled'`;
  const expWhere = hasRange
    ? `WHERE date >= ? AND date <= ?`
    : '';

  const dateParams: SQLite.SQLiteBindValue[] = hasRange ? [from!, to!] : [];
  const expParams: SQLite.SQLiteBindValue[] = hasRange ? [from!.slice(0, 10), to!.slice(0, 10)] : [];

  // Check if expiry tracking is enabled
  let isExpiryEnabled = false;
  try {
    const settingVal = await loadSetting('expiry_tracking_enabled');
    if (settingVal !== null) {
      isExpiryEnabled = settingVal === '1';
    } else {
      const { useSettingsStore } = await import('@/store/settingsStore');
      isExpiryEnabled = !!useSettingsStore.getState().expiryTrackingEnabled;
    }
  } catch { }

  let discardLossIqd = 0;
  let discardLossUsd = 0;
  if (isExpiryEnabled) {
    const discardWhere = hasRange
      ? `WHERE restored_at IS NULL AND discarded_at >= ? AND discarded_at <= ?`
      : `WHERE restored_at IS NULL`;
    const discardRow = await database.getFirstAsync<{ lossIqd: number; lossUsd: number }>(`
      SELECT
        COALESCE(SUM(total_loss_iqd), 0) AS lossIqd,
        COALESCE(SUM(total_loss_usd), 0) AS lossUsd
      FROM discarded_products
      ${discardWhere}
    `, dateParams);
    discardLossIqd = discardRow?.lossIqd ?? 0;
    discardLossUsd = discardRow?.lossUsd ?? 0;
  }

  const [revenueRow, cogsRow] = await Promise.all([
    database.getFirstAsync<{ grossRevenue: number }>(
      `SELECT COALESCE(SUM(grand_total), 0) AS grossRevenue FROM sales ${saleLevelWhere}`,
      dateParams
    ),
    database.getFirstAsync<{ totalCOGS: number }>(
      `SELECT COALESCE(SUM(si.purchase_price * si.quantity), 0) AS totalCOGS
       FROM sale_items si JOIN sales s ON s.id = si.sale_id ${itemLevelWhere}`,
      dateParams
    ),
  ]);
  const salesRow = {
    grossRevenue: revenueRow?.grossRevenue ?? 0,
    totalCOGS: cogsRow?.totalCOGS ?? 0,
  };
  const expRow = await database.getFirstAsync<{ total: number }>(
    `SELECT COALESCE(SUM(amount), 0) AS total FROM expenses ${expWhere}`,
    expParams
  );
  const expBreakdown = await database.getAllAsync<{ category: string; total: number }>(
    `SELECT category, COALESCE(SUM(amount), 0) AS total
     FROM expenses ${expWhere}
     GROUP BY category ORDER BY total DESC`,
    expParams
  );

  const grossRevenue = salesRow?.grossRevenue ?? 0;
  const totalCOGS = salesRow?.totalCOGS ?? 0;
  const grossProfit = grossRevenue - totalCOGS;
  const totalExpenses = expRow?.total ?? 0;
  const netProfit = grossProfit - totalExpenses - discardLossIqd;

  return {
    grossRevenue,
    totalCOGS,
    grossProfit,
    grossMarginPct: grossRevenue > 0 ? (grossProfit / grossRevenue) * 100 : 0,
    totalExpenses,
    discardLoss: discardLossIqd,
    discardLossUsd: discardLossUsd,
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
  discardLoss?: number;
  discardLossUsd?: number;
}

export async function getFinancialSummaryCards(
  from?: string,
  to?: string,
): Promise<FinancialSummaryCards> {
  const database = await getDatabase();
  const hasRange = Boolean(from && to);
  const saleLevelWhere = hasRange
    ? `WHERE status = 'completed' AND created_at >= ? AND created_at <= ?`
    : `WHERE status = 'completed'`;
  const itemLevelWhere = hasRange
    ? `WHERE s.status = 'completed' AND s.created_at >= ? AND s.created_at <= ?`
    : `WHERE s.status = 'completed'`;

  const expWhere = hasRange
    ? `WHERE date >= ? AND date <= ?`
    : '';

  const dateParams: SQLite.SQLiteBindValue[] = hasRange ? [from!, to!] : [];
  const expParams: SQLite.SQLiteBindValue[] = hasRange ? [from!.slice(0, 10), to!.slice(0, 10)] : [];

  // Check if expiry tracking is enabled
  let isExpiryEnabled = false;
  try {
    const settingVal = await loadSetting('expiry_tracking_enabled');
    if (settingVal !== null) {
      isExpiryEnabled = settingVal === '1';
    } else {
      const { useSettingsStore } = await import('@/store/settingsStore');
      isExpiryEnabled = !!useSettingsStore.getState().expiryTrackingEnabled;
    }
  } catch { }

  let discardLossIqd = 0;
  let discardLossUsd = 0;
  if (isExpiryEnabled) {
    const discardWhere = hasRange
      ? `WHERE restored_at IS NULL AND discarded_at >= ? AND discarded_at <= ?`
      : `WHERE restored_at IS NULL`;
    const discardRow = await database.getFirstAsync<{ lossIqd: number; lossUsd: number }>(`
      SELECT
        COALESCE(SUM(total_loss_iqd), 0) AS lossIqd,
        COALESCE(SUM(total_loss_usd), 0) AS lossUsd
      FROM discarded_products
      ${discardWhere}
    `, dateParams);
    discardLossIqd = discardRow?.lossIqd ?? 0;
    discardLossUsd = discardRow?.lossUsd ?? 0;
  }

  const [totalsRow, profitRow, debtRow, expRow] = await Promise.all([
    database.getFirstAsync<{ totalSales: number }>(
      `SELECT COALESCE(SUM(grand_total), 0) AS totalSales FROM sales ${saleLevelWhere}`,
      dateParams
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
    `, dateParams),
    database.getFirstAsync<{ remaining: number }>(
      `SELECT COALESCE(SUM(remaining_amount), 0) AS remaining FROM debts WHERE status = 'active'`
    ),
    database.getFirstAsync<{ totalExpenses: number }>(
      `SELECT COALESCE(SUM(amount), 0) AS totalExpenses FROM expenses ${expWhere}`,
      expParams
    ),
  ]);

  const rawProfit = profitRow?.netProfit ?? 0;
  const expensesTotal = expRow?.totalExpenses ?? 0;
  const netProfit = rawProfit - expensesTotal - discardLossIqd;
  const totalLoss = (profitRow?.totalLoss ?? 0) + discardLossIqd;

  return {
    totalSales: totalsRow?.totalSales ?? 0,
    netProfit: netProfit,
    totalLoss: totalLoss,
    remainingCustomerDebt: debtRow?.remaining ?? 0,
    discardLoss: discardLossIqd,
    discardLossUsd: discardLossUsd,
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
    totalProducts: row?.totalProducts ?? 0,
    activeProducts: row?.activeProducts ?? 0,
    totalStockUnits: row?.totalStockUnits ?? 0,
    stockValueCost: cost,
    stockValueSell: sell,
    potentialProfit: sell - cost,
    outOfStockCount: row?.outOfStockCount ?? 0,
    lowStockCount: row?.lowStockCount ?? 0,
    categoryCounts: cats,
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

  const salesOrig = salesRow?.original ?? 0;
  const salesColl = salesRow?.collected ?? 0;

  return {
    totalSalesDebt: salesRow?.total ?? 0,
    totalPurchaseDebt: purchaseRow?.total ?? 0,
    combinedDebt: (salesRow?.total ?? 0) + (purchaseRow?.total ?? 0),
    activeSalesCount: salesRow?.cnt ?? 0,
    activePurchaseCount: purchaseRow?.cnt ?? 0,
    overdueCount: overdueRow?.cnt ?? 0,
    collectionRate: salesOrig > 0 ? (salesColl / salesOrig) * 100 : 0,
    salesDebtOriginal: salesOrig,
    salesDebtCollected: salesColl,
    purchaseDebtOriginal: purchaseRow?.original ?? 0,
    purchaseDebtPaid: purchaseRow?.paid ?? 0,
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
  const hasRange = Boolean(from && to);
  const where = hasRange
    ? `WHERE s.created_at >= ? AND s.created_at <= ?`
    : '';
  const params: SQLite.SQLiteBindValue[] = hasRange ? [from!, to!, limit] : [limit];
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
  `, params);
  return rows.map((r) => {
    const rev = r.total_revenue as number;
    const profit = r.gross_profit as number;
    return {
      productName: r.product_name as string,
      totalQty: r.total_qty as number,
      totalRevenue: rev,
      totalCost: r.total_cost as number,
      grossProfit: profit,
      marginPct: rev > 0 ? (profit / rev) * 100 : 0,
    };
  });
}

// ─── Loss Analysis ────────────────────────────────────────────────────────────

export interface LossAnalysis {
  totalLossAmount: number;
  lossSaleCount: number;
  lossItemCount: number;
  topLossProducts: { productName: string; lossAmount: number; qty: number }[];
}

export async function getLossAnalysis(from?: string, to?: string): Promise<LossAnalysis> {
  const database = await getDatabase();
  const hasRange = Boolean(from && to);
  const dateFilter = hasRange
    ? `AND s.created_at >= ? AND s.created_at <= ?`
    : '';
  const params: SQLite.SQLiteBindValue[] = hasRange ? [from!, to!] : [];

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
  `, params);

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
  `, params);

  return {
    totalLossAmount: summaryRow?.totalLossAmount ?? 0,
    lossSaleCount: summaryRow?.lossSaleCount ?? 0,
    lossItemCount: summaryRow?.lossItemCount ?? 0,
    topLossProducts: productRows.map((r) => ({
      productName: r.product_name as string,
      lossAmount: r.lossAmount as number,
      qty: r.qty as number,
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
  const now = new Date();
  const localDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  const result = await database.runAsync(
    `INSERT INTO expenses (amount, category, reason, note, date, uuid) VALUES (?, ?, ?, ?, ?, ?)`,
    [
      data.amount,
      data.category,
      data.reason,
      data.note ?? null,
      data.date ?? localDate,
      await newUuid(),
    ]
  );
  return result.lastInsertRowId;
}

export async function getAllExpenses(from?: string, to?: string): Promise<Expense[]> {
  const database = await getDatabase();
  const hasRange = Boolean(from && to);
  const where = hasRange
    ? `WHERE date >= ? AND date <= ?`
    : '';
  const params: SQLite.SQLiteBindValue[] = hasRange ? [from!.slice(0, 10), to!.slice(0, 10)] : [];
  const rows = await database.getAllAsync<Record<string, unknown>>(
    `SELECT * FROM expenses ${where} ORDER BY date DESC, created_at DESC`,
    params
  );
  return rows.map((r) => ({
    id: r.id as number,
    amount: r.amount as number,
    category: r.category as string,
    reason: (r.reason as string | null) ?? null,
    note: (r.note as string | null) ?? null,
    date: r.date as string,
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
    `INSERT INTO exchange_rates (rate, note, uuid) VALUES (?, ?, ?)`,
    [rate, note ?? null, await newUuid()]
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
    id: r.id as number,
    rate: r.rate as number,
    note: (r.note as string | null) ?? null,
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
  productionDate?: string | null;
  expiryDate?: string | null;
  itemDescription?: string | null;
  createdAt: string;
}

function rowToPurchaseItem(row: Record<string, unknown>): PurchaseItem {
  return {
    id: row.id as number,
    purchaseId: row.purchase_id as number,
    productName: row.product_name as string,
    category: (row.category as string | null) ?? null,
    quantity: row.quantity as number,
    buyPriceIQD: row.buy_price_iqd as number,
    buyPriceUSD: row.buy_price_usd as number,
    sellPriceIQD: row.sell_price_iqd as number,
    sellPriceUSD: row.sell_price_usd as number,
    lineTotalIQD: row.line_total_iqd as number,
    idType: (row.id_type as string | null) ?? null,
    itemIds: JSON.parse((row.item_ids as string) || '[]') as string[],
    productionDate: (row.production_date as string | null) ?? null,
    expiryDate: (row.expiry_date as string | null) ?? null,
    itemDescription: (row.item_description as string | null) ?? (row.product_item_description as string | null) ?? (row.purchase_description as string | null) ?? null,
    createdAt: row.created_at as string,
  };
}

export async function insertPurchaseItem(
  purchaseId: number,
  item: Omit<PurchaseItem, 'id' | 'purchaseId' | 'createdAt'>
): Promise<number> {
  const database = await getDatabase();
  if (item.category && item.category.trim()) {
    try {
      await database.runAsync(
        'INSERT OR IGNORE INTO categories (name, uuid) VALUES (?, lower(hex(randomblob(16))))',
        [item.category.trim()]
      );
    } catch { }
  }
  const result = await database.runAsync(
    `INSERT INTO purchase_items
       (purchase_id, product_name, category, quantity, buy_price_iqd, buy_price_usd,
        sell_price_iqd, sell_price_usd, line_total_iqd, id_type, item_ids, uuid,
        production_date, expiry_date)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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
      await newUuid(),
      item.productionDate ?? null,
      item.expiryDate ?? null,
    ]
  );
  return result.lastInsertRowId;
}

export async function getPurchaseItemsByPurchaseId(purchaseId: number): Promise<PurchaseItem[]> {
  const database = await getDatabase();
  const rows = await database.getAllAsync<Record<string, unknown>>(
    `SELECT pi.*, p.description AS purchase_description, prod.item_description AS product_item_description
     FROM purchase_items pi
     LEFT JOIN purchases p ON p.id = pi.purchase_id
     LEFT JOIN products prod ON prod.purchase_id = pi.purchase_id
     WHERE pi.purchase_id = ?
     GROUP BY pi.id
     ORDER BY pi.id ASC`,
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

  const cashReceived = cashRow?.v ?? 0;
  const expensesTotal = expRow?.v ?? 0;
  const unpaidCustomerDebt = unpaidDebtRow?.v ?? 0;
  const netBalance = cashReceived - expensesTotal;

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
  const todayStr = now.toISOString().slice(0, 10);
  const weekAgo = new Date(now); weekAgo.setDate(now.getDate() - 7);
  const monthAgo = new Date(now); monthAgo.setMonth(now.getMonth() - 1);
  const yearAgo = new Date(now); yearAgo.setFullYear(now.getFullYear() - 1);

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
    today: todayRow?.v ?? 0,
    weekly: weekRow?.v ?? 0,
    monthly: monthRow?.v ?? 0,
    yearly: yearRow?.v ?? 0,
  };
}

export interface CashDrawerStats {
  salesCash: number;
  customerDebtCash: number;
  purchasesCash: number;
  supplierDebtCash: number;
  expensesCash: number;
}

export async function getCashDrawerStats(activatedAt?: string): Promise<CashDrawerStats> {
  const database = await getDatabase();
  const sActClause = activatedAt ? 'WHERE s.created_at >= ?' : '';
  const expFilterClause = activatedAt ? 'WHERE created_at >= ? OR date >= ?' : '';
  const actDateOnly = activatedAt ? activatedAt.slice(0, 10) : '';

  const [salesRow, customerDebtRow, purchasesRow, supplierDebtRow, expensesRow] = await Promise.all([
    // Upfront cash received at checkout for sales created since activation
    database.getFirstAsync<{ v: number }>(
      `SELECT COALESCE(SUM(
        CASE
          WHEN d.id IS NULL THEN s.paid_amount
          ELSE MAX(0, s.paid_amount - COALESCE(p.paid_later, 0))
        END
      ), 0) AS v
      FROM sales s
      LEFT JOIN debts d ON d.sale_id = s.id
      LEFT JOIN (
        SELECT debt_id, SUM(amount) AS paid_later
        FROM debt_payments
        WHERE debt_type = 'sales' AND event_type = 'payment'
        GROUP BY debt_id
      ) p ON p.debt_id = d.id
      ${sActClause}`,
      activatedAt ? [activatedAt] : []
    ),
    // Customer debt collected since activation
    database.getFirstAsync<{ v: number }>(
      `SELECT COALESCE(SUM(amount), 0) AS v
       FROM debt_payments
       WHERE debt_type = 'sales' AND event_type = 'payment' ${activatedAt ? 'AND created_at >= ?' : ''}`,
      activatedAt ? [activatedAt] : []
    ),
    // Upfront cash purchases (no credit/debt and not digital FIB) since activation
    database.getFirstAsync<{ v: number }>(
      `SELECT COALESCE(SUM(total_iqd), 0) AS v
       FROM purchases
       WHERE payment_status != 'fib'
         AND id NOT IN (SELECT purchase_id FROM purchase_debts WHERE purchase_id IS NOT NULL)
       ${activatedAt ? 'AND created_at >= ?' : ''}`,
      activatedAt ? [activatedAt] : []
    ),
    // Supplier debt payments (both initial down payment and installments) made since activation
    database.getFirstAsync<{ v: number }>(
      `SELECT COALESCE(SUM(amount), 0) AS v
       FROM debt_payments
       WHERE debt_type = 'purchase' AND event_type = 'payment' ${activatedAt ? 'AND created_at >= ?' : ''}`,
      activatedAt ? [activatedAt] : []
    ),
    // Operating expenses since activation
    database.getFirstAsync<{ v: number }>(
      `SELECT COALESCE(SUM(amount), 0) AS v FROM expenses ${expFilterClause}`,
      activatedAt ? [activatedAt, actDateOnly] : []
    ),
  ]);

  return {
    salesCash: salesRow?.v ?? 0,
    customerDebtCash: customerDebtRow?.v ?? 0,
    purchasesCash: purchasesRow?.v ?? 0,
    supplierDebtCash: supplierDebtRow?.v ?? 0,
    expensesCash: expensesRow?.v ?? 0,
  };
}

// ─── Dashboard Overview & Recent Activity ──────────────────────────────────

export interface DashboardOverviewStats {
  totalRevenue: number;
  totalSales: number;
  totalInvoices: number;
  totalPurchasesCost: number;
  totalPurchasesCount: number;
  expectedProfit: number;
  totalDiscount: number;
  totalExpenses: number;
  totalCustomers: number;
  totalSuppliers: number;
  totalItems: number;
  lowStockCount: number;
  customerDebtTotal: number;
  supplierDebtTotal: number;
  // Batch analytics
  totalBatchesCount: number;
  activeBatchesCount: number;
  depletedBatchesCount: number;
  multiBatchProductsCount: number;
  expiringBatchesCount: number;
}

export interface DashboardActivityItem {
  id: string;
  type:
  | 'sale'
  | 'purchase'
  | 'customer_debt'
  | 'supplier_debt'
  | 'expense'
  | 'capital_deposit'
  | 'capital_withdraw'
  | 'customer'
  | 'supplier';
  title: string;
  subtitle: string;
  amount: number;
  discount?: number;
  timestamp: string;
  referenceNumber?: string;
}

export async function getDashboardOverviewStats(
  from?: string,
  to?: string,
): Promise<DashboardOverviewStats> {
  const database = await getDatabase();

  const hasRange = Boolean(from && to);

  const saleWhere = hasRange
    ? `WHERE status != 'cancelled' AND datetime(created_at) >= datetime(?) AND datetime(created_at) <= datetime(?)`
    : `WHERE status != 'cancelled'`;

  const itemWhere = hasRange
    ? `WHERE s.status != 'cancelled' AND datetime(s.created_at) >= datetime(?) AND datetime(s.created_at) <= datetime(?)`
    : `WHERE s.status != 'cancelled'`;

  const purchaseWhere = hasRange
    ? `WHERE archived_at IS NULL AND datetime(created_at) >= datetime(?) AND datetime(created_at) <= datetime(?)`
    : `WHERE archived_at IS NULL`;

  const expWhere = hasRange
    ? `WHERE (datetime(created_at) >= datetime(?) AND datetime(created_at) <= datetime(?)) OR (date >= ? AND date <= ?)`
    : '';

  const dateParams: SQLite.SQLiteBindValue[] = hasRange ? [from!, to!] : [];
  const expParams: SQLite.SQLiteBindValue[] = hasRange
    ? [from!, to!, from!.slice(0, 10), to!.slice(0, 10)]
    : [];

  const [
    salesRow,
    cogsRow,
    purchasesRow,
    expRow,
    custRow,
    supRow,
    prodRow,
    lowStockRow,
    custDebtRow,
    supDebtRow,
    allProductsRows,
    allPurchasesRows,
  ] = await Promise.all([
    // Sales summary
    database.getFirstAsync<{
      totalSales: number;
      totalInvoices: number;
      totalDiscount: number;
    }>(`
      SELECT
        COALESCE(SUM(grand_total), 0) AS totalSales,
        COUNT(*) AS totalInvoices,
        COALESCE(SUM(discount_total), 0) AS totalDiscount
      FROM sales ${saleWhere}
    `, dateParams),
    // Cost of goods sold for profit calculation
    database.getFirstAsync<{ totalCOGS: number }>(`
      SELECT COALESCE(SUM(si.purchase_price * si.quantity), 0) AS totalCOGS
      FROM sale_items si
      JOIN sales s ON s.id = si.sale_id
      ${itemWhere}
    `, dateParams),
    // Purchases summary
    database.getFirstAsync<{
      totalCost: number;
      totalPurchases: number;
    }>(`
      SELECT
        COALESCE(SUM(total_iqd), 0) AS totalCost,
        COUNT(*) AS totalPurchases
      FROM purchases ${purchaseWhere}
    `, dateParams),
    // Expenses
    database.getFirstAsync<{ totalExpenses: number }>(`
      SELECT COALESCE(SUM(amount), 0) AS totalExpenses
      FROM expenses ${expWhere}
    `, expParams),
    // Total Customers
    database.getFirstAsync<{ count: number }>(`
      SELECT COUNT(*) AS count FROM customers
    `),
    // Total Suppliers
    database.getFirstAsync<{ count: number }>(`
      SELECT COUNT(*) AS count FROM suppliers
    `),
    // Total Active Products
    database.getFirstAsync<{ count: number }>(`
      SELECT COUNT(*) AS count FROM products WHERE is_active = 1
    `),
    // Low Stock Products
    database.getFirstAsync<{ count: number }>(`
      SELECT COUNT(*) AS count FROM products
      WHERE is_active = 1 AND quantity <= COALESCE(low_stock_threshold, 3)
    `),
    // Active Customer Receivables (Debts)
    database.getFirstAsync<{ total: number }>(`
      SELECT COALESCE(SUM(remaining_amount), 0) AS total
      FROM debts WHERE status = 'active'
    `),
    // Active Supplier Payables (Debts)
    database.getFirstAsync<{ total: number }>(`
      SELECT COALESCE(SUM(remaining_amount), 0) AS total
      FROM purchase_debts WHERE status = 'active'
    `),
    // Active Products with quantity for batch depletion calculation
    database.getAllAsync<{ id: number; name: string; quantity: number }>(`
      SELECT id, LOWER(TRIM(name)) AS name, quantity FROM products WHERE is_active = 1
    `),
    // All Purchases for batch analytics
    database.getAllAsync<{
      id: number;
      product_name: string;
      quantity: number;
      expiry_date: string | null;
      date: string;
      created_at: string;
    }>(`
      SELECT id, LOWER(TRIM(product_name)) AS product_name, quantity, expiry_date, date, created_at
      FROM purchases
      WHERE archived_at IS NULL
      ORDER BY date ASC, created_at ASC, id ASC
    `),
  ]);

  const totalSales = salesRow?.totalSales ?? 0;
  const totalCOGS = cogsRow?.totalCOGS ?? 0;
  const totalExpenses = expRow?.totalExpenses ?? 0;
  const expectedProfit = totalSales - totalCOGS - totalExpenses;

  // Batch analytics calculation (FIFO depletion)
  const prodStockMap = new Map<string, number>();
  for (const p of allProductsRows || []) {
    prodStockMap.set(p.name, Number(p.quantity) || 0);
  }

  const purchasesByProd = new Map<string, Array<{ id: number; qty: number; expiry: string | null }>>();
  for (const r of allPurchasesRows || []) {
    if (!purchasesByProd.has(r.product_name)) {
      purchasesByProd.set(r.product_name, []);
    }
    purchasesByProd.get(r.product_name)!.push({
      id: Number(r.id),
      qty: Number(r.quantity) || 0,
      expiry: r.expiry_date ? String(r.expiry_date).trim() : null,
    });
  }

  const totalBatchesCount = (allPurchasesRows || []).length;
  let activeBatchesCount = 0;
  let depletedBatchesCount = 0;
  let multiBatchProductsCount = 0;
  let expiringBatchesCount = 0;

  const now = new Date();
  const in30Days = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

  for (const [name, purchases] of purchasesByProd.entries()) {
    const currentStock = prodStockMap.get(name) || 0;
    const totalPurchased = purchases.reduce((sum, p) => sum + p.qty, 0);
    let totalSold = Math.max(0, totalPurchased - currentStock);

    let activeForThisProduct = 0;
    for (const p of purchases) {
      if (totalSold >= p.qty) {
        totalSold -= p.qty;
        depletedBatchesCount++;
      } else {
        const remaining = p.qty - totalSold;
        totalSold = 0;
        if (remaining > 0) {
          activeBatchesCount++;
          activeForThisProduct++;
          if (p.expiry) {
            const expDate = new Date(p.expiry);
            if (!isNaN(expDate.getTime()) && expDate <= in30Days) {
              expiringBatchesCount++;
            }
          }
        } else {
          depletedBatchesCount++;
        }
      }
    }

    if (activeForThisProduct >= 2) {
      multiBatchProductsCount++;
    }
  }

  return {
    totalRevenue: totalSales,
    totalSales,
    totalInvoices: salesRow?.totalInvoices ?? 0,
    totalPurchasesCost: purchasesRow?.totalCost ?? 0,
    totalPurchasesCount: purchasesRow?.totalPurchases ?? 0,
    expectedProfit,
    totalDiscount: salesRow?.totalDiscount ?? 0,
    totalExpenses,
    totalCustomers: custRow?.count ?? 0,
    totalSuppliers: supRow?.count ?? 0,
    totalItems: prodRow?.count ?? 0,
    lowStockCount: lowStockRow?.count ?? 0,
    customerDebtTotal: custDebtRow?.total ?? 0,
    supplierDebtTotal: supDebtRow?.total ?? 0,
    totalBatchesCount,
    activeBatchesCount,
    depletedBatchesCount,
    multiBatchProductsCount,
    expiringBatchesCount,
  };
}

export async function getDashboardRecentActivities(
  limit: number = 40,
  from?: string,
  to?: string,
  language: 'ku' | 'en' = 'ku',
  filterUserEmail?: string,
): Promise<DashboardActivityItem[]> {
  const database = await getDatabase();

  const hasRange = Boolean(from && to);
  const normalizedEmail = filterUserEmail ? filterUserEmail.trim().toLowerCase() : undefined;

  let saleWhere = hasRange
    ? `WHERE status != 'cancelled' AND datetime(created_at) >= datetime(?) AND datetime(created_at) <= datetime(?)`
    : `WHERE status != 'cancelled'`;
  if (normalizedEmail) {
    saleWhere += ` AND (lower(COALESCE(created_by_email, '')) = ? OR notes LIKE '%' || ? || '%')`;
  }

  let purchaseWhere = hasRange
    ? `WHERE archived_at IS NULL AND datetime(created_at) >= datetime(?) AND datetime(created_at) <= datetime(?)`
    : `WHERE archived_at IS NULL`;
  if (normalizedEmail) {
    purchaseWhere += ` AND (lower(COALESCE(created_by_email, '')) = ? OR notes LIKE '%' || ? || '%')`;
  }

  let debtWhere = hasRange
    ? `WHERE datetime(dp.created_at) >= datetime(?) AND datetime(dp.created_at) <= datetime(?)`
    : '';
  if (normalizedEmail) {
    debtWhere = debtWhere
      ? `${debtWhere} AND (lower(COALESCE(dp.created_by_email, '')) = ? OR dp.note LIKE '%' || ? || '%')`
      : `WHERE (lower(COALESCE(dp.created_by_email, '')) = ? OR dp.note LIKE '%' || ? || '%')`;
  }

  let expWhere = hasRange
    ? `WHERE (datetime(created_at) >= datetime(?) AND datetime(created_at) <= datetime(?)) OR (date >= ? AND date <= ?)`
    : '';
  if (normalizedEmail) {
    expWhere = expWhere
      ? `${expWhere} AND (lower(COALESCE(created_by_email, '')) = ? OR note LIKE '%' || ? || '%')`
      : `WHERE (lower(COALESCE(created_by_email, '')) = ? OR note LIKE '%' || ? || '%')`;
  }

  const custWhere = hasRange
    ? `WHERE datetime(created_at) >= datetime(?) AND datetime(created_at) <= datetime(?)`
    : '';

  const supWhere = hasRange
    ? `WHERE datetime(created_at) >= datetime(?) AND datetime(created_at) <= datetime(?)`
    : '';

  const subLimit = hasRange ? Math.max(limit, 40) : 15;
  const partnerLimit = hasRange ? subLimit : 8;

  const saleParams: SQLite.SQLiteBindValue[] = hasRange ? [from!, to!] : [];
  if (normalizedEmail) saleParams.push(normalizedEmail, normalizedEmail);
  saleParams.push(subLimit);

  const purchaseParams: SQLite.SQLiteBindValue[] = hasRange ? [from!, to!] : [];
  if (normalizedEmail) purchaseParams.push(normalizedEmail, normalizedEmail);
  purchaseParams.push(subLimit);

  const debtParams: SQLite.SQLiteBindValue[] = hasRange ? [from!, to!] : [];
  if (normalizedEmail) debtParams.push(normalizedEmail, normalizedEmail);
  debtParams.push(subLimit);

  const expParams: SQLite.SQLiteBindValue[] = hasRange
    ? [from!, to!, from!.slice(0, 10), to!.slice(0, 10)]
    : [];
  if (normalizedEmail) expParams.push(normalizedEmail, normalizedEmail);
  expParams.push(subLimit);

  const custParams: SQLite.SQLiteBindValue[] = hasRange ? [from!, to!, partnerLimit] : [partnerLimit];
  const supParams: SQLite.SQLiteBindValue[] = hasRange ? [from!, to!, partnerLimit] : [partnerLimit];

  const [
    salesList,
    purchasesList,
    debtPaymentsList,
    expensesList,
    customersList,
    suppliersList,
  ] = await Promise.all([
    // Sales
    database.getAllAsync<{
      id: number;
      invoice_number: string;
      customer_name: string | null;
      grand_total: number;
      discount_total: number;
      created_at: string;
    }>(`
      SELECT id, invoice_number, customer_name, grand_total, discount_total, created_at
      FROM sales
      ${saleWhere}
      ORDER BY created_at DESC
      LIMIT ?
    `, saleParams),
    // Purchases
    database.getAllAsync<{
      id: number;
      purchase_number: string;
      supplier_name: string | null;
      product_name: string | null;
      total_iqd: number;
      created_at: string;
    }>(`
      SELECT id, purchase_number, supplier_name, product_name, total_iqd, created_at
      FROM purchases
      ${purchaseWhere}
      ORDER BY created_at DESC
      LIMIT ?
    `, purchaseParams),
    // Debt Payments
    database.getAllAsync<{
      id: number;
      debt_type: string;
      amount: number;
      note: string | null;
      created_at: string;
      entity_name: string | null;
    }>(`
      SELECT
        dp.id,
        dp.debt_type,
        dp.amount,
        dp.note,
        dp.created_at,
        CASE
          WHEN dp.debt_type = 'sales' THEN (SELECT customer_name FROM debts WHERE id = dp.debt_id)
          ELSE (SELECT supplier_name FROM purchase_debts WHERE id = dp.debt_id)
        END AS entity_name
      FROM debt_payments dp
      ${debtWhere}
      ORDER BY dp.created_at DESC
      LIMIT ?
    `, debtParams),
    // Expenses
    database.getAllAsync<{
      id: number;
      category: string;
      note: string | null;
      amount: number;
      created_at: string;
    }>(`
      SELECT id, category, note, amount, created_at
      FROM expenses
      ${expWhere}
      ORDER BY created_at DESC
      LIMIT ?
    `, expParams),
    // Customers
    database.getAllAsync<{
      id: number;
      name: string;
      created_at: string;
    }>(`
      SELECT id, name, created_at
      FROM customers
      ${custWhere}
      ORDER BY created_at DESC
      LIMIT ?
    `, custParams),
    // Suppliers
    database.getAllAsync<{
      id: number;
      name: string;
      created_at: string;
    }>(`
      SELECT id, name, created_at
      FROM suppliers
      ${supWhere}
      ORDER BY created_at DESC
      LIMIT ?
    `, supParams),
  ]);

  const items: DashboardActivityItem[] = [];
  const isEn = language === 'en';

  for (const s of salesList) {
    const invNo = s.invoice_number?.startsWith('F-') || s.invoice_number?.startsWith('B-') ? s.invoice_number : `#${s.invoice_number}`;
    items.push({
      id: `sale_${s.id}`,
      type: 'sale',
      title: isEn ? `Invoice ${invNo}` : `پسوولەی ${invNo}`,
      subtitle: s.customer_name?.trim() ? s.customer_name : (isEn ? 'General Customer' : 'کڕیاری گشتی'),
      amount: s.grand_total,
      discount: s.discount_total,
      timestamp: s.created_at,
      referenceNumber: s.invoice_number,
    });
  }

  for (const p of purchasesList) {
    const purNo = p.purchase_number?.startsWith('F-') || p.purchase_number?.startsWith('B-') ? p.purchase_number : `#${p.purchase_number}`;
    items.push({
      id: `purchase_${p.id}`,
      type: 'purchase',
      title: isEn ? `Purchase ${purNo}` : `کڕین ${purNo}`,
      subtitle: p.supplier_name?.trim() ? p.supplier_name : (p.product_name || (isEn ? 'General Purchase' : 'کڕینی کاڵا')),
      amount: p.total_iqd,
      timestamp: p.created_at,
      referenceNumber: p.purchase_number,
    });
  }

  for (const dp of debtPaymentsList) {
    const isSales = dp.debt_type === 'sales';
    items.push({
      id: `debt_${dp.id}`,
      type: isSales ? 'customer_debt' : 'supplier_debt',
      title: isSales
        ? (isEn ? 'Debt Collected' : 'وەرگرتنی قەرز')
        : (isEn ? 'Debt Paid' : 'دانەوەی قەرز'),
      subtitle: dp.entity_name || dp.note || (isSales ? (isEn ? 'Customer' : 'کڕیار') : (isEn ? 'Supplier' : 'دابینکەر')),
      amount: dp.amount,
      timestamp: dp.created_at,
    });
  }

  for (const e of expensesList) {
    items.push({
      id: `expense_${e.id}`,
      type: 'expense',
      title: isEn ? 'Expense' : 'مەسروفات',
      subtitle: e.note || e.category,
      amount: e.amount,
      timestamp: e.created_at,
    });
  }

  for (const c of customersList) {
    items.push({
      id: `cust_${c.id}`,
      type: 'customer',
      title: isEn ? 'New Customer' : 'کڕیاری نوێ',
      subtitle: c.name,
      amount: 0,
      timestamp: c.created_at,
    });
  }

  for (const sup of suppliersList) {
    items.push({
      id: `sup_${sup.id}`,
      type: 'supplier',
      title: isEn ? 'New Supplier' : 'دابینکەری نوێ',
      subtitle: sup.name,
      amount: 0,
      timestamp: sup.created_at,
    });
  }

  items.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  return items.slice(0, limit);
}

export async function getEmployeeActivities(
  employeeEmail: string,
  limit: number = 60,
  language: 'ku' | 'en' = 'ku'
): Promise<DashboardActivityItem[]> {
  return getDashboardRecentActivities(limit, undefined, undefined, language, employeeEmail);
}
