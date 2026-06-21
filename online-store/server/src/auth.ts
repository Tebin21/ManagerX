import crypto from 'crypto';
import type { Request, Response, NextFunction } from 'express';
import { JsonStoreRepository } from './jsonStoreRepository';

const repo = new JsonStoreRepository();

export function generateApiKey(): string {
  return crypto.randomBytes(24).toString('hex');
}

export function hashApiKey(key: string): string {
  return crypto.createHash('sha256').update(key).digest('hex');
}

function timingSafeEqual(a: string, b: string): boolean {
  const aBuf = Buffer.from(a);
  const bBuf = Buffer.from(b);
  if (aBuf.length !== bBuf.length) {
    // Still run a comparison of equal length to avoid an early-exit timing signal.
    crypto.timingSafeEqual(aBuf, aBuf);
    return false;
  }
  return crypto.timingSafeEqual(aBuf, bBuf);
}

// Verifies the "Authorization: Bearer <apiKey>" header against the store identified
// by :slug in the route params. The key for each store is generated once at
// registration (see routes/stores.ts) and stored hashed, same pattern as a password.
export async function requireStoreAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  const slug = req.params.slug;
  const header = req.headers.authorization ?? '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';

  if (!slug || !token) {
    res.status(401).json({ error: 'Missing API key' });
    return;
  }

  const store = await repo.getBySlug(slug);
  // Distinguish "this store doesn't exist (anymore)" from "wrong key for a store that
  // does exist" — the client needs this distinction to tell a permanently-stale local
  // registration (re-register automatically) apart from a transient/network failure
  // (just retry later). Returning 401 for both, as before, made the two indistinguishable
  // and caused the client to retry a permanently-doomed request forever.
  if (!store) {
    res.status(404).json({ error: 'Store not found' });
    return;
  }
  if (!timingSafeEqual(hashApiKey(token), store.apiKeyHash)) {
    res.status(401).json({ error: 'Invalid API key' });
    return;
  }
  next();
}
