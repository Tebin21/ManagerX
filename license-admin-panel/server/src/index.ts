import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { config } from './config';
import { authRouter } from './routes/auth';
import { licensesRouter } from './routes/licenses';
import { onlineStoreSubscriptionsRouter } from './routes/onlineStoreSubscriptions';
import { customersRouter } from './routes/customers';
import { requireAuth } from './auth';

const app = express();

// Server settings (port, allowed frontend origin, admin password) all come from
// config.local.json — see src/config.ts. To change the port or origin, edit that
// file, not this one.
app.use(cors({ origin: config.allowedOrigin, credentials: true }));
app.use(express.json());
app.use(cookieParser());

app.use('/api/auth', authRouter);
app.use('/api/licenses', requireAuth, licensesRouter);
app.use('/api/online-store-subscriptions', requireAuth, onlineStoreSubscriptionsRouter);
app.use('/api/customers', requireAuth, customersRouter);

app.get('/api/health', (_req, res) => res.json({ ok: true }));

app.listen(config.port, () => {
  console.log(`License admin server listening on http://localhost:${config.port}`);
  console.log(`Allowed origin: ${config.allowedOrigin}`);
});
