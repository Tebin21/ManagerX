const path = require('path');
const createNextIntlPlugin = require('next-intl/plugin');
const withNextIntl = createNextIntlPlugin('./i18n/request.ts');
module.exports = withNextIntl({
  output: 'export',
  images: { unoptimized: true },
  turbopack: { root: path.join(__dirname) },
});
