// Single entry point authStore.ts and app/(app)/_layout.tsx use to start/stop
// the whole cloud sync layer for a signed-in account — combines the push outbox
// drain (lib/cloudSync/pushEngine.ts) and the real-time pull listeners
// (lib/cloudSync/pullEngine.ts). Callers must only invoke startCloudSync() after
// the first-login/restore decision (lib/cloudSync/restore.ts) has fully resolved —
// attaching pull listeners any earlier could race an in-flight bulk restore over
// the same rows (see store/authStore.ts's adoptSignedInUser).
import { startCloudPush, stopCloudPush } from './pushEngine';
import { startCloudPull, stopCloudPull } from './pullEngine';

export function startCloudSync(uid: string): void {
  startCloudPush(uid);
  startCloudPull(uid);
}

export function stopCloudSync(): void {
  stopCloudPush();
  stopCloudPull();
}

export { pushPendingChanges, scheduleCloudPush } from './pushEngine';
export { cloudBusinessDataExists, pushFullLocalSnapshot, restoreFromCloudBulk, deleteAllCloudData } from './restore';
export { getLastSyncedAt, getLastSyncError } from './storage';
