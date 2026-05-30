import * as SecureStore from 'expo-secure-store';

const PIN_KEY   = 'managerx_pin';
const SALT_KEY  = 'managerx_pin_salt';

// Simple numeric PIN stored in the OS keychain (SecureStore encrypts at rest).
// We store it hashed with a salt for an extra layer of protection.

function hashPin(pin: string, salt: string): string {
  // Simple deterministic hash — not cryptographically perfect but
  // SecureStore already encrypts the value using device credentials.
  let h = 0;
  const input = salt + pin + salt;
  for (let i = 0; i < input.length; i++) {
    h = (Math.imul(31, h) + input.charCodeAt(i)) | 0;
  }
  return String(h >>> 0); // unsigned 32-bit integer as string
}

function makeSalt(): string {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export async function savePin(pin: string): Promise<void> {
  const salt = makeSalt();
  const hash = hashPin(pin, salt);
  await SecureStore.setItemAsync(SALT_KEY, salt);
  await SecureStore.setItemAsync(PIN_KEY,  hash);
}

export async function verifyPin(pin: string): Promise<boolean> {
  const [storedHash, salt] = await Promise.all([
    SecureStore.getItemAsync(PIN_KEY),
    SecureStore.getItemAsync(SALT_KEY),
  ]);
  if (!storedHash || !salt) return false;
  return hashPin(pin, salt) === storedHash;
}

export async function clearPin(): Promise<void> {
  await SecureStore.deleteItemAsync(PIN_KEY).catch(() => {});
  await SecureStore.deleteItemAsync(SALT_KEY).catch(() => {});
}

export async function hasPin(): Promise<boolean> {
  const stored = await SecureStore.getItemAsync(PIN_KEY);
  return stored !== null;
}
