/**
 * Backup / Restore utility for Froshiar.
 *
 * expo-file-system is imported lazily inside each function (NOT at the top
 * level) so that requiring this module never calls requireNativeModule() at
 * evaluation time.  If the native module were unavailable (e.g., a version
 * mismatch in Expo Go), a top-level import would abort the entire module
 * chain and prevent Expo Router from registering the data-management route,
 * producing the "Unmatched Route froshiar:///" error.
 *
 * Restore is a MERGE, never a wipe-and-replace: existing local records are
 * never deleted or have their content silently overwritten. Business rows
 * carry a `uuid` column (see lib/sqlite.ts) that lets a restore recognize
 * "this record already exists" across independent backups/devices, since
 * per-device autoincrement ids and the app's Item ID are not reliable
 * cross-device keys. Backups made before this existed (no `uuid` anywhere)
 * still restore via a per-table natural-key fallback where one exists.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import type * as SQLite from 'expo-sqlite';
import { getDatabase } from '@/lib/sqlite';
import { newUuid } from '@/lib/uuid';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface FroshiarBackup {
  meta: {
    /** Present + >= 2 on backups produced by this version of the app (uuid-bearing
     *  rows, filtered scope). Absent on legacy backups (full raw dumps, no uuid). */
    schemaVersion?: number;
    version:    string;
    backupDate: string;
    appVersion: string;
    platform:   string;
  };
  database: {
    businesses:        Record<string, unknown>[];
    settings:          Record<string, unknown>[];
    categories:        Record<string, unknown>[];
    products:          Record<string, unknown>[];
    inventory_history: Record<string, unknown>[];
    customers:         Record<string, unknown>[];
    sales:             Record<string, unknown>[];
    sale_items:        Record<string, unknown>[];
    debts:             Record<string, unknown>[];
    invoice_counter:   Record<string, unknown>[];
    purchases:         Record<string, unknown>[];
    purchase_items:    Record<string, unknown>[];
    purchase_counter:  Record<string, unknown>[];
    purchase_debts:    Record<string, unknown>[];
    purchase_audit_log: Record<string, unknown>[];
    debt_payments:     Record<string, unknown>[];
    expenses:          Record<string, unknown>[];
    suppliers:         Record<string, unknown>[];
    exchange_rates:    Record<string, unknown>[];
  };
  /** Business-only slices of the AsyncStorage-persisted Zustand stores — plain
   *  filtered objects (NOT the zustand `{state, version}` persist envelope). */
  stores: {
    business: string;
    settings: string;
  };
}

const CURRENT_SCHEMA_VERSION = 2;

// Portable business/storefront config kept in the generic SQLite `settings`
// key-value table. Everything else in that table (device_id, license keys,
// subscription keys, sync/session state, logo upload state) is device-bound
// or session-local and must never travel in a business-data backup — see
// lib/deviceId.ts, lib/itemLimit.ts, lib/onlineStoreSubscription/subscription.ts,
// lib/onlineStore/storeInfo.ts for where those keys are written.
const SETTINGS_ALLOWLIST = [
  'online_store_enabled',
  'online_store_bulk_publish_enabled',
  'online_store_slug',
  'online_store_description',
  'online_store_facebook',
  'online_store_instagram',
  'online_store_tiktok',
  'online_store_whatsapp',
] as const;

// ─── Export ───────────────────────────────────────────────────────────────────

export async function exportBackup(): Promise<string> {
  // Lazy import — never runs at module-evaluation time.
  const { File, Paths } = await import('expo-file-system');

  const db = await getDatabase();
  const settingsPlaceholders = SETTINGS_ALLOWLIST.map(() => '?').join(', ');

  const [
    businesses, settings, categories, products, inventory_history,
    customers, sales, sale_items,
    debts, invoice_counter, purchases, purchase_items, purchase_counter,
    purchase_debts, purchase_audit_log, debt_payments, expenses, suppliers, exchange_rates,
  ] = await Promise.all([
    db.getAllAsync<Record<string, unknown>>('SELECT * FROM businesses'),
    db.getAllAsync<Record<string, unknown>>(
      `SELECT * FROM settings WHERE key IN (${settingsPlaceholders})`,
      [...SETTINGS_ALLOWLIST]
    ),
    db.getAllAsync<Record<string, unknown>>('SELECT * FROM categories'),
    db.getAllAsync<Record<string, unknown>>('SELECT * FROM products'),
    db.getAllAsync<Record<string, unknown>>('SELECT * FROM inventory_history'),
    db.getAllAsync<Record<string, unknown>>('SELECT * FROM customers'),
    db.getAllAsync<Record<string, unknown>>('SELECT * FROM sales'),
    db.getAllAsync<Record<string, unknown>>('SELECT * FROM sale_items'),
    db.getAllAsync<Record<string, unknown>>('SELECT * FROM debts'),
    db.getAllAsync<Record<string, unknown>>('SELECT * FROM invoice_counter'),
    db.getAllAsync<Record<string, unknown>>('SELECT * FROM purchases'),
    db.getAllAsync<Record<string, unknown>>('SELECT * FROM purchase_items'),
    db.getAllAsync<Record<string, unknown>>('SELECT * FROM purchase_counter'),
    db.getAllAsync<Record<string, unknown>>('SELECT * FROM purchase_debts'),
    db.getAllAsync<Record<string, unknown>>('SELECT * FROM purchase_audit_log'),
    db.getAllAsync<Record<string, unknown>>('SELECT * FROM debt_payments'),
    db.getAllAsync<Record<string, unknown>>('SELECT * FROM expenses'),
    db.getAllAsync<Record<string, unknown>>('SELECT * FROM suppliers'),
    db.getAllAsync<Record<string, unknown>>('SELECT * FROM exchange_rates'),
  ]);

  // Business identity only — never the local logo file path (device-specific,
  // and the image file itself was never portable across devices anyway).
  const businessesScrubbed = businesses.map((row) => ({ ...row, logo_path: null }));

  const [storedBusinessRaw, storedSettingsRaw] = await Promise.all([
    AsyncStorage.getItem('@froshiar_business'),
    AsyncStorage.getItem('@froshiar_settings'),
  ]);

  const storedBusiness = parseZustandState(storedBusinessRaw);
  const storedSettings = parseZustandState(storedSettingsRaw);

  const backup: FroshiarBackup = {
    meta: {
      schemaVersion: CURRENT_SCHEMA_VERSION,
      version:    '2.0',
      backupDate: new Date().toISOString(),
      appVersion: '1.0.0',
      platform:   Platform.OS,
    },
    database: {
      businesses: businessesScrubbed, settings, categories, products, inventory_history,
      customers, sales, sale_items,
      debts, invoice_counter, purchases, purchase_items, purchase_counter,
      purchase_debts, purchase_audit_log, debt_payments, expenses, suppliers, exchange_rates,
    },
    stores: {
      // Business identity fields only — never logoUri (device file path),
      // ownerUserId (account-linkage marker), or isSetupComplete (device flow state).
      business: JSON.stringify({
        name:    storedBusiness?.name    ?? '',
        phone:   storedBusiness?.phone   ?? '',
        address: storedBusiness?.address ?? '',
      }),
      // Financial/operational config only — never isDarkMode or accentColor (UI prefs).
      settings: JSON.stringify({
        exchangeRate:             storedSettings?.exchangeRate,
        rateUpdatedAt:            storedSettings?.rateUpdatedAt,
        globalLowStockEnabled:    storedSettings?.globalLowStockEnabled,
        globalLowStockThreshold:  storedSettings?.globalLowStockThreshold,
      }),
    },
  };

  const dateStr  = new Date().toISOString().split('T')[0];
  const fileName = `Froshiar_Backup_${dateStr}.json`;
  const file     = new File(Paths.document, fileName);

  if (file.exists) file.delete();
  file.write(JSON.stringify(backup, null, 2));

  return file.uri;
}

// Zustand's `persist` middleware wraps stored state as `{ state, version }`;
// everything in this file cares only about the fields inside `state`.
function parseZustandState(raw: string | null): Record<string, unknown> | null {
  if (!raw) return null;
  try {
    const envelope = JSON.parse(raw) as { state?: Record<string, unknown> };
    return envelope.state ?? null;
  } catch {
    return null;
  }
}

// ─── Validate ─────────────────────────────────────────────────────────────────

const KNOWN_TABLES = [
  'businesses', 'settings', 'categories', 'products', 'inventory_history',
  'customers', 'sales', 'sale_items', 'debts', 'invoice_counter',
  'purchases', 'purchase_items', 'purchase_counter', 'purchase_debts',
  'purchase_audit_log', 'debt_payments', 'expenses', 'suppliers', 'exchange_rates',
] as const;

// Spot-check only — one required, never-null column per table, checked on the
// first row if the table is non-empty. Catches gross corruption (wrong file,
// hand-edited JSON) cheaply, without validating every row of a large backup.
const REQUIRED_FIELD: Partial<Record<(typeof KNOWN_TABLES)[number], string>> = {
  products: 'name',
  customers: 'name',
  suppliers: 'name',
  sales: 'invoice_number',
  purchases: 'purchase_number',
  categories: 'name',
  expenses: 'amount',
};

export async function validateAndParseBackup(fileUri: string): Promise<FroshiarBackup> {
  // Lazy import — never runs at module-evaluation time.
  const { File } = await import('expo-file-system');

  const content = await new File(fileUri).text();

  let parsed: unknown;
  try {
    parsed = JSON.parse(content);
  } catch {
    throw new Error('INVALID_JSON');
  }

  const backup = parsed as FroshiarBackup;
  if (!backup?.meta?.version || !backup?.database) {
    throw new Error('INVALID_BACKUP');
  }

  const hasAnyKnownTable = KNOWN_TABLES.some((table) => Array.isArray(backup.database[table]));
  if (!hasAnyKnownTable) {
    throw new Error('INVALID_BACKUP');
  }

  for (const table of KNOWN_TABLES) {
    const requiredField = REQUIRED_FIELD[table];
    const rows = backup.database[table];
    if (!requiredField || !Array.isArray(rows) || rows.length === 0) continue;
    const firstRow = rows[0] as Record<string, unknown>;
    if (!(requiredField in firstRow)) {
      throw new Error('INVALID_BACKUP');
    }
  }

  return backup;
}

// ─── Pre-restore limit check ──────────────────────────────────────────────────

/**
 * Estimates the item count this restore would leave the device with, using
 * the same metric as live enforcement (assertItemLimitNotExceeded /
 * getInventoryStats): only rows with is_active = 1 AND quantity > 0 count,
 * and the metric is total quantity, not row count.
 *
 * Restore is a merge, not a replace: a product already present locally (matched
 * by uuid) never has its quantity touched (see performRestore/mergeProducts), so
 * it doesn't add to the projected total beyond what's already there. Only
 * products the backup would actually insert as new rows are counted on top of
 * the current local total. Must resolve before performRestore() ever starts a
 * transaction.
 *
 * Throws:
 *   'RESTORE_LIMIT_UNDETERMINED'              — plan/license could not be read; never guess.
 *   'RESTORE_LIMIT_EXCEEDED|<needed>,<limit>' — projected total exceeds the plan limit.
 * Resolves (no throw) when the projected total fits, including the unlimited plan.
 */
export async function assertBackupWithinItemLimit(backup: FroshiarBackup): Promise<void> {
  const { loadLicenseFromDb } = await import('@/lib/itemLimit');

  let limit: number;
  try {
    ({ limit } = await loadLicenseFromDb());
  } catch {
    throw new Error('RESTORE_LIMIT_UNDETERMINED');
  }

  if (limit === Infinity) return;

  const db = await getDatabase();
  const [localTotalRow, localUuidRows] = await Promise.all([
    db.getFirstAsync<{ total: number }>(
      'SELECT COALESCE(SUM(quantity), 0) AS total FROM products WHERE is_active = 1 AND quantity > 0'
    ),
    db.getAllAsync<{ uuid: string | null }>('SELECT uuid FROM products WHERE uuid IS NOT NULL'),
  ]);
  const localTotal = localTotalRow?.total ?? 0;
  const localUuids = new Set(localUuidRows.map((row) => row.uuid));

  const products = backup.database?.products ?? [];
  const incomingNew = products.reduce((sum, row) => {
    const isActive = Number(row.is_active) === 1;
    const quantity  = Number(row.quantity);
    const uuid = row.uuid as string | undefined;
    const alreadyLocal = !!uuid && localUuids.has(uuid);
    return isActive && quantity > 0 && !alreadyLocal ? sum + quantity : sum;
  }, 0);

  const projected = localTotal + incomingNew;
  if (projected > limit) {
    throw new Error(`RESTORE_LIMIT_EXCEEDED|${projected},${limit}`);
  }
}

// ─── Restore (merge) ────────────────────────────────────────────────────────

export interface RestoreTableCounts {
  inserted: number;
  updated: number;
  skipped: number;
}

export type RestoreProgressEvent =
  | { phase: 'table-start'; table: string; tableIndex: number; totalTables: number }
  | { phase: 'table-done'; table: string; counts: RestoreTableCounts }
  | { phase: 'stores' }
  | { phase: 'done' };

export interface RestoreSummary {
  inserted: number;
  updated: number;
  skipped: number;
  warnings: string[];
  perTable: Record<string, RestoreTableCounts>;
}

type RemapMap = Map<number, number>; // backup row id -> local row id

const TOTAL_RESTORE_STEPS = 19;

export async function performRestore(
  backup: FroshiarBackup,
  onProgress?: (event: RestoreProgressEvent) => void
): Promise<RestoreSummary> {
  const db = await getDatabase();
  const { database } = backup;
  const isLegacy = !backup.meta?.schemaVersion || backup.meta.schemaVersion < 2;

  const warnings: string[] = [];
  const perTable: Record<string, RestoreTableCounts> = {};
  let stepIndex = 0;

  const start = (table: string) => {
    stepIndex++;
    onProgress?.({ phase: 'table-start', table, tableIndex: stepIndex, totalTables: TOTAL_RESTORE_STEPS });
  };
  const report = (table: string, counts: RestoreTableCounts) => {
    perTable[table] = counts;
    onProgress?.({ phase: 'table-done', table, counts });
  };

  // Populated as parent tables are processed; child tables rewrite their FK
  // columns through these before matching/inserting (see mergeSimpleTable).
  const suppliersRemap: RemapMap = new Map();
  const purchasesRemap: RemapMap = new Map();
  const productsRemap: RemapMap = new Map();
  const customersRemap: RemapMap = new Map();
  const salesRemap: RemapMap = new Map();
  const debtsRemap: RemapMap = new Map();
  const purchaseDebtsRemap: RemapMap = new Map();

  let isFreshDevice = false;

  await db.withTransactionAsync(async () => {
    start('businesses');
    isFreshDevice = await mergeBusinessSingleton(db, database.businesses ?? []);

    start('settings');
    report('settings', await mergeSettingsKV(db, database.settings ?? []));

    start('invoice_counter');
    await mergeCounter(db, 'invoice_counter', database.invoice_counter ?? []);

    start('purchase_counter');
    await mergeCounter(db, 'purchase_counter', database.purchase_counter ?? []);

    start('categories');
    report('categories', await mergeCategories(db, database.categories ?? []));

    // Parent tables before their children, so FK remap maps are populated in time.
    start('customers');
    report('customers', await mergeSimpleTable(db, 'customers', database.customers ?? [], {
      naturalKey: (row) => {
        const phone = (row.phone as string | null)?.trim();
        if (phone) return { where: 'phone = ?', params: [phone] };
        const name = (row.name as string | null)?.trim();
        if (name) return { where: 'LOWER(TRIM(name)) = LOWER(TRIM(?))', params: [name] };
        return null;
      },
      policy: 'mutable',
      timestampColumn: 'updated_at',
    }, customersRemap, warnings));

    start('suppliers');
    report('suppliers', await mergeSimpleTable(db, 'suppliers', database.suppliers ?? [], {
      naturalKey: (row) => {
        const phone = (row.phone as string | null)?.trim();
        if (phone) return { where: 'phone = ?', params: [phone] };
        const name = (row.name as string | null)?.trim();
        if (name) return { where: 'name = ?', params: [name] };
        return null;
      },
      policy: 'mutable',
      timestampColumn: 'updated_at',
    }, suppliersRemap, warnings));

    start('purchases');
    report('purchases', await mergeSimpleTable(db, 'purchases', database.purchases ?? [], {
      naturalKey: (row) => (row.purchase_number ? { where: 'purchase_number = ?', params: [row.purchase_number] } : null),
      policy: 'immutable',
      beforeWrite: (row) => {
        if (row.supplier_id != null) row.supplier_id = suppliersRemap.get(row.supplier_id as number) ?? null;
        return true;
      },
    }, purchasesRemap, warnings));

    start('products');
    report('products', await mergeProducts(db, database.products ?? [], purchasesRemap, productsRemap, warnings));

    start('purchase_items');
    report('purchase_items', await mergeSimpleTable(db, 'purchase_items', database.purchase_items ?? [], {
      policy: 'immutable',
      beforeWrite: (row) => {
        const mapped = purchasesRemap.get(row.purchase_id as number);
        if (mapped == null) return false;
        row.purchase_id = mapped;
        return true;
      },
    }, undefined, warnings));

    start('purchase_debts');
    report('purchase_debts', await mergeSimpleTable(db, 'purchase_debts', database.purchase_debts ?? [], {
      policy: 'immutable',
      beforeWrite: (row) => {
        if (row.purchase_id != null) row.purchase_id = purchasesRemap.get(row.purchase_id as number) ?? null;
        return true;
      },
    }, purchaseDebtsRemap, warnings));

    start('purchase_audit_log');
    report('purchase_audit_log', await mergeSimpleTable(db, 'purchase_audit_log', database.purchase_audit_log ?? [], {
      policy: 'immutable',
      beforeWrite: (row) => {
        const mapped = purchasesRemap.get(row.purchase_id as number);
        if (mapped == null) return false;
        row.purchase_id = mapped;
        return true;
      },
    }, undefined, warnings));

    start('inventory_history');
    report('inventory_history', await mergeSimpleTable(db, 'inventory_history', database.inventory_history ?? [], {
      naturalKey: (row) => ({ where: 'product_id = ?', params: [row.product_id] }),
      policy: 'immutable',
      beforeWrite: (row) => {
        const mappedProduct = productsRemap.get(row.product_id as number);
        if (mappedProduct == null) return false;
        row.product_id = mappedProduct;
        if (row.purchase_id != null) row.purchase_id = purchasesRemap.get(row.purchase_id as number) ?? null;
        return true;
      },
    }, undefined, warnings));

    start('sales');
    report('sales', await mergeSimpleTable(db, 'sales', database.sales ?? [], {
      naturalKey: (row) => (row.invoice_number ? { where: 'invoice_number = ?', params: [row.invoice_number] } : null),
      policy: 'immutable',
      beforeWrite: (row) => {
        if (row.customer_id != null) row.customer_id = customersRemap.get(row.customer_id as number) ?? null;
        return true;
      },
    }, salesRemap, warnings));

    start('sale_items');
    report('sale_items', await mergeSimpleTable(db, 'sale_items', database.sale_items ?? [], {
      policy: 'immutable',
      beforeWrite: (row) => {
        const mappedSale = salesRemap.get(row.sale_id as number);
        if (mappedSale == null) return false;
        row.sale_id = mappedSale;
        const mappedProduct = productsRemap.get(row.product_id as number);
        if (mappedProduct == null) return false;
        row.product_id = mappedProduct;
        return true;
      },
    }, undefined, warnings));

    start('debts');
    report('debts', await mergeSimpleTable(db, 'debts', database.debts ?? [], {
      // debts.sale_id is UNIQUE — once remapped to the local sale id, it's a
      // fully reliable natural key regardless of backup version.
      naturalKey: (row) => ({ where: 'sale_id = ?', params: [row.sale_id] }),
      policy: 'immutable',
      beforeWrite: (row) => {
        const mapped = salesRemap.get(row.sale_id as number);
        if (mapped == null) return false;
        row.sale_id = mapped;
        return true;
      },
    }, debtsRemap, warnings));

    start('expenses');
    report('expenses', await mergeSimpleTable(db, 'expenses', database.expenses ?? [], { policy: 'immutable' }, undefined, warnings));

    start('exchange_rates');
    report('exchange_rates', await mergeSimpleTable(db, 'exchange_rates', database.exchange_rates ?? [], { policy: 'immutable' }, undefined, warnings));

    start('debt_payments');
    report('debt_payments', await mergeSimpleTable(db, 'debt_payments', database.debt_payments ?? [], {
      policy: 'immutable',
      beforeWrite: (row) => {
        const parentRemap = row.debt_type === 'purchase' ? purchaseDebtsRemap : debtsRemap;
        const mapped = parentRemap.get(row.debt_id as number);
        if (mapped == null) return false;
        row.debt_id = mapped;
        return true;
      },
    }, undefined, warnings));
  });

  // AsyncStorage stores — outside the SQLite transaction, matching today's behavior.
  onProgress?.({ phase: 'stores' });
  await mergeBusinessStore(backup.stores?.business);
  await mergeSettingsStore(backup.stores?.settings, isFreshDevice);

  if (isLegacy) {
    warnings.push(
      'This backup was made by an older app version without stable record IDs — ' +
      'product, sale, and purchase line items could not be matched against existing data and were added as new records.'
    );
  }

  const totals = Object.values(perTable).reduce(
    (acc, c) => ({ inserted: acc.inserted + c.inserted, updated: acc.updated + c.updated, skipped: acc.skipped + c.skipped }),
    { inserted: 0, updated: 0, skipped: 0 }
  );

  onProgress?.({ phase: 'done' });

  return { ...totals, warnings, perTable };
}

// ─── Restore helpers ──────────────────────────────────────────────────────────

export interface MergeTableOptions {
  /** Returns a WHERE fragment + bind params to find an existing local row when
   *  no uuid match was found (legacy backups, or a uuid absent from this device).
   *  Return null (or omit this option) if the table has no reliable natural key —
   *  such rows are always inserted as new when the uuid doesn't match. */
  naturalKey?: (row: Record<string, unknown>) => { where: string; params: unknown[] } | null;
  /** 'immutable' tables (ledger/transactional facts) are only ever deduped, never
   *  overwritten. 'mutable' tables update the local row when the backup's
   *  `timestampColumn` value is strictly newer. */
  policy: 'immutable' | 'mutable';
  timestampColumn?: string;
  /** Mutates `row`'s FK columns via the relevant remap map before matching/insert.
   *  Return false to drop the row entirely (its parent wasn't found — see the
   *  per-call-site comments in performRestore for which FK is required vs. nullable). */
  beforeWrite?: (row: Record<string, unknown>) => boolean;
  /** Default true (unchanged behavior for every existing local-JSON-restore call
   *  site below). lib/cloudSync/pullEngine.ts sets this false: `naturalKey`
   *  fallbacks (e.g. matching `sales` by `invoice_number`) exist only to support
   *  legacy pre-uuid backups, and are actively unsafe for cloud-sourced rows —
   *  invoice/purchase numbers are per-device local sequence counters with no
   *  cross-device namespacing (see lib/sqlite.ts's generateInvoiceNumber), so two
   *  offline devices on the same account can independently produce the same
   *  number for two different sales. A cloud row always carries a uuid (it's the
   *  Firestore doc ID), so it never needs the natural-key fallback — and falling
   *  back anyway on a number collision would match the wrong local row and, for
   *  an 'immutable'-policy table, silently DROP a genuinely new incoming sale. */
  matchByNaturalKeyIfNoUuid?: boolean;
}

export async function mergeSimpleTable(
  db: SQLite.SQLiteDatabase,
  table: string,
  rows: Record<string, unknown>[],
  opts: MergeTableOptions,
  remap: RemapMap | undefined,
  warnings: string[]
): Promise<RestoreTableCounts> {
  const counts: RestoreTableCounts = { inserted: 0, updated: 0, skipped: 0 };
  if (rows.length === 0) return counts;

  const uuidMap = new Map<string, number>();
  const existingRows = await db.getAllAsync<{ id: number; uuid: string | null }>(`SELECT id, uuid FROM ${table}`);
  for (const existing of existingRows) {
    if (existing.uuid) uuidMap.set(existing.uuid, existing.id);
  }

  let droppedForMissingParent = 0;

  for (const rawRow of rows) {
    const row: Record<string, unknown> = { ...rawRow };
    const backupId = row.id as number | undefined;
    delete row.id;

    if (opts.beforeWrite && !opts.beforeWrite(row)) {
      counts.skipped++;
      droppedForMissingParent++;
      continue;
    }

    let localId: number | null = null;
    const uuid = row.uuid as string | undefined;
    if (uuid && uuidMap.has(uuid)) {
      localId = uuidMap.get(uuid)!;
    } else if (opts.naturalKey && opts.matchByNaturalKeyIfNoUuid !== false) {
      const nk = opts.naturalKey(row);
      if (nk) {
        const found = await db.getFirstAsync<{ id: number }>(
          `SELECT id FROM ${table} WHERE ${nk.where}`,
          nk.params as SQLite.SQLiteBindParams
        );
        if (found) localId = found.id;
      }
    }

    if (localId != null) {
      if (backupId != null && remap) remap.set(backupId, localId);

      if (opts.policy === 'mutable' && opts.timestampColumn) {
        const ts = opts.timestampColumn;
        const localRow = await db.getFirstAsync<Record<string, unknown>>(`SELECT * FROM ${table} WHERE id = ?`, [localId]);
        const backupTs = row[ts] as string | undefined;
        const localTs = localRow?.[ts] as string | undefined;
        if (backupTs && (!localTs || backupTs > localTs)) {
          const updateCols = Object.keys(row).filter((c) => c !== 'uuid');
          if (updateCols.length > 0) {
            const setClause = updateCols.map((c) => `${c} = ?`).join(', ');
            const values = updateCols.map((c) => row[c]);
            await db.runAsync(`UPDATE ${table} SET ${setClause} WHERE id = ?`, [...values, localId] as SQLite.SQLiteBindParams);
            counts.updated++;
            continue;
          }
        }
      }
      counts.skipped++;
      continue;
    }

    const cols = Object.keys(row);
    if (cols.length === 0) {
      counts.skipped++;
      continue;
    }
    const placeholders = cols.map(() => '?').join(', ');
    const values = cols.map((c) => row[c]);
    const result = await db.runAsync(
      `INSERT INTO ${table} (${cols.join(', ')}) VALUES (${placeholders})`,
      values as SQLite.SQLiteBindParams
    );
    if (backupId != null && remap) remap.set(backupId, result.lastInsertRowId);
    counts.inserted++;
  }

  if (droppedForMissingParent > 0) {
    warnings.push(`${table}: ${droppedForMissingParent} record(s) skipped because related data was missing from the backup.`);
  }

  return counts;
}

// Products get dedicated handling instead of mergeSimpleTable: matched products
// must NEVER have their quantity overwritten (see the module doc and requirement
// section D5 in the backup/restore plan) — overwriting could roll back real sales
// recorded since the backup was taken, and summing would double-count the common
// case of restoring same-lineage data. Only genuinely new (unmatched) products
// bring their quantity in at all.
async function mergeProducts(
  db: SQLite.SQLiteDatabase,
  rows: Record<string, unknown>[],
  purchasesRemap: RemapMap,
  productsRemap: RemapMap,
  warnings: string[]
): Promise<RestoreTableCounts> {
  const counts: RestoreTableCounts = { inserted: 0, updated: 0, skipped: 0 };
  if (rows.length === 0) return counts;

  const uuidMap = new Map<string, number>();
  const existingRows = await db.getAllAsync<{ id: number; uuid: string | null }>('SELECT id, uuid FROM products');
  for (const existing of existingRows) {
    if (existing.uuid) uuidMap.set(existing.uuid, existing.id);
  }

  let matchedAny = false;

  for (const rawRow of rows) {
    const row: Record<string, unknown> = { ...rawRow };
    const backupId = row.id as number | undefined;
    delete row.id;

    // Informal FK — null it out rather than pointing at an unrelated local
    // purchase if the referenced purchase wasn't part of this backup.
    if (row.purchase_id != null) {
      row.purchase_id = purchasesRemap.get(row.purchase_id as number) ?? null;
    }

    const uuid = row.uuid as string | undefined;
    const localId = uuid ? uuidMap.get(uuid) ?? null : null;

    if (localId != null) {
      matchedAny = true;
      if (backupId != null) productsRemap.set(backupId, localId);

      const localRow = await db.getFirstAsync<Record<string, unknown>>('SELECT * FROM products WHERE id = ?', [localId]);
      const updateCols: string[] = [];
      const values: unknown[] = [];
      if (localRow) {
        for (const col of Object.keys(row)) {
          if (col === 'uuid' || col === 'quantity') continue;
          const localVal = localRow[col];
          const backupVal = row[col];
          const localEmpty = localVal === null || localVal === undefined || localVal === '';
          const backupHasValue = backupVal !== null && backupVal !== undefined && backupVal !== '';
          if (localEmpty && backupHasValue) {
            updateCols.push(col);
            values.push(backupVal);
          }
        }
      }
      if (updateCols.length > 0) {
        const setClause = updateCols.map((c) => `${c} = ?`).join(', ');
        await db.runAsync(`UPDATE products SET ${setClause} WHERE id = ?`, [...values, localId] as SQLite.SQLiteBindParams);
        counts.updated++;
      } else {
        counts.skipped++;
      }
      continue;
    }

    const cols = Object.keys(row);
    if (cols.length === 0) {
      counts.skipped++;
      continue;
    }
    const placeholders = cols.map(() => '?').join(', ');
    const values = cols.map((c) => row[c]);
    const result = await db.runAsync(
      `INSERT INTO products (${cols.join(', ')}) VALUES (${placeholders})`,
      values as SQLite.SQLiteBindParams
    );
    if (backupId != null) productsRemap.set(backupId, result.lastInsertRowId);
    counts.inserted++;
  }

  if (matchedAny) {
    warnings.push('Some products already existed on this device — their stock quantity was left unchanged.');
  }

  return counts;
}

// Categories dedupe by name (already UNIQUE in the schema) — the DB constraint
// does the matching, so this doesn't need the generic uuid/natural-key machinery.
async function mergeCategories(db: SQLite.SQLiteDatabase, rows: Record<string, unknown>[]): Promise<RestoreTableCounts> {
  const counts: RestoreTableCounts = { inserted: 0, updated: 0, skipped: 0 };
  for (const row of rows) {
    const name = row.name as string | undefined;
    if (!name) continue;
    const uuid = (row.uuid as string | undefined) ?? (await newUuid());
    const result = await db.runAsync('INSERT OR IGNORE INTO categories (name, uuid) VALUES (?, ?)', [name, uuid]);
    if (result.changes > 0) counts.inserted++;
    else counts.skipped++;
  }
  return counts;
}

// businesses is a fixed-id (id=1) singleton, never row-matched. Field-level merge:
// a backup only fills in fields the local device hasn't set yet (fresh install /
// restore onto a brand-new device); an already-configured business's name/phone/
// address is never silently overwritten by an older backup. logo_path is never
// touched — it's not in the backup at all. Returns whether this was a fresh device
// (no local business name yet), used by the AsyncStorage settings merge below.
async function mergeBusinessSingleton(db: SQLite.SQLiteDatabase, rows: Record<string, unknown>[]): Promise<boolean> {
  const backupRow = rows[0];
  const local = await db.getFirstAsync<Record<string, unknown>>('SELECT * FROM businesses WHERE id = 1');
  const isFresh = !local || !local.name;

  if (!backupRow) return isFresh;

  if (!local) {
    await db.runAsync(
      'INSERT INTO businesses (id, name, type, phone, address, uuid) VALUES (1, ?, ?, ?, ?, ?)',
      [backupRow.name ?? '', backupRow.type ?? '', backupRow.phone ?? '', backupRow.address ?? '', await newUuid()] as SQLite.SQLiteBindParams
    );
    return true;
  }

  const fields: string[] = [];
  const values: unknown[] = [];
  for (const col of ['name', 'phone', 'address'] as const) {
    const localVal = local[col];
    const backupVal = backupRow[col];
    const localEmpty = localVal === null || localVal === undefined || localVal === '';
    if (localEmpty && backupVal) {
      fields.push(`${col} = ?`);
      values.push(backupVal);
    }
  }
  if (fields.length > 0) {
    await db.runAsync(`UPDATE businesses SET ${fields.join(', ')} WHERE id = 1`, values as SQLite.SQLiteBindParams);
  }
  return isFresh;
}

// invoice_counter / purchase_counter are fixed-id singletons merged by value,
// not matched row-by-row: taking the max guarantees a merged-in sale/purchase's
// number is never re-issued, without needing to inspect every invoice/purchase number.
// Exported for lib/cloudSync/pullEngine.ts's applyRootDoc(), which applies the
// same max-merge policy to a cloud-pulled counter value rather than
// re-implementing conflict resolution for it — see the comment above.
export async function mergeCounter(
  db: SQLite.SQLiteDatabase,
  table: 'invoice_counter' | 'purchase_counter',
  rows: Record<string, unknown>[]
): Promise<void> {
  const backupRow = rows[0];
  if (!backupRow) return;
  const backupLastNumber = Number(backupRow.last_number) || 0;
  await db.runAsync(`UPDATE ${table} SET last_number = MAX(last_number, ?) WHERE id = 1`, [backupLastNumber]);
}

// The generic SQLite settings KV table — filtered to the same portable-business
// allowlist as exportBackup, re-checked here defensively so a hand-edited or
// pre-fix backup file can never reinstate device_id/license keys onto this device.
async function mergeSettingsKV(db: SQLite.SQLiteDatabase, rows: Record<string, unknown>[]): Promise<RestoreTableCounts> {
  const counts: RestoreTableCounts = { inserted: 0, updated: 0, skipped: 0 };
  for (const row of rows) {
    const key = row.key as string | undefined;
    const value = row.value as string | undefined;
    if (!key || value === undefined || !(SETTINGS_ALLOWLIST as readonly string[]).includes(key)) continue;
    const existing = await db.getFirstAsync<{ value: string }>('SELECT value FROM settings WHERE key = ?', [key]);
    if (existing) {
      if (existing.value !== value) {
        await db.runAsync('UPDATE settings SET value = ? WHERE key = ?', [value, key]);
        counts.updated++;
      } else {
        counts.skipped++;
      }
    } else {
      await db.runAsync('INSERT INTO settings (key, value) VALUES (?, ?)', [key, value]);
      counts.inserted++;
    }
  }
  return counts;
}

// Zustand's `persist` middleware wraps stored state as `{ state, version }`.
// These merge only the specific business fields the backup carries into the
// existing envelope, leaving every other field (isDarkMode, accentColor,
// isSetupComplete, logoUri, ownerUserId, ...) exactly as it was — those were
// never part of the backup and must never be touched by a restore.
async function mergeBusinessStore(backupBusinessRaw: string | undefined): Promise<void> {
  if (!backupBusinessRaw) return;
  let backupFields: { name?: string; phone?: string; address?: string };
  try {
    backupFields = JSON.parse(backupBusinessRaw);
  } catch {
    return;
  }

  const currentRaw = await AsyncStorage.getItem('@froshiar_business');
  const envelope = parseEnvelope(currentRaw);
  const state = { ...envelope.state } as Record<string, unknown>;

  for (const field of ['name', 'phone', 'address'] as const) {
    const localVal = state[field];
    const localEmpty = localVal === null || localVal === undefined || localVal === '';
    if (localEmpty && backupFields[field]) state[field] = backupFields[field];
  }

  await AsyncStorage.setItem('@froshiar_business', JSON.stringify({ state, version: envelope.version }));
}

async function mergeSettingsStore(backupSettingsRaw: string | undefined, isFreshDevice: boolean): Promise<void> {
  if (!backupSettingsRaw) return;
  let backupFields: {
    exchangeRate?: number;
    rateUpdatedAt?: string | null;
    globalLowStockEnabled?: boolean;
    globalLowStockThreshold?: number;
  };
  try {
    backupFields = JSON.parse(backupSettingsRaw);
  } catch {
    return;
  }

  const currentRaw = await AsyncStorage.getItem('@froshiar_settings');
  const envelope = parseEnvelope(currentRaw);
  const state = { ...envelope.state } as Record<string, unknown>;

  const localRateUpdatedAt = typeof state.rateUpdatedAt === 'string' ? state.rateUpdatedAt : null;
  const backupRateIsNewer = !!backupFields.rateUpdatedAt
    && (!localRateUpdatedAt || backupFields.rateUpdatedAt > localRateUpdatedAt);
  if (backupRateIsNewer) {
    state.exchangeRate  = backupFields.exchangeRate;
    state.rateUpdatedAt = backupFields.rateUpdatedAt;
  }

  // No timestamp exists for these two fields — only adopt the backup's values
  // on a genuinely fresh device, never silently overwrite an already-configured
  // device's alert settings.
  if (isFreshDevice) {
    if (backupFields.globalLowStockEnabled !== undefined) state.globalLowStockEnabled = backupFields.globalLowStockEnabled;
    if (backupFields.globalLowStockThreshold !== undefined) state.globalLowStockThreshold = backupFields.globalLowStockThreshold;
  }

  await AsyncStorage.setItem('@froshiar_settings', JSON.stringify({ state, version: envelope.version }));
}

function parseEnvelope(raw: string | null): { state: Record<string, unknown>; version: number } {
  if (!raw) return { state: {}, version: 0 };
  try {
    const parsed = JSON.parse(raw) as { state?: Record<string, unknown>; version?: number };
    return { state: parsed.state ?? {}, version: parsed.version ?? 0 };
  } catch {
    return { state: {}, version: 0 };
  }
}
