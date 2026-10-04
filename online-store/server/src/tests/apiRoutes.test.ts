process.env.NODE_ENV = 'test';
import app from '../index';
import http from 'http';

async function testHttpEndpoints() {
  const server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(4199, resolve));
  const baseUrl = 'http://127.0.0.1:4199';

  console.log('[HTTP Test] Server listening on ' + baseUrl);

  try {
    // 1. Health check
    const healthRes = await fetch(`${baseUrl}/api/health`);
    const healthJson = (await healthRes.json()) as any;
    console.log('[HTTP Test] GET /api/health status:', healthRes.status, healthJson);
    if (healthRes.status !== 200 || !healthJson.ok) {
      throw new Error('Health check failed');
    }

    // 2. Demo store /froshiar
    const froshiarRes = await fetch(`${baseUrl}/api/stores/froshiar`);
    const froshiarJson = (await froshiarRes.json()) as any;
    console.log('[HTTP Test] GET /api/stores/froshiar status:', froshiarRes.status, 'Store:', froshiarJson.businessName, 'Products count:', froshiarJson.products?.length);
    if (froshiarRes.status !== 200 || froshiarJson.businessName !== 'Froshiar Store' || froshiarJson.products?.length !== 20) {
      throw new Error('Froshiar store endpoint verification failed');
    }

    // 3. Test store /ali
    const aliRes = await fetch(`${baseUrl}/api/stores/ali`);
    const aliJson = (await aliRes.json()) as any;
    console.log('[HTTP Test] GET /api/stores/ali status:', aliRes.status, 'Store:', aliJson.businessName, 'Products count:', aliJson.products?.length);
    if (aliRes.status !== 200 || aliJson.businessName !== 'Ali Boutique') {
      throw new Error('Ali store endpoint verification failed');
    }

    // 4. Test store /karwan
    const karwanRes = await fetch(`${baseUrl}/api/stores/karwan`);
    const karwanJson = (await karwanRes.json()) as any;
    console.log('[HTTP Test] GET /api/stores/karwan status:', karwanRes.status, 'Store:', karwanJson.businessName, 'Products count:', karwanJson.products?.length);
    if (karwanRes.status !== 200 || karwanJson.businessName !== 'Karwan Tech Hub') {
      throw new Error('Karwan store endpoint verification failed');
    }

    // 5. Non-existent store
    const notFoundRes = await fetch(`${baseUrl}/api/stores/does-not-exist`);
    console.log('[HTTP Test] GET /api/stores/does-not-exist status:', notFoundRes.status);
    if (notFoundRes.status !== 404) {
      throw new Error('Non-existent store should return 404');
    }

    // 6. Scoped product check
    const aliProduct1 = await fetch(`${baseUrl}/api/stores/ali/products/1`);
    console.log('[HTTP Test] GET /api/stores/ali/products/1 status:', aliProduct1.status);
    const aliProductData = (await aliProduct1.json()) as any;
    console.log('[HTTP Test] Ali Product 1 Name:', aliProductData.name);
    if (aliProductData.name !== 'Classic Italian Suit - Navy') {
      throw new Error('Ali product 1 mismatch');
    }

    const karwanProduct1 = await fetch(`${baseUrl}/api/stores/karwan/products/1`);
    console.log('[HTTP Test] GET /api/stores/karwan/products/1 status:', karwanProduct1.status);
    const karwanProductData = (await karwanProduct1.json()) as any;
    console.log('[HTTP Test] Karwan Product 1 Name:', karwanProductData.name);
    if (karwanProductData.name !== 'Mechanical Gaming Keyboard RGB') {
      throw new Error('Karwan product 1 mismatch');
    }

    if (aliProductData.name === karwanProductData.name) {
      throw new Error('Cross-tenant leak detected!');
    }

    console.log('[HTTP Test] ALL HTTP API ROUTE TESTS PASSED SUCCESSFULLY!');
    server.close();
    process.exit(0);
  } finally {
    server.close();
  }
}

testHttpEndpoints().catch((err) => {
  console.error('[HTTP Test Error]', err);
  process.exit(1);
});
