"use client";

import { useState } from "react";
import { AlertTriangle, X } from "lucide-react";

interface Props {
  open: boolean;
  title: string;
  description: string;
  confirmWord: string;
  confirmLabel: string;
  pending?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

// Reused for every irreversible action in this app (Delete Store, Restore
// Backup) — the spec requires "Delete cannot happen accidentally," so typing
// the literal confirm word is required before the confirm button enables.
export function ConfirmDangerDialog({
  open,
  title,
  description,
  confirmWord,
  confirmLabel,
  pending,
  onCancel,
  onConfirm,
}: Props) {
  const [typed, setTyped] = useState("");

  if (!open) return null;

  const canConfirm = typed === confirmWord && !pending;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="w-full max-w-sm rounded-2xl border border-border bg-surface p-6 shadow-lg">
        <div className="flex items-start justify-between">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400">
            <AlertTriangle size={17} />
          </div>
          <button
            type="button"
            onClick={onCancel}
            className="text-muted hover:text-ink"
            aria-label="Close"
          >
            <X size={16} />
          </button>
        </div>

        <h2 className="mt-3 text-base font-semibold">{title}</h2>
        <p className="mt-1 text-sm text-muted">{description}</p>

        <label className="mt-4 block text-xs font-medium text-muted">
          Type <span className="font-mono font-semibold text-ink">{confirmWord}</span> to confirm
        </label>
        <input
          autoFocus
          value={typed}
          onChange={(e) => setTyped(e.target.value)}
          className="mt-1.5 w-full rounded-lg border border-border bg-canvas px-3 py-2 text-sm outline-none ring-red-500 focus:ring-2"
          placeholder={confirmWord}
        />

        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg px-3.5 py-2 text-sm font-medium text-muted hover:bg-canvas"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={!canConfirm}
            onClick={onConfirm}
            className="rounded-lg bg-red-600 px-3.5 py-2 text-sm font-medium text-white transition-colors hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {pending ? "Working…" : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
