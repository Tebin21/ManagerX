/**
 * Security and sanitization utilities for Froshiar (ManagerX).
 *
 * Provides defense-in-depth protections against:
 * 1. HTML / Attribute / XSS injection in PDF and print templates.
 * 2. Unsafe URI schemes (e.g. javascript:, data:text/html) in image rendering.
 * 3. Path traversal attacks in file operations.
 * 4. Identifier validation for dynamic SQLite queries.
 */

const SAFE_IMAGE_URI_REGEX =
  /^(?:https?:\/\/|file:\/\/|data:image\/(?:png|jpeg|jpg|webp|gif|svg\+xml);base64,[A-Za-z0-9+/=]+|content:\/\/)/i;

/**
 * Escapes HTML metacharacters including single quotes to prevent breaking
 * out of HTML elements or quoted HTML attributes.
 */
export function escHtml(str: unknown): string {
  if (str == null) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Validates that an image URI strictly conforms to safe, permitted schemes.
 * Rejects javascript:, vbscript:, arbitrary data URIs (e.g. data:text/html),
 * control characters, and returns an escaped URI suitable for <img src="...">.
 */
export function sanitizeImageUri(uri: string | null | undefined): string | null {
  if (!uri) return null;
  const trimmed = uri.trim();
  if (!trimmed) return null;

  // Block null bytes, newlines, carriage returns, or control characters
  if (/[\x00-\x1f\x7f]/.test(trimmed)) return null;

  // Block directory traversal in file / local URIs
  if (trimmed.includes('..')) return null;

  if (!SAFE_IMAGE_URI_REGEX.test(trimmed)) {
    return null;
  }

  return escHtml(trimmed);
}

/**
 * Validates that an input is a valid ISO date or datetime string (YYYY-MM-DD or YYYY-MM-DDTHH:mm:ss...)
 */
export function isValidIsoDateOrTime(str: string | null | undefined): boolean {
  if (!str) return false;
  return /^\d{4}-\d{2}-\d{2}([ T]\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:?\d{2})?)?$/.test(str.trim());
}

/**
 * Validates that an SQL identifier contains only alphanumeric characters and underscores.
 * Throws an error if the identifier is malformed.
 */
export function assertSafeSqlIdentifier(identifier: string): string {
  if (!/^[a-zA-Z0-9_]+$/.test(identifier)) {
    throw new Error(`INVALID_SQL_IDENTIFIER:${identifier}`);
  }
  return `"${identifier}"`;
}
