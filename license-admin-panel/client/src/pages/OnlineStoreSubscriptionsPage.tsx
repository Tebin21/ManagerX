import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, API_BASE } from '../lib/api';
import { OnlineStoreSubscriptionRecord } from '../lib/types';
import { SubscriptionPlanBadge, StatusBadge } from '../components/Badges';
import { ConfirmDialog } from '../components/ConfirmDialog';

// Deliberately a flat, searchable list with inline actions — no separate detail page
// or customer-grouping view (unlike the Froshiar license admin's LicenseDetailPage/
// CustomersPage). A phone/device-searchable list is enough to start; revisit only if
// subscription volume makes that genuinely painful.
export function OnlineStoreSubscriptionsPage() {
  const [subscriptions, setSubscriptions] = useState<OnlineStoreSubscriptionRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState<{ type: 'revoke' | 'delete'; record: OnlineStoreSubscriptionRecord } | null>(null);

  function reload() {
    return api.listOnlineStoreSubscriptions().then(setSubscriptions);
  }

  useEffect(() => {
    reload().finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return subscriptions;
    return subscriptions.filter((s) =>
      [s.customerName, s.phone, s.deviceId, s.subscriptionCode].some((f) => f.toLowerCase().includes(q))
    );
  }, [subscriptions, query]);

  function copyCode(s: OnlineStoreSubscriptionRecord) {
    navigator.clipboard.writeText(s.subscriptionCode);
    setCopiedId(s.id);
    setTimeout(() => setCopiedId(null), 1200);
  }

  async function confirmAction(reason?: string) {
    if (!pendingAction) return;
    if (pendingAction.type === 'revoke') {
      await api.revokeOnlineStoreSubscription(pendingAction.record.id, reason);
    } else {
      await api.deleteOnlineStoreSubscription(pendingAction.record.id);
    }
    setPendingAction(null);
    reload();
  }

  async function reactivate(s: OnlineStoreSubscriptionRecord) {
    await api.reactivateOnlineStoreSubscription(s.id);
    reload();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Online Store Subscriptions</h1>
          <p className="mt-1 text-sm text-slate-500">{subscriptions.length} total</p>
        </div>
        <div className="no-print flex gap-2">
          <a
            href={`${API_BASE}/online-store-subscriptions/export.csv`}
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
          >
            Export Excel (CSV)
          </a>
          <Link
            to="/online-store-subscriptions/generate"
            className="rounded-lg bg-brand-600 px-3 py-2 text-sm font-semibold text-white hover:bg-brand-700"
          >
            + New Subscription
          </Link>
        </div>
      </div>

      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search by name, phone, device ID, or subscription code…"
        className="no-print w-full rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm shadow-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
      />

      <div className="print-area overflow-hidden rounded-xl border border-slate-200 bg-white shadow-card">
        {loading ? (
          <p className="p-6 text-center text-sm text-slate-400">Loading…</p>
        ) : filtered.length === 0 ? (
          <p className="p-6 text-center text-sm text-slate-400">No subscriptions match.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                <th className="px-4 py-3">Customer</th>
                <th className="px-4 py-3">Phone</th>
                <th className="px-4 py-3">Device ID</th>
                <th className="px-4 py-3">Plan</th>
                <th className="px-4 py-3">Expires</th>
                <th className="px-4 py-3">Status</th>
                <th className="no-print px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((s) => (
                <tr key={s.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium text-slate-900">{s.customerName || '—'}</td>
                  <td className="px-4 py-3 text-slate-500">{s.phone || '—'}</td>
                  <td className="px-4 py-3 font-mono text-xs text-slate-500">{s.deviceId}</td>
                  <td className="px-4 py-3">
                    <SubscriptionPlanBadge plan={s.plan} />
                  </td>
                  <td className="px-4 py-3 text-slate-400">
                    {s.expiresAt ? new Date(s.expiresAt).toLocaleDateString() : 'Never'}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={s.isExpired ? 'expired' : s.status} />
                  </td>
                  <td className="no-print px-4 py-3">
                    <div className="flex justify-end gap-3 text-xs font-medium">
                      <button onClick={() => copyCode(s)} className="text-slate-500 hover:text-brand-600">
                        {copiedId === s.id ? 'Copied!' : 'Copy'}
                      </button>
                      {s.status === 'revoked' ? (
                        <button onClick={() => reactivate(s)} className="text-emerald-600 hover:text-emerald-700">
                          Reactivate
                        </button>
                      ) : (
                        <button
                          onClick={() => setPendingAction({ type: 'revoke', record: s })}
                          className="text-amber-600 hover:text-amber-700"
                        >
                          Revoke
                        </button>
                      )}
                      <button
                        onClick={() => setPendingAction({ type: 'delete', record: s })}
                        className="text-red-500 hover:text-red-600"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {pendingAction && (
        <ConfirmDialog
          title={pendingAction.type === 'revoke' ? 'Revoke this subscription?' : 'Delete this subscription?'}
          message={
            pendingAction.type === 'revoke'
              ? 'This updates your records only — the backend independently verifies the signed code\'s expiry, not a live revocation list, so the customer\'s app keeps working until the code\'s embedded expiry date passes or you tell them otherwise. Use this to track that you consider it revoked.'
              : 'This permanently removes the record from your ledger. This cannot be undone.'
          }
          confirmLabel={pendingAction.type === 'revoke' ? 'Revoke' : 'Delete'}
          destructive
          withReason={pendingAction.type === 'revoke'}
          onConfirm={confirmAction}
          onCancel={() => setPendingAction(null)}
        />
      )}
    </div>
  );
}
