import crypto from 'crypto';
import type { Request, Response, NextFunction } from 'express';

const SESSION_COOKIE = 'license_admin_session';
const SESSION_TTL_MS = 12 * 60 * 60 * 1000; // 12 hours

const sessions = new Map<string, number>(); // token -> expiresAt

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

export function checkPassword(password: string): boolean {
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected) {
    throw new Error('ADMIN_PASSWORD is not set in license-admin-panel/server/.env');
  }
  return timingSafeEqual(password ?? '', expected);
}

export function createSession(): string {
  const token = crypto.randomBytes(32).toString('hex');
  sessions.set(token, Date.now() + SESSION_TTL_MS);
  return token;
}

export function destroySession(token: string | undefined): void {
  if (token) sessions.delete(token);
}

function isValidSession(token: string | undefined): boolean {
  if (!token) return false;
  const expiresAt = sessions.get(token);
  if (!expiresAt) return false;
  if (Date.now() > expiresAt) {
    sessions.delete(token);
    return false;
  }
  return true;
}

export const SESSION_COOKIE_NAME = SESSION_COOKIE;

// In production the frontend (Vercel) and backend (Railway) are different origins,
// so the session cookie must be SameSite=None + Secure to be sent on cross-site
// fetch requests at all. Locally, Vite's dev proxy makes everything same-origin
// over plain HTTP, where Secure cookies are silently dropped by browsers — so the
// two environments need different settings, not just stricter-is-always-better.
export function getSessionCookieOptions() {
  const isProduction = process.env.NODE_ENV === 'production';
  return {
    httpOnly: true,
    secure: isProduction,
    sameSite: (isProduction ? 'none' : 'lax') as 'none' | 'lax',
    maxAge: SESSION_TTL_MS,
  };
}

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const token = req.cookies?.[SESSION_COOKIE];
  if (!isValidSession(token)) {
    res.status(401).json({ error: 'Not authenticated' });
    return;
  }
  next();
}
