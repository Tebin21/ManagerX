import Constants from 'expo-constants';
import { createClient } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';

// process.env works in local dev / Expo Go; Constants.expoConfig.extra works in EAS builds
// (values are embedded at build time via app.config.js)
const supabaseUrl =
  process.env.EXPO_PUBLIC_SUPABASE_URL ||
  (Constants.expoConfig?.extra?.supabaseUrl as string | undefined);

const supabaseAnonKey =
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ||
  (Constants.expoConfig?.extra?.supabaseAnonKey as string | undefined);

// Rejects empty values AND obvious placeholders (truncated keys with '...', too-short strings).
// Real Supabase URLs are >= 20 chars; real anon keys are JWTs >= 100 chars.
function looksLike(value: string | undefined, minLen: number): value is string {
  return typeof value === 'string' && value.length >= minLen && !value.includes('...');
}

export const supabaseConfigured = looksLike(supabaseUrl, 20) && looksLike(supabaseAnonKey, 100);

if (!supabaseConfigured) {
  console.warn(
    '[ManagerX] Supabase credentials are missing or invalid.\n' +
      'Local dev: set real values in your .env file (URL >= 20 chars, key >= 100 chars).\n' +
      'EAS builds: run eas secret:create for EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY.',
  );
}

const ExpoSecureStoreAdapter = {
  getItem: (key: string) => SecureStore.getItemAsync(key),
  setItem: (key: string, value: string) => SecureStore.setItemAsync(key, value),
  removeItem: (key: string) => SecureStore.deleteItemAsync(key),
};

export const supabase = createClient(supabaseUrl ?? '', supabaseAnonKey ?? '', {
  auth: {
    storage: ExpoSecureStoreAdapter,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
