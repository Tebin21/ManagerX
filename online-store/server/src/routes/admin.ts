import { Router } from 'express';
import type { Request, Response, NextFunction, RequestHandler } from 'express';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { MulterError } from 'multer';
import { JsonStoreRepository } from '../jsonStoreRepository';
import { generateApiKey, hashApiKey } from '../auth';
import { upload, saveUploadedImage, UPLOADS_ROOT } from '../uploads';
import { logActivity, listActivity } from '../activityLog';
import type { DeletedStoreRecord, StoreRecord } from '../storeRepository';

const repo = new JsonStoreRepository();

export const adminRouter = Router();

// Same rationale as routes/stores.ts's asyncHandler — Express 4 does not catch
// a rejected promise thrown from an async route handler.
function asyncHandler(fn: (req: Request, res: Response, next: NextFunction) => Promise<void>): RequestHandler {
  return (req, res, next) => {
    fn(req, res, next).catch(next);
  };
}

function distinctCategories(products: StoreRecord['products']): string[] {
  const seen = new Set<string>();
  for (const p of products) seen.add(p.category ?? 'General');
  return Array.from(seen);
}

// Never sent to the client: apiKeyHash is the one field every admin list/detail
// response below strips, even though it's already a hash — no reason to expose
// it past this process.
function toSummary(store: StoreRecord) {
  const { apiKeyHash: _apiKeyHash, products, ...rest } = store;
  return {
    ...rest,
    productsCount: products.length,
    categoriesCount: distinctCategories(products).length,
  };
}

// --- Stores -----------------------------------------------------------

adminRouter.get('/stores', asyncHandler(async (_req, res) => {
  const stores = await repo.listAll();
  res.json({ stores: stores.map(toSummary) });
}));

function dirSizeBytes(dir: string): number {
  if (!fs.existsSync(dir)) return 0;
  let total = 0;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    total += entry.isDirectory() ? dirSizeBytes(full) : fs.statSync(full).size;
  }
  return total;
}

adminRouter.get('/stores/:slug', asyncHandler(async (req, res) => {
  const store = await repo.getBySlug(req.params.slug);
  if (!store) {
    res.status(404).json({ error: 'Store not found' });
    return;
  }
  const { apiKeyHash: _apiKeyHash, ...rest } = store;
  const storageUsageBytes = dirSizeBytes(path.join(UPLOADS_ROOT, store.slug));
  const { entries: recentActivity } = listActivity({ slug: store.slug, limit: 25 });
  res.json({
    ...rest,
    productsCount: store.products.length,
    categoriesCount: distinctCategories(store.products).length,
    storageUsageBytes,
    recentActivity,
  });
}));

adminRouter.patch('/stores/:slug/suspend', asyncHandler(async (req, res) => {
  const { suspended } = req.body ?? {};
  if (typeof suspended !== 'boolean') {
    res.status(400).json({ error: 'suspended must be a boolean' });
    return;
  }
  const updated = await repo.setAdminSuspended(req.params.slug, suspended);
  if (!updated) {
    res.status(404).json({ error: 'Store not found' });
    return;
  }
  void logActivity(req, 'admin', suspended ? 'store_suspended' : 'store_activated', { slug: req.params.slug });
  res.json({ slug: updated.slug, adminSuspended: updated.adminSuspended ?? false });
}));

adminRouter.patch('/stores/:slug/info', asyncHandler(async (req, res) => {
  const updated = await repo.updateInfo(req.params.slug, req.body ?? {});
  if (!updated) {
    res.status(404).json({ error: 'Store not found' });
    return;
  }
  void logActivity(req, 'admin', 'store_updated', { slug: req.params.slug });
  res.json(toSummary(updated));
}));

adminRouter.post(
  '/stores/:slug/images',
  upload.single('image'),
  asyncHandler(async (req, res) => {
    if (!req.file) {
      res.status(400).json({ error: 'image file is required (field name "image", jpeg/png/webp, max 5MB)' });
      return;
    }
    const store = await repo.getBySlug(req.params.slug);
    if (!store) {
      res.status(404).json({ error: 'Store not found' });
      return;
    }
    const filename = saveUploadedImage(req.params.slug, req.file);
    void logActivity(req, 'admin', 'image_uploaded', { slug: req.params.slug });
    res.status(201).json({ filename });
  })
);

adminRouter.post('/stores/:slug/reset-key', asyncHandler(async (req, res) => {
  const apiKey = generateApiKey();
  const updated = await repo.rotateApiKey(req.params.slug, hashApiKey(apiKey));
  if (!updated) {
    res.status(404).json({ error: 'Store not found' });
    return;
  }
  void logActivity(req, 'admin', 'api_key_reset', { slug: req.params.slug });
  res.json({ slug: updated.slug, apiKey });
}));

adminRouter.delete('/stores/:slug', asyncHandler(async (req, res) => {
  if (req.body?.confirm !== 'DELETE') {
    res.status(400).json({ error: 'Body must include { "confirm": "DELETE" }' });
    return;
  }
  const tombstone = await repo.deleteStore(req.params.slug);
  if (!tombstone) {
    res.status(404).json({ error: 'Store not found' });
    return;
  }
  const uploadsDir = path.join(UPLOADS_ROOT, req.params.slug);
  if (fs.existsSync(uploadsDir)) fs.rmSync(uploadsDir, { recursive: true, force: true });
  void logActivity(req, 'admin', 'store_deleted', { slug: req.params.slug, details: tombstone.businessName });
  res.json(tombstone);
}));

adminRouter.get('/deleted-stores', asyncHandler(async (_req, res) => {
  res.json({ stores: await repo.listDeletedStores() });
}));

// Best-effort only: products carry `updatedAt` (bumped on every edit), not an
// immutable creation date, so this buckets by the most recent touch of each
// CURRENTLY-EXISTING product — not true creation history. Computed here
// (not client-side) because only this process has the full products[] per
// store; the list/summary endpoints above deliberately strip that array.
adminRouter.get('/stats/products-growth', asyncHandler(async (_req, res) => {
  const stores = await repo.listAll();
  const counts = new Map<string, number>();
  for (const store of stores) {
    for (const product of store.products) {
      const d = new Date(product.updatedAt);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
  }
  res.json({ counts: Object.fromEntries(counts) });
}));

// --- Activity -----------------------------------------------------------

adminRouter.get('/activity', asyncHandler(async (req, res) => {
  const { slug, action, actor, since, until, limit, offset } = req.query;
  const result = listActivity({
    slug: typeof slug === 'string' ? slug : undefined,
    action: typeof action === 'string' ? action : undefined,
    actor: actor === 'admin' || actor === 'owner' || actor === 'system' ? actor : undefined,
    since: typeof since === 'string' ? since : undefined,
    until: typeof until === 'string' ? until : undefined,
    limit: limit ? Number(limit) : undefined,
    offset: offset ? Number(offset) : undefined,
  });
  res.json(result);
}));

// --- Export -----------------------------------------------------------

adminRouter.get('/export.json', asyncHandler(async (_req, res) => {
  const stores = await repo.listAll();
  const deletedStores = await repo.listDeletedStores();
  res.setHeader('Content-Disposition', 'attachment; filename="online-store-export.json"');
  res.json({ exportedAt: new Date().toISOString(), stores: stores.map(toSummary), deletedStores });
}));

function csvEscape(value: unknown): string {
  const str = value === null || value === undefined ? '' : String(value);
  return /[",\n]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
}

adminRouter.get('/export.csv', asyncHandler(async (_req, res) => {
  const stores = await repo.listAll();
  const columns = [
    'slug', 'businessName', 'enabled', 'adminSuspended', 'subscriptionStatus', 'subscriptionPlan',
    'subscriptionExpiresAt', 'productsCount', 'categoriesCount', 'syncCount', 'createdAt', 'lastSyncAt',
  ] as const;
  const rows = stores.map((s) => {
    const summary = toSummary(s) as Record<string, unknown>;
    return columns.map((c) => csvEscape(summary[c])).join(',');
  });
  const csv = [columns.join(','), ...rows].join('\n');
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="online-store-export.csv"');
  res.send(csv);
}));

// --- Backups -----------------------------------------------------------

const BACKUPS_DIR = path.join(__dirname, '../../data/backups');

function backupPath(id: string): string {
  // id comes straight from a URL param — reject anything that isn't the exact
  // shape createBackup() generates so it can never be used to escape BACKUPS_DIR.
  if (!/^[0-9]{8}T[0-9]{6}-[a-f0-9]{8}$/.test(id)) throw new Error('INVALID_BACKUP_ID');
  return path.join(BACKUPS_DIR, `${id}.json`);
}

adminRouter.get('/backups', asyncHandler(async (_req, res) => {
  if (!fs.existsSync(BACKUPS_DIR)) {
    res.json({ backups: [] });
    return;
  }
  const backups = fs
    .readdirSync(BACKUPS_DIR)
    .filter((f) => f.endsWith('.json'))
    .map((f) => {
      const stat = fs.statSync(path.join(BACKUPS_DIR, f));
      return { id: f.replace(/\.json$/, ''), createdAt: stat.mtime.toISOString(), sizeBytes: stat.size };
    })
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  res.json({ backups });
}));

adminRouter.post('/backups', asyncHandler(async (req, res) => {
  fs.mkdirSync(BACKUPS_DIR, { recursive: true });
  const stores = await repo.listAll();
  const deletedStores = await repo.listDeletedStores();
  const id = `${new Date().toISOString().replace(/[-:]/g, '').slice(0, 15)}-${crypto.randomBytes(4).toString('hex')}`;
  fs.writeFileSync(
    path.join(BACKUPS_DIR, `${id}.json`),
    JSON.stringify({ createdAt: new Date().toISOString(), stores, deletedStores }, null, 2)
  );
  void logActivity(req, 'admin', 'backup_created', { details: id });
  res.status(201).json({ id });
}));

adminRouter.get('/backups/:id/download', asyncHandler(async (req, res) => {
  let file: string;
  try {
    file = backupPath(req.params.id);
  } catch {
    res.status(400).json({ error: 'Invalid backup id' });
    return;
  }
  if (!fs.existsSync(file)) {
    res.status(404).json({ error: 'Backup not found' });
    return;
  }
  res.setHeader('Content-Disposition', `attachment; filename="${req.params.id}.json"`);
  res.sendFile(file);
}));

adminRouter.post('/backups/:id/restore', asyncHandler(async (req, res) => {
  if (req.body?.confirm !== 'RESTORE') {
    res.status(400).json({ error: 'Body must include { "confirm": "RESTORE" }' });
    return;
  }
  let file: string;
  try {
    file = backupPath(req.params.id);
  } catch {
    res.status(400).json({ error: 'Invalid backup id' });
    return;
  }
  if (!fs.existsSync(file)) {
    res.status(404).json({ error: 'Backup not found' });
    return;
  }
  const snapshot = JSON.parse(fs.readFileSync(file, 'utf8')) as {
    stores: StoreRecord[];
    deletedStores: DeletedStoreRecord[];
  };
  await repo.replaceAll(snapshot.stores, snapshot.deletedStores);
  void logActivity(req, 'admin', 'backup_restored', { details: req.params.id });
  res.json({ ok: true, restoredStores: snapshot.stores.length });
}));

// Multer throws synchronously on oversize/malformed multipart bodies — mirrors
// routes/stores.ts's own error middleware.
adminRouter.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  if (err instanceof MulterError) {
    res.status(400).json({ error: err.code === 'LIMIT_FILE_SIZE' ? 'Image too large (max 5MB)' : err.message });
    return;
  }
  console.error('Unhandled admin route error:', err);
  res.status(500).json({ error: 'Request failed' });
});
