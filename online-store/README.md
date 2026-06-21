# ManagerX Online Store

The public storefront platform behind the "Online Store" feature in the ManagerX app.
Production domain: **managerx.store** (frontend) / **api.managerx.store** (backend) — two
separate deployments on two subdomains of the same domain.

## Architecture

```
managerx.store           ──▶  online-store/client   (Vite + React + Tailwind, static)
                               deployed to Vercel

api.managerx.store       ──▶  online-store/server   (Express + TypeScript API)
                               deployed to any Docker host with persistent disk
```

These are **two independent deployments**, not one process serving both (that was the
local-dev-only shape before a real domain existed). The client is a static SPA — Vercel
serves it directly and it calls the API cross-origin via `VITE_API_BASE_URL`. The server
stores everything in a local JSON ledger (`server/data/stores.json`) via a swappable
`StoreRepository` interface (`server/src/storeRepository.ts` + `jsonStoreRepository.ts`)
— no database account required, but it does need a host with a **persistent disk**, which
rules out Vercel (or any pure serverless platform) for the backend specifically.

## Local development

```bash
cd online-store/server && npm install && npm run dev   # http://localhost:4100
cd online-store/client && npm install && npm run dev   # http://localhost:5174, proxies /api to :4100
```

No `.env` needed for local dev — the client falls back to a relative `/api/...` path that
Vite's dev proxy forwards to the local server. Point ManagerX's `STORE_API_BASE_URL`
(`lib/onlineStore/api.ts`) at `http://<your-LAN-IP>:4100` to test the mobile app against
this local server from a physical device or emulator.

## Production deployment

### 1. Backend → api.managerx.store

This needs a host with a **persistent volume/disk** (the ledger is a local file) — it will
**not** work on pure serverless (Vercel functions, AWS Lambda, etc.) without first swapping
`JsonStoreRepository` for a real DB-backed `StoreRepository`.

- `online-store/server/Dockerfile` — builds and runs the API on any Docker host (Render,
  Fly.io, Railway, DigitalOcean App Platform, a plain VPS via `docker run`). Mount your
  host's persistent volume at `/app/data` or every redeploy wipes all registered stores.
- `online-store/server/render.yaml` — one concrete, ready-to-go example (Render: simple,
  free/cheap tier, has a built-in persistent disk option). Not required if you'd rather
  use a different Docker host — the Dockerfile alone is enough anywhere.
- The server reads `process.env.PORT` if your host sets it (most do), otherwise defaults
  to 4100. `config.local.json` (gitignored, copy from `config.local.json.example`) lets
  you override the CORS `allowedOrigin` for a staging environment — production already
  defaults to `https://managerx.store` and `https://www.managerx.store`, no setup needed.
- `PUBLIC_API_URL` env var (defaults to `https://api.managerx.store`) — used to build the
  absolute URL returned by the image upload endpoint (`POST /:slug/images`), since the
  server can't reliably infer its own public hostname from behind a host's proxy. Already
  set in `render.yaml`; override it (or set it in `config.local.json`) if deploying
  elsewhere or testing against a LAN IP from a physical mobile device.
- Uploaded product/logo images are stored on the same persistent disk as the ledger
  (`data/uploads/{slug}/...`, served statically at `/uploads/...`) — no third-party image
  host needed, but this means the disk mount is now required for images too, not just
  the ledger.
- Once deployed, point the `api` subdomain's DNS at whatever hostname your host gives you
  (see DNS section below) — that host-provided hostname is something only your chosen
  platform can give you after you deploy, so it can't be filled in ahead of time here.

### 2. Frontend → managerx.store

Deploy `online-store/client` to Vercel:

1. **New Project** in the Vercel dashboard → import this repo.
2. **Root Directory**: set to `online-store/client` (this is a monorepo — Vercel needs to
   know the Vite project isn't at the repo root). Vercel auto-detects the Vite framework,
   build command (`vite build`), and output directory (`dist`) once Root Directory is set.
3. **Environment Variables**: add `VITE_API_BASE_URL` = `https://api.managerx.store`
   (must be set before the first deploy that needs it — Vite inlines env vars at build
   time, so changing it later requires a redeploy, not just a config reload).
4. Deploy. `online-store/client/vercel.json` already adds the SPA rewrite so visiting
   `managerx.store/karwan-mobile` directly (not just via in-app navigation) doesn't 404.
5. **Domains** tab → add `managerx.store` and `www.managerx.store` → Vercel shows you the
   exact DNS records to add (see below; use what Vercel shows you if it ever differs from
   these standard published values).

CLI alternative to steps 1–3: `cd online-store/client && vercel --prod`, then set the env
var with `vercel env add VITE_API_BASE_URL production`.

## DNS records

Add these at whichever registrar/DNS provider manages `managerx.store`:

| Type  | Name (host) | Value                       | Purpose |
|-------|-------------|------------------------------|---------|
| A     | `@` (apex)  | `76.76.21.21`                | Vercel — frontend root domain |
| CNAME | `www`       | `cname.vercel-dns.com`       | Vercel — `www` redirect/alias |
| CNAME | `api`       | *(your backend host's hostname, e.g. `your-service.onrender.com`)* | Backend API |

The Vercel values are Vercel's standard published anycast targets — **Vercel's own
dashboard is authoritative**: after you add the domain there (production deployment step
5 above), it will show you the exact records for your account, use those if they ever
differ from the table above. The `api` CNAME target depends entirely on which host you
deploy the backend to (Render, Fly.io, etc. each give you a different hostname after
deploy) — there's no way to know it in advance of actually deploying.

If your registrar doesn't support an A record on the apex domain alongside other records,
use Vercel's ALIAS/ANAME option instead (same dashboard flow — Vercel tells you which to
use based on what it detects about your DNS provider).

DNS propagation can take anywhere from a few minutes to ~48 hours depending on your
registrar and previous TTL settings.

## What I can't do from code

Registering/configuring the actual DNS records, creating a Vercel account or project, and
creating a backend hosting account are all account-level actions outside this codebase —
the config above is everything needed to make those steps mechanical once you're in those
dashboards yourself.

## API contract

- `POST /api/stores` `{ businessName }` → `{ slug, apiKey }` — registers a new store,
  called once by ManagerX the first time "Enable Store" is pressed.
- `GET /api/stores/:slug` (public) → `{ businessName, enabled, products, info }` —
  `products` is already filtered to published items, with `availability` derived from
  stock; `info` holds the store-info fields (description, WhatsApp, address, phone, logo,
  hours, social links) added on top of the original MVP shape.
- `PATCH /api/stores/:slug/status` `{ enabled }` (Bearer API key) — Enable/Disable Store.
- `PATCH /api/stores/:slug/info` `{ ...partial info fields }` (Bearer API key) — partial
  merge update of the store-info fields shown on the storefront header.
- `POST /api/stores/:slug/sync` `{ changes: [...] }` (Bearer API key) — idempotent
  upsert/delete batch, called by ManagerX's offline-first sync queue
  (`lib/onlineStore/syncEngine.ts`) whenever connectivity returns, the app foregrounds,
  ~1.5s after a local change (debounced), every 60s as a safety net, or via the manual
  "Sync Now" button.
- `POST /api/stores/:slug/images` (multipart, field name `image`, Bearer API key) →
  `{ url }` — uploads a product/logo image (jpeg/png/webp, max 5MB) to the server's own
  persistent disk and returns its public URL.
