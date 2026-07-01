import { Router } from 'express';
import type { Request, Response, NextFunction, RequestHandler } from 'express';
import { MulterError } from 'multer';
import { JsonStoreRepository } from '../jsonStoreRepository';
import { generateApiKey, hashApiKey, requireStoreAuth } from '../auth';
import { requireActiveSubscription, checkSubscriptionHeaders } from '../subscriptionAuth';
import { upload, saveUploadedImage } from '../uploads';
import { config } from '../config';
import type { SyncChangeInput } from '../storeRepository';
import { logActivity } from '../activityLog';

const repo = new JsonStoreRepository();

export const storesRouter = Router();

// Express 4 does not catch a rejected promise thrown from an async route
// handler — it would otherwise hang the request forever or, on an unhandled
// rejection, crash the whole process (taking down every store, not just the
// one being requested). Wrapping every async handler funnels any such error
// into the error-handling middleware at the bottom of this file instead, so
// it always resolves as a clean 500.
function asyncHandler(fn: (req: Request, res: Response, next: NextFunction) => Promise<void>): RequestHandler {
  return (req, res, next) => {
    fn(req, res, next).catch(next);
  };
}

// Blocks the owner-facing write routes (info/sync/images, and re-enabling)
// once an admin has suspended the store — independent of the owner's own
// `enabled` toggle (see StoreRecord.adminSuspended's doc comment). The
// storefront's GET /:slug is intentionally NOT gated here: a suspended store
// keeps rendering its last-synced catalog, only writes are blocked.
const blockIfAdminSuspended = asyncHandler(async (req, res, next) => {
  const store = await repo.getBySlug(req.params.slug);
  if (store?.adminSuspended) {
    res.status(423).json({ error: 'Store suspended by admin — contact support' });
    return;
  }
  next();
});

// POST /api/stores — register a new store, called by ManagerX the first time the
// business owner presses "Enable Store" — OR recover an existing one. Requires an
// active Online Store Subscription — there's no store/API-key yet at this point, so
// the subscription header is the only available proof of entitlement.
//
// A device that already owns a store (recognized via the X-Device-Id header — the
// same hardware-derived, reinstall-stable ID already used for subscription checks)
// is always a RECOVERY, never a fresh create: this is what keeps the store's slug/
// URL/products permanent across a reinstall that wiped the locally-cached slug/apiKey,
// instead of silently spawning a second, empty, differently-slugged store.
storesRouter.post('/', requireActiveSubscription, asyncHandler(async (req, res) => {
  const { businessName } = req.body ?? {};
  if (!businessName?.trim()) {
    res.status(400).json({ error: 'businessName is required' });
    return;
  }
  const deviceIdHeader = req.headers['x-device-id'];
  const deviceId = typeof deviceIdHeader === 'string' && deviceIdHeader ? deviceIdHeader : undefined;

  // A device that already owns a store, or owns a pre-deviceId legacy store
  // matching this businessName's slug, is always a RECOVERY, never a fresh
  // create — see registerOrRecover()'s own comment in jsonStoreRepository.ts
  // for the full recover-or-create decision tree and the legacy-migration
  // window rules. The whole decision runs as one atomic transaction there so
  // no concurrent request can interleave between the "is this a recovery"
  // check and the eventual write.
  const apiKey = generateApiKey();
  const { record, recovered } = await repo.registerOrRecover({
    businessName: businessName.trim(),
    deviceId,
    apiKeyHash: hashApiKey(apiKey),
  });

  void logActivity(req, 'system', recovered ? 'store_recovered' : 'store_created', { slug: record.slug });
  res.status(recovered ? 200 : 201).json({ slug: record.slug, apiKey, recovered });
}));

// GET /api/stores/:slug — public storefront data, no auth. Used by the storefront
// client to render the product grid.
storesRouter.get('/:slug', asyncHandler(async (req, res) => {
  const store = await repo.getBySlug(req.params.slug);
  if (!store) {
    res.status(404).json({ error: 'Store not found' });
    return;
  }

  // This is a read-only catalog, not a shop: unpublished (owner-hidden) and
  // out-of-stock products are excluded entirely, not just flagged, and stock counts
  // are never exposed publicly.
  const products = store.products
    .filter((p) => p.isPublished && p.quantity > 0)
    .map((p) => ({
      productId: p.productId,
      name: p.name,
      // Coalesce, don't trust the stored value blindly — products synced before this
      // field existed have no `category` key at all in the JSON ledger, and `??`
      // would otherwise surface as a missing key (JSON.stringify drops `undefined`)
      // that the client's non-optional `category: string` type doesn't expect.
      category: p.category ?? 'General',
      description: p.description ?? null,
      websiteDescription: p.websiteDescription ?? null,
      price: p.price,
      imageUrl: p.imageUrl,
    }));

  res.json({
    businessName: store.businessName,
    enabled: store.enabled,
    products,
    info: store.info ?? {},
  });
}));

// PATCH /api/stores/:slug/status — Enable/Disable, requires the store's API key.
// Subscription is checked inline, only when enabled:true is requested — disabling
// must always succeed regardless of subscription state (the system can auto-disable
// on expiry, but a user manually disabling their own store is never blocked).
storesRouter.patch('/:slug/status', requireStoreAuth, asyncHandler(async (req, res) => {
  const { enabled } = req.body ?? {};
  if (typeof enabled !== 'boolean') {
    res.status(400).json({ error: 'enabled must be a boolean' });
    return;
  }

  if (enabled) {
    const store = await repo.getBySlug(req.params.slug);
    if (store?.adminSuspended) {
      res.status(423).json({ error: 'Store suspended by admin — contact support' });
      return;
    }
    const subResult = checkSubscriptionHeaders(req);
    if (subResult.status !== 'valid') {
      res.status(402).json({ error: 'Online Store subscription required', status: subResult.status });
      return;
    }
  }

  const updated = await repo.setEnabled(req.params.slug, enabled);
  if (!updated) {
    res.status(404).json({ error: 'Store not found' });
    return;
  }
  res.json({ slug: updated.slug, enabled: updated.enabled });
}));

// PATCH /api/stores/:slug/info — business name/logo/contact/social info shown on
// the public storefront header. Freeform, partial-merge, no field validation (kept
// loose for v1, consistent with /sync). Requires the store's API key AND an active
// Online Store Subscription.
storesRouter.patch('/:slug/info', requireStoreAuth, blockIfAdminSuspended, requireActiveSubscription, asyncHandler(async (req, res) => {
  const updated = await repo.updateInfo(req.params.slug, req.body ?? {});
  if (!updated) {
    res.status(404).json({ error: 'Store not found' });
    return;
  }
  res.json({ slug: updated.slug, info: updated.info ?? {} });
}));

// POST /api/stores/:slug/sync — idempotent batch upsert/delete pushed from ManagerX's
// offline-first sync queue. Requires the store's API key AND an active Online Store
// Subscription.
storesRouter.post('/:slug/sync', requireStoreAuth, blockIfAdminSuspended, requireActiveSubscription, asyncHandler(async (req, res) => {
  const { changes } = req.body ?? {};
  if (!Array.isArray(changes)) {
    res.status(400).json({ error: 'changes must be an array' });
    return;
  }

  try {
    const result = await repo.applySync(req.params.slug, changes as SyncChangeInput[]);
    res.json(result);
  } catch (e) {
    // Only a genuinely missing slug is a 404 here. Any other failure (e.g. a
    // corrupted ledger read) must NOT be reported as "store not found" —
    // that would be exactly the kind of error-masking that makes a real
    // outage look like a deleted store. Anything else propagates to
    // asyncHandler -> the error middleware below, which returns a 500.
    if (e instanceof Error && e.message === 'STORE_NOT_FOUND') {
      res.status(404).json({ error: 'Store not found' });
      return;
    }
    void logActivity(req, 'system', 'sync_failed', {
      slug: req.params.slug,
      details: e instanceof Error ? e.message : 'Unknown error',
    });
    throw e;
  }
}));

// POST /api/stores/:slug/images — uploads a product/logo image to the server's
// own persistent disk (no third-party storage account needed) and returns a
// public URL the storefront can load directly. Requires the store's API key AND an
// active Online Store Subscription.
storesRouter.post('/:slug/images', requireStoreAuth, blockIfAdminSuspended, requireActiveSubscription, upload.single('image'), asyncHandler(async (req, res) => {
  if (!req.file) {
    res.status(400).json({ error: 'image file is required (field name "image", jpeg/png/webp, max 5MB)' });
    return;
  }
  const filename = saveUploadedImage(req.params.slug, req.file);
  const url = `${config.publicApiUrl}/uploads/${req.params.slug}/${filename}`;
  res.status(201).json({ url });
}));

// Multer throws synchronously on oversize/malformed multipart bodies, and
// asyncHandler above forwards any other route error here too — without this,
// either becomes a bare 500 with no JSON body (or, pre-asyncHandler, a hung
// request/crashed process for the latter).
storesRouter.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  if (err instanceof MulterError) {
    res.status(400).json({ error: err.code === 'LIMIT_FILE_SIZE' ? 'Image too large (max 5MB)' : err.message });
    return;
  }
  console.error('Unhandled store route error:', err);
  res.status(500).json({ error: 'Request failed' });
});
