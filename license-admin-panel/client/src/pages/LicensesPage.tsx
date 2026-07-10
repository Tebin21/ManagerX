import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, API_BASE } from '../lib/api';
import { LicenseRecord } from '../lib/types';
import { PlanBadge, StatusBadge } from '../components/Badges';
import { ConfirmDialog } from '../components/ConfirmDialog';

export function LicensesPage() {
  const [licenses, setLicenses] = useState<LicenseRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState<{ type: 'revoke' | 'delete'; record: LicenseRecord } | null>(null);

  function reload() {
    return api.listLicenses().then(setLicenses);
  }

  useEffect(() => {
    reload().finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return licenses;
    return licenses.filter((l) =>
      [l.customerName, l.phone, l.deviceId, l.licenseCode].some((f) => f.toLowerCase().includes(q))
    );
  }, [licenses, query]);

  function copyCode(l: LicenseRecord) {
    navigator.clipboard.writeText(l.licenseCode);
    setCopiedId(l.id);
    setTimeout(() => setCopiedId(null), 1200);
  }

  async function confirmAction(reason?: string) {
    if (!pendingAction) return;
    if (pendingAction.type === 'revoke') {
      await api.revokeLicense(pendingAction.record.id, reason);
    } else {
      await api.deleteLicense(pendingAction.record.id);
    }
    setPendingAction(null);
    reload();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Licenses</h1>
          <p className="mt-1 text-sm text-slate-500">{licenses.length} total</p>
        </div>
        <div className="no-print flex gap-2">
          <a
            href={`${API_BASE}/licenses/export.csv`}
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
          >
            Export Excel (CSV)
          </a>
          <button
            onClick={() => window.print()}
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
          >
            Print / Export PDF
          </button>
          <Link
            to="/generate"
            className="rounded-lg bg-brand-600 px-3 py-2 text-sm font-semibold text-white hover:bg-brand-700"
          >
            + New License
          </Link>
        </div>
      </div>

      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search by name, phone, device ID, or license code…"
        className="no-print w-full rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm shadow-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
      />

      <div className="print-area overflow-hidden rounded-xl border border-slate-200 bg-white shadow-card">
        {loading ? (
          <p className="p-6 text-center text-sm text-slate-400">Loading…</p>
        ) : filtered.length === 0 ? (
          <p className="p-6 text-center text-sm text-slate-400">No licenses match.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                <th className="px-4 py-3">Customer</th>
                <th className="px-4 py-3">Phone</th>
                <th className="px-4 py-3">Device ID</th>
                <th className="px-4 py-3">Plan</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Created</th>
                <th className="no-print px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((l) => (
                <tr key={l.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <Link to={`/licenses/${l.id}`} className="font-medium text-slate-900 hover:text-brand-600">
                      {l.customerName || '—'}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-slate-500">{l.phone || '—'}</td>
                  <td className="px-4 py-3 font-mono text-xs text-slate-500">{l.deviceId}</td>
                  <td className="px-4 py-3">
                    <PlanBadge plan={l.plan} />
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={l.isExpired ? 'expired' : l.status} />
                  </td>
                  <td className="px-4 py-3 text-slate-400">{new Date(l.createdAt).toLocaleDateString()}</td>
                  <td className="no-print px-4 py-3">
                    <div className="flex justify-end gap-3 text-xs font-medium">
                      <Link to={`/licenses/${l.id}`} className="text-slate-500 hover:text-brand-600">
                        View
                      </Link>
                      <button onClick={() => copyCode(l)} className="text-slate-500 hover:text-brand-600">
                        {copiedId === l.id ? 'Copied!' : 'Copy'}
                      </button>
                      {l.status !== 'revoked' && (
                        <button
                          onClick={() => setPendingAction({ type: 'revoke', record: l })}
                          className="text-amber-600 hover:text-amber-700"
                        >
                          Revoke
                        </button>
                      )}
                      <button
                        onClick={() => setPendingAction({ type: 'delete', record: l })}
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
          title={pendingAction.type === 'revoke' ? 'Revoke this license?' : 'Delete this license?'}
          message={
            pendingAction.type === 'revoke'
              ? 'This updates your records only — Froshiar has no internet connection, so this does not remotely deactivate the customer\'s app. The device will keep working until you tell the customer otherwise.'
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
