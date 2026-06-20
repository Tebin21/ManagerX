# ManagerX License Admin Panel

Local, owner-only web app for generating and managing device-bound ManagerX licenses.
Replaces running `node scripts/license-admin/generate-license.js` by hand — both still
read/write the exact same key and ledger files, so they stay interchangeable.

## First-time setup

```bash
cd license-admin-panel
npm run install:all
```

The server reads the admin password from `server/.env` (already created with a generated
password — open that file to see/change it). It signs licenses using the existing key at
`../scripts/license-admin/keys/private-key.json` and reads/writes the existing ledger at
`../scripts/license-admin/licenses.json` — nothing new to generate.

## Running

```bash
npm run dev
```

Starts the API server on `http://localhost:4000` and the web app on `http://localhost:5173`.
Open the second URL and log in with the password from `server/.env`.

## Architecture

- `server/` — Express + TypeScript. Holds the private signing key; the browser never sees
  it. `licenseRepository.ts` is a small interface — `jsonLicenseRepository.ts` (local file)
  and `supabaseLicenseRepository.ts` (production) both implement it; `repositoryFactory.ts`
  picks whichever one based on whether `SUPABASE_URL`/`SUPABASE_SERVICE_ROLE_KEY` are set.
- `client/` — Vite + React + TypeScript + Tailwind. Talks to the server only over HTTP
  (`/api` via Vite's dev proxy locally; `VITE_API_URL` directly in production).

Revoking/expiring a license here only updates your own records — ManagerX is fully
offline and never checks in with a server, so this cannot remotely deactivate a
customer's already-activated app.

## Production deployment (Vercel + Railway + Supabase)

### Architecture

```
 iPhone / MacBook / Windows / anywhere
            │  HTTPS
            ▼
   Vercel (React SPA, client/)
            │  fetch(VITE_API_URL + "/api/...", credentials: include)
            ▼
   Railway (Express API, server/)
     - holds ADMIN_PASSWORD, session map, LICENSE_PRIVATE_KEY_BASE64
     - the only place that ever signs a license
            │  service-role client
            ▼
   Supabase (Postgres: customers, licenses)
```
The ManagerX mobile app is *not* part of this — it ships only the public key and verifies
license codes entirely offline, with no connection to Railway or Supabase.

### 1. Supabase

Create a project, then run in the SQL editor:

```sql
create table customers (
  id uuid primary key default gen_random_uuid(),
  customer_name text not null default '',
  phone text not null unique,
  created_at timestamptz not null default now()
);

create table licenses (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references customers(id) on delete cascade,
  device_id text not null,
  license_code text not null unique,
  plan text not null check (plan in ('basic','plus','pro','business','unlimited')),
  status text not null default 'active' check (status in ('active','revoked','expired')),
  created_at timestamptz not null default now(),
  activated_at timestamptz,
  notes text not null default '',
  revoked_at timestamptz,
  revoked_reason text
);

create index licenses_customer_id_idx on licenses (customer_id);
create index licenses_device_id_idx on licenses (device_id);

alter table customers enable row level security;
alter table licenses enable row level security;
-- No policies added: only the service-role key (server-side only) can read/write.
```

Copy the **Project URL** and the **`service_role`** key (Settings → API) — never the `anon` key.

### 2. Railway (backend)

Deploy this repo to a new Railway project. `railway.json` at the repo root already
configures the build/start commands to target `license-admin-panel/server` while building
from the repo root (so it can still see `lib/license/licenseCore.js` and
`scripts/license-admin/`).

Set these environment variables in the Railway dashboard:

| Variable | Value |
|---|---|
| `NODE_ENV` | `production` |
| `ADMIN_PASSWORD` | `bexdre@tebin` |
| `CLIENT_ORIGIN` | `https://<your-vercel-app>.vercel.app` (comma-separate to add a custom domain later) |
| `LICENSE_PRIVATE_KEY_BASE64` | the `secretKeyBase64` value from `scripts/license-admin/keys/private-key.json` |
| `SUPABASE_URL` | from step 1 |
| `SUPABASE_SERVICE_ROLE_KEY` | from step 1 |

Deploy, then note the generated `*.up.railway.app` URL.

### 3. Migrate existing local data (optional, one time)

If you have real licenses in the local JSON ledger you want to keep, add the same
`SUPABASE_URL`/`SUPABASE_SERVICE_ROLE_KEY` to `server/.env` locally and run:

```bash
npm run migrate --prefix server
```

Safe to re-run — already-migrated license codes are skipped, customers are upserted by
phone number.

### 4. Vercel (frontend)

New Vercel project, root directory `license-admin-panel/client`. Set:

| Variable | Value |
|---|---|
| `VITE_API_URL` | `https://<your-railway-app>.up.railway.app/api` |

Deploy, note the `*.vercel.app` URL, then go back to Railway and update `CLIENT_ORIGIN`
to that exact URL (redeploy Railway after).

### 5. Custom domain (later)

In Vercel: Settings → Domains → add `licenses.bexdre.com` (or
`managerx-license.bexdre.com`) → add the CNAME it gives you with your DNS provider. Then
add the same hostname to Railway's `CLIENT_ORIGIN` (comma-separated) and redeploy. No
code changes needed for this — that's exactly what the comma-separated origin list is for.

### Security notes

- `LICENSE_PRIVATE_KEY_BASE64` and `SUPABASE_SERVICE_ROLE_KEY` are the two most sensitive
  values in this project — Railway env vars only, never committed, never logged.
- The session cookie is `Secure; SameSite=None` in production (required for the
  cross-origin Vercel↔Railway split) and only works over HTTPS — both platforms provide
  this by default.
- Rotate `ADMIN_PASSWORD` periodically; it's the only gate on a tool that can mint licenses.
