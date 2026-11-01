import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { fetchStorefront } from '@/lib/storefront/storeApi';
import { DEMO_STORE } from '@/lib/storefront/demoStore';
import { StorefrontView } from '@/components/storefront/StorefrontView';

export const dynamicParams = true;

const RESERVED_SLUGS = ['admin', 'privacy', 'terms', 'delete-account', 'api', '_next'];

export function generateStaticParams() {
  return [
    { slug: 'demo' },
  ];
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const clean = (slug || '').trim().toLowerCase();

  if (clean === 'demo') {
    return {
      title: `${DEMO_STORE.businessName} — فرۆشیار`,
      description: DEMO_STORE.info.description,
    };
  }

  try {
    const store = await fetchStorefront(clean);
    if (!store) {
      return { title: 'Store Not Found — Froshiar' };
    }
    return {
      title: `${store.businessName} — فرۆشگای ئۆنلاین`,
      description: store.info.description || `فڕۆشگای ئۆنلاینی فەرمی ${store.businessName} لە سیستەمی فرۆشیار`,
    };
  } catch {
    return { title: 'Store — Froshiar' };
  }
}

export default async function StorefrontPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { slug } = await params;
  const clean = (slug || '').trim().toLowerCase();

  if (RESERVED_SLUGS.includes(clean)) {
    notFound();
  }

  if (clean === 'demo') {
    return <StorefrontView store={DEMO_STORE} slug="demo" />;
  }

  try {
    const store = await fetchStorefront(clean);
    if (!store) {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-slate-50 text-center dark:bg-slate-900">
          <div className="w-16 h-16 rounded-full bg-slate-200 dark:bg-slate-800 flex items-center justify-center mb-4 text-2xl font-bold text-slate-500">
            🔍
          </div>
          <h1 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-2">
            ئەم فڕۆشگایە نەدۆزرایەوە
          </h1>
          <p className="text-sm text-slate-500 max-w-sm">
            هیچ فڕۆشگایەک بەم ناونیشانە (<span className="font-mono text-amber-500">{clean}</span>) لە سیستەمەکە تۆمار نەکراوە.
          </p>
          <a
            href="/"
            className="mt-6 px-5 py-2.5 rounded-full bg-amber-500 text-slate-950 font-bold text-sm hover:bg-amber-400 transition"
          >
            گەڕانەوە بۆ سەرەتا
          </a>
        </div>
      );
    }

    return <StorefrontView store={store} slug={clean} />;
  } catch (err) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-slate-50 text-center dark:bg-slate-900">
        <h1 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-2">
          کێشەیەک ڕوویدا لە بارکردنی فڕۆشگاکە
        </h1>
        <p className="text-sm text-slate-500 mb-4">
          تکایە دواتر هەوڵ بدەرەوە یان لاپەڕەکە نوێ بکەرەوە.
        </p>
        <a
          href={`/${clean}`}
          className="px-5 py-2.5 rounded-full bg-blue-600 text-white font-bold text-sm hover:bg-blue-500 transition"
        >
          دووبارە هەوڵدانەوە
        </a>
      </div>
    );
  }
}
