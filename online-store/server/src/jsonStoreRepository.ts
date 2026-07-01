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

function writeLedger(records: StoreRecord[]): void {
  fs.mkdirSync(path.dirname(LEDGER_PATH), { recursive: true });
  fs.writeFileSync(LEDGER_PATH, JSON.stringify(records, null, 2));
}

export class JsonStoreRepository implements StoreRepository {
  async getBySlug(slug: string): Promise<StoreRecord | null> {
    return readLedger().find((s) => s.slug === slug) ?? null;
  }

  async isSlugTaken(slug: string): Promise<boolean> {
    return readLedger().some((s) => s.slug === slug);
  }

  async create(data: { slug: string; businessName: string; apiKeyHash: string }): Promise<StoreRecord> {
    return withStoreLock(data.slug, async () => {
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
      writeLedger(records);
      return record;
    });
  }

  async setEnabled(slug: string, enabled: boolean): Promise<StoreRecord | null> {
    return withStoreLock(slug, async () => {
      const records = readLedger();
      const idx = records.findIndex((s) => s.slug === slug);
      if (idx === -1) return null;
      records[idx] = { ...records[idx], enabled };
      writeLedger(records);
      return records[idx];
    });
  }

  async updateInfo(slug: string, update: Partial<StoreInfo> & { businessName?: string }): Promise<StoreRecord | null> {
    return withStoreLock(slug, async () => {
      const records = readLedger();
      const idx = records.findIndex((s) => s.slug === slug);
      if (idx === -1) return null;
      const { businessName, ...info } = update;
      records[idx] = {
        ...records[idx],
        ...(businessName ? { businessName } : {}),
        info: { ...records[idx].info, ...info },
      };
      writeLedger(records);
      return records[idx];
    });
  }

  async applySync(slug: string, changes: SyncChangeInput[]): Promise<{ syncedAt: string; accepted: number }> {
    return withStoreLock(slug, async () => {
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
      writeLedger(records);
      return { syncedAt, accepted: changes.length };
    });
  }
}
