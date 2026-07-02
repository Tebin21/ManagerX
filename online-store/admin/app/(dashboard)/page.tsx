import {
  Store,
  CheckCircle2,
  AlertTriangle,
  Ban,
  Trash2,
  Package,
  Tags,
  RefreshCw,
  XCircle,
  CalendarClock,
  CalendarDays,
} from "lucide-react";
import { fetchAdmin } from "@/lib/backend";
import { computeDashboardStats } from "@/lib/stats";
import type { ActivityEntry, DeletedStoreRecord, StoreSummary } from "@/lib/types";
import { StatCard } from "@/components/StatCard";
import { PageHeader } from "@/components/PageHeader";
import { ChartCard } from "@/components/charts/ChartCard";
import { SimpleBarChart } from "@/components/charts/SimpleBarChart";
import { SimpleDonutChart } from "@/components/charts/SimpleDonutChart";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const [{ stores }, { stores: deletedStores }, activityRes, growthRes] = await Promise.all([
    fetchAdmin<{ stores: StoreSummary[] }>("/api/admin/stores"),
    fetchAdmin<{ stores: DeletedStoreRecord[] }>("/api/admin/deleted-stores"),
    fetchAdmin<{ entries: ActivityEntry[]; total: number }>("/api/admin/activity?limit=500"),
    fetchAdmin<{ counts: Record<string, number> }>("/api/admin/stats/products-growth"),
  ]);

  const { cards, newStoresPerMonth, activeVsSuspended, subscriptionStatus, dailySyncActivity, productsGrowth } =
    computeDashboardStats(stores, deletedStores, activityRes.entries, growthRes.counts);

  return (
    <div>
      <PageHeader title="Dashboard" description="Live overview of every ManagerX Online Store." />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
        <StatCard label="Total Stores" value={cards.totalStores} icon={Store} tone="brand" />
        <StatCard label="Active Stores" value={cards.activeStores} icon={CheckCircle2} tone="success" />
        <StatCard label="Expired Subscription" value={cards.expiredSubscriptions} icon={AlertTriangle} tone="warning" />
        <StatCard label="Suspended Stores" value={cards.suspendedStores} icon={Ban} tone="danger" />
        <StatCard label="Deleted Stores" value={cards.deletedStores} icon={Trash2} />
        <StatCard label="Total Products" value={cards.totalProducts} icon={Package} />
        <StatCard label="Total Categories" value={cards.totalCategories} icon={Tags} />
        <StatCard label="Total Sync Requests" value={cards.totalSyncRequests} icon={RefreshCw} />
        <StatCard label="Failed Syncs" value={cards.failedSyncs} icon={XCircle} tone={cards.failedSyncs > 0 ? "danger" : "default"} />
        <StatCard label="Created Today" value={cards.createdToday} icon={CalendarClock} />
        <StatCard label="Created This Month" value={cards.createdThisMonth} icon={CalendarDays} />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <ChartCard title="New Stores per Month">
          <SimpleBarChart data={newStoresPerMonth} />
        </ChartCard>
        <ChartCard title="Active vs Suspended vs Disabled">
          <SimpleDonutChart data={activeVsSuspended} />
        </ChartCard>
        <ChartCard title="Subscription Status" caveat="Reflects the last time each store's device checked in — not a live poll.">
          <SimpleDonutChart data={subscriptionStatus} />
        </ChartCard>
        <ChartCard title="Daily Sync Failures (14 days)">
          <SimpleBarChart data={dailySyncActivity} />
        </ChartCard>
        <ChartCard
          title="Products Growth"
          caveat="Best-effort: buckets currently-existing products by their last update, not true creation date (products only carry an `updatedAt` timestamp)."
        >
          <SimpleBarChart data={productsGrowth} />
        </ChartCard>
      </div>
    </div>
  );
}
