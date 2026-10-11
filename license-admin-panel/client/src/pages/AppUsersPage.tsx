import { useState, useEffect, useCallback } from 'react';
import { api } from '../lib/api';

interface Stats {
  totalInstalls: number;
  installsToday: number;
  iosInstalls: number;
  androidInstalls: number;
  totalOpens: number;
  totalUsers: number;
  activeUsersToday: number;
  activeUsers7Days: number;
  recentEvents: Array<{
    id: string;
    event_type: string;
    user_email: string | null;
    platform: string;
    created_at: string;
  }>;
}

interface UserRecord {
  id: string;
  user_id: string;
  email: string | null;
  phone: string | null;
  display_name: string | null;
  business_name: string | null;
  device_id: string | null;
  platform: string;
  app_version: string;
  created_at: string;
  last_login_at: string;
  login_count: number;
}

interface InstallRecord {
  id: string;
  device_id: string;
  platform: string;
  os_version: string;
  app_version: string;
  brand: string;
  model_name: string;
  first_installed_at: string;
  last_seen_at: string;
  open_count: number;
}

export function AppUsersPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [installs, setInstalls] = useState<InstallRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'users' | 'installs'>('users');
  const [query, setQuery] = useState('');

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [statsRes, usersRes, installsRes] = await Promise.all([
        fetch('/api/telemetry/stats').then((r) => r.json()),
        fetch('/api/telemetry/users').then((r) => r.json()),
        fetch('/api/telemetry/installs').then((r) => r.json()),
      ]);
      setStats(statsRes);
      setUsers(usersRes.users || []);
      setInstalls(installsRes.installs || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 15000);
    return () => clearInterval(interval);
  }, [loadData]);

  const filteredUsers = users.filter((u) => {
    const q = query.toLowerCase();
    return (
      !q ||
      u.email?.toLowerCase().includes(q) ||
      u.display_name?.toLowerCase().includes(q) ||
      u.business_name?.toLowerCase().includes(q) ||
      u.device_id?.toLowerCase().includes(q)
    );
  });

  const filteredInstalls = installs.filter((i) => {
    const q = query.toLowerCase();
    return (
      !q ||
      i.device_id?.toLowerCase().includes(q) ||
      i.brand?.toLowerCase().includes(q) ||
      i.model_name?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">App Users & Installs</h1>
          <p className="text-sm text-slate-500">
            Real telemetry directly from Froshiar mobile app instances & Neon PostgreSQL
          </p>
        </div>
        <button
          onClick={loadData}
          disabled={loading}
          className="rounded-lg bg-slate-900 px-3 py-1.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-50"
        >
          {loading ? 'Refreshing…' : 'Refresh'}
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Total App Installs
          </p>
          <p className="mt-2 text-3xl font-bold text-slate-900">
            {stats?.totalInstalls ?? 0}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            {stats?.iosInstalls ?? 0} iOS · {stats?.androidInstalls ?? 0} Android
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Registered Users
          </p>
          <p className="mt-2 text-3xl font-bold text-emerald-600">
            {stats?.totalUsers ?? 0}
          </p>
          <p className="mt-1 text-xs text-slate-500">Real authenticated accounts</p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Active Users Today
          </p>
          <p className="mt-2 text-3xl font-bold text-amber-600">
            {stats?.activeUsersToday ?? 0}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            {stats?.activeUsers7Days ?? 0} active this week
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Total App Opens
          </p>
          <p className="mt-2 text-3xl font-bold text-slate-900">
            {stats?.totalOpens ?? 0}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            {stats?.installsToday ?? 0} installs today
          </p>
        </div>
      </div>

      {/* Controls */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab('users')}
            className={`rounded-lg px-3.5 py-1.5 text-sm font-medium transition ${
              activeTab === 'users'
                ? 'bg-slate-900 text-white'
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            Registered Users ({users.length})
          </button>
          <button
            onClick={() => setActiveTab('installs')}
            className={`rounded-lg px-3.5 py-1.5 text-sm font-medium transition ${
              activeTab === 'installs'
                ? 'bg-slate-900 text-white'
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            Devices / Installs ({installs.length})
          </button>
        </div>

        <input
          type="text"
          placeholder="Filter by email, name, business, device…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm focus:border-slate-500 focus:outline-none w-full sm:w-72"
        />
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        {activeTab === 'users' ? (
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50 text-left text-xs font-semibold text-slate-500">
              <tr>
                <th className="px-4 py-3">User / Email</th>
                <th className="px-4 py-3">Business</th>
                <th className="px-4 py-3">Platform</th>
                <th className="px-4 py-3">Device ID</th>
                <th className="px-4 py-3">Joined</th>
                <th className="px-4 py-3">Last Active</th>
                <th className="px-4 py-3 text-center">Logins</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono text-xs">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400 font-sans">
                    No users recorded yet.
                  </td>
                </tr>
              ) : (
                filteredUsers.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-50/50">
                    <td className="px-4 py-3 font-sans font-medium text-slate-900">
                      <div>{u.display_name || u.email?.split('@')[0] || 'User'}</div>
                      <div className="text-xs text-slate-500 font-mono">{u.email || '-'}</div>
                    </td>
                    <td className="px-4 py-3 font-sans text-slate-700">
                      {u.business_name || '-'}
                    </td>
                    <td className="px-4 py-3">
                      <span className="rounded bg-slate-100 px-1.5 py-0.5 font-bold uppercase text-slate-700">
                        {u.platform || 'IOS'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-500">{u.device_id || '-'}</td>
                    <td className="px-4 py-3 font-sans text-slate-600">
                      {new Date(u.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 font-sans font-medium text-emerald-600">
                      {new Date(u.last_login_at).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-center font-bold text-slate-900">
                      {u.login_count || 1}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        ) : (
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50 text-left text-xs font-semibold text-slate-500">
              <tr>
                <th className="px-4 py-3">Device ID</th>
                <th className="px-4 py-3">Platform & Model</th>
                <th className="px-4 py-3">App Version</th>
                <th className="px-4 py-3">First Installed</th>
                <th className="px-4 py-3">Last Seen</th>
                <th className="px-4 py-3 text-center">Launches</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono text-xs">
              {filteredInstalls.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400 font-sans">
                    No installs recorded yet.
                  </td>
                </tr>
              ) : (
                filteredInstalls.map((inst) => (
                  <tr key={inst.id} className="hover:bg-slate-50/50">
                    <td className="px-4 py-3 font-bold text-amber-700">{inst.device_id}</td>
                    <td className="px-4 py-3 font-sans">
                      <span className="font-semibold text-slate-900 uppercase mr-1">
                        {inst.platform}
                      </span>
                      <span className="text-slate-500">
                        {inst.model_name || inst.brand || ''}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-600">v{inst.app_version || '1.0.0'}</td>
                    <td className="px-4 py-3 font-sans text-slate-600">
                      {new Date(inst.first_installed_at).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 font-sans text-slate-900">
                      {new Date(inst.last_seen_at).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-center font-bold text-slate-900">
                      {inst.open_count}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
