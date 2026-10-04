import fs from 'fs';
import path from 'path';
import { pool } from './pool';
import { hashApiKey } from '../auth';

export async function seedDemoStore(): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Create or update demo store 'froshiar'
    const demoSlug = 'froshiar';
    const demoApiKeyHash = hashApiKey('demo-froshiar-secret-key-testing-only');

    const demoInfo = {
      description: 'Official Froshiar Demo Store — Testing multi-tenant catalog, categories, and ordering.',
      phone: '0770 234 5678',
      address: 'Erbil, Kurdistan Region, Iraq',
      facebookUrl: 'https://facebook.com/froshiar',
      instagramUrl: 'https://instagram.com/froshiar',
      tiktokUrl: 'https://tiktok.com/@froshiar',
      whatsappNumber: '9647702345678',
      themeColor: '#2563eb',
    };

    const storeRes = await client.query<{ id: string }>(
      `INSERT INTO stores (
         slug, business_name, api_key_hash, enabled, admin_suspended, info, updated_at
       ) VALUES ($1, $2, $3, true, false, $4, NOW())
       ON CONFLICT (slug) DO UPDATE SET
         business_name = EXCLUDED.business_name,
         info = EXCLUDED.info,
         enabled = true,
         admin_suspended = false,
         updated_at = NOW()
       RETURNING id`,
      [demoSlug, 'Froshiar Store', demoApiKeyHash, JSON.stringify(demoInfo)]
    );

    const storeId = storeRes.rows[0].id;
    console.log(`[Seed] Demo store ready with ID: ${storeId}`);

    // 2. Load demo products from froshiar-demo-data.json if present
    const demoDataPath = path.join(__dirname, '../../../../froshiar-demo-data.json');
    let productsToSeed: any[] = [];

    if (fs.existsSync(demoDataPath)) {
      const raw = fs.readFileSync(demoDataPath, 'utf8');
      const parsed = JSON.parse(raw);
      const rawProducts = parsed?.database?.products || [];

      // Map up to 20 representative products
      productsToSeed = rawProducts.slice(0, 20).map((p: any) => ({
        productId: p.id,
        name: p.name,
        category: p.category || 'General',
        description: p.notes || null,
        websiteDescription: p.warranty ? `Warranty: ${p.warranty}` : null,
        price: Number(p.selling_price) || 0,
        quantity: Math.max(Number(p.quantity) || 1, 1),
        imageUrl: p.image_uri || null,
        isPublished: true,
      }));
    }

    if (productsToSeed.length === 0) {
      // Fallback sample products
      productsToSeed = [
        {
          productId: 1,
          name: 'Wireless Bluetooth Earbuds Pro',
          category: 'Electronics',
          description: null,
          websiteDescription: 'Crisp sound, all-day battery',
          price: 145000,
          quantity: 10,
          imageUrl: 'https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=600',
          isPublished: true,
        },
        {
          productId: 2,
          name: 'Stainless Steel Insulated Water Bottle',
          category: 'Home & Kitchen',
          description: null,
          websiteDescription: 'Keeps drinks cold 24h',
          price: 25000,
          quantity: 15,
          imageUrl: 'https://images.unsplash.com/photo-1602143407151-7111542de6e8?w=600',
          isPublished: true,
        },
      ];
    }

    for (const p of productsToSeed) {
      await client.query(
        `INSERT INTO products (
           store_id, product_id, name, category, description, website_description,
           price, quantity, image_url, is_published, updated_at
         ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW())
         ON CONFLICT (store_id, product_id) DO UPDATE SET
           name = EXCLUDED.name,
           category = EXCLUDED.category,
           description = EXCLUDED.description,
           website_description = EXCLUDED.website_description,
           price = EXCLUDED.price,
           quantity = EXCLUDED.quantity,
           image_url = EXCLUDED.image_url,
           is_published = EXCLUDED.is_published,
           updated_at = NOW()`,
        [
          storeId,
          p.productId,
          p.name,
          p.category,
          p.description,
          p.websiteDescription,
          p.price,
          p.quantity,
          p.imageUrl,
          p.isPublished,
        ]
      );
    }

    await client.query('COMMIT');
    console.log(`[Seed] Seeded ${productsToSeed.length} demo products for store '${demoSlug}'.`);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[Seed] Failed to seed demo store:', err);
    throw err;
  } finally {
    client.release();
  }
}

if (require.main === module) {
  seedDemoStore()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
