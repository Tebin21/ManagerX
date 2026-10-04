import { pool } from './pool';
import { hashApiKey } from '../auth';

export async function seedSampleStores(): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Sample store 1: ali
    const aliRes = await client.query<{ id: string }>(
      `INSERT INTO stores (slug, business_name, api_key_hash, enabled, admin_suspended, info, updated_at)
       VALUES ($1, $2, $3, true, false, $4, NOW())
       ON CONFLICT (slug) DO UPDATE SET
         business_name = EXCLUDED.business_name,
         enabled = true,
         info = EXCLUDED.info,
         updated_at = NOW()
       RETURNING id`,
      [
        'ali',
        'Ali Boutique',
        hashApiKey('sample-ali-secret-key-testing'),
        JSON.stringify({
          description: 'Ali Boutique — Premium fashion and accessories (Sample Test Store)',
          phone: '0750 111 2233',
          address: 'Bakhtiyari, Erbil',
          themeColor: '#4f46e5',
        }),
      ]
    );
    const aliId = aliRes.rows[0].id;

    // Ali products
    await client.query(
      `INSERT INTO products (store_id, product_id, name, category, price, quantity, is_published, updated_at)
       VALUES ($1, 1, 'Classic Italian Suit - Navy', 'Suits', 180000, 4, true, NOW()),
              ($1, 2, 'Silk Tie - Burgundy', 'Accessories', 25000, 15, true, NOW())
       ON CONFLICT (store_id, product_id) DO UPDATE SET
         name = EXCLUDED.name,
         price = EXCLUDED.price,
         quantity = EXCLUDED.quantity,
         category = EXCLUDED.category,
         is_published = true,
         updated_at = NOW()`,
      [aliId]
    );

    // Sample store 2: karwan
    const karwanRes = await client.query<{ id: string }>(
      `INSERT INTO stores (slug, business_name, api_key_hash, enabled, admin_suspended, info, updated_at)
       VALUES ($1, $2, $3, true, false, $4, NOW())
       ON CONFLICT (slug) DO UPDATE SET
         business_name = EXCLUDED.business_name,
         enabled = true,
         info = EXCLUDED.info,
         updated_at = NOW()
       RETURNING id`,
      [
        'karwan',
        'Karwan Tech Hub',
        hashApiKey('sample-karwan-secret-key-testing'),
        JSON.stringify({
          description: 'Karwan Tech Hub — Gaming gear and electronics (Sample Test Store)',
          phone: '0770 999 8877',
          address: 'Sultan Muthafar, Erbil',
          themeColor: '#059669',
        }),
      ]
    );
    const karwanId = karwanRes.rows[0].id;

    // Karwan products
    await client.query(
      `INSERT INTO products (store_id, product_id, name, category, price, quantity, is_published, updated_at)
       VALUES ($1, 1, 'Mechanical Gaming Keyboard RGB', 'Gaming Gear', 65000, 8, true, NOW()),
              ($1, 2, 'Wireless Ergonomic Mouse 16000 DPI', 'Gaming Gear', 45000, 12, true, NOW())
       ON CONFLICT (store_id, product_id) DO UPDATE SET
         name = EXCLUDED.name,
         price = EXCLUDED.price,
         quantity = EXCLUDED.quantity,
         category = EXCLUDED.category,
         is_published = true,
         updated_at = NOW()`,
      [karwanId]
    );

    await client.query('COMMIT');
    console.log('[Seed] Sample stores /ali and /karwan seeded successfully in Neon.');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[Seed] Failed to seed sample stores:', err);
    throw err;
  } finally {
    client.release();
  }
}

if (require.main === module) {
  seedSampleStores()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
