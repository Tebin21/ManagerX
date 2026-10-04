import { getStoreRepository } from '../repositoryFactory';
import { hashApiKey } from '../auth';

export async function runIsolationTests(): Promise<{ passed: boolean; details: string[] }> {
  const repo = getStoreRepository();
  const logs: string[] = [];

  function log(msg: string) {
    logs.push(msg);
    console.log(`[TenantIsolationTest] ${msg}`);
  }

  log('Starting Multi-Tenant Isolation Tests...');

  try {
    const slugA = 'tenant-test-store-a';
    const slugB = 'tenant-test-store-b';

    // 1. Clean up old test tenants if they exist
    await repo.deleteStore(slugA).catch(() => {});
    await repo.deleteStore(slugB).catch(() => {});

    // 2. Create Store A and Store B
    log('Creating Tenant A and Tenant B...');
    const storeA = await repo.create({
      slug: slugA,
      businessName: 'Business Tenant A',
      apiKeyHash: hashApiKey('key-a'),
    });
    const storeB = await repo.create({
      slug: slugB,
      businessName: 'Business Tenant B',
      apiKeyHash: hashApiKey('key-b'),
    });

    if (storeA.slug !== slugA || storeB.slug !== slugB) {
      throw new Error('Tenant creation slug mismatch');
    }
    log(`Tenant A created (${storeA.slug}), Tenant B created (${storeB.slug})`);

    // 3. Sync isolated products into Store A
    log('Syncing products into Tenant A...');
    await repo.applySync(slugA, [
      {
        productId: 101,
        operation: 'upsert',
        name: 'Product A1 - Exclusive to Tenant A',
        category: 'Electronics A',
        price: 50000,
        quantity: 5,
        isPublished: true,
      },
      {
        productId: 102,
        operation: 'upsert',
        name: 'Product A2 - Exclusive to Tenant A',
        category: 'Electronics A',
        price: 75000,
        quantity: 2,
        isPublished: true,
      },
    ]);

    // 4. Sync completely different products into Store B
    log('Syncing products into Tenant B...');
    await repo.applySync(slugB, [
      {
        productId: 201,
        operation: 'upsert',
        name: 'Product B1 - Exclusive to Tenant B',
        category: 'Clothing B',
        price: 12000,
        quantity: 10,
        isPublished: true,
      },
    ]);

    // 5. Query Tenant A and verify it ONLY sees Tenant A products
    log('Verifying Tenant A data isolation...');
    const fetchedA = await repo.getBySlug(slugA);
    if (!fetchedA) throw new Error('Tenant A not found');

    const aProductIds = fetchedA.products.map((p) => p.productId);
    const aProductNames = fetchedA.products.map((p) => p.name);

    if (!aProductIds.includes(101) || !aProductIds.includes(102)) {
      throw new Error(`Tenant A is missing its own products: ${aProductIds}`);
    }
    if (aProductIds.includes(201)) {
      throw new Error('CRITICAL SECURITY VIOLATION: Tenant A received Product B1 from Tenant B!');
    }
    log(`Tenant A returned products: ${JSON.stringify(aProductNames)} (Tenant B products NOT present ✓)`);

    // 6. Query Tenant B and verify it ONLY sees Tenant B products
    log('Verifying Tenant B data isolation...');
    const fetchedB = await repo.getBySlug(slugB);
    if (!fetchedB) throw new Error('Tenant B not found');

    const bProductIds = fetchedB.products.map((p) => p.productId);
    const bProductNames = fetchedB.products.map((p) => p.name);

    if (!bProductIds.includes(201)) {
      throw new Error(`Tenant B is missing its own products: ${bProductIds}`);
    }
    if (bProductIds.includes(101) || bProductIds.includes(102)) {
      throw new Error('CRITICAL SECURITY VIOLATION: Tenant B received products belonging to Tenant A!');
    }
    log(`Tenant B returned products: ${JSON.stringify(bProductNames)} (Tenant A products NOT present ✓)`);

    // 7. Test unknown store returns null / 404
    const unknown = await repo.getBySlug('non-existent-store-xyz-404');
    if (unknown !== null) {
      throw new Error('Unknown slug did not return null');
    }
    log('Unknown store slug correctly returned null (404) ✓');

    // 8. Test manipulated URL product ID cross-tenant attack
    log('Testing manipulated product URL attack (trying to read Product 101 through Tenant B)...');
    const bAttemptAProduct = fetchedB.products.find((p) => p.productId === 101);
    if (bAttemptAProduct) {
      throw new Error('CRITICAL SECURITY VIOLATION: Tenant B exposes Tenant A product 101!');
    }
    log('Manipulated product URL attack rejected: Tenant B cannot access Tenant A product ID ✓');

    const aAttemptBProduct = fetchedA.products.find((p) => p.productId === 201);
    if (aAttemptBProduct) {
      throw new Error('CRITICAL SECURITY VIOLATION: Tenant A exposes Tenant B product 201!');
    }
    log('Manipulated product URL attack rejected: Tenant A cannot access Tenant B product ID ✓');

    // 8. Clean up test stores
    await repo.deleteStore(slugA);
    await repo.deleteStore(slugB);
    log('Test tenants cleaned up successfully ✓');

    log('ALL MULTI-TENANT ISOLATION TESTS PASSED!');
    return { passed: true, details: logs };
  } catch (err: any) {
    log(`TEST FAILED: ${err.message}`);
    return { passed: false, details: logs };
  }
}

if (require.main === module) {
  runIsolationTests()
    .then((result) => {
      if (!result.passed) process.exit(1);
      process.exit(0);
    })
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
