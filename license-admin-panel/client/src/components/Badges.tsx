import { LicenseStatus, Plan, PLAN_LABELS } from '../lib/types';

export function PlanBadge({ plan }: { plan: Plan }) {
  return (
    <span className="inline-flex items-center rounded-full bg-brand-100 px-2.5 py-0.5 text-xs font-semibold text-brand-700">
      {PLAN_LABELS[plan]}
    </span>
  );
}

const STATUS_STYLES: Record<LicenseStatus, string> = {
  active: 'bg-emerald-100 text-emerald-700',
  revoked: 'bg-red-100 text-red-700',
  expired: 'bg-slate-200 text-slate-600',
};

export function StatusBadge({ status }: { status: LicenseStatus }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ${STATUS_STYLES[status]}`}>
      {status}
    </span>
  );
}
