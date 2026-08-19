import { Router } from 'express';
import type { Response } from 'express';
import { verifyFirebaseToken, type AuthedRequest } from '../verifyFirebaseToken';
import { otpRequestLimiter, otpVerifyLimiter } from '../rateLimit';
import { requestOtp, verifyOtp } from '../otpStore';
import { sendOtpEmail } from '../email';
import { auth } from '../firebaseAdmin';

export const otpRouter = Router();

otpRouter.post('/request', otpRequestLimiter, verifyFirebaseToken, async (req: AuthedRequest, res: Response) => {
  const { uid, email } = req;
  if (!uid || !email) {
    res.status(401).json({ error: 'invalid_token' });
    return;
  }

  try {
    const result = await requestOtp(uid, email);

    if (result.status === 'cooldown' || result.status === 'rate_limited') {
      console.log('otp_request', { uid, status: result.status });
      res.status(429).json({ error: result.status, retryAfterSeconds: result.retryAfterSeconds });
      return;
    }

    // result.code exists only in this local variable — never logged, never
    // included in any response.
    const sendResult = await sendOtpEmail(email, result.code);
    if (!sendResult.ok) {
      console.error('otp_request', { uid, status: 'email_send_failed', reason: sendResult.reason });
      res.status(502).json({ error: 'email_send_failed' });
      return;
    }

    console.log('otp_request', { uid, status: 'sent' });
    res.json({ success: true, expiresInSeconds: 600, cooldownSeconds: 60 });
  } catch (e) {
    console.error('otp_request', { uid, status: 'server_error', message: e instanceof Error ? e.message : String(e) });
    res.status(500).json({ error: 'server_error' });
  }
});

otpRouter.post('/verify', otpVerifyLimiter, verifyFirebaseToken, async (req: AuthedRequest, res: Response) => {
  const { uid } = req;
  const code = typeof req.body?.code === 'string' ? req.body.code.trim() : '';

  if (!uid) {
    res.status(401).json({ error: 'invalid_token' });
    return;
  }
  if (!/^\d{6}$/.test(code)) {
    res.status(400).json({ error: 'invalid_code' });
    return;
  }

  try {
    const result = await verifyOtp(uid, code);

    switch (result.status) {
      case 'no_pending_otp':
        res.status(400).json({ error: 'no_pending_otp' });
        return;
      case 'too_many_attempts':
        console.log('otp_verify', { uid, status: 'too_many_attempts' });
        res.status(429).json({ error: 'too_many_attempts' });
        return;
      case 'expired':
        res.status(400).json({ error: 'expired' });
        return;
      case 'invalid_code':
        console.log('otp_verify', { uid, status: 'invalid_code' });
        res.status(400).json({ error: 'invalid_code', attemptsRemaining: result.attemptsRemaining });
        return;
      case 'verified':
        await auth.updateUser(uid, { emailVerified: true });
        console.log('otp_verify', { uid, status: 'verified' });
        res.json({ success: true });
        return;
    }
  } catch (e) {
    console.error('otp_verify', { uid, status: 'server_error', message: e instanceof Error ? e.message : String(e) });
    res.status(500).json({ error: 'server_error' });
  }
});
