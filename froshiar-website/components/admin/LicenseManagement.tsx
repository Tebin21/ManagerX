'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Key,
  PlusCircle,
  Copy,
  Check,
  Search,
  RefreshCw,
  Trash2,
  Ban,
  FileSpreadsheet,
  CheckCircle2,
  Calendar,
  Clock,
  Smartphone,
  User,
  Phone,
  Layers,
  Sparkles,
  ShoppingBag,
  ExternalLink,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

export interface LicenseRecord {
  id: string;
  customerName: string;
  phone: string;
  deviceId: string;
  licenseCode: string;
  plan: 'basic' | 'plus' | 'pro' | 'business' | 'unlimited';
  createdAt: string;
  activatedAt: string | null;
  expiresAt: string | null;
  status: 'active' | 'revoked' | 'expired';
  notes: string;
  revokedAt: string | null;
  revokedReason: string | null;
  isExpired: boolean;
}

export interface OnlineStoreSubscriptionRecord {
  id: string;
  customerName: string;
  phone: string;
  deviceId: string;
  subscriptionCode: string;
  plan: '1m' | '3m' | '6m' | '12m' | 'lifetime';
  createdAt: string;
  expiresAt: string | null;
  status: 'active' | 'revoked' | 'expired';
  notes: string;
  revokedAt: string | null;
  revokedReason: string | null;
  isExpired: boolean;
}

interface CustomerGroup {
  phone: string;
  customerName: string;
  devices: string[];
  licenses: LicenseRecord[];
  planHistory: Array<{ plan: string; createdAt: string; status: string }>;
}

const PLAN_INFO: Record<string, { labelKu: string; labelEn: string; itemsKu: string; itemsEn: string; color: string }> = {
  basic: { labelKu: 'بەیجیک (Basic)', labelEn: 'Basic', itemsKu: '١٠٠ ئایتم', itemsEn: '100 items', color: 'from-slate-500 to-slate-700' },
  plus: { labelKu: 'پڵەس (Plus)', labelEn: 'Plus', itemsKu: '٢٠٠ ئایتم', itemsEn: '200 items', color: 'from-blue-500 to-blue-700' },
  pro: { labelKu: 'پڕۆ (Pro)', labelEn: 'Pro', itemsKu: '٦٠٠ ئایتم', itemsEn: '600 items', color: 'from-amber-500 to-amber-700' },
  business: { labelKu: 'بزنس (Business)', labelEn: 'Business', itemsKu: '١،٠٠٠ ئایتم', itemsEn: '1,000 items', color: 'from-emerald-500 to-emerald-700' },
  unlimited: { labelKu: 'بێ سنوور (Unlimited)', labelEn: 'Unlimited', itemsKu: 'بێ سنوور', itemsEn: 'Unlimited items', color: 'from-[#D4AF37] to-[#B8860B]' },
};

const SUB_PLANS: Record<string, { labelKu: string; labelEn: string }> = {
  '1m': { labelKu: '١ مانگ', labelEn: '1 Month' },
  '3m': { labelKu: '٣ مانگ', labelEn: '3 Months' },
  '6m': { labelKu: '٦ مانگ', labelEn: '6 Months' },
  '12m': { labelKu: '١ ساڵ (١٢ مانگ)', labelEn: '1 Year (12M)' },
  lifetime: { labelKu: 'هەمیشەیی (Lifetime)', labelEn: 'Lifetime' },
};

export default function LicenseManagement({
  isDarkMode,
  language,
  onLicensesUpdated,
}: {
  isDarkMode: boolean;
  language: 'ku' | 'en';
  onLicensesUpdated?: (count: number) => void;
}) {
  const isKu = language === 'ku';

  // Sub-tabs
  const [subTab, setSubTab] = useState<'generate' | 'list' | 'subscriptions' | 'customers'>('generate');

  // License data
  const [licenses, setLicenses] = useState<LicenseRecord[]>([]);
  const [subscriptions, setSubscriptions] = useState<OnlineStoreSubscriptionRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Generate License Form
  const [licCustomerName, setLicCustomerName] = useState('');
  const [licPhone, setLicPhone] = useState('');
  const [licDeviceId, setLicDeviceId] = useState('');
  const [licPlan, setLicPlan] = useState<'basic' | 'plus' | 'pro' | 'business' | 'unlimited'>('pro');
  const [licHasExpiry, setLicHasExpiry] = useState(false);
  const [licMonths, setLicMonths] = useState('1');
  const [licNotes, setLicNotes] = useState('');
  const [licSubmitting, setLicSubmitting] = useState(false);
  const [licError, setLicError] = useState<string | null>(null);
  const [licSuccess, setLicSuccess] = useState<LicenseRecord | null>(null);

  // Generate Subscription Form
  const [subCustomerName, setSubCustomerName] = useState('');
  const [subPhone, setSubPhone] = useState('');
  const [subDeviceId, setSubDeviceId] = useState('');
  const [subPlan, setSubPlan] = useState<'1m' | '3m' | '6m' | '12m' | 'lifetime'>('1m');
  const [subNotes, setSubNotes] = useState('');
  const [subSubmitting, setSubSubmitting] = useState(false);
  const [subError, setSubError] = useState<string | null>(null);
  const [subSuccess, setSubSuccess] = useState<OnlineStoreSubscriptionRecord | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'expired' | 'revoked'>('all');
  const [expandedCustomer, setExpandedCustomer] = useState<string | null>(null);

  // Fetch all licenses & subscriptions
  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [licRes, subRes] = await Promise.all([
        fetch('/api/licenses', { cache: 'no-store' }),
        fetch('/api/online-store-subscriptions', { cache: 'no-store' }),
      ]);
      if (licRes.ok) {
        const data = await licRes.json();
        setLicenses(data.licenses || []);
        if (onLicensesUpdated) onLicensesUpdated(data.licenses?.length || 0);
      }
      if (subRes.ok) {
        const data = await subRes.json();
        setSubscriptions(data.subscriptions || []);
      }
    } catch (err) {
      console.error('Error fetching license data:', err);
    } finally {
      setLoading(false);
    }
  }, [onLicensesUpdated]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  // Handle Generate License submit
  const handleGenerateLicense = async (e: React.FormEvent) => {
    e.preventDefault();
    setLicError(null);
    setLicSuccess(null);

    const dev = licDeviceId.trim().toUpperCase();
    if (!dev) {
      setLicError(isKu ? 'تکایە ئایدی ئامێر بنووسە' : 'Please enter Device ID');
      return;
    }

    setLicSubmitting(true);
    try {
      const res = await fetch('/api/licenses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerName: licCustomerName.trim(),
          phone: licPhone.trim(),
          deviceId: dev,
          plan: licPlan,
          expiresInMonths: licHasExpiry ? Number(licMonths) : null,
          notes: licNotes.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setLicError(data.error || (isKu ? 'هەڵەیەک ڕوویدا لە دروستکردنی لایسێنس' : 'Failed to create license'));
      } else {
        setLicSuccess(data.license);
        setLicCustomerName('');
        setLicPhone('');
        setLicDeviceId('');
        setLicNotes('');
        fetchAll();
      }
    } catch (err: any) {
      setLicError(err?.message || (isKu ? 'هەڵەی پەیوەندی بە سێرڤەر' : 'Server connection error'));
    } finally {
      setLicSubmitting(false);
    }
  };

  // Handle Generate Subscription submit
  const handleGenerateSubscription = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubError(null);
    setSubSuccess(null);

    const dev = subDeviceId.trim().toUpperCase();
    if (!dev) {
      setSubError(isKu ? 'تکایە ئایدی ئامێر بنووسە' : 'Please enter Device ID');
      return;
    }

    setSubSubmitting(true);
    try {
      const res = await fetch('/api/online-store-subscriptions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerName: subCustomerName.trim(),
          phone: subPhone.trim(),
          deviceId: dev,
          plan: subPlan,
          notes: subNotes.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setSubError(data.error || (isKu ? 'هەڵەیەک ڕوویدا لە دروستکردنی سەبسکرایپشن' : 'Failed to create subscription'));
      } else {
        setSubSuccess(data.subscription);
        setSubCustomerName('');
        setSubPhone('');
        setSubDeviceId('');
        setSubNotes('');
        fetchAll();
      }
    } catch (err: any) {
      setSubError(err?.message || (isKu ? 'هەڵەی پەیوەندی بە سێرڤەر' : 'Server connection error'));
    } finally {
      setSubSubmitting(false);
    }
  };

  // Status toggle (Revoke / Re-activate)
  const toggleLicenseStatus = async (item: LicenseRecord) => {
    const nextStatus = item.status === 'revoked' ? 'active' : 'revoked';
    const confirmMsg =
      nextStatus === 'revoked'
        ? isKu
          ? `ئایا دڵنیایت لە هەڵوەشاندنەوەی لایسێنسی ${item.customerName || item.deviceId}؟`
          : `Are you sure you want to revoke license for ${item.customerName || item.deviceId}?`
        : isKu
        ? `ئایا دڵنیایت لە چالاککردنەوەی لایسێنس؟`
        : `Re-activate this license?`;

    if (!window.confirm(confirmMsg)) return;

    try {
      const res = await fetch('/api/licenses', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: item.id,
          status: nextStatus,
          revokedReason: nextStatus === 'revoked' ? 'Revoked by admin' : null,
        }),
      });
      if (res.ok) {
        fetchAll();
      }
    } catch (err) {
      console.error('Failed to update status:', err);
    }
  };

  // Delete license
  const deleteLicense = async (id: string) => {
    if (!window.confirm(isKu ? 'ئایا دڵنیایت لە سڕینەوەی ئەم لایسێنسە بە تەواوەتی لە سیستەم؟' : 'Permanently delete this license record?')) {
      return;
    }
    try {
      const res = await fetch(`/api/licenses?id=${id}`, { method: 'DELETE' });
      if (res.ok) {
        fetchAll();
      }
    } catch (err) {
      console.error('Failed to delete license:', err);
    }
  };

  // Delete subscription
  const deleteSubscription = async (id: string) => {
    if (!window.confirm(isKu ? 'ئایا دڵنیایت لە سڕینەوەی ئەم سەبسکرایپشنە؟' : 'Permanently delete this subscription record?')) {
      return;
    }
    try {
      const res = await fetch(`/api/online-store-subscriptions?id=${id}`, { method: 'DELETE' });
      if (res.ok) {
        fetchAll();
      }
    } catch (err) {
      console.error('Failed to delete subscription:', err);
    }
  };

  // Copy helper
  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Filtered licenses
  const filteredLicenses = useMemo(() => {
    const q = searchQuery.toLowerCase();
    return licenses.filter((l) => {
      const matchesSearch =
        !q ||
        l.customerName?.toLowerCase().includes(q) ||
        l.phone?.toLowerCase().includes(q) ||
        l.deviceId?.toLowerCase().includes(q) ||
        l.licenseCode?.toLowerCase().includes(q);

      const matchesStatus =
        statusFilter === 'all' ||
        (statusFilter === 'expired' && l.isExpired) ||
        (statusFilter === 'active' && l.status === 'active' && !l.isExpired) ||
        (statusFilter === 'revoked' && l.status === 'revoked');

      return matchesSearch && matchesStatus;
    });
  }, [licenses, searchQuery, statusFilter]);

  // Group customers by phone
  const customerGroups: CustomerGroup[] = useMemo(() => {
    const map = new Map<string, CustomerGroup>();
    for (const lic of licenses) {
      const key = lic.phone || lic.customerName || lic.deviceId;
      if (!map.has(key)) {
        map.set(key, {
          phone: lic.phone,
          customerName: lic.customerName,
          devices: [],
          licenses: [],
          planHistory: [],
        });
      }
      const g = map.get(key)!;
      if (lic.customerName && !g.customerName) g.customerName = lic.customerName;
      if (!g.devices.includes(lic.deviceId)) g.devices.push(lic.deviceId);
      g.licenses.push(lic);
      g.planHistory.push({
        plan: lic.plan,
        createdAt: lic.createdAt,
        status: lic.status,
      });
    }
    return Array.from(map.values());
  }, [licenses]);

  // Export CSV of licenses
  const exportLicensesCSV = () => {
    if (filteredLicenses.length === 0) return;
    const headers = ['Customer Name', 'Phone', 'Device ID', 'Plan', 'Status', 'License Code', 'Expires At', 'Created At'];
    const rows = filteredLicenses.map((l) => [
      `"${l.customerName || ''}"`,
      `"${l.phone || ''}"`,
      `"${l.deviceId}"`,
      `"${l.plan}"`,
      `"${l.isExpired ? 'expired' : l.status}"`,
      `"${l.licenseCode}"`,
      `"${l.expiresAt || 'Never'}"`,
      `"${l.createdAt}"`,
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `froshiar_licenses_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* ── Sub-Navigation Pill Tabs ── */}
      <div
        className={`p-1.5 sm:p-2 rounded-2xl border transition-colors flex items-center gap-1 sm:gap-2 overflow-x-auto no-scrollbar ${
          isDarkMode ? 'bg-[#0E1524] border-slate-800' : 'bg-slate-100/80 border-slate-200'
        }`}
      >
        {[
          { id: 'generate', labelKu: 'دروستکردنی لایسێنس', labelEn: 'Generate License', icon: PlusCircle },
          { id: 'list', labelKu: 'لیستی لایسێنسەکان', labelEn: 'Licenses List', icon: Key, count: licenses.length },
          {
            id: 'subscriptions',
            labelKu: 'سەبسکرایپشنی فرۆشگا',
            labelEn: 'Store Subscriptions',
            icon: ShoppingBag,
            count: subscriptions.length,
          },
          { id: 'customers', labelKu: 'موشتەرییەکان', labelEn: 'Customers Directory', icon: User, count: customerGroups.length },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = subTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setSubTab(tab.id as any)}
              className={`px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl text-xs font-bold transition flex items-center gap-2 whitespace-nowrap cursor-pointer shrink-0 ${
                isActive
                  ? 'bg-gradient-to-r from-[#D4AF37] to-[#B8860B] text-slate-950 shadow-md font-black'
                  : isDarkMode
                  ? 'text-slate-300 hover:bg-slate-800/60 hover:text-white'
                  : 'text-slate-600 hover:bg-white hover:text-slate-900'
              }`}
            >
              <Icon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span>{isKu ? tab.labelKu : tab.labelEn}</span>
              {tab.count !== undefined && (
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                    isActive ? 'bg-slate-950/20 text-slate-950' : 'bg-slate-200/60 dark:bg-slate-800 text-slate-400'
                  }`}
                >
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ─── TAB 1: GENERATE LICENSE ───────────────────────────────────────── */}
      {subTab === 'generate' && (
        <div className="space-y-4 sm:space-y-6">
          {/* Success Banner */}
          {licSuccess && (
            <div className="p-4 sm:p-6 rounded-2xl bg-gradient-to-tr from-[#D4AF37]/15 to-[#B8860B]/25 border-2 border-[#D4AF37] shadow-xl space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                  <span>{isKu ? 'لایسێنسەکە بە سەرکەوتوویی دروستکرا و واژوو کرا!' : 'License created & cryptographically signed!'}</span>
                </div>
                <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-[#D4AF37]/20 text-[#D4AF37] border border-[#D4AF37]/40 uppercase font-black">
                  {licSuccess.plan}
                </span>
              </div>

              {/* Code Box */}
              <div
                className={`p-3 sm:p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                  isDarkMode ? 'bg-[#0B1120] border-slate-700' : 'bg-white border-slate-200'
                }`}
              >
                <div className="min-w-0">
                  <div className="text-[10px] text-slate-400 font-bold uppercase mb-1">
                    {isKu ? 'کۆدی فەرمی لایسێنس (بیدە بە موشتەری):' : 'Official License Code (give to customer):'}
                  </div>
                  <div className="font-mono text-xs sm:text-sm font-bold text-[#D4AF37] break-all select-all">
                    {licSuccess.licenseCode}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => copyToClipboard(licSuccess.licenseCode, 'just-generated')}
                  className="px-4 py-2.5 rounded-xl bg-[#D4AF37] hover:bg-[#C29E2F] text-slate-950 font-bold text-xs flex items-center justify-center gap-1.5 transition shrink-0 shadow cursor-pointer"
                >
                  {copiedId === 'just-generated' ? <Check className="w-4 h-4 text-emerald-950" /> : <Copy className="w-4 h-4" />}
                  <span>{copiedId === 'just-generated' ? (isKu ? 'کۆپی کرا!' : 'Copied!') : isKu ? 'کۆپیکردنی کۆد' : 'Copy Code'}</span>
                </button>
              </div>

              {/* Details breakdown */}
              <div className="flex flex-wrap items-center gap-3 text-xs text-slate-300">
                {licSuccess.customerName && (
                  <div>
                    <span className="text-slate-400">{isKu ? 'موشتەری:' : 'Customer:'} </span>
                    <span className="font-bold">{licSuccess.customerName}</span>
                  </div>
                )}
                <div>
                  <span className="text-slate-400">{isKu ? 'ئایدی ئامێر:' : 'Device ID:'} </span>
                  <span className="font-mono font-bold text-slate-200">{licSuccess.deviceId}</span>
                </div>
                <div>
                  <span className="text-slate-400">{isKu ? 'بەسەرچوون:' : 'Expiry:'} </span>
                  <span className="font-bold text-emerald-400">
                    {licSuccess.expiresAt ? new Date(licSuccess.expiresAt).toLocaleDateString() : isKu ? 'هەمیشەیی' : 'Permanent'}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Error Banner */}
          {licError && (
            <div className="p-3.5 rounded-xl bg-red-500/15 border border-red-500/30 text-red-400 text-xs font-semibold flex items-center gap-2">
              <Ban className="w-4 h-4 shrink-0" />
              <span>{licError}</span>
            </div>
          )}

          {/* Form */}
          <form
            onSubmit={handleGenerateLicense}
            className={`p-4 sm:p-6 rounded-2xl border space-y-4 sm:space-y-5 transition ${
              isDarkMode ? 'bg-[#0E1524] border-slate-800' : 'bg-white border-slate-200'
            }`}
          >
            <div>
              <h3 className="text-sm sm:text-base font-extrabold text-inherit">
                {isKu ? 'دروستکردنی لایسێنسی نوێی ئامێر' : 'Generate New Device-Bound License'}
              </h3>
              <p className="text-[11px] sm:text-xs text-slate-400 mt-0.5">
                {isKu
                  ? 'کۆدی لایسێنس بە شێوازی سەلامەت بە کلیلەکانی Ed25519 واژوو دەکرێت و دەبەسترێتەوە بە یەک ئامێری دیاریکراو.'
                  : 'License is signed with Ed25519 private key and permanently bound to the unique hardware Device ID.'}
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              {/* Customer Name */}
              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1.5">
                  {isKu ? 'ناوی موشتەری / خاوەن مارکێت' : 'Customer / Store Name'}
                </label>
                <input
                  type="text"
                  value={licCustomerName}
                  onChange={(e) => setLicCustomerName(e.target.value)}
                  placeholder={isKu ? 'نموونە: کاک ئارام - مارکێتی بێست' : 'e.g. Aram Best Market'}
                  className={`w-full px-3.5 py-2.5 rounded-xl text-xs font-medium outline-none border transition ${
                    isDarkMode
                      ? 'bg-[#141C2E] border-slate-700 text-white placeholder-slate-500 focus:border-[#D4AF37]'
                      : 'bg-[#F8FAFC] border-slate-200 text-slate-900 placeholder-slate-400 focus:border-[#D4AF37]'
                  }`}
                />
              </div>

              {/* Phone */}
              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1.5">
                  {isKu ? 'ژمارەی مۆبایل' : 'Phone Number'}
                </label>
                <input
                  type="text"
                  value={licPhone}
                  onChange={(e) => setLicPhone(e.target.value)}
                  placeholder="0750 000 0000"
                  className={`w-full px-3.5 py-2.5 rounded-xl text-xs font-mono outline-none border transition ${
                    isDarkMode
                      ? 'bg-[#141C2E] border-slate-700 text-white placeholder-slate-500 focus:border-[#D4AF37]'
                      : 'bg-[#F8FAFC] border-slate-200 text-slate-900 placeholder-slate-400 focus:border-[#D4AF37]'
                  }`}
                />
              </div>
            </div>

            {/* Device ID */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-bold text-slate-400">
                  {isKu ? 'ئایدی ئامێر (Device ID)' : 'Device ID'} <span className="text-red-400">*</span>
                </label>
                <span className="text-[10px] text-slate-400 font-mono">MX-DV-XXXX-XXXX</span>
              </div>
              <input
                type="text"
                required
                value={licDeviceId}
                onChange={(e) => setLicDeviceId(e.target.value)}
                placeholder="MX-DV-84K2-91LM"
                className={`w-full px-3.5 py-2.5 rounded-xl text-xs font-mono font-bold tracking-wide outline-none border transition uppercase ${
                  isDarkMode
                    ? 'bg-[#141C2E] border-slate-700 text-[#D4AF37] placeholder-slate-600 focus:border-[#D4AF37]'
                    : 'bg-[#F8FAFC] border-slate-200 text-[#B8860B] placeholder-slate-400 focus:border-[#D4AF37]'
                }`}
              />
              <p className="text-[10px] text-slate-400 mt-1">
                {isKu
                  ? 'بەکارهێنەر دەتوانێت لە ئەپەکە لە بەشی ڕێکخستنەکان > پلان و لایسێنس ئایدی ئامێرەکەی کۆپی بکات.'
                  : 'The user can find and copy this Device ID in App Settings > Plan & Limits.'}
              </p>
            </div>

            {/* Plan Selector */}
            <div>
              <label className="block text-xs font-bold text-slate-400 mb-2">
                {isKu ? 'دیاریکردنی پلان و ژمارەی ئایتمەکان' : 'Select Plan & Item Limit'}
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 sm:gap-2.5">
                {(['basic', 'plus', 'pro', 'business', 'unlimited'] as const).map((planKey) => {
                  const info = PLAN_INFO[planKey];
                  const isSelected = licPlan === planKey;
                  return (
                    <button
                      key={planKey}
                      type="button"
                      onClick={() => setLicPlan(planKey)}
                      className={`p-2.5 sm:p-3 rounded-xl border text-start transition cursor-pointer relative ${
                        isSelected
                          ? isDarkMode
                            ? 'bg-[#1F2942] border-[#D4AF37] ring-2 ring-[#D4AF37]/30'
                            : 'bg-[#FDF9ED] border-[#D4AF37] ring-2 ring-[#D4AF37]/30'
                          : isDarkMode
                          ? 'bg-[#141C2E] border-slate-800 hover:border-slate-700'
                          : 'bg-[#F8FAFC] border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-black capitalize text-inherit">
                          {isKu ? info.labelKu.split(' ')[0] : info.labelEn}
                        </span>
                        {isSelected && <Check className="w-3.5 h-3.5 text-[#D4AF37]" />}
                      </div>
                      <div className="text-[11px] font-bold text-[#D4AF37] mt-1 font-mono">
                        {isKu ? info.itemsKu : info.itemsEn}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Expiry Options */}
            <div className="pt-2 border-t border-slate-200/50 dark:border-slate-800/50 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-inherit">{isKu ? 'بەسەرچوونی لایسێنس' : 'License Expiration'}</span>
                  <p className="text-[10px] text-slate-400">
                    {licHasExpiry
                      ? isKu
                        ? 'لایسێنسەکە دوای ماوەی دیاریکراو بەسەردەچێت'
                        : 'Expires after selected months'
                      : isKu
                      ? 'لایسێنسێکی هەمیشەیی و بێ بەسەرچوون دروست دەکرێت'
                      : 'Permanent lifetime license with no expiration'}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setLicHasExpiry(!licHasExpiry)}
                  className={`px-3 py-1.5 rounded-full text-xs font-bold border transition cursor-pointer ${
                    licHasExpiry
                      ? 'bg-amber-500/15 border-amber-500/40 text-amber-400'
                      : 'bg-emerald-500/15 border-emerald-500/40 text-emerald-400'
                  }`}
                >
                  {licHasExpiry ? (isKu ? 'بەپێی مانگ' : 'Expires') : isKu ? 'هەمیشەیی (Permanent)' : 'Permanent'}
                </button>
              </div>

              {licHasExpiry && (
                <div className="flex items-center gap-2">
                  {['1', '3', '6', '12'].map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setLicMonths(m)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition cursor-pointer ${
                        licMonths === m
                          ? 'bg-[#3B82F6] text-white border-blue-500 shadow-sm'
                          : isDarkMode
                          ? 'bg-[#141C2E] border-slate-800 text-slate-300'
                          : 'bg-slate-100 border-slate-200 text-slate-700'
                      }`}
                    >
                      {m} {isKu ? 'مانگ' : 'Months'}
                    </button>
                  ))}
                  <div className="flex items-center gap-1 min-w-0">
                    <input
                      type="number"
                      min="1"
                      max="120"
                      value={licMonths}
                      onChange={(e) => setLicMonths(e.target.value)}
                      className={`w-18 px-2.5 py-1.5 rounded-xl text-xs font-mono outline-none border text-center ${
                        isDarkMode ? 'bg-[#141C2E] border-slate-700 text-white' : 'bg-slate-100 border-slate-200'
                      }`}
                    />
                    <span className="text-[10px] text-slate-400">{isKu ? 'مانگ' : 'Mo'}</span>
                  </div>
                </div>
              )}
            </div>

            {/* Notes */}
            <div>
              <label className="block text-xs font-bold text-slate-400 mb-1.5">
                {isKu ? 'تێبینی (ئارەزوومەندانە)' : 'Notes (optional)'}
              </label>
              <input
                type="text"
                value={licNotes}
                onChange={(e) => setLicNotes(e.target.value)}
                placeholder={isKu ? 'وەک: بەستراوە لەگەڵ لقی سەرەکی' : 'Internal notes...'}
                className={`w-full px-3.5 py-2.5 rounded-xl text-xs font-medium outline-none border transition ${
                  isDarkMode
                    ? 'bg-[#141C2E] border-slate-700 text-white placeholder-slate-500 focus:border-[#D4AF37]'
                    : 'bg-[#F8FAFC] border-slate-200 text-slate-900 placeholder-slate-400 focus:border-[#D4AF37]'
                }`}
              />
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={licSubmitting}
              className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-[#D4AF37] to-[#B8860B] hover:from-[#C29E2F] hover:to-[#A67807] text-slate-950 font-black text-sm shadow-lg shadow-[#D4AF37]/20 transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <Sparkles className="w-4 h-4 text-slate-950" />
              <span>{licSubmitting ? (isKu ? 'دروست دەکرێت...' : 'Generating...') : isKu ? 'دروستکردن و واژووکردنی لایسێنس' : 'Generate & Sign License'}</span>
            </button>
          </form>
        </div>
      )}

      {/* ─── TAB 2: LICENSES LIST ─────────────────────────────────────────── */}
      {subTab === 'list' && (
        <div className="space-y-4">
          {/* Top Search & Actions */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            {/* Search */}
            <div className="relative flex-1">
              <Search className={`w-4 h-4 text-slate-400 absolute top-3 ${isKu ? 'right-3.5' : 'left-3.5'}`} />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={isKu ? 'گەڕان بەپێی موشتەری، مۆبایل، ئایدی ئامێر، کۆدی لایسێنس...' : 'Search customer, phone, device ID, code...'}
                className={`w-full py-2.5 rounded-xl text-xs font-medium outline-none border transition ${
                  isKu ? 'pr-10 pl-3' : 'pl-10 pr-3'
                } ${
                  isDarkMode
                    ? 'bg-[#0E1524] border-slate-700 text-white placeholder-slate-500 focus:border-[#D4AF37]'
                    : 'bg-[#F8FAFC] border-slate-200 text-slate-900 placeholder-slate-400 focus:border-[#D4AF37]'
                }`}
              />
            </div>

            {/* Status Filter & CSV */}
            <div className="flex items-center gap-2 shrink-0">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className={`px-3 py-2 rounded-xl text-xs font-bold outline-none border transition cursor-pointer ${
                  isDarkMode ? 'bg-[#0E1524] border-slate-700 text-slate-200' : 'bg-white border-slate-200 text-slate-700'
                }`}
              >
                <option value="all">{isKu ? 'هەموو دۆخەکان' : 'All Statuses'}</option>
                <option value="active">{isKu ? 'چالاک (Active)' : 'Active'}</option>
                <option value="expired">{isKu ? 'بەسەرچوو (Expired)' : 'Expired'}</option>
                <option value="revoked">{isKu ? 'هەڵوەشاوە (Revoked)' : 'Revoked'}</option>
              </select>

              <button
                type="button"
                onClick={exportLicensesCSV}
                className="px-3 py-2 rounded-xl border text-xs font-bold transition flex items-center gap-1.5 cursor-pointer bg-[#D4AF37]/15 text-[#D4AF37] border-[#D4AF37]/30 hover:bg-[#D4AF37]/25"
                title={isKu ? 'دەرهێنان بۆ ئێکسڵ' : 'Export to CSV'}
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">CSV</span>
              </button>

              <button
                type="button"
                onClick={fetchAll}
                className={`p-2 rounded-xl border text-xs transition cursor-pointer ${
                  isDarkMode ? 'bg-[#0E1524] border-slate-700 text-slate-200' : 'bg-white border-slate-200 text-slate-700'
                }`}
                title={isKu ? 'نوێکردنەوە' : 'Refresh'}
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-[#D4AF37]' : ''}`} />
              </button>
            </div>
          </div>

          {/* Cards List */}
          <div className="space-y-3">
            {filteredLicenses.length === 0 ? (
              <div className="py-16 text-center text-slate-400 text-xs">
                {isKu ? 'هیچ لایسێنسێک نەدۆزرایەوە.' : 'No licenses found.'}
              </div>
            ) : (
              filteredLicenses.map((lic) => {
                const planInfo = PLAN_INFO[lic.plan] || PLAN_INFO.basic;
                const isRevoked = lic.status === 'revoked';
                const isExpired = lic.isExpired;

                return (
                  <div
                    key={lic.id}
                    className={`p-3.5 sm:p-5 rounded-2xl border transition space-y-3 ${
                      isDarkMode
                        ? 'bg-[#0E1524] border-slate-800 hover:border-slate-700'
                        : 'bg-[#F8FAFC] border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    {/* Top Row: Customer info & Badges */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-tr from-[#D4AF37]/20 to-[#D4AF37]/30 flex items-center justify-center text-[#D4AF37] font-bold text-sm shrink-0">
                          {lic.customerName ? lic.customerName.charAt(0).toUpperCase() : 'L'}
                        </div>

                        <div className="min-w-0 text-start">
                          <div className="flex items-center gap-2">
                            <span className="text-xs sm:text-sm font-extrabold text-inherit truncate">
                              {lic.customerName || (isKu ? 'بێ ناو' : 'Unnamed Customer')}
                            </span>
                            {/* Plan badge */}
                            <span className="text-[10px] font-bold font-mono px-2 py-0.5 rounded-full bg-[#D4AF37]/15 text-[#D4AF37] border border-[#D4AF37]/30 uppercase shrink-0">
                              {lic.plan} ({isKu ? planInfo.itemsKu : planInfo.itemsEn})
                            </span>
                          </div>

                          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400 mt-0.5 font-mono">
                            {lic.phone && (
                              <span className="flex items-center gap-1 text-[11px]">
                                <Phone className="w-3 h-3 text-slate-500 shrink-0" />
                                <span>{lic.phone}</span>
                              </span>
                            )}
                            <span className="text-[11px] text-slate-400">
                              {isKu ? 'ئایدی ئامێر:' : 'Device:'} <span className="text-slate-200 font-bold">{lic.deviceId}</span>
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Status Badges & Expiry */}
                      <div className="flex items-center gap-2 shrink-0 self-start sm:self-auto">
                        {isRevoked ? (
                          <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-red-500/15 text-red-400 border border-red-500/30">
                            {isKu ? 'هەڵوەشاوە (Revoked)' : 'Revoked'}
                          </span>
                        ) : isExpired ? (
                          <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/30">
                            {isKu ? 'بەسەرچوو (Expired)' : 'Expired'}
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                            {isKu ? 'چالاک (Active)' : 'Active'}
                          </span>
                        )}

                        <span className="text-[10px] text-slate-400 font-medium">
                          {lic.expiresAt
                            ? `${isKu ? 'بەسەردەچێت:' : 'Expires:'} ${new Date(lic.expiresAt).toLocaleDateString()}`
                            : isKu
                            ? 'هەمیشەیی'
                            : 'Permanent'}
                        </span>
                      </div>
                    </div>

                    {/* License Code Display Box */}
                    <div
                      className={`p-2.5 sm:p-3 rounded-xl border flex items-center justify-between gap-2 ${
                        isDarkMode ? 'bg-[#0B1120] border-slate-800' : 'bg-white border-slate-200'
                      }`}
                    >
                      <div className="font-mono text-xs text-[#D4AF37] truncate select-all">
                        {lic.licenseCode}
                      </div>

                      <button
                        type="button"
                        onClick={() => copyToClipboard(lic.licenseCode, lic.id)}
                        className={`p-1.5 sm:px-2.5 sm:py-1 rounded-lg text-[11px] font-bold transition flex items-center gap-1 cursor-pointer shrink-0 ${
                          copiedId === lic.id
                            ? 'bg-emerald-500 text-white'
                            : isDarkMode
                            ? 'bg-slate-800 hover:bg-slate-700 text-slate-200'
                            : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                        }`}
                      >
                        {copiedId === lic.id ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                        <span className="hidden sm:inline">
                          {copiedId === lic.id ? (isKu ? 'کۆپی کرا' : 'Copied') : isKu ? 'کۆپی' : 'Copy'}
                        </span>
                      </button>
                    </div>

                    {/* Bottom Row: Date & Actions */}
                    <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
                      <div>
                        {isKu ? 'دروستکراوە:' : 'Created:'} {new Date(lic.createdAt).toLocaleDateString()} · {new Date(lic.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>

                      <div className="flex items-center gap-2">
                        {/* Toggle Revoke */}
                        <button
                          type="button"
                          onClick={() => toggleLicenseStatus(lic)}
                          className={`text-xs font-semibold px-2.5 py-1 rounded-lg border transition cursor-pointer ${
                            isRevoked
                              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20'
                              : 'bg-red-500/10 border-red-500/30 text-red-400 hover:bg-red-500/20'
                          }`}
                        >
                          {isRevoked ? (isKu ? 'چالاککردنەوە' : 'Reactivate') : isKu ? 'هەڵوەشاندنەوە' : 'Revoke'}
                        </button>

                        {/* Delete */}
                        <button
                          type="button"
                          onClick={() => deleteLicense(lic.id)}
                          className="p-1 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition cursor-pointer"
                          title={isKu ? 'سڕینەوە' : 'Delete'}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* ─── TAB 3: STORE SUBSCRIPTIONS ───────────────────────────────────── */}
      {subTab === 'subscriptions' && (
        <div className="space-y-4 sm:space-y-6">
          {/* Success Banner */}
          {subSuccess && (
            <div className="p-4 sm:p-6 rounded-2xl bg-gradient-to-tr from-sky-500/15 to-blue-500/25 border-2 border-sky-400 shadow-xl space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                  <span>{isKu ? 'سەبسکرایپشنی فرۆشگای ئۆنلاین بە سەرکەوتوویی دروستکرا!' : 'Store subscription code generated!'}</span>
                </div>
                <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-sky-500/20 text-sky-400 border border-sky-500/40 uppercase font-black">
                  {subSuccess.plan}
                </span>
              </div>

              {/* Code Box */}
              <div
                className={`p-3 sm:p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                  isDarkMode ? 'bg-[#0B1120] border-slate-700' : 'bg-white border-slate-200'
                }`}
              >
                <div className="min-w-0">
                  <div className="text-[10px] text-slate-400 font-bold uppercase mb-1">
                    {isKu ? 'کۆدی سەبسکرایپشن (MX-OSS-...):' : 'Subscription Code:'}
                  </div>
                  <div className="font-mono text-xs sm:text-sm font-bold text-sky-400 break-all select-all">
                    {subSuccess.subscriptionCode}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => copyToClipboard(subSuccess.subscriptionCode, 'sub-just-generated')}
                  className="px-4 py-2.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold text-xs flex items-center justify-center gap-1.5 transition shrink-0 shadow cursor-pointer"
                >
                  {copiedId === 'sub-just-generated' ? <Check className="w-4 h-4 text-emerald-950" /> : <Copy className="w-4 h-4" />}
                  <span>{copiedId === 'sub-just-generated' ? (isKu ? 'کۆپی کرا!' : 'Copied!') : isKu ? 'کۆپیکردنی کۆد' : 'Copy Code'}</span>
                </button>
              </div>
            </div>
          )}

          {/* Form */}
          <form
            onSubmit={handleGenerateSubscription}
            className={`p-4 sm:p-6 rounded-2xl border space-y-4 transition ${
              isDarkMode ? 'bg-[#0E1524] border-slate-800' : 'bg-white border-slate-200'
            }`}
          >
            <div>
              <h3 className="text-sm sm:text-base font-extrabold text-inherit">
                {isKu ? 'دروستکردنی سەبسکرایپشنی فرۆشگای ئۆنلاین (Online Store)' : 'Generate Store Subscription Code'}
              </h3>
              <p className="text-[11px] sm:text-xs text-slate-400 mt-0.5">
                {isKu
                  ? 'کۆدی MX-OSS بۆ بەکارهێنەر دروست دەکرێت بۆ ئەوەی بتوانێت فرۆشگای ئۆنلاینی خۆی ئەکتیڤ بکات.'
                  : 'Generates an MX-OSS code bound to Device ID allowing store creation and cloud syncing.'}
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1.5">{isKu ? 'ناوی موشتەری' : 'Customer Name'}</label>
                <input
                  type="text"
                  value={subCustomerName}
                  onChange={(e) => setSubCustomerName(e.target.value)}
                  placeholder={isKu ? 'ناوی خاوەن فرۆشگا' : 'Store Owner Name'}
                  className={`w-full px-3.5 py-2.5 rounded-xl text-xs font-medium outline-none border transition ${
                    isDarkMode ? 'bg-[#141C2E] border-slate-700 text-white' : 'bg-[#F8FAFC] border-slate-200'
                  }`}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1.5">{isKu ? 'ژمارەی مۆبایل' : 'Phone Number'}</label>
                <input
                  type="text"
                  value={subPhone}
                  onChange={(e) => setSubPhone(e.target.value)}
                  placeholder="0750 000 0000"
                  className={`w-full px-3.5 py-2.5 rounded-xl text-xs font-mono outline-none border transition ${
                    isDarkMode ? 'bg-[#141C2E] border-slate-700 text-white' : 'bg-[#F8FAFC] border-slate-200'
                  }`}
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-400 mb-1.5">
                {isKu ? 'ئایدی ئامێر (Device ID)' : 'Device ID'} <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                required
                value={subDeviceId}
                onChange={(e) => setSubDeviceId(e.target.value)}
                placeholder="MX-DV-XXXX-XXXX"
                className={`w-full px-3.5 py-2.5 rounded-xl text-xs font-mono font-bold tracking-wide outline-none border transition uppercase ${
                  isDarkMode ? 'bg-[#141C2E] border-slate-700 text-sky-400' : 'bg-[#F8FAFC] border-slate-200 text-sky-600'
                }`}
              />
            </div>

            {/* Subscription Duration Plan */}
            <div>
              <label className="block text-xs font-bold text-slate-400 mb-2">
                {isKu ? 'ماوەی سەبسکرایپشن' : 'Subscription Duration'}
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                {(['1m', '3m', '6m', '12m', 'lifetime'] as const).map((p) => {
                  const info = SUB_PLANS[p];
                  const isSel = subPlan === p;
                  return (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setSubPlan(p)}
                      className={`p-2.5 rounded-xl border text-center transition cursor-pointer ${
                        isSel
                          ? 'bg-sky-500/20 border-sky-400 text-sky-400 font-bold'
                          : isDarkMode
                          ? 'bg-[#141C2E] border-slate-800 text-slate-300'
                          : 'bg-[#F8FAFC] border-slate-200 text-slate-700'
                      }`}
                    >
                      <div className="text-xs">{isKu ? info.labelKu : info.labelEn}</div>
                    </button>
                  );
                })}
              </div>
            </div>

            <button
              type="submit"
              disabled={subSubmitting}
              className="w-full py-3 rounded-2xl bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white font-bold text-xs shadow-md transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <ShoppingBag className="w-4 h-4" />
              <span>{subSubmitting ? (isKu ? 'دروست دەکرێت...' : 'Generating...') : isKu ? 'دروستکردنی کۆدی سەبسکرایپشن' : 'Generate Subscription Code'}</span>
            </button>
          </form>

          {/* Subscriptions List */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              {isKu ? 'سەبسکرایپشنە دروستکراوەکان' : 'Generated Subscriptions'} ({subscriptions.length})
            </h4>

            {subscriptions.length === 0 ? (
              <div className="py-12 text-center text-slate-400 text-xs">
                {isKu ? 'هیچ سەبسکرایپشنێکی فرۆشگا دروست نەکراوە.' : 'No store subscriptions created yet.'}
              </div>
            ) : (
              subscriptions.map((sub) => (
                <div
                  key={sub.id}
                  className={`p-3.5 sm:p-4 rounded-xl border transition space-y-2.5 ${
                    isDarkMode ? 'bg-[#0E1524] border-slate-800' : 'bg-[#F8FAFC] border-slate-200'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-xs font-bold text-inherit">{sub.customerName || sub.phone || sub.deviceId}</div>
                      <div className="text-[10px] text-slate-400 font-mono">{sub.deviceId}</div>
                    </div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-sky-500/15 text-sky-400 border border-sky-500/30 uppercase">
                      {sub.plan}
                    </span>
                  </div>

                  <div
                    className={`p-2 rounded-lg border flex items-center justify-between gap-2 ${
                      isDarkMode ? 'bg-[#0B1120] border-slate-800' : 'bg-white border-slate-200'
                    }`}
                  >
                    <div className="font-mono text-xs text-sky-400 truncate select-all">{sub.subscriptionCode}</div>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(sub.subscriptionCode, sub.id)}
                      className="p-1 px-2 rounded text-[11px] font-bold bg-slate-800 text-slate-200 transition cursor-pointer"
                    >
                      {copiedId === sub.id ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>

                  <div className="flex items-center justify-between text-[10px] text-slate-400">
                    <div>{isKu ? 'دروستکراوە:' : 'Created:'} {new Date(sub.createdAt).toLocaleDateString()}</div>
                    <button
                      type="button"
                      onClick={() => deleteSubscription(sub.id)}
                      className="text-red-400 hover:text-red-300 transition cursor-pointer"
                    >
                      {isKu ? 'سڕینەوە' : 'Delete'}
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* ─── TAB 4: CUSTOMERS DIRECTORY ───────────────────────────────────── */}
      {subTab === 'customers' && (
        <div className="space-y-3">
          <div className="text-xs text-slate-400">
            {isKu ? `کۆی موشتەرییەکان: ${customerGroups.length} کەس` : `Total Customers: ${customerGroups.length}`}
          </div>

          {customerGroups.length === 0 ? (
            <div className="py-16 text-center text-slate-400 text-xs">
              {isKu ? 'هیچ موشتەرییەک تۆمار نەکراوە.' : 'No customer records found.'}
            </div>
          ) : (
            customerGroups.map((cg) => {
              const isExpanded = expandedCustomer === cg.phone;
              return (
                <div
                  key={cg.phone || cg.customerName || cg.devices[0]}
                  className={`rounded-2xl border transition overflow-hidden ${
                    isDarkMode ? 'bg-[#0E1524] border-slate-800' : 'bg-[#F8FAFC] border-slate-200'
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => setExpandedCustomer(isExpanded ? null : cg.phone)}
                    className="w-full p-4 flex items-center justify-between text-start cursor-pointer"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#D4AF37]/20 to-[#D4AF37]/40 flex items-center justify-center text-[#D4AF37] font-bold text-xs">
                        {cg.customerName ? cg.customerName.charAt(0).toUpperCase() : 'C'}
                      </div>
                      <div>
                        <div className="text-xs sm:text-sm font-extrabold text-inherit">
                          {cg.customerName || (isKu ? 'موشتەری بێ ناو' : 'Unnamed Customer')}
                        </div>
                        <div className="text-[11px] text-slate-400 font-mono mt-0.5">{cg.phone || 'No phone'}</div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 text-xs text-slate-400">
                      <span className="font-semibold text-inherit">{cg.licenses.length} {isKu ? 'لایسێنس' : 'license(s)'}</span>
                      <span>·</span>
                      <span>{cg.devices.length} {isKu ? 'ئامێر' : 'device(s)'}</span>
                      {isExpanded ? <ChevronUp className="w-4 h-4 text-[#D4AF37]" /> : <ChevronDown className="w-4 h-4" />}
                    </div>
                  </button>

                  {/* Expanded Plan History & Details */}
                  {isExpanded && (
                    <div className="p-4 pt-0 border-t border-slate-200/50 dark:border-slate-800/50 space-y-3 mt-1">
                      <div>
                        <div className="text-[10px] font-bold uppercase text-slate-400 mb-1.5">
                          {isKu ? 'مێژووی پلانەکان:' : 'Plan History:'}
                        </div>
                        <div className="flex flex-wrap items-center gap-1.5">
                          {cg.planHistory.map((ph, idx) => (
                            <span
                              key={idx}
                              className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-[#D4AF37]/15 text-[#D4AF37] border border-[#D4AF37]/30 uppercase"
                            >
                              {ph.plan}
                            </span>
                          ))}
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <div className="text-[10px] font-bold uppercase text-slate-400">
                          {isKu ? 'ئامێرە بەستراوەکان:' : 'Bound Devices:'}
                        </div>
                        {cg.devices.map((dev) => (
                          <div key={dev} className="font-mono text-xs text-slate-300 flex items-center gap-2">
                            <Smartphone className="w-3.5 h-3.5 text-slate-500" />
                            <span>{dev}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
