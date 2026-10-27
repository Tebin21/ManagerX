import * as FileSystem from 'expo-file-system/legacy';

/**
 * Copies a picker temp URI to permanent app storage so it survives app
 * restarts and OS cache eviction. Falls back to the temp URI if
 * documentDirectory is unavailable (e.g. Expo Go on some platforms).
 */
const ALLOWED_EXTS = new Set(['jpg', 'jpeg', 'png', 'webp', 'gif', 'heic', 'mp4', 'mov']);

export async function copyToPermanentStorage(
  tempUri: string,
  subdir: string,
  preferredExt?: string
): Promise<string> {
  const baseDir = FileSystem.documentDirectory;
  if (!baseDir) return tempUri;

  // Prevent path traversal in directory name
  const safeSubdir = (subdir || 'media').replace(/[^a-zA-Z0-9_-]/g, '') || 'media';
  const dir = `${baseDir}${safeSubdir}/`;
  await FileSystem.makeDirectoryAsync(dir, { intermediates: true });

  // Strip query params before extracting extension
  const rawPath = tempUri.split('?')[0];
  const lastSlash = rawPath.lastIndexOf('/');
  const filename = lastSlash !== -1 ? rawPath.slice(lastSlash + 1) : rawPath;
  const lastDot = filename.lastIndexOf('.');
  const detectedExt = lastDot !== -1 ? filename.slice(lastDot + 1).toLowerCase() : null;

  const rawExt = (preferredExt || detectedExt || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '');
  const ext = ALLOWED_EXTS.has(rawExt) ? rawExt : 'jpg';

  const dest = `${dir}media_${Date.now()}.${ext}`;
  await FileSystem.copyAsync({ from: tempUri, to: dest });
  return dest;
}

/**
 * Resolves a product image URI safely across platforms, remote URLs, and iOS container reinstalls.
 */
export function resolveImageUri(uri: string | null | undefined): string | null {
  if (!uri) return null;
  const trimmed = uri.trim();
  if (!trimmed) return null;

  // Prevent directory traversal
  if (trimmed.includes('..')) return null;

  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  if (!FileSystem.documentDirectory) return trimmed;

  // Extract relative path inside document directory if present (e.g. product_images/media_123.jpg)
  // Handles both relative path and absolute path with outdated container UUID
  const match = trimmed.match(/(?:^|.*\/)((?:product_images|saved_presets|logo_images|supplier_logos|dashboard_banners|header_videos)\/[a-zA-Z0-9_.-]+)$/);
  if (match) {
    return `${FileSystem.documentDirectory}${match[1]}`;
  }
  return trimmed;
}

/**
 * Gets the best display image URI for a product, checking both local imageUri and imageRemoteUrl.
 */
export function getProductDisplayImage(product: {
  imageUri?: string | null;
  imageRemoteUrl?: string | null;
} | null | undefined): string | null {
  if (!product) return null;
  const candidate = (product.imageUri && product.imageUri.trim()) ||
                    (product.imageRemoteUrl && product.imageRemoteUrl.trim()) ||
                    null;
  return resolveImageUri(candidate);
}
