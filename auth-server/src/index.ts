import express from 'express';
import type { Request, Response } from 'express';
import cors from 'cors';
import { config } from './config';
import { otpRouter } from './routes/otp';
import { passwordResetRouter } from './routes/passwordReset';
import { auth, firestore } from './firebaseAdmin';

const app = express();

// Render sits in front of this service as a reverse proxy — without this, every
// request's req.ip resolves to the proxy's address, collapsing all clients into a
// single bucket for the IP-keyed rate limiters (see rateLimit.ts).
app.set('trust proxy', 1);

// This service has exactly one legitimate caller — the Froshiar mobile app,
// calling via a native fetch() (no browser-style Origin to allowlist). The real
// security boundary on every route is the Firebase ID token (see
// verifyFirebaseToken.ts), not CORS.
app.use(cors());
app.use(express.json());

app.use('/api/otp', otpRouter);
app.use('/api/password-reset', passwordResetRouter);

// Health check with optional proactive warmup
app.get('/api/health', (req: Request, res: Response) => {
  if (req.query.warm === '1') {
    Promise.allSettled([
      firestore.collection('otpVerifications').limit(1).get(),
      auth.listUsers(1),
    ]).catch(() => {});
  }
  res.json({ ok: true, timestamp: Date.now() });
});

// Eager warm-up of Firestore and Auth connections on server start so the first
// real request doesn't pay connection initialization penalties.
Promise.allSettled([
  firestore.collection('otpVerifications').limit(1).get(),
  auth.listUsers(1),
]).catch(() => {});

app.listen(config.port, () => {
  console.log(`Froshiar Auth API listening on http://localhost:${config.port}`);
});
