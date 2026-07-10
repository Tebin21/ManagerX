"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw } from "lucide-react";
import type { StoreSummary } from "@/lib/types";
import { deleteStore, resetStoreApiKey, setStoreSuspended } from "@/lib/apiClient";
import { ConfirmDangerDialog } from "@/components/ConfirmDangerDialog";
import { NewApiKeyModal } from "@/components/NewApiKeyModal";

export function StoreDetailActions({ store }: { store: StoreSummary }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [newKey, setNewKey] = useState<{ slug: string; apiKey: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function toggleSuspend() {
    setPending(true);
    setError(null);
    try {
      await setStoreSuspended(store.slug, !store.adminSuspended);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to update");
    } finally {
      setPending(false);
    }
  }

  async function resetKey() {
    setPending(true);
    setError(null);
    try {
      setNewKey(await resetStoreApiKey(store.slug));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to reset key");
    } finally {
      setPending(false);
    }
  }

  async function handleDelete() {
    setPending(true);
    setError(null);
    try {
      await deleteStore(store.slug);
      router.replace("/stores");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to delete");
      setPending(false);
    }
  }

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          disabled={pending}
          onClick={toggleSuspend}
          className="rounded-lg border border-border bg-surface px-3.5 py-2 text-sm font-medium hover:bg-canvas disabled:opacity-50"
        >
          {store.adminSuspended ? "Activate Store" : "Suspend Store"}
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={resetKey}
          className="rounded-lg border border-border bg-surface px-3.5 py-2 text-sm font-medium hover:bg-canvas disabled:opacity-50"
        >
          Reset API Key
        </button>
        <span
          title="Sync is device-push: the ManagerX app uploads changes when it's next online. There's no way for the server to pull from an offline device on demand."
          className="flex cursor-help items-center gap-1.5 rounded-lg border border-dashed border-border px-3.5 py-2 text-sm text-muted"
        >
          <RefreshCw size={13} />
          Syncs automatically
        </span>
        <button
          type="button"
          disabled={pending}
          onClick={() => setConfirmDelete(true)}
          className="rounded-lg border border-red-200 bg-white px-3.5 py-2 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-50 dark:border-red-500/30 dark:bg-transparent dark:hover:bg-red-500/10"
        >
          Delete Store
        </button>
      </div>
      {error && <p className="mt-2 text-sm text-red-500">{error}</p>}

      <ConfirmDangerDialog
        open={confirmDelete}
        title={`Delete ${store.businessName}?`}
        description="This permanently removes the store and its uploaded images. This cannot be undone."
        confirmWord="DELETE"
        confirmLabel="Delete permanently"
        pending={pending}
        onCancel={() => setConfirmDelete(false)}
        onConfirm={handleDelete}
      />

      {newKey && <NewApiKeyModal slug={newKey.slug} apiKey={newKey.apiKey} onClose={() => setNewKey(null)} />}
    </div>
  );
}
