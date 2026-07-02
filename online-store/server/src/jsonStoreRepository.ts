import fs from 'fs';
import path from 'path';
import type { StoreInfo, StoreRecord, StoreRepository, SyncChangeInput } from './storeRepository';
import { withStoreLock } from './storeLock';

// Plain local JSON ledger — no database account required to run this server. Fine
// for a single-process deployment; swap in a real DB-backed StoreRepository if you
// outgrow it (see the interface in storeRepository.ts).
const LEDGER_PATH = path.join(__dirname, '../data/stores.json');

function readLedger(): StoreRecord[] {
  if (!fs.existsSync(LEDGER_PATH)) return [];
  return JSON.parse(fs.readFileSync(LEDGER_PATH, 'utf8'));
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Crash-safe temp-file-then-rename write: a plain writeFileSync truncates the
// destination before writing the new content, so a crash mid-write (a restart, a
// deploy, an OOM kill) could leave an empty/corrupt stores.json that reads back as
// "nothing exists here" — silently wiping every registered store at once. Writing
// to a temp file first and renaming it into place means the destination is always
// either fully replaced or completely untouched.
async function writeLedger(records: StoreRecord[]): Promise<void> {
  fs.mkdirSync(path.dirname(LEDGER_PATH), { recursive: true });
  const tmpPath = `${LEDGER_PATH}.${process.pid}.${Date.now()}.tmp`;
  fs.writeFileSync(tmpPath, JSON.stringify(records, null, 2));
  // fs.renameSync can transiently fail with EPERM/EBUSY if something else
  // (antivirus, a sync client, a search indexer) briefly has the destination file
  // open for reading. A short retry absorbs that without weakening the atomicity
  // guarantee above: at every attempt the destination is either fully replaced or
  // completely untouched, we may just need more than one try to get there.
  const maxAttempts = 5;
  for (let attempt = 1; ; attempt++) {
    try {
      fs.renameSync(tmpPath, LEDGER_PATH);
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

export class JsonStoreRepository implements StoreRepository {
  async getBySlug(slug: string): Promise<StoreRecord | null> {
    return readLedger().find((s) => s.slug === slug) ?? null;
  }

  async isSlugTaken(slug: string): Promise<boolean> {
    return readLedger().some((s) => s.slug === slug);
  }

  async create(data: { slug: string; businessName: string; apiKeyHash: string }): Promise<StoreRecord> {
    return withStoreLock(async () => {
      const records = readLedger();
      const record: StoreRecord = {
        slug: data.slug,
        businessName: data.businessName,
        enabled: true,
        apiKeyHash: data.apiKeyHash,
        createdAt: new Date().toISOString(),
        lastSyncAt: null,
        products: [],
      };
      records.push(record);
      await writeLedger(records);
      return record;
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
      records[idx] = { ...store, products: Array.from(productsById.values()), lastSyncAt: syncedAt };
      await writeLedger(records);
      return { syncedAt, accepted: changes.length };
    });
  }
}
