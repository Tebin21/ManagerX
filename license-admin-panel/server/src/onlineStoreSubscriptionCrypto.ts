import fs from 'fs';
import path from 'path';
import nacl from 'tweetnacl';

// Reuses the EXACT same module the mobile app and online-store/server ship with —
// single source of truth for the Online Store Subscription format/algorithm.
// Completely separate from license-admin-panel's own crypto.ts (different keypair,
// different ledger, different code prefix) — these are two independent products.
// eslint-disable-next-line @typescript-eslint/no-var-requires
const subscriptionCore = require('../../../lib/onlineStoreSubscription/subscriptionCore') as {
  PLAN_TOKENS: Record<string, string>;
  NO_EXPIRY: string;
  base64ToBytes: (b64: string) => Uint8Array;
  asciiToBytes: (str: string) => Uint8Array;
  formatExpiryToken: (date: Date) => string;
  expiryTokenToIso: (token: string) => string | null;
  buildMessage: (deviceId: string, planToken: string, expiryToken?: string) => string;
  formatSubscriptionCode: (deviceId: string, planToken: string, expiryToken: string, signature: Uint8Array) => string;
};

const KEYS_PATH = path.join(__dirname, '../../../scripts/online-store-subscription-admin/keys/private-key.json');

const PLAN_MONTHS: Record<string, number> = { '1m': 1, '3m': 3, '6m': 6, '12m': 12 };

let cachedSecretKey: Uint8Array | null = null;

function loadSecretKey(): Uint8Array {
  if (cachedSecretKey) return cachedSecretKey;

  if (!fs.existsSync(KEYS_PATH)) {
    throw new Error(
      `No private key found. Run "node scripts/online-store-subscription-admin/generate-keypair.js" ` +
        `from the ManagerX root first (expected key at ${KEYS_PATH}).`
    );
  }
  const { secretKeyBase64 } = JSON.parse(fs.readFileSync(KEYS_PATH, 'utf8'));
  cachedSecretKey = subscriptionCore.base64ToBytes(secretKeyBase64);
  return cachedSecretKey;
}

export const PLAN_TOKENS = subscriptionCore.PLAN_TOKENS;
export const PLAN_NAMES = Object.keys(subscriptionCore.PLAN_TOKENS);

export function isValidPlan(plan: string): boolean {
  return Object.prototype.hasOwnProperty.call(subscriptionCore.PLAN_TOKENS, plan);
}

export function isValidDeviceId(deviceId: string): boolean {
  return /^MX-DV-[A-Z0-9]{4}-[A-Z0-9]{4}$/i.test(deviceId);
}

export interface SignedSubscription {
  subscriptionCode: string;
  expiresAt: string | null;
}

// Plans are fixed-duration by definition (1/3/6/12 months, or Lifetime) — unlike the
// item-limit license's optional override, there's no separate "expiresInMonths"
// parameter here; the plan alone determines the expiry.
export function signSubscription(deviceId: string, plan: string): SignedSubscription {
  const planToken = subscriptionCore.PLAN_TOKENS[plan];
  if (!planToken) throw new Error(`Unknown plan "${plan}"`);

  let expiryToken = subscriptionCore.NO_EXPIRY;
  const months = PLAN_MONTHS[plan];
  if (months) {
    const expiryDate = new Date();
    expiryDate.setUTCMonth(expiryDate.getUTCMonth() + months);
    expiryToken = subscriptionCore.formatExpiryToken(expiryDate);
  }

  const deviceIdNormalized = deviceId.toUpperCase();
  const secretKey = loadSecretKey();
  const message = subscriptionCore.buildMessage(deviceIdNormalized, planToken, expiryToken);
  const signature = nacl.sign.detached(subscriptionCore.asciiToBytes(message), secretKey);
  const subscriptionCode = subscriptionCore.formatSubscriptionCode(deviceIdNormalized, planToken, expiryToken, signature);

  return { subscriptionCode, expiresAt: subscriptionCore.expiryTokenToIso(expiryToken) };
}
