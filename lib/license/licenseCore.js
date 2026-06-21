// Plain CommonJS — required by BOTH the Expo app (Metro handles CJS .js natively)
// and the plain-Node admin scripts under scripts/license-admin/, with zero build step
// on either side. This keeps the license algorithm in exactly one place so the admin
// generator and the app's verifier can never drift out of sync.
//
// Contains ONLY verification logic + the public key. The private key and the signing
// function live exclusively in scripts/license-admin/ — never import this file expecting
// to find a way to sign a license from inside the app.

const nacl = require('tweetnacl');

// Paste the public key printed by scripts/license-admin/generate-keypair.js here.
const PUBLIC_KEY_BASE64 = 'Djm5uBHKRjRmM90qNcRq+yW+En2NWDyMQCovXgTRY/E=';

const PREFIX = 'MX-LIC-';
const DEVICE_PREFIX = 'MX-DV-';
const NO_EXPIRY = 'NONE';

// Plan name -> short token embedded in the license code.
const LIMIT_TOKENS = {
  basic: '100',
  plus: '200',
  pro: '600',
  business: '1000',
  unlimited: 'UNL',
};

// Token -> numeric limit. Single source of truth for plan numbers — lib/itemLimit.ts
// derives ITEM_LIMIT_PLANS from this instead of hand-duplicating the numbers.
const TOKEN_TO_LIMIT = {
  '100': 100,
  '200': 200,
  '600': 600,
  '1000': 1000,
  UNL: Infinity,
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

// Message content is always plain ASCII (device-id core + '|' + limit token), so a
// simple charCodeAt loop is sufficient — no need for real UTF-8 decoding.
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

// 'YYYYMMDD' -> a Date at the END of that day (UTC), so the license stays valid
// through the entire expiry date, not just up to its start. Returns null for
// NO_EXPIRY (permanent).
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

// When expiryToken is NO_EXPIRY (or omitted), this builds the exact same 2-part
// message ManagerX has always signed — so a new permanent license and a license
// issued before expiry support existed are cryptographically identical, and the
// one license already issued keeps verifying with zero migration.
function buildMessage(deviceId, limitToken, expiryToken) {
  const core = coreFromDeviceId(deviceId);
  if (!expiryToken || expiryToken === NO_EXPIRY) {
    return `${core}|${limitToken}`;
  }
  return `${core}|${limitToken}|${expiryToken}`;
}

function formatLicenseCode(deviceId, limitToken, expiryToken, signatureBytes) {
  const deviceIdCore = coreFromDeviceId(deviceId);
  const sigB64 = bytesToBase64(signatureBytes);
  return `${PREFIX}${limitToken}-${deviceIdCore}-${expiryToken || NO_EXPIRY}-${sigB64}`;
}

// Shape-only parsing — no crypto here. Returns { ok:false } if the code doesn't even
// look like a license code. Accepts both the legacy 3-segment shape (no expiry —
// every license issued before this feature existed) and the current 4-segment
// shape. None of limitToken/deviceIdCore/expiryToken/the base64 signature ever
// contain a literal '-', so a plain split is unambiguous between the two shapes.
function parseLicenseCode(rawCode) {
  const code = (rawCode || '').trim().replace(/\s+/g, '');
  if (!code.startsWith(PREFIX)) return { ok: false };

  const parts = code.slice(PREFIX.length).split('-');
  let limitToken, deviceIdCore, expiryToken, sigB64;

  if (parts.length === 4) {
    [limitToken, deviceIdCore, expiryToken, sigB64] = parts;
  } else if (parts.length === 3) {
    [limitToken, deviceIdCore, sigB64] = parts;
    expiryToken = NO_EXPIRY;
  } else {
    return { ok: false };
  }

  if (!TOKEN_TO_LIMIT[limitToken]) return { ok: false };
  if (!deviceIdCore || !sigB64) return { ok: false };
  if (!isValidExpiryToken(expiryToken)) return { ok: false };

  let signatureBytes;
  try {
    signatureBytes = base64ToBytes(sigB64);
  } catch {
    return { ok: false };
  }
  if (signatureBytes.length !== 64) return { ok: false };

  return { ok: true, limitToken, deviceIdCore, expiryToken, signatureBytes };
}

// Pure function: does NOT touch storage. Returns one of:
//   { status: 'invalid' }
//   { status: 'wrong_device' }
//   { status: 'expired', limitToken, expiryToken }
//   { status: 'valid', limitToken, expiryToken }
function verifyLicenseCode(rawCode, myDeviceId) {
  const parsed = parseLicenseCode(rawCode);
  if (!parsed.ok) return { status: 'invalid' };

  const myCore = coreFromDeviceId(myDeviceId);
  if (parsed.deviceIdCore !== myCore) return { status: 'wrong_device' };

  const message = buildMessage(myDeviceId, parsed.limitToken, parsed.expiryToken);
  const publicKey = base64ToBytes(PUBLIC_KEY_BASE64);
  const valid = nacl.sign.detached.verify(asciiToBytes(message), parsed.signatureBytes, publicKey);
  if (!valid) return { status: 'invalid' };

  const expiryDate = expiryTokenToDate(parsed.expiryToken);
  if (expiryDate && Date.now() > expiryDate.getTime()) {
    return { status: 'expired', limitToken: parsed.limitToken, expiryToken: parsed.expiryToken };
  }

  return { status: 'valid', limitToken: parsed.limitToken, expiryToken: parsed.expiryToken };
}

module.exports = {
  PREFIX,
  DEVICE_PREFIX,
  NO_EXPIRY,
  LIMIT_TOKENS,
  TOKEN_TO_LIMIT,
  bytesToBase64,
  base64ToBytes,
  asciiToBytes,
  coreFromDeviceId,
  formatExpiryToken,
  expiryTokenToDate,
  expiryTokenToIso,
  buildMessage,
  formatLicenseCode,
  parseLicenseCode,
  verifyLicenseCode,
};
