# ManagerX Online Store

The public storefront platform behind the "Online Store" feature in the ManagerX app.
Mirrors `license-admin-panel/`'s split: a small Express+TypeScript API (`server/`) and a
Vite+React+TypeScript storefront (`client/`).

## Architecture

- `server/` — Express + TypeScript. Stores everything in a local JSON ledger
  (`server/data/stores.json`, gitignored) via `JsonStoreRepository` — no database
  account required to run it. `storeRepository.ts` defines the storage interface, so a
  Postgres/Supabase-backed implementation can be dropped in later without touching any
  routes. Each store gets a random API key (hashed before storing) generated at
  registration; ManagerX uses it to authenticate sync/status calls.
- `client/` — Vite + React + TypeScript + Tailwind. A single page
  (`src/pages/StorefrontPage.tsx`) reads the slug straight from the URL
  (`store.managerx.app/<slug>`) and fetches `GET /api/stores/:slug`. No build step is
  store-specific — one deployed client serves every store.

## Local development

```bash
cd online-store/server && npm install && npm run dev   # http://localhost:4100
cd online-store/client && npm install && npm run dev   # http://localhost:5174, proxies /api to :4100
```

Point ManagerX's `STORE_API_BASE_URL` (lib/onlineStore/api.ts) at `http://<your-LAN-IP>:4100`
to test the mobile app against this local server from a physical device or emulator.

## Production deployment

`npm run build` in both `server/` and `client/`, then `npm start` in `server/` — it serves
the built client itself (static files + a catch-all to `index.html`) alongside the API, so
the whole thing is **one deployable Node process** on one port.

Two things this repo cannot do for you, since they're account-level actions outside code:

1. **Hosting.** This needs a host with a persistent disk — the default storage is a local
   JSON file, not a hosted database. A small VPS, Render/Fly.io with a persistent volume,
   or a home server all work. It will **not** work as-is on pure serverless platforms
   (e.g. Vercel functions) because the filesystem isn't persisted between requests there.
   If you need serverless, swap `JsonStoreRepository` for a DB-backed implementation of
   `StoreRepository` first.
2. **DNS.** Pointing `store.managerx.app` at wherever you deploy this is a manual step in
   your domain registrar / DNS provider, done once the server is actually running
   somewhere with a stable address.

Optional: copy `server/config.local.json.example` to `server/config.local.json` to change
the port or CORS `allowedOrigin` — neither is required to start, since defaults are
already wired up (port `4100`, origin `*`).

## API contract

- `POST /api/stores` `{ businessName }` → `{ slug, apiKey }` — registers a new store,
  called once by ManagerX the first time "Enable Store" is pressed.
- `GET /api/stores/:slug` (public) → `{ businessName, enabled, products }` — `products`
  is already filtered to published items, with `availability` derived from stock.
- `PATCH /api/stores/:slug/status` `{ enabled }` (Bearer API key) — Enable/Disable Store.
- `POST /api/stores/:slug/sync` `{ changes: [...] }` (Bearer API key) — idempotent
  upsert/delete batch, called by ManagerX's offline-first sync queue
  (`lib/onlineStore/syncEngine.ts`) whenever connectivity returns.
