// First-login / new-device decisions: does this account already have cloud data,
// does this device already have local data, and the two one-time bulk operations
// that follow ("seed the cloud from this device" / "restore this device from the
// cloud") — see store/authStore.ts's adoptSignedInUser for the decision tree that
// calls these.
import { enqueueFullCloudResync } from '@/lib/sqlite';
import {
  isFirebaseAvailable,
  getFirebaseFirestore,
  collection,
  doc,
  getDoc,
  getDocs,
  writeBatch,
  deleteDoc,
} from '@/lib/firebase';
import { CLOUD_TABLE_ORDER, TABLE_TO_COLLECTION } from './collections';
import { applyCloudDoc, applyRootDoc } from './pullEngine';
import { pushPendingChanges } from './pushEngine';
import { setInitialSyncDoneFor } from './storage';

export async function cloudBusinessDataExists(uid: string): Promise<boolean> {
  if (!isFirebaseAvailable) return false;
  const firestore = getFirebaseFirestore();
  const snap = await getDoc(doc(firestore, 'users', uid));
  if (!snap.exists) return false;
  const data = snap.data() as { meta?: { hasData?: boolean } } | undefined;
  return !!data?.meta?.hasData;
}

// Seeds a brand-new (or previously cloud-empty) account from this device's
// existing local data — the "first signup with pre-existing local data" case.
// Never deletes anything; enqueues every current row for push and drains it.
export async function pushFullLocalSnapshot(uid: string): Promise<void> {
  await enqueueFullCloudResync();
  await pushPendingChanges(uid);
  await setInitialSyncDoneFor(uid);
}

// One-time bulk download for a device with no local data whose account already
// has cloud data — pulls every collection in dependency order (parents before
// children, see CLOUD_TABLE_ORDER) and applies each doc through the same
// mergeSimpleTable-based logic the ongoing real-time listeners use.
export async function restoreFromCloudBulk(uid: string): Promise<void> {
  if (!isFirebaseAvailable) return;
  const firestore = getFirebaseFirestore();

  const rootSnap = await getDoc(doc(firestore, 'users', uid));
  if (rootSnap.exists) {
    await applyRootDoc(rootSnap.data() as Record<string, unknown> | undefined);
  }

  for (const table of CLOUD_TABLE_ORDER) {
    const col = TABLE_TO_COLLECTION[table];
    if (!col) continue;
    const snap = await getDocs(collection(firestore, 'users', uid, col));
    for (const docSnap of snap.docs) {
      await applyCloudDoc(table, docSnap.id, docSnap.data());
    }
  }

  await setInitialSyncDoneFor(uid);
}

// Deletes this account's entire Firestore users/{uid} subtree — every entity
// collection, the tombstones collection, and the root doc itself. Used by
// "Delete Account" (lib/accountDeletion.ts) and "Reset App" (factory reset,
// app/(app)/settings/data.tsx): both wipe SQLite via wipeAllBusinessData(),
// which already discards the resulting flood of per-row cloud_sync_queue/
// cloud_tombstones entries rather than pushing them (see that function's own
// comment) — this is the one explicit cloud-side counterpart instead. The
// client SDK has no server-side recursiveDelete (that's an Admin-SDK/CLI-only
// capability), so this lists and batch-deletes every doc by hand.
export async function deleteAllCloudData(uid: string): Promise<void> {
  if (!isFirebaseAvailable) return;
  const firestore = getFirebaseFirestore();

  const collectionNames = [...Object.values(TABLE_TO_COLLECTION).filter((c): c is string => !!c), 'tombstones'];
  for (const col of collectionNames) {
    const snap = await getDocs(collection(firestore, 'users', uid, col));
    for (let i = 0; i < snap.docs.length; i += 400) {
      const batch = writeBatch(firestore);
      for (const docSnap of snap.docs.slice(i, i + 400)) batch.delete(docSnap.ref);
      await batch.commit();
    }
  }

  await deleteDoc(doc(firestore, 'users', uid));
}
