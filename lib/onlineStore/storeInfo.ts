// Local persistence for the Online Store's "store info" fields (description,
// WhatsApp, opening hours, social links, logo upload state). Mirrors storage.ts's
// plain-KV-over-the-SQLite-settings-table pattern — deliberately NOT bolted onto
// store/businessStore.ts, which is a cross-cutting concern consumed by unrelated
// screens (invoices, profile, onboarding) that have nothing to do with the
// storefront. businessStore already owns name/phone/address/logoUri; this module
// only owns the fields that are genuinely new for the Online Store feature.
import { saveSetting, loadSetting } from '@/lib/sqlite';

export interface StoreInfoFields {
  description: string;
  facebookUrl: string;
  instagramUrl: string;
  tiktokUrl: string;
  whatsappNumber: string;
}

const FIELD_KEYS: Record<keyof StoreInfoFields, string> = {
  description: 'online_store_description',
  facebookUrl: 'online_store_facebook',
  instagramUrl: 'online_store_instagram',
  tiktokUrl: 'online_store_tiktok',
  whatsappNumber: 'online_store_whatsapp',
};

export async function loadStoreInfoFields(): Promise<StoreInfoFields> {
  const entries = await Promise.all(
    (Object.keys(FIELD_KEYS) as (keyof StoreInfoFields)[]).map(
      async (key) => [key, (await loadSetting(FIELD_KEYS[key])) ?? ''] as const
    )
  );
  return Object.fromEntries(entries) as unknown as StoreInfoFields;
}

export async function saveStoreInfoFields(fields: Partial<StoreInfoFields>): Promise<void> {
  await Promise.all(
    (Object.keys(fields) as (keyof StoreInfoFields)[]).map((key) =>
      saveSetting(FIELD_KEYS[key], fields[key] ?? '')
    )
  );
  await markStoreInfoDirty();
}

// There's no offline outbox for info fields (unlike products' sync_queue) — instead,
// a saved-but-not-yet-pushed edit is marked "dirty" and syncEngine.ts opportunistically
// retries the push on its existing triggers (debounce/periodic/manual) until it
// succeeds, without the cost of polling the backend every cycle when nothing changed.
const DIRTY_KEY = 'online_store_info_dirty';

export async function isStoreInfoDirty(): Promise<boolean> {
  return (await loadSetting(DIRTY_KEY)) === '1';
}

export async function markStoreInfoDirty(): Promise<void> {
  await saveSetting(DIRTY_KEY, '1');
}

export async function clearStoreInfoDirty(): Promise<void> {
  await saveSetting(DIRTY_KEY, '0');
}

// Business logo upload state. The logo itself lives in store/businessStore.ts
// (logoUri, a local file:// URI) — businessStore is a cross-cutting concern with
// unrelated consumers (invoices, onboarding), so rather than coupling it to this
// Online-Store-specific upload, we separately remember WHICH local URI was last
// uploaded. If businessStore.logoUri no longer matches that, the logo changed and
// needs re-uploading — same "needs re-upload" signal as products.image_remote_url,
// just without a SQLite column to hold it.
const LOGO_REMOTE_URL_KEY = 'online_store_logo_remote_url';
const LOGO_UPLOADED_FROM_KEY = 'online_store_logo_uploaded_from';

export async function getLogoUploadState(): Promise<{ remoteUrl: string | null; uploadedFromUri: string | null }> {
  const [remoteUrl, uploadedFromUri] = await Promise.all([
    loadSetting(LOGO_REMOTE_URL_KEY),
    loadSetting(LOGO_UPLOADED_FROM_KEY),
  ]);
  return { remoteUrl: remoteUrl || null, uploadedFromUri: uploadedFromUri || null };
}

export async function setLogoUploadState(remoteUrl: string, uploadedFromUri: string): Promise<void> {
  await Promise.all([
    saveSetting(LOGO_REMOTE_URL_KEY, remoteUrl),
    saveSetting(LOGO_UPLOADED_FROM_KEY, uploadedFromUri),
  ]);
}
