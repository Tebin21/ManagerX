import { JsonLicenseRepository } from './jsonLicenseRepository';
import { SupabaseLicenseRepository } from './supabaseLicenseRepository';
import { isSupabaseConfigured } from './supabaseClient';
import type { LicenseRepository } from './licenseRepository';

let instance: LicenseRepository | null = null;

// SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY set -> production Supabase storage.
// Otherwise -> the local JSON ledger, so local dev keeps working with zero
// Supabase setup, exactly as it always has.
export function getLicenseRepository(): LicenseRepository {
  if (!instance) {
    instance = isSupabaseConfigured() ? new SupabaseLicenseRepository() : new JsonLicenseRepository();
  }
  return instance;
}
