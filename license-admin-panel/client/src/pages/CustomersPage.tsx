import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api';
import { CustomerGroup, PLAN_LABELS } from '../lib/types';
import { StatusBadge } from '../components/Badges';

export function CustomersPage() {
  const [customers, setCustomers] = useState<CustomerGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    api.listCustomers().then(setCustomers).finally(() => setLoading(false));
  }, []);

  if (loading) return <p className="text-sm text-slate-400">Loading…</p>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Customers</h1>
        <p className="mt-1 text-sm text-slate-500">{customers.length} customers, grouped by phone number.</p>
      </div>

      {customers.length === 0 ? (
        <p className="rounded-xl border border-slate-200 bg-white p-6 text-center text-sm text-slate-400 shadow-card">
          No customers yet.
        </p>
      ) : (
        <div className="space-y-3">
          {customers.map((c) => {
            const isOpen = expanded === c.phone;
            return (
              <div key={c.phone} className="rounded-xl border border-slate-200 bg-white shadow-card">
                <button
                  onClick={() => setExpanded(isOpen ? null : c.phone)}
                  className="flex w-full items-center justify-between px-5 py-4 text-left"
                >
                  <div>
                    <div className="font-semibold text-slate-900">{c.customerName || '—'}</div>
                    <div className="text-xs text-slate-400">{c.phone}</div>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-slate-500">
                    <span>{c.licenses.length} license(s)</span>
                    <span>{c.devices.length} device(s)</span>
                    <span className="text-brand-600">{isOpen ? 'Hide' : 'Show'}</span>
                  </div>
                </button>

                {isOpen && (
                  <div className="border-t border-slate-100 px-5 py-4">
                    <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-400">Plan History</h3>
                    <div className="mt-2 flex flex-wrap items-center gap-2 text-sm">
                      {c.planHistory.map((p, i) => (
                        <span key={i} className="flex items-center gap-2">
                          <span className="rounded-full bg-brand-50 px-2.5 py-0.5 font-medium text-brand-700">
                            {PLAN_LABELS[p.plan]}
                          </span>
                          {i < c.planHistory.length - 1 && <span className="text-slate-300">→</span>}
                        </span>
                      ))}
                    </div>

                    <h3 className="mt-4 text-xs font-semibold uppercase tracking-wide text-slate-400">Device History</h3>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {c.devices.map((d) => (
                        <span key={d} className="rounded-lg bg-slate-100 px-2.5 py-1 font-mono text-xs text-slate-600">
                          {d}
                        </span>
                      ))}
                    </div>

                    <h3 className="mt-4 text-xs font-semibold uppercase tracking-wide text-slate-400">License History</h3>
                    <div className="mt-2 space-y-2">
                      {c.licenses.map((l) => (
                        <Link
                          key={l.id}
                          to={`/licenses/${l.id}`}
                          className="flex items-center justify-between rounded-lg border border-slate-100 px-3 py-2 text-sm hover:bg-slate-50"
                        >
                          <span className="font-medium text-slate-700">{PLAN_LABELS[l.plan]}</span>
                          <span className="text-xs text-slate-400">{new Date(l.createdAt).toLocaleDateString()}</span>
                          <StatusBadge status={l.status} />
                        </Link>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
