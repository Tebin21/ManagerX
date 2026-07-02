import rateLimit from 'express-rate-limit';
import type { Request } from 'express';

// Keys the limiter bucket by :slug (falling back to IP only when no slug exists
// on the route, e.g. registration) so one store hammering its own write endpoints
// can never exhaust another store's quota — each store gets its own counter.
function slugOrIpKey(req: Request): string {
  return req.params.slug ?? req.ip ?? 'unknown';
}

// Applied to per-store write endpoints (sync, info update, image upload, status
// change). Generous enough for normal offline-first sync bursts and manual admin
// edits, tight enough to stop a leaked/abused API key from monopolizing the shared
// JSON ledger + disk (see storeLock.ts) at another store's expense.
export const storeWriteLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 30,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: slugOrIpKey,
  message: { error: 'Too many requests, please slow down' },
});

// Applied to store registration (POST /), the one write endpoint with no :slug yet
// to key on. Keyed by IP since there's no store identity until after this succeeds.
export const registrationLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please slow down' },
});
