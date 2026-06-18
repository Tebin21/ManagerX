import { getProductsByItemId } from '@/lib/sqlite';

const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

export function generateRandomProductId(): string {
  const letter = LETTERS[Math.floor(Math.random() * 26)];
  const digits = String(Math.floor(Math.random() * 10000)).padStart(4, '0');
  return `${letter}${digits}`;
}

export async function generateUniqueProductId(
  existingIds: string[] = [],
  maxAttempts = 10
): Promise<string> {
  const taken = new Set(existingIds.filter(Boolean));
  for (let i = 0; i < maxAttempts; i++) {
    const candidate = generateRandomProductId();
    if (taken.has(candidate)) continue;
    const rows = await getProductsByItemId(candidate);
    if (rows.length === 0) return candidate;
  }
  throw new Error('ID_EXHAUSTED');
}
