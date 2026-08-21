# auth-server

A small Express/TypeScript service with two jobs: server-side email-OTP
verification for the Froshiar app's sign-up flow, and a separate server-side
OTP-based password-reset flow. It is not a general-purpose auth backend.

The client never generates or checks a 6-digit code itself — this service is
the only place that knows what the current code is for either flow.

## What it does

### Email verification (signup)

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

The frontend calls this via `store/authStore.ts`'s `requestOtpForUser` /
`verifyEmailOtp`, using `EXPO_PUBLIC_AUTH_SERVER_URL` (see the root repo's
`.env.example`) as the base URL.

### Password reset

Entirely separate, unauthenticated infrastructure (`passwordResetStore.ts`,
`passwordResetCrypto.ts`, `routes/passwordReset.ts`) — a locked-out user has no
Firebase ID token, so none of these routes require one. All three are keyed by
the requester's email rather than a decoded token's uid.

1. `POST /api/password-reset/request` — body `{ "email": "..." }`. Looks up
   the account via `auth.getUserByEmail`, but runs the exact same
   cooldown/rate-limit transaction and returns the exact same response
   (`{ success: true, expiresInSeconds: 600, cooldownSeconds: 60 }`) whether
   or not the account exists — only whether an email actually gets sent
   differs, which is invisible to the caller. Code stored in Firestore
   (`passwordResetOtps/{emailKey}`) as a salted + peppered hash, same 10-min
   expiry / 60s cooldown / 5-per-hour resend cap as the verification flow.
2. `POST /api/password-reset/verify` — body `{ "email": "...", "code": "123456" }`.
   Same attempt cap (5) and expiry as above. On success, issues a single-use,
   short-lived (10-min) reset-authorization token — its hash is stored in
   `passwordResetAuthorizations/{emailKey}`, the plaintext is returned once in
   the response as `resetToken`.
3. `POST /api/password-reset/complete` — body
   `{ "email": "...", "token": "...", "newPassword": "..." }`. Consumes the
   reset-authorization token (single-use, deleted on success) and, only if
   valid, calls Firebase Admin's `auth.updateUser(uid, { password })`. A
   client can never set a password just by claiming `verified: true` — it
   must hold the server-issued token from step 2.

The frontend calls this via `store/authStore.ts`'s `requestPasswordResetOtp` /
`verifyPasswordResetOtp` / `completePasswordReset`.

### Health check

`GET /api/health` — unauthenticated liveness check, returns `{ ok: true }`.

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
| `PASSWORD_RESET_HASH_PEPPER` | yes | *(none)* | same role as `OTP_HASH_PEPPER`, but for the password-reset OTP + reset-authorization-token hashes; kept separate so the two flows' secrets rotate independently |

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
- **The five secrets are never set in `render.yaml`** — set
  `FIREBASE_SERVICE_ACCOUNT_JSON`, `RESEND_API_KEY`, `RESEND_FROM_ADDRESS`,
  `OTP_HASH_PEPPER`, and `PASSWORD_RESET_HASH_PEPPER` directly in the Render
  dashboard's Environment tab. The server refuses to start without
  `FIREBASE_SERVICE_ACCOUNT_JSON`.

Health check path is `/api/health`.

## Notes

- Stateless — every OTP record lives in Firestore via the Admin SDK, so
  there's no local data directory or volume to mount, unlike
  `online-store/server`.
- CORS is wide open (`cors()` with no options) — intentional, since this
  service has exactly one legitimate caller (the mobile app's `fetch()`, not
  a browser). The actual security boundary on every route is the Firebase ID
  token, not CORS.
