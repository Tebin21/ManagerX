import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '../../.env') });

import { uploadToStorage, getFromStorage, isR2Configured, R2_BUCKET_NAME } from '../r2Storage';

async function testR2() {
  console.log('[R2 Test] Bucket Name:', R2_BUCKET_NAME);
  console.log('[R2 Test] Is R2 Configured:', isR2Configured);
  if (!isR2Configured) {
    console.log('[R2 Test] Cloudflare R2 credentials (R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY) not present in local .env.');
    console.log('[R2 Test] If you placed them on Vercel environment variables, they will be used when deployed.');
  }

  const testSlug = 'froshiar-test';
  const testFilename = 'test-ping.png';
  // 1x1 sample PNG buffer
  const sampleBuffer = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
    'base64'
  );

  console.log('[R2 Test] Attempting image upload...');
  const key = await uploadToStorage(testSlug, testFilename, sampleBuffer, 'image/png');
  console.log('[R2 Test] Uploaded successfully with storage key:', key);

  console.log('[R2 Test] Attempting image retrieval...');
  const retrieved = await getFromStorage(testSlug, testFilename);
  if (!retrieved) {
    throw new Error('Image retrieval returned null');
  }

  console.log('[R2 Test] Retrieved image stream successfully. ContentType:', retrieved.contentType);
  console.log('[R2 Test] Storage Verification: PASSED');
}

testR2().catch((err) => {
  console.error('[R2 Test] Failed:', err);
  process.exit(1);
});
