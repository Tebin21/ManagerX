import type { Request, Response, NextFunction } from 'express';
import { JsonStoreRepository } from './jsonStoreRepository';

const repo = new JsonStoreRepository();

// Reuses the EXACT same module the mobile app ships with — single source of truth
// for the Online Store Subscription code format/algorithm, completely independent
// from the ManagerX item-limit license system (separate keypair, separate prefix).
// Mirrors license-admin-panel/server/src/crypto.ts's proven cross-project require
// pattern — online-store/server/src/ is the same depth under the repo root as
// license-admin-panel/server/src/, so the same '../../../' resolves correctly.
// eslint-disable-next-line @typescript-eslint/no-var-requires
const subscriptionCore = require('../../../lib/onlineStoreSubscription/subscriptionCore') as {
  verifySubscriptionCode: (
    code: string,
    deviceId: string
  ) => { status: 'valid' | 'invalid' | 'wrong_device' | 'expired'; planToken?: string; expiryToken?: string };
};

export interface SubscriptionCheckResult {
  status: 'missing' | 'invalid' | 'wrong_device' | 'expired' | 'valid';
}

// Plain helper (not middleware) so PATCH /:slug/status can call it conditionally
// (only when enabled:true is requested) without needing a second near-duplicate of
// this header-parsing logic. requireActiveSubscription below just wraps it.
export function checkSubscriptionHeaders(req: Request): SubscriptionCheckResult {
  // Express/Node lower-case all incoming header names regardless of how the client
  // sent them (X-OSS-Subscription / X-Device-Id) — read the lower-case keys here.
  const code = req.headers['x-oss-subscription'];
  const deviceId = req.headers['x-device-id'];
  if (typeof code !== 'string' || typeof deviceId !== 'string' || !code || !deviceId) {
    persistSubscriptionSnapshot(req, { status: 'missing' });
    return { status: 'missing' };
  }
  const result = subscriptionCore.verifySubscriptionCode(code, deviceId);
  persistSubscriptionSnapshot(req, {
    status: result.status,
    plan: result.planToken,
    expiresAt: result.expiryToken,
  });
  return { status: result.status };
}

// Fire-and-forget snapshot for the admin dashboard only — never awaited by
// callers and never allowed to affect the actual authorization decision above.
// Only meaningful once a store exists (req.params.slug is unset on the
// registration route, before there's a record to attach this to).
function persistSubscriptionSnapshot(
  req: Request,
  result: { status: SubscriptionCheckResult['status']; plan?: string; expiresAt?: string }
): void {
  const slug = req.params?.slug;
  if (!slug) return;
  void repo.recordSubscriptionCheck(slug, result);
}

// Express middleware for routes that are ALWAYS gated regardless of request body
// (registration, info updates, sync, image upload). PATCH /:slug/status is handled
// separately with an inline conditional check — see routes/stores.ts.
export function requireActiveSubscription(req: Request, res: Response, next: NextFunction): void {
  const result = checkSubscriptionHeaders(req);
  if (result.status !== 'valid') {
    res.status(402).json({ error: 'Online Store subscription required', status: result.status });
    return;
  }
  next();
}
