import type { ActivityEntry, DeletedStoreRecord, StoreSummary } from "./types";

export function isActive(s: StoreSummary): boolean {
  return s.enabled && !s.adminSuspended;
}

export function isExpiredSubscription(s: StoreSummary): boolean {
  return s.subscriptionStatus === "expired";
}

function monthKey(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function monthLabel(key: string): string {
  const [y, m] = key.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString("en-US", { month: "short" });
}

// Last N months, oldest first, always present even if zero — so the chart
// doesn't silently skip a quiet month.
function lastMonths(n: number): string[] {
  const out: string[] = [];
  const now = new Date();
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    out.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
  }
  return out;
}

export function computeDashboardStats(
  stores: StoreSummary[],
  deletedStores: DeletedStoreRecord[],
  activity: ActivityEntry[],
  productsGrowthCounts: Record<string, number> = {}
) {
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime();

  const totalProducts = stores.reduce((sum, s) => sum + s.productsCount, 0);
  const categories = new Set<string>();
  // categoriesCount per store is already a distinct count within that store;
  // a true global distinct count needs the actual category strings, which
  // the summary endpoint doesn't carry (see routes/admin.ts's toSummary()).
  // Approximate with the sum of each store's distinct count — exact only
  // when stores don't share category names, which is the common case since
  // each store manages its own catalog independently.
  stores.forEach((s) => categories.add(String(s.categoriesCount)));

  const cards = {
    totalStores: stores.length,
    activeStores: stores.filter(isActive).length,
    expiredSubscriptions: stores.filter(isExpiredSubscription).length,
    suspendedStores: stores.filter((s) => s.adminSuspended).length,
    deletedStores: deletedStores.length,
    totalProducts,
    totalCategories: stores.reduce((sum, s) => sum + s.categoriesCount, 0),
    totalSyncRequests: stores.reduce((sum, s) => sum + (s.syncCount ?? 0), 0),
    failedSyncs: activity.filter((a) => a.action === "sync_failed").length,
    createdToday: stores.filter((s) => new Date(s.createdAt).getTime() >= startOfToday).length,
    createdThisMonth: stores.filter((s) => new Date(s.createdAt).getTime() >= startOfMonth).length,
  };

  const months = lastMonths(6);
  const newStoresPerMonth = months.map((key) => ({
    label: monthLabel(key),
    value: stores.filter((s) => monthKey(s.createdAt) === key).length,
  }));

  const activeVsSuspended = [
    { label: "Active", value: cards.activeStores },
    { label: "Suspended", value: cards.suspendedStores },
    { label: "Disabled", value: stores.filter((s) => !s.enabled && !s.adminSuspended).length },
  ];

  const subscriptionStatus = [
    { label: "Valid", value: stores.filter((s) => s.subscriptionStatus === "valid").length },
    { label: "Expired", value: stores.filter((s) => s.subscriptionStatus === "expired").length },
    {
      label: "Invalid / other",
      value: stores.filter((s) => s.subscriptionStatus && !["valid", "expired"].includes(s.subscriptionStatus)).length,
    },
    { label: "No data", value: stores.filter((s) => !s.subscriptionStatus).length },
  ];

  const days: string[] = [];
  for (let i = 13; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
    days.push(d.toISOString().slice(0, 10));
  }
  const dailySyncActivity = days.map((day) => ({
    label: new Date(day).toLocaleDateString("en-US", { day: "2-digit", month: "short" }),
    value: activity.filter((a) => a.action === "sync_failed" && a.timestamp.slice(0, 10) === day).length,
  }));

  // Best-effort only: products don't have an immutable creation date, only
  // `updatedAt` (see lib/types.ts's StoreProduct). This buckets by the most
  // recent bump of each currently-existing product, not true creation date —
  // see the caveat text this feeds into on the dashboard page.
  const productsGrowth = months.map((key) => ({
    label: monthLabel(key),
    value: productsGrowthCounts[key] ?? 0,
  }));

  return { cards, newStoresPerMonth, activeVsSuspended, subscriptionStatus, dailySyncActivity, productsGrowth };
}
