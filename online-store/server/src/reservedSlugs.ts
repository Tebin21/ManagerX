import { slugify } from './slugify';

// Path segments the storefront SPA's router (online-store/client/src/App.tsx) resolves
// as static routes — legal pages, well-known files, and names reserved for future
// account/admin/marketing surfaces — rather than the dynamic /:slug storefront
// catch-all. A store slug matching one of these would never be reachable at its own
// URL, so registration/updates must reject it outright rather than silently creating
// an unreachable store. Centralized here (not duplicated per call site) so the
// client-side route table and this list can be kept in sync by hand when either changes.
export const RESERVED_SLUGS: readonly string[] = [
  'privacy',
  'terms',
  'about',
  'contact',
  'support',
  'help',
  'docs',
  'documentation',
  'pricing',
  'plans',
  'features',
  'blog',
  'careers',
  'jobs',
  'press',
  'status',
  'download',
  'login',
  'logout',
  'register',
  'signup',
  'signin',
  'account',
  'accounts',
  'dashboard',
  'admin',
  'administrator',
  'api',
  'app',
  'apps',
  'store',
  'stores',
  'demo',
  'settings',
  'profile',
  'search',
  'cart',
  'checkout',
  'payment',
  'payments',
  'billing',
  'invoice',
  'invoices',
  'legal',
  'security',
  'verify',
  'verification',
  'forgot-password',
  'reset-password',
  'robots.txt',
  'sitemap.xml',
  'favicon.ico',
  'manifest.json',
  'apple-app-site-association',
  '.well-known',
];

// Normalized through the same slugify() a businessName goes through — not just
// lowercased. Several entries above (".well-known", "robots.txt", "sitemap.xml", …)
// contain characters slugify() itself strips/replaces, so a raw lowercase-only
// comparison would never match the actual slug a colliding businessName produces
// (e.g. ".well-known" slugifies to "well-known", "robots.txt" to "robots-txt").
// Running the whole list through slugify() once here keeps this list exactly as
// specified while still matching what really gets compared at call sites.
const RESERVED_SLUGS_SET = new Set(RESERVED_SLUGS.map(slugify));

// Case-insensitive and punctuation-normalized: "privacy", "Privacy", "PRIVACY",
// and ".well-known" vs "well-known" must all match.
export function isReservedSlug(slug: string): boolean {
  return RESERVED_SLUGS_SET.has(slugify(slug));
}
