import { Router } from 'express';
import { isValidDeviceId, isValidPlan, signLicense, PLAN_NAMES } from '../crypto';
import { JsonLicenseRepository } from '../jsonLicenseRepository';
import type { LicenseRecord } from '../licenseRepository';

const repo = new JsonLicenseRepository();

export const licensesRouter = Router();

// A license that's still marked "active" but whose embedded expiry date has passed
// is, for display purposes, expired — without requiring you to click "Mark Expired"
// first. This never mutates the stored status (your own revoke/expire actions stay
// the source of truth); it's a derived field added to every API response so the
// client never has to re-implement this date comparison itself.
function isEffectivelyExpired(record: LicenseRecord): boolean {
  return record.status === 'active' && !!record.expiresAt && record.expiresAt < new Date().toISOString();
}

function withEffectiveExpiry(record: LicenseRecord) {
  return { ...record, isExpired: isEffectivelyExpired(record) };
}

licensesRouter.get('/', async (_req, res) => {
  const records = await repo.list();
  res.json(records.map(withEffectiveExpiry));
});

licensesRouter.get('/export.csv', async (_req, res) => {
  const records = await repo.list();
  const header = [
    'Customer Name', 'Phone', 'Device ID', 'License Code', 'Plan', 'Status',
    'Created At', 'Activated At', 'Expires At', 'Notes',
  ];
  const escape = (v: string) => `"${(v ?? '').replace(/"/g, '""')}"`;
  const rows = records.map((r) =>
    [
      r.customerName, r.phone, r.deviceId, r.licenseCode, r.plan,
      isEffectivelyExpired(r) ? 'expired' : r.status,
      r.createdAt, r.activatedAt ?? '', r.expiresAt ?? 'permanent', r.notes,
    ]
      .map(escape)
      .join(',')
  );
  const csv = [header.map(escape).join(','), ...rows].join('\r\n');
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="managerx-licenses.csv"');
  res.send(csv);
});

licensesRouter.get('/:id', async (req, res) => {
  const record = await repo.get(req.params.id);
  if (!record) {
    res.status(404).json({ error: 'License not found' });
    return;
  }
  res.json(withEffectiveExpiry(record));
});

licensesRouter.post('/', async (req, res) => {
  const { customerName, phone, deviceId, plan, notes, expiresInMonths } = req.body ?? {};

  if (!customerName?.trim() || !phone?.trim() || !deviceId?.trim()) {
    res.status(400).json({ error: 'Customer name, phone, and Device ID are required.' });
    return;
  }
  if (!isValidDeviceId(deviceId)) {
    res.status(400).json({ error: 'Device ID must look like MX-DV-XXXX-XXXX.' });
    return;
  }
  if (!isValidPlan(plan)) {
    res.status(400).json({ error: `Plan must be one of: ${PLAN_NAMES.join(', ')}` });
    return;
  }
  if (expiresInMonths !== undefined && expiresInMonths !== null) {
    if (typeof expiresInMonths !== 'number' || !Number.isFinite(expiresInMonths) || expiresInMonths < 0) {
      res.status(400).json({ error: 'expiresInMonths must be a non-negative number.' });
      return;
    }
  }

  let signed: { licenseCode: string; expiresAt: string | null };
  try {
    signed = signLicense(deviceId, plan, expiresInMonths);
  } catch (e) {
    res.status(500).json({ error: e instanceof Error ? e.message : 'Signing failed' });
    return;
  }

  const record = await repo.create({
    customerName, phone, deviceId, plan, notes,
    licenseCode: signed.licenseCode,
    expiresAt: signed.expiresAt,
  });
  res.status(201).json(withEffectiveExpiry(record));
});

licensesRouter.patch('/:id', async (req, res) => {
  const { customerName, phone, notes } = req.body ?? {};
  const updated = await repo.update(req.params.id, { customerName, phone, notes });
  if (!updated) {
    res.status(404).json({ error: 'License not found' });
    return;
  }
  res.json(withEffectiveExpiry(updated));
});

licensesRouter.post('/:id/revoke', async (req, res) => {
  const { reason } = req.body ?? {};
  const updated = await repo.setStatus(req.params.id, 'revoked', { revokedReason: reason ?? null });
  if (!updated) {
    res.status(404).json({ error: 'License not found' });
    return;
  }
  res.json(withEffectiveExpiry(updated));
});

licensesRouter.post('/:id/expire', async (req, res) => {
  const updated = await repo.setStatus(req.params.id, 'expired');
  if (!updated) {
    res.status(404).json({ error: 'License not found' });
    return;
  }
  res.json(withEffectiveExpiry(updated));
});

licensesRouter.post('/:id/reactivate', async (req, res) => {
  const updated = await repo.setStatus(req.params.id, 'active');
  if (!updated) {
    res.status(404).json({ error: 'License not found' });
    return;
  }
  res.json(withEffectiveExpiry(updated));
});

licensesRouter.delete('/:id', async (req, res) => {
  const removed = await repo.remove(req.params.id);
  if (!removed) {
    res.status(404).json({ error: 'License not found' });
    return;
  }
  res.status(204).end();
});

export function groupByCustomer(records: LicenseRecord[]) {
  const byPhone = new Map<string, LicenseRecord[]>();
  for (const r of records) {
    const key = r.phone || `unknown-${r.id}`;
    if (!byPhone.has(key)) byPhone.set(key, []);
    byPhone.get(key)!.push(r);
  }
  return Array.from(byPhone.entries()).map(([phone, recs]) => {
    const sorted = [...recs].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    return {
      phone,
      customerName: sorted[sorted.length - 1].customerName,
      devices: Array.from(new Set(sorted.map((r) => r.deviceId))),
      planHistory: sorted.map((r) => ({ plan: r.plan, createdAt: r.createdAt, status: r.status })),
      licenses: sorted.map(withEffectiveExpiry),
    };
  });
}
