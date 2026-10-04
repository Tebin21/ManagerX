# Froshiar Online Store

The public storefront platform behind the "Online Store" feature in the Froshiar app.
Production domain: **froshiar.store** (frontend) / **api.froshiar.store** (backend) — two
separate deployments on two subdomains of the same domain.
## Architecture

```
froshiar.store           ──▶  online-store/client   (Vite + React + Tailwind SPA)
                                deployed to Vercel

api.froshiar.store       ──▶  online-store/server   (Vercel Serverless Function)
                                backed by Neon PostgreSQL + Cloudflare R2
```

The frontend and backend run serverlessly on Vercel:
- **Database:** Neon PostgreSQL (`sweet-dawn-41011171`), branch `production`. Every store is scoped by `store_id` (strict tenant isolation).
- **Storage:** Cloudflare R2 (bucket `froshiar`), private S3-compatible media storage streamed securely via `/uploads/:slug/:filename`.
- **Zero Server Sleeping:** Fully stateless serverless functions running on Vercel/Edge with instant invocation (<200ms) and unlimited tenant scalability.

## Local development

```bash
cd online-store/server && npm install && npm run dev   # http://localhost:4100
cd online-store/client && npm install && npm run dev   # http://localhost:5174, proxies /api to :4100
```

No `.env` needed for local dev — the client falls back to a relative `/api/...` path that
Vite's dev proxy forwards to the local server. Point Froshiar's `STORE_API_BASE_URL`
(`lib/onlineStore/api.ts`) at `http://<your-LAN-IP>:4100` to test the mobile app against
this local server from a physical device or emulator.

## Production deployment

### 1. Backend → api.froshiar.store (Vercel Serverless)

Deploy `online-store/server` to Vercel:
1. **New Project** in Vercel dashboard → import this repo.
2. **Root Directory**: set to `online-store/server` (monorepo).
3. **Environment Variables**:
   - `DATABASE_URL` = your Neon PostgreSQL pooled connection string
   - `R2_ACCOUNT_ID` = Cloudflare account ID
   - `R2_ACCESS_KEY_ID` = Cloudflare R2 token Access Key ID
   - `R2_SECRET_ACCESS_KEY` = Cloudflare R2 token Secret Access Key
   - `R2_BUCKET_NAME` = `froshiar`
   - `PUBLIC_API_URL` = `https://api.froshiar.store`
   - `ADMIN_API_KEY` = random shared secret
4. **Domains** tab → add `api.froshiar.store`.
5. Point DNS CNAME for `api` to `cname.vercel-dns.com`.

### 2. Frontend → froshiar.store

Deploy `online-store/client` to Vercel:

1. **New Project** in the Vercel dashboard → import this repo.
2. **Root Directory**: set to `online-store/client` (this is a monorepo — Vercel needs to
   know the Vite project isn't at the repo root). Vercel auto-detects the Vite framework,
   build command (`vite build`), and output directory (`dist`) once Root Directory is set.
3. **Environment Variables**: add `VITE_API_BASE_URL` = `https://api.froshiar.store`
   (must be set before the first deploy that needs it — Vite inlines env vars at build
   time, so changing it later requires a redeploy, not just a config reload).
4. Deploy. `online-store/client/vercel.json` already adds the SPA rewrite so visiting
   `froshiar.store/karwan-mobile` directly (not just via in-app navigation) doesn't 404.
5. **Domains** tab → add `froshiar.store` and `www.froshiar.store` → Vercel shows you the
   exact DNS records to add (see below; use what Vercel shows you if it ever differs from
   these standard published values).

CLI alternative to steps 1–3: `cd online-store/client && vercel --prod`, then set the env
var with `vercel env add VITE_API_BASE_URL production`.

## DNS records

Add these at whichever registrar/DNS provider manages `froshiar.store`:

| Type  | Name (host) | Value                       | Purpose |
|-------|-------------|------------------------------|---------|
| A     | `@` (apex)  | `76.76.21.21`                | Vercel — frontend root domain |
| CNAME | `www`       | `cname.vercel-dns.com`       | Vercel — `www` redirect/alias |
| CNAME | `api`       | `cname.vercel-dns.com`       | Vercel — backend serverless API |

The Vercel values are Vercel's standard published anycast targets — **Vercel's own
dashboard is authoritative**: after you add the domain there, it will show you the exact
records for your account.

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
  called once by Froshiar the first time "Enable Store" is pressed.
- `GET /api/stores/:slug` (public) → `{ businessName, enabled, products, info }` — this
  is a read-only catalog, not a shop: `products` excludes anything unpublished (owner-
  hidden) or out of stock entirely, and each remaining one includes `category` and
  `description` alongside `name`/`price`/`imageUrl` — raw stock counts are never exposed
  publicly; `info` holds the store-info fields (description, address, phone, logo, social
  links).
- `PATCH /api/stores/:slug/status` `{ enabled }` (Bearer API key) — Enable/Disable Store.
- `PATCH /api/stores/:slug/info` `{ ...partial info fields }` (Bearer API key) — partial
  merge update of the store-info fields shown on the storefront header.
- `POST /api/stores/:slug/sync` `{ changes: [...] }` (Bearer API key) — idempotent
  upsert/delete batch, called by Froshiar's offline-first sync queue
  (`lib/onlineStore/syncEngine.ts`) whenever connectivity returns, the app foregrounds,
  ~1.5s after a local change (debounced), every 60s as a safety net, or via the manual
  "Sync Now" button.
- `POST /api/stores/:slug/images` (multipart, field name `image`, Bearer API key) →
  `{ url }` — uploads a product/logo image (jpeg/png/webp, max 5MB) to the server's own
  persistent disk and returns its public URL.
