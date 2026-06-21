import crypto from 'crypto';
import type { Request, Response, NextFunction } from 'express';
import { config } from './config';

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

// The admin password comes from config.local.json's "adminPassword" field — that's
// the one and only place to change it. See src/config.ts for the loader.
export function checkPassword(password: string): boolean {
  return timingSafeEqual(password ?? '', config.adminPassword);
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

// This is a local-only app — the client and server are always on the same machine,
// served from http://localhost, so a plain Lax/non-Secure cookie is correct and
// sufficient. (Secure cookies require HTTPS, which plain localhost doesn't have.)
export function getSessionCookieOptions() {
  return {
    httpOnly: true,
    secure: false,
    sameSite: 'lax' as const,
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
