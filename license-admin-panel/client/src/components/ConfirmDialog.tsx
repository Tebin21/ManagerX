import { useState } from 'react';

interface Props {
  title: string;
  message: string;
  confirmLabel: string;
  destructive?: boolean;
  withReason?: boolean;
  onConfirm: (reason?: string) => void;
  onCancel: () => void;
}

export function ConfirmDialog({ title, message, confirmLabel, destructive, withReason, onConfirm, onCancel }: Props) {
  const [reason, setReason] = useState('');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
        <h3 className="text-base font-semibold text-slate-900">{title}</h3>
        <p className="mt-2 text-sm leading-relaxed text-slate-500">{message}</p>

        {withReason && (
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Reason (optional)"
            rows={2}
            className="mt-3 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
          />
        )}

        <div className="mt-5 flex justify-end gap-2">
          <button
            onClick={onCancel}
            className="rounded-lg px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100"
          >
            Cancel
          </button>
          <button
            onClick={() => onConfirm(withReason ? reason : undefined)}
            className={`rounded-lg px-4 py-2 text-sm font-semibold text-white ${
              destructive ? 'bg-red-600 hover:bg-red-700' : 'bg-brand-600 hover:bg-brand-700'
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
