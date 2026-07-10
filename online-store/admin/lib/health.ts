import "server-only";
import type { StoreDetail } from "./types";

export interface StoreHealth {
  websiteOnline: boolean | "unknown";
  apiConnected: true; // if this ran at all, the admin API responded
  syncWorking: boolean | "unknown";
  subscriptionValid: boolean;
  imagesOk: boolean | "unknown";
  lastError: string | null;
}

async function fetchWithTimeout(url: string, ms: number): Promise<Response | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  try {
    return await fetch(url, { signal: controller.signal, cache: "no-store" });
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

// Best-effort, cheaply-computed signals — NOT a full uptime/monitoring
// system (see the plan's Store Health section). Runs server-side (not in the
// browser) so it isn't subject to CORS against the public storefront origin.
export async function computeStoreHealth(store: StoreDetail, storefrontBaseUrl: string): Promise<StoreHealth> {
  const websiteRes = await fetchWithTimeout(`${storefrontBaseUrl}/${store.slug}`, 4000);
  const websiteOnline: boolean | "unknown" = websiteRes ? websiteRes.ok : "unknown";

  const syncWorking: boolean | "unknown" = store.lastSyncAt
    ? Date.now() - new Date(store.lastSyncAt).getTime() < 30 * 24 * 60 * 60 * 1000
    : "unknown";

  const spotCheckImage = store.info?.logoUrl ?? store.products.find((p) => p.imageUrl)?.imageUrl ?? null;
  let imagesOk: boolean | "unknown" = "unknown";
  if (spotCheckImage) {
    const imgRes = await fetchWithTimeout(spotCheckImage, 3000);
    imagesOk = imgRes ? imgRes.ok : false;
  }

  const lastError = store.recentActivity.find((a) => a.action === "sync_failed")?.details ?? null;

  return {
    websiteOnline,
    apiConnected: true,
    syncWorking,
    subscriptionValid: store.subscriptionStatus === "valid",
    imagesOk,
    lastError,
  };
}
