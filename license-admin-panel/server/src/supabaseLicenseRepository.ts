import { getSupabaseClient } from './supabaseClient';
import type {
  LicenseRecord,
  LicenseRepository,
  LicenseStatus,
  LicenseUpdateInput,
  NewLicenseInput,
} from './licenseRepository';

// Raw shapes matching the Postgres column names (snake_case). The "customers" field
// is the embedded join result from `.select('*, customers(*)')` — supabase-js can
// return this as either an object or a one-element array depending on how the
// foreign-key relationship is inferred, so flatten() below handles both.
interface CustomerRow {
  id: string;
  customer_name: string;
  phone: string;
}

interface LicenseRow {
  id: string;
  customer_id: string;
  device_id: string;
  license_code: string;
  plan: LicenseRecord['plan'];
  status: LicenseStatus;
  created_at: string;
  activated_at: string | null;
  notes: string;
  revoked_at: string | null;
  revoked_reason: string | null;
  customers: CustomerRow | CustomerRow[] | null;
}

const LICENSE_SELECT = '*, customers(*)';

function flatten(row: LicenseRow): LicenseRecord {
  const customer = Array.isArray(row.customers) ? row.customers[0] : row.customers;
  return {
    id: row.id,
    customerName: customer?.customer_name ?? '',
    phone: customer?.phone ?? '',
    deviceId: row.device_id,
    licenseCode: row.license_code,
    plan: row.plan,
    createdAt: row.created_at,
    activatedAt: row.activated_at,
    status: row.status,
    notes: row.notes,
    revokedAt: row.revoked_at,
    revokedReason: row.revoked_reason,
  };
}

// Implements the same LicenseRepository interface as JsonLicenseRepository — the
// normalization (customers + licenses tables) is entirely internal to this class.
// Routes and the frontend only ever see the flat LicenseRecord shape, unchanged.
export class SupabaseLicenseRepository implements LicenseRepository {
  async list(): Promise<LicenseRecord[]> {
    const sb = getSupabaseClient();
    const { data, error } = await sb
      .from('licenses')
      .select(LICENSE_SELECT)
      .order('created_at', { ascending: false });
    if (error) throw new Error(`Supabase list failed: ${error.message}`);
    return ((data ?? []) as unknown as LicenseRow[]).map(flatten);
  }

  async get(id: string): Promise<LicenseRecord | null> {
    const sb = getSupabaseClient();
    const { data, error } = await sb.from('licenses').select(LICENSE_SELECT).eq('id', id).maybeSingle();
    if (error) throw new Error(`Supabase get failed: ${error.message}`);
    return data ? flatten(data as unknown as LicenseRow) : null;
  }

  private async findOrCreateCustomer(customerName: string, phone: string): Promise<string> {
    const sb = getSupabaseClient();
    // upsert on the unique "phone" column: inserts a new customer, or refreshes the
    // display name of an existing one — mirrors the old flat-table behavior, where
    // the most-recently-entered name was always shown. Idempotent by construction.
    const { data, error } = await sb
      .from('customers')
      .upsert({ customer_name: customerName.trim(), phone: phone.trim() }, { onConflict: 'phone' })
      .select('id')
      .single();
    if (error) throw new Error(`Supabase customer upsert failed: ${error.message}`);
    return data.id;
  }

  async create(data: NewLicenseInput & { licenseCode: string }): Promise<LicenseRecord> {
    const customerId = await this.findOrCreateCustomer(data.customerName, data.phone);
    const sb = getSupabaseClient();
    const { data: inserted, error } = await sb
      .from('licenses')
      .insert({
        customer_id: customerId,
        device_id: data.deviceId.trim().toUpperCase(),
        license_code: data.licenseCode,
        plan: data.plan,
        status: 'active',
        notes: data.notes?.trim() ?? '',
      })
      .select(LICENSE_SELECT)
      .single();
    if (error) throw new Error(`Supabase license create failed: ${error.message}`);
    return flatten(inserted as unknown as LicenseRow);
  }

  async update(id: string, data: LicenseUpdateInput): Promise<LicenseRecord | null> {
    const sb = getSupabaseClient();

    if (data.customerName !== undefined || data.phone !== undefined) {
      const { data: licenseRow, error: lookupError } = await sb
        .from('licenses')
        .select('customer_id')
        .eq('id', id)
        .maybeSingle();
      if (lookupError) throw new Error(`Supabase license lookup failed: ${lookupError.message}`);
      if (!licenseRow) return null;

      // customerName/phone live on the customers table, shared across all of that
      // customer's licenses — editing one updates it everywhere, by design (this
      // also fixes the old flat-table behavior, where two licenses for the same
      // customer could silently show different names after an edit).
      const updatePayload: Record<string, string> = {};
      if (data.customerName !== undefined) updatePayload.customer_name = data.customerName.trim();
      if (data.phone !== undefined) updatePayload.phone = data.phone.trim();
      const { error: customerError } = await sb
        .from('customers')
        .update(updatePayload)
        .eq('id', licenseRow.customer_id);
      if (customerError) throw new Error(`Supabase customer update failed: ${customerError.message}`);
    }

    if (data.notes !== undefined) {
      const { error: notesError } = await sb
        .from('licenses')
        .update({ notes: data.notes.trim() })
        .eq('id', id);
      if (notesError) throw new Error(`Supabase license notes update failed: ${notesError.message}`);
    }

    return this.get(id);
  }

  async setStatus(
    id: string,
    status: LicenseStatus,
    extra?: { revokedReason?: string | null }
  ): Promise<LicenseRecord | null> {
    const sb = getSupabaseClient();
    const payload: Record<string, unknown> = { status };
    if (status === 'revoked') {
      payload.revoked_at = new Date().toISOString();
      payload.revoked_reason = extra?.revokedReason ?? null;
    }
    const { error } = await sb.from('licenses').update(payload).eq('id', id);
    if (error) throw new Error(`Supabase status update failed: ${error.message}`);
    return this.get(id);
  }

  async remove(id: string): Promise<boolean> {
    const sb = getSupabaseClient();
    const { error, count } = await sb.from('licenses').delete({ count: 'exact' }).eq('id', id);
    if (error) throw new Error(`Supabase delete failed: ${error.message}`);
    return (count ?? 0) > 0;
  }
}
