// Non-blocking speculative pre-warming for the standalone auth-server.
// Render spins down idle instances after 15 minutes. By pinging the healthcheck
// with warm=1 as soon as an onboarding or auth screen mounts, the backend
// container wakes up and pre-connects to Firestore and Firebase Auth while the
// user is still reading or typing, eliminating the 15-30s cold-start penalty.

let lastWarmupTime = 0;
const WARMUP_THROTTLE_MS = 60 * 1000; // Throttle to at most once per 60 seconds

export const AUTH_SERVER_FALLBACK_URL = 'https://froshiar-auth-api-prod.onrender.com';

export function getAuthServerUrl(): string {
  const envUrl = process.env.EXPO_PUBLIC_AUTH_SERVER_URL;
  if (typeof envUrl === 'string' && envUrl.trim().length > 0) {
    return envUrl.trim().replace(/\/+$/, '');
  }
  return AUTH_SERVER_FALLBACK_URL;
}

export function warmUpAuthServer(): void {
  const now = Date.now();
  if (now - lastWarmupTime < WARMUP_THROTTLE_MS) return;
  lastWarmupTime = now;

  const serverUrl = getAuthServerUrl();
  if (!serverUrl) return;

  fetch(`${serverUrl}/api/health?warm=1`, {
    method: 'GET',
    headers: { 'Cache-Control': 'no-cache' },
  }).catch(() => {
    // Silent catch — warmup is strictly speculative and best-effort
  });
}
