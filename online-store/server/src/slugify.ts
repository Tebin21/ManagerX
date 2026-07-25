// Shared by jsonStoreRepository.ts (turns a businessName into a slug) and
// reservedSlugs.ts (normalizes the reserved-word list into the same shape a real
// slug can take) — kept in one place so both always treat punctuation/casing
// identically instead of drifting apart.
export function slugify(name: string): string {
  const base = name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return base || 'store';
}
