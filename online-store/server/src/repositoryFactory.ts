import type { StoreRepository } from './storeRepository';
import { JsonStoreRepository } from './jsonStoreRepository';
import { PostgresStoreRepository } from './postgresStoreRepository';

let repositoryInstance: StoreRepository | null = null;

export function getStoreRepository(): StoreRepository {
  if (!repositoryInstance) {
    const dbUrl = process.env.DATABASE_URL?.trim();
    if (dbUrl) {
      console.log('[StoreRepository] Using PostgresStoreRepository (Neon PostgreSQL)');
      repositoryInstance = new PostgresStoreRepository();
    } else {
      if (process.env.NODE_ENV === 'production' || process.env.VERCEL || process.env.VERCEL_ENV) {
        throw new Error('FATAL: DATABASE_URL environment variable is required in production. Please configure DATABASE_URL in your Vercel project settings.');
      }
      console.warn('[StoreRepository] DATABASE_URL not set; using local JsonStoreRepository for offline development only');
      repositoryInstance = new JsonStoreRepository();
    }
  }
  return repositoryInstance;
}
