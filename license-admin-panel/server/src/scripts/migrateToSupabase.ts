// One-off migration: reads the local JSON ledger and inserts every record into
// Supabase. Safe to re-run — customers are upserted by phone, licenses are
// skipped if their license_code already exists. Run manually:
//   npm run migrate --prefix license-admin-panel/server
// Requires SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY in server/.env.

import path from 'path';
import dotenv from 'dotenv';
dotenv.config({ path: path.join(__dirname, '../../.env') });

import fs from 'fs';
import { getSupabaseClient, isSupabaseConfigured } from '../supabaseClient';

const LEDGER_PATH = path.join(__dirname, '../../../../scripts/license-admin/licenses.json');

interface LegacyRecord {
  customerName?: string;
  phone?: string;
  deviceId?: string;
  licenseCode?: string;
  plan?: string;
  createdAt?: string;
  activatedAt?: string | null;
  status?: string;
  notes?: string;
  revokedAt?: string | null;
  revokedReason?: string | null;
}

function normalizeStatus(status: string | undefined): 'active' | 'revoked' | 'expired' {
  if (status === 'revoked' || status === 'expired' || status === 'active') return status;
  return 'active';
}

async function main() {
  if (!isSupabaseConfigured()) {
    console.error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in server/.env first.');
    process.exit(1);
  }
  if (!fs.existsSync(LEDGER_PATH)) {
    console.log(`No local ledger found at ${LEDGER_PATH} — nothing to migrate.`);
    return;
  }

  const records: LegacyRecord[] = JSON.parse(fs.readFileSync(LEDGER_PATH, 'utf8'));
  if (records.length === 0) {
    console.log('Local ledger is empty — nothing to migrate.');
    return;
  }

  const sb = getSupabaseClient();
  let migrated = 0;
  let skipped = 0;

  for (const r of records) {
    if (!r.licenseCode || !r.deviceId || !r.plan) {
      console.warn('Skipping malformed record (missing licenseCode/deviceId/plan):', r);
      skipped++;
      continue;
    }

    const { data: existingLicense } = await sb
      .from('licenses')
      .select('id')
      .eq('license_code', r.licenseCode)
      .maybeSingle();
    if (existingLicense) {
      console.log(`Already migrated, skipping: ${r.licenseCode}`);
      skipped++;
      continue;
    }

    const { data: customer, error: customerError } = await sb
      .from('customers')
      .upsert(
        { customer_name: (r.customerName ?? '').trim(), phone: (r.phone ?? `unknown-${r.deviceId}`).trim() },
        { onConflict: 'phone' }
      )
      .select('id')
      .single();
    if (customerError) {
      console.error(`Failed to upsert customer for ${r.licenseCode}:`, customerError.message);
      skipped++;
      continue;
    }

    const { error: licenseError } = await sb.from('licenses').insert({
      customer_id: customer.id,
      device_id: r.deviceId.toUpperCase(),
      license_code: r.licenseCode,
      plan: r.plan,
      status: normalizeStatus(r.status),
      created_at: r.createdAt ?? new Date().toISOString(),
      activated_at: r.activatedAt ?? null,
      notes: r.notes ?? '',
      revoked_at: r.revokedAt ?? null,
      revoked_reason: r.revokedReason ?? null,
    });
    if (licenseError) {
      console.error(`Failed to insert license ${r.licenseCode}:`, licenseError.message);
      skipped++;
      continue;
    }

    console.log(`Migrated: ${r.licenseCode}`);
    migrated++;
  }

  console.log(`\nDone. Migrated ${migrated}, skipped ${skipped}, total ${records.length}.`);
}

main().catch((e) => {
  console.error('Migration failed:', e);
  process.exit(1);
});
