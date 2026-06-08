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

if (!supabaseUrl || !supabaseAnonKey) {
  console.error(
    '[ManagerX] Supabase credentials are missing.\n' +
      'Local dev: add real values to your .env file.\n' +
      'EAS builds: run eas secret:create for EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY.',
  );
}

export const supabaseConfigured = !!(supabaseUrl && supabaseAnonKey);

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
