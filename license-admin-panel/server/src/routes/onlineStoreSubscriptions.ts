import { Router } from 'express';
import { isValidDeviceId, isValidPlan, signSubscription, PLAN_NAMES } from '../onlineStoreSubscriptionCrypto';
import { JsonOnlineStoreSubscriptionRepository } from '../jsonOnlineStoreSubscriptionRepository';
import type { OnlineStoreSubscriptionRecord } from '../onlineStoreSubscriptionRepository';

const repo = new JsonOnlineStoreSubscriptionRepository();

export const onlineStoreSubscriptionsRouter = Router();

// A subscription that's still marked "active" but whose embedded expiry date has
// passed is, for display purposes, expired — without requiring "Mark Expired" first.
// Never mutates the stored status; just a derived field on every API response.
function isEffectivelyExpired(record: OnlineStoreSubscriptionRecord): boolean {
  return record.status === 'active' && !!record.expiresAt && record.expiresAt < new Date().toISOString();
}

function withEffectiveExpiry(record: OnlineStoreSubscriptionRecord) {
  return { ...record, isExpired: isEffectivelyExpired(record) };
}

onlineStoreSubscriptionsRouter.get('/', async (_req, res) => {
  const records = await repo.list();
  res.json(records.map(withEffectiveExpiry));
});

onlineStoreSubscriptionsRouter.get('/export.csv', async (_req, res) => {
  const records = await repo.list();
  const header = [
    'Customer Name', 'Phone', 'Device ID', 'Subscription Code', 'Plan', 'Status',
    'Created At', 'Activated At', 'Expires At', 'Notes',
  ];
  const escape = (v: string) => `"${(v ?? '').replace(/"/g, '""')}"`;
  const rows = records.map((r) =>
    [
      r.customerName, r.phone, r.deviceId, r.subscriptionCode, r.plan,
      isEffectivelyExpired(r) ? 'expired' : r.status,
      r.createdAt, r.activatedAt ?? '', r.expiresAt ?? 'lifetime', r.notes,
    ]
      .map(escape)
      .join(',')
  );
  const csv = [header.map(escape).join(','), ...rows].join('\r\n');
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="online-store-subscriptions.csv"');
  res.send(csv);
});

onlineStoreSubscriptionsRouter.get('/:id', async (req, res) => {
  const record = await repo.get(req.params.id);
  if (!record) {
    res.status(404).json({ error: 'Subscription not found' });
    return;
  }
  res.json(withEffectiveExpiry(record));
});

onlineStoreSubscriptionsRouter.post('/', async (req, res) => {
  const { customerName, phone, deviceId, plan, notes } = req.body ?? {};

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

  let signed: { subscriptionCode: string; expiresAt: string | null };
  try {
    signed = signSubscription(deviceId, plan);
  } catch (e) {
    res.status(500).json({ error: e instanceof Error ? e.message : 'Signing failed' });
    return;
  }

  const record = await repo.create({
    customerName, phone, deviceId, plan, notes,
    subscriptionCode: signed.subscriptionCode,
    expiresAt: signed.expiresAt,
  });
  res.status(201).json(withEffectiveExpiry(record));
});

onlineStoreSubscriptionsRouter.patch('/:id', async (req, res) => {
  const { customerName, phone, notes } = req.body ?? {};
  const updated = await repo.update(req.params.id, { customerName, phone, notes });
  if (!updated) {
    res.status(404).json({ error: 'Subscription not found' });
    return;
  }
  res.json(withEffectiveExpiry(updated));
});

onlineStoreSubscriptionsRouter.post('/:id/revoke', async (req, res) => {
  const { reason } = req.body ?? {};
  const updated = await repo.setStatus(req.params.id, 'revoked', { revokedReason: reason ?? null });
  if (!updated) {
    res.status(404).json({ error: 'Subscription not found' });
    return;
  }
  res.json(withEffectiveExpiry(updated));
});

onlineStoreSubscriptionsRouter.post('/:id/expire', async (req, res) => {
  const updated = await repo.setStatus(req.params.id, 'expired');
  if (!updated) {
    res.status(404).json({ error: 'Subscription not found' });
    return;
  }
  res.json(withEffectiveExpiry(updated));
});

onlineStoreSubscriptionsRouter.post('/:id/reactivate', async (req, res) => {
  const updated = await repo.setStatus(req.params.id, 'active');
  if (!updated) {
    res.status(404).json({ error: 'Subscription not found' });
    return;
  }
  res.json(withEffectiveExpiry(updated));
});

onlineStoreSubscriptionsRouter.delete('/:id', async (req, res) => {
  const removed = await repo.remove(req.params.id);
  if (!removed) {
    res.status(404).json({ error: 'Subscription not found' });
    return;
  }
  res.status(204).end();
});
