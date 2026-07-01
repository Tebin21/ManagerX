import crypto from 'crypto';
import type { Request, Response, NextFunction } from 'express';
import { config } from './config';

// Server-to-server auth for /api/admin/* — the ONLY caller is the ManagerX
// Store Control Center's Next.js server (never a browser directly; it holds
// its own separate human-facing session, see online-store/admin's own auth).
// Same timing-safe comparison pattern as auth.ts's store API keys and
// license-admin-panel/server/src/auth.ts's admin password check.
function timingSafeEqual(a: string, b: string): boolean {
  const aBuf = Buffer.from(a);
  const bBuf = Buffer.from(b);
  if (aBuf.length !== bBuf.length) {
    crypto.timingSafeEqual(aBuf, aBuf);
    return false;
  }
  return crypto.timingSafeEqual(aBuf, bBuf);
}

export function requireAdminAuth(req: Request, res: Response, next: NextFunction): void {
  // An empty configured key must never match an empty/missing header — refuse
  // everything rather than accidentally leaving the admin API open because
  // ADMIN_API_KEY was never set.
  if (!config.adminApiKey) {
    res.status(500).json({ error: 'Admin API is not configured (ADMIN_API_KEY unset)' });
    return;
  }
  const header = req.headers.authorization ?? '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';
  if (!token || !timingSafeEqual(token, config.adminApiKey)) {
    res.status(401).json({ error: 'Invalid admin key' });
    return;
  }
  next();
}
