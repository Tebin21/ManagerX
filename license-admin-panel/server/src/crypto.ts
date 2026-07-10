import fs from 'fs';
import path from 'path';
import nacl from 'tweetnacl';

// Reuses the EXACT same module the mobile app ships with and the existing CLI
// already uses — single source of truth for the license format/algorithm.
// eslint-disable-next-line @typescript-eslint/no-var-requires
const licenseCore = require('../../../lib/license/licenseCore') as {
  LIMIT_TOKENS: Record<string, string>;
  TOKEN_TO_LIMIT: Record<string, number>;
  NO_EXPIRY: string;
  base64ToBytes: (b64: string) => Uint8Array;
  asciiToBytes: (str: string) => Uint8Array;
  formatExpiryToken: (date: Date) => string;
  expiryTokenToIso: (token: string) => string | null;
  buildMessage: (deviceId: string, limitToken: string, expiryToken?: string) => string;
  formatLicenseCode: (deviceId: string, limitToken: string, expiryToken: string, signature: Uint8Array) => string;
};

const KEYS_PATH = path.join(__dirname, '../../../scripts/license-admin/keys/private-key.json');

let cachedSecretKey: Uint8Array | null = null;

function loadSecretKey(): Uint8Array {
  if (cachedSecretKey) return cachedSecretKey;

  // Always read the local, gitignored key file — this is a local-only app, the
  // key never needs to come from anywhere else (no cloud secrets/env vars).
  if (!fs.existsSync(KEYS_PATH)) {
    throw new Error(
      `No private key found. Run "node scripts/license-admin/generate-keypair.js" ` +
        `from the Froshiar root first (expected key at ${KEYS_PATH}).`
    );
  }
  const { secretKeyBase64 } = JSON.parse(fs.readFileSync(KEYS_PATH, 'utf8'));
  cachedSecretKey = licenseCore.base64ToBytes(secretKeyBase64);
  return cachedSecretKey;
}

export const LIMIT_TOKENS = licenseCore.LIMIT_TOKENS;
export const PLAN_NAMES = Object.keys(licenseCore.LIMIT_TOKENS);

export function isValidPlan(plan: string): boolean {
  return Object.prototype.hasOwnProperty.call(licenseCore.LIMIT_TOKENS, plan);
}

export function isValidDeviceId(deviceId: string): boolean {
  return /^MX-DV-[A-Z0-9]{4}-[A-Z0-9]{4}$/i.test(deviceId);
}

export interface SignedLicense {
  licenseCode: string;
  expiresAt: string | null;
}

// expiresInMonths: how many months from now the license should remain valid;
// null/0/undefined = permanent (today's default behavior, unchanged).
export function signLicense(deviceId: string, plan: string, expiresInMonths?: number | null): SignedLicense {
  const limitToken = licenseCore.LIMIT_TOKENS[plan];
  if (!limitToken) throw new Error(`Unknown plan "${plan}"`);

  let expiryToken = licenseCore.NO_EXPIRY;
  if (expiresInMonths && expiresInMonths > 0) {
    const expiryDate = new Date();
    expiryDate.setUTCMonth(expiryDate.getUTCMonth() + expiresInMonths);
    expiryToken = licenseCore.formatExpiryToken(expiryDate);
  }

  const deviceIdNormalized = deviceId.toUpperCase();
  const secretKey = loadSecretKey();
  const message = licenseCore.buildMessage(deviceIdNormalized, limitToken, expiryToken);
  const signature = nacl.sign.detached(licenseCore.asciiToBytes(message), secretKey);
  const licenseCode = licenseCore.formatLicenseCode(deviceIdNormalized, limitToken, expiryToken, signature);

  return { licenseCode, expiresAt: licenseCore.expiryTokenToIso(expiryToken) };
}
