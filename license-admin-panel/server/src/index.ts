import path from 'path';
import dotenv from 'dotenv';
dotenv.config({ path: path.join(__dirname, '../.env') });

import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { authRouter } from './routes/auth';
import { licensesRouter } from './routes/licenses';
import { customersRouter } from './routes/customers';
import { requireAuth } from './auth';
import { isSupabaseConfigured } from './supabaseClient';

const app = express();
const PORT = Number(process.env.PORT) || 4000;

// Comma-separated so a custom domain (e.g. licenses.bexdre.com) can be added later
// by editing this one env var — no code change or redeploy needed for that part.
const ALLOWED_ORIGINS = (process.env.CLIENT_ORIGIN || 'http://localhost:5173')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);

app.use(cors({ origin: ALLOWED_ORIGINS, credentials: true }));
app.use(express.json());
app.use(cookieParser());

app.use('/api/auth', authRouter);
app.use('/api/licenses', requireAuth, licensesRouter);
app.use('/api/customers', requireAuth, customersRouter);

app.get('/api/health', (_req, res) => res.json({ ok: true }));

app.listen(PORT, () => {
  console.log(`License admin server listening on port ${PORT}`);
  console.log(`Storage backend: ${isSupabaseConfigured() ? 'Supabase' : 'local JSON ledger'}`);
  console.log(`Allowed origins: ${ALLOWED_ORIGINS.join(', ')}`);
  if (!process.env.ADMIN_PASSWORD) {
    console.warn('WARNING: ADMIN_PASSWORD is not set — login will fail until it is.');
  }
});
