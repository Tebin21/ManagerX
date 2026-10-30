import { getInventoryStats, loadSetting, saveSetting } from '@/lib/sqlite';
import { getOrCreateDeviceId } from '@/lib/deviceId';
import { TOKEN_TO_LIMIT, verifyLicenseCode, expiryTokenToIso } from '@/lib/license/licenseCore';

export const DEFAULT_ITEM_LIMIT_PLAN = 'basic';

// Derived from licenseCore's TOKEN_TO_LIMIT so the numbers are never hand-duplicated
// between the admin generator and the app. Add a future tier by adding an entry to
// LIMIT_TOKENS/TOKEN_TO_LIMIT in lib/license/licenseCore.js and here — nothing else
// in the activation/enforcement logic needs to change.
export const ITEM_LIMIT_PLANS: Record<string, number> = {
  basic: 30,
  plus: TOKEN_TO_LIMIT['200'],
  pro: TOKEN_TO_LIMIT['600'],
  business: TOKEN_TO_LIMIT['1000'],
  unlimited: TOKEN_TO_LIMIT.UNL, // Infinity
};

const KEY_LICENSE_CODE = 'license_code';
const KEY_ACTIVATED_AT = 'license_activated_at';

export interface LicenseInfo {
  plan: string;
  limit: number;
  activatedAt: string | null;
  deviceId: string;
  licenseCode: string | null;
  /** ISO date the *currently active* plan expires, or null if permanent / no license. */
  expiresAt: string | null;
  /** True when a stored license was valid but its expiry date has since passed —
   *  lets the UI say "your plan expired" instead of silently reverting with no explanation. */
  expired: boolean;
}

export type ActivationResult =
  | { status: 'activated'; plan: string; limit: number; expiresAt: string | null }
  | { status: 'invalid' }
  | { status: 'wrong_device' }
  | { status: 'expired'; expiresAt: string | null }
  | { status: 'already_activated'; plan: string; limit: number }
  | { status: 'no_upgrade'; plan: string; limit: number };

function limitToPlanLabel(limit: number, isIapPro: boolean = false): string {
  if (isIapPro) {
    if (limit === 200) return 'pro_monthly';
    if (limit === 400) return 'pro_6months';
    if (limit === 1000) return 'pro_yearly';
    return 'pro';
  }
  const found = Object.entries(ITEM_LIMIT_PLANS).find(([, v]) => v === limit);
  return found ? found[0] : DEFAULT_ITEM_LIMIT_PLAN;
}

function defaultLicenseInfo(deviceId: string, overrides: Partial<LicenseInfo> = {}): LicenseInfo {
  return {
    plan: DEFAULT_ITEM_LIMIT_PLAN,
    limit: ITEM_LIMIT_PLANS[DEFAULT_ITEM_LIMIT_PLAN],
    activatedAt: null,
    deviceId,
    licenseCode: null,
    expiresAt: null,
    expired: false,
    ...overrides,
  };
}

// Re-verifies the stored license against the CURRENT device ID — never trusts a
// cached "plan" field. There isn't one: the only thing persisted is the raw
// signed license code, so editing local storage to claim a higher plan has
// nothing to edit — any tampering with the stored code or device_id breaks
// signature verification and silently falls back to the default plan. A short
// in-memory TTL cache (mirroring lib/onlineStoreSubscription/subscription.ts's
// loadSubscriptionFromDb) collapses repeated calls — e.g. one per inserted
// product row in a multi-item purchase — into a single DB+crypto round-trip
// without weakening that guarantee for more than a few seconds at a time.
let cachedInfo: LicenseInfo | null = null;
let cachedAt = 0;
const CACHE_TTL_MS = 30_000;

export function invalidateLicenseCache(): void {
  cachedInfo = null;
  cachedAt = 0;
}

export async function loadLicenseFromDb(): Promise<LicenseInfo> {
  if (cachedInfo && Date.now() - cachedAt < CACHE_TTL_MS) {
    return cachedInfo;
  }

  const deviceId = await getOrCreateDeviceId();

  // Check Apple In-App Purchase Pro entitlement
  try {
    const { useIapStore } = await import('@/store/iapStore');
    const proEntitlement = useIapStore.getState().proEntitlement;
    if (proEntitlement.isActive && proEntitlement.itemLimit > 0) {
      const iapInfo: LicenseInfo = {
        plan: limitToPlanLabel(proEntitlement.itemLimit, true),
        limit: proEntitlement.itemLimit,
        activatedAt: proEntitlement.lastVerifiedAt ? new Date(proEntitlement.lastVerifiedAt).toISOString() : null,
        deviceId,
        licenseCode: 'APPLE_IAP_PRO',
        expiresAt: proEntitlement.expirationDate ?? null,
        expired: false,
      };
      cachedInfo = iapInfo;
      cachedAt = Date.now();
      return iapInfo;
    }
  } catch {}

  // Check live Management Account config (Employee or Registered/Demo User)
  try {
    const { useManagementStore } = await import('@/store/managementStore');
    const { currentUserAccount, currentEmployeeAccount, isEmployee } = useManagementStore.getState();
    const liveAccount = isEmployee && currentEmployeeAccount ? currentEmployeeAccount : currentUserAccount;
    if (liveAccount && liveAccount.status === 'active') {
      const isNotExpired = !liveAccount.expiresAt || new Date(liveAccount.expiresAt).getTime() > Date.now();
      if (isNotExpired) {
        const isUnlimited =
          liveAccount.limits?.maxQuantity === 'unlimited' ||
          (liveAccount.limits?.maxItems === 'unlimited' && !liveAccount.limits?.maxQuantity);
        const qtyLimit =
          typeof liveAccount.limits?.maxQuantity === 'number'
            ? liveAccount.limits.maxQuantity
            : isUnlimited
            ? TOKEN_TO_LIMIT.UNL
            : 30;

        if (isUnlimited || qtyLimit > 30) {
          const liveInfo: LicenseInfo = {
            plan: isUnlimited ? 'unlimited' : 'custom',
            limit: isUnlimited ? TOKEN_TO_LIMIT.UNL : qtyLimit,
            activatedAt: liveAccount.startedAt || liveAccount.createdAt || new Date().toISOString(),
            deviceId,
            licenseCode: `MANAGEMENT-${(liveAccount.role || 'LIVE').toUpperCase()}`,
            expiresAt: liveAccount.expiresAt || null,
            expired: false,
          };
          cachedInfo = liveInfo;
          cachedAt = Date.now();
          return liveInfo;
        }
      }
    }
  } catch {}

  // Check Cloud user subscription in Firebase Firestore (approved by admin)
  try {
    const { useAuthStore } = await import('@/store/authStore');
    const email = useAuthStore.getState().user?.email?.toLowerCase().trim();
    if (email) {
      const { getFirebaseFirestore, doc, getDoc } = await import('@/lib/firebase');
      const db = getFirebaseFirestore();
      const subDocId = email.replace(/[^a-z0-9_]/gi, '_');

      let snap = await getDoc(doc(db, 'user_subscriptions', subDocId));
      if (!snap || !(typeof snap.exists === 'function' ? snap.exists() : (snap as any).exists)) {
        snap = await getDoc(doc(db, 'employee_accounts', subDocId));
      }

      if (snap && (typeof snap.exists === 'function' ? snap.exists() : (snap as any).exists)) {
        const data = snap.data();
        if (data && data.status === 'active') {
          const isLifetime = data.planId === 'lifetime' || !data.expiresAt;
          const isNotExpired = isLifetime || new Date(data.expiresAt).getTime() > Date.now();
          if (isNotExpired) {
            const isUnlimited =
              data.limits?.maxQuantity === 'unlimited' ||
              (data.limits?.maxItems === 'unlimited' && !data.limits?.maxQuantity) ||
              !data.limits;
            const qtyLimit =
              typeof data.limits?.maxQuantity === 'number'
                ? data.limits.maxQuantity
                : isUnlimited
                ? TOKEN_TO_LIMIT.UNL
                : 30;

            const subInfo: LicenseInfo = {
              plan: isUnlimited ? 'unlimited' : 'custom',
              limit: isUnlimited ? TOKEN_TO_LIMIT.UNL : qtyLimit,
              activatedAt: data.startDate || data.createdAt || new Date().toISOString(),
              deviceId,
              licenseCode: `CLOUD-SUB-${(data.planId || data.role || 'ACTIVE').toUpperCase()}`,
              expiresAt: data.expiresAt || null,
              expired: false,
            };
            cachedInfo = subInfo;
            cachedAt = Date.now();
            return subInfo;
          }
        }
      }
    }
  } catch {}

  const licenseCode = await loadSetting(KEY_LICENSE_CODE);

  let info: LicenseInfo;
  if (!licenseCode) {
    info = defaultLicenseInfo(deviceId);
  } else {
    const activatedAt = await loadSetting(KEY_ACTIVATED_AT);
    const result = verifyLicenseCode(licenseCode, deviceId);

    if (result.status === 'expired') {
      // Cryptographically valid and bound to this device, but the embedded expiry
      // date has passed — fall back to the default plan, but flag *why*.
      info = defaultLicenseInfo(deviceId, { licenseCode, expired: true });
    } else if (result.status !== 'valid') {
      info = defaultLicenseInfo(deviceId);
    } else {
      const limit = TOKEN_TO_LIMIT[result.limitToken] ?? ITEM_LIMIT_PLANS[DEFAULT_ITEM_LIMIT_PLAN];
      info = {
        plan: limitToPlanLabel(limit),
        limit,
        activatedAt,
        deviceId,
        licenseCode,
        expiresAt: expiryTokenToIso(result.expiryToken),
        expired: false,
      };
    }
  }

  cachedInfo = info;
  cachedAt = Date.now();
  return info;
}

export async function activateLicense(rawCode: string): Promise<ActivationResult> {
  const code = rawCode.trim();
  const deviceId = await getOrCreateDeviceId();

  const result = verifyLicenseCode(code, deviceId);
  if (result.status === 'wrong_device') return { status: 'wrong_device' };
  if (result.status === 'invalid') return { status: 'invalid' };
  if (result.status === 'expired') {
    return { status: 'expired', expiresAt: expiryTokenToIso(result.expiryToken) };
  }

  const current = await loadLicenseFromDb();

  // Check "already active" BEFORE the numeric no-upgrade comparison — otherwise
  // re-submitting the currently-active code would be reported as a downgrade attempt
  // instead of the more accurate "already activated".
  if (current.licenseCode === code) {
    return { status: 'already_activated', plan: current.plan, limit: current.limit };
  }

  const newLimit = TOKEN_TO_LIMIT[result.limitToken];
  const newExpiresAt = expiryTokenToIso(result.expiryToken);
  if (newLimit < current.limit) {
    return { status: 'no_upgrade', plan: current.plan, limit: current.limit };
  }
  if (newLimit === current.limit) {
    // Same tier: only accept if it extends the current expiry (a renewal), matching
    // lib/onlineStoreSubscription/subscription.ts's activation logic for the sibling
    // subscription system. current.expiresAt is only null here when no license is
    // currently active (default plan) — current.limit can't equal a real newLimit in
    // that case unless the code being activated matches the default tier, which is a
    // legitimate first activation, not a renewal, so it falls through to accept.
    if (current.expiresAt !== null && newExpiresAt !== null && newExpiresAt <= current.expiresAt) {
      return { status: 'no_upgrade', plan: current.plan, limit: current.limit };
    }
  }

  await saveSetting(KEY_LICENSE_CODE, code);
  await saveSetting(KEY_ACTIVATED_AT, new Date().toISOString());
  invalidateLicenseCache();
  return {
    status: 'activated',
    plan: limitToPlanLabel(newLimit),
    limit: newLimit,
    expiresAt: newExpiresAt,
  };
}

// The limit is on total stock QUANTITY (units), not on how many distinct product
// rows exist — one product with quantity 100 uses the same 100 "items" of the plan
// as 100 separate products with quantity 1 each. totalQuantity (not totalProducts)
// is the correct metric here.
export async function assertItemLimitNotExceeded(additionalQuantity: number): Promise<void> {
  const { checkQuantityLimit } = await import('@/lib/usageLimits');
  const check = await checkQuantityLimit(additionalQuantity);
  if (!check.allowed) {
    try {
      const { showUsageLimitModal } = await import('@/store/usageLimitModalStore');
      showUsageLimitModal();
    } catch {}
    throw new Error(`ITEM_LIMIT_REACHED|${check.current},${check.limit}`);
  }
}
