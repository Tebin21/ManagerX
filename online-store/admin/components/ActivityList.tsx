import type { ActivityEntry } from "@/lib/types";
import { formatDateTime } from "@/lib/format";
import { StatusBadge } from "@/components/StatusBadge";

const ACTOR_TONE = {
  admin: "brand",
  owner: "neutral",
  system: "neutral",
} as const;

const ACTION_LABELS: Record<string, string> = {
  store_created: "Store Created",
  store_recovered: "Store Recovered",
  store_updated: "Store Updated",
  store_deleted: "Store Deleted",
  store_suspended: "Store Suspended",
  store_activated: "Store Activated",
  api_key_reset: "API Key Reset",
  image_uploaded: "Image Uploaded",
  sync_failed: "Sync Failed",
  backup_created: "Backup Created",
  backup_restored: "Backup Restored",
};

export function ActivityList({ entries, showStore = false }: { entries: ActivityEntry[]; showStore?: boolean }) {
  if (entries.length === 0) {
    return <p className="px-4 py-8 text-center text-sm text-muted">No activity yet.</p>;
  }
  return (
    <div className="overflow-x-auto rounded-xl border border-border bg-surface">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted">
            <th className="px-4 py-3 font-medium">Time</th>
            <th className="px-4 py-3 font-medium">Actor</th>
            {showStore && <th className="px-4 py-3 font-medium">Store</th>}
            <th className="px-4 py-3 font-medium">Action</th>
            <th className="px-4 py-3 font-medium">IP</th>
            <th className="px-4 py-3 font-medium">Details</th>
          </tr>
        </thead>
        <tbody>
          {entries.map((entry) => (
            <tr key={entry.id} className="border-b border-border last:border-0">
              <td className="whitespace-nowrap px-4 py-3 text-muted">{formatDateTime(entry.timestamp)}</td>
              <td className="px-4 py-3">
                <StatusBadge label={entry.actor} tone={ACTOR_TONE[entry.actor]} />
              </td>
              {showStore && <td className="px-4 py-3 font-mono text-xs">{entry.slug ?? "—"}</td>}
              <td className="px-4 py-3 font-medium">{ACTION_LABELS[entry.action] ?? entry.action}</td>
              <td className="px-4 py-3 font-mono text-xs text-muted">{entry.ip}</td>
              <td className="max-w-xs truncate px-4 py-3 text-muted">{entry.details ?? "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
