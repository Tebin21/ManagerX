import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, ImageOff, MessageCircle, Phone } from 'lucide-react';
import { fetchStorefront, type StoreProduct } from '@/lib/storefront/storeApi';
import { DEMO_STORE } from '@/lib/storefront/demoStore';
import { getBrandCssVars } from '@/lib/storefront/theme';
import { formatIQD } from '@/lib/storefront/format';
import { StoreContactBanner } from '@/components/storefront/StoreContactBanner';
import { StorefrontFooter } from '@/components/storefront/StorefrontFooter';
import { CartProvider } from '@/components/storefront/CartContext';
import { CartDrawer } from '@/components/storefront/CartDrawer';
import { FloatingCartBar } from '@/components/storefront/FloatingCartBar';
import { ProductAddToCart } from '@/components/storefront/ProductAddToCart';
import { ProductHeaderBar } from '@/components/storefront/ProductHeaderBar';

export const dynamic = 'force-dynamic';
export const dynamicParams = true;
export const revalidate = 0;
export const fetchCache = 'force-no-store';

export function generateStaticParams() {
  return [
    { slug: 'demo', productId: '1' },
  ];
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string; productId: string }>;
}): Promise<Metadata> {
  const { slug, productId } = await params;
  const clean = (slug || '').trim().toLowerCase();

  const store = clean === 'demo' ? DEMO_STORE : await fetchStorefront(clean).catch(() => null);
  const product = store?.products.find((p) => String(p.productId) === String(productId));

  if (!product) {
    return { title: 'Product Not Found — Froshiar' };
  }

  return {
    title: `${product.name} — ${store?.businessName || 'Froshiar Store'}`,
    description: product.websiteDescription || product.description || product.name,
  };
}

export default async function ProductDetailsPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string; productId: string }>;
}) {
  const { slug, productId } = await params;
  const clean = (slug || '').trim().toLowerCase();

  const store = clean === 'demo' ? DEMO_STORE : await fetchStorefront(clean).catch(() => null);
  if (!store) {
    notFound();
  }

  const product = store.products.find((p) => String(p.productId) === String(productId));
  if (!product) {
    notFound();
  }

  const brandStyle = getBrandCssVars(store.info.themeColor);
  const whatsappUrl = store.info.whatsappNumber
    ? `https://wa.me/${store.info.whatsappNumber.replace(/\D/g, '')}?text=${encodeURIComponent(
        `سڵاو، دەمەوێت ئەم کاڵایە داوا بکەم:\n*${product.name}*\nنرخ: ${formatIQD(product.price)}`
      )}`
    : null;

  const isRTL = /[\u0600-\u06FF\u0750-\u077F\uFB50-\uFDFF\uFE70-\uFEFF]/.test(
    `${store.businessName} ${product.name} ${product.description || ''} ${product.websiteDescription || ''}`
  );

  return (
    <CartProvider storeSlug={clean} products={store.products}>
      <div
        dir={isRTL ? 'rtl' : 'ltr'}
        className="min-h-screen flex flex-col bg-slate-50 transition-colors duration-200 dark:bg-slate-900 font-kurdish"
        style={brandStyle}
      >
        <main className="mx-auto max-w-4xl px-4 py-8 flex-1 w-full">
          <ProductHeaderBar storeSlug={clean} isRTL={isRTL} />

          <div className="overflow-hidden rounded-3xl bg-white shadow-sm border border-slate-100 dark:bg-slate-800 dark:border-slate-700">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 p-6 md:p-8">
              <div className="relative aspect-square rounded-2xl overflow-hidden bg-slate-100 dark:bg-slate-900">
                {product.category && (
                  <span className="absolute left-3 top-3 z-10 rounded-full bg-white/95 px-3 py-1 text-xs font-bold uppercase tracking-wide text-slate-700 shadow-xs dark:bg-slate-800 dark:text-slate-200">
                    {product.category}
                  </span>
                )}
                {product.imageUrl ? (
                  <img
                    src={product.imageUrl}
                    alt={product.name}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full flex-col items-center justify-center gap-2 text-slate-400">
                    <ImageOff size={40} />
                    <span className="text-sm">بێ وێنە</span>
                  </div>
                )}
              </div>

              <div className="flex flex-col justify-between">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-[var(--brand-600,#2563eb)] mb-1">
                    {store.businessName}
                  </p>
                  <h1 className="text-2xl font-black text-slate-900 dark:text-white">
                    {product.name}
                  </h1>
                  <p className="mt-4 text-3xl font-extrabold text-[var(--brand-600,#2563eb)]">
                    {formatIQD(product.price)}
                  </p>

                  {product.websiteDescription && (
                    <div className="mt-6 rounded-2xl bg-slate-50 p-4 border border-slate-100 dark:bg-slate-900 dark:border-slate-800">
                      <p className="text-xs font-bold text-slate-400 mb-1">تایبەتمەندی و وەسف:</p>
                      <p className="text-sm leading-relaxed text-slate-700 dark:text-slate-300">
                        {product.websiteDescription}
                      </p>
                    </div>
                  )}

                  {product.description && product.description !== product.websiteDescription && (
                    <p className="mt-4 text-sm leading-relaxed text-slate-500 dark:text-slate-400">
                      {product.description}
                    </p>
                  )}
                </div>

                <div className="mt-8 flex flex-col gap-3.5 pt-6 border-t border-slate-100 dark:border-slate-700">
                  {/* Quantity Stepper & Add to Cart Button */}
                  <ProductAddToCart product={product} />

                  {whatsappUrl && (
                    <a
                      href={whatsappUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-center gap-2.5 rounded-2xl bg-emerald-600/10 border border-emerald-500/30 px-6 py-3 text-sm font-bold text-emerald-600 hover:bg-emerald-600 hover:text-white transition dark:bg-emerald-500/10 dark:text-emerald-400 dark:hover:bg-emerald-600 dark:hover:text-white"
                    >
                      <MessageCircle size={18} /> داواکردنی خێرای ئەم کاڵایە لە ڕێگەی واتسئەپ
                    </a>
                  )}
                  {store.info.phone && (
                    <a
                      href={`tel:${store.info.phone}`}
                      className="flex items-center justify-center gap-2.5 rounded-2xl bg-slate-100 px-6 py-3 text-sm font-bold text-slate-700 hover:bg-slate-200 transition dark:bg-slate-700 dark:text-slate-200"
                    >
                      <Phone size={16} />
                      <span>پەیوەندیکردن بە فڕۆشگا:</span>
                      <span
                        dir="ltr"
                        className="inline-block font-sans tabular-nums font-bold"
                        style={{ direction: 'ltr', unicodeBidi: 'isolate' }}
                      >
                        {store.info.phone}
                      </span>
                    </a>
                  )}
                </div>
              </div>
            </div>
          </div>
        </main>

        <StoreContactBanner info={store.info} />

        <StorefrontFooter isRTL={isRTL} />

        <FloatingCartBar isRTL={isRTL} />

        <CartDrawer businessName={store.businessName} info={store.info} />
      </div>
    </CartProvider>
  );
}
