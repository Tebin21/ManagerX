// Drains lib/sqlite.ts's cloud_sync_queue (populated by SQL triggers, not
// call-site instrumentation — see the migration comment in lib/sqlite.ts) to
// this account's Firestore subtree, on the same connectivity/foreground/interval
// trigger pattern as lib/onlineStore/syncEngine.ts.
import { AppState, type AppStateStatus } from 'react-native';
import { addConnectivityListener } from '@/lib/netInfo';
import { getDatabase, initializeDatabase } from '@/lib/sqlite';
import {
  isFirebaseAvailable,
  getFirebaseFirestore,
  collection,
  doc,
  writeBatch,
  serverTimestamp,
} from '@/lib/firebase';
import { TABLE_TO_COLLECTION, CLOUD_TABLE_ORDER, rowToCloudDoc } from './collections';
import { setLastSyncedAt, setLastSyncError, clearLastSyncError } from './storage';

interface QueueRow {
  id: number;
  entity_type: string;
  uuid: string;
  operation: 'upsert' | 'delete';
}

interface PushTarget {
  collection: string;
  docId: string;
  sourceTable: string;
  sourceUuid: string;
  operation: 'upsert' | 'delete';
  queueIds: number[];
}

// Resolves a queue row to what actually needs to be written to Firestore.
// sale_items/purchase_items are embedded in their parent doc, not their own
// collection — an upsert resolves to "re-push the parent" (which re-embeds the
// current child list fresh from SQL); a delete resolves to nothing, since either
// the parent was deleted too (its own tombstone already covers it) or the parent
// was edited (its own updated_at bump already queued a fresh upsert that embeds
// the now-current children) — see lib/cloudSync/collections.ts's module doc.
async function resolveTarget(
  db: Awaited<ReturnType<typeof getDatabase>>,
  row: QueueRow
): Promise<{ collection: string; docId: string; sourceTable: string; sourceUuid: string } | null> {
  if (row.entity_type === 'businesses') return null; // handled separately, see pushBusinessProfile
  if (row.entity_type === 'sale_items' || row.entity_type === 'purchase_items') {
    if (row.operation === 'delete') return null;
    const parentCol = row.entity_type === 'sale_items' ? 'sale_id' : 'purchase_id';
    const parentTable = row.entity_type === 'sale_items' ? 'sales' : 'purchases';
    const item = await db.getFirstAsync<{ parent: number }>(
      `SELECT ${parentCol} AS parent FROM ${row.entity_type} WHERE uuid = ?`,
      [row.uuid]
    );
    if (!item) return null; // already deleted again since this was queued
    const parent = await db.getFirstAsync<{ uuid: string | null }>(`SELECT uuid FROM ${parentTable} WHERE id = ?`, [item.parent]);
    if (!parent?.uuid) return null;
    const col = TABLE_TO_COLLECTION[parentTable];
    if (!col) return null;
    return { collection: col, docId: parent.uuid, sourceTable: parentTable, sourceUuid: parent.uuid };
  }
  const col = TABLE_TO_COLLECTION[row.entity_type];
  if (!col) return null;
  return { collection: col, docId: row.uuid, sourceTable: row.entity_type, sourceUuid: row.uuid };
}

async function pushBusinessProfile(db: Awaited<ReturnType<typeof getDatabase>>, uid: string): Promise<void> {
  const firestore = getFirebaseFirestore();
  const business = await db.getFirstAsync<Record<string, unknown>>('SELECT * FROM businesses WHERE id = 1');
  if (!business) return;
  const batch = writeBatch(firestore);
  batch.set(
    doc(firestore, 'users', uid),
    {
      business: {
        name: business.name,
        type: business.type,
        phone: business.phone,
        address: business.address,
        // updated_at can be genuinely absent from the row (a migration that adds
        // this column can silently no-op on a non-empty table — see lib/sqlite.ts)
        // — a bare property access on a missing key is `undefined`, which Firestore
        // rejects outright, so fall back to null rather than sending it raw.
        updated_at: business.updated_at ?? null,
      },
      meta: { hasData: true, schemaVersion: 1 },
      _syncedAt: serverTimestamp(),
    },
    { merge: true }
  );
  await batch.commit();
}

let isSyncing = false;

export async function pushPendingChanges(uid: string): Promise<void> {
  if (!isFirebaseAvailable || isSyncing) return;
  isSyncing = true;
  try {
    await initializeDatabase();
    const db = await getDatabase();
    const queueRows = await db.getAllAsync<QueueRow>('SELECT id, entity_type, uuid, operation FROM cloud_sync_queue ORDER BY id ASC');
    if (queueRows.length === 0) {
      await clearLastSyncError();
      return;
    }

    // businesses uses a fixed synthetic key (see lib/sqlite.ts) and its own root-doc
    // write path — pushed once per run if any businesses queue rows are pending.
    // Isolated in its own try/catch, mirroring the per-chunk isolation below: one
    // bad/failing business-profile write must not abort the whole drain and strand
    // every unrelated product/customer/sale queue row as "pending" forever.
    const businessRows = queueRows.filter((r) => r.entity_type === 'businesses');
    let anySuccess = false;
    const succeededQueueIds: number[] = [];
    if (businessRows.length > 0) {
      try {
        await pushBusinessProfile(db, uid);
        anySuccess = true;
        succeededQueueIds.push(...businessRows.map((r) => r.id));
      } catch (err) {
        if (__DEV__) console.warn('[cloudSync] business profile push failed, will retry next cycle:', err);
        await setLastSyncError(err instanceof Error ? err.message : String(err));
      }
    }

    // Dedup by target doc — a sale and its just-edited sale_items both resolve to
    // the same 'sales/{uuid}' target; only one write per doc per run is needed,
    // but every contributing queue row must still be cleared on success.
    const targets = new Map<string, PushTarget>();
    for (const row of queueRows) {
      if (row.entity_type === 'businesses') continue;
      const resolved = await resolveTarget(db, row);
      if (!resolved?.collection) continue;
      const key = `${resolved.collection}/${resolved.docId}`;
      const existing = targets.get(key);
      const operation: 'upsert' | 'delete' =
        row.entity_type === resolved.sourceTable && row.operation === 'delete' ? 'delete' : 'upsert';
      if (existing) {
        existing.queueIds.push(row.id);
        if (operation === 'delete') existing.operation = 'delete';
      } else {
        targets.set(key, { ...resolved, operation, queueIds: [row.id] });
      }
    }

    const firestore = getFirebaseFirestore();
    const targetList = Array.from(targets.values());
    const BATCH_SIZE = 400; // headroom under Firestore's 500-ops-per-batch limit

    for (let i = 0; i < targetList.length; i += BATCH_SIZE) {
      const chunk = targetList.slice(i, i + BATCH_SIZE);
      const batch = writeBatch(firestore);

      for (const target of chunk) {
        const ref = doc(firestore, 'users', uid, target.collection, target.docId);
        if (target.operation === 'delete') {
          batch.delete(ref);
          batch.set(doc(firestore, 'users', uid, 'tombstones', target.docId), {
            entity_type: target.sourceTable,
            uuid: target.docId,
            deleted_at: new Date().toISOString(),
          });
        } else {
          const row = await db.getFirstAsync<Record<string, unknown>>(
            `SELECT * FROM ${target.sourceTable} WHERE uuid = ?`,
            [target.sourceUuid]
          );
          if (!row) continue; // deleted again since this run started — next delete trigger already queued its own entry
          const docData = await rowToCloudDoc(db, target.sourceTable, row);
          batch.set(ref, { ...docData, _syncedAt: serverTimestamp() });
        }
      }

      try {
        await batch.commit();
        anySuccess = true;
        for (const target of chunk) succeededQueueIds.push(...target.queueIds);
      } catch (err) {
        // Leave this chunk's queue rows in place — the next trigger retries them.
        // Other chunks still proceed, bounding one bad/oversized doc's blast radius.
        if (__DEV__) console.warn('[cloudSync] push batch failed, will retry next cycle:', err);
        await setLastSyncError(err instanceof Error ? err.message : String(err));
      }
    }

    if (succeededQueueIds.length > 0) {
      const placeholders = succeededQueueIds.map(() => '?').join(', ');
      await db.runAsync(`DELETE FROM cloud_sync_queue WHERE id IN (${placeholders})`, succeededQueueIds);
    }
    if (anySuccess) {
      await setLastSyncedAt(new Date().toISOString());
      if (succeededQueueIds.length === queueRows.length) await clearLastSyncError();
    }
  } catch (err) {
    if (__DEV__) console.warn('[cloudSync] push failed, will retry on next trigger:', err);
    await setLastSyncError(err instanceof Error ? err.message : String(err));
  } finally {
    isSyncing = false;
  }
}

let debounceTimer: ReturnType<typeof setTimeout> | null = null;
const DEBOUNCE_MS = 2000;
let scheduledUid: string | null = null;

// No call-site hook fires this immediately after a mutation (the outbox is
// trigger-populated, not call-site-instrumented — see lib/sqlite.ts), so pushes
// rely on the connectivity/foreground/interval triggers below; scheduleSync()
// exists for callers that *do* have a natural hook (e.g. a manual "Sync Now"
// button) to avoid waiting for the next interval tick.
export function scheduleCloudPush(uid: string): void {
  scheduledUid = uid;
  if (debounceTimer) clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    debounceTimer = null;
    if (scheduledUid) pushPendingChanges(scheduledUid);
  }, DEBOUNCE_MS);
}

let started: string | null = null;
let unsubscribers: Array<() => void> = [];

export function startCloudPush(uid: string): void {
  if (started === uid) return;
  stopCloudPush();
  started = uid;

  const unsubNet = addConnectivityListener((isConnected) => {
    if (isConnected) pushPendingChanges(uid);
  });
  const appStateSub = AppState.addEventListener('change', (status: AppStateStatus) => {
    if (status === 'active') pushPendingChanges(uid);
  });
  const interval = setInterval(() => pushPendingChanges(uid), 60_000);

  unsubscribers = [unsubNet, () => appStateSub.remove(), () => clearInterval(interval)];

  pushPendingChanges(uid);
}

export function stopCloudPush(): void {
  started = null;
  scheduledUid = null;
  if (debounceTimer) { clearTimeout(debounceTimer); debounceTimer = null; }
  unsubscribers.forEach((unsub) => unsub());
  unsubscribers = [];
}
