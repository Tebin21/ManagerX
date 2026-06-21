// Dev-only bulk data generator for manual before/after performance testing
// (large-inventory scrolling, report aggregation, customer-stats joins, etc.)
// at the scale described in the performance audit: 10k+ products, 100k+ sales.
//
// Inserts directly via batched multi-row SQL (bypassing insertProduct/recordSale
// and their business-rule checks) since the goal is fast, repeatable seeding,
// not exercising the app's write paths. All rows are tagged with a distinctive
// prefix so they're trivially identifiable and can be removed with
// clearPerfData() — this never touches real data with other prefixes.
import { getDatabase } from '@/lib/sqlite';
import type { SQLiteBindValue } from 'expo-sqlite';

const TAG = 'PERFSEED';
const CATEGORIES = ['Electronics', 'Clothing', 'Groceries', 'Tools', 'Furniture', 'General'];
const CHUNK = 300; // rows per multi-row INSERT — comfortably under SQLite's ~999 bound-param limit

export interface SeedPerfDataOptions {
  productCount?: number;
  customerCount?: number;
  supplierCount?: number;
  saleCount?: number;
  /** How many years back sale dates should be spread across, for "multi-year history" testing. */
  yearsOfHistory?: number;
}

export interface SeedPerfDataResult {
  products: number;
  customers: number;
  suppliers: number;
  sales: number;
  saleItems: number;
  elapsedMs: number;
}

function randomItem<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomPastDate(yearsBack: number): string {
  const now = Date.now();
  const past = now - Math.random() * yearsBack * 365 * 24 * 60 * 60 * 1000;
  return new Date(past).toISOString();
}

async function insertChunked(
  database: import('expo-sqlite').SQLiteDatabase,
  table: string,
  columns: string[],
  total: number,
  buildRow: (index: number) => SQLiteBindValue[]
): Promise<number> {
  const placeholders = `(${columns.map(() => '?').join(', ')})`;
  for (let i = 0; i < total; i += CHUNK) {
    const count = Math.min(CHUNK, total - i);
    const rows: SQLiteBindValue[] = [];
    const valuesSql: string[] = [];
    for (let j = 0; j < count; j++) {
      valuesSql.push(placeholders);
      rows.push(...buildRow(i + j));
    }
    await database.runAsync(
      `INSERT INTO ${table} (${columns.join(', ')}) VALUES ${valuesSql.join(', ')}`,
      rows
    );
  }
  return total;
}

/**
 * Seeds products, customers, suppliers, sales, and sale_items for perf testing.
 * Dev-only — throws immediately in production builds.
 */
export async function seedPerfData(opts: SeedPerfDataOptions = {}): Promise<SeedPerfDataResult> {
  if (!__DEV__) {
    throw new Error('seedPerfData() is a development-only tool and is disabled in production builds.');
  }

  const {
    productCount = 10_000,
    customerCount = 500,
    supplierCount = 150,
    saleCount = 100_000,
    yearsOfHistory = 3,
  } = opts;

  const database = await getDatabase();
  const start = Date.now();
  let saleItemCount = 0;

  await database.withTransactionAsync(async () => {
    // ── Suppliers ──────────────────────────────────────────────────────────
    await insertChunked(
      database, 'suppliers',
      ['name', 'phone', 'address', 'total_spent', 'created_at', 'updated_at'],
      supplierCount,
      (n) => [`${TAG} Supplier ${n}`, `${TAG}-SUP-${n}`, `${TAG} Address ${n}`, 0, randomPastDate(yearsOfHistory), randomPastDate(yearsOfHistory)]
    );

    // ── Customers ──────────────────────────────────────────────────────────
    await insertChunked(
      database, 'customers',
      ['name', 'phone', 'address', 'total_purchases', 'created_at'],
      customerCount,
      (n) => [`${TAG} Customer ${n}`, `${TAG}-CUST-${n}`, `${TAG} Address ${n}`, 0, randomPastDate(yearsOfHistory)]
    );
    const firstCustomerRow = await database.getFirstAsync<{ id: number }>(
      `SELECT id FROM customers WHERE name = ? `, [`${TAG} Customer 0`]
    );
    const firstCustomerId = firstCustomerRow?.id ?? 1;

    // ── Products ───────────────────────────────────────────────────────────
    await insertChunked(
      database, 'products',
      ['name', 'category', 'item_id', 'purchase_price', 'selling_price', 'quantity', 'unit', 'is_active', 'payment_status', 'created_at', 'updated_at'],
      productCount,
      (n) => {
        const buy = 5000 + Math.round(Math.random() * 200_000);
        const sell = Math.round(buy * (1.15 + Math.random() * 0.5));
        const ts = randomPastDate(yearsOfHistory);
        return [
          `${TAG} Product ${n}`, randomItem(CATEGORIES), `${TAG}-ITEM-${n}`,
          buy, sell, Math.round(Math.random() * 200), 'pcs', 1,
          Math.random() < 0.15 ? 'debt' : 'paid', ts, ts,
        ];
      }
    );
    const firstProductRow = await database.getFirstAsync<{ id: number }>(
      `SELECT id FROM products WHERE name = ?`, [`${TAG} Product 0`]
    );
    const firstProductId = firstProductRow?.id ?? 1;

    // ── Sales + sale_items ───────────────────────────────────────────────────
    // Inserted sale-by-sale (not bulk-chunked like the tables above) because each
    // sale needs its own freshly generated invoice_number and 1-4 dependent
    // sale_items rows referencing its id — still wrapped in the single outer
    // transaction above, so this stays fast (no per-row commit overhead).
    for (let i = 0; i < saleCount; i++) {
      const itemCount = 1 + Math.floor(Math.random() * 4);
      let grandTotal = 0;
      const items: { productId: number; price: number; qty: number; lineTotal: number }[] = [];
      for (let k = 0; k < itemCount; k++) {
        const price = 5000 + Math.round(Math.random() * 250_000);
        const qty = 1 + Math.floor(Math.random() * 3);
        const lineTotal = price * qty;
        grandTotal += lineTotal;
        items.push({ productId: firstProductId + Math.floor(Math.random() * productCount), price, qty, lineTotal });
      }
      const createdAt = randomPastDate(yearsOfHistory);
      const customerId = firstCustomerId + Math.floor(Math.random() * customerCount);

      const saleResult = await database.runAsync(
        `INSERT INTO sales (invoice_number, customer_id, payment_method, subtotal, discount_total, grand_total, paid_amount, remaining_debt, status, created_at, updated_at, date)
         VALUES (?, ?, ?, ?, 0, ?, ?, 0, 'completed', ?, ?, ?)`,
        [`${TAG}-INV-${i}`, customerId, 'cash', grandTotal, grandTotal, grandTotal, createdAt, createdAt, createdAt]
      );
      const saleId = saleResult.lastInsertRowId;

      const itemValues = items.map(() => '(?, ?, ?, ?, ?, ?, ?)').join(', ');
      const itemParams: SQLiteBindValue[] = [];
      for (const it of items) {
        itemParams.push(saleId, it.productId, `${TAG} Product`, it.price, it.qty, 0, it.lineTotal);
      }
      await database.runAsync(
        `INSERT INTO sale_items (sale_id, product_id, product_name, selling_price, quantity, discount, line_total)
         VALUES ${itemValues}`,
        itemParams
      );
      saleItemCount += items.length;
    }
  });

  return {
    products: productCount,
    customers: customerCount,
    suppliers: supplierCount,
    sales: saleCount,
    saleItems: saleItemCount,
    elapsedMs: Date.now() - start,
  };
}

/** Removes every row inserted by seedPerfData() (matched by the PERFSEED tag) — never touches real data. */
export async function clearPerfData(): Promise<{ products: number; customers: number; suppliers: number; sales: number }> {
  if (!__DEV__) {
    throw new Error('clearPerfData() is a development-only tool and is disabled in production builds.');
  }
  const database = await getDatabase();

  const countProducts = await database.getFirstAsync<{ c: number }>(`SELECT COUNT(*) AS c FROM products WHERE name LIKE '${TAG}%'`);
  const countCustomers = await database.getFirstAsync<{ c: number }>(`SELECT COUNT(*) AS c FROM customers WHERE name LIKE '${TAG}%'`);
  const countSuppliers = await database.getFirstAsync<{ c: number }>(`SELECT COUNT(*) AS c FROM suppliers WHERE name LIKE '${TAG}%'`);
  const countSales = await database.getFirstAsync<{ c: number }>(`SELECT COUNT(*) AS c FROM sales WHERE invoice_number LIKE '${TAG}%'`);

  await database.withTransactionAsync(async () => {
    await database.execAsync(`DELETE FROM sale_items WHERE sale_id IN (SELECT id FROM sales WHERE invoice_number LIKE '${TAG}%')`);
    await database.execAsync(`DELETE FROM sales WHERE invoice_number LIKE '${TAG}%'`);
    await database.execAsync(`DELETE FROM products WHERE name LIKE '${TAG}%'`);
    await database.execAsync(`DELETE FROM customers WHERE name LIKE '${TAG}%'`);
    await database.execAsync(`DELETE FROM suppliers WHERE name LIKE '${TAG}%'`);
  });

  return {
    products: countProducts?.c ?? 0,
    customers: countCustomers?.c ?? 0,
    suppliers: countSuppliers?.c ?? 0,
    sales: countSales?.c ?? 0,
  };
}
