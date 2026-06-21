export const PREFIX: string;
export const DEVICE_PREFIX: string;
export const NO_EXPIRY: string;
export const PLAN_TOKENS: Record<string, string>;
export const TOKEN_TO_PLAN: Record<string, string>;
export const LIFETIME_TOKEN: string;

export function bytesToBase64(bytes: Uint8Array): string;
export function base64ToBytes(b64: string): Uint8Array;
export function asciiToBytes(str: string): Uint8Array;
export function coreFromDeviceId(deviceId: string): string;
export function formatExpiryToken(date: Date): string;
export function isValidExpiryToken(token: string): boolean;
export function expiryTokenToDate(token: string): Date | null;
export function expiryTokenToIso(token: string): string | null;
export function buildMessage(deviceId: string, planToken: string, expiryToken?: string): string;
export function formatSubscriptionCode(
  deviceId: string,
  planToken: string,
  expiryToken: string,
  signatureBytes: Uint8Array
): string;

export interface ParsedSubscriptionCode {
  ok: boolean;
  planToken?: string;
  deviceIdCore?: string;
  expiryToken?: string;
  signatureBytes?: Uint8Array;
}
export function parseSubscriptionCode(rawCode: string): ParsedSubscriptionCode;

export type VerifyResult =
  | { status: 'invalid' }
  | { status: 'wrong_device' }
  | { status: 'expired'; planToken: string; expiryToken: string }
  | { status: 'valid'; planToken: string; expiryToken: string };
export function verifySubscriptionCode(rawCode: string, myDeviceId: string): VerifyResult;
