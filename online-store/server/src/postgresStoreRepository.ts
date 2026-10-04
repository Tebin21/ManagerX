import type { PoolClient } from 'pg';
import { pool } from './db/pool';
import type {
  DeletedStoreRecord,
  StoreInfo,
  StoreProduct,
  StoreRecord,
  StoreRepository,
  SubscriptionCheckResult,
  SyncChangeInput,
} from './storeRepository';
import { isReservedSlug } from './reservedSlugs';
import { slugify } from './slugify';

const LEGACY_MIGRATION_DEPLOYED_AT = new Date('2026-07-01T00:00:00.000Z').getTime();
const LEGACY_MIGRATION_WINDOW_MS = 30 * 24 * 60 * 60 * 1000;

function isLegacyMigrationWindowOpen(): boolean {
  return Date.now() < LEGACY_MIGRATION_DEPLOYED_AT + LEGACY_MIGRATION_WINDOW_MS;
}

interface DbStoreRow {
  id: string;
  slug: string;
  business_name: string;
  api_key_hash: string;
  device_id: string | null;
  enabled: boolean;
  admin_suspended: boolean;
  legacy_migrated_at: Date | null;
  last_sync_at: Date | null;
  sync_count: number;
  subscription_status: string | null;
  subscription_plan: string | null;
  subscription_expires_at: Date | null;
  subscription_checked_at: Date | null;
  info: StoreInfo | null;
  created_at: Date;
  updated_at: Date;
}

interface DbProductRow {
  product_id: number;
  name: string;
  category: string;
  description: string | null;
  website_description: string | null;
  price: string | number;
  quantity: number;
  image_url: string | null;
  is_published: boolean;
  updated_at: Date;
}

function mapProduct(row: DbProductRow): StoreProduct {
  return {
    productId: row.product_id,
    name: row.name,
    category: row.category,
    description: row.description,
    websiteDescription: row.website_description,
    price: Number(row.price),
    quantity: row.quantity,
    imageUrl: row.image_url,
    isPublished: row.is_published,
    updatedAt: row.updated_at.toISOString(),
  };
}

function mapStore(row: DbStoreRow, products: StoreProduct[] = []): StoreRecord {
  return {
    slug: row.slug,
    businessName: row.business_name,
    enabled: row.enabled,
    apiKeyHash: row.api_key_hash,
    deviceId: row.device_id ?? undefined,
    legacyMigratedAt: row.legacy_migrated_at ? row.legacy_migrated_at.toISOString() : undefined,
    createdAt: row.created_at.toISOString(),
    lastSyncAt: row.last_sync_at ? row.last_sync_at.toISOString() : null,
    products,
    info: row.info ?? undefined,
    adminSuspended: row.admin_suspended,
    syncCount: row.sync_count,
    subscriptionStatus: (row.subscription_status as any) ?? undefined,
    subscriptionPlan: row.subscription_plan ?? undefined,
    subscriptionExpiresAt: row.subscription_expires_at ? row.subscription_expires_at.toISOString() : undefined,
    subscriptionCheckedAt: row.subscription_checked_at ? row.subscription_checked_at.toISOString() : undefined,
  };
}

export class PostgresStoreRepository implements StoreRepository {
  async getBySlug(slug: string): Promise<StoreRecord | null> {
    const storeRes = await pool.query<DbStoreRow>(
      'SELECT * FROM stores WHERE slug = $1 LIMIT 1',
      [slug]
    );
    if (storeRes.rows.length === 0) return null;

    const storeRow = storeRes.rows[0];
    const productsRes = await pool.query<DbProductRow>(
      'SELECT product_id, name, category, description, website_description, price, quantity, image_url, is_published, updated_at FROM products WHERE store_id = $1 ORDER BY product_id ASC',
      [storeRow.id]
    );

    return mapStore(storeRow, productsRes.rows.map(mapProduct));
  }

  async getByDeviceId(deviceId: string): Promise<StoreRecord | null> {
    if (!deviceId) return null;
    const storeRes = await pool.query<DbStoreRow>(
      'SELECT * FROM stores WHERE device_id = $1 ORDER BY created_at ASC LIMIT 1',
      [deviceId]
    );
    if (storeRes.rows.length === 0) return null;

    const storeRow = storeRes.rows[0];
    const productsRes = await pool.query<DbProductRow>(
      'SELECT product_id, name, category, description, website_description, price, quantity, image_url, is_published, updated_at FROM products WHERE store_id = $1 ORDER BY product_id ASC',
      [storeRow.id]
    );

    return mapStore(storeRow, productsRes.rows.map(mapProduct));
  }

  async isSlugTaken(slug: string): Promise<boolean> {
    const res = await pool.query('SELECT 1 FROM stores WHERE slug = $1 LIMIT 1', [slug]);
    return res.rows.length > 0;
  }

  private async generateUniqueSlug(base: string, client?: PoolClient): Promise<string> {
    const executor = client ?? pool;
    let candidate = base;
    let n = 2;
    while (true) {
      const res = await executor.query('SELECT 1 FROM stores WHERE slug = $1 LIMIT 1', [candidate]);
      if (res.rows.length === 0) return candidate;
      candidate = `${base}-${n}`;
      n += 1;
    }
  }

  async create(data: {
    slug: string;
    businessName: string;
    apiKeyHash: string;
    deviceId?: string;
  }): Promise<StoreRecord> {
    if (isReservedSlug(data.slug)) {
      throw new Error('RESERVED_SLUG');
    }
    const res = await pool.query<DbStoreRow>(
      `INSERT INTO stores (slug, business_name, api_key_hash, device_id, enabled)
       VALUES ($1, $2, $3, $4, true)
       RETURNING *`,
      [data.slug, data.businessName, data.apiKeyHash, data.deviceId ?? null]
    );
    return mapStore(res.rows[0], []);
  }

  async registerOrRecover(input: {
    businessName: string;
    deviceId?: string;
    apiKeyHash: string;
  }): Promise<{ record: StoreRecord; recovered: boolean }> {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // 1. Check recovery by deviceId
      if (input.deviceId) {
        const devRes = await client.query<DbStoreRow>(
          'SELECT * FROM stores WHERE device_id = $1 ORDER BY created_at ASC LIMIT 1 FOR UPDATE',
          [input.deviceId]
        );
        if (devRes.rows.length > 0) {
          const row = devRes.rows[0];
          await client.query(
            'UPDATE stores SET api_key_hash = $1, updated_at = NOW() WHERE id = $2',
            [input.apiKeyHash, row.id]
          );
          const productsRes = await client.query<DbProductRow>(
            'SELECT * FROM products WHERE store_id = $1 ORDER BY product_id ASC',
            [row.id]
          );
          await client.query('COMMIT');
          return {
            record: mapStore({ ...row, api_key_hash: input.apiKeyHash }, productsRes.rows.map(mapProduct)),
            recovered: true,
          };
        }
      }

      // 2. Legacy recovery
      const baseSlug = slugify(input.businessName);
      if (input.deviceId && isLegacyMigrationWindowOpen()) {
        const legacyRes = await client.query<DbStoreRow>(
          'SELECT * FROM stores WHERE slug = $1 AND device_id IS NULL AND legacy_migrated_at IS NULL LIMIT 1 FOR UPDATE',
          [baseSlug]
        );
        if (legacyRes.rows.length > 0) {
          const row = legacyRes.rows[0];
          const now = new Date();
          await client.query(
            'UPDATE stores SET device_id = $1, api_key_hash = $2, legacy_migrated_at = $3, updated_at = NOW() WHERE id = $4',
            [input.deviceId, input.apiKeyHash, now, row.id]
          );
          const productsRes = await client.query<DbProductRow>(
            'SELECT * FROM products WHERE store_id = $1 ORDER BY product_id ASC',
            [row.id]
          );
          await client.query('COMMIT');
          return {
            record: mapStore(
              { ...row, device_id: input.deviceId, api_key_hash: input.apiKeyHash, legacy_migrated_at: now },
              productsRes.rows.map(mapProduct)
            ),
            recovered: true,
          };
        }
      }

      // 3. New store creation
      if (isReservedSlug(baseSlug)) {
        throw new Error('RESERVED_SLUG');
      }
      const uniqueSlug = await this.generateUniqueSlug(baseSlug, client);
      const insertRes = await client.query<DbStoreRow>(
        `INSERT INTO stores (slug, business_name, api_key_hash, device_id, enabled)
         VALUES ($1, $2, $3, $4, true)
         RETURNING *`,
        [uniqueSlug, input.businessName, input.apiKeyHash, input.deviceId ?? null]
      );
      await client.query('COMMIT');
      return {
        record: mapStore(insertRes.rows[0], []),
        recovered: false,
      };
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  async rotateApiKey(slug: string, apiKeyHash: string): Promise<StoreRecord | null> {
    const res = await pool.query<DbStoreRow>(
      'UPDATE stores SET api_key_hash = $1, updated_at = NOW() WHERE slug = $2 RETURNING *',
      [apiKeyHash, slug]
    );
    if (res.rows.length === 0) return null;
    return this.getBySlug(slug);
  }

  async claimLegacyStore(slug: string, deviceId: string, apiKeyHash: string): Promise<StoreRecord | null> {
    if (!isLegacyMigrationWindowOpen()) return null;
    const now = new Date();
    const res = await pool.query<DbStoreRow>(
      `UPDATE stores
       SET device_id = $1, api_key_hash = $2, legacy_migrated_at = $3, updated_at = NOW()
       WHERE slug = $4 AND device_id IS NULL AND legacy_migrated_at IS NULL
       RETURNING *`,
      [deviceId, apiKeyHash, now, slug]
    );
    if (res.rows.length === 0) return null;
    return this.getBySlug(slug);
  }

  async setEnabled(slug: string, enabled: boolean): Promise<StoreRecord | null> {
    const res = await pool.query<DbStoreRow>(
      'UPDATE stores SET enabled = $1, updated_at = NOW() WHERE slug = $2 RETURNING *',
      [enabled, slug]
    );
    if (res.rows.length === 0) return null;
    return this.getBySlug(slug);
  }

  async updateInfo(
    slug: string,
    update: Partial<StoreInfo> & { businessName?: string }
  ): Promise<StoreRecord | null> {
    const storeRes = await pool.query<DbStoreRow>('SELECT id, info, business_name FROM stores WHERE slug = $1 LIMIT 1', [slug]);
    if (storeRes.rows.length === 0) return null;

    const row = storeRes.rows[0];
    const { businessName, ...infoFields } = update;
    const newName = businessName?.trim() || row.business_name;
    const currentInfo = row.info || {};
    const mergedInfo = { ...currentInfo, ...infoFields };

    await pool.query(
      'UPDATE stores SET business_name = $1, info = $2, updated_at = NOW() WHERE id = $3',
      [newName, JSON.stringify(mergedInfo), row.id]
    );
    return this.getBySlug(slug);
  }

  async applySync(
    slug: string,
    changes: SyncChangeInput[]
  ): Promise<{ syncedAt: string; accepted: number }> {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const storeRes = await client.query<DbStoreRow>(
        'SELECT id FROM stores WHERE slug = $1 LIMIT 1 FOR UPDATE',
        [slug]
      );
      if (storeRes.rows.length === 0) {
        throw new Error('STORE_NOT_FOUND');
      }
      const storeId = storeRes.rows[0].id;

      let accepted = 0;
      for (const ch of changes) {
        if (ch.operation === 'delete') {
          // Strictly scoped to store_id
          await client.query(
            'DELETE FROM products WHERE store_id = $1 AND product_id = $2',
            [storeId, ch.productId]
          );
          accepted += 1;
        } else if (ch.operation === 'upsert') {
          // Strictly scoped to store_id
          const updatedAt = ch.updatedAt ? new Date(ch.updatedAt) : new Date();
          await client.query(
            `INSERT INTO products (
               store_id, product_id, name, category, description, website_description,
               price, quantity, image_url, is_published, updated_at
             ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
             ON CONFLICT (store_id, product_id) DO UPDATE SET
               name = EXCLUDED.name,
               category = EXCLUDED.category,
               description = EXCLUDED.description,
               website_description = EXCLUDED.website_description,
               price = EXCLUDED.price,
               quantity = EXCLUDED.quantity,
               image_url = EXCLUDED.image_url,
               is_published = EXCLUDED.is_published,
               updated_at = EXCLUDED.updated_at`,
            [
              storeId,
              ch.productId,
              ch.name || 'Untitled',
              ch.category || 'General',
              ch.description ?? null,
              ch.websiteDescription ?? null,
              ch.price ?? 0,
              ch.quantity ?? 0,
              ch.imageUrl ?? null,
              ch.isPublished ?? true,
              updatedAt,
            ]
          );
          accepted += 1;
        }
      }

      const syncedAt = new Date().toISOString();
      await client.query(
        'UPDATE stores SET last_sync_at = $1, sync_count = sync_count + 1, updated_at = NOW() WHERE id = $2',
        [syncedAt, storeId]
      );

      await client.query('COMMIT');
      return { syncedAt, accepted };
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  async listAll(): Promise<StoreRecord[]> {
    const storesRes = await pool.query<DbStoreRow>('SELECT * FROM stores ORDER BY created_at DESC');
    const result: StoreRecord[] = [];
    for (const row of storesRes.rows) {
      const pRes = await pool.query<DbProductRow>(
        'SELECT * FROM products WHERE store_id = $1 ORDER BY product_id ASC',
        [row.id]
      );
      result.push(mapStore(row, pRes.rows.map(mapProduct)));
    }
    return result;
  }

  async setAdminSuspended(slug: string, suspended: boolean): Promise<StoreRecord | null> {
    const res = await pool.query<DbStoreRow>(
      'UPDATE stores SET admin_suspended = $1, updated_at = NOW() WHERE slug = $2 RETURNING *',
      [suspended, slug]
    );
    if (res.rows.length === 0) return null;
    return this.getBySlug(slug);
  }

  async recordSubscriptionCheck(slug: string, result: SubscriptionCheckResult): Promise<void> {
    try {
      await pool.query(
        `UPDATE stores SET
           subscription_status = $1,
           subscription_plan = $2,
           subscription_expires_at = $3,
           subscription_checked_at = NOW(),
           updated_at = NOW()
         WHERE slug = $4`,
        [result.status, result.plan ?? null, result.expiresAt ? new Date(result.expiresAt) : null, slug]
      );
    } catch (err) {
      console.error(`Failed to record subscription check for ${slug}:`, err);
    }
  }

  async deleteStore(slug: string): Promise<DeletedStoreRecord | null> {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const storeRes = await client.query<DbStoreRow>(
        'SELECT id, business_name FROM stores WHERE slug = $1 LIMIT 1 FOR UPDATE',
        [slug]
      );
      if (storeRes.rows.length === 0) {
        await client.query('ROLLBACK');
        return null;
      }
      const storeRow = storeRes.rows[0];

      const countRes = await client.query<{ count: string }>(
        'SELECT count(*) as count FROM products WHERE store_id = $1',
        [storeRow.id]
      );
      const productsCount = parseInt(countRes.rows[0].count, 10) || 0;

      const deletedAt = new Date().toISOString();
      await client.query(
        'INSERT INTO deleted_stores (slug, business_name, deleted_at, products_count) VALUES ($1, $2, $3, $4)',
        [slug, storeRow.business_name, deletedAt, productsCount]
      );

      // Deleting store automatically cascades and deletes all products due to foreign key
      await client.query('DELETE FROM stores WHERE id = $1', [storeRow.id]);
      await client.query('COMMIT');

      return {
        slug,
        businessName: storeRow.business_name,
        deletedAt,
        productsCount,
      };
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  async listDeletedStores(): Promise<DeletedStoreRecord[]> {
    const res = await pool.query<{
      slug: string;
      business_name: string;
      deleted_at: Date;
      products_count: number;
    }>('SELECT slug, business_name, deleted_at, products_count FROM deleted_stores ORDER BY deleted_at DESC');

    return res.rows.map((r) => ({
      slug: r.slug,
      businessName: r.business_name,
      deletedAt: r.deleted_at.toISOString(),
      productsCount: r.products_count,
    }));
  }

  async replaceAll(records: StoreRecord[], deletedRecords: DeletedStoreRecord[]): Promise<void> {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query('DELETE FROM products');
      await client.query('DELETE FROM stores');
      await client.query('DELETE FROM deleted_stores');

      for (const s of records) {
        const storeRes = await client.query<{ id: string }>(
          `INSERT INTO stores (
             slug, business_name, api_key_hash, device_id, enabled, admin_suspended,
             legacy_migrated_at, last_sync_at, sync_count, subscription_status,
             subscription_plan, subscription_expires_at, subscription_checked_at,
             info, created_at, updated_at
           ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, NOW())
           RETURNING id`,
          [
            s.slug,
            s.businessName,
            s.apiKeyHash,
            s.deviceId ?? null,
            s.enabled,
            s.adminSuspended ?? false,
            s.legacyMigratedAt ? new Date(s.legacyMigratedAt) : null,
            s.lastSyncAt ? new Date(s.lastSyncAt) : null,
            s.syncCount ?? 0,
            s.subscriptionStatus ?? null,
            s.subscriptionPlan ?? null,
            s.subscriptionExpiresAt ? new Date(s.subscriptionExpiresAt) : null,
            s.subscriptionCheckedAt ? new Date(s.subscriptionCheckedAt) : null,
            JSON.stringify(s.info ?? {}),
            new Date(s.createdAt),
          ]
        );
        const storeId = storeRes.rows[0].id;

        for (const p of s.products) {
          await client.query(
            `INSERT INTO products (
               store_id, product_id, name, category, description, website_description,
               price, quantity, image_url, is_published, updated_at
             ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
            [
              storeId,
              p.productId,
              p.name,
              p.category,
              p.description,
              p.websiteDescription,
              p.price,
              p.quantity,
              p.imageUrl,
              p.isPublished,
              new Date(p.updatedAt),
            ]
          );
        }
      }

      for (const d of deletedRecords) {
        await client.query(
          `INSERT INTO deleted_stores (slug, business_name, deleted_at, products_count)
           VALUES ($1, $2, $3, $4)`,
          [d.slug, d.businessName, new Date(d.deletedAt), d.productsCount]
        );
      }

      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }
}
