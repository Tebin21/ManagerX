import { Router } from 'express';
import {
  checkPassword,
  createSession,
  destroySession,
  getSessionCookieOptions,
  requireAuth,
  SESSION_COOKIE_NAME,
} from '../auth';

export const authRouter = Router();

authRouter.get('/check', requireAuth, (_req, res) => {
  res.json({ ok: true });
});

authRouter.post('/login', (req, res) => {
  const { password } = req.body ?? {};
  let ok: boolean;
  try {
    ok = checkPassword(typeof password === 'string' ? password : '');
  } catch (e) {
    res.status(500).json({ error: e instanceof Error ? e.message : 'Server misconfigured' });
    return;
  }
  if (!ok) {
    res.status(401).json({ error: 'Incorrect password' });
    return;
  }
  const token = createSession();
  res.cookie(SESSION_COOKIE_NAME, token, getSessionCookieOptions());
  res.json({ ok: true });
});

authRouter.post('/logout', (req, res) => {
  destroySession(req.cookies?.[SESSION_COOKIE_NAME]);
  res.clearCookie(SESSION_COOKIE_NAME, getSessionCookieOptions());
  res.json({ ok: true });
});
