export const PREFIX: string;
export const DEVICE_PREFIX: string;
export const LIMIT_TOKENS: Record<string, string>;
export const TOKEN_TO_LIMIT: Record<string, number>;

export function bytesToBase64(bytes: Uint8Array): string;
export function base64ToBytes(b64: string): Uint8Array;
export function asciiToBytes(str: string): Uint8Array;
export function coreFromDeviceId(deviceId: string): string;
export function buildMessage(deviceId: string, limitToken: string): string;
export function formatLicenseCode(deviceId: string, limitToken: string, signatureBytes: Uint8Array): string;

export interface ParsedLicenseCode {
  ok: boolean;
  limitToken?: string;
  deviceIdCore?: string;
  signatureBytes?: Uint8Array;
}
export function parseLicenseCode(rawCode: string): ParsedLicenseCode;

export type VerifyResult =
  | { status: 'invalid' }
  | { status: 'wrong_device' }
  | { status: 'valid'; limitToken: string };
export function verifyLicenseCode(rawCode: string, myDeviceId: string): VerifyResult;
