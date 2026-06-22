# ManagerX License Admin Panel

Local, owner-only web app for generating and managing device-bound ManagerX licenses.
Replaces running `node scripts/license-admin/generate-license.js` by hand — both still
read/write the exact same key and ledger files, so they stay interchangeable.

This is a **fully local, standalone application** — no Railway, no Vercel, no Docker,
no cloud database, no environment variables. See [README_LOCAL.md](./README_LOCAL.md)
for setup and day-to-day usage.

## Architecture

- `server/` — Express + TypeScript. Holds the private signing key; the browser never
  sees it. All settings (admin password, port, allowed origin) come from
  `server/config.local.json` — see `server/src/config.ts` for the loader.
  Current admin password: `change-me`.
  `licenseRepository.ts` is a small interface implemented by `jsonLicenseRepository.ts`,
  which reads/writes the local JSON ledger at `scripts/license-admin/licenses.json`.
- `client/` — Vite + React + TypeScript + Tailwind. Talks to the server only over
  `/api`, proxied by Vite's dev server to `http://localhost:4000`.

Revoking/expiring a license here only updates your own records — ManagerX is fully
offline and never checks in with a server, so this cannot remotely deactivate a
customer's already-activated app.
