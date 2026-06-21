import { FormEvent, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, ApiError } from '../lib/api';
import { LicenseRecord, PLAN_LABELS, PLAN_LIMITS, Plan } from '../lib/types';
import { PlanBadge } from '../components/Badges';

const PLAN_OPTIONS = Object.keys(PLAN_LABELS) as Plan[];

const EXPIRY_PRESETS = [1, 3, 6, 12];

export function GenerateLicensePage() {
  const [customerName, setCustomerName] = useState('');
  const [phone, setPhone] = useState('');
  const [deviceId, setDeviceId] = useState('');
  const [plan, setPlan] = useState<Plan>('basic');
  const [notes, setNotes] = useState('');
  const [hasExpiry, setHasExpiry] = useState(false);
  const [expiresInMonths, setExpiresInMonths] = useState('1');

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<LicenseRecord | null>(null);
  const [copied, setCopied] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    let months: number | null = null;
    if (hasExpiry) {
      months = Number(expiresInMonths);
      if (!Number.isFinite(months) || months <= 0) {
        setError('Enter a valid number of months (greater than 0).');
        return;
      }
    }

    setSubmitting(true);
    try {
      const record = await api.createLicense({
        customerName, phone, deviceId, plan, notes,
        expiresInMonths: months,
      });
      setResult(record);
      setCustomerName('');
      setPhone('');
      setDeviceId('');
      setNotes('');
      setPlan('basic');
      setHasExpiry(false);
      setExpiresInMonths('1');
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not generate the license.');
    } finally {
      setSubmitting(false);
    }
  }

  function copyCode() {
    if (!result) return;
    navigator.clipboard.writeText(result.licenseCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Generate License</h1>
        <p className="mt-1 text-sm text-slate-500">
          Creates a cryptographically signed license bound to one specific Device ID.
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
          <p className="mt-1 text-xs text-slate-400">Read this from the customer's Settings → Plan &amp; Limits screen.</p>
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-600">Plan Type</label>
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
                <div>{PLAN_LABELS[p]}</div>
                <div className="mt-0.5 text-[10px] font-normal text-slate-400">{PLAN_LIMITS[p]}</div>
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-600">Expiration</label>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setHasExpiry(false)}
              className={`rounded-lg border px-3 py-2 text-xs font-semibold transition-colors ${
                !hasExpiry ? 'border-brand-500 bg-brand-50 text-brand-700' : 'border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              Permanent
            </button>
            <button
              type="button"
              onClick={() => setHasExpiry(true)}
              className={`rounded-lg border px-3 py-2 text-xs font-semibold transition-colors ${
                hasExpiry ? 'border-brand-500 bg-brand-50 text-brand-700' : 'border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              Expires after…
            </button>
          </div>

          {hasExpiry && (
            <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={1}
                  value={expiresInMonths}
                  onChange={(e) => setExpiresInMonths(e.target.value)}
                  className="w-20 rounded-lg border border-slate-200 px-2 py-1.5 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                />
                <span className="text-sm text-slate-600">month(s)</span>
              </div>
              <div className="mt-2 flex gap-2">
                {EXPIRY_PRESETS.map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setExpiresInMonths(String(m))}
                    className="rounded-md border border-slate-200 bg-white px-2 py-1 text-xs font-medium text-slate-600 hover:bg-slate-100"
                  >
                    {m === 12 ? '1 year' : `${m}mo`}
                  </button>
                ))}
              </div>
            </div>
          )}
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
          {submitting ? 'Generating…' : 'Generate License'}
        </button>
      </form>

      {result && (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-6 shadow-card">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-emerald-800">License generated</h3>
            <PlanBadge plan={result.plan} />
          </div>

          <div className="mt-3 rounded-lg border border-emerald-200 bg-white p-3">
            <code className="block break-all font-mono text-xs text-slate-700">{result.licenseCode}</code>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-emerald-700">
            <span>Created {new Date(result.createdAt).toLocaleString()}</span>
            <span>·</span>
            <span>{result.deviceId}</span>
            <span>·</span>
            <span>{result.expiresAt ? `Expires ${new Date(result.expiresAt).toLocaleDateString()}` : 'Permanent'}</span>
          </div>

          <div className="mt-4 flex gap-2">
            <button
              onClick={copyCode}
              className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
            >
              {copied ? 'Copied!' : 'Copy License'}
            </button>
            <Link
              to={`/licenses/${result.id}`}
              className="rounded-lg border border-emerald-300 bg-white px-4 py-2 text-sm font-semibold text-emerald-700 hover:bg-emerald-50"
            >
              View Details
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
