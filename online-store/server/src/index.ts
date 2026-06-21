import fs from 'fs';
import path from 'path';
import express from 'express';
import cors from 'cors';
import { config } from './config';
import { storesRouter } from './routes/stores';

const app = express();

app.use(cors({ origin: config.allowedOrigin }));
app.use(express.json());

app.use('/api/stores', storesRouter);
app.get('/api/health', (_req, res) => res.json({ ok: true }));

// In production, this one process also serves the built storefront SPA (the React
// app reads the slug straight from the URL, so a single catch-all covers every
// store) — see online-store/client. In dev the client runs separately via its own
// Vite server, so dist/ won't exist yet and this block is skipped entirely.
const clientDist = path.join(__dirname, '../../client/dist');
if (fs.existsSync(clientDist)) {
  app.use(express.static(clientDist));
  app.use((req, res, next) => {
    if (req.path.startsWith('/api')) { next(); return; }
    res.sendFile(path.join(clientDist, 'index.html'));
  });
}

app.listen(config.port, () => {
  console.log(`Online Store server listening on http://localhost:${config.port}`);
});
