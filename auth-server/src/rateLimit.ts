import rateLimit from 'express-rate-limit';

// Coarse, per-IP abuse guard — a blunt DDoS/hammering defense, not the real
// security boundary. The real boundary is the per-uid cooldown/attempt/resend
// counters enforced in otpStore.ts, which apply regardless of source IP.
export const otpRequestLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'too_many_requests' },
});

export const otpVerifyLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'too_many_requests' },
});

// Same coarse per-IP role as the two above, for the separate password-reset
// flow (routes/passwordReset.ts). The real security boundary there is the
// per-email Firestore logic in passwordResetStore.ts.
export const passwordResetRequestLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'too_many_requests' },
});

export const passwordResetVerifyLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'too_many_requests' },
});

export const passwordResetCompleteLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'too_many_requests' },
});
