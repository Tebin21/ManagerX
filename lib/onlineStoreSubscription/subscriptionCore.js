// Plain CommonJS — required by BOTH the Expo app (Metro handles CJS .js natively)
// and online-store/server (a separate Node/Express project, via a relative require()
// reaching across the repo — the exact same trick license-admin-panel/server/src/
// crypto.ts already uses for lib/license/licenseCore.js). Contains ONLY verification
// logic + the public key. The private key and signing function live exclusively in
// scripts/online-store-subscription-admin/ — never import this file expecting to find
// a way to sign a code from inside the app or the online-store server.
//
// Deliberately self-contained — does NOT require lib/license/licenseCore.js, even for
// the small shared-looking helpers (base64/ascii encoding, device-id-core extraction).
// This is a completely separate trust boundary from the ManagerX item-limit license:
// separate keypair, separate code format, separate verification. The only thing the
// two systems share is the app-wide device-id VALUE itself (lib/deviceId.ts), which is
// a general device-identity utility, not license architecture.

const nacl = require('tweetnacl');

// Paste the public key printed by scripts/online-store-subscription-admin/generate-keypair.js here.
const PUBLIC_KEY_BASE64 = 'lExcjGGUDBGOmTYdzVneppUGh83UjgH7Ihp0FlnJeGY=';

const PREFIX = 'MX-OSS-';
const DEVICE_PREFIX = 'MX-DV-';
const NO_EXPIRY = 'NONE';

// Plan name -> short token embedded in the signed message. Tamper-evident (it's part
// of what's signed) for record-keeping purposes, but verifySubscriptionCode() never
// branches behavior on it — only expiryToken decides valid vs expired. A Lifetime plan
// simply carries expiryToken = NONE, exactly like a permanent ManagerX license; LIFE
// is purely a display label, not a second "permanent" sentinel.
const PLAN_TOKENS = {
  '1m': '1M',
  '3m': '3M',
  '6m': '6M',
  '12m': '12M',
  lifetime: 'LIFE',
};
const LIFETIME_TOKEN = 'LIFE';

const TOKEN_TO_PLAN = {
  '1M': '1m',
  '3M': '3m',
  '6M': '6m',
  '12M': '12m',
  LIFE: 'lifetime',
};

// ---- hand-rolled base64 over Uint8Array (no Buffer/atob/btoa — neither exists as a
// global in Hermes/RN, and tweetnacl-util falls back to Buffer, which would throw) ----
const B64_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

function bytesToBase64(bytes) {
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

function base64ToBytes(b64) {
  const clean = b64.replace(/=+$/, '');
  const bytes = [];
  let buffer = 0;
  let bits = 0;
  for (let i = 0; i < clean.length; i++) {
    const val = B64_CHARS.indexOf(clean[i]);
    if (val === -1) continue; // ignore whitespace/newlines from paste
    buffer = (buffer << 6) | val;
    bits += 6;
    if (bits >= 8) {
      bits -= 8;
      bytes.push((buffer >> bits) & 0xff);
    }
  }
  return new Uint8Array(bytes);
}

// Message content is always plain ASCII (device-id core + '|' + plan token + '|' +
// expiry token), so a simple charCodeAt loop is sufficient — no need for real UTF-8.
function asciiToBytes(str) {
  const out = new Uint8Array(str.length);
  for (let i = 0; i < str.length; i++) out[i] = str.charCodeAt(i);
  return out;
}

function coreFromDeviceId(deviceId) {
  // 'MX-DV-84K2-91LM' -> '84K291LM'
  const stripped = deviceId.startsWith(DEVICE_PREFIX) ? deviceId.slice(DEVICE_PREFIX.length) : deviceId;
  return stripped.replace(/-/g, '').toUpperCase();
}

// Date <-> 'YYYYMMDD' token. UTC throughout so the result doesn't depend on the
// signer's or verifier's local timezone.
function formatExpiryToken(date) {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, '0');
  const d = String(date.getUTCDate()).padStart(2, '0');
  return `${y}${m}${d}`;
}

function isValidExpiryToken(token) {
  return token === NO_EXPIRY || /^\d{8}$/.test(token);
}

// 'YYYYMMDD' -> a Date at the END of that day (UTC), so the subscription stays valid
// through the entire expiry date, not just up to its start. Returns null for
// NO_EXPIRY (permanent/Lifetime).
function expiryTokenToDate(token) {
  if (!token || token === NO_EXPIRY) return null;
  const y = Number(token.slice(0, 4));
  const m = Number(token.slice(4, 6)) - 1;
  const d = Number(token.slice(6, 8));
  return new Date(Date.UTC(y, m, d, 23, 59, 59, 999));
}

function expiryTokenToIso(token) {
  const date = expiryTokenToDate(token);
  return date ? date.toISOString() : null;
}

function buildMessage(deviceId, planToken, expiryToken) {
  const core = coreFromDeviceId(deviceId);
  return `${core}|${planToken}|${expiryToken || NO_EXPIRY}`;
}

function formatSubscriptionCode(deviceId, planToken, expiryToken, signatureBytes) {
  const deviceIdCore = coreFromDeviceId(deviceId);
  const sigB64 = bytesToBase64(signatureBytes);
  return `${PREFIX}${planToken}-${deviceIdCore}-${expiryToken || NO_EXPIRY}-${sigB64}`;
}

// Shape-only parsing — no crypto here. Always the 4-segment shape; there's no legacy
// format to support since this is a brand-new system.
function parseSubscriptionCode(rawCode) {
  const code = (rawCode || '').trim().replace(/\s+/g, '');
  if (!code.startsWith(PREFIX)) return { ok: false };

  const parts = code.slice(PREFIX.length).split('-');
  if (parts.length !== 4) return { ok: false };
  const [planToken, deviceIdCore, expiryToken, sigB64] = parts;

  if (!TOKEN_TO_PLAN[planToken]) return { ok: false };
  if (!deviceIdCore || !sigB64) return { ok: false };
  if (!isValidExpiryToken(expiryToken)) return { ok: false };

  let signatureBytes;
  try {
    signatureBytes = base64ToBytes(sigB64);
  } catch {
    return { ok: false };
  }
  if (signatureBytes.length !== 64) return { ok: false };

  return { ok: true, planToken, deviceIdCore, expiryToken, signatureBytes };
}

// Pure function: does NOT touch storage. Returns one of:
//   { status: 'invalid' }
//   { status: 'wrong_device' }
//   { status: 'expired', planToken, expiryToken }
//   { status: 'valid', planToken, expiryToken }
function verifySubscriptionCode(rawCode, myDeviceId) {
  const parsed = parseSubscriptionCode(rawCode);
  if (!parsed.ok) return { status: 'invalid' };

  const myCore = coreFromDeviceId(myDeviceId);
  if (parsed.deviceIdCore !== myCore) return { status: 'wrong_device' };

  const message = buildMessage(myDeviceId, parsed.planToken, parsed.expiryToken);
  const publicKey = base64ToBytes(PUBLIC_KEY_BASE64);
  const valid = nacl.sign.detached.verify(asciiToBytes(message), parsed.signatureBytes, publicKey);
  if (!valid) return { status: 'invalid' };

  const expiryDate = expiryTokenToDate(parsed.expiryToken);
  if (expiryDate && Date.now() > expiryDate.getTime()) {
    return { status: 'expired', planToken: parsed.planToken, expiryToken: parsed.expiryToken };
  }

  return { status: 'valid', planToken: parsed.planToken, expiryToken: parsed.expiryToken };
}

module.exports = {
  PREFIX,
  DEVICE_PREFIX,
  NO_EXPIRY,
  PLAN_TOKENS,
  TOKEN_TO_PLAN,
  LIFETIME_TOKEN,
  bytesToBase64,
  base64ToBytes,
  asciiToBytes,
  coreFromDeviceId,
  formatExpiryToken,
  isValidExpiryToken,
  expiryTokenToDate,
  expiryTokenToIso,
  buildMessage,
  formatSubscriptionCode,
  parseSubscriptionCode,
  verifySubscriptionCode,
};
