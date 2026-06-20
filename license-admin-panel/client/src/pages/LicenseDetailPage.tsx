import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '../lib/api';
import { LicenseRecord } from '../lib/types';
import { PlanBadge, StatusBadge } from '../components/Badges';
import { ConfirmDialog } from '../components/ConfirmDialog';

export function LicenseDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [record, setRecord] = useState<LicenseRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [notes, setNotes] = useState('');
  const [savingNotes, setSavingNotes] = useState(false);
  const [copied, setCopied] = useState(false);
  const [confirmType, setConfirmType] = useState<'revoke' | 'delete' | 'expire' | null>(null);

  useEffect(() => {
    if (!id) return;
    api
      .getLicense(id)
      .then((r) => {
        setRecord(r);
        setNotes(r.notes);
      })
      .finally(() => setLoading(false));
  }, [id]);

  async function saveNotes() {
    if (!record) return;
    setSavingNotes(true);
    try {
      const updated = await api.updateLicense(record.id, { notes });
      setRecord(updated);
    } finally {
      setSavingNotes(false);
    }
  }

  async function handleConfirm(reason?: string) {
    if (!record || !confirmType) return;
    if (confirmType === 'revoke') setRecord(await api.revokeLicense(record.id, reason));
    else if (confirmType === 'expire') setRecord(await api.expireLicense(record.id));
    else if (confirmType === 'delete') {
      await api.deleteLicense(record.id);
      navigate('/licenses');
      return;
    }
    setConfirmType(null);
  }

  if (loading) return <p className="text-sm text-slate-400">Loading…</p>;
  if (!record) return <p className="text-sm text-slate-400">License not found.</p>;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-slate-900">{record.customerName || 'Unnamed Customer'}</h1>
        <div className="flex gap-2">
          <PlanBadge plan={record.plan} />
          <StatusBadge status={record.status} />
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-card">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-400">Customer Information</h2>
        <dl className="mt-3 grid grid-cols-2 gap-4 text-sm">
          <div>
            <dt className="text-slate-400">Name</dt>
            <dd className="font-medium text-slate-900">{record.customerName || '—'}</dd>
          </div>
          <div>
            <dt className="text-slate-400">Phone</dt>
            <dd className="font-medium text-slate-900">{record.phone || '—'}</dd>
          </div>
          <div>
            <dt className="text-slate-400">Device ID</dt>
            <dd className="font-mono font-medium text-slate-900">{record.deviceId}</dd>
          </div>
          <div>
            <dt className="text-slate-400">Created</dt>
            <dd className="font-medium text-slate-900">{new Date(record.createdAt).toLocaleString()}</dd>
          </div>
          <div>
            <dt className="text-slate-400">Activated</dt>
            <dd className="font-medium text-slate-900">
              {record.activatedAt ? new Date(record.activatedAt).toLocaleString() : 'Not confirmed yet'}
            </dd>
          </div>
          {record.status === 'revoked' && (
            <div>
              <dt className="text-slate-400">Revoked</dt>
              <dd className="font-medium text-slate-900">
                {record.revokedAt && new Date(record.revokedAt).toLocaleString()}
                {record.revokedReason ? ` — ${record.revokedReason}` : ''}
              </dd>
            </div>
          )}
        </dl>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-card">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-400">License Code</h2>
        <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
          <code className="block break-all font-mono text-xs text-slate-700">{record.licenseCode}</code>
        </div>
        <button
          onClick={() => {
            navigator.clipboard.writeText(record.licenseCode);
            setCopied(true);
            setTimeout(() => setCopied(false), 1200);
          }}
          className="mt-3 rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
        >
          {copied ? 'Copied!' : 'Copy License Code'}
        </button>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-card">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-400">Notes</h2>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          className="mt-3 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
        />
        <button
          onClick={saveNotes}
          disabled={savingNotes || notes === record.notes}
          className="mt-3 rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-50"
        >
          {savingNotes ? 'Saving…' : 'Save Notes'}
        </button>
      </div>

      <div className="flex gap-2">
        {record.status === 'active' && (
          <>
            <button
              onClick={() => setConfirmType('revoke')}
              className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-2 text-sm font-semibold text-amber-700 hover:bg-amber-100"
            >
              Revoke License
            </button>
            <button
              onClick={() => setConfirmType('expire')}
              className="rounded-lg border border-slate-300 bg-slate-50 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100"
            >
              Mark Expired
            </button>
          </>
        )}
        <button
          onClick={() => setConfirmType('delete')}
          className="rounded-lg border border-red-300 bg-red-50 px-4 py-2 text-sm font-semibold text-red-600 hover:bg-red-100"
        >
          Delete
        </button>
      </div>

      {confirmType && (
        <ConfirmDialog
          title={
            confirmType === 'revoke' ? 'Revoke this license?' : confirmType === 'expire' ? 'Mark as expired?' : 'Delete this license?'
          }
          message={
            confirmType === 'delete'
              ? 'This permanently removes the record from your ledger. This cannot be undone.'
              : "This updates your records only — ManagerX has no internet connection, so this does not remotely affect the customer's app."
          }
          confirmLabel={confirmType === 'revoke' ? 'Revoke' : confirmType === 'expire' ? 'Mark Expired' : 'Delete'}
          destructive={confirmType !== 'expire'}
          withReason={confirmType === 'revoke'}
          onConfirm={handleConfirm}
          onCancel={() => setConfirmType(null)}
        />
      )}
    </div>
  );
}
