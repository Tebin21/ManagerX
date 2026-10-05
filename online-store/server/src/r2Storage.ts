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
      return key;
    } catch (err: any) {
      console.warn('[R2 Storage] PutObjectCommand failed, falling back to database storage:', err.message);
    }
  }

  // Persistent Database fallback (Neon Postgres store_images table)
  try {
    await pool.query(
      `INSERT INTO store_images (slug, filename, mime_type, data)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (filename) DO UPDATE SET data = $4, mime_type = $3`,
      [slug, filename, mimeType, buffer]
    );
    return key;
  } catch (dbErr: any) {
    console.warn('[Storage] DB fallback upload failed, falling back to local disk:', dbErr?.message);
  }

  // Local fallback
  try {
    const dir = path.join(LOCAL_UPLOADS_ROOT, slug);
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, filename), buffer);
    return key;
  } catch (fsErr: any) {
    console.error('[Storage] All storage backends failed:', fsErr?.message);
    throw new Error('Failed to save uploaded image across all storage providers.');
  }
}

export async function getFromStorage(
  slug: string,
  filename: string
): Promise<{ stream: NodeJS.ReadableStream; contentType: string } | null> {
  const key = `uploads/${slug}/${filename}`;
  const client = getS3Client();
  const bucket = getR2Config().bucketName;

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
        console.warn('[R2 Storage] R2 GetObjectCommand error, checking database fallback:', err.message);
      }
    }
  }

  // Persistent Database fallback
  try {
    const res = await pool.query(
      `SELECT mime_type, data FROM store_images WHERE slug = $1 AND filename = $2`,
      [slug, filename]
    );
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

  // Local fallback
  const filePath = path.join(LOCAL_UPLOADS_ROOT, slug, filename);
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
