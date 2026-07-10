import AsyncStorage from '@react-native-async-storage/async-storage';
import type { StateStorage } from 'zustand/middleware';

const OLD_PREFIX = '@managerx_';
const NEW_PREFIX = '@froshiar_';

// One-time, read-time migration for the ManagerX -> Froshiar rebrand: every
// @froshiar_* key transparently falls back to its pre-rebrand @managerx_* key
// the first time it's read (and copies the value across), so existing installs
// never lose data. Doing this inside the storage read itself — rather than a
// separate "migrate once at startup" step — avoids racing zustand's own async
// hydration read, which only checks AsyncStorage once at store-creation time.
export async function getItemWithLegacyFallback(key: string): Promise<string | null> {
  const current = await AsyncStorage.getItem(key);
  if (current !== null) return current;
  if (!key.startsWith(NEW_PREFIX)) return null;
  const legacyKey = OLD_PREFIX + key.slice(NEW_PREFIX.length);
  const legacy = await AsyncStorage.getItem(legacyKey);
  if (legacy !== null) {
    await AsyncStorage.setItem(key, legacy);
  }
  return legacy;
}

// Drop-in replacement for AsyncStorage as a zustand `persist` storage — same
// read-time fallback as getItemWithLegacyFallback above, for every store whose
// persisted key changed from @managerx_* to @froshiar_* in the rebrand.
export const migratedAsyncStorage: StateStorage = {
  getItem: getItemWithLegacyFallback,
  setItem: (key: string, value: string) => AsyncStorage.setItem(key, value),
  removeItem: (key: string) => AsyncStorage.removeItem(key),
};
