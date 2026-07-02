"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ExternalLink, Eye, Search, Store as StoreIcon } from "lucide-react";
import type { DeletedStoreRecord, StoreSummary } from "@/lib/types";
import { formatDate, formatRelative } from "@/lib/format";
import { StatusBadge, storeStatusBadge, subscriptionStatusBadge } from "@/components/StatusBadge";
import { RowActionsMenu } from "@/components/RowActionsMenu";
import { ConfirmDangerDialog } from "@/components/ConfirmDangerDialog";
import { NewApiKeyModal } from "@/components/NewApiKeyModal";
import { deleteStore, resetStoreApiKey, setStoreSuspended } from "@/lib/apiClient";

type Filter = "all" | "active" | "suspended" | "expired" | "has_errors" | "never_synced" | "recent" | "deleted";

const FILTERS: { key: Filter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "active", label: "Active" },
  { key: "suspended", label: "Suspended" },
  { key: "expired", label: "Expired" },
  { key: "has_errors", label: "Has Errors" },
  { key: "never_synced", label: "Never Synced" },
  { key: "recent", label: "Recently Created" },
  { key: "deleted", label: "Deleted" },
];

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

export function StoreTable({
  initialStores,
  deletedStores,
  storefrontBaseUrl,
}: {
  initialStores: StoreSummary[];
  deletedStores: DeletedStoreRecord[];
  storefrontBaseUrl: string;
}) {
  const [stores, setStores] = useState(initialStores);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [pendingSlug, setPendingSlug] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<StoreSummary | null>(null);
  const [newKey, setNewKey] = useState<{ slug: string; apiKey: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  // Lazy initializer is the one React-sanctioned place to read the wall
  // clock during render (evaluated once at mount, not on every render pass)
  // — a plain `Date.now()` inline in the filter below is flagged as an
  // impure render call by eslint-plugin-react-hooks's purity rule.
  const [recentCutoff] = useState(() => Date.now() - SEVEN_DAYS_MS);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return stores.filter((s) => {
      if (q) {
        const haystack = [s.businessName, s.slug, s.info?.phone, s.info?.whatsappNumber]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      switch (filter) {
        case "active":
          return s.enabled && !s.adminSuspended;
        case "suspended":
          return !!s.adminSuspended;
        case "expired":
          return s.subscriptionStatus === "expired";
        case "has_errors":
          return !!s.subscriptionStatus && s.subscriptionStatus !== "valid";
        case "never_synced":
          return !s.lastSyncAt;
        case "recent":
          return new Date(s.createdAt).getTime() >= recentCutoff;
        default:
          return true;
      }
    });
  }, [stores, search, filter, recentCutoff]);

  async function handleSuspendToggle(store: StoreSummary) {
    setError(null);
    setPendingSlug(store.slug);
    try {
      await setStoreSuspended(store.slug, !store.adminSuspended);
      setStores((prev) => prev.map((s) => (s.slug === store.slug ? { ...s, adminSuspended: !store.adminSuspended } : s)));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to update store");
    } finally {
      setPendingSlug(null);
    }
  }

  async function handleResetKey(store: StoreSummary) {
    setError(null);
    setPendingSlug(store.slug);
    try {
      const result = await resetStoreApiKey(store.slug);
      setNewKey(result);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to reset API key");
    } finally {
      setPendingSlug(null);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setError(null);
    setPendingSlug(deleteTarget.slug);
    try {
      await deleteStore(deleteTarget.slug);
      setStores((prev) => prev.filter((s) => s.slug !== deleteTarget.slug));
      setDeleteTarget(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to delete store");
    } finally {
      setPendingSlug(null);
    }
  }

  if (filter === "deleted") {
    return (
      <div>
        <FilterBar search={search} setSearch={setSearch} filter={filter} setFilter={setFilter} />
        <div className="overflow-x-auto rounded-xl border border-border bg-surface">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted">
                <th className="px-4 py-3 font-medium">Store</th>
                <th className="px-4 py-3 font-medium">Slug</th>
                <th className="px-4 py-3 font-medium">Products at deletion</th>
                <th className="px-4 py-3 font-medium">Deleted</th>
              </tr>
            </thead>
            <tbody>
              {deletedStores.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-muted">
                    No stores have been deleted.
                  </td>
                </tr>
              )}
              {deletedStores.map((d) => (
                <tr key={d.slug + d.deletedAt} className="border-b border-border last:border-0">
                  <td className="px-4 py-3 font-medium">{d.businessName}</td>
                  <td className="px-4 py-3 font-mono text-xs text-muted">{d.slug}</td>
                  <td className="px-4 py-3">{d.productsCount}</td>
                  <td className="px-4 py-3 text-muted">{formatDate(d.deletedAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  return (
    <div>
      <FilterBar search={search} setSearch={setSearch} filter={filter} setFilter={setFilter} />

      {error && (
        <div className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-400">
          {error}
        </div>
      )}

      <div className="overflow-x-auto rounded-xl border border-border bg-surface">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted">
              <th className="px-4 py-3 font-medium">Store</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Subscription</th>
              <th className="px-4 py-3 font-medium">Products</th>
              <th className="px-4 py-3 font-medium">Categories</th>
              <th className="px-4 py-3 font-medium">Created</th>
              <th className="px-4 py-3 font-medium">Last Sync</th>
              <th className="px-4 py-3 font-medium" />
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-muted">
                  No stores match.
                </td>
              </tr>
            )}
            {filtered.map((store) => {
              const status = storeStatusBadge(store);
              const sub = subscriptionStatusBadge(store.subscriptionStatus);
              const websiteUrl = `${storefrontBaseUrl}/${store.slug}`;
              return (
                <tr key={store.slug} className="border-b border-border last:border-0 hover:bg-canvas/60">
                  <td className="px-4 py-3">
                    <Link href={`/stores/${store.slug}`} className="flex items-center gap-2.5">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-canvas text-muted">
                        {store.info?.logoUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={store.info.logoUrl} alt="" className="h-full w-full object-cover" />
                        ) : (
                          <StoreIcon size={14} />
                        )}
                      </div>
                      <div>
                        <div className="font-medium leading-tight">{store.businessName}</div>
                        <div className="font-mono text-xs text-muted">{store.slug}</div>
                      </div>
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge label={status.label} tone={status.tone} />
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge label={sub.label} tone={sub.tone} />
                  </td>
                  <td className="px-4 py-3">{store.productsCount}</td>
                  <td className="px-4 py-3">{store.categoriesCount}</td>
                  <td className="px-4 py-3 text-muted">{formatDate(store.createdAt)}</td>
                  <td className="px-4 py-3 text-muted">{formatRelative(store.lastSyncAt)}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <a
                        href={websiteUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex h-8 w-8 items-center justify-center rounded-lg text-muted hover:bg-canvas hover:text-ink"
                        title="View website"
                      >
                        <ExternalLink size={15} />
                      </a>
                      <Link
                        href={`/stores/${store.slug}`}
                        className="flex h-8 w-8 items-center justify-center rounded-lg text-muted hover:bg-canvas hover:text-ink"
                        title="View details"
                      >
                        <Eye size={15} />
                      </Link>
                      <RowActionsMenu
                        actions={[
                          {
                            label: store.adminSuspended ? "Activate Store" : "Suspend Store",
                            onClick: () => handleSuspendToggle(store),
                            disabled: pendingSlug === store.slug,
                          },
                          {
                            label: "Reset API Key",
                            onClick: () => handleResetKey(store),
                            disabled: pendingSlug === store.slug,
                          },
                          {
                            label: "Delete Store",
                            tone: "danger",
                            onClick: () => setDeleteTarget(store),
                            disabled: pendingSlug === store.slug,
                          },
                        ]}
                      />
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <ConfirmDangerDialog
        open={!!deleteTarget}
        title={`Delete ${deleteTarget?.businessName ?? "store"}?`}
        description="This permanently removes the store and its uploaded images. This cannot be undone."
        confirmWord="DELETE"
        confirmLabel="Delete permanently"
        pending={pendingSlug === deleteTarget?.slug}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
      />

      {newKey && <NewApiKeyModal slug={newKey.slug} apiKey={newKey.apiKey} onClose={() => setNewKey(null)} />}
    </div>
  );
}

function FilterBar({
  search,
  setSearch,
  filter,
  setFilter,
}: {
  search: string;
  setSearch: (v: string) => void;
  filter: Filter;
  setFilter: (v: Filter) => void;
}) {
  return (
    <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="relative w-full max-w-xs">
        <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search name, slug, phone…"
          className="w-full rounded-lg border border-border bg-surface py-2 pl-9 pr-3 text-sm outline-none ring-brand-500 focus:ring-2"
        />
      </div>
      <div className="flex flex-wrap gap-1.5">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            type="button"
            onClick={() => setFilter(f.key)}
            className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
              filter === f.key
                ? "bg-brand-600 text-white"
                : "bg-surface text-muted border border-border hover:bg-canvas"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>
    </div>
  );
}
