import crypto from 'crypto';
import { cookies } from 'next/headers';

// Stateless, signed session cookie — deliberately NOT an in-memory session
// map (unlike license-admin-panel/server's Express-only equivalent). This
// value is read from BOTH proxy.ts (which runs isolated from route handler
// module state — see Next.js 16's proxy docs) and Route Handlers, so a
// shared in-memory Map can't be relied on across that boundary. Signing with
// HMAC-SHA256 over a plain expiry timestamp keeps verification a pure,
// dependency-free crypto check anywhere in the app: no database, no shared
// state, safe to call from proxy.ts's "optimistic check" (see Next.js docs'
// own recommendation to avoid DB calls there).
const COOKIE_NAME = 'mx_admin_session';
const SESSION_TTL_SECONDS = 12 * 60 * 60; // 12 hours

function secret(): string {
  const value = process.env.SESSION_SECRET;
  if (!value) {
    throw new Error('SESSION_SECRET is not set — see .env.local.example');
  }
  return value;
}

function sign(payload: string): string {
  return crypto.createHmac('sha256', secret()).update(payload).digest('hex');
}

function timingSafeEqualStr(a: string, b: string): boolean {
  const aBuf = Buffer.from(a);
  const bBuf = Buffer.from(b);
  if (aBuf.length !== bBuf.length) {
    crypto.timingSafeEqual(aBuf, aBuf);
    return false;
  }
  return crypto.timingSafeEqual(aBuf, bBuf);
}

export function checkPassword(password: string): boolean {
  const expected = process.env.ADMIN_DASHBOARD_PASSWORD;
  if (!expected) {
    throw new Error('ADMIN_DASHBOARD_PASSWORD is not set — see .env.local.example');
  }
  return timingSafeEqualStr(password, expected);
}

export function createSessionToken(): string {
  const expiresAt = Date.now() + SESSION_TTL_SECONDS * 1000;
  const payload = String(expiresAt);
  return `${payload}.${sign(payload)}`;
}

// Pure function, safe to call from proxy.ts or a Route Handler alike.
export function isValidSessionToken(token: string | undefined | null): boolean {
  if (!token) return false;
  const dot = token.lastIndexOf('.');
  if (dot === -1) return false;
  const payload = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  if (!timingSafeEqualStr(sign(payload), sig)) return false;
  const expiresAt = Number(payload);
  return Number.isFinite(expiresAt) && Date.now() < expiresAt;
}

export const SESSION_COOKIE_NAME = COOKIE_NAME;
export const SESSION_COOKIE_MAX_AGE = SESSION_TTL_SECONDS;

export function sessionCookieOptions() {
  return {
    httpOnly: true,
    // This is a local-only tool served over http://localhost — a `secure`
    // cookie would silently never be sent (browsers require https for it).
    secure: process.env.NODE_ENV === 'production' && process.env.FORCE_HTTPS === 'true',
    sameSite: 'lax' as const,
    maxAge: SESSION_COOKIE_MAX_AGE,
    path: '/',
  };
}

// Defense-in-depth check inside Route Handlers, on top of proxy.ts's
// redirect — see Next.js's own authentication guide: "Always verify
// credentials before granting access. Do not rely on proxy alone."
export async function hasValidSession(): Promise<boolean> {
  const store = await cookies();
  return isValidSessionToken(store.get(COOKIE_NAME)?.value);
}
