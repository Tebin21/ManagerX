# auth-server

A small Express/TypeScript service that does exactly one job: server-side
email-OTP verification for the Froshiar app's sign-up flow. It does **not**
handle password reset (that stays on Firebase's own `sendPasswordResetEmail` /
default-hosted action page, called directly from the client) and it is not a
general-purpose auth backend.

The client never generates or checks the 6-digit code itself — this service
is the only place that knows what the current code is, and the only place
that flips `emailVerified` on the Firebase Auth user once it's confirmed.

## What it does

1. `POST /api/otp/request` — requires a valid Firebase ID token
   (`Authorization: Bearer <idToken>`). Generates a 6-digit code, stores a
   salted + peppered hash of it in Firestore (`otpVerifications/{uid}`), and
   emails it via Resend. Rate-limited both per-IP (`express-rate-limit`) and
   per-uid (60s resend cooldown, 5 resends/hour, enforced in `otpStore.ts`).
2. `POST /api/otp/verify` — requires the same Firebase ID token plus
   `{ "code": "123456" }` in the body. Validates the code against the stored
   hash (max 5 attempts, 10-minute expiry). On success, calls Firebase
   Admin's `auth.updateUser(uid, { emailVerified: true })` and deletes the
   OTP record.
3. `GET /api/health` — unauthenticated liveness check, returns `{ ok: true }`.

The frontend calls this via `store/authStore.ts`'s `requestOtpForUser` /
`verifyEmailOtp`, using `EXPO_PUBLIC_AUTH_SERVER_URL` (see the root repo's
`.env.example`) as the base URL.

## Local development

```bash
cd auth-server
npm install
cp config.local.json.example config.local.json
# edit config.local.json — paste in a real Firebase service-account JSON
# (Firebase Console > Project Settings > Service Accounts > Generate new
# private key) and a Resend API key. config.local.json is gitignored.
npm run dev
```

`config.local.json` is only for local dev. In production every value comes
from real environment variables instead (see below) — `config.ts` prefers
`process.env.*` over the file, and the file doesn't exist at all in the
deployed container.

## Environment variables

| Var | Required | Default | Purpose |
|---|---|---|---|
| `PORT` | no | `4200` | listen port |
| `FIREBASE_PROJECT_ID` | no | `managerx-bac3a` | Firebase project |
| `FIREBASE_SERVICE_ACCOUNT_JSON` | **yes** | *(none — boot fails loudly if empty)* | full Firebase service-account key JSON, as a single-line string |
| `RESEND_API_KEY` | yes | *(none)* | Resend API key used to send the OTP email |
| `RESEND_FROM_ADDRESS` | no | `support@froshiar.store` | sender address for OTP emails |
| `OTP_HASH_PEPPER` | yes | *(none)* | server-only secret mixed into every OTP hash; without it, a Firestore-only data leak could be used to precompute the 6-digit code space offline |

See `.env.example` in this folder for a template, or `config.local.json.example`
for the local-dev JSON-file equivalent.

## Deploying (Render)

`render.yaml` in this folder is a Render Blueprint (Render dashboard → New →
Blueprint → point at this repo). It deploys as its own service
(`froshiar-auth-api`), deliberately separate from the `online-store-api`
service, so this service's Firebase Admin credential never shares a
deploy/secret surface with the Online Store product's admin API key.

Two things that are easy to get wrong when setting this up manually instead
of via the blueprint:

- **Docker build context must be the repo root**, not `auth-server/` — the
  Dockerfile's `COPY` paths are written relative to the root (e.g.
  `COPY auth-server/package*.json ./`). In Render's dashboard, both "Root
  Directory" and "Docker Build Context Directory" must be blank/`.`.
- **The four secrets are never set in `render.yaml`** — set
  `FIREBASE_SERVICE_ACCOUNT_JSON`, `RESEND_API_KEY`, `RESEND_FROM_ADDRESS`,
  and `OTP_HASH_PEPPER` directly in the Render dashboard's Environment tab.
  The server refuses to start without `FIREBASE_SERVICE_ACCOUNT_JSON`.

Health check path is `/api/health`.

## Notes

- Stateless — every OTP record lives in Firestore via the Admin SDK, so
  there's no local data directory or volume to mount, unlike
  `online-store/server`.
- CORS is wide open (`cors()` with no options) — intentional, since this
  service has exactly one legitimate caller (the mobile app's `fetch()`, not
  a browser). The actual security boundary on every route is the Firebase ID
  token, not CORS.
