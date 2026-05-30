import { loadBusiness, saveBusiness } from '@/lib/sqlite';

export function useLocalDB() {
  return { loadBusiness, saveBusiness };
}
