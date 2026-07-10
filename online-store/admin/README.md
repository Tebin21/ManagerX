# ManagerX Store Control Center

## Overview

The **ManagerX Store Control Center** is an internal, local-only web admin panel for the ManagerX Online Store platform. It is used exclusively by the **Super Admin** (the ManagerX owner) to see and manage every store registered on the platform in one place — it is not a public website and is never meant to be exposed to store owners or customers.

It gives the Super Admin:

- A live dashboard of statistics and charts across every store (active/suspended/deleted counts, subscription status, products, sync activity, etc.)
- A searchable, filterable table of every online store with quick actions (suspend, activate, reset API key, delete)
- A detail page per store (health signals, storage usage, connected device, subscription info, recent activity, an inline edit form)
- A system-wide activity log of every admin action
- Backup creation/restore and JSON/CSV export of the store ledger

The project has two parts that work together:

| Part | Location | What it is |
|---|---|---|
| **Backend API** | `online-store/server` | The existing Express/TypeScript API that already runs the public Online Store platform. This project added a new `/api/admin/*` section to it. |
| **Admin Dashboard** | `online-store/admin` | The new Next.js app described in this README — the actual Control Center UI. |

The dashboard never talks to the backend directly from the browser. It always goes through its own server, which is the only place that holds the secret key the backend requires (see [Security](#security)).

---

## Requirements

- **Node.js 20.9 or newer** (required by Next.js 16 — Node 18 is not supported)
- **npm** (both projects use `package-lock.json`; do not mix in yarn/pnpm)
- A terminal that can run two processes at once (the backend and the dashboard must both be running)
- Windows, macOS, or Linux — no OS-specific setup is required

Check your versions:

```bash
node -v
npm -v
```

---

## Installation

Run these from the repository root (`ManagerX/`), in order.

### 1. Install backend dependencies

```bash
cd online-store/server
npm install
```

### 2. Install admin dashboard dependencies

```bash
cd online-store/admin
npm install
```

That's it — there is no separate "root" install step required for these two projects; each has its own `package.json` and `package-lock.json`.

---

## Environment Configuration

Two separate config files are required — one per project. **Both are gitignored and must never be committed.**

### `online-store/server/config.local.json`

The backend loads this file for local development overrides (see `online-store/server/src/config.ts`). Copy the example and fill it in:

```bash
cd online-store/server
cp config.local.json.example config.local.json
```

| Key | Meaning | Example |
|---|---|---|
| `port` | Port the backend listens on | `4100` |
| `allowedOrigin` | CORS origin allowed to call the public API (the storefront) | `http://localhost:5174` |
| `publicApiUrl` | The backend's own public base URL, used to build image URLs | `http://localhost:4100` |
| `adminApiKey` | Shared secret the admin dashboard must send to use `/api/admin/*`. **Generate a long random value — never leave the placeholder in place.** | `6f3a35b43292f18ed4c496a2e9b9ed0bef463a89db6b0866` |

Generate a random `adminApiKey`:

```bash
node -e "console.log(require('crypto').randomBytes(24).toString('hex'))"
```

You can also set any of these via environment variables instead of the file — `PORT`, `PUBLIC_API_URL`, `ADMIN_API_KEY` — which take priority over `config.local.json`.

### `online-store/admin/.env.local`

The dashboard loads this automatically (standard Next.js `.env.local` behavior). Copy the example and fill it in:

```bash
cd online-store/admin
cp .env.local.example .env.local
```

| Variable | Meaning | Example |
|---|---|---|
| `ADMIN_DASHBOARD_PASSWORD` | The Super Admin login password for this dashboard | `devpassword123` |
| `SESSION_SECRET` | Signs the login session cookie. Any long random string. Changing it logs everyone out. | `a9f3...` (32+ random characters) |
| `ONLINE_STORE_API_URL` | Base URL of the backend from step above | `http://localhost:4100` |
| `ONLINE_STORE_ADMIN_API_KEY` | **Must exactly match** `adminApiKey` in `online-store/server/config.local.json` | `6f3a35b43292f18ed4c496a2e9b9ed0bef463a89db6b0866` |
| `NEXT_PUBLIC_STOREFRONT_BASE_URL` | Public storefront base URL, used for "View Website" links and the live health check | `https://managerx.store` |

Generate a random `SESSION_SECRET`:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

> **Important:** `ONLINE_STORE_ADMIN_API_KEY` (admin `.env.local`) and `adminApiKey` (server `config.local.json`) are the same secret in two places. If they don't match exactly, every dashboard page will fail to load data with a `401 Invalid admin key` error.

---

## Super Admin Login

- **Dashboard URL:** `http://localhost:4200`
- **Username:** none — this dashboard is **password-only**. There is a single Super Admin identity; no separate user accounts or usernames exist.
- **Password:** whatever you set as `ADMIN_DASHBOARD_PASSWORD` in `online-store/admin/.env.local`.

### How login works

1. You open `http://localhost:4200` and are redirected to `/login` (enforced by `proxy.ts`, which checks for a valid session cookie on every request).
2. You submit the password on the login form.
3. The server compares it against `ADMIN_DASHBOARD_PASSWORD` using a timing-safe comparison and, if correct, sets an `httpOnly` session cookie signed with `SESSION_SECRET`.
4. That cookie is what grants access to every dashboard page and API route for the next 12 hours (or until you log out).

### How to change the password

1. Open `online-store/admin/.env.local`.
2. Change the value of `ADMIN_DASHBOARD_PASSWORD`.
3. Restart the dashboard dev server (`Ctrl+C`, then `npm run dev` again) — environment variables are only read at startup.
4. Anyone with an existing session stays logged in until it expires (12 hours) or you also rotate `SESSION_SECRET`, which immediately invalidates every session.

### How to generate a stronger password

```bash
node -e "console.log(require('crypto').randomBytes(18).toString('base64'))"
```

or, if you have OpenSSL available:

```bash
openssl rand -base64 24
```

---

## Running the Project

You need **two terminals** — the backend and the dashboard are separate processes and both must be running.

### Terminal 1 — Backend

```bash
cd online-store/server
npm run dev
```

Runs on **http://localhost:4100** (via `tsx watch`, auto-restarts on file changes).

### Terminal 2 — Admin Dashboard

```bash
cd online-store/admin
npm run dev
```

Runs on **http://localhost:4200** (Next.js dev server with Turbopack, auto-reloads on file changes).

Once both are running, open **http://localhost:4200** in your browser and log in.

### Production-style run (optional, for testing a build)

```bash
# Backend
cd online-store/server
npm run build
npm start

# Dashboard
cd online-store/admin
npm run build
npm start
```

---

## Features

### Dashboard (`/`)
Live statistics cards — Total Stores, Active Stores, Expired Subscriptions, Suspended Stores, Deleted Stores, Total Products, Total Categories, Total Sync Requests, Failed Syncs, Created Today/This Month — plus charts for new stores per month, active vs. suspended vs. disabled, subscription status, daily sync failures, and a best-effort products-growth chart. All numbers are computed from real backend data, not mocked.

### Stores (`/stores`)
A searchable table of every store (search by name, slug, or phone) with filter chips: All, Active, Suspended, Expired, Has Errors, Never Synced, Recently Created, Deleted. Each row links to the store's detail page and has a quick-actions menu.

### Store Details (`/stores/[slug]`)
Full profile for one store: status badges, website link, copy-URL/copy-slug buttons, product/category/sync/storage stats, an inline **Edit Store** form (name, description, address, phone, WhatsApp, logo, social links, theme color), a **Store Health** panel (website reachability, admin API connectivity, recent sync activity, subscription validity, a sample image reachability check), connected device info, subscription info, and a recent-activity feed for that store.

### Suspend / Activate
Suspending a store blocks its owner from editing info, syncing products, or re-enabling it (the backend returns `423 Locked`) — but its public storefront keeps rendering normally, matching "website stays online, no editing/syncing." Activating lifts the block immediately.

### Delete
Permanently removes a store and its uploaded images. Requires typing the literal word `DELETE` in a confirmation dialog before the button enables — this is also independently re-checked by the backend, so it can never be triggered accidentally by a UI bug. A tombstone record is kept (visible under the "Deleted" filter) so the store's prior existence is never silently lost.

### Reset API Key
Issues a brand-new API key for a store and shows it once in a modal. The store's ManagerX mobile app must be updated with the new key to keep syncing.

### Activity Logs (`/activity`)
A system-wide, time-ordered feed of every admin action (suspend, activate, delete, reset key, backup create/restore) plus store creation and sync failures — each entry shows time, actor, IP address, and action.

### Backups (`/backups`)
Create a point-in-time snapshot of the entire store ledger, list past backups, download any of them, or restore one (also requires typing a confirmation word — `RESTORE`). Uploaded images are not included in snapshots; they already live separately on the server's persistent disk.

### Export JSON / Export CSV
One-click downloads of the full store ledger (JSON) or a flattened summary table (CSV, opens directly in Excel).

### Subscription View (`/subscriptions`)
A read-only table of every store's subscription plan, status, and expiry. This is intentionally **view-only** — subscription codes are Ed25519 tokens generated externally (in `license-admin-panel`) and are never stored as mutable state in this system, so there is no renew/extend action here.

---

## Security

- **Session cookies:** Login issues an `httpOnly`, `SameSite=Lax` cookie whose value is a timestamp signed with `SESSION_SECRET` (HMAC-SHA256). It cannot be read or forged from JavaScript in the browser, and it self-expires after 12 hours.
- **Admin authentication:** Every dashboard route is protected twice — once optimistically by `proxy.ts` (redirects unauthenticated requests to `/login` before any page renders), and again inside every API route handler (`hasValidSession()`), per Next.js's own guidance not to rely on the proxy layer alone.
- **Shared admin secret:** The backend's `/api/admin/*` endpoints are separately protected by a static shared secret (`ADMIN_API_KEY` / `adminApiKey`), checked with a timing-safe comparison in `online-store/server/src/adminAuth.ts`. This is a **server-to-server** credential, unrelated to your login password.
- **Why the admin key never reaches the browser:** The Next.js app's browser-facing pages and buttons only ever call the dashboard's *own* `/api/admin/[...path]` route. That route runs on the dashboard's server and is the only piece of code that attaches `Authorization: Bearer <ONLINE_STORE_ADMIN_API_KEY>` to the outgoing request to the backend. The key lives only in `online-store/admin/.env.local` (a server-only environment variable with no `NEXT_PUBLIC_` prefix) and is never included in any HTML, JavaScript bundle, or client-visible response.
- **Destructive actions** (Delete, Restore Backup) require typing a literal confirmation word client-side **and** the same value is re-checked server-side — a UI bug alone cannot trigger them.

---

## Folder Structure

```
online-store/
├── server/                       # Express/TypeScript backend (existing, extended)
│   ├── src/
│   │   ├── routes/
│   │   │   ├── stores.ts         # Public store API (used by the ManagerX mobile app + storefront)
│   │   │   └── admin.ts          # NEW — /api/admin/* endpoints powering this dashboard
│   │   ├── adminAuth.ts          # NEW — shared-secret auth for /api/admin/*
│   │   ├── activityLog.ts        # NEW — append-only admin activity log
│   │   ├── storeRepository.ts    # Data model / repository interface
│   │   ├── jsonStoreRepository.ts# JSON-file-backed implementation
│   │   └── config.ts             # Loads config.local.json / env vars
│   ├── data/                     # Runtime data (gitignored): stores.json, activity-log.json, backups/
│   └── config.local.json         # Your local secrets (gitignored) — see Environment Configuration
│
├── admin/                        # THIS PROJECT — Next.js Control Center
│   ├── app/
│   │   ├── login/                # Login page (public)
│   │   ├── (dashboard)/          # Everything behind login: Dashboard, Stores, Activity, Subscriptions, Backups
│   │   └── api/
│   │       ├── auth/             # login/logout Route Handlers
│   │       └── admin/[...path]/  # Proxy to the backend's /api/admin/*
│   ├── components/                # StatCard, StoreTable, ConfirmDangerDialog, charts, etc.
│   ├── lib/                       # auth.ts, backend.ts, apiClient.ts, stats.ts, health.ts, types.ts
│   ├── proxy.ts                   # Route protection (Next.js 16's replacement for middleware.ts)
│   └── .env.local                 # Your local secrets (gitignored) — see Environment Configuration
│
└── client/                       # The PUBLIC storefront (separate Vite/React app) — not part of this dashboard
```

---

## Troubleshooting

**Cannot log in / "Incorrect password"**
Check that `ADMIN_DASHBOARD_PASSWORD` in `online-store/admin/.env.local` matches exactly what you're typing, then restart the dashboard's dev server (env vars are only read at startup).

**Dashboard loads but every page shows an error / "Invalid admin key" / 401**
`ONLINE_STORE_ADMIN_API_KEY` in `online-store/admin/.env.local` doesn't match `adminApiKey` in `online-store/server/config.local.json`. They must be identical strings. Fix one to match the other and restart both servers.

**"Backend not running" / dashboard pages hang or show a fetch error**
The dashboard needs the backend running on the URL in `ONLINE_STORE_API_URL` (default `http://localhost:4100`). Start it: `cd online-store/server && npm run dev`, then confirm with `curl http://localhost:4100/api/health` — it should return `{"ok":true}`.

**"Port already in use" (4100 or 4200)**
Something else is already listening on that port. Either stop it, or override the port:
- Backend: set `"port"` in `config.local.json` (or `PORT=4101 npm run dev`)
- Dashboard: `npm run dev -- -p 4300` (also update `ONLINE_STORE_API_URL`/`NEXT_PUBLIC_STOREFRONT_BASE_URL` references accordingly if you change the backend's port)

**"Environment variables missing" / server crashes on startup with an error naming an env var**
`ADMIN_DASHBOARD_PASSWORD`, `SESSION_SECRET`, and `ONLINE_STORE_ADMIN_API_KEY` are required — the app deliberately throws rather than silently allowing an unauthenticated or misconfigured admin panel. Copy `.env.local.example` to `.env.local` and fill in every value.

**Permission denied (Windows, writing to `data/` or `config.local.json`)**
Make sure no other process (an editor, antivirus, a previous `npm run dev` you forgot to stop) has the file open, and that your user account has write access to the `online-store/server` folder. On OneDrive-synced checkouts, a brief file lock from sync/indexing is normal and the backend automatically retries — if it persists, pause OneDrive sync for that folder.

**Login works but I get redirected back to `/login` immediately**
Your session cookie likely didn't get set — check the browser isn't blocking third-party/local cookies, and that you're accessing the dashboard via `http://localhost:4200` consistently (not mixing `localhost` and `127.0.0.1`, which browsers treat as different origins for cookies).

---

## Development Notes

- The backend (`online-store/server`) and dashboard (`online-store/admin`) are independent projects with separate `package.json`/`package-lock.json` files — install and update their dependencies separately.
- Both `npm run dev` commands auto-reload on file changes; you do not need to restart them for code edits — only for `.env.local` / `config.local.json` changes.
- `lib/types.ts` in the admin app manually mirrors the backend's response shapes (it isn't generated). If you change a field in `online-store/server/src/storeRepository.ts` or `routes/admin.ts`, update `online-store/admin/lib/types.ts` to match.
- Run `npm run lint` and `npm run build` in `online-store/admin` before committing UI changes — this project intentionally keeps ESLint's stricter React rules (e.g. no impure calls during render) enabled.
- Run `npm run build` in `online-store/server` to typecheck backend changes (`tsc` — there is no separate lint step there).
- All runtime data lives in `online-store/server/data/` (`stores.json`, `activity-log.json`, `deleted-stores.json`, `backups/`) — this entire folder is gitignored. Deleting it resets the platform to empty.

---

## Production Notes

Before deploying this anywhere beyond your local machine:

- **Change the default password.** `devpassword123` (or whatever is currently in `.env.local`) is a local development value only. Set a strong, unique `ADMIN_DASHBOARD_PASSWORD`.
- **Generate fresh, unique secrets** for `SESSION_SECRET` and `adminApiKey`/`ONLINE_STORE_ADMIN_API_KEY` — do not reuse the values from this README or any development environment.
- **Never commit `.env.local` or `config.local.json`.** Both are gitignored by default; do not force-add them, and do not paste real secrets into commit messages, issues, or chat.
- **Never expose the admin API or admin secret publicly.** `online-store/server`'s `/api/admin/*` routes should only ever be reachable from the dashboard's own server — do not open port 4100's admin routes to the public internet without a firewall/network boundary in front of them, and do not send `ONLINE_STORE_ADMIN_API_KEY` from any browser-side code.
- **Serve the dashboard over HTTPS in production** and set `FORCE_HTTPS=true` (see `online-store/admin/lib/auth.ts`) so the session cookie is marked `Secure`.
- **Restrict network access** to the dashboard (e.g., VPN, IP allowlist, or a reverse proxy with its own auth) — this app has a single shared password and no rate limiting or multi-factor auth, which is appropriate for a trusted local/internal tool but not for public internet exposure.
- Run both projects with `npm run build && npm start` rather than `npm run dev` in production.

---

## Default Development Credentials

These are the credentials currently configured in this local development environment (`online-store/admin/.env.local`):

- **Dashboard URL:** `http://localhost:4200`
- **Username:** *(none — password-only login, no username field exists)*
- **Password:** `devpassword123`

Change this password before sharing access with anyone else or deploying this project anywhere beyond your own machine — see [Super Admin Login](#super-admin-login) and [Production Notes](#production-notes) above.
