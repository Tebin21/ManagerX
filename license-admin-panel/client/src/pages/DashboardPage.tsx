import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api';
import { LicenseRecord, PLAN_LABELS, Plan } from '../lib/types';
import { StatCard } from '../components/StatCard';
import { PlanBadge, StatusBadge } from '../components/Badges';

export function DashboardPage() {
  const [licenses, setLicenses] = useState<LicenseRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.listLicenses().then(setLicenses).finally(() => setLoading(false));
  }, []);

  const stats = useMemo(() => {
    const counts = { total: licenses.length, active: 0, revoked: 0, expired: 0 } as Record<string, number>;
    const planCounts: Record<Plan, number> = { basic: 0, plus: 0, pro: 0, business: 0, unlimited: 0 };
    for (const l of licenses) {
      counts[l.status] = (counts[l.status] ?? 0) + 1;
      planCounts[l.plan] = (planCounts[l.plan] ?? 0) + 1;
    }
    return { counts, planCounts };
  }, [licenses]);

  const recent = useMemo(
    () => [...licenses].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 6),
    [licenses]
  );

  if (loading) return <p className="text-sm text-slate-400">Loading…</p>;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Dashboard</h1>
        <p className="mt-1 text-sm text-slate-500">Overview of every license you've issued.</p>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard label="Total Licenses" value={stats.counts.total} accent />
        <StatCard label="Active" value={stats.counts.active ?? 0} />
        <StatCard label="Revoked" value={stats.counts.revoked ?? 0} />
        <StatCard label="Expired" value={stats.counts.expired ?? 0} />
      </div>

      <div>
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-400">By Plan</h2>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
          {(Object.keys(PLAN_LABELS) as Plan[]).map((plan) => (
            <StatCard key={plan} label={PLAN_LABELS[plan]} value={stats.planCounts[plan]} />
          ))}
        </div>
      </div>

      <div>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-400">Recent Licenses</h2>
          <Link to="/licenses" className="text-sm font-medium text-brand-600 hover:text-brand-700">
            View all →
          </Link>
        </div>
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-card">
          {recent.length === 0 ? (
            <p className="p-6 text-center text-sm text-slate-400">No licenses yet — generate your first one.</p>
          ) : (
            <table className="w-full text-sm">
              <tbody>
                {recent.map((l) => (
                  <tr key={l.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <Link to={`/licenses/${l.id}`} className="font-medium text-slate-900 hover:text-brand-600">
                        {l.customerName || '—'}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-slate-500">{l.deviceId}</td>
                    <td className="px-4 py-3">
                      <PlanBadge plan={l.plan} />
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={l.status} />
                    </td>
                    <td className="px-4 py-3 text-right text-slate-400">
                      {new Date(l.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
