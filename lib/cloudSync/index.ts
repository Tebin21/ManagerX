// Single entry point authStore.ts and app/(app)/_layout.tsx use to start/stop
// the whole cloud sync layer for a signed-in account — combines the push outbox
// drain (lib/cloudSync/pushEngine.ts) and the real-time pull listeners
// (lib/cloudSync/pullEngine.ts). Callers must only invoke startCloudSync() after
// the first-login/restore decision (lib/cloudSync/restore.ts) has fully resolved —
// attaching pull listeners any earlier could race an in-flight bulk restore over
// the same rows (see store/authStore.ts's adoptSignedInUser).
import { InteractionManager } from 'react-native';
import { startCloudPush, stopCloudPush } from './pushEngine';
import { startCloudPull, stopCloudPull } from './pullEngine';

// Deferred via InteractionManager rather than fired synchronously: on cold start
// with an already-persisted Firebase session, this can be reached from
// onAuthStateChanged within the very first tick of app boot, issuing ~12 native
// Firestore onSnapshot TurboModule calls at once while the JS thread's own
// startup burst (font loading, first paint, navigation mount) is still in
// flight. Pushing this past that initial interaction window avoids piling that
// native call volume onto the coldest, most contended moment of launch.
let pendingHandle: { cancel: () => void } | null = null;
let pendingUid: string | null = null;

// Root-cause-isolation kill switch (see .claude/plans cold-start SIGSEGV report):
// flip to true to restore the previous behavior of auto-starting cloud sync from
// onAuthStateChanged on every cold start with a persisted session. While false,
// only explicit callers (opts.auto left at its default false — sign-in/sign-up,
// the cloud-data-conflict merge flow, and the Settings > Cloud Sync screen) can
// start the sync engine.
const AUTO_START_ENABLED = false;

export function startCloudSync(uid: string, opts: { auto?: boolean } = {}): void {
  if (opts.auto && !AUTO_START_ENABLED) {
    if (__DEV__) console.log('[cloudSync] auto-start skipped (isolation flag off)');
    return;
  }
  if (pendingUid === uid) return; // already scheduled for this uid
  cancelPendingCloudSync();
  pendingUid = uid;
  pendingHandle = InteractionManager.runAfterInteractions(() => {
    pendingHandle = null;
    if (pendingUid !== uid) return; // cancelled (e.g. signed out) before this ran
    pendingUid = null;
    try {
      startCloudPush(uid);
      startCloudPull(uid).catch((err) => {
        if (__DEV__) console.warn('[cloudSync] startCloudPull failed:', err);
      });
    } catch (err) {
      if (__DEV__) console.warn('[cloudSync] deferred startCloudSync failed:', err);
    }
  });
}

function cancelPendingCloudSync(): void {
  pendingHandle?.cancel();
  pendingHandle = null;
  pendingUid = null;
}

export function stopCloudSync(): void {
  cancelPendingCloudSync();
  stopCloudPush();
  stopCloudPull();
}

export { pushPendingChanges, scheduleCloudPush } from './pushEngine';
export { cloudBusinessDataExists, pushFullLocalSnapshot, restoreFromCloudBulk, deleteAllCloudData } from './restore';
export { getLastSyncedAt, getLastSyncError } from './storage';
