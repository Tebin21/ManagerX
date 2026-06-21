import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import multer from 'multer';

const UPLOADS_ROOT = path.join(__dirname, '../data/uploads');

const ALLOWED_MIME: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

const MAX_BYTES = 5 * 1024 * 1024;

// memoryStorage (not diskStorage) so the mimetype check below runs before anything
// touches disk, and so the filename/extension are always ours — never the client's
// original filename — which sidesteps path traversal entirely.
export const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_BYTES },
  fileFilter: (_req, file, cb) => {
    cb(null, Object.prototype.hasOwnProperty.call(ALLOWED_MIME, file.mimetype));
  },
});

export function saveUploadedImage(slug: string, file: Express.Multer.File): string {
  const ext = ALLOWED_MIME[file.mimetype];
  const dir = path.join(UPLOADS_ROOT, slug);
  fs.mkdirSync(dir, { recursive: true });
  const filename = `${crypto.randomUUID()}.${ext}`;
  fs.writeFileSync(path.join(dir, filename), file.buffer);
  return filename;
}

export { UPLOADS_ROOT };
