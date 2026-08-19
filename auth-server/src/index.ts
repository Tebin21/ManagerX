import express from 'express';
import cors from 'cors';
import { config } from './config';
import { otpRouter } from './routes/otp';

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
app.get('/api/health', (_req, res) => res.json({ ok: true }));

app.listen(config.port, () => {
  console.log(`Froshiar Auth API listening on http://localhost:${config.port}`);
});
