import express from 'express';
import cors from 'cors';
import { config } from './config';
import { storesRouter } from './routes/stores';

// Pure API process — the storefront (online-store/client) is deployed separately to
// Vercel at managerx.store and talks to this server at api.managerx.store. This server
// no longer serves any static frontend itself; see online-store/README.md for the
// split-domain deployment.
const app = express();

app.use(cors({ origin: config.allowedOrigin }));
app.use(express.json());

app.use('/api/stores', storesRouter);
app.get('/api/health', (_req, res) => res.json({ ok: true }));

app.listen(config.port, () => {
  console.log(`Online Store API listening on http://localhost:${config.port}`);
});
