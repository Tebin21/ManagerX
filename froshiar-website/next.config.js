const path = require('path');
const createNextIntlPlugin = require('next-intl/plugin');
const withNextIntl = createNextIntlPlugin('./i18n/request.ts');

const isExport = process.env.OUTPUT_EXPORT === 'true' || process.env.FIREBASE_BUILD === 'true';

module.exports = withNextIntl({
  ...(isExport ? { output: 'export' } : {}),
  images: {
    unoptimized: isExport,
    formats: ['image/avif', 'image/webp'],
    minimumCacheTTL: 60 * 60 * 24 * 30, // 30 days cache
  },
  compress: true,
  poweredByHeader: false,
  turbopack: { root: path.join(__dirname) },
});
