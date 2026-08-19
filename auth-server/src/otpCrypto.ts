import crypto from 'crypto';

// crypto.randomInt (not Math.random) — cryptographically secure, uniformly
// distributed over [0, 1_000_000).
export function generateOtp(): string {
  return crypto.randomInt(0, 1_000_000).toString().padStart(6, '0');
}

export function generateSalt(): string {
  return crypto.randomBytes(16).toString('hex');
}

// The 6-digit code itself is never stored — only this hash + the salt. Note the
// hash alone doesn't defend against brute force (10^6 space is small); the real
// defenses are the attempt cap and cooldown/rate limits enforced in otpStore.ts.
// The pepper (server-env-only, never in Firestore) is what stops an attacker who
// only has read access to the Firestore data from precomputing/verifying guesses.
export function hashOtp(code: string, salt: string, pepper: string): string {
  return crypto.createHash('sha256').update(`${pepper}:${salt}:${code}`).digest('hex');
}

export function timingSafeEqualHash(a: string, b: string): boolean {
  const aBuf = Buffer.from(a);
  const bBuf = Buffer.from(b);
  if (aBuf.length !== bBuf.length) {
    // Still run a comparison of equal length to avoid an early-exit timing signal.
    crypto.timingSafeEqual(aBuf, aBuf);
    return false;
  }
  return crypto.timingSafeEqual(aBuf, bBuf);
}
