import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectsCommand,
  ListObjectsV2Command,
} from '@aws-sdk/client-s3';
import fs from 'fs';
import path from 'path';

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
      console.error('[R2 Storage] PutObjectCommand failed:', err.message);
      throw new Error(`Cloudflare R2 error: ${err.message}. Please check R2_SECRET_ACCESS_KEY in Vercel (expected 64 characters, currently ${getR2Config().secretAccessKey.length}).`);
    }
  }

  // Local fallback
  const dir = path.join(LOCAL_UPLOADS_ROOT, slug);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, filename), buffer);
  return key;
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
      if (!response.Body) return null;
      return {
        stream: response.Body as unknown as NodeJS.ReadableStream,
        contentType: response.ContentType || 'image/jpeg',
      };
    } catch (err: any) {
      if (err.name === 'NoSuchKey' || err.$metadata?.httpStatusCode === 404) {
        return null;
      }
      throw err;
    }
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
    return;
  }

  // Local fallback
  const dir = path.join(LOCAL_UPLOADS_ROOT, slug);
  if (fs.existsSync(dir)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}
