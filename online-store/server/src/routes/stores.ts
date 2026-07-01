import { Router } from 'express';
import type { Request, Response, NextFunction } from 'express';
import { MulterError } from 'multer';
import { JsonStoreRepository } from '../jsonStoreRepository';
import { generateApiKey, hashApiKey, requireStoreAuth } from '../auth';
import { requireActiveSubscription, checkSubscriptionHeaders } from '../subscriptionAuth';
import { upload, saveUploadedImage } from '../uploads';
import { config } from '../config';
import type { SyncChangeInput } from '../storeRepository';

const repo = new JsonStoreRepository();

export const storesRouter = Router();

function slugify(name: string): string {
  const base = name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return base || 'store';
}

async function resolveUniqueSlug(base: string): Promise<string> {
  let candidate = base;
  let n = 2;
  while (await repo.isSlugTaken(candidate)) {
    candidate = `${base}-${n}`;
    n += 1;
  }
  return candidate;
}

// POST /api/stores — register a new store. Called once by ManagerX the first time
// the business owner presses "Enable Store". Requires an active Online Store
// Subscription — there's no store/API-key yet at this point, so the subscription
// header is the only available proof of entitlement.
storesRouter.post('/', requireActiveSubscription, async (req, res) => {
  const { businessName } = req.body ?? {};
  if (!businessName?.trim()) {
    res.status(400).json({ error: 'businessName is required' });
    return;
  }

  const slug = await resolveUniqueSlug(slugify(businessName));
  const apiKey = generateApiKey();
  await repo.create({ slug, businessName: businessName.trim(), apiKeyHash: hashApiKey(apiKey) });

  res.status(201).json({ slug, apiKey });
});

// GET /api/stores/:slug — public storefront data, no auth. Used by the storefront
// client to render the product grid.
storesRouter.get('/:slug', async (req, res) => {
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
});

// PATCH /api/stores/:slug/status — Enable/Disable, requires the store's API key.
// Subscription is checked inline, only when enabled:true is requested — disabling
// must always succeed regardless of subscription state (the system can auto-disable
// on expiry, but a user manually disabling their own store is never blocked).
storesRouter.patch('/:slug/status', requireStoreAuth, async (req, res) => {
  const { enabled } = req.body ?? {};
  if (typeof enabled !== 'boolean') {
    res.status(400).json({ error: 'enabled must be a boolean' });
    return;
  }

  if (enabled) {
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
});

// PATCH /api/stores/:slug/info — business name/logo/contact/social info shown on
// the public storefront header. Freeform, partial-merge, no field validation (kept
// loose for v1, consistent with /sync). Requires the store's API key AND an active
// Online Store Subscription.
storesRouter.patch('/:slug/info', requireStoreAuth, requireActiveSubscription, async (req, res) => {
  const updated = await repo.updateInfo(req.params.slug, req.body ?? {});
  if (!updated) {
    res.status(404).json({ error: 'Store not found' });
    return;
  }
  res.json({ slug: updated.slug, info: updated.info ?? {} });
});

// POST /api/stores/:slug/sync — idempotent batch upsert/delete pushed from ManagerX's
// offline-first sync queue. Requires the store's API key AND an active Online Store
// Subscription.
storesRouter.post('/:slug/sync', requireStoreAuth, requireActiveSubscription, async (req, res) => {
  const { changes } = req.body ?? {};
  if (!Array.isArray(changes)) {
    res.status(400).json({ error: 'changes must be an array' });
    return;
  }

  try {
    const result = await repo.applySync(req.params.slug, changes as SyncChangeInput[]);
    res.json(result);
  } catch (e) {
    res.status(404).json({ error: e instanceof Error ? e.message : 'Sync failed' });
  }
});

// POST /api/stores/:slug/images — uploads a product/logo image to the server's
// own persistent disk (no third-party storage account needed) and returns a
// public URL the storefront can load directly. Requires the store's API key AND an
// active Online Store Subscription.
storesRouter.post('/:slug/images', requireStoreAuth, requireActiveSubscription, upload.single('image'), async (req, res) => {
  if (!req.file) {
    res.status(400).json({ error: 'image file is required (field name "image", jpeg/png/webp, max 5MB)' });
    return;
  }
  const filename = saveUploadedImage(req.params.slug, req.file);
  const url = `${config.publicApiUrl}/uploads/${req.params.slug}/${filename}`;
  res.status(201).json({ url });
});

// Multer throws synchronously on oversize/malformed multipart bodies — without this,
// that becomes a bare 500 with no JSON body.
storesRouter.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  if (err instanceof MulterError) {
    res.status(400).json({ error: err.code === 'LIMIT_FILE_SIZE' ? 'Image too large (max 5MB)' : err.message });
    return;
  }
  res.status(500).json({ error: 'Request failed' });
});
