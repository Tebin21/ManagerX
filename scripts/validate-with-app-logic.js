/**
 * Validates a generated Froshiar demo backup JSON by running it through the
 * app's REAL, unmodified restore code path — lib/sqlite.ts's initializeDatabase()
 * and lib/backup.ts's validateAndParseBackup() / assertBackupWithinItemLimit() /
 * performRestore() — against a real (in-memory) SQLite database, instead of
 * reimplementing the app's validation logic separately.
 *
 * Only the native-module boundaries those two files themselves lazy-import are
 * mocked (expo-sqlite, expo-file-system, react-native, AsyncStorage, expo-crypto,
 * and the license-limit check in @/lib/itemLimit, which is a paid-plan gate
 * unrelated to data correctness). No app business logic is stubbed.
 *
 * Usage: node scripts/validate-with-app-logic.js <path-to-backup.json>
 */

'use strict';

const path = require('path');
const fs = require('fs');
const Module = require('module');
const crypto = require('crypto');
const ts = require('typescript');
const { DatabaseSync } = require('node:sqlite');

const REPO_ROOT = path.join(__dirname, '..');
const backupPath = process.argv[2];
if (!backupPath) {
  console.error('Usage: node scripts/validate-with-app-logic.js <path-to-backup.json>');
  process.exit(1);
}
const absBackupPath = path.resolve(backupPath);
if (!fs.existsSync(absBackupPath)) {
  console.error(`File not found: ${absBackupPath}`);
  process.exit(1);
}

// ─── .ts loader: transpile on demand via the TypeScript compiler API ──────────

require.extensions['.ts'] = function tsLoader(mod, filename) {
  const source = fs.readFileSync(filename, 'utf8');
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
      esModuleInterop: true,
      resolveJsonModule: true,
    },
    fileName: filename,
  });
  mod._compile(outputText, filename);
};

// ─── Mocked native-module boundaries ───────────────────────────────────────────

const mocks = new Map();

mocks.set('react-native', { Platform: { OS: 'android' } });

const asyncStorageMap = new Map();
mocks.set('@react-native-async-storage/async-storage', {
  __esModule: true,
  default: {
    getItem: async (k) => (asyncStorageMap.has(k) ? asyncStorageMap.get(k) : null),
    setItem: async (k, v) => { asyncStorageMap.set(k, v); },
  },
});

mocks.set('expo-crypto', { randomUUID: () => crypto.randomUUID() });

class MockDirectory {
  constructor(uri) { this._path = String(uri).replace(/^file:\/\//, ''); }
}
class MockFile {
  constructor(a, b) {
    this._path = b !== undefined ? path.join(a._path, b) : String(a).replace(/^file:\/\//, '');
  }
  get exists() { return false; } // forces lib/sqlite.ts's one-time file-copy migration to no-op
  text() { return fs.readFileSync(this._path, 'utf8'); }
  write() {}
  delete() {}
  copy() {}
}
mocks.set('expo-file-system', { File: MockFile, Directory: MockDirectory, Paths: { document: REPO_ROOT } });

mocks.set('@/lib/itemLimit', {
  // Unlimited plan — bypasses the paid-plan item-cap gate, which is orthogonal to
  // dataset correctness and has no real license fixture to test against here.
  loadLicenseFromDb: async () => ({ limit: Infinity }),
});

// expo-sqlite: a thin async adapter over Node's built-in node:sqlite, exposing
// exactly the 5 methods lib/sqlite.ts and lib/backup.ts actually call (confirmed
// via a full-file grep): execAsync, runAsync, getFirstAsync, getAllAsync,
// withTransactionAsync.
let sharedAdapter = null;
function normalizeParams(params) {
  if (params === undefined) return [];
  return params.map((v) => (v === undefined ? null : v));
}
function makeSqliteAdapter() {
  const sdb = new DatabaseSync(':memory:');
  let txDepth = 0;
  return {
    _raw: sdb,
    execAsync: async (sql) => { sdb.exec(sql); },
    runAsync: async (sql, params) => {
      const stmt = sdb.prepare(sql);
      const info = stmt.run(...normalizeParams(params));
      return { lastInsertRowId: Number(info.lastInsertRowid), changes: info.changes };
    },
    getFirstAsync: async (sql, params) => {
      const stmt = sdb.prepare(sql);
      const row = stmt.get(...normalizeParams(params));
      return row === undefined ? null : row;
    },
    getAllAsync: async (sql, params) => {
      const stmt = sdb.prepare(sql);
      return stmt.all(...normalizeParams(params));
    },
    withTransactionAsync: async (fn) => {
      txDepth++;
      const savepoint = `sp_${txDepth}`;
      if (txDepth === 1) sdb.exec('BEGIN');
      else sdb.exec(`SAVEPOINT ${savepoint}`);
      try {
        await fn();
        if (txDepth === 1) sdb.exec('COMMIT');
        else sdb.exec(`RELEASE ${savepoint}`);
      } catch (err) {
        if (txDepth === 1) sdb.exec('ROLLBACK');
        else sdb.exec(`ROLLBACK TO ${savepoint}`);
        throw err;
      } finally {
        txDepth--;
      }
    },
    closeAsync: async () => { sdb.close(); },
  };
}
mocks.set('expo-sqlite', {
  defaultDatabaseDirectory: '/mock-sqlite-dir',
  openDatabaseAsync: async () => {
    if (!sharedAdapter) sharedAdapter = makeSqliteAdapter();
    return sharedAdapter;
  },
});

// ─── Module resolution overrides ───────────────────────────────────────────────

const originalLoad = Module._load;
Module._load = function patchedLoad(request, parent, isMain) {
  if (mocks.has(request)) return mocks.get(request);
  return originalLoad.call(this, request, parent, isMain);
};

const originalResolveFilename = Module._resolveFilename;
Module._resolveFilename = function patchedResolve(request, parent, isMain, options) {
  if (request.startsWith('@/')) {
    const rel = request.slice(2);
    const abs = path.join(REPO_ROOT, rel);
    for (const candidate of [abs, `${abs}.ts`, `${abs}.tsx`, path.join(abs, 'index.ts')]) {
      if (fs.existsSync(candidate)) {
        return originalResolveFilename.call(this, candidate, parent, isMain, options);
      }
    }
  }
  return originalResolveFilename.call(this, request, parent, isMain, options);
};

// ─── Run the real app code ──────────────────────────────────────────────────────

const KNOWN_TABLES = [
  'businesses', 'settings', 'categories', 'products', 'inventory_history',
  'customers', 'sales', 'sale_items', 'debts', 'invoice_counter',
  'purchases', 'purchase_items', 'purchase_counter', 'purchase_debts',
  'purchase_audit_log', 'debt_payments', 'expenses', 'suppliers', 'exchange_rates',
];

async function main() {
  const sqliteLib = require(path.join(REPO_ROOT, 'lib', 'sqlite.ts'));
  const backupLib = require(path.join(REPO_ROOT, 'lib', 'backup.ts'));

  console.log('[1/5] initializeDatabase() — building the real, fully-migrated schema...');
  await sqliteLib.initializeDatabase();
  console.log('      OK');

  // initializeDatabase() always seeds a couple of baseline rows on a brand-new
  // install (a default 'General' category, an initial 1310 exchange rate row —
  // see lib/sqlite.ts's migrations) — capture that baseline BEFORE restoring so
  // the post-restore counts can be compared fairly instead of assuming an
  // empty table.
  const baselineCounts = {};
  for (const table of KNOWN_TABLES) {
    const row = await sharedAdapter.getFirstAsync(`SELECT COUNT(*) AS c FROM ${table}`);
    baselineCounts[table] = row.c;
  }

  const rawBackup = JSON.parse(fs.readFileSync(absBackupPath, 'utf8'));
  const expectedCounts = {};
  for (const t of KNOWN_TABLES) expectedCounts[t] = Array.isArray(rawBackup.database?.[t]) ? rawBackup.database[t].length : 0;

  console.log('[2/5] validateAndParseBackup() — real validation against the generated JSON...');
  const parsed = await backupLib.validateAndParseBackup(absBackupPath);
  console.log('      OK — parsed backup with meta:', parsed.meta);

  console.log('[3/5] assertBackupWithinItemLimit() — real pre-restore gate (unlimited-plan mock)...');
  await backupLib.assertBackupWithinItemLimit(parsed);
  console.log('      OK — no throw');

  console.log('[4/5] performRestore() — real merge-restore into an empty database...');
  const summary = await backupLib.performRestore(parsed, (evt) => {
    if (evt.phase === 'table-done' && (evt.counts.updated || evt.counts.skipped)) {
      console.log(`      note: ${evt.table} -> inserted=${evt.counts.inserted} updated=${evt.counts.updated} skipped=${evt.counts.skipped}`);
    }
  });
  console.log(`      OK — inserted=${summary.inserted} updated=${summary.updated} skipped=${summary.skipped}`);
  if (summary.warnings.length) {
    console.log('      WARNINGS:');
    for (const w of summary.warnings) console.log('        - ' + w);
  } else {
    console.log('      warnings: none');
  }

  console.log('[5/5] Re-querying the real database + cross-checking against performRestore counts...');
  const errors = [];
  if (summary.warnings.length) errors.push(`performRestore reported ${summary.warnings.length} warning(s)`);

  // invoice_counter/purchase_counter (and businesses) are singleton id=1 rows that
  // initializeDatabase() may pre-seed and performRestore merges via MAX()/replace
  // in place (per lib/backup.ts) rather than appending — they have no `perTable`
  // entry in the RestoreSummary, and their row count must always stay at 1, not
  // baseline+backup.
  const SINGLETON_TABLES = new Set(['invoice_counter', 'purchase_counter']);

  for (const table of KNOWN_TABLES) {
    const row = await sharedAdapter.getFirstAsync(`SELECT COUNT(*) AS c FROM ${table}`);
    const actualCount = row.c;
    const expected = expectedCounts[table];
    const perTable = summary.perTable[table];
    const expectedTotal = SINGLETON_TABLES.has(table) ? 1 : baselineCounts[table] + expected;
    console.log(`      ${table}: db=${actualCount} (baseline=${baselineCounts[table]} + backup=${expected}${SINGLETON_TABLES.has(table) ? ', singleton' : ''})${perTable ? ` inserted=${perTable.inserted} updated=${perTable.updated} skipped=${perTable.skipped}` : ''}`);
    if (actualCount !== expectedTotal) {
      errors.push(`table ${table}: DB has ${actualCount} rows but expected ${expectedTotal}`);
    }
    if (perTable && !SINGLETON_TABLES.has(table) && perTable.inserted !== expected) {
      errors.push(`table ${table}: performRestore inserted ${perTable.inserted} but expected ${expected} (updated=${perTable.updated}, skipped=${perTable.skipped})`);
    }
  }

  // Counter values themselves (not just row presence) should reflect the backup's
  // sequence position, since sequence numbers must never reset/collide going forward.
  for (const [table, field] of [['invoice_counter', 'last_number'], ['purchase_counter', 'last_number']]) {
    const dbRow = await sharedAdapter.getFirstAsync(`SELECT ${field} AS v FROM ${table} WHERE id = 1`);
    const backupRow = rawBackup.database[table]?.[0];
    const expectedValue = backupRow ? backupRow[field] : undefined;
    console.log(`      ${table}.${field}: db=${dbRow?.v} backup=${expectedValue}`);
    if (expectedValue !== undefined && dbRow?.v !== expectedValue) {
      errors.push(`${table}.${field}: DB has ${dbRow?.v} but backup specified ${expectedValue}`);
    }
  }

  console.log('\n─────────────────────────────────────');
  if (errors.length) {
    console.error(`RESULT: FAIL (${errors.length} issue(s))`);
    for (const e of errors) console.error('  - ' + e);
    process.exit(1);
  }
  console.log('RESULT: PASS — backup imported successfully via the app\'s real validate/limit-check/restore code, with zero warnings and all row counts reconciled.');
}

main().catch((err) => {
  console.error('\nRESULT: FAIL — unhandled error while running the app\'s real restore code:');
  console.error(err);
  process.exit(1);
});
