import fs from 'fs';
import path from 'path';
import type {
  DeletedStoreRecord,
  StoreInfo,
  StoreRecord,
  StoreRepository,
  SubscriptionCheckResult,
  SyncChangeInput,
} from './storeRepository';
import { withStoreLock } from './storeLock';

// Plain local JSON ledger — no database account required to run this server. Fine
// for a single-process deployment; swap in a real DB-backed StoreRepository if you
// outgrow it (see the interface in storeRepository.ts).
const LEDGER_PATH = path.join(__dirname, '../data/stores.json');
// Separate file (and separate atomic-write helper below), not a section inside
// stores.json — deletion is meant to be permanent and independent of the live
// ledger's read/write cycle, and keeping it a flat append-mostly list avoids
// ever needing to touch it under withStoreLock's stores.json-specific queue.
const DELETED_STORES_PATH = path.join(__dirname, '../data/deleted-stores.json');

// Legacy migration (claimLegacyStore() below) only exists to let stores created
// before device-based recovery existed become claimable once, via a businessName/
// slug match — an inherently weaker signal than a stored deviceId, since a legacy
// store has no other proof of ownership to check. That path must not stay open
// forever: fixed 30-day window anchored to the date this migration path shipped.
// Enforced HERE (inside the repository method itself, not just at the route call
// site) so the guarantee — "once the window closes, businessName/slug matching can
// never again be used to claim a store" — holds regardless of which caller invokes
// this method, now or after any future refactor.
const LEGACY_MIGRATION_DEPLOYED_AT = new Date('2026-07-01T00:00:00.000Z').getTime();
const LEGACY_MIGRATION_WINDOW_MS = 30 * 24 * 60 * 60 * 1000;

function isLegacyMigrationWindowOpen(): boolean {
  return Date.now() < LEGACY_MIGRATION_DEPLOYED_AT + LEGACY_MIGRATION_WINDOW_MS;
}

function readLedger(): StoreRecord[] {
  if (!fs.existsSync(LEDGER_PATH)) return [];
  return JSON.parse(fs.readFileSync(LEDGER_PATH, 'utf8'));
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Same crash-safe temp-file-then-rename pattern for any JSON ledger under
// data/ — used for stores.json and deleted-stores.json alike. See the inline
// comments below (kept on the stores.json call site historically) for why
// this matters: a plain writeFileSync would truncate the destination before
// writing the new content, so a crash mid-write could leave an empty file
// that reads back as "nothing exists here" — silently wiping real data.
async function writeJsonLedger(filePath: string, records: unknown): Promise<void> {
  const dir = path.dirname(filePath);
  fs.mkdirSync(dir, { recursive: true });
  const tmpPath = `${filePath}.${process.pid}.${Date.now()}.tmp`;
  fs.writeFileSync(tmpPath, JSON.stringify(records, null, 2));
  // fs.renameSync can transiently fail with EPERM/EBUSY on Windows if something
  // else (antivirus, a sync client, a search indexer) briefly has the destination
  // file open for reading — observed directly in local dev on this OneDrive-synced
  // checkout. A short retry absorbs that without weakening the atomicity guarantee
  // above: at every attempt the destination is either fully replaced or completely
  // untouched, we may just need more than one try to get there.
  const maxAttempts = 5;
  for (let attempt = 1; ; attempt++) {
    try {
      fs.renameSync(tmpPath, filePath);
      return;
    } catch (e) {
      const code = (e as NodeJS.ErrnoException).code;
      if (attempt >= maxAttempts || (code !== 'EPERM' && code !== 'EBUSY')) {
        throw e;
      }
      await delay(20 * attempt);
    }
  }
}

function writeLedger(records: StoreRecord[]): Promise<void> {
  return writeJsonLedger(LEDGER_PATH, records);
}

function readDeletedLedger(): DeletedStoreRecord[] {
  if (!fs.existsSync(DELETED_STORES_PATH)) return [];
  return JSON.parse(fs.readFileSync(DELETED_STORES_PATH, 'utf8'));
}

function writeDeletedLedger(records: DeletedStoreRecord[]): Promise<void> {
  return writeJsonLedger(DELETED_STORES_PATH, records);
}

function slugify(name: string): string {
  const base = name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return base || 'store';
}

function uniqueSlugAgainst(records: StoreRecord[], base: string): string {
  let candidate = base;
  let n = 2;
  while (records.some((s) => s.slug === candidate)) {
    candidate = `${base}-${n}`;
    n += 1;
  }
  return candidate;
}

export class JsonStoreRepository implements StoreRepository {
  async getBySlug(slug: string): Promise<StoreRecord | null> {
    return readLedger().find((s) => s.slug === slug) ?? null;
  }

  async getByDeviceId(deviceId: string): Promise<StoreRecord | null> {
    return readLedger().find((s) => s.deviceId === deviceId) ?? null;
  }

  async isSlugTaken(slug: string): Promise<boolean> {
    return readLedger().some((s) => s.slug === slug);
  }

  async create(data: { slug: string; businessName: string; apiKeyHash: string; deviceId?: string }): Promise<StoreRecord> {
    return withStoreLock(async () => {
      const records = readLedger();
      const record: StoreRecord = {
        slug: data.slug,
        businessName: data.businessName,
        enabled: true,
        apiKeyHash: data.apiKeyHash,
        // Omit the key entirely when absent rather than writing a literal `undefined`
        // into the JSON ledger.
        ...(data.deviceId ? { deviceId: data.deviceId } : {}),
        createdAt: new Date().toISOString(),
        lastSyncAt: null,
        products: [],
      };
      records.push(record);
      await writeLedger(records);
      return record;
    });
  }

  // Recovery path: reissues a credential for an already-existing store without
  // touching anything else, so a device that lost its local slug/apiKey (e.g.
  // reinstall) can reclaim the SAME store instead of a new one being created.
  async rotateApiKey(slug: string, apiKeyHash: string): Promise<StoreRecord | null> {
    return withStoreLock(async () => {
      const records = readLedger();
      const idx = records.findIndex((s) => s.slug === slug);
      if (idx === -1) return null;
      records[idx] = { ...records[idx], apiKeyHash };
      await writeLedger(records);
      return records[idx];
    });
  }

  // Legacy migration: a store created before deviceId tracking existed has no
  // deviceId at all. Returns null (never claims anything) if: the migration window
  // has closed, the slug doesn't exist, it's already owned by a device, or it was
  // ever migrated before (`legacyMigratedAt` is a permanent marker — checked
  // separately from `deviceId` so a store can never re-enter this flow even if its
  // deviceId were ever cleared for some unrelated reason later). Re-checks all of
  // this INSIDE the lock (not just relying on a caller's earlier read) so it's
  // safe even if ever called standalone, outside registerOrRecover's own
  // transaction — an already-claimed or already-migrated record is never
  // reassigned, full stop.
  async claimLegacyStore(slug: string, deviceId: string, apiKeyHash: string): Promise<StoreRecord | null> {
    if (!isLegacyMigrationWindowOpen()) return null;
    return withStoreLock(async () => {
      const records = readLedger();
      const idx = records.findIndex((s) => s.slug === slug);
      if (idx === -1) return null;
      if (records[idx].deviceId || records[idx].legacyMigratedAt) return null;
      records[idx] = { ...records[idx], deviceId, apiKeyHash, legacyMigratedAt: new Date().toISOString() };
      await writeLedger(records);
      return records[idx];
    });
  }

  async setEnabled(slug: string, enabled: boolean): Promise<StoreRecord | null> {
    return withStoreLock(async () => {
      const records = readLedger();
      const idx = records.findIndex((s) => s.slug === slug);
      if (idx === -1) return null;
      records[idx] = { ...records[idx], enabled };
      await writeLedger(records);
      return records[idx];
    });
  }

  async updateInfo(slug: string, update: Partial<StoreInfo> & { businessName?: string }): Promise<StoreRecord | null> {
    return withStoreLock(async () => {
      const records = readLedger();
      const idx = records.findIndex((s) => s.slug === slug);
      if (idx === -1) return null;
      const { businessName, ...info } = update;
      records[idx] = {
        ...records[idx],
        ...(businessName ? { businessName } : {}),
        info: { ...records[idx].info, ...info },
      };
      await writeLedger(records);
      return records[idx];
    });
  }

  async applySync(slug: string, changes: SyncChangeInput[]): Promise<{ syncedAt: string; accepted: number }> {
    return withStoreLock(async () => {
      const records = readLedger();
      const idx = records.findIndex((s) => s.slug === slug);
      if (idx === -1) throw new Error('STORE_NOT_FOUND');

      const store = records[idx];
      const productsById = new Map(store.products.map((p) => [p.productId, p]));

      for (const change of changes) {
        if (change.operation === 'delete') {
          productsById.delete(change.productId);
          continue;
        }
        const existing = productsById.get(change.productId);
        // Last-write-wins on updatedAt — an older upsert arriving after a newer one
        // (e.g. retried after a dropped connection) must not clobber newer data.
        if (existing && change.updatedAt && existing.updatedAt > change.updatedAt) continue;
        productsById.set(change.productId, {
          productId: change.productId,
          name: change.name ?? existing?.name ?? '',
          category: change.category ?? existing?.category ?? 'General',
          description: change.description !== undefined ? change.description : existing?.description ?? null,
          websiteDescription: change.websiteDescription !== undefined ? change.websiteDescription : existing?.websiteDescription ?? null,
          price: change.price ?? existing?.price ?? 0,
          quantity: change.quantity ?? existing?.quantity ?? 0,
          imageUrl: change.imageUrl ?? existing?.imageUrl ?? null,
          isPublished: change.isPublished ?? existing?.isPublished ?? false,
          updatedAt: change.updatedAt ?? new Date().toISOString(),
        });
      }

      const syncedAt = new Date().toISOString();
      records[idx] = {
        ...store,
        products: Array.from(productsById.values()),
        lastSyncAt: syncedAt,
        syncCount: (store.syncCount ?? 0) + 1,
      };
      await writeLedger(records);
      return { syncedAt, accepted: changes.length };
    });
  }

  // Registration's entire recover-or-create decision tree as ONE atomic
  // transaction: a single readLedger()/writeLedger() pair under a single lock
  // acquisition, operating directly on the in-memory `records` array rather
  // than calling out to getByDeviceId/claimLegacyStore/isSlugTaken/create —
  // those each acquire the lock themselves, and withStoreLock() is no longer
  // reentrant (see storeLock.ts), so calling them from inside this callback
  // would deadlock. Duplicating their logic inline here also shrinks the
  // registration race window from up to three separate write cycles down to
  // one. Mirrors the exact decision order/guarantees the route used to
  // orchestrate itself: recover by deviceId (rotate credential only) -> claim
  // a pre-deviceId legacy store by slug match (only within the fixed 30-day
  // window, only once, never reassigning an already-owned/migrated record) ->
  // otherwise create a fresh store under a guaranteed-unique slug.
  async registerOrRecover(input: { businessName: string; deviceId?: string; apiKeyHash: string }): Promise<{ record: StoreRecord; recovered: boolean }> {
    const { businessName, deviceId, apiKeyHash } = input;
    return withStoreLock(async () => {
      const records = readLedger();

      if (deviceId) {
        const idx = records.findIndex((s) => s.deviceId === deviceId);
        if (idx !== -1) {
          records[idx] = { ...records[idx], apiKeyHash };
          await writeLedger(records);
          return { record: records[idx], recovered: true };
        }
      }

      const baseSlug = slugify(businessName);

      if (deviceId && isLegacyMigrationWindowOpen()) {
        const idx = records.findIndex((s) => s.slug === baseSlug);
        if (idx !== -1 && !records[idx].deviceId && !records[idx].legacyMigratedAt) {
          records[idx] = { ...records[idx], deviceId, apiKeyHash, legacyMigratedAt: new Date().toISOString() };
          await writeLedger(records);
          return { record: records[idx], recovered: true };
        }
      }

      const slug = uniqueSlugAgainst(records, baseSlug);
      const record: StoreRecord = {
        slug,
        businessName,
        enabled: true,
        apiKeyHash,
        ...(deviceId ? { deviceId } : {}),
        createdAt: new Date().toISOString(),
        lastSyncAt: null,
        products: [],
      };
      records.push(record);
      await writeLedger(records);
      return { record, recovered: false };
    });
  }

  // --- Admin-only additions below (see routes/admin.ts) ---

  async listAll(): Promise<StoreRecord[]> {
    return readLedger();
  }

  async setAdminSuspended(slug: string, suspended: boolean): Promise<StoreRecord | null> {
    return withStoreLock(async () => {
      const records = readLedger();
      const idx = records.findIndex((s) => s.slug === slug);
      if (idx === -1) return null;
      records[idx] = { ...records[idx], adminSuspended: suspended };
      await writeLedger(records);
      return records[idx];
    });
  }

  // Deliberately swallows its own errors (missing slug, a write racing a
  // deleteStore, etc.) instead of throwing — this is a best-effort side
  // effect of a subscription check, never allowed to turn into a failure of
  // the request that triggered it. See storeRepository.ts's doc comment.
  async recordSubscriptionCheck(slug: string, result: SubscriptionCheckResult): Promise<void> {
    try {
      await withStoreLock(async () => {
        const records = readLedger();
        const idx = records.findIndex((s) => s.slug === slug);
        if (idx === -1) return;
        records[idx] = {
          ...records[idx],
          subscriptionStatus: result.status,
          ...(result.plan ? { subscriptionPlan: result.plan } : {}),
          ...(result.expiresAt ? { subscriptionExpiresAt: result.expiresAt } : {}),
          subscriptionCheckedAt: new Date().toISOString(),
        };
        await writeLedger(records);
      });
    } catch (e) {
      console.error(`recordSubscriptionCheck failed for ${slug}:`, e);
    }
  }

  async deleteStore(slug: string): Promise<DeletedStoreRecord | null> {
    return withStoreLock(async () => {
      const records = readLedger();
      const idx = records.findIndex((s) => s.slug === slug);
      if (idx === -1) return null;
      const [removed] = records.splice(idx, 1);

      const tombstone: DeletedStoreRecord = {
        slug: removed.slug,
        businessName: removed.businessName,
        deletedAt: new Date().toISOString(),
        productsCount: removed.products.length,
      };
      const deleted = readDeletedLedger();
      deleted.push(tombstone);

      // Both writes happen inside this single lock acquisition (not two
      // separate withStoreLock calls) so a crash between them can't leave a
      // store gone from stores.json with no tombstone recorded, or vice
      // versa — see withStoreLock's own "not reentrant" note for why this
      // must be one callback rather than composed calls.
      await writeLedger(records);
      await writeDeletedLedger(deleted);
      return tombstone;
    });
  }

  async listDeletedStores(): Promise<DeletedStoreRecord[]> {
    return readDeletedLedger();
  }

  async replaceAll(records: StoreRecord[], deletedRecords: DeletedStoreRecord[]): Promise<void> {
    return withStoreLock(async () => {
      await writeLedger(records);
      await writeDeletedLedger(deletedRecords);
    });
  }
}
