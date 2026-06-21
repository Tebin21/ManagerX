import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import type {
  LicenseRecord,
  LicenseRepository,
  LicenseStatus,
  LicenseUpdateInput,
  NewLicenseInput,
} from './licenseRepository';

// Reads/writes the SAME ledger file the CLI (scripts/license-admin/generate-license.js)
// already uses — both tools see the same data. The CLI's older records used
// status: 'issued' | 'activated'; this repository treats any non-revoked,
// non-expired legacy status as 'active' on read, so old and new records coexist.
const LEDGER_PATH = path.join(__dirname, '../../../scripts/license-admin/licenses.json');

type LegacyOrCurrentRecord = Partial<Omit<LicenseRecord, 'status'>> & { status?: string };

function normalizeStatus(status: string | undefined): LicenseStatus {
  if (status === 'revoked' || status === 'expired' || status === 'active') return status;
  return 'active'; // legacy 'issued' / 'activated' values from the CLI
}

function readLedger(): LicenseRecord[] {
  if (!fs.existsSync(LEDGER_PATH)) return [];
  const raw: LegacyOrCurrentRecord[] = JSON.parse(fs.readFileSync(LEDGER_PATH, 'utf8'));
  return raw.map((r) => ({
    // licenseCode is already unique and persisted, so it's a stable fallback id for
    // legacy CLI-created records that predate the id field — a fresh random UUID
    // here would change on every read, breaking id-based lookups for those records.
    id: r.id ?? r.licenseCode ?? crypto.randomUUID(),
    customerName: r.customerName ?? '',
    phone: r.phone ?? '',
    deviceId: r.deviceId ?? '',
    licenseCode: r.licenseCode ?? '',
    plan: (r.plan as LicenseRecord['plan']) ?? 'basic',
    createdAt: r.createdAt ?? new Date().toISOString(),
    activatedAt: r.activatedAt ?? null,
    expiresAt: r.expiresAt ?? null, // legacy records predate this field — permanent
    status: normalizeStatus(r.status),
    notes: r.notes ?? '',
    revokedAt: r.revokedAt ?? null,
    revokedReason: r.revokedReason ?? null,
  }));
}

function writeLedger(records: LicenseRecord[]): void {
  fs.mkdirSync(path.dirname(LEDGER_PATH), { recursive: true });
  fs.writeFileSync(LEDGER_PATH, JSON.stringify(records, null, 2));
}

export class JsonLicenseRepository implements LicenseRepository {
  async list(): Promise<LicenseRecord[]> {
    return readLedger();
  }

  async get(id: string): Promise<LicenseRecord | null> {
    return readLedger().find((r) => r.id === id) ?? null;
  }

  async create(
    data: Omit<NewLicenseInput, 'expiresInMonths'> & { licenseCode: string; expiresAt: string | null }
  ): Promise<LicenseRecord> {
    const records = readLedger();
    const record: LicenseRecord = {
      id: crypto.randomUUID(),
      customerName: data.customerName.trim(),
      phone: data.phone.trim(),
      deviceId: data.deviceId.trim().toUpperCase(),
      licenseCode: data.licenseCode,
      plan: data.plan,
      createdAt: new Date().toISOString(),
      activatedAt: null,
      expiresAt: data.expiresAt,
      status: 'active',
      notes: data.notes?.trim() ?? '',
      revokedAt: null,
      revokedReason: null,
    };
    records.push(record);
    writeLedger(records);
    return record;
  }

  async update(id: string, data: LicenseUpdateInput): Promise<LicenseRecord | null> {
    const records = readLedger();
    const idx = records.findIndex((r) => r.id === id);
    if (idx === -1) return null;
    records[idx] = {
      ...records[idx],
      ...(data.customerName !== undefined ? { customerName: data.customerName.trim() } : {}),
      ...(data.phone !== undefined ? { phone: data.phone.trim() } : {}),
      ...(data.notes !== undefined ? { notes: data.notes.trim() } : {}),
    };
    writeLedger(records);
    return records[idx];
  }

  async setStatus(
    id: string,
    status: LicenseStatus,
    extra?: { revokedReason?: string | null }
  ): Promise<LicenseRecord | null> {
    const records = readLedger();
    const idx = records.findIndex((r) => r.id === id);
    if (idx === -1) return null;
    const now = new Date().toISOString();
    records[idx] = {
      ...records[idx],
      status,
      revokedAt: status === 'revoked' ? now : records[idx].revokedAt,
      revokedReason: status === 'revoked' ? extra?.revokedReason ?? null : records[idx].revokedReason,
    };
    writeLedger(records);
    return records[idx];
  }

  async remove(id: string): Promise<boolean> {
    const records = readLedger();
    const next = records.filter((r) => r.id !== id);
    if (next.length === records.length) return false;
    writeLedger(next);
    return true;
  }
}
