// Maps SQLite rows <-> Firestore documents for the cloud-synced subset of the
// schema (see lib/sqlite.ts's CLOUD_SYNC_MUTABLE_TABLES/CLOUD_SYNC_IMMUTABLE_TABLES).
// Firestore field names pass through 1:1 from SQLite column names — the one
// deliberate translation is foreign keys: SQLite's autoincrement `id` columns are
// per-device and meaningless across devices, so every FK is carried across as the
// related row's stable `uuid` instead (`customer_id` -> `customer_uuid`, etc.) and
// resolved back to a *local* integer id via a uuid lookup when a doc is pulled.
import type * as SQLite from 'expo-sqlite';

// Firestore collection name for each cloud-synced SQLite table. `sale_items` and
// `purchase_items` are embedded as array fields on their parent doc (see
// embedSaleItems/embedPurchaseItems below) rather than written as their own
// documents — they have no collection of their own. `businesses` isn't a
// collection either: it maps to a field on the users/{uid} root doc itself
// (see pushEngine.ts's pushBusinessProfile).
export const TABLE_TO_COLLECTION: Partial<Record<string, string>> = {
  categories: 'categories',
  products: 'products',
  customers: 'customers',
  suppliers: 'suppliers',
  sales: 'sales',
  purchases: 'purchases',
  expenses: 'expenses',
  debts: 'debts',
  purchase_debts: 'purchaseDebts',
  debt_payments: 'debtPayments',
};

// Push/pull order matters: a row with a foreign key (e.g. a sale's customer_id)
// must be pushed no earlier, and pulled/applied no later, than the row it points
// to — so parents always precede children here, mirroring performRestore's own
// parent-before-child ordering in lib/backup.ts.
export const CLOUD_TABLE_ORDER = [
  'categories', 'products', 'customers', 'suppliers',
  'sales', 'purchases', 'expenses',
  'debts', 'purchase_debts', 'debt_payments',
] as const;

async function uuidOf(db: SQLite.SQLiteDatabase, table: string, localId: number | null | undefined): Promise<string | null> {
  if (localId == null) return null;
  const row = await db.getFirstAsync<{ uuid: string | null }>(`SELECT uuid FROM ${table} WHERE id = ?`, [localId]);
  return row?.uuid ?? null;
}

async function localIdOf(db: SQLite.SQLiteDatabase, table: string, uuid: string | null | undefined): Promise<number | null> {
  if (!uuid) return null;
  const row = await db.getFirstAsync<{ id: number }>(`SELECT id FROM ${table} WHERE uuid = ?`, [uuid]);
  return row?.id ?? null;
}

// ─── sale_items / purchase_items — embedded arrays, not their own docs ───────

export async function embedSaleItems(db: SQLite.SQLiteDatabase, saleLocalId: number): Promise<Record<string, unknown>[]> {
  const rows = await db.getAllAsync<Record<string, unknown>>('SELECT * FROM sale_items WHERE sale_id = ?', [saleLocalId]);
  const items: Record<string, unknown>[] = [];
  for (const row of rows) {
    const productUuid = await uuidOf(db, 'products', row.product_id as number);
    items.push({
      uuid: row.uuid,
      product_uuid: productUuid,
      product_name: row.product_name,
      item_id: row.item_id,
      id_mode: row.id_mode,
      purchase_price: row.purchase_price,
      selling_price: row.selling_price,
      quantity: row.quantity,
      discount: row.discount,
      line_total: row.line_total,
    });
  }
  return items;
}

export async function embedPurchaseItems(db: SQLite.SQLiteDatabase, purchaseLocalId: number): Promise<Record<string, unknown>[]> {
  const rows = await db.getAllAsync<Record<string, unknown>>('SELECT * FROM purchase_items WHERE purchase_id = ?', [purchaseLocalId]);
  return rows.map((row) => ({
    uuid: row.uuid,
    product_name: row.product_name,
    category: row.category,
    quantity: row.quantity,
    buy_price_iqd: row.buy_price_iqd,
    buy_price_usd: row.buy_price_usd,
    sell_price_iqd: row.sell_price_iqd,
    sell_price_usd: row.sell_price_usd,
    line_total_iqd: row.line_total_iqd,
    id_type: row.id_type,
    item_ids: row.item_ids,
    created_at: row.created_at,
  }));
}

// Replaces this sale/purchase's local children with the embedded array pulled
// from Firestore. Safe as an unconditional delete+reinsert because both tables
// are append-only/immutable — the app never edits a line item in place, only
// ever recreates the whole set (see updateSaleComplete/updatePurchase) — so
// there's no local-only in-progress edit this could ever clobber. Callers should
// skip calling this at all when the incoming uuid set already matches the local
// one (see pullEngine.ts), since firing the delete/insert triggers unnecessarily
// just re-queues an identical row for push.
export async function applyEmbeddedSaleItems(
  db: SQLite.SQLiteDatabase,
  saleLocalId: number,
  items: Record<string, unknown>[]
): Promise<void> {
  await db.runAsync('DELETE FROM sale_items WHERE sale_id = ?', [saleLocalId]);
  for (const item of items) {
    const productLocalId = await localIdOf(db, 'products', item.product_uuid as string | null);
    if (productLocalId == null) continue; // product not present locally yet — dropped, not fatal (see module doc)
    await db.runAsync(
      `INSERT INTO sale_items (sale_id, product_id, product_name, item_id, id_mode, purchase_price, selling_price, quantity, discount, line_total, uuid)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [saleLocalId, productLocalId, item.product_name as string, item.item_id as string | null, (item.id_mode as string) ?? 'repeatable',
       item.purchase_price as number, item.selling_price as number, item.quantity as number, item.discount as number, item.line_total as number,
       item.uuid as string]
    );
  }
}

export async function applyEmbeddedPurchaseItems(
  db: SQLite.SQLiteDatabase,
  purchaseLocalId: number,
  items: Record<string, unknown>[]
): Promise<void> {
  await db.runAsync('DELETE FROM purchase_items WHERE purchase_id = ?', [purchaseLocalId]);
  for (const item of items) {
    await db.runAsync(
      `INSERT INTO purchase_items (purchase_id, product_name, category, quantity, buy_price_iqd, buy_price_usd, sell_price_iqd, sell_price_usd, line_total_iqd, id_type, item_ids, created_at, uuid)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [purchaseLocalId, item.product_name as string, item.category as string | null, item.quantity as number,
       item.buy_price_iqd as number, item.buy_price_usd as number, item.sell_price_iqd as number, item.sell_price_usd as number,
       item.line_total_iqd as number, item.id_type as string | null, (item.item_ids as string) ?? '[]',
       (item.created_at as string) ?? new Date().toISOString(), item.uuid as string]
    );
  }
}

// ─── Push: local row -> Firestore doc fields ─────────────────────────────────

export async function rowToCloudDoc(db: SQLite.SQLiteDatabase, table: string, row: Record<string, unknown>): Promise<Record<string, unknown>> {
  const doc: Record<string, unknown> = { ...row };
  delete doc.id;

  if (table === 'sales') {
    doc.customer_uuid = await uuidOf(db, 'customers', row.customer_id as number | null);
    delete doc.customer_id;
    doc.items = await embedSaleItems(db, row.id as number);
  } else if (table === 'purchases') {
    doc.supplier_uuid = await uuidOf(db, 'suppliers', row.supplier_id as number | null);
    delete doc.supplier_id;
    delete doc.purchase_id; // n/a on this table; defensive no-op if ever added
    doc.items = await embedPurchaseItems(db, row.id as number);
  } else if (table === 'products') {
    delete doc.purchase_id; // local-only linkage; supplier_name/phone/address are already denormalized on this row
  } else if (table === 'debts') {
    doc.sale_uuid = await uuidOf(db, 'sales', row.sale_id as number | null);
    delete doc.sale_id;
  } else if (table === 'purchase_debts') {
    doc.purchase_uuid = await uuidOf(db, 'purchases', row.purchase_id as number | null);
    delete doc.purchase_id;
  } else if (table === 'debt_payments') {
    const parentTable = row.debt_type === 'purchase' ? 'purchase_debts' : 'debts';
    doc.debt_uuid = await uuidOf(db, parentTable, row.debt_id as number | null);
    delete doc.debt_id;
    doc.customer_uuid = await uuidOf(db, 'customers', row.customer_id as number | null);
    delete doc.customer_id;
  }

  return doc;
}

// ─── Pull: Firestore doc fields -> local-row-shaped object for mergeSimpleTable ──
// Returns null when a required parent hasn't been synced locally yet (e.g. a debt
// arriving before its sale) — the caller drops the doc-change for now; it's safe
// to drop rather than queue for retry because the parent's own later arrival will
// itself trigger nothing further here (debts/purchase_debts/debt_payments have no
// child of their own), and the ordinary case (parent already synced, per
// CLOUD_TABLE_ORDER) is the overwhelming majority. See module doc for the
// debt_payments 0-fallback exception, which has no NOT NULL/FK risk to begin with.

export async function cloudDocToRow(
  db: SQLite.SQLiteDatabase,
  table: string,
  doc: Record<string, unknown>
): Promise<Record<string, unknown> | null> {
  const row: Record<string, unknown> = { ...doc };
  delete row.items; // sale_items/purchase_items are applied separately, after the parent row is merged
  delete row._syncedAt;

  if (table === 'sales') {
    const customerUuid = row.customer_uuid as string | null;
    delete row.customer_uuid;
    row.customer_id = customerUuid ? await localIdOf(db, 'customers', customerUuid) : null;
  } else if (table === 'purchases') {
    const supplierUuid = row.supplier_uuid as string | null;
    delete row.supplier_uuid;
    row.supplier_id = supplierUuid ? await localIdOf(db, 'suppliers', supplierUuid) : null;
  } else if (table === 'debts') {
    const saleUuid = row.sale_uuid as string | null;
    delete row.sale_uuid;
    const saleId = await localIdOf(db, 'sales', saleUuid);
    if (saleId == null) return null; // debts.sale_id is NOT NULL + UNIQUE FK — must wait for the parent sale
    row.sale_id = saleId;
  } else if (table === 'purchase_debts') {
    const purchaseUuid = row.purchase_uuid as string | null;
    delete row.purchase_uuid;
    row.purchase_id = purchaseUuid ? await localIdOf(db, 'purchases', purchaseUuid) : null;
  } else if (table === 'debt_payments') {
    const debtUuid = row.debt_uuid as string | null;
    delete row.debt_uuid;
    const parentTable = row.debt_type === 'purchase' ? 'purchase_debts' : 'debts';
    // debt_payments.debt_id has no FK constraint (denormalized ledger, deliberately
    // survives parent deletion — see lib/sqlite.ts) so an unresolved parent falls
    // back to 0 rather than blocking this payment record from syncing at all; the
    // denormalized customer_name/supplier_name/original_amount fields already
    // carry the meaningful display data independent of this link.
    row.debt_id = (await localIdOf(db, parentTable, debtUuid)) ?? 0;
    const customerUuid = row.customer_uuid as string | null;
    delete row.customer_uuid;
    row.customer_id = customerUuid ? await localIdOf(db, 'customers', customerUuid) : null;
  }

  return row;
}
