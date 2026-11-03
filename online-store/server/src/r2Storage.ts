import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectsCommand,
  ListObjectsV2Command,
} from '@aws-sdk/client-s3';
import fs from 'fs';
import path from 'path';
import { Readable } from 'stream';
import { pool } from './db/pool';

export function getR2Config() {
  const accountId = (process.env.R2_ACCOUNT_ID || '').trim().replace(/^["']|["']$/g, '');
  const accessKeyId = (process.env.R2_ACCESS_KEY_ID || '').trim().replace(/^["']|["']$/g, '');
  const secretAccessKey = (process.env.R2_SECRET_ACCESS_KEY || '').trim().replace(/^["']|["']$/g, '');
  const bucketName = (process.env.R2_BUCKET_NAME || 'froshiar').trim().replace(/^["']|["']$/g, '');
  const configured = Boolean(accountId && accessKeyId && secretAccessKey);
  return { accountId, accessKeyId, secretAccessKey, bucketName, configured };
}

export const R2_BUCKET_NAME = (process.env.R2_BUCKET_NAME || 'froshiar').trim().replace(/^["']|["']$/g, '');
export const isR2Configured = Boolean(
  (process.env.R2_ACCOUNT_ID || '').trim() &&
  (process.env.R2_ACCESS_KEY_ID || '').trim() &&
  (process.env.R2_SECRET_ACCESS_KEY || '').trim()
);

let s3ClientInstance: S3Client | null = null;
export function getS3Client(): S3Client | null {
  const cfg = getR2Config();
  if (!cfg.configured) return null;
  if (!s3ClientInstance) {
    s3ClientInstance = new S3Client({
      region: 'auto',
      endpoint: `https://${cfg.accountId}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: cfg.accessKeyId,
        secretAccessKey: cfg.secretAccessKey,
      },
      requestChecksumCalculation: 'WHEN_REQUIRED',
      responseChecksumValidation: 'WHEN_REQUIRED',
    });
  }
  return s3ClientInstance;
}

// Fallback local directory if R2 is not configured in local dev
// In Vercel serverless environments, root is read-only, so use /tmp for fallback.
const LOCAL_UPLOADS_ROOT = process.env.VERCEL
  ? path.join('/tmp', 'uploads')
  : path.join(__dirname, '../data/uploads');

export async function uploadToStorage(
  slug: string,
  filename: string,
  buffer: Buffer,
  mimeType: string
): Promise<string> {
  const key = `uploads/${slug}/${filename}`;
  const client = getS3Client();
  const bucket = getR2Config().bucketName;

  // 1. Guaranteed persistent database storage (Neon Postgres store_images table)
  // Saved first so even if R2 fails, is misconfigured, or gets cleared, the image
  // is permanently preserved in PostgreSQL.
  try {
    await pool.query(
      `INSERT INTO store_images (slug, filename, mime_type, data)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (filename) DO UPDATE SET data = $4, mime_type = $3, slug = $1`,
      [slug, filename, mimeType, buffer]
    );
  } catch (dbErr: any) {
    console.warn('[Storage] DB persistent save warning:', dbErr?.message);
  }

  // 2. Also save to Cloudflare R2 if configured
  if (client) {
    try {
      await client.send(
        new PutObjectCommand({
          Bucket: bucket,
          Key: key,
          Body: buffer,
          ContentType: mimeType,
          ContentLength: buffer.length,
        })
      );
    } catch (err: any) {
      console.warn('[R2 Storage] PutObjectCommand failed, using database storage:', err.message);
    }
  }

  // 3. Local disk fallback for local dev
  try {
    const dir = path.join(LOCAL_UPLOADS_ROOT, slug);
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, filename), buffer);
  } catch {}

  return key;
}

export async function getFromStorage(
  slug: string,
  filename: string
): Promise<{ stream: NodeJS.ReadableStream; contentType: string } | null> {
  const key = `uploads/${slug}/${filename}`;
  const client = getS3Client();
  const bucket = getR2Config().bucketName;

  // 1. Try Cloudflare R2 by exact key
  if (client) {
    try {
      const response = await client.send(
        new GetObjectCommand({
          Bucket: bucket,
          Key: key,
        })
      );
      if (response.Body) {
        return {
          stream: response.Body as unknown as NodeJS.ReadableStream,
          contentType: response.ContentType || 'image/jpeg',
        };
      }
    } catch (err: any) {
      if (
        err.name !== 'NoSuchKey' &&
        err.name !== 'NotFound' &&
        err.Code !== 'NoSuchKey' &&
        err.$metadata?.httpStatusCode !== 404
      ) {
        console.warn('[R2 Storage] R2 GetObjectCommand error, checking database:', err.message);
      }
    }
  }

  // 2. Persistent Database fallback (Neon Postgres store_images table)
  // First attempt: exact match by slug + filename
  try {
    let res = await pool.query(
      `SELECT mime_type, data FROM store_images WHERE slug = $1 AND filename = $2`,
      [slug, filename]
    );

    // Second attempt: if slug was changed/renamed (e.g. kurd-notes -> kurd or vice-versa),
    // match by the globally unique filename UUID!
    if (res.rows.length === 0) {
      res = await pool.query(
        `SELECT mime_type, data FROM store_images WHERE filename = $1`,
        [filename]
      );
    }

    if (res.rows.length > 0) {
      const row = res.rows[0];
      return {
        stream: Readable.from(row.data),
        contentType: row.mime_type || 'image/jpeg',
      };
    }
  } catch (dbErr: any) {
    console.warn('[Storage] DB fallback retrieval error:', dbErr?.message);
  }

  // 3. Local fallback (by slug directory, or scanning across local upload dirs)
  let filePath = path.join(LOCAL_UPLOADS_ROOT, slug, filename);
  if (!fs.existsSync(filePath)) {
    // Check if file exists in any sibling directory under LOCAL_UPLOADS_ROOT
    if (fs.existsSync(LOCAL_UPLOADS_ROOT)) {
      try {
        const subdirs = fs.readdirSync(LOCAL_UPLOADS_ROOT);
        for (const dir of subdirs) {
          const candidate = path.join(LOCAL_UPLOADS_ROOT, dir, filename);
          if (fs.existsSync(candidate)) {
            filePath = candidate;
            break;
          }
        }
      } catch {}
    }
  }

  if (!fs.existsSync(filePath)) return null;

  const ext = path.extname(filename).toLowerCase();
  const mimeMap: Record<string, string> = {
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.webp': 'image/webp',
  };

  return {
    stream: fs.createReadStream(filePath),
    contentType: mimeMap[ext] || 'application/octet-stream',
  };
}

export async function deleteStoreFromStorage(slug: string): Promise<void> {
  const prefix = `uploads/${slug}/`;
  const client = getS3Client();
  const bucket = getR2Config().bucketName;

  if (client) {
    try {
      const list = await client.send(
        new ListObjectsV2Command({
          Bucket: bucket,
          Prefix: prefix,
        })
      );
      if (list.Contents && list.Contents.length > 0) {
        await client.send(
          new DeleteObjectsCommand({
            Bucket: bucket,
            Delete: {
              Objects: list.Contents.map((obj) => ({ Key: obj.Key })),
            },
          })
        );
      }
    } catch (err) {
      console.error(`Failed to delete R2 objects for slug ${slug}:`, err);
    }
  }

  // Also clean up from DB
  try {
    await pool.query(`DELETE FROM store_images WHERE slug = $1`, [slug]);
  } catch {}

  // Local fallback
  const dir = path.join(LOCAL_UPLOADS_ROOT, slug);
  if (fs.existsSync(dir)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}
