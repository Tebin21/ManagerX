import { notFound } from "next/navigation";
import { Smartphone, HardDrive, BadgeCheck } from "lucide-react";
import { fetchAdmin } from "@/lib/backend";
import { computeStoreHealth } from "@/lib/health";
import type { StoreDetail } from "@/lib/types";
import { formatBytes, formatDate, formatDateTime, formatRelative } from "@/lib/format";
import { PageHeader } from "@/components/PageHeader";
import { StatusBadge, storeStatusBadge, subscriptionStatusBadge } from "@/components/StatusBadge";
import { CopyButton } from "@/components/CopyButton";
import { StoreDetailActions } from "@/components/StoreDetailActions";
import { StoreEditForm } from "@/components/StoreEditForm";
import { StoreHealthPanel } from "@/components/StoreHealthPanel";
import { ActivityList } from "@/components/ActivityList";

export const dynamic = "force-dynamic";

export default async function StoreDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const storefrontBaseUrl = process.env.NEXT_PUBLIC_STOREFRONT_BASE_URL ?? "https://froshiar.store";

  let store: StoreDetail;
  try {
    store = await fetchAdmin<StoreDetail>(`/api/admin/stores/${slug}`);
  } catch {
    notFound();
  }

  const health = await computeStoreHealth(store, storefrontBaseUrl);
  const websiteUrl = `${storefrontBaseUrl}/${store.slug}`;
  const status = storeStatusBadge(store);
  const sub = subscriptionStatusBadge(store.subscriptionStatus);

  return (
    <div>
      <PageHeader
        title={store.businessName}
        description={store.slug}
        action={<StoreDetailActions store={store} />}
      />

      <div className="flex flex-wrap items-center gap-2">
        <StatusBadge label={status.label} tone={status.tone} />
        <StatusBadge label={`Subscription: ${sub.label}`} tone={sub.tone} />
        <a href={websiteUrl} target="_blank" rel="noopener noreferrer" className="text-sm text-brand-600 hover:underline dark:text-brand-500">
          Open Website ↗
        </a>
        <CopyButton value={websiteUrl} label="Copy URL" />
        <CopyButton value={store.slug} label="Copy Slug" />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2 flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <MiniStat label="Products" value={store.productsCount} />
            <MiniStat label="Categories" value={store.categoriesCount} />
            <MiniStat label="Syncs" value={store.syncCount ?? 0} />
            <MiniStat label="Storage" value={formatBytes(store.storageUsageBytes)} />
          </div>

          <StoreEditForm slug={store.slug} businessName={store.businessName} info={store.info} />

          <div className="rounded-xl border border-border bg-surface p-5">
            <h2 className="mb-3 text-sm font-semibold">Recent Activity</h2>
            <ActivityList entries={store.recentActivity} />
          </div>
        </div>

        <div className="flex flex-col gap-4">
          <StoreHealthPanel health={health} />

          <div className="rounded-xl border border-border bg-surface p-5">
            <h2 className="mb-3 flex items-center gap-1.5 text-sm font-semibold">
              <Smartphone size={14} /> Connected Device
            </h2>
            <dl className="space-y-2 text-sm">
              <Row label="Device ID" value={store.deviceId ?? "Not registered"} mono />
              <Row label="Legacy migrated" value={store.legacyMigratedAt ? formatDate(store.legacyMigratedAt) : "No"} />
            </dl>
          </div>

          <div className="rounded-xl border border-border bg-surface p-5">
            <h2 className="mb-3 flex items-center gap-1.5 text-sm font-semibold">
              <BadgeCheck size={14} /> Subscription
            </h2>
            <dl className="space-y-2 text-sm">
              <Row label="Plan" value={store.subscriptionPlan ?? "—"} />
              <Row label="Expires" value={store.subscriptionExpiresAt ?? "—"} />
              <Row label="Last checked" value={formatRelative(store.subscriptionCheckedAt)} />
            </dl>
            <p className="mt-3 text-xs text-muted">
              Subscription codes are generated externally (license-admin-panel) — renew/extend there. This reflects the
              last time the store&apos;s device checked in.
            </p>
          </div>

          <div className="rounded-xl border border-border bg-surface p-5">
            <h2 className="mb-3 flex items-center gap-1.5 text-sm font-semibold">
              <HardDrive size={14} /> Storage & Timestamps
            </h2>
            <dl className="space-y-2 text-sm">
              <Row label="Created" value={formatDateTime(store.createdAt)} />
              <Row label="Last sync" value={formatDateTime(store.lastSyncAt)} />
              <Row label="Uploaded images" value={formatBytes(store.storageUsageBytes)} />
            </dl>
          </div>
        </div>
      </div>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl border border-border bg-surface p-3">
      <div className="text-lg font-semibold">{value}</div>
      <div className="text-xs text-muted">{label}</div>
    </div>
  );
}

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="text-muted">{label}</dt>
      <dd className={`text-right ${mono ? "font-mono text-xs" : ""}`}>{value}</dd>
    </div>
  );
}
