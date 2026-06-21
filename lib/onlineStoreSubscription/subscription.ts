import { loadSetting, saveSetting } from '@/lib/sqlite';
import { getOrCreateDeviceId } from '@/lib/deviceId';
import { getStoreEnabled } from '@/lib/onlineStore/storage';
import {
  TOKEN_TO_PLAN,
  LIFETIME_TOKEN,
  expiryTokenToIso,
  verifySubscriptionCode,
} from '@/lib/onlineStoreSubscription/subscriptionCore';

const KEY_SUBSCRIPTION_CODE = 'online_store_subscription_code';
const KEY_ACTIVATED_AT = 'online_store_subscription_activated_at';
const KEY_MIGRATION_CHECKED = 'online_store_subscription_migration_checked';
const KEY_LEGACY_ACTIVE_AT_MIGRATION = 'online_store_legacy_active_at_migration';

export type SubscriptionPlan = '1m' | '3m' | '6m' | '12m' | 'lifetime';

export interface SubscriptionInfo {
  plan: SubscriptionPlan | null;
  deviceId: string;
  subscriptionCode: string | null;
  activatedAt: string | null;
  /** ISO date the *currently active* subscription expires, or null if Lifetime / no
   *  active subscription at all — see `isActive` to tell those two apart. */
  expiresAt: string | null;
  isActive: boolean;
  /** True when a stored code was valid but its expiry has since passed. */
  expired: boolean;
}

export type SubscriptionActivationResult =
  | { status: 'activated'; plan: SubscriptionPlan; expiresAt: string | null }
  | { status: 'invalid' }
  | { status: 'wrong_device' }
  | { status: 'expired'; expiresAt: string | null }
  | { status: 'already_activated'; plan: SubscriptionPlan; expiresAt: string | null }
  | { status: 'not_an_extension'; plan: SubscriptionPlan; expiresAt: string | null };

function defaultSubscriptionInfo(deviceId: string, overrides: Partial<SubscriptionInfo> = {}): SubscriptionInfo {
  return {
    plan: null,
    deviceId,
    subscriptionCode: null,
    activatedAt: null,
    expiresAt: null,
    isActive: false,
    expired: false,
    ...overrides,
  };
}

// Re-verifies the stored code against the CURRENT device ID on every call — never
// trusts a cached "isActive" flag, mirroring lib/itemLimit.ts's loadLicenseFromDb().
export async function loadSubscriptionFromDb(): Promise<SubscriptionInfo> {
  const deviceId = await getOrCreateDeviceId();
  const subscriptionCode = await loadSetting(KEY_SUBSCRIPTION_CODE);
  if (!subscriptionCode) return defaultSubscriptionInfo(deviceId);

  const activatedAt = await loadSetting(KEY_ACTIVATED_AT);
  const result = verifySubscriptionCode(subscriptionCode, deviceId);

  if (result.status === 'expired') {
    return defaultSubscriptionInfo(deviceId, {
      subscriptionCode,
      activatedAt,
      plan: (TOKEN_TO_PLAN[result.planToken] as SubscriptionPlan) ?? null,
      expiresAt: expiryTokenToIso(result.expiryToken),
      expired: true,
    });
  }
  if (result.status !== 'valid') return defaultSubscriptionInfo(deviceId);

  return {
    plan: (TOKEN_TO_PLAN[result.planToken] as SubscriptionPlan) ?? null,
    deviceId,
    subscriptionCode,
    activatedAt,
    expiresAt: expiryTokenToIso(result.expiryToken),
    isActive: true,
    expired: false,
  };
}

export async function activateSubscription(rawCode: string): Promise<SubscriptionActivationResult> {
  const code = rawCode.trim();
  const deviceId = await getOrCreateDeviceId();

  const result = verifySubscriptionCode(code, deviceId);
  if (result.status === 'wrong_device') return { status: 'wrong_device' };
  if (result.status === 'invalid') return { status: 'invalid' };
  if (result.status === 'expired') {
    return { status: 'expired', expiresAt: expiryTokenToIso(result.expiryToken) };
  }

  const current = await loadSubscriptionFromDb();

  // Check "already active" BEFORE the extension comparison — otherwise re-submitting
  // the currently-active code would be reported as "not an extension" instead of the
  // more accurate "already activated".
  if (current.subscriptionCode === code) {
    return { status: 'already_activated', plan: current.plan!, expiresAt: current.expiresAt };
  }

  const newPlan = TOKEN_TO_PLAN[result.planToken] as SubscriptionPlan;
  const newIsLifetime = result.planToken === LIFETIME_TOKEN;
  const newExpiresAt = expiryTokenToIso(result.expiryToken);

  if (current.isActive) {
    // current.expiresAt is only null here because the active subscription is Lifetime
    // (an inactive/never-subscribed state never reaches this branch at all).
    const currentIsLifetime = current.expiresAt === null;
    if (currentIsLifetime && !newIsLifetime) {
      // A finite-duration code can never "extend" a Lifetime subscription.
      return { status: 'not_an_extension', plan: current.plan!, expiresAt: current.expiresAt };
    }
    if (!currentIsLifetime && !newIsLifetime && newExpiresAt !== null && newExpiresAt <= current.expiresAt!) {
      return { status: 'not_an_extension', plan: current.plan!, expiresAt: current.expiresAt };
    }
    // Otherwise: no current active subscription, OR the new code is itself Lifetime
    // (beats any finite date), OR the new finite expiry is strictly later — accept.
  }

  await saveSetting(KEY_SUBSCRIPTION_CODE, code);
  await saveSetting(KEY_ACTIVATED_AT, new Date().toISOString());
  return { status: 'activated', plan: newPlan, expiresAt: newExpiresAt };
}

export async function hasActiveOnlineStoreSubscription(): Promise<boolean> {
  return (await loadSubscriptionFromDb()).isActive;
}

// For lib/onlineStore/api.ts to attach as request headers — null (not empty strings)
// when nothing is stored, so the caller can omit the headers entirely.
export async function getOnlineStoreSubscriptionHeaders(): Promise<{ code: string; deviceId: string } | null> {
  const deviceId = await getOrCreateDeviceId();
  const code = await loadSetting(KEY_SUBSCRIPTION_CODE);
  if (!code) return null;
  return { code, deviceId };
}

// One-time, point-in-time marker — NOT a re-derivable "is the store enabled today"
// check. Must run exactly once per install, the very first time this feature ships,
// so a brand-new user who enables the store for the first time *after* this exists
// never gets the marker (and so never sees the "this was already active" banner) —
// only a device that already had `online_store_enabled` set before the check ever ran
// gets it. See store/onlineStoreSubscriptionStore.ts's `isLegacyActiveStore`.
export async function runLegacyMigrationCheckOnce(): Promise<void> {
  const alreadyChecked = await loadSetting(KEY_MIGRATION_CHECKED);
  if (alreadyChecked === '1') return;
  const wasEnabled = await getStoreEnabled();
  if (wasEnabled) {
    await saveSetting(KEY_LEGACY_ACTIVE_AT_MIGRATION, '1');
  }
  await saveSetting(KEY_MIGRATION_CHECKED, '1');
}

export async function wasLegacyActiveStore(): Promise<boolean> {
  return (await loadSetting(KEY_LEGACY_ACTIVE_AT_MIGRATION)) === '1';
}
