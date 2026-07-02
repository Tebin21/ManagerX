"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Download, DatabaseBackup } from "lucide-react";
import type { BackupSummary } from "@/lib/types";
import { formatBytes, formatDateTime } from "@/lib/format";
import { createBackup, restoreBackup } from "@/lib/apiClient";
import { ConfirmDangerDialog } from "@/components/ConfirmDangerDialog";

export function BackupsPanel({ initialBackups }: { initialBackups: BackupSummary[] }) {
  const router = useRouter();
  const [backups, setBackups] = useState(initialBackups);
  const [pending, setPending] = useState(false);
  const [restoreTarget, setRestoreTarget] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleCreate() {
    setPending(true);
    setError(null);
    try {
      const { id } = await createBackup();
      setBackups((prev) => [{ id, createdAt: new Date().toISOString(), sizeBytes: 0 }, ...prev]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to create backup");
    } finally {
      setPending(false);
    }
  }

  async function handleRestore() {
    if (!restoreTarget) return;
    setPending(true);
    setError(null);
    try {
      await restoreBackup(restoreTarget);
      setRestoreTarget(null);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to restore backup");
    } finally {
      setPending(false);
    }
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={handleCreate}
          disabled={pending}
          className="flex items-center gap-1.5 rounded-lg bg-brand-600 px-3.5 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50"
        >
          <DatabaseBackup size={14} /> Create Backup
        </button>
        <a
          href="/api/admin/export.json"
          className="rounded-lg border border-border bg-surface px-3.5 py-2 text-sm font-medium hover:bg-canvas"
        >
          Export JSON
        </a>
        <a
          href="/api/admin/export.csv"
          className="rounded-lg border border-border bg-surface px-3.5 py-2 text-sm font-medium hover:bg-canvas"
        >
          Export CSV
        </a>
      </div>

      {error && <p className="mb-3 text-sm text-red-500">{error}</p>}

      <div className="overflow-x-auto rounded-xl border border-border bg-surface">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted">
              <th className="px-4 py-3 font-medium">Backup</th>
              <th className="px-4 py-3 font-medium">Created</th>
              <th className="px-4 py-3 font-medium">Size</th>
              <th className="px-4 py-3 font-medium" />
            </tr>
          </thead>
          <tbody>
            {backups.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-muted">
                  No backups yet.
                </td>
              </tr>
            )}
            {backups.map((b) => (
              <tr key={b.id} className="border-b border-border last:border-0">
                <td className="px-4 py-3 font-mono text-xs">{b.id}</td>
                <td className="px-4 py-3 text-muted">{formatDateTime(b.createdAt)}</td>
                <td className="px-4 py-3 text-muted">{formatBytes(b.sizeBytes)}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-2">
                    <a
                      href={`/api/admin/backups/${b.id}/download`}
                      className="flex h-8 w-8 items-center justify-center rounded-lg text-muted hover:bg-canvas hover:text-ink"
                      title="Download"
                    >
                      <Download size={15} />
                    </a>
                    <button
                      type="button"
                      onClick={() => setRestoreTarget(b.id)}
                      className="rounded-lg border border-border px-2.5 py-1.5 text-xs font-medium hover:bg-canvas"
                    >
                      Restore
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ConfirmDangerDialog
        open={!!restoreTarget}
        title={`Restore backup ${restoreTarget ?? ""}?`}
        description="This overwrites all current store data with this backup's snapshot. This cannot be undone."
        confirmWord="RESTORE"
        confirmLabel="Restore backup"
        pending={pending}
        onCancel={() => setRestoreTarget(null)}
        onConfirm={handleRestore}
      />
    </div>
  );
}
