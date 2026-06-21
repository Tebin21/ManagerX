import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import type {
  OnlineStoreSubscriptionRecord,
  OnlineStoreSubscriptionRepository,
  SubscriptionStatus,
  OnlineStoreSubscriptionUpdateInput,
  NewOnlineStoreSubscriptionInput,
} from './onlineStoreSubscriptionRepository';

// Reads/writes the SAME ledger file the CLI
// (scripts/online-store-subscription-admin/generate-subscription.js) already uses —
// both tools see the same data. Deliberately a SEPARATE file from
// scripts/license-admin/licenses.json — these are two independent products.
const LEDGER_PATH = path.join(__dirname, '../../../scripts/online-store-subscription-admin/subscriptions.json');

type LegacyOrCurrentRecord = Partial<Omit<OnlineStoreSubscriptionRecord, 'status'>> & { status?: string };

function normalizeStatus(status: string | undefined): SubscriptionStatus {
  if (status === 'revoked' || status === 'expired' || status === 'active') return status;
  return 'active'; // legacy 'issued'/'activated' values from the CLI
}

function readLedger(): OnlineStoreSubscriptionRecord[] {
  if (!fs.existsSync(LEDGER_PATH)) return [];
  const raw: LegacyOrCurrentRecord[] = JSON.parse(fs.readFileSync(LEDGER_PATH, 'utf8'));
  return raw.map((r) => ({
    // subscriptionCode is already unique and persisted, so it's a stable fallback id
    // for legacy CLI-created records that predate the id field.
    id: r.id ?? r.subscriptionCode ?? crypto.randomUUID(),
    customerName: r.customerName ?? '',
    phone: r.phone ?? '',
    deviceId: r.deviceId ?? '',
    subscriptionCode: r.subscriptionCode ?? '',
    plan: (r.plan as OnlineStoreSubscriptionRecord['plan']) ?? '1m',
    createdAt: r.createdAt ?? new Date().toISOString(),
    activatedAt: r.activatedAt ?? null,
    expiresAt: r.expiresAt ?? null,
    status: normalizeStatus(r.status),
    notes: r.notes ?? '',
    revokedAt: r.revokedAt ?? null,
    revokedReason: r.revokedReason ?? null,
  }));
}

function writeLedger(records: OnlineStoreSubscriptionRecord[]): void {
  fs.mkdirSync(path.dirname(LEDGER_PATH), { recursive: true });
  fs.writeFileSync(LEDGER_PATH, JSON.stringify(records, null, 2));
}

export class JsonOnlineStoreSubscriptionRepository implements OnlineStoreSubscriptionRepository {
  async list(): Promise<OnlineStoreSubscriptionRecord[]> {
    return readLedger();
  }

  async get(id: string): Promise<OnlineStoreSubscriptionRecord | null> {
    return readLedger().find((r) => r.id === id) ?? null;
  }

  async create(
    data: NewOnlineStoreSubscriptionInput & { subscriptionCode: string; expiresAt: string | null }
  ): Promise<OnlineStoreSubscriptionRecord> {
    const records = readLedger();
    const record: OnlineStoreSubscriptionRecord = {
      id: crypto.randomUUID(),
      customerName: data.customerName.trim(),
      phone: data.phone.trim(),
      deviceId: data.deviceId.trim().toUpperCase(),
      subscriptionCode: data.subscriptionCode,
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

  async update(id: string, data: OnlineStoreSubscriptionUpdateInput): Promise<OnlineStoreSubscriptionRecord | null> {
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
    status: SubscriptionStatus,
    extra?: { revokedReason?: string | null }
  ): Promise<OnlineStoreSubscriptionRecord | null> {
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
