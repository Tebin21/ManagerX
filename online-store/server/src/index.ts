import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import path from 'path';
import cors from 'cors';
import { config } from './config';
import { storesRouter } from './routes/stores';
import { adminRouter } from './routes/admin';
import { requireAdminAuth } from './adminAuth';
import { UPLOADS_ROOT } from './uploads';

const app = express();

// Trust proxy headers from Vercel / Cloudflare edge proxies so client IP is accurately captured
app.set('trust proxy', 1);

app.use(cors({ origin: config.allowedOrigin }));
app.use(express.json());

// Root endpoint: quick status check
app.get('/', (_req, res) => {
  res.json({
    name: 'Froshiar Online Store API',
    status: 'online',
    docs: 'https://froshiar.store',
  });
});

// Uploaded product/logo images: served via getFromStorage (Cloudflare R2 or local disk fallback)
// with high-performance caching headers. Keeps Cloudflare R2 bucket completely private.
app.get(['/uploads/:slug/:filename', '/api/uploads/:slug/:filename'], async (req, res) => {
  try {
    const slug = (req.params.slug || '').toLowerCase() === 'apple' ? 'froshiar' : req.params.slug;
    const { getFromStorage } = await import('./r2Storage');
    const result = await getFromStorage(slug, req.params.filename);
    if (!result) {
      res.status(404).send('Image not found');
      return;
    }
    res.setHeader('Content-Type', result.contentType);
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    result.stream.pipe(res);
  } catch (err) {
    console.error('Failed to stream image:', err);
    res.status(500).send('Error loading image');
  }
});

// Static uploads fallback in local dev
app.use('/uploads', express.static(UPLOADS_ROOT));

// Support both prefixed (/api/stores) and direct (/stores) routing
app.use(['/api/stores', '/stores'], storesRouter);

// Server-to-server admin routes
app.use(['/api/admin', '/admin'], requireAdminAuth, adminRouter);

// Health check endpoint: responds 200 without throwing even if DB is cold
app.get(['/api/health', '/health'], (_req, res) => {
  const { isR2Configured, R2_BUCKET_NAME } = require('./r2Storage');
  res.json({
    ok: true,
    status: 'healthy',
    database: Boolean(process.env.DATABASE_URL?.trim()),
    r2: {
      configured: isR2Configured,
      bucket: R2_BUCKET_NAME,
    },
    environment: process.env.NODE_ENV || 'production',
  });
});

// Global error handler so unhandled route rejections never crash the serverless container
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Unhandled API error:', err);
  const status = typeof err.status === 'number' ? err.status : 500;
  res.status(status).json({
    error: err.message || 'Internal server error',
  });
});

if (process.env.NODE_ENV !== 'test' && !process.env.VERCEL) {
  app.listen(config.port, () => {
    console.log(`Online Store API listening on http://localhost:${config.port}`);
  });
}

// Support both CommonJS and ES Module default imports for Vercel Serverless Functions
module.exports = app;
export default app;
