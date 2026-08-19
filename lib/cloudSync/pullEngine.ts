// Real-time Firestore -> SQLite sync. Attaches one onSnapshot listener per
// cloud-synced collection under users/{uid}, plus one on users/{uid}/tombstones
// for deletes. Every incoming doc is applied through lib/backup.ts's
// mergeSimpleTable() — the exact same uuid-match + last-write-wins engine the
// local JSON backup/restore feature already uses — rather than a second,
// duplicate conflict-resolution implementation (see that file's
// matchByNaturalKeyIfNoUuid option, added specifically for this reuse).
import { getDatabase, initializeDatabase } from '@/lib/sqlite';
import { mergeSimpleTable, mergeCounter, type MergeTableOptions } from '@/lib/backup';
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
  // No updated_at column — write-once (INSERT OR REPLACE ... UNIQUE(product_id)),
  // so archived_at doubles as the LWW timestamp.
  inventory_history: { policy: 'mutable', timestampColumn: 'archived_at', matchByNaturalKeyIfNoUuid: false },
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
  await initializeDatabase();
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

export async function startCloudPull(uid: string): Promise<void> {
  if (!isFirebaseAvailable || started === uid) return;
  stopCloudPull();
  started = uid;

  await initializeDatabase();
  if (started !== uid) return; // stopCloudPull()/a uid switch raced this await

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
  if (!data) return;
  const db = await getDatabase();

  const business = data.business as Record<string, unknown> | undefined;
  if (business) {
    const local = await db.getFirstAsync<{ updated_at: string | null }>('SELECT updated_at FROM businesses WHERE id = 1');
    const incomingTs = business.updated_at as string | undefined;
    const localTs = local?.updated_at ?? undefined;
    // plain LWW — see PULL_TABLE_CONFIG's module doc
    if (incomingTs && !(localTs && incomingTs <= localTs)) {
      const name = (business.name as string) ?? '';
      const type = (business.type as string) ?? '';
      const phone = (business.phone as string) ?? '';
      const address = (business.address as string) ?? '';
      await db.runAsync(
        `INSERT OR REPLACE INTO businesses (id, name, type, phone, address, logo_path, updated_at)
         VALUES (1, ?, ?, ?, ?, (SELECT logo_path FROM businesses WHERE id = 1), ?)`,
        [name, type, phone, address, incomingTs]
      );

      // Hydrates the routing flag a restore/pull of the business profile never
      // used to touch (see store/businessStore.ts) — this is the fix for the
      // core "returning account still sees Create Business" bug. Guarded on a
      // non-empty name so a malformed/partial doc can never flip isSetupComplete
      // true. Reached by the real-time listener here, by restoreFromCloudBulk()
      // (which calls this same function), and therefore by every
      // app/(onboarding)/cloud-data-conflict.tsx resolution path too.
      if (name) {
        const { useBusinessStore } = await import('@/store/businessStore');
        useBusinessStore.getState().hydrateFromCloud({ name, type, phone, address });
      }
    }
  }

  // Counters are max-merged, not LWW-gated — safe to apply unconditionally on
  // every root-doc snapshot (see lib/backup.ts's mergeCounter doc comment).
  const counters = data.counters as Record<string, unknown> | undefined;
  if (counters) {
    await mergeCounter(db, 'invoice_counter', [{ last_number: counters.invoiceLastNumber }]);
    await mergeCounter(db, 'purchase_counter', [{ last_number: counters.purchaseLastNumber }]);
  }

  // Preferences (theme/exchange-rate/low-stock defaults/language/Online-Store
  // settings) live in AsyncStorage stores, not SQLite rows — so they get their
  // own whole-object LWW gated by a dedicated `cloud_prefs_updated_at` marker
  // (see lib/sqlite.ts's enqueueBusinessProfilePush), independent of the
  // business profile's own updated_at.
  const preferences = data.preferences as Record<string, unknown> | undefined;
  if (preferences) {
    const { loadSetting, saveSetting } = await import('@/lib/sqlite');
    const incomingTs = preferences.updated_at as string | undefined;
    const localTs = (await loadSetting('cloud_prefs_updated_at')) ?? undefined;
    if (incomingTs && !(localTs && incomingTs <= localTs)) {
      const { useSettingsStore } = await import('@/store/settingsStore');
      const { useLanguageStore } = await import('@/store/languageStore');
      const currentSettings = useSettingsStore.getState();
      useSettingsStore.setState({
        isDarkMode: (preferences.isDarkMode as boolean | undefined) ?? currentSettings.isDarkMode,
        exchangeRate: (preferences.exchangeRate as number | undefined) ?? currentSettings.exchangeRate,
        rateUpdatedAt: (preferences.rateUpdatedAt as string | null | undefined) ?? currentSettings.rateUpdatedAt,
        accentColor: (preferences.accentColor as string | null | undefined) ?? currentSettings.accentColor,
        globalLowStockEnabled: (preferences.globalLowStockEnabled as boolean | undefined) ?? currentSettings.globalLowStockEnabled,
        globalLowStockThreshold: (preferences.globalLowStockThreshold as number | undefined) ?? currentSettings.globalLowStockThreshold,
      });
      if (preferences.language) {
        const currentLanguage = useLanguageStore.getState();
        useLanguageStore.setState({
          language: preferences.language as 'en' | 'ku',
          isRTL: (preferences.isRTL as boolean | undefined) ?? currentLanguage.isRTL,
        });
      }
      const onlineStore = preferences.onlineStore as Record<string, unknown> | undefined;
      if (onlineStore) {
        const { setStoreEnabled, setStoreSlug } = await import('@/lib/onlineStore/storage');
        const { saveStoreInfoFields } = await import('@/lib/onlineStore/storeInfo');
        // silent:true — applying an incoming cloud value must not itself
        // enqueue a fresh push of that same value back to Firestore (see
        // setStoreEnabled's doc comment for the pull-triggers-push-triggers-
        // pull loop this avoids).
        await setStoreEnabled((onlineStore.enabled as boolean) ?? false, true);
        if (onlineStore.slug) await setStoreSlug(onlineStore.slug as string, true);
        await saveStoreInfoFields({
          description: (onlineStore.description as string) ?? '',
          facebookUrl: (onlineStore.facebookUrl as string) ?? '',
          instagramUrl: (onlineStore.instagramUrl as string) ?? '',
          tiktokUrl: (onlineStore.tiktokUrl as string) ?? '',
          whatsappNumber: (onlineStore.whatsappNumber as string) ?? '',
        }, true);
      }
      await saveSetting('cloud_prefs_updated_at', incomingTs);
    }
  }
}

export function stopCloudPull(): void {
  started = null;
  unsubscribers.forEach((unsub) => unsub());
  unsubscribers = [];
}
