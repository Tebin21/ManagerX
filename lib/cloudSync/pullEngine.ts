// Real-time Firestore -> SQLite sync. Attaches one onSnapshot listener per
// cloud-synced collection under users/{uid}, plus one on users/{uid}/tombstones
// for deletes. Every incoming doc is applied through lib/backup.ts's
// mergeSimpleTable() — the exact same uuid-match + last-write-wins engine the
// local JSON backup/restore feature already uses — rather than a second,
// duplicate conflict-resolution implementation (see that file's
// matchByNaturalKeyIfNoUuid option, added specifically for this reuse).
import { getDatabase } from '@/lib/sqlite';
import { mergeSimpleTable, type MergeTableOptions } from '@/lib/backup';
import {
  isFirebaseAvailable,
  getFirebaseFirestore,
  collection,
  doc,
  onSnapshot,
} from '@/lib/firebase';
import {
  CLOUD_TABLE_ORDER,
  TABLE_TO_COLLECTION,
  cloudDocToRow,
  embedSaleItems,
  embedPurchaseItems,
  applyEmbeddedSaleItems,
  applyEmbeddedPurchaseItems,
} from './collections';
import { setLastSyncError } from './storage';

// businesses/settings (the users/{uid} root doc) intentionally use their own
// "fill empty fields only" merge for the local-JSON-restore path (lib/backup.ts's
// mergeBusinessSingleton) — that rule is wrong for continuous cloud sync, where a
// real edit on either device must actually propagate, so the root doc gets its
// own plain-LWW handling here instead (see lib/cloudSync/restore.ts and
// lib/cloudSync/pushEngine.ts's pushBusinessProfile).
const PULL_TABLE_CONFIG: Partial<Record<string, MergeTableOptions>> = {
  categories:     { policy: 'mutable', timestampColumn: 'updated_at', matchByNaturalKeyIfNoUuid: false },
  products:       { policy: 'mutable', timestampColumn: 'updated_at', matchByNaturalKeyIfNoUuid: false },
  customers:      { policy: 'mutable', timestampColumn: 'updated_at', matchByNaturalKeyIfNoUuid: false },
  suppliers:      { policy: 'mutable', timestampColumn: 'updated_at', matchByNaturalKeyIfNoUuid: false },
  sales:          { policy: 'mutable', timestampColumn: 'updated_at', matchByNaturalKeyIfNoUuid: false },
  purchases:      { policy: 'mutable', timestampColumn: 'updated_at', matchByNaturalKeyIfNoUuid: false },
  expenses:       { policy: 'mutable', timestampColumn: 'updated_at', matchByNaturalKeyIfNoUuid: false },
  debts:          { policy: 'mutable', timestampColumn: 'updated_at', matchByNaturalKeyIfNoUuid: false },
  purchase_debts: { policy: 'mutable', timestampColumn: 'updated_at', matchByNaturalKeyIfNoUuid: false },
  debt_payments:  { policy: 'immutable', matchByNaturalKeyIfNoUuid: false },
};

async function reconcileEmbeddedItems(
  db: Awaited<ReturnType<typeof getDatabase>>,
  table: 'sales' | 'purchases',
  localId: number,
  incomingItems: Record<string, unknown>[]
): Promise<void> {
  const currentItems = table === 'sales' ? await embedSaleItems(db, localId) : await embedPurchaseItems(db, localId);
  const currentUuids = currentItems.map((i) => i.uuid).sort().join(',');
  const incomingUuids = incomingItems.map((i) => i.uuid).sort().join(',');
  // Skip the delete+reinsert when the item set already matches — avoids firing the
  // sale_items/purchase_items triggers (which would re-queue an identical push) on
  // every pull of a sale/purchase whose line items never actually changed.
  if (currentUuids === incomingUuids) return;
  if (table === 'sales') await applyEmbeddedSaleItems(db, localId, incomingItems);
  else await applyEmbeddedPurchaseItems(db, localId, incomingItems);
}

// Exported for lib/cloudSync/restore.ts's one-time bulk first-login restore,
// which applies a getDocs() snapshot through the exact same per-doc logic used
// here for the ongoing real-time listeners — one apply path, two call sites.
export async function applyCloudDoc(table: string, docId: string, data: Record<string, unknown>): Promise<void> {
  const config = PULL_TABLE_CONFIG[table];
  if (!config) return;
  const db = await getDatabase();

  const row = await cloudDocToRow(db, table, { ...data, uuid: docId });
  if (!row) return; // required parent not synced locally yet — dropped, see collections.ts

  const items = (table === 'sales' || table === 'purchases') ? (data.items as Record<string, unknown>[] | undefined) ?? [] : null;
  const warnings: string[] = [];
  await mergeSimpleTable(db, table, [row], config, undefined, warnings);

  if (items) {
    const local = await db.getFirstAsync<{ id: number }>(`SELECT id FROM ${table} WHERE uuid = ?`, [docId]);
    if (local) await reconcileEmbeddedItems(db, table as 'sales' | 'purchases', local.id, items);
  }
}

async function applyTombstone(entityType: string, tombstoneUuid: string): Promise<void> {
  if (!TABLE_TO_COLLECTION[entityType] && entityType !== 'sale_items' && entityType !== 'purchase_items') return;
  const db = await getDatabase();
  await db.runAsync(`DELETE FROM ${entityType} WHERE uuid = ?`, [tombstoneUuid]);
}

let unsubscribers: Array<() => void> = [];
let started: string | null = null;

export function startCloudPull(uid: string): void {
  if (!isFirebaseAvailable || started === uid) return;
  stopCloudPull();
  started = uid;

  const firestore = getFirebaseFirestore();

  const onListenerError = (context: string) => (err: unknown) => {
    // A listener that errors out (permission-denied during a token-refresh race,
    // a network error that exhausts Firestore's own retry budget, etc.) just dies
    // silently otherwise — no crash, but pull sync silently stops working until
    // the app restarts, with no record of why. Record it the same way pushEngine
    // already does for push failures.
    if (__DEV__) console.warn(`[cloudSync] ${context} listener error:`, err);
    setLastSyncError(err instanceof Error ? err.message : String(err)).catch(() => {});
  };

  for (const table of CLOUD_TABLE_ORDER) {
    const col = TABLE_TO_COLLECTION[table];
    if (!col) continue;
    const unsub = onSnapshot(
      collection(firestore, 'users', uid, col),
      async (snapshot: any) => {
        // Sequential, not fire-and-forget: two changes for the same brand-new
        // uuid arriving in the same tick (e.g. created then immediately updated)
        // must not both race applyCloudDoc's read-then-insert and collide on the
        // table's unique uuid index.
        for (const change of snapshot.docChanges()) {
          if (change.doc.metadata.hasPendingWrites) continue; // our own optimistic write echoing back — no-op via LWW anyway, skip early
          if (change.type === 'removed') continue; // deletes propagate via the tombstones listener below
          try {
            await applyCloudDoc(table, change.doc.id, change.doc.data());
          } catch (err) {
            if (__DEV__) console.warn(`[cloudSync] failed to apply pulled ${table} doc:`, err);
          }
        }
      },
      onListenerError(table)
    );
    unsubscribers.push(unsub);
  }

  const unsubTombstones = onSnapshot(
    collection(firestore, 'users', uid, 'tombstones'),
    async (snapshot: any) => {
      for (const change of snapshot.docChanges()) {
        if (change.doc.metadata.hasPendingWrites) continue;
        if (change.type === 'removed') continue;
        const data = change.doc.data() as { entity_type?: string; uuid?: string };
        if (!data.entity_type || !data.uuid) continue;
        try {
          await applyTombstone(data.entity_type, data.uuid);
        } catch (err) {
          if (__DEV__) console.warn('[cloudSync] failed to apply tombstone:', err);
        }
      }
    },
    onListenerError('tombstones')
  );
  unsubscribers.push(unsubTombstones);

  const unsubRoot = onSnapshot(
    doc(firestore, 'users', uid),
    (snap: any) => {
      if (snap.metadata.hasPendingWrites || !snap.exists()) return;
      applyRootDoc(snap.data()).catch((err: unknown) => {
        if (__DEV__) console.warn('[cloudSync] failed to apply pulled business profile:', err);
      });
    },
    onListenerError('business profile')
  );
  unsubscribers.push(unsubRoot);
}

export async function applyRootDoc(data: Record<string, unknown> | undefined): Promise<void> {
  const business = data?.business as Record<string, unknown> | undefined;
  if (!business) return;
  const db = await getDatabase();
  const local = await db.getFirstAsync<{ updated_at: string | null }>('SELECT updated_at FROM businesses WHERE id = 1');
  const incomingTs = business.updated_at as string | undefined;
  const localTs = local?.updated_at ?? undefined;
  if (!incomingTs || (localTs && incomingTs <= localTs)) return; // plain LWW — see PULL_TABLE_CONFIG's module doc
  await db.runAsync(
    `INSERT OR REPLACE INTO businesses (id, name, type, phone, address, logo_path, updated_at)
     VALUES (1, ?, ?, ?, ?, (SELECT logo_path FROM businesses WHERE id = 1), ?)`,
    [
      (business.name as string) ?? '',
      (business.type as string) ?? '',
      (business.phone as string) ?? '',
      (business.address as string) ?? '',
      incomingTs,
    ]
  );
}

export function stopCloudPull(): void {
  started = null;
  unsubscribers.forEach((unsub) => unsub());
  unsubscribers = [];
}
