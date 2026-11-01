const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const slugPage = path.join(__dirname, '../app/[locale]/[slug]/page.tsx');
const productPage = path.join(__dirname, '../app/[locale]/[slug]/product/[productId]/page.tsx');

const origSlug = fs.readFileSync(slugPage, 'utf8');
const origProduct = fs.readFileSync(productPage, 'utf8');

try {
  console.log('[build-firebase] Preparing dynamic routes for static export...');
  fs.writeFileSync(slugPage, origSlug.replace('export const dynamicParams = true;', 'export const dynamicParams = false;'), 'utf8');
  fs.writeFileSync(productPage, origProduct.replace('export const dynamicParams = true;', 'export const dynamicParams = false;'), 'utf8');

  console.log('[build-firebase] Running next build with OUTPUT_EXPORT=true...');
  execSync('next build', {
    stdio: 'inherit',
    env: {
      ...process.env,
      OUTPUT_EXPORT: 'true',
    },
  });
  console.log('[build-firebase] Export build succeeded!');
} finally {
  console.log('[build-firebase] Restoring dynamic routes to dynamicParams = true...');
  fs.writeFileSync(slugPage, origSlug, 'utf8');
  fs.writeFileSync(productPage, origProduct, 'utf8');
}
