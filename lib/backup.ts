/**
 * Backup / Restore utility for ManagerX.
 *
 * expo-file-system is imported lazily inside each function (NOT at the top
 * level) so that requiring this module never calls requireNativeModule() at
 * evaluation time.  If the native module were unavailable (e.g., a version
 * mismatch in Expo Go), a top-level import would abort the entire module
 * chain and prevent Expo Router from registering the data-management route,
 * producing the "Unmatched Route managerx:///" error.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import type * as SQLite from 'expo-sqlite';
import { getDatabase } from '@/lib/sqlite';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ManagerXBackup {
  meta: {
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
  stores: {
    business: string;
    settings: string;
    modules:  string;
    language: string;
  };
}

// ─── Export ───────────────────────────────────────────────────────────────────

export async function exportBackup(): Promise<string> {
  // Lazy import — never runs at module-evaluation time.
  const { File, Paths } = await import('expo-file-system');

  const db = await getDatabase();

  const [
    businesses, settings, categories, products, inventory_history,
    customers, sales, sale_items,
    debts, invoice_counter, purchases, purchase_items, purchase_counter,
    purchase_debts, purchase_audit_log, debt_payments, expenses, suppliers, exchange_rates,
  ] = await Promise.all([
    db.getAllAsync<Record<string, unknown>>('SELECT * FROM businesses'),
    db.getAllAsync<Record<string, unknown>>('SELECT * FROM settings'),
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

  const [storedBusiness, storedSettings, storedModules, storedLanguage] = await Promise.all([
    AsyncStorage.getItem('@managerx_business'),
    AsyncStorage.getItem('@managerx_settings'),
    AsyncStorage.getItem('@managerx_modules'),
    AsyncStorage.getItem('@managerx_language'),
  ]);

  const backup: ManagerXBackup = {
    meta: {
      version:    '1.1',
      backupDate: new Date().toISOString(),
      appVersion: '1.0.0',
      platform:   Platform.OS,
    },
    database: {
      businesses, settings, categories, products, inventory_history,
      customers, sales, sale_items,
      debts, invoice_counter, purchases, purchase_items, purchase_counter,
      purchase_debts, purchase_audit_log, debt_payments, expenses, suppliers, exchange_rates,
    },
    stores: {
      business: storedBusiness ?? '{}',
      settings: storedSettings ?? '{}',
      modules:  storedModules  ?? '{}',
      language: storedLanguage ?? '"en"',
    },
  };

  const dateStr  = new Date().toISOString().split('T')[0];
  const fileName = `ManagerX_Backup_${dateStr}.json`;
  const file     = new File(Paths.document, fileName);

  if (file.exists) file.delete();
  file.write(JSON.stringify(backup, null, 2));

  return file.uri;
}

// ─── Validate ─────────────────────────────────────────────────────────────────

export async function validateAndParseBackup(fileUri: string): Promise<ManagerXBackup> {
  // Lazy import — never runs at module-evaluation time.
  const { File } = await import('expo-file-system');

  const content = await new File(fileUri).text();

  let parsed: unknown;
  try {
    parsed = JSON.parse(content);
  } catch {
    throw new Error('INVALID_JSON');
  }

  const backup = parsed as ManagerXBackup;
  if (!backup?.meta?.version || !backup?.database) {
    throw new Error('INVALID_BACKUP');
  }

  return backup;
}

// ─── Restore ──────────────────────────────────────────────────────────────────

async function insertRows(
  db: SQLite.SQLiteDatabase,
  table: string,
  rows: Record<string, unknown>[]
): Promise<void> {
  for (const row of rows) {
    const cols = Object.keys(row);
    if (cols.length === 0) continue;
    const placeholders = cols.map(() => '?').join(', ');
    const values       = cols.map((c) => row[c]);
    await db.runAsync(
      `INSERT INTO ${table} (${cols.join(', ')}) VALUES (${placeholders})`,
      values as SQLite.SQLiteBindParams
    );
  }
}

export async function performRestore(backup: ManagerXBackup): Promise<void> {
  const db  = await getDatabase();
  const { database } = backup;

  await db.withTransactionAsync(async () => {
    // Delete in FK-safe order (children before parents).
    for (const table of [
      'inventory_history',
      'purchase_audit_log', 'purchase_items', 'purchase_debts', 'debt_payments',
      'sale_items', 'debts', 'sales', 'purchases',
      'products', 'categories',
      'customers', 'suppliers', 'expenses',
      'exchange_rates', 'reports_cache',
      'invoice_counter', 'purchase_counter',
      'settings', 'businesses',
    ]) {
      await db.runAsync(`DELETE FROM ${table}`);
    }

    // Insert in FK order (parents before children).
    await insertRows(db, 'businesses',        database.businesses        ?? []);
    await insertRows(db, 'settings',          database.settings          ?? []);
    await insertRows(db, 'invoice_counter',   database.invoice_counter   ?? []);
    await insertRows(db, 'purchase_counter',  database.purchase_counter  ?? []);
    await insertRows(db, 'categories',        database.categories        ?? []);
    await insertRows(db, 'products',          database.products          ?? []);
    await insertRows(db, 'inventory_history', database.inventory_history ?? []);
    await insertRows(db, 'customers',         database.customers         ?? []);
    await insertRows(db, 'suppliers',         database.suppliers         ?? []);
    await insertRows(db, 'expenses',          database.expenses          ?? []);
    await insertRows(db, 'exchange_rates',    database.exchange_rates    ?? []);
    await insertRows(db, 'sales',             database.sales             ?? []);
    await insertRows(db, 'sale_items',        database.sale_items        ?? []);
    await insertRows(db, 'debts',             database.debts             ?? []);
    await insertRows(db, 'purchases',         database.purchases         ?? []);
    await insertRows(db, 'purchase_items',    database.purchase_items    ?? []);
    await insertRows(db, 'purchase_debts',    database.purchase_debts    ?? []);
    await insertRows(db, 'purchase_audit_log', database.purchase_audit_log ?? []);
    await insertRows(db, 'debt_payments',     database.debt_payments     ?? []);
  });

  // Restore Zustand stores — must happen outside the SQLite transaction.
  await AsyncStorage.multiSet([
    ['@managerx_business', backup.stores?.business ?? '{}'],
    ['@managerx_settings', backup.stores?.settings ?? '{}'],
    ['@managerx_modules',  backup.stores?.modules  ?? '{}'],
    ['@managerx_language', backup.stores?.language ?? '"en"'],
  ]);
}
