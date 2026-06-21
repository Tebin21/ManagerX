import { FormEvent, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, ApiError } from '../lib/api';
import { OnlineStoreSubscriptionRecord, SUBSCRIPTION_PLAN_LABELS, SubscriptionPlan } from '../lib/types';
import { SubscriptionPlanBadge } from '../components/Badges';

const PLAN_OPTIONS = Object.keys(SUBSCRIPTION_PLAN_LABELS) as SubscriptionPlan[];

export function GenerateOnlineStoreSubscriptionPage() {
  const [customerName, setCustomerName] = useState('');
  const [phone, setPhone] = useState('');
  const [deviceId, setDeviceId] = useState('');
  const [plan, setPlan] = useState<SubscriptionPlan>('1m');
  const [notes, setNotes] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<OnlineStoreSubscriptionRecord | null>(null);
  const [copied, setCopied] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const record = await api.createOnlineStoreSubscription({ customerName, phone, deviceId, plan, notes });
      setResult(record);
      setCustomerName('');
      setPhone('');
      setDeviceId('');
      setNotes('');
      setPlan('1m');
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not generate the subscription.');
    } finally {
      setSubmitting(false);
    }
  }

  function copyCode() {
    if (!result) return;
    navigator.clipboard.writeText(result.subscriptionCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Generate Online Store Subscription</h1>
        <p className="mt-1 text-sm text-slate-500">
          Creates a cryptographically signed subscription code bound to one specific
          Device ID — completely independent from ManagerX license codes (separate
          keypair, separate ledger).
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-card">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-slate-600">Customer Name</label>
            <input
              required
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
              placeholder="e.g. Ahmed Hassan"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600">Phone Number</label>
            <input
              required
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
              placeholder="07xx xxx xxxx"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-600">Device ID</label>
          <input
            required
            value={deviceId}
            onChange={(e) => setDeviceId(e.target.value.toUpperCase())}
            className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 font-mono text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            placeholder="MX-DV-XXXX-XXXX"
          />
          <p className="mt-1 text-xs text-slate-400">
            Read this from the customer's Settings → Online Store Subscription screen
            (same Device ID shown on the ManagerX License screen — one device, one ID).
          </p>
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-600">Plan</label>
          <div className="mt-2 grid grid-cols-5 gap-2">
            {PLAN_OPTIONS.map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setPlan(p)}
                className={`rounded-lg border px-2 py-2 text-center text-xs font-semibold transition-colors ${
                  plan === p
                    ? 'border-brand-500 bg-brand-50 text-brand-700'
                    : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                {SUBSCRIPTION_PLAN_LABELS[p]}
              </button>
            ))}
          </div>
          <p className="mt-1 text-xs text-slate-400">
            Duration is fixed by the plan — Lifetime never expires, the others count
            down from the moment this code is generated.
          </p>
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-600">Notes (optional)</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
          />
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-700 disabled:opacity-50"
        >
          {submitting ? 'Generating…' : 'Generate Subscription'}
        </button>
      </form>

      {result && (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-6 shadow-card">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-emerald-800">Subscription generated</h3>
            <SubscriptionPlanBadge plan={result.plan} />
          </div>

          <div className="mt-3 rounded-lg border border-emerald-200 bg-white p-3">
            <code className="block break-all font-mono text-xs text-slate-700">{result.subscriptionCode}</code>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-emerald-700">
            <span>Created {new Date(result.createdAt).toLocaleString()}</span>
            <span>·</span>
            <span>{result.deviceId}</span>
            <span>·</span>
            <span>{result.expiresAt ? `Expires ${new Date(result.expiresAt).toLocaleDateString()}` : 'Lifetime'}</span>
          </div>

          <div className="mt-4 flex gap-2">
            <button
              onClick={copyCode}
              className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
            >
              {copied ? 'Copied!' : 'Copy Code'}
            </button>
            <Link
              to="/online-store-subscriptions"
              className="rounded-lg border border-emerald-300 bg-white px-4 py-2 text-sm font-semibold text-emerald-700 hover:bg-emerald-50"
            >
              View All Subscriptions
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
