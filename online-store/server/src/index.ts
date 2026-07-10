import express from 'express';
import path from 'path';
import cors from 'cors';
import { config } from './config';
import { storesRouter } from './routes/stores';
import { adminRouter } from './routes/admin';
import { requireAdminAuth } from './adminAuth';
import { UPLOADS_ROOT } from './uploads';

// Pure API process — the storefront (online-store/client) is deployed separately to
// Vercel at froshiar.store and talks to this server at api.froshiar.store. This server
// no longer serves any static frontend itself; see online-store/README.md for the
// split-domain deployment.
const app = express();

// Render sits in front of this service as a reverse proxy — without this, every
// request's req.ip resolves to the proxy's address, collapsing all clients into a
// single bucket for the IP-keyed registration rate limiter (see rateLimit.ts).
app.set('trust proxy', 1);

app.use(cors({ origin: config.allowedOrigin }));
app.use(express.json());

// Uploaded product/logo images live on the same persistent disk as data/stores.json
// (see render.yaml's mounted volume at /app/data) — served directly, no CDN needed.
app.use('/uploads', express.static(UPLOADS_ROOT));

app.use('/api/stores', storesRouter);
// Server-to-server only — the Froshiar Store Control Center's Next.js server is
// the sole caller (see adminAuth.ts); never reached directly from a browser, so
// this doesn't need to be listed in `allowedOrigin` above.
app.use('/api/admin', requireAdminAuth, adminRouter);
app.get('/api/health', (_req, res) => res.json({ ok: true }));

app.listen(config.port, () => {
  console.log(`Online Store API listening on http://localhost:${config.port}`);
});
