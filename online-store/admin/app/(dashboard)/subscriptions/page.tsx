import Link from "next/link";
import { fetchAdmin } from "@/lib/backend";
import type { StoreSummary } from "@/lib/types";
import { PageHeader } from "@/components/PageHeader";
import { StatusBadge, subscriptionStatusBadge } from "@/components/StatusBadge";
import { formatDateTime, formatRelative } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function SubscriptionsPage() {
  const { stores } = await fetchAdmin<{ stores: StoreSummary[] }>("/api/admin/stores");

  return (
    <div>
      <PageHeader
        title="Subscriptions"
        description="View-only — subscription codes are Ed25519 tokens generated externally in license-admin-panel and are never stored as mutable state here. This reflects the last time each store's device checked in."
      />

      <div className="overflow-x-auto rounded-xl border border-border bg-surface">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted">
              <th className="px-4 py-3 font-medium">Store</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Plan</th>
              <th className="px-4 py-3 font-medium">Expires</th>
              <th className="px-4 py-3 font-medium">Last Checked</th>
            </tr>
          </thead>
          <tbody>
            {stores.map((store) => {
              const sub = subscriptionStatusBadge(store.subscriptionStatus);
              return (
                <tr key={store.slug} className="border-b border-border last:border-0">
                  <td className="px-4 py-3">
                    <Link href={`/stores/${store.slug}`} className="font-medium hover:underline">
                      {store.businessName}
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge label={sub.label} tone={sub.tone} />
                  </td>
                  <td className="px-4 py-3">{store.subscriptionPlan ?? "—"}</td>
                  <td className="px-4 py-3 text-muted">
                    {store.subscriptionExpiresAt ? formatDateTime(store.subscriptionExpiresAt) : "—"}
                  </td>
                  <td className="px-4 py-3 text-muted">{formatRelative(store.subscriptionCheckedAt)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
