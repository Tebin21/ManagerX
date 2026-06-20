import { getInventoryStats, loadSetting, saveSetting } from '@/lib/sqlite';
import { getOrCreateDeviceId } from '@/lib/deviceId';
import { TOKEN_TO_LIMIT, verifyLicenseCode } from '@/lib/license/licenseCore';

export const DEFAULT_ITEM_LIMIT_PLAN = 'basic';

// Derived from licenseCore's TOKEN_TO_LIMIT so the numbers are never hand-duplicated
// between the admin generator and the app. Add a future tier by adding an entry to
// LIMIT_TOKENS/TOKEN_TO_LIMIT in lib/license/licenseCore.js and here — nothing else
// in the activation/enforcement logic needs to change.
export const ITEM_LIMIT_PLANS: Record<string, number> = {
  basic: TOKEN_TO_LIMIT['100'],
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
}

export type ActivationResult =
  | { status: 'activated'; plan: string; limit: number }
  | { status: 'invalid' }
  | { status: 'wrong_device' }
  | { status: 'already_activated'; plan: string; limit: number }
  | { status: 'no_upgrade'; plan: string; limit: number };

function limitToPlanLabel(limit: number): string {
  const found = Object.entries(ITEM_LIMIT_PLANS).find(([, v]) => v === limit);
  return found ? found[0] : DEFAULT_ITEM_LIMIT_PLAN;
}

function defaultLicenseInfo(deviceId: string): LicenseInfo {
  return {
    plan: DEFAULT_ITEM_LIMIT_PLAN,
    limit: ITEM_LIMIT_PLANS[DEFAULT_ITEM_LIMIT_PLAN],
    activatedAt: null,
    deviceId,
    licenseCode: null,
  };
}

// Re-verifies the stored license against the CURRENT device ID on every single call —
// never trusts a cached "plan" field. There isn't one: the only thing persisted is the
// raw signed license code, so editing local storage to claim a higher plan has nothing
// to edit — any tampering with the stored code or device_id breaks signature
// verification and silently falls back to the default plan.
export async function loadLicenseFromDb(): Promise<LicenseInfo> {
  const deviceId = await getOrCreateDeviceId();
  const licenseCode = await loadSetting(KEY_LICENSE_CODE);
  if (!licenseCode) return defaultLicenseInfo(deviceId);

  const activatedAt = await loadSetting(KEY_ACTIVATED_AT);
  const result = verifyLicenseCode(licenseCode, deviceId);
  if (result.status !== 'valid') return defaultLicenseInfo(deviceId);

  const limit = TOKEN_TO_LIMIT[result.limitToken] ?? ITEM_LIMIT_PLANS[DEFAULT_ITEM_LIMIT_PLAN];
  return {
    plan: limitToPlanLabel(limit),
    limit,
    activatedAt,
    deviceId,
    licenseCode,
  };
}

export async function activateLicense(rawCode: string): Promise<ActivationResult> {
  const code = rawCode.trim();
  const deviceId = await getOrCreateDeviceId();

  const result = verifyLicenseCode(code, deviceId);
  if (result.status === 'wrong_device') return { status: 'wrong_device' };
  if (result.status === 'invalid') return { status: 'invalid' };

  const current = await loadLicenseFromDb();

  // Check "already active" BEFORE the numeric no-upgrade comparison — otherwise
  // re-submitting the currently-active code would be reported as a downgrade attempt
  // instead of the more accurate "already activated".
  if (current.licenseCode === code) {
    return { status: 'already_activated', plan: current.plan, limit: current.limit };
  }

  const newLimit = TOKEN_TO_LIMIT[result.limitToken];
  if (newLimit <= current.limit) {
    return { status: 'no_upgrade', plan: current.plan, limit: current.limit };
  }

  await saveSetting(KEY_LICENSE_CODE, code);
  await saveSetting(KEY_ACTIVATED_AT, new Date().toISOString());
  return { status: 'activated', plan: limitToPlanLabel(newLimit), limit: newLimit };
}

export async function assertItemLimitNotExceeded(additionalCount: number): Promise<void> {
  const { limit } = await loadLicenseFromDb();
  const stats = await getInventoryStats();
  if (stats.totalProducts + additionalCount > limit) {
    throw new Error(`ITEM_LIMIT_REACHED|${stats.totalProducts},${limit}`);
  }
}
