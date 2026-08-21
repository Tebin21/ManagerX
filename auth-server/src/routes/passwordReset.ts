import { Router } from 'express';
import type { Request, Response } from 'express';
import {
  passwordResetRequestLimiter,
  passwordResetVerifyLimiter,
  passwordResetCompleteLimiter,
} from '../rateLimit';
import {
  requestPasswordResetOtp,
  verifyPasswordResetOtp,
  issueResetAuthorization,
  consumeResetAuthorization,
} from '../passwordResetStore';
import { sendPasswordResetOtpEmail } from '../email';
import { emailKey, normalizeEmail } from '../passwordResetCrypto';
import { auth } from '../firebaseAdmin';

// Entirely separate, unauthenticated flow from routes/otp.ts — a user who
// forgot their password isn't signed in and has no Firebase ID token, so none
// of these routes sit behind verifyFirebaseToken. Every endpoint is keyed by
// the email in the request body instead of a decoded token's uid.
export const passwordResetRouter = Router();

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const TOKEN_RE = /^[0-9a-f]{64}$/;

passwordResetRouter.post('/request', passwordResetRequestLimiter, async (req: Request, res: Response) => {
  const email = typeof req.body?.email === 'string' ? req.body.email.trim() : '';
  if (!email || !EMAIL_RE.test(email)) {
    res.status(400).json({ error: 'invalid_email' });
    return;
  }

  const normalized = normalizeEmail(email);
  const key = emailKey(normalized);

  try {
    // Never let a lookup failure (including "no such user") distinguish itself
    // from success below — uid stays null either way, and every subsequent step
    // runs identically regardless.
    let uid: string | null = null;
    try {
      const user = await auth.getUserByEmail(normalized);
      uid = user.uid;
    } catch {
      uid = null;
    }

    const result = await requestPasswordResetOtp(key, uid, normalized);

    if (result.status === 'cooldown' || result.status === 'rate_limited') {
      console.log('password_reset_request', { status: result.status });
      res.status(429).json({ error: result.status, retryAfterSeconds: result.retryAfterSeconds });
      return;
    }

    // Only actually send an email when the account exists — result.code exists
    // only in this local variable either way, never logged, never returned.
    if (uid !== null) {
      const sendResult = await sendPasswordResetOtpEmail(normalized, result.code);
      if (!sendResult.ok) {
        console.error('password_reset_request', { status: 'email_send_failed', reason: sendResult.reason });
        res.status(502).json({ error: 'email_send_failed' });
        return;
      }
    }

    // Identical response whether or not the account exists — this is the
    // "if an account exists for this email..." property enforced server-side,
    // not just in copy.
    console.log('password_reset_request', { status: 'sent' });
    res.json({ success: true, expiresInSeconds: 600, cooldownSeconds: 60 });
  } catch (e) {
    console.error('password_reset_request', { status: 'server_error', message: e instanceof Error ? e.message : String(e) });
    res.status(500).json({ error: 'server_error' });
  }
});

passwordResetRouter.post('/verify', passwordResetVerifyLimiter, async (req: Request, res: Response) => {
  const email = typeof req.body?.email === 'string' ? req.body.email.trim() : '';
  const code = typeof req.body?.code === 'string' ? req.body.code.trim() : '';

  if (!email || !EMAIL_RE.test(email)) {
    res.status(400).json({ error: 'invalid_email' });
    return;
  }
  if (!/^\d{6}$/.test(code)) {
    res.status(400).json({ error: 'invalid_code' });
    return;
  }

  const key = emailKey(normalizeEmail(email));

  try {
    const result = await verifyPasswordResetOtp(key, code);

    switch (result.status) {
      case 'no_pending_otp':
        res.status(400).json({ error: 'no_pending_otp' });
        return;
      case 'too_many_attempts':
        console.log('password_reset_verify', { status: 'too_many_attempts' });
        res.status(429).json({ error: 'too_many_attempts' });
        return;
      case 'expired':
        res.status(400).json({ error: 'expired' });
        return;
      case 'invalid_code':
        console.log('password_reset_verify', { status: 'invalid_code' });
        res.status(400).json({ error: 'invalid_code', attemptsRemaining: result.attemptsRemaining });
        return;
      case 'verified': {
        const { token, expiresInSeconds } = await issueResetAuthorization(key, result.uid, normalizeEmail(email));
        console.log('password_reset_verify', { status: 'verified' });
        res.json({ success: true, resetToken: token, expiresInSeconds });
        return;
      }
    }
  } catch (e) {
    console.error('password_reset_verify', { status: 'server_error', message: e instanceof Error ? e.message : String(e) });
    res.status(500).json({ error: 'server_error' });
  }
});

passwordResetRouter.post('/complete', passwordResetCompleteLimiter, async (req: Request, res: Response) => {
  const email = typeof req.body?.email === 'string' ? req.body.email.trim() : '';
  const token = typeof req.body?.token === 'string' ? req.body.token.trim() : '';
  const newPassword = typeof req.body?.newPassword === 'string' ? req.body.newPassword : '';

  if (!email || !EMAIL_RE.test(email)) {
    res.status(400).json({ error: 'invalid_email' });
    return;
  }
  if (!TOKEN_RE.test(token)) {
    res.status(400).json({ error: 'invalid_or_expired_token' });
    return;
  }
  if (newPassword.length < 6) {
    res.status(400).json({ error: 'weak_password' });
    return;
  }

  const key = emailKey(normalizeEmail(email));

  try {
    const result = await consumeResetAuthorization(key, token);
    if (result.status === 'invalid_or_expired') {
      res.status(400).json({ error: 'invalid_or_expired_token' });
      return;
    }

    try {
      await auth.updateUser(result.uid, { password: newPassword });
    } catch (e: any) {
      if (e?.code === 'auth/invalid-password') {
        res.status(400).json({ error: 'weak_password' });
        return;
      }
      if (e?.code === 'auth/user-not-found') {
        res.status(400).json({ error: 'invalid_or_expired_token' });
        return;
      }
      throw e;
    }

    console.log('password_reset_complete', { status: 'success' });
    res.json({ success: true });
  } catch (e) {
    console.error('password_reset_complete', { status: 'server_error', message: e instanceof Error ? e.message : String(e) });
    res.status(500).json({ error: 'server_error' });
  }
});
