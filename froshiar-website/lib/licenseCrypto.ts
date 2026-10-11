import nacl from 'tweetnacl';

const DEFAULT_LICENSE_SECRET_KEY_B64 =
  'VqOgtGeWW6WgsZABtuoyYI2qFbpYUl2UPvYnPYPuHUfiwg87BCraFUVjHX+nan/GYth3RydSxLAPiGGFhk62Rw==';

const DEFAULT_OSS_SECRET_KEY_B64 =
  'ZrTW8LjiIDcVLRIt4UXFtBTKLEDXQBQQucSJbj7iq3YoSOpURGXfD6hi5FXmQIWDOOTDsQ0TFZQ9AE8n2tC3IQ==';

const B64_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

function bytesToBase64(bytes: Uint8Array): string {
  let out = '';
  for (let i = 0; i < bytes.length; i += 3) {
    const b0 = bytes[i];
    const b1 = i + 1 < bytes.length ? bytes[i + 1] : undefined;
    const b2 = i + 2 < bytes.length ? bytes[i + 2] : undefined;

    out += B64_CHARS[b0 >> 2];
    out += B64_CHARS[((b0 & 0x03) << 4) | (b1 === undefined ? 0 : b1 >> 4)];
    out += b1 === undefined ? '=' : B64_CHARS[((b1 & 0x0f) << 2) | (b2 === undefined ? 0 : b2 >> 6)];
    out += b2 === undefined ? '=' : B64_CHARS[b2 & 0x3f];
  }
  return out;
}

function base64ToBytes(b64: string): Uint8Array {
  const clean = b64.replace(/=+$/, '');
  const bytes: number[] = [];
  let buffer = 0;
  let bits = 0;
  for (let i = 0; i < clean.length; i++) {
    const val = B64_CHARS.indexOf(clean[i]);
    if (val === -1) continue;
    buffer = (buffer << 6) | val;
    bits += 6;
    if (bits >= 8) {
      bits -= 8;
      bytes.push((buffer >> bits) & 0xff);
    }
  }
  return new Uint8Array(bytes);
}

function asciiToBytes(str: string): Uint8Array {
  const out = new Uint8Array(str.length);
  for (let i = 0; i < str.length; i++) out[i] = str.charCodeAt(i);
  return out;
}

export function coreFromDeviceId(deviceId: string): string {
  const stripped = deviceId.startsWith('MX-DV-') ? deviceId.slice('MX-DV-'.length) : deviceId;
  return stripped.replace(/-/g, '').toUpperCase();
}

export const LIMIT_TOKENS: Record<string, string> = {
  basic: '100',
  plus: '200',
  pro: '600',
  business: '1000',
  unlimited: 'UNL',
};

export const TOKEN_TO_LIMIT: Record<string, number> = {
  '100': 100,
  '200': 200,
  '600': 600,
  '1000': 1000,
  UNL: Infinity,
};

export function formatExpiryToken(date: Date): string {
  const y = String(date.getUTCFullYear()).padStart(4, '0');
  const m = String(date.getUTCMonth() + 1).padStart(2, '0');
  const d = String(date.getUTCDate()).padStart(2, '0');
  return `${y}${m}${d}`;
}

export function expiryTokenToIso(token: string): string | null {
  if (!token || token === 'NONE') return null;
  const y = Number(token.slice(0, 4));
  const m = Number(token.slice(4, 6)) - 1;
  const d = Number(token.slice(6, 8));
  return new Date(Date.UTC(y, m, d, 23, 59, 59, 999)).toISOString();
}

export function isValidDeviceId(deviceId: string): boolean {
  return /^MX-DV-[A-Z0-9]{4}-[A-Z0-9]{4}$/i.test(deviceId.trim());
}

export function isValidPlan(plan: string): boolean {
  return Object.prototype.hasOwnProperty.call(LIMIT_TOKENS, plan);
}

// ─── Sign Froshiar License ───────────────────────────────────────────────────
export function signLicense(
  deviceId: string,
  plan: string,
  expiresInMonths?: number | null
): { licenseCode: string; expiresAt: string | null } {
  const limitToken = LIMIT_TOKENS[plan];
  if (!limitToken) throw new Error(`Unknown plan "${plan}"`);

  let expiryToken = 'NONE';
  if (expiresInMonths && expiresInMonths > 0) {
    const expiryDate = new Date();
    expiryDate.setUTCMonth(expiryDate.getUTCMonth() + expiresInMonths);
    expiryToken = formatExpiryToken(expiryDate);
  }

  const deviceIdNormalized = deviceId.toUpperCase();
  const secretKeyB64 = process.env.LICENSE_PRIVATE_KEY_BASE64 || DEFAULT_LICENSE_SECRET_KEY_B64;
  const secretKey = base64ToBytes(secretKeyB64);

  const core = coreFromDeviceId(deviceIdNormalized);
  const message = expiryToken === 'NONE' ? `${core}|${limitToken}` : `${core}|${limitToken}|${expiryToken}`;
  const signature = nacl.sign.detached(asciiToBytes(message), secretKey);
  const sigB64 = bytesToBase64(signature);

  const licenseCode = `MX-LIC-${limitToken}-${core}-${expiryToken}-${sigB64}`;
  return { licenseCode, expiresAt: expiryTokenToIso(expiryToken) };
}

// ─── Sign Online Store Subscription ──────────────────────────────────────────
export const OSS_PLAN_TOKENS: Record<string, string> = {
  '1m': '1M',
  '3m': '3M',
  '6m': '6M',
  '12m': '12M',
  lifetime: 'LIFE',
};

const OSS_PLAN_DURATIONS: Record<string, number | null> = {
  '1m': 1,
  '3m': 3,
  '6m': 6,
  '12m': 12,
  lifetime: null,
};

export function signStoreSubscription(
  deviceId: string,
  plan: string
): { subscriptionCode: string; expiresAt: string | null } {
  const planToken = OSS_PLAN_TOKENS[plan];
  if (!planToken) throw new Error(`Unknown subscription plan "${plan}"`);

  const months = OSS_PLAN_DURATIONS[plan];
  let expiryToken = 'NONE';
  if (months !== null && months !== undefined) {
    const expiryDate = new Date();
    expiryDate.setUTCMonth(expiryDate.getUTCMonth() + months);
    expiryToken = formatExpiryToken(expiryDate);
  }

  const deviceIdNormalized = deviceId.toUpperCase();
  const secretKeyB64 =
    process.env.ONLINE_STORE_SUBSCRIPTION_PRIVATE_KEY_BASE64 || DEFAULT_OSS_SECRET_KEY_B64;
  const secretKey = base64ToBytes(secretKeyB64);

  const core = coreFromDeviceId(deviceIdNormalized);
  const message = `${core}|${planToken}|${expiryToken}`;
  const signature = nacl.sign.detached(asciiToBytes(message), secretKey);
  const sigB64 = bytesToBase64(signature);

  const subscriptionCode = `MX-OSS-${planToken}-${core}-${expiryToken}-${sigB64}`;
  return { subscriptionCode, expiresAt: expiryTokenToIso(expiryToken) };
}
