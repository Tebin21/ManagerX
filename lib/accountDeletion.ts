// Orchestrates the full "Delete Account" flow (Settings screen). Stands alone
// rather than living inside store/authStore.ts because it needs to reach across
// authStore, SQLite, local file cleanup, and the Online Store client/storage —
// the same cross-cutting role lib/backup.ts plays for import/export.
//
// Firebase Auth deletion and the device-local wipes (SQLite/AsyncStorage/
// SecureStore) are fatal: any failure stops the flow immediately and returns an
// error, leaving everything before that step untouched. Firestore cloud-data
// deletion, Online Store backend deletion, and local cached-file cleanup are
// best-effort: their failure is logged and swallowed, never blocking or failing
// the rest of the flow.
export interface DeleteAccountResult {
  error: string | null;
  // True when a store was registered/cloud sync was active but its backend
  // deletion did not complete — the caller must not claim cloud data was
  // removed when it wasn't. Covers both the Online Store backend and Firestore.
  cloudDataPending?: boolean;
}

// Once Firebase Auth deletion succeeds it can never be repeated (the account
// is gone), but the local cleanup that must still follow can be interrupted by
// the OS killing the app. This flag marks "Firebase account already deleted,
// local cleanup still owed" so a later launch can finish the job without ever
// calling deleteFirebaseAccount() again. See resumeInterruptedDeletionIfNeeded().
const DELETION_PENDING_KEY = '@froshiar_deletion_pending';

export async function deleteAccount(): Promise<DeleteAccountResult> {
  const { useAuthStore } = await import('@/store/authStore');
  const uid = useAuthStore.getState().user?.id;

  // 1: Firestore cloud data — MUST happen before Firebase Auth deletion below,
  // not after: Firestore's security rules authorize every request on
  // request.auth.uid, which stops resolving the instant the Auth account is
  // gone, so a delete attempted afterward would be rejected as unauthenticated
  // and silently leave the user's business data orphaned in the cloud forever.
  // Best-effort — a failure here must not block Auth/local deletion, which is
  // why this dedicated try/catch runs before the fatal steps rather than
  // folding into performLocalCleanup()'s later best-effort section.
  let cloudDataPending = false;
  if (uid) {
    try {
      const { deleteAllCloudData } = await import('@/lib/cloudSync');
      await deleteAllCloudData(uid);
    } catch (e) {
      console.error('[Froshiar] Firestore cloud data deletion failed (non-fatal):', e);
      cloudDataPending = true;
    }
  }

  // 2-3: Firebase Auth account.
  const { error: firebaseError } = await useAuthStore.getState().deleteFirebaseAccount();
  if (firebaseError) return { error: firebaseError };

  const AsyncStorage = (await import('@react-native-async-storage/async-storage')).default;
  await AsyncStorage.setItem(DELETION_PENDING_KEY, '1').catch(() => {});

  const result = await performLocalCleanup();
  return { ...result, cloudDataPending: cloudDataPending || result.cloudDataPending };
}

// Everything after Firebase Auth deletion: Online Store backend, SQLite, local
// files, AsyncStorage, SecureStore, and the final sign-out. Shared by the normal
// delete flow and by resumeInterruptedDeletionIfNeeded() so an app-kill recovery
// never re-runs (or needs) the Firebase step.
async function performLocalCleanup(): Promise<DeleteAccountResult> {
  const { useAuthStore } = await import('@/store/authStore');
  const AsyncStorage = (await import('@react-native-async-storage/async-storage')).default;

  // 3: Online Store backend — best-effort, only attempted if a store is registered.
  let cloudDataPending = false;
  try {
    const { getStoreSlug, getStoreApiKey } = await import('@/lib/onlineStore/storage');
    const [slug, apiKey] = await Promise.all([getStoreSlug(), getStoreApiKey()]);
    if (slug && apiKey) {
      const { deleteStore } = await import('@/lib/onlineStore/api');
      await deleteStore(slug, apiKey);
    }
  } catch (e) {
    console.error('[Froshiar] Online Store deletion failed (non-fatal):', e);
    cloudDataPending = true;
  }

  // 4: Local SQLite database.
  try {
    const { wipeAllBusinessData } = await import('@/lib/sqlite');
    await wipeAllBusinessData();
  } catch (e) {
    console.error('[Froshiar] SQLite wipe failed:', e);
    return { error: 'Failed to delete your local data. Please try again.' };
  }

  // 5-6: Cached images + exported files — best-effort.
  try {
    const { deleteLocalAppFiles } = await import('@/lib/accountLocalCleanup');
    await deleteLocalAppFiles();
  } catch (e) {
    console.error('[Froshiar] Local file cleanup failed (non-fatal):', e);
  }

  // 7: AsyncStorage — same key list as executeReset (app/(app)/settings/data.tsx)
  // plus @froshiar_auth, which that flow deliberately omits but this must not.
  try {
    await AsyncStorage.multiRemove([
      '@froshiar_business', '@froshiar_settings', '@froshiar_modules',
      '@froshiar_language', '@froshiar_onboarding', '@froshiar_auth',
      '@managerx_business', '@managerx_settings', '@managerx_modules',
      '@managerx_language', '@managerx_onboarding',
    ]);
  } catch (e) {
    console.error('[Froshiar] AsyncStorage clear failed:', e);
    return { error: 'Failed to clear app data. Please try again.' };
  }

  // 8: SecureStore — only real usage is the Online Store API key.
  try {
    const { clearStoreApiKey } = await import('@/lib/onlineStore/storage');
    await clearStoreApiKey();
  } catch (e) {
    console.error('[Froshiar] SecureStore clear failed:', e);
    return { error: 'Failed to clear secure data. Please try again.' };
  }

  // 9-10: Clear remaining local session state and sign out.
  const { useBusinessStore } = await import('@/store/businessStore');
  useBusinessStore.getState().clearBusiness();
  await useAuthStore.getState().signOut();

  await AsyncStorage.removeItem(DELETION_PENDING_KEY).catch(() => {});

  return { error: null, cloudDataPending };
}

// Called once at app launch (app/_layout.tsx). If a previous deletion was
// interrupted — the OS killed the app after Firebase Auth deletion succeeded
// but before local cleanup finished — silently finishes the local cleanup.
// Never re-attempts Firebase Auth deletion.
export async function resumeInterruptedDeletionIfNeeded(): Promise<void> {
  const AsyncStorage = (await import('@react-native-async-storage/async-storage')).default;
  const pending = await AsyncStorage.getItem(DELETION_PENDING_KEY).catch(() => null);
  if (!pending) return;

  try {
    await performLocalCleanup();
  } catch (e) {
    console.error('[Froshiar] Interrupted-deletion recovery failed:', e);
    // Don't retry forever on every cold start if cleanup keeps throwing.
    await AsyncStorage.removeItem(DELETION_PENDING_KEY).catch(() => {});
  }
}
