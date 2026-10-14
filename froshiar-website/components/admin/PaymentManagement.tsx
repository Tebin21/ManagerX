'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Users,
  CreditCard,
  CheckCircle2,
  Clock,
  AlertTriangle,
  XCircle,
  Plus,
  Search,
  RefreshCw,
  Eye,
  EyeOff,
  Copy,
  Check,
  Key,
  Lock,
  Crown,
  Zap,
  Sparkles,
  ShieldCheck,
  Trash2,
  Store,
  Mail,
  Phone,
  Building2,
  Calendar,
  X,
  FileSpreadsheet,
} from 'lucide-react';
import { getClientFirestore } from '@/lib/firebase';
import {
  collection,
  getDocs,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
} from 'firebase/firestore';

// ─── Plan Definitions ────────────────────────────────────────────────────────
export interface SubscriptionPlan {
  id: string; // '1m' | '3m' | '6m' | '12m' | 'premium_1y' | 'lifetime' | 'custom'
  tier: 'pro' | 'premium' | 'lifetime' | 'custom';
  tierLabelKu: string;
  tierLabelEn: string;
  labelKu: string;
  labelEn: string;
  durationMonths: number | null; // null for lifetime
  priceIqd: string;
  priceUsd: string;
  badgeBg: string;
  badgeText: string;
}

export const SUBSCRIPTION_PLANS: SubscriptionPlan[] = [
  {
    id: '1m',
    tier: 'pro',
    tierLabelKu: 'پڕۆ (Pro)',
    tierLabelEn: 'Pro Tier',
    labelKu: '١ مانگ پڕۆ (٣٠ ڕۆژ)',
    labelEn: '1 Month Pro (30 Days)',
    durationMonths: 1,
    priceIqd: '١٥،٠٠٠ د.ع',
    priceUsd: '$10',
    badgeBg: 'bg-blue-500/15 border-blue-500/30',
    badgeText: 'text-blue-400',
  },
  {
    id: '3m',
    tier: 'pro',
    tierLabelKu: 'پڕۆ (Pro)',
    tierLabelEn: 'Pro Tier',
    labelKu: '٣ مانگ پڕۆ (٩٠ ڕۆژ)',
    labelEn: '3 Months Pro (90 Days)',
    durationMonths: 3,
    priceIqd: '٤٠،٠٠٠ د.ع',
    priceUsd: '$25',
    badgeBg: 'bg-blue-500/15 border-blue-500/30',
    badgeText: 'text-blue-400',
  },
  {
    id: '6m',
    tier: 'pro',
    tierLabelKu: 'پڕۆ (Pro)',
    tierLabelEn: 'Pro Tier',
    labelKu: '٦ مانگ پڕۆ (١٨٠ ڕۆژ)',
    labelEn: '6 Months Pro (180 Days)',
    durationMonths: 6,
    priceIqd: '٧٥،٠٠٠ د.ع',
    priceUsd: '$50',
    badgeBg: 'bg-indigo-500/15 border-indigo-500/30',
    badgeText: 'text-indigo-400',
  },
  {
    id: '12m',
    tier: 'pro',
    tierLabelKu: 'پڕۆ (Pro)',
    tierLabelEn: 'Pro Tier',
    labelKu: '١ ساڵ پڕۆ (٣٦٥ ڕۆژ)',
    labelEn: '1 Year Pro (365 Days)',
    durationMonths: 12,
    priceIqd: '١٣٠،٠٠٠ د.ع',
    priceUsd: '$90',
    badgeBg: 'bg-purple-500/15 border-purple-500/30',
    badgeText: 'text-purple-400',
  },
  {
    id: 'premium_1y',
    tier: 'premium',
    tierLabelKu: 'پریمیم VIP',
    tierLabelEn: 'Premium VIP',
    labelKu: '١ ساڵ پریمیم VIP',
    labelEn: '1 Year Premium VIP',
    durationMonths: 12,
    priceIqd: '١٨٠،٠٠٠ د.ع',
    priceUsd: '$120',
    badgeBg: 'bg-amber-500/15 border-amber-500/30',
    badgeText: 'text-amber-400',
  },
  {
    id: 'lifetime',
    tier: 'lifetime',
    tierLabelKu: 'هەمیشەیی VIP',
    tierLabelEn: 'Lifetime VIP',
    labelKu: 'هەمیشەیی بێ سنوور',
    labelEn: 'Lifetime Unlimited',
    durationMonths: null,
    priceIqd: '٢٥٠،٠٠٠ د.ع',
    priceUsd: '$170',
    badgeBg: 'bg-[#D4AF37]/20 border-[#D4AF37]/50',
    badgeText: 'text-[#D4AF37]',
  },
];

export interface PaymentRequestRecord {
  id: string;
  customerName: string;
  email: string;
  phone: string;
  businessName: string;
  businessType?: string;
  planId: string;
  planLabel: string;
  amount: string;
  paymentMethod: string;
  receiptImage?: string;
  status: 'pending' | 'approved' | 'rejected';
  rejectionReason?: string | null;
  createdAt: string;
  approvedAt?: string | null;
  notes?: string;
}

export interface UserSubscriptionRecord {
  id: string;
  email: string; // Primary key (lowercase)
  customerName: string;
  phone: string;
  businessName: string;
  businessType: string;
  address?: string;
  planId: string;
  tier?: string;
  planLabel: string;
  account_password?: string | null;
  startDate: string;
  expiresAt: string | null; // null for lifetime
  status: 'active' | 'expired' | 'cancelled';
  notes?: string;
  updatedAt: string;
}

export interface AppUserRecord {
  id: string;
  user_id: string;
  email: string | null;
  phone: string | null;
  display_name: string | null;
  business_name: string | null;
  business_type?: string | null;
  address?: string | null;
  account_password?: string | null;
  password_updated_at?: string | null;
  tier?: string | null;
  device_id: string | null;
  platform: string;
  app_version: string;
  created_at: string;
  last_login_at: string;
  login_count: number;
}

export default function PaymentManagement({
  isDarkMode,
  language,
}: {
  isDarkMode: boolean;
  language: 'ku' | 'en';
}) {
  const isKu = language === 'ku';

  // Active Tab: 'users' (default) | 'subscriptions' | 'requests'
  const [activeTab, setActiveTab] = useState<'users' | 'subscriptions' | 'requests'>('users');

  // Data states
  const [appUsers, setAppUsers] = useState<AppUserRecord[]>([]);
  const [requests, setRequests] = useState<PaymentRequestRecord[]>([]);
  const [subscriptions, setSubscriptions] = useState<UserSubscriptionRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [planFilter, setPlanFilter] = useState<'all' | 'pro' | 'premium' | 'lifetime' | 'free' | 'expired'>('all');

  // Password Reveal & Copy state
  const [revealedPasswords, setRevealedPasswords] = useState<Record<string, boolean>>({});
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Modals
  const [showCreateAccountModal, setShowCreateAccountModal] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState<AppUserRecord | UserSubscriptionRecord | null>(null);
  const [previewReceipt, setPreviewReceipt] = useState<string | null>(null);

  // Create Account Form State
  const [createEmail, setCreateEmail] = useState('');
  const [createName, setCreateName] = useState('');
  const [createPhone, setCreatePhone] = useState('');
  const [createBusiness, setCreateBusiness] = useState('');
  const [createBusinessType, setCreateBusinessType] = useState('Mobile Shop');
  const [createPlan, setCreatePlan] = useState<string>('12m');
  const [createCustomDays, setCreateCustomDays] = useState<string>('30');
  const [createPassword, setCreatePassword] = useState('');
  const [createNotes, setCreateNotes] = useState('');
  const [createSubmitting, setCreateSubmitting] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  // Upgrade / Extend Modal Form State
  const [upgradePlan, setUpgradePlan] = useState<string>('12m');
  const [upgradeCustomDays, setUpgradeCustomDays] = useState<string>('30');
  const [upgradePassword, setUpgradePassword] = useState('');
  const [upgradeNotes, setUpgradeNotes] = useState('');
  const [upgradeSubmitting, setUpgradeSubmitting] = useState(false);

  // ─── Direct Firestore REST API Resilient Engine ────────────────────────────
  const FIREBASE_API_KEY = 'AIzaSyAPt_45ZxiC6VZALYX65NN_igouWJ-Qpjo';
  const FIREBASE_PROJECT_ID = 'managerx-bac3a';

  const parseRestDoc = (doc: any): any => {
    if (!doc || !doc.name) return null;
    const id = doc.name.split('/').pop();
    const obj: any = { id };
    for (const [k, v] of Object.entries(doc.fields || {})) {
      const val: any = v;
      if (val.stringValue !== undefined) obj[k] = val.stringValue;
      else if (val.integerValue !== undefined) obj[k] = parseInt(val.integerValue, 10);
      else if (val.booleanValue !== undefined) obj[k] = val.booleanValue;
      else if (val.timestampValue !== undefined) obj[k] = val.timestampValue;
      else if (val.nullValue !== undefined) obj[k] = null;
    }
    return obj;
  };

  const fetchCollectionRest = async (collName: string): Promise<any[]> => {
    try {
      const url = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents/${collName}?key=${FIREBASE_API_KEY}`;
      const res = await fetch(url);
      if (!res.ok) return [];
      const data = await res.json();
      if (!data.documents || !Array.isArray(data.documents)) return [];
      return data.documents.map(parseRestDoc).filter(Boolean);
    } catch (err) {
      console.warn(`REST fetch error for ${collName}:`, err);
      return [];
    }
  };

  const setDocRest = async (collName: string, docId: string, fields: Record<string, any>): Promise<boolean> => {
    try {
      const url = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents/${collName}/${encodeURIComponent(docId)}?key=${FIREBASE_API_KEY}`;
      const restFields: Record<string, any> = {};
      for (const [k, v] of Object.entries(fields)) {
        if (v === null || v === undefined) restFields[k] = { nullValue: null };
        else if (typeof v === 'boolean') restFields[k] = { booleanValue: v };
        else if (typeof v === 'number') restFields[k] = { integerValue: String(v) };
        else restFields[k] = { stringValue: String(v) };
      }
      const res = await fetch(url, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fields: restFields }),
      });
      return res.ok;
    } catch (err) {
      console.error(`setDocRest error for ${collName}/${docId}:`, err);
      return false;
    }
  };

  const updateDocRest = async (collName: string, docId: string, fields: Record<string, any>): Promise<boolean> => {
    try {
      const updateMask = Object.keys(fields).map((k) => `updateMask.fieldPaths=${encodeURIComponent(k)}`).join('&');
      const url = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents/${collName}/${encodeURIComponent(docId)}?${updateMask}&key=${FIREBASE_API_KEY}`;
      const restFields: Record<string, any> = {};
      for (const [k, v] of Object.entries(fields)) {
        if (v === null || v === undefined) restFields[k] = { nullValue: null };
        else if (typeof v === 'boolean') restFields[k] = { booleanValue: v };
        else if (typeof v === 'number') restFields[k] = { integerValue: String(v) };
        else restFields[k] = { stringValue: String(v) };
      }
      const res = await fetch(url, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fields: restFields }),
      });
      return res.ok;
    } catch (err) {
      console.error(`updateDocRest error for ${collName}/${docId}:`, err);
      return false;
    }
  };

  const deleteDocRest = async (collName: string, docId: string): Promise<boolean> => {
    try {
      const url = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents/${collName}/${encodeURIComponent(docId)}?key=${FIREBASE_API_KEY}`;
      const res = await fetch(url, { method: 'DELETE' });
      return res.ok;
    } catch (err) {
      console.error(`deleteDocRest error for ${collName}/${docId}:`, err);
      return false;
    }
  };

  // ─── Fetch All Data (Dual SDK + REST Engine) ────────────────────────────────
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      let uList: AppUserRecord[] = [];
      let rList: PaymentRequestRecord[] = [];
      let sList: UserSubscriptionRecord[] = [];

      // 1. Try Firebase Web SDK
      const db = getClientFirestore();
      if (db) {
        try {
          const [usersSnap, reqSnap, subSnap] = await Promise.all([
            getDocs(collection(db, 'app_telemetry_users')).catch(() => null),
            getDocs(collection(db, 'payment_requests')).catch(() => null),
            getDocs(collection(db, 'user_subscriptions')).catch(() => null),
          ]);

          if (usersSnap && !usersSnap.empty) {
            usersSnap.forEach((d) => uList.push({ id: d.id, ...(d.data() as any) }));
          }
          if (reqSnap && !reqSnap.empty) {
            reqSnap.forEach((d) => rList.push({ id: d.id, ...(d.data() as any) }));
          }
          if (subSnap && !subSnap.empty) {
            subSnap.forEach((d) => sList.push({ id: d.id, ...(d.data() as any) }));
          }
        } catch (sdkErr) {
          console.warn('SDK getDocs notice, engaging REST fallback:', sdkErr);
        }
      }

      // 2. Resilient Direct REST API Fallback
      if (uList.length === 0) {
        const restUsers = await fetchCollectionRest('app_telemetry_users');
        if (restUsers.length > 0) uList = restUsers;
      }
      if (rList.length === 0) {
        const restReqs = await fetchCollectionRest('payment_requests');
        if (restReqs.length > 0) rList = restReqs;
      }
      if (sList.length === 0) {
        const restSubs = await fetchCollectionRest('user_subscriptions');
        if (restSubs.length > 0) sList = restSubs;
      }

      // Process expired subscriptions
      const now = Date.now();
      const processedSubs = sList.map((item) => {
        let status = item.status || 'active';
        if (item.expiresAt && item.planId !== 'lifetime') {
          const expTime = new Date(item.expiresAt).getTime();
          if (expTime < now) status = 'expired';
        }
        return { ...item, status };
      });

      // Merge: Any email in user_subscriptions that isn't yet in app_telemetry_users
      // should also appear in appUsers so Tebin sees all accounts he created!
      const existingEmails = new Set(uList.map((u) => u.email?.toLowerCase().trim()).filter(Boolean));
      processedSubs.forEach((sub) => {
        const cleanSubEmail = sub.email?.toLowerCase().trim();
        if (cleanSubEmail && !existingEmails.has(cleanSubEmail)) {
          existingEmails.add(cleanSubEmail);
          uList.push({
            id: sub.id,
            user_id: sub.id,
            email: sub.email,
            phone: sub.phone,
            display_name: sub.customerName,
            business_name: sub.businessName,
            business_type: sub.businessType,
            account_password: sub.account_password ?? null,
            tier: sub.tier ?? 'pro',
            device_id: null,
            platform: 'Cloud',
            app_version: '1.0.0',
            created_at: sub.startDate,
            last_login_at: sub.startDate,
            login_count: 0,
          });
        }
      });

      // Sort
      uList.sort((a, b) => new Date(b.last_login_at || b.created_at || 0).getTime() - new Date(a.last_login_at || a.created_at || 0).getTime());
      rList.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());

      setAppUsers(uList);
      setRequests(rList);
      setSubscriptions(processedSubs);
    } catch (err) {
      console.error('Failed to load payment & user data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();

    // Auto-polling interval every 8 seconds for real-time live synchronization
    const interval = setInterval(() => {
      fetchData();
    }, 8000);

    return () => {
      clearInterval(interval);
    };
  }, [fetchData]);

  // ─── Helpers ───────────────────────────────────────────────────────────────
  const getSubscriptionForEmail = useCallback(
    (email?: string | null): UserSubscriptionRecord | undefined => {
      if (!email) return undefined;
      const clean = email.trim().toLowerCase();
      return subscriptions.find((s) => s.email?.trim().toLowerCase() === clean);
    },
    [subscriptions]
  );

  const calculateDaysRemaining = (expiresAt?: string | null, planId?: string): number | 'lifetime' | 'expired' => {
    if (planId === 'lifetime' || !expiresAt) return 'lifetime';
    const expTime = new Date(expiresAt).getTime();
    const now = Date.now();
    const diff = expTime - now;
    if (diff <= 0) return 'expired';
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  };

  const togglePassword = (key: string) => {
    setRevealedPasswords((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const copyToClipboard = (text: string, key: string) => {
    if (!text) return;
    try {
      navigator.clipboard.writeText(text);
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 2000);
    } catch {}
  };

  // ─── Core: Save / Upgrade Subscription for User Email ───────────────────────
  const saveSubscriptionForEmail = async ({
    email,
    customerName,
    phone,
    businessName,
    businessType,
    planId,
    notes = '',
    customDays = 30,
    password = '',
  }: {
    email: string;
    customerName: string;
    phone: string;
    businessName: string;
    businessType: string;
    planId: string;
    notes?: string;
    customDays?: number;
    password?: string;
  }) => {
    const cleanEmail = email.trim().toLowerCase();
    const subDocId = cleanEmail.replace(/[^a-z0-9_]/gi, '_');
    const now = new Date();

    const matchedPlan = SUBSCRIPTION_PLANS.find((p) => p.id === planId);
    let planLabel = matchedPlan ? (isKu ? matchedPlan.labelKu : matchedPlan.labelEn) : 'پڕۆ (تایبەت)';
    let tier = matchedPlan ? matchedPlan.tier : 'pro';
    let expiresAtIso: string | null = null;

    if (planId === 'custom') {
      const expDate = new Date();
      expDate.setDate(expDate.getDate() + (customDays || 30));
      expiresAtIso = expDate.toISOString();
      planLabel = isKu ? `${customDays} ڕۆژ (تایبەت)` : `${customDays} Days (Custom)`;
      tier = 'pro';
    } else if (matchedPlan && matchedPlan.durationMonths !== null) {
      const existing = getSubscriptionForEmail(cleanEmail);
      if (existing && existing.expiresAt && new Date(existing.expiresAt).getTime() > Date.now()) {
        const baseDate = new Date(existing.expiresAt);
        baseDate.setMonth(baseDate.getMonth() + matchedPlan.durationMonths);
        expiresAtIso = baseDate.toISOString();
      } else {
        const expDate = new Date();
        expDate.setMonth(expDate.getMonth() + matchedPlan.durationMonths);
        expiresAtIso = expDate.toISOString();
      }
    }

    const subRecord: UserSubscriptionRecord = {
      id: subDocId,
      email: cleanEmail,
      customerName: customerName.trim() || 'بەکارهێنەری فرۆشیار',
      phone: phone.trim(),
      businessName: businessName.trim() || 'فرۆشگا',
      businessType: businessType || 'Mobile Shop',
      planId,
      tier,
      planLabel,
      account_password: password.trim() ? password.trim() : undefined,
      startDate: now.toISOString(),
      expiresAt: expiresAtIso,
      status: 'active',
      notes: notes.trim(),
      updatedAt: now.toISOString(),
    };

    // 1. Save to user_subscriptions (SDK + REST fallback)
    let subSaved = false;
    try {
      const db = getClientFirestore();
      if (db) {
        await setDoc(doc(db, 'user_subscriptions', subDocId), subRecord, { merge: true });
        subSaved = true;
      }
    } catch {}
    if (!subSaved) {
      await setDocRest('user_subscriptions', subDocId, subRecord);
    }

    // 2. Synchronize to app_telemetry_users so the user profile & password exist in All Users
    const userTelemetryData: Record<string, any> = {
      user_id: subDocId,
      email: cleanEmail,
      display_name: customerName.trim() || 'بەکارهێنەر',
      business_name: businessName.trim() || 'فرۆشگا',
      phone: phone.trim(),
      tier,
      updated_at: now.toISOString(),
    };
    if (password.trim()) {
      userTelemetryData.account_password = password.trim();
      userTelemetryData.password_updated_at = now.toISOString();
    }

    try {
      const db = getClientFirestore();
      if (db) {
        await setDoc(doc(db, 'app_telemetry_users', subDocId), userTelemetryData, { merge: true });
      }
    } catch {}
    await setDocRest('app_telemetry_users', subDocId, userTelemetryData);

    await fetchData();
  };

  // ─── Handle Create Account Form Submit ──────────────────────────────────────
  const handleCreateAccountSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError(null);

    const email = createEmail.trim().toLowerCase();
    if (!email || !email.includes('@')) {
      setCreateError(isKu ? 'تکایە ئیمەیڵێکی دروست بنووسە' : 'Please enter a valid email address');
      return;
    }

    setCreateSubmitting(true);
    try {
      await saveSubscriptionForEmail({
        email,
        customerName: createName,
        phone: createPhone,
        businessName: createBusiness,
        businessType: createBusinessType,
        planId: createPlan,
        notes: createNotes,
        customDays: parseInt(createCustomDays, 10) || 30,
        password: createPassword,
      });

      alert(
        isKu
          ? `هەژماری (${email}) بە سەرکەوتوویی لەگەڵ پاکێج و وشەی نهێنی تۆمار کرا و چالاک کرا!`
          : `Account (${email}) successfully created and subscription activated!`
      );

      // Reset
      setCreateEmail('');
      setCreateName('');
      setCreatePhone('');
      setCreateBusiness('');
      setCreatePassword('');
      setCreateNotes('');
      setShowCreateAccountModal(false);
    } catch (err: any) {
      setCreateError(err?.message || 'Error creating account');
    } finally {
      setCreateSubmitting(false);
    }
  };

  // ─── Handle Upgrade / Extend Submit ─────────────────────────────────────────
  const handleUpgradeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!showUpgradeModal || !showUpgradeModal.email) return;

    setUpgradeSubmitting(true);
    try {
      const email = showUpgradeModal.email;
      const name =
        ('display_name' in showUpgradeModal
          ? (showUpgradeModal as any).display_name
          : (showUpgradeModal as any).customerName) || 'بەکارهێنەر';
      const phone = showUpgradeModal.phone || '';
      const business =
        ('business_name' in showUpgradeModal
          ? (showUpgradeModal as any).business_name
          : (showUpgradeModal as any).businessName) || 'فرۆشگا';
      const bType =
        ('business_type' in showUpgradeModal
          ? (showUpgradeModal as any).business_type
          : (showUpgradeModal as any).businessType) || 'Mobile Shop';

      await saveSubscriptionForEmail({
        email,
        customerName: name,
        phone,
        businessName: business,
        businessType: bType,
        planId: upgradePlan,
        notes: upgradeNotes,
        customDays: parseInt(upgradeCustomDays, 10) || 30,
        password: upgradePassword,
      });

      alert(
        isKu
          ? `هەژماری (${email}) بە سەرکەوتوویی بەرزکرایەوە!`
          : `Account (${email}) upgraded successfully!`
      );

      setShowUpgradeModal(null);
      setUpgradeNotes('');
      setUpgradePassword('');
    } catch (err: any) {
      alert(err?.message || 'Error updating subscription');
    } finally {
      setUpgradeSubmitting(false);
    }
  };

  // ─── Delete Subscription ───────────────────────────────────────────────────
  const handleDeleteSubscription = async (sub: UserSubscriptionRecord) => {
    const confirmMsg = isKu
      ? `ئایا دڵنیایت لە هەڵوەشاندنەوە یان سڕینەوەی بەشداریکردنی (${sub.email})؟ بەم کارە هەژمارەکەی دەگەڕێتەوە باری ئاسایی.`
      : `Revoke or delete subscription for (${sub.email})?`;

    if (!window.confirm(confirmMsg)) return;

    try {
      let deleted = false;
      const db = getClientFirestore();
      if (db) {
        await deleteDoc(doc(db, 'user_subscriptions', sub.id));
        deleted = true;
      }
      if (!deleted) {
        await deleteDocRest('user_subscriptions', sub.id);
      }
      fetchData();
    } catch (err: any) {
      alert(err?.message || 'Failed to delete subscription');
    }
  };

  // ─── Approve Payment Request ───────────────────────────────────────────────
  const handleApproveRequest = async (req: PaymentRequestRecord) => {
    const confirmMsg = isKu
      ? `ئایا دڵنیایت لە پەسەندکردنی ئەم داواکارییە و چالاککردنی پاکێجی ${req.planLabel} بۆ ${req.email}؟`
      : `Approve payment request and activate ${req.planLabel} for ${req.email}?`;

    if (!window.confirm(confirmMsg)) return;

    try {
      const approvedAt = new Date().toISOString();
      let updated = false;

      const db = getClientFirestore();
      if (db) {
        await updateDoc(doc(db, 'payment_requests', req.id), { status: 'approved', approvedAt });
        updated = true;
      }
      if (!updated) {
        await updateDocRest('payment_requests', req.id, { status: 'approved', approvedAt });
      }

      await saveSubscriptionForEmail({
        email: req.email,
        customerName: req.customerName,
        phone: req.phone,
        businessName: req.businessName,
        businessType: req.businessType || 'Store',
        planId: req.planId,
        notes: `Approved from Payment Request ID: ${req.id}`,
      });

      alert(isKu ? 'داواکارییەکە پەسەندکرا و بەشداریکردن چالاککرا!' : 'Request approved and subscription activated!');
      fetchData();
    } catch (err: any) {
      alert(err?.message || 'Error approving request');
    }
  };

  // ─── Reject Payment Request ────────────────────────────────────────────────
  const handleRejectRequest = async (req: PaymentRequestRecord) => {
    const reason = window.prompt(
      isKu ? 'هۆکاری ڕەتکردنەوە بنووسە:' : 'Rejection reason:',
      isKu ? 'پارەکە نەگەیشتووە یان وێنەی وەسڵ دروست نییە' : 'Payment not received or invalid receipt'
    );
    if (reason === null) return;

    try {
      const rejectedAt = new Date().toISOString();
      let updated = false;
      const db = getClientFirestore();
      if (db) {
        await updateDoc(doc(db, 'payment_requests', req.id), {
          status: 'rejected',
          rejectionReason: reason.trim(),
          rejectedAt,
        });
        updated = true;
      }
      if (!updated) {
        await updateDocRest('payment_requests', req.id, {
          status: 'rejected',
          rejectionReason: reason.trim(),
          rejectedAt,
        });
      }
      fetchData();
    } catch (err: any) {
      alert(err?.message || 'Error rejecting request');
    }
  };

  // ─── Delete Request ────────────────────────────────────────────────────────
  const handleDeleteRequest = async (id: string) => {
    if (!window.confirm(isKu ? 'ئایا دڵنیایت لە سڕینەوەی ئەم داواکارییە؟' : 'Delete this payment request?')) return;
    try {
      let deleted = false;
      const db = getClientFirestore();
      if (db) {
        await deleteDoc(doc(db, 'payment_requests', id));
        deleted = true;
      }
      if (!deleted) {
        await deleteDocRest('payment_requests', id);
      }
      fetchData();
    } catch (err: any) {
      alert(err?.message || 'Failed to delete');
    }
  };

  // ─── Stats Counts ──────────────────────────────────────────────────────────
  const statsCounts = useMemo(() => {
    const totalUsers = appUsers.length;
    const activeSubs = subscriptions.filter((s) => s.status === 'active').length;
    const proSubs = subscriptions.filter((s) => s.status === 'active' && s.tier === 'pro').length;
    const premiumOrLifetime = subscriptions.filter(
      (s) => s.status === 'active' && (s.tier === 'premium' || s.tier === 'lifetime' || s.planId === 'lifetime')
    ).length;
    const pendingReqs = requests.filter((r) => r.status === 'pending').length;

    return { totalUsers, activeSubs, proSubs, premiumOrLifetime, pendingReqs };
  }, [appUsers, subscriptions, requests]);

  // ─── Filtered Users ────────────────────────────────────────────────────────
  const filteredUsers = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return appUsers.filter((u) => {
      // Search Query
      const matchSearch =
        !q ||
        u.email?.toLowerCase().includes(q) ||
        u.display_name?.toLowerCase().includes(q) ||
        u.business_name?.toLowerCase().includes(q) ||
        u.phone?.toLowerCase().includes(q) ||
        u.account_password?.toLowerCase().includes(q);

      if (!matchSearch) return false;

      // Plan Filter
      const sub = getSubscriptionForEmail(u.email);
      const remaining = sub ? calculateDaysRemaining(sub.expiresAt, sub.planId) : null;
      const isPaidActive = sub && sub.status === 'active' && remaining !== 'expired';

      if (planFilter === 'all') return true;
      if (planFilter === 'pro') return isPaidActive && (sub.tier === 'pro' || sub.planId.includes('m'));
      if (planFilter === 'premium') return isPaidActive && sub.tier === 'premium';
      if (planFilter === 'lifetime') return isPaidActive && (sub.tier === 'lifetime' || sub.planId === 'lifetime');
      if (planFilter === 'expired') return sub && (sub.status === 'expired' || remaining === 'expired');
      if (planFilter === 'free') return !sub || sub.status !== 'active';

      return true;
    });
  }, [appUsers, searchQuery, planFilter, getSubscriptionForEmail]);

  return (
    <div className="space-y-4 sm:space-y-6 animate-in fade-in duration-300">
      {/* ── KPI Summary Cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Card 1: Total Froshiar Users */}
        <div
          onClick={() => setActiveTab('users')}
          className={`p-4 sm:p-5 rounded-2xl border transition shadow-sm cursor-pointer hover:border-[#D4AF37]/60 active:scale-98 ${
            activeTab === 'users' ? 'border-[#D4AF37] ring-1 ring-[#D4AF37]/30' : ''
          } ${isDarkMode ? 'bg-[#141C2E] border-slate-800' : 'bg-white border-slate-200'}`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-slate-400 font-bold">{isKu ? 'کۆی بەکارهێنەران' : 'Total Users'}</span>
            <div className="w-9 h-9 rounded-xl bg-blue-500/15 flex items-center justify-center text-blue-500">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-black text-inherit">{statsCounts.totalUsers}</div>
          <p className="text-[11px] text-slate-400 mt-0.5">{isKu ? 'تۆمارکراو لە ناو فرۆشیار' : 'Registered accounts'}</p>
        </div>

        {/* Card 2: Active Subscriptions */}
        <div
          onClick={() => setActiveTab('subscriptions')}
          className={`p-4 sm:p-5 rounded-2xl border transition shadow-sm cursor-pointer hover:border-emerald-500/60 active:scale-98 ${
            activeTab === 'subscriptions' ? 'border-emerald-500 ring-1 ring-emerald-500/30' : ''
          } ${isDarkMode ? 'bg-[#141C2E] border-slate-800' : 'bg-white border-slate-200'}`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-slate-400 font-bold">{isKu ? 'بەشداریکردنی چالاک' : 'Active Subscriptions'}</span>
            <div className="w-9 h-9 rounded-xl bg-emerald-500/15 flex items-center justify-center text-emerald-500">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-black text-emerald-500">{statsCounts.activeSubs}</div>
          <p className="text-[11px] text-slate-400 mt-0.5">{isKu ? 'خزمەتگوزاری بێ سنوور' : 'Unlimited Pro accounts'}</p>
        </div>

        {/* Card 3: Premium & Lifetime VIP */}
        <div
          onClick={() => {
            setActiveTab('users');
            setPlanFilter('lifetime');
          }}
          className={`p-4 sm:p-5 rounded-2xl border transition shadow-sm cursor-pointer hover:border-[#D4AF37]/60 active:scale-98 ${
            isDarkMode ? 'bg-[#141C2E] border-slate-800' : 'bg-white border-slate-200'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-slate-400 font-bold">{isKu ? 'پریمیم و هەمیشەیی' : 'Premium & Lifetime'}</span>
            <div className="w-9 h-9 rounded-xl bg-[#D4AF37]/15 flex items-center justify-center text-[#D4AF37]">
              <Crown className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-black text-[#D4AF37]">{statsCounts.premiumOrLifetime}</div>
          <p className="text-[11px] text-slate-400 mt-0.5">{isKu ? 'ئەکاونتی تایبەت و VIP' : 'VIP & Lifetime Tier'}</p>
        </div>

        {/* Card 4: Pending Requests (or Pro Count) */}
        <div
          onClick={() => setActiveTab('requests')}
          className={`p-4 sm:p-5 rounded-2xl border transition shadow-sm cursor-pointer hover:border-amber-500/60 active:scale-98 ${
            activeTab === 'requests' ? 'border-amber-500 ring-1 ring-amber-500/30' : ''
          } ${
            statsCounts.pendingReqs > 0
              ? isDarkMode
                ? 'bg-amber-500/10 border-amber-500/30'
                : 'bg-amber-50/70 border-amber-300'
              : isDarkMode
              ? 'bg-[#141C2E] border-slate-800'
              : 'bg-white border-slate-200'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-slate-400 font-bold">{isKu ? 'داواکارییەکانی پەیمێنت' : 'Payment Requests'}</span>
            <div
              className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                statsCounts.pendingReqs > 0
                  ? 'bg-amber-500 text-slate-950 animate-pulse'
                  : 'bg-amber-500/15 text-amber-500'
              }`}
            >
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-black text-amber-500">{statsCounts.pendingReqs}</div>
          <p className="text-[11px] text-slate-400 mt-0.5">{isKu ? 'چاوەڕوانی پەسەندکردنن' : 'Awaiting admin approval'}</p>
        </div>
      </div>

      {/* ── Primary Tabs Navigation Bar & Action Buttons ── */}
      <div
        className={`p-3 sm:p-4 rounded-2xl sm:rounded-3xl border transition shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3 ${
          isDarkMode ? 'bg-[#141C2E] border-slate-800' : 'bg-white border-slate-200'
        }`}
      >
        {/* Navigation Tabs */}
        <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto no-scrollbar py-1">
          {/* Tab 1: All Users */}
          <button
            onClick={() => setActiveTab('users')}
            className={`px-3.5 py-2 sm:px-4 sm:py-2.5 rounded-xl sm:rounded-2xl text-xs sm:text-sm font-bold transition flex items-center gap-2 cursor-pointer shrink-0 ${
              activeTab === 'users'
                ? 'bg-[#D4AF37] text-slate-950 shadow-md shadow-[#D4AF37]/20 font-extrabold'
                : isDarkMode
                ? 'bg-[#0E1524] text-slate-300 hover:bg-slate-800'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>{isKu ? 'هەموو بەکارهێنەران' : 'All Users'}</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-950/15 text-inherit">
              {appUsers.length}
            </span>
          </button>

          {/* Tab 2: Active Subscriptions */}
          <button
            onClick={() => setActiveTab('subscriptions')}
            className={`px-3.5 py-2 sm:px-4 sm:py-2.5 rounded-xl sm:rounded-2xl text-xs sm:text-sm font-bold transition flex items-center gap-2 cursor-pointer shrink-0 ${
              activeTab === 'subscriptions'
                ? 'bg-[#D4AF37] text-slate-950 shadow-md shadow-[#D4AF37]/20 font-extrabold'
                : isDarkMode
                ? 'bg-[#0E1524] text-slate-300 hover:bg-slate-800'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <Clock className="w-4 h-4" />
            <span>{isKu ? 'بەشداریکردنە چالاکەکان' : 'Active Subscriptions'}</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-950/15 text-inherit">
              {subscriptions.length}
            </span>
          </button>

          {/* Tab 3: Payment Requests */}
          <button
            onClick={() => setActiveTab('requests')}
            className={`px-3.5 py-2 sm:px-4 sm:py-2.5 rounded-xl sm:rounded-2xl text-xs sm:text-sm font-bold transition flex items-center gap-2 cursor-pointer shrink-0 ${
              activeTab === 'requests'
                ? 'bg-[#D4AF37] text-slate-950 shadow-md shadow-[#D4AF37]/20 font-extrabold'
                : isDarkMode
                ? 'bg-[#0E1524] text-slate-300 hover:bg-slate-800'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <CreditCard className="w-4 h-4" />
            <span>{isKu ? 'داواکارییەکانی پەیمێنت' : 'Payment Requests'}</span>
            {statsCounts.pendingReqs > 0 ? (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-500 text-white font-bold animate-pulse">
                {statsCounts.pendingReqs}
              </span>
            ) : (
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-950/15 text-inherit">
                {requests.length}
              </span>
            )}
          </button>
        </div>

        {/* Right actions: Refresh & Create Account Button */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={fetchData}
            disabled={loading}
            className={`p-2.5 rounded-xl border text-xs font-bold transition cursor-pointer ${
              isDarkMode
                ? 'bg-[#0E1524] border-slate-700 text-slate-200 hover:bg-slate-800'
                : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
            }`}
            title={isKu ? 'نوێکردنەوە' : 'Refresh'}
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-[#D4AF37]' : ''}`} />
          </button>

          {/* Main Action: Directly Create & Assign Account to Person */}
          <button
            onClick={() => setShowCreateAccountModal(true)}
            className="px-4 py-2.5 rounded-xl sm:rounded-2xl bg-gradient-to-tr from-[#D4AF37] to-[#B8860B] text-slate-950 font-extrabold text-xs sm:text-sm flex items-center gap-2 shadow-lg shadow-[#D4AF37]/20 cursor-pointer active:scale-98 transition"
          >
            <Plus className="w-4 h-4" />
            <span>{isKu ? 'دروستکردنی ئەکاونت و بەشداریکردن' : '+ Create & Assign Account'}</span>
          </button>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {/* ── TAB 1: ALL USERS & PASSWORD METRICS ──                              */}
      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'users' && (
        <div className="space-y-4">
          {/* Search Bar & Filter Chips */}
          <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute top-3.5 left-3.5 sm:left-4 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={
                  isKu
                    ? 'گەڕان بەپێی ئیمەیڵ، ناوی کڕیار، ناوی بازرگانی، وشەی نهێنی، یان تەلەفۆن...'
                    : 'Search by email, customer name, business, password, phone...'
                }
                className={`w-full pl-10 pr-4 py-2.5 sm:py-3 rounded-2xl text-xs sm:text-sm outline-none border transition ${
                  isDarkMode
                    ? 'bg-[#141C2E] border-slate-800 text-white placeholder-slate-500 focus:border-[#D4AF37]'
                    : 'bg-white border-slate-200 text-slate-900 placeholder-slate-400 focus:border-[#D4AF37]'
                }`}
              />
            </div>

            {/* Filter Chips */}
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1">
              {[
                { id: 'all', label: isKu ? 'هەموو' : 'All' },
                { id: 'pro', label: isKu ? 'پڕۆ' : 'Pro' },
                { id: 'premium', label: isKu ? 'پریمیم' : 'Premium' },
                { id: 'lifetime', label: isKu ? 'هەمیشەیی' : 'Lifetime' },
                { id: 'free', label: isKu ? 'بێ بەشداریکردن' : 'Free' },
                { id: 'expired', label: isKu ? 'بەسەرچوو' : 'Expired' },
              ].map((chip) => (
                <button
                  key={chip.id}
                  onClick={() => setPlanFilter(chip.id as any)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer shrink-0 ${
                    planFilter === chip.id
                      ? 'bg-[#D4AF37] text-slate-950 shadow-sm'
                      : isDarkMode
                      ? 'bg-[#0E1524] text-slate-400 hover:text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {chip.label}
                </button>
              ))}
            </div>
          </div>

          {/* Users List Cards */}
          {filteredUsers.length === 0 ? (
            <div
              className={`p-12 text-center rounded-2xl border text-xs text-slate-400 ${
                isDarkMode ? 'bg-[#141C2E] border-slate-800' : 'bg-white border-slate-200'
              }`}
            >
              {isKu ? 'هیچ بەکارهێنەرێک نەدۆزرایەوە.' : 'No users found matching your search.'}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5 sm:gap-4">
              {filteredUsers.map((user) => {
                const sub = getSubscriptionForEmail(user.email);
                const remaining = sub ? calculateDaysRemaining(sub.expiresAt, sub.planId) : null;
                const isPaidActive = sub && sub.status === 'active' && remaining !== 'expired';
                const isLifetime = sub && (sub.planId === 'lifetime' || sub.tier === 'lifetime');
                const isPremium = sub && sub.tier === 'premium';
                const isExpired = sub && (sub.status === 'expired' || remaining === 'expired');

                return (
                  <div
                    key={user.id}
                    className={`p-4 sm:p-5 rounded-2xl sm:rounded-3xl border transition shadow-sm space-y-3.5 flex flex-col justify-between ${
                      isDarkMode
                        ? 'bg-[#141C2E] border-slate-800 hover:border-slate-700'
                        : 'bg-white border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    {/* Top: Business & Avatar & Badge */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        {/* Avatar */}
                        <div
                          className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black text-lg border shrink-0 ${
                            isLifetime
                              ? 'bg-[#D4AF37]/20 text-[#D4AF37] border-[#D4AF37]/40 shadow-sm shadow-[#D4AF37]/20'
                              : isPremium
                              ? 'bg-amber-500/20 text-amber-400 border-amber-500/40'
                              : isPaidActive
                              ? 'bg-blue-500/20 text-blue-400 border-blue-500/40'
                              : 'bg-slate-500/10 text-slate-400 border-slate-500/20'
                          }`}
                        >
                          {user.business_name
                            ? user.business_name.charAt(0).toUpperCase()
                            : user.display_name
                            ? user.display_name.charAt(0).toUpperCase()
                            : 'F'}
                        </div>
                        <div className="min-w-0">
                          <h4 className="text-sm sm:text-base font-extrabold text-inherit truncate">
                            {user.business_name || (isKu ? 'ناوی بازرگانی دانەنراوە' : 'No Business Name')}
                          </h4>
                          <div className="text-xs text-slate-400 flex items-center gap-1 mt-0.5 truncate">
                            <Store className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span className="truncate">{user.business_type || 'Mobile Shop / Retail'}</span>
                          </div>
                        </div>
                      </div>

                      {/* Subscription Status Pill */}
                      {isLifetime ? (
                        <span className="text-[10px] font-black px-2.5 py-1 rounded-full bg-[#D4AF37]/20 text-[#D4AF37] border border-[#D4AF37]/40 flex items-center gap-1 shrink-0">
                          <Crown className="w-3 h-3" />
                          <span>{isKu ? 'هەمیشەیی VIP' : 'Lifetime'}</span>
                        </span>
                      ) : isPremium ? (
                        <span className="text-[10px] font-black px-2.5 py-1 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/30 flex items-center gap-1 shrink-0">
                          <Crown className="w-3 h-3" />
                          <span>{isKu ? 'پریمیم VIP' : 'Premium'}</span>
                        </span>
                      ) : isPaidActive ? (
                        <span className="text-[10px] font-black px-2.5 py-1 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 flex items-center gap-1 shrink-0">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>{isKu ? 'پڕۆ - چالاک' : 'Pro Active'}</span>
                        </span>
                      ) : isExpired ? (
                        <span className="text-[10px] font-black px-2.5 py-1 rounded-full bg-red-500/15 text-red-400 border border-red-500/30 shrink-0">
                          {isKu ? 'بەسەرچووە' : 'Expired'}
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-500/15 text-slate-400 shrink-0">
                          {isKu ? 'بێ بەشداریکردن' : 'Free'}
                        </span>
                      )}
                    </div>

                    {/* Contact & Profile Info */}
                    <div
                      className={`p-3 rounded-xl border space-y-1.5 text-xs ${
                        isDarkMode ? 'bg-[#0E1524] border-slate-800/80 text-slate-300' : 'bg-slate-50 border-slate-100 text-slate-700'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 truncate min-w-0">
                          <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span className="font-mono text-[11px] truncate">{user.email || '—'}</span>
                        </div>
                        {user.email && (
                          <button
                            type="button"
                            onClick={() => copyToClipboard(user.email!, `email_${user.id}`)}
                            className="text-slate-400 hover:text-white p-0.5 cursor-pointer"
                            title={isKu ? 'لەبەرگرتنەوەی ئیمەیڵ' : 'Copy Email'}
                          >
                            {copiedKey === `email_${user.id}` ? (
                              <Check className="w-3 h-3 text-emerald-400" />
                            ) : (
                              <Copy className="w-3 h-3" />
                            )}
                          </button>
                        )}
                      </div>

                      <div className="flex items-center gap-2 truncate">
                        <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="font-mono text-[11px]">{user.phone || '—'}</span>
                      </div>

                      <div className="flex items-center gap-2 truncate text-[11px] text-slate-400">
                        <Users className="w-3.5 h-3.5 shrink-0" />
                        <span className="truncate">{user.display_name || (isKu ? 'بەکارهێنەری فرۆشیار' : 'User')}</span>
                      </div>
                    </div>

                    {/* ── User Password Row (Visible directly to Admin!) ── */}
                    <div
                      className={`p-2.5 rounded-xl border flex items-center justify-between text-xs transition ${
                        isDarkMode
                          ? 'bg-[#0E1524] border-slate-800'
                          : 'bg-slate-50 border-slate-200'
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="w-6 h-6 rounded-lg bg-amber-500/15 text-amber-400 flex items-center justify-center shrink-0">
                          <Key className="w-3.5 h-3.5" />
                        </div>
                        <div className="min-w-0">
                          <span className="text-[10px] text-slate-400 block font-bold leading-tight">
                            {isKu ? 'وشەی نهێنی (Password)' : 'Account Password'}
                          </span>
                          {user.account_password ? (
                            <span className="font-mono font-bold text-amber-300 text-xs tracking-wider select-all">
                              {revealedPasswords[user.id] ? user.account_password : '••••••••'}
                            </span>
                          ) : (
                            <span className="text-[10px] text-slate-500 italic">
                              {isKu ? 'لە کاتی لۆگین تۆمار دەبێت' : 'Records on login'}
                            </span>
                          )}
                        </div>
                      </div>

                      {user.account_password && (
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => togglePassword(user.id)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
                            title={revealedPasswords[user.id] ? (isKu ? 'شاردنەوە' : 'Hide') : (isKu ? 'پیشاندان' : 'Show')}
                          >
                            {revealedPasswords[user.id] ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                          </button>
                          <button
                            type="button"
                            onClick={() => copyToClipboard(user.account_password!, `pass_${user.id}`)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
                            title={isKu ? 'لەبەرگرتنەوە' : 'Copy'}
                          >
                            {copiedKey === `pass_${user.id}` ? (
                              <Check className="w-3.5 h-3.5 text-emerald-400" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Subscription Duration Summary if exists */}
                    {sub && (
                      <div className="text-[11px] flex items-center justify-between px-1 text-slate-400">
                        <span className="font-bold text-inherit">{sub.planLabel}</span>
                        <span className="font-bold text-inherit">
                          {remaining === 'lifetime'
                            ? isKu
                              ? 'هەمیشەیی'
                              : 'Lifetime'
                            : remaining === 'expired'
                            ? isKu
                              ? 'بەسەرچووە'
                              : 'Expired'
                            : `${remaining} ${isKu ? 'ڕۆژی ماوە' : 'days left'}`}
                        </span>
                      </div>
                    )}

                    {/* Action Button: Upgrade / Assign Pro */}
                    <button
                      onClick={() => setShowUpgradeModal(user)}
                      className={`w-full py-2.5 rounded-xl font-bold text-xs border transition flex items-center justify-center gap-2 cursor-pointer shadow-sm active:scale-98 ${
                        isPaidActive
                          ? 'bg-gradient-to-tr from-[#D4AF37]/20 to-[#D4AF37]/35 text-[#D4AF37] border-[#D4AF37]/40 hover:from-[#D4AF37]/30'
                          : 'bg-gradient-to-tr from-[#D4AF37] to-[#B8860B] text-slate-950 font-extrabold border-transparent hover:opacity-95'
                      }`}
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>
                        {isPaidActive
                          ? isKu
                            ? 'نوێکردنەوە / بەرزکردنەوەی پلان'
                            : 'Renew / Upgrade Plan'
                          : isKu
                          ? '⚡ بەرزکردنەوەی هەژمار بۆ پڕۆ / پریمیم'
                          : '⚡ Upgrade Account to Pro / Premium'}
                      </span>
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {/* ── TAB 2: ACTIVE SUBSCRIPTIONS LIST ──                                 */}
      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'subscriptions' && (
        <div className="space-y-4">
          {subscriptions.length === 0 ? (
            <div
              className={`p-12 text-center rounded-2xl border text-xs text-slate-400 ${
                isDarkMode ? 'bg-[#141C2E] border-slate-800' : 'bg-white border-slate-200'
              }`}
            >
              <Clock className="w-8 h-8 mx-auto mb-2 text-slate-500 opacity-60" />
              <p>{isKu ? 'هیچ بەشداریکردنێکی چالاک نییە.' : 'No active subscriptions found.'}</p>
              <button
                onClick={() => setShowCreateAccountModal(true)}
                className="mt-3 px-4 py-2 rounded-xl bg-[#D4AF37] text-slate-950 font-bold text-xs cursor-pointer"
              >
                {isKu ? '+ دروستکردنی یەکەم ئەکاونت' : '+ Create First Account'}
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 sm:gap-4">
              {subscriptions.map((sub) => {
                const remaining = calculateDaysRemaining(sub.expiresAt, sub.planId);
                const isLifetime = sub.planId === 'lifetime' || sub.tier === 'lifetime';
                const isExpired = remaining === 'expired' || sub.status === 'expired';

                return (
                  <div
                    key={sub.id}
                    className={`p-4 sm:p-5 rounded-2xl sm:rounded-3xl border transition shadow-sm space-y-3 flex flex-col justify-between ${
                      isExpired
                        ? 'border-red-500/40 bg-red-500/5'
                        : isDarkMode
                        ? 'bg-[#141C2E] border-slate-800'
                        : 'bg-white border-slate-200'
                    }`}
                  >
                    <div>
                      {/* Top: Customer & Email */}
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <div>
                          <div className="font-extrabold text-sm sm:text-base text-inherit">
                            {sub.customerName || sub.businessName}
                          </div>
                          <div className="text-xs text-slate-400 font-mono mt-0.5">{sub.email}</div>
                        </div>

                        {isExpired ? (
                          <span className="text-[10px] font-black px-2.5 py-1 rounded-full bg-red-500/15 text-red-400 border border-red-500/30">
                            {isKu ? 'بەسەرچووە' : 'Expired'}
                          </span>
                        ) : isLifetime ? (
                          <span className="text-[10px] font-black px-2.5 py-1 rounded-full bg-[#D4AF37]/20 text-[#D4AF37] border border-[#D4AF37]/40 flex items-center gap-1">
                            <Crown className="w-3 h-3" />
                            <span>{isKu ? 'هەمیشەیی VIP' : 'Lifetime'}</span>
                          </span>
                        ) : (
                          <span className="text-[10px] font-black px-2.5 py-1 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                            {isKu ? 'چالاکە' : 'Active'}
                          </span>
                        )}
                      </div>

                      {/* Details Box */}
                      <div
                        className={`p-3 rounded-xl border space-y-1.5 text-xs ${
                          isDarkMode ? 'bg-[#0E1524] border-slate-800 text-slate-300' : 'bg-slate-50 border-slate-100 text-slate-700'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-slate-400">{isKu ? 'پاکێج:' : 'Plan:'}</span>
                          <span className="font-bold text-[#D4AF37]">{sub.planLabel}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-slate-400">{isKu ? 'دەستپێک:' : 'Started:'}</span>
                          <span className="font-mono text-[11px]">{new Date(sub.startDate).toLocaleDateString()}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-slate-400">{isKu ? 'کۆتایی:' : 'Expires:'}</span>
                          <span className="font-mono text-[11px]">
                            {sub.expiresAt ? new Date(sub.expiresAt).toLocaleDateString() : isKu ? 'هەمیشەیی' : 'Never'}
                          </span>
                        </div>
                        {sub.phone && (
                          <div className="flex items-center justify-between">
                            <span className="text-slate-400">{isKu ? 'تەلەفۆن:' : 'Phone:'}</span>
                            <span className="font-mono text-[11px]">{sub.phone}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Expiry Progress or Remaining badge & Actions */}
                    <div className="pt-2 border-t border-slate-200/60 dark:border-slate-800/60 flex items-center justify-between text-xs">
                      <div className="font-bold">
                        {isExpired ? (
                          <span className="text-red-400">{isKu ? 'خزمەتگوزاری بەسەرچووە' : 'Subscription Ended'}</span>
                        ) : isLifetime ? (
                          <span className="text-[#D4AF37]">{isKu ? 'خزمەتگوزاری هەمیشەیی' : 'Lifetime Access'}</span>
                        ) : (
                          <span className="text-emerald-400">
                            {remaining} {isKu ? 'ڕۆژی ماوە بۆ تەواوبوون' : 'days remaining'}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setShowUpgradeModal(sub)}
                          className="px-3 py-1.5 rounded-lg text-xs font-bold text-[#D4AF37] hover:bg-[#D4AF37]/10 transition border border-[#D4AF37]/30 cursor-pointer"
                        >
                          {isKu ? 'گۆڕین / درێژکردنەوە' : 'Extend'}
                        </button>
                        <button
                          onClick={() => handleDeleteSubscription(sub)}
                          className="p-1.5 rounded-lg text-red-400 hover:bg-red-500/10 transition border border-red-500/20 cursor-pointer"
                          title={isKu ? 'سڕینەوە' : 'Delete'}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {/* ── TAB 3: PAYMENT REQUESTS (WITH RECEIPT PROOFS) ──                     */}
      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'requests' && (
        <div className="space-y-4">
          {requests.length === 0 ? (
            <div
              className={`p-12 text-center rounded-2xl border text-xs text-slate-400 ${
                isDarkMode ? 'bg-[#141C2E] border-slate-800' : 'bg-white border-slate-200'
              }`}
            >
              <CreditCard className="w-8 h-8 mx-auto mb-2 text-slate-500 opacity-60" />
              <p>{isKu ? 'هیچ داواکارییەکی نوێی پارەدان نەگەیشتووە.' : 'No payment requests received yet.'}</p>
            </div>
          ) : (
            <div className="space-y-3.5">
              {requests.map((req) => {
                const isPending = req.status === 'pending';
                const isApproved = req.status === 'approved';
                const isRejected = req.status === 'rejected';

                return (
                  <div
                    key={req.id}
                    className={`p-4 sm:p-5 rounded-2xl sm:rounded-3xl border transition shadow-sm space-y-3 ${
                      isDarkMode ? 'bg-[#141C2E] border-slate-800' : 'bg-white border-slate-200'
                    }`}
                  >
                    {/* Top Row: User & Plan */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#D4AF37] to-[#F59E0B] flex items-center justify-center text-slate-950 font-black text-sm shrink-0">
                          {req.customerName ? req.customerName.charAt(0).toUpperCase() : 'R'}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-extrabold text-sm sm:text-base text-inherit truncate">
                              {req.customerName}
                            </span>
                            <span className="text-xs px-2 py-0.5 rounded-full bg-[#D4AF37]/15 text-[#D4AF37] font-bold shrink-0">
                              {req.planLabel}
                            </span>
                          </div>
                          <div className="text-xs text-slate-400 font-mono mt-0.5 truncate">{req.email}</div>
                        </div>
                      </div>

                      {/* Status Badge */}
                      <div>
                        {isPending && (
                          <span className="text-xs font-bold px-3 py-1 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/30 flex items-center gap-1.5">
                            <Clock className="w-3.5 h-3.5 animate-spin" />
                            <span>{isKu ? 'چاوەڕوانی پەسەندکردن' : 'Pending'}</span>
                          </span>
                        )}
                        {isApproved && (
                          <span className="text-xs font-bold px-3 py-1 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 flex items-center gap-1.5">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>{isKu ? 'پەسەندکراوە' : 'Approved'}</span>
                          </span>
                        )}
                        {isRejected && (
                          <span className="text-xs font-bold px-3 py-1 rounded-full bg-red-500/15 text-red-400 border border-red-500/30 flex items-center gap-1.5">
                            <XCircle className="w-3.5 h-3.5" />
                            <span>{isKu ? 'ڕەتکراوەتەوە' : 'Rejected'}</span>
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Request Details */}
                    <div
                      className={`grid grid-cols-2 sm:grid-cols-4 gap-2.5 p-3 rounded-xl border text-xs ${
                        isDarkMode ? 'bg-[#0E1524] border-slate-800 text-slate-300' : 'bg-slate-50 border-slate-100 text-slate-700'
                      }`}
                    >
                      <div>
                        <span className="text-slate-400 block text-[10px]">{isKu ? 'بڕی پارە:' : 'Amount:'}</span>
                        <span className="font-extrabold text-[#D4AF37] text-sm">{req.amount}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px]">{isKu ? 'ڕێگەی پارەدان:' : 'Method:'}</span>
                        <span className="font-bold">{req.paymentMethod}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px]">{isKu ? 'تەلەفۆن:' : 'Phone:'}</span>
                        <span className="font-mono">{req.phone || '—'}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px]">{isKu ? 'بەروار:' : 'Date:'}</span>
                        <span className="font-mono text-[11px]">{new Date(req.createdAt).toLocaleDateString()}</span>
                      </div>
                    </div>

                    {/* Receipt Preview if uploaded */}
                    {req.receiptImage && (
                      <div className="flex items-center gap-3 p-2.5 rounded-xl border border-dashed border-[#D4AF37]/30 bg-[#D4AF37]/5">
                        <img
                          src={req.receiptImage}
                          alt="Receipt"
                          className="w-14 h-14 object-cover rounded-lg border border-[#D4AF37]/40 cursor-pointer hover:scale-105 transition"
                          onClick={() => setPreviewReceipt(req.receiptImage!)}
                        />
                        <div className="flex-1 min-w-0">
                          <span className="text-xs font-bold block">{isKu ? 'وێنەی وەسڵی پارەدان' : 'Receipt Proof Attached'}</span>
                          <button
                            type="button"
                            onClick={() => setPreviewReceipt(req.receiptImage!)}
                            className="text-[11px] text-[#D4AF37] hover:underline font-bold mt-0.5 inline-block cursor-pointer"
                          >
                            {isKu ? 'کلیک بکە بۆ گەورەکردن 🔍' : 'Click to preview full image 🔍'}
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Rejection reason note if rejected */}
                    {isRejected && req.rejectionReason && (
                      <div className="p-2.5 rounded-xl bg-red-500/10 border border-red-500/20 text-xs text-red-400">
                        <span className="font-bold">{isKu ? 'هۆکاری ڕەتکردنەوە:' : 'Rejection Reason:'} </span>
                        {req.rejectionReason}
                      </div>
                    )}

                    {/* Bottom Action Buttons */}
                    <div className="pt-2 border-t border-slate-200/60 dark:border-slate-800/60 flex items-center justify-end gap-2">
                      <button
                        onClick={() => handleDeleteRequest(req.id)}
                        className="px-3 py-1.5 rounded-xl text-xs font-bold text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition border border-transparent hover:border-red-500/30 flex items-center gap-1 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>{isKu ? 'سڕینەوە' : 'Delete'}</span>
                      </button>

                      {isPending && (
                        <>
                          <button
                            onClick={() => handleRejectRequest(req)}
                            className="px-3 py-1.5 rounded-xl text-xs font-bold text-red-400 hover:bg-red-500/10 transition border border-red-500/30 flex items-center gap-1 cursor-pointer"
                          >
                            <X className="w-3.5 h-3.5" />
                            <span>{isKu ? 'ڕەتکردنەوە' : 'Reject'}</span>
                          </button>

                          <button
                            onClick={() => handleApproveRequest(req)}
                            className="px-4 py-1.5 rounded-xl text-xs font-extrabold bg-gradient-to-tr from-emerald-500 to-emerald-600 text-white shadow-md shadow-emerald-500/20 hover:opacity-95 transition flex items-center gap-1.5 cursor-pointer"
                          >
                            <Check className="w-3.5 h-3.5" />
                            <span>{isKu ? 'پەسەندکردن و چالاککردن' : 'Approve & Activate'}</span>
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {/* ── MODAL 1: VIEW RECEIPT FULL SCREEN ──                                 */}
      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {previewReceipt && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
          onClick={() => setPreviewReceipt(null)}
        >
          <div
            className={`max-w-2xl w-full p-4 rounded-3xl border shadow-2xl space-y-3 ${
              isDarkMode ? 'bg-[#141C2E] border-slate-800' : 'bg-white border-slate-200'
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-2 border-b border-slate-200/60 dark:border-slate-800/60">
              <h3 className="text-sm font-bold">{isKu ? 'وێنەی وەسڵی پارەدان' : 'Receipt Proof Image'}</h3>
              <button onClick={() => setPreviewReceipt(null)} className="p-1 rounded-lg text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="max-h-[75vh] overflow-auto flex items-center justify-center bg-black/40 rounded-2xl p-2">
              <img src={previewReceipt} alt="Receipt" className="max-h-[70vh] w-auto object-contain rounded-xl shadow-lg" />
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {/* ── MODAL 2: CREATE ACCOUNT & ASSIGN SUBSCRIPTION (ADMIN MANUALLY) ──   */}
      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {showCreateAccountModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div
            className={`max-w-lg w-full p-5 sm:p-6 rounded-3xl border shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto ${
              isDarkMode ? 'bg-[#141C2E] border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
            }`}
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-200/60 dark:border-slate-800/60">
              <div>
                <h3 className="text-base font-extrabold flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-[#D4AF37]" />
                  <span>{isKu ? 'دروستکردنی ئەکاونت و بەستنەوەی پاکێج' : 'Create & Assign Account'}</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  {isKu
                    ? 'ئیمەیڵی فەرمی کەسەکە دابنێ و جۆری پاکێجەکەی دیاری بکە'
                    : 'Link user official email to Pro or Premium tier'}
                </p>
              </div>
              <button
                onClick={() => setShowCreateAccountModal(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateAccountSubmit} className="space-y-3.5">
              {createError && (
                <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-medium">
                  {createError}
                </div>
              )}

              {/* Official Email */}
              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1">
                  {isKu ? 'ئیمەیڵی فەرمی کڕیار (سەرەکی)' : 'Official User Email'} *
                </label>
                <input
                  type="email"
                  required
                  value={createEmail}
                  onChange={(e) => setCreateEmail(e.target.value)}
                  placeholder="skay.kurd@gmail.com"
                  className={`w-full px-3.5 py-2.5 rounded-xl text-xs font-mono outline-none border transition ${
                    isDarkMode
                      ? 'bg-[#0E1524] border-slate-700 text-white focus:border-[#D4AF37]'
                      : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-[#D4AF37]'
                  }`}
                />
              </div>

              {/* Tier / Plan Picker */}
              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1.5">
                  {isKu ? 'جۆری هەژمار و پاکێج (Tier & Plan):' : 'Choose Tier & Plan:'}
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {SUBSCRIPTION_PLANS.map((plan) => (
                    <button
                      key={plan.id}
                      type="button"
                      onClick={() => setCreatePlan(plan.id)}
                      className={`p-2.5 rounded-xl text-start border transition cursor-pointer ${
                        createPlan === plan.id
                          ? 'bg-[#D4AF37] text-slate-950 border-[#D4AF37] font-bold shadow-md shadow-[#D4AF37]/20'
                          : isDarkMode
                          ? 'bg-[#0E1524] border-slate-700 text-slate-300 hover:border-slate-600'
                          : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      <div className="text-xs font-bold">{isKu ? plan.labelKu : plan.labelEn}</div>
                      <div className="text-[10px] opacity-80 mt-0.5">{isKu ? plan.tierLabelKu : plan.tierLabelEn}</div>
                    </button>
                  ))}

                  {/* Custom Plan Button */}
                  <button
                    type="button"
                    onClick={() => setCreatePlan('custom')}
                    className={`p-2.5 rounded-xl text-start border transition cursor-pointer ${
                      createPlan === 'custom'
                        ? 'bg-[#D4AF37] text-slate-950 border-[#D4AF37] font-bold shadow-md'
                        : isDarkMode
                        ? 'bg-[#0E1524] border-slate-700 text-slate-300'
                        : 'bg-slate-50 border-slate-200 text-slate-700'
                    }`}
                  >
                    <div className="text-xs font-bold">{isKu ? 'ڕۆژی دیاریکراو' : 'Custom Days'}</div>
                    <div className="text-[10px] opacity-80 mt-0.5">{isKu ? 'کاتی تایبەت' : 'Set Days'}</div>
                  </button>
                </div>
              </div>

              {/* Custom Days Input if custom is chosen */}
              {createPlan === 'custom' && (
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1">
                    {isKu ? 'ژمارەی ڕۆژەکانی چالاکبوون:' : 'Number of active days:'}
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={createCustomDays}
                    onChange={(e) => setCreateCustomDays(e.target.value)}
                    placeholder="30"
                    className={`w-full px-3.5 py-2.5 rounded-xl text-xs font-mono outline-none border ${
                      isDarkMode ? 'bg-[#0E1524] border-slate-700 text-white' : 'bg-slate-50 border-slate-200'
                    }`}
                  />
                </div>
              )}

              {/* Password for user (Visible to admin!) */}
              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1 flex items-center gap-1.5">
                  <Key className="w-3.5 h-3.5 text-[#D4AF37]" />
                  <span>{isKu ? 'وشەی نهێنی (Password - لای ئەدمین دیارە):' : 'Initial Password (Visible in Admin):'}</span>
                </label>
                <input
                  type="text"
                  value={createPassword}
                  onChange={(e) => setCreatePassword(e.target.value)}
                  placeholder={isKu ? 'وشەی نهێنی بۆ ئەکاونتەکەی دابنێ (ئارەزوومەندانە)' : 'e.g. Pass123456 (Optional)'}
                  className={`w-full px-3.5 py-2.5 rounded-xl text-xs font-mono outline-none border transition ${
                    isDarkMode
                      ? 'bg-[#0E1524] border-slate-700 text-amber-300 font-bold focus:border-[#D4AF37]'
                      : 'bg-slate-50 border-slate-200 text-amber-600 font-bold focus:border-[#D4AF37]'
                  }`}
                />
                <span className="text-[10px] text-slate-500 mt-0.5 block">
                  {isKu
                    ? 'ئەگەر کڕیار دواتر وشەی نهێنیشی گۆڕی، لای تۆ لە ئەدمین پانێڵ نوێ دەبێتەوە.'
                    : 'If the user later resets or changes password, it automatically updates in this panel.'}
                </span>
              </div>

              {/* Name & Phone */}
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1">{isKu ? 'ناوی کڕیار' : 'Customer Name'}</label>
                  <input
                    type="text"
                    value={createName}
                    onChange={(e) => setCreateName(e.target.value)}
                    placeholder={isKu ? 'ئارام کەریم' : 'Aram Karim'}
                    className={`w-full px-3.5 py-2.5 rounded-xl text-xs outline-none border ${
                      isDarkMode ? 'bg-[#0E1524] border-slate-700 text-white' : 'bg-slate-50 border-slate-200'
                    }`}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1">{isKu ? 'ژمارەی مۆبایل' : 'Phone'}</label>
                  <input
                    type="text"
                    value={createPhone}
                    onChange={(e) => setCreatePhone(e.target.value)}
                    placeholder="0750 000 0000"
                    className={`w-full px-3.5 py-2.5 rounded-xl text-xs font-mono outline-none border ${
                      isDarkMode ? 'bg-[#0E1524] border-slate-700 text-white' : 'bg-slate-50 border-slate-200'
                    }`}
                  />
                </div>
              </div>

              {/* Business Name */}
              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1">{isKu ? 'ناوی بازرگانی / مارکێت' : 'Business Name'}</label>
                <input
                  type="text"
                  value={createBusiness}
                  onChange={(e) => setCreateBusiness(e.target.value)}
                  placeholder={isKu ? 'مارکێتی کوردستان' : 'Kurdistan Market'}
                  className={`w-full px-3.5 py-2.5 rounded-xl text-xs outline-none border ${
                    isDarkMode ? 'bg-[#0E1524] border-slate-700 text-white' : 'bg-slate-50 border-slate-200'
                  }`}
                />
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1">{isKu ? 'تێبینی تایبەت' : 'Notes'}</label>
                <input
                  type="text"
                  value={createNotes}
                  onChange={(e) => setCreateNotes(e.target.value)}
                  placeholder={isKu ? 'بۆ نموونە: پارەی دراوە بە کاش لە ئۆفیس' : 'Notes'}
                  className={`w-full px-3.5 py-2.5 rounded-xl text-xs outline-none border ${
                    isDarkMode ? 'bg-[#0E1524] border-slate-700 text-white' : 'bg-slate-50 border-slate-200'
                  }`}
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowCreateAccountModal(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-700 text-xs font-bold text-slate-400 hover:text-white"
                >
                  {isKu ? 'پاشگەزبوونەوە' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  disabled={createSubmitting}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-tr from-[#D4AF37] to-[#B8860B] text-slate-950 text-xs font-black shadow-md cursor-pointer disabled:opacity-50"
                >
                  {createSubmitting
                    ? isKu
                      ? 'تۆمارکردن...'
                      : 'Creating...'
                    : isKu
                    ? 'دروستکردن و چالاککردنی هەژمار'
                    : 'Create & Activate Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {/* ── MODAL 3: UPGRADE OR EXTEND SUBSCRIPTION FOR EXISTING USER ──         */}
      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {showUpgradeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div
            className={`max-w-md w-full p-5 sm:p-6 rounded-3xl border shadow-2xl space-y-4 ${
              isDarkMode ? 'bg-[#141C2E] border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
            }`}
          >
            <div className="flex items-center justify-between pb-2 border-b border-slate-200/60 dark:border-slate-800/60">
              <div>
                <h3 className="text-base font-extrabold flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-[#D4AF37]" />
                  <span>{isKu ? 'بەرزکردنەوەی هەژمار بۆ پڕۆ / پریمیم' : 'Upgrade Account Tier'}</span>
                </h3>
                <p className="text-xs text-slate-400 font-mono mt-0.5">{showUpgradeModal.email}</p>
              </div>
              <button onClick={() => setShowUpgradeModal(null)} className="p-1 rounded-lg text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpgradeSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1.5">
                  {isKu ? 'پاکێج و ئاستی نوێ هەڵبژێرە:' : 'Select New Plan:'}
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {SUBSCRIPTION_PLANS.map((plan) => (
                    <button
                      key={plan.id}
                      type="button"
                      onClick={() => setUpgradePlan(plan.id)}
                      className={`p-2.5 rounded-xl text-start border transition cursor-pointer ${
                        upgradePlan === plan.id
                          ? 'bg-[#D4AF37] text-slate-950 border-[#D4AF37] font-bold shadow-md'
                          : isDarkMode
                          ? 'bg-[#0E1524] border-slate-700 text-slate-300'
                          : 'bg-slate-50 border-slate-200 text-slate-700'
                      }`}
                    >
                      <div className="text-xs font-bold">{isKu ? plan.labelKu : plan.labelEn}</div>
                      <div className="text-[10px] opacity-80 mt-0.5">{isKu ? plan.tierLabelKu : plan.tierLabelEn}</div>
                    </button>
                  ))}

                  <button
                    type="button"
                    onClick={() => setUpgradePlan('custom')}
                    className={`p-2.5 rounded-xl text-start border transition cursor-pointer ${
                      upgradePlan === 'custom'
                        ? 'bg-[#D4AF37] text-slate-950 border-[#D4AF37] font-bold shadow-md'
                        : isDarkMode
                        ? 'bg-[#0E1524] border-slate-700 text-slate-300'
                        : 'bg-slate-50 border-slate-200 text-slate-700'
                    }`}
                  >
                    <div className="text-xs font-bold">{isKu ? 'ڕۆژی دیاریکراو' : 'Custom Days'}</div>
                    <div className="text-[10px] opacity-80 mt-0.5">{isKu ? 'دیاریکردنی ڕۆژ' : 'Set Days'}</div>
                  </button>
                </div>
              </div>

              {upgradePlan === 'custom' && (
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1">
                    {isKu ? 'ژمارەی ڕۆژەکان:' : 'Active Days:'}
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={upgradeCustomDays}
                    onChange={(e) => setUpgradeCustomDays(e.target.value)}
                    placeholder="30"
                    className={`w-full px-3.5 py-2.5 rounded-xl text-xs font-mono outline-none border ${
                      isDarkMode ? 'bg-[#0E1524] border-slate-700 text-white' : 'bg-slate-50 border-slate-200'
                    }`}
                  />
                </div>
              )}

              {/* Password update if desired */}
              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1 flex items-center gap-1.5">
                  <Key className="w-3.5 h-3.5 text-[#D4AF37]" />
                  <span>{isKu ? 'نوێکردنەوەی وشەی نهێنی (ئارەزوومەندانە):' : 'Update Password (Optional):'}</span>
                </label>
                <input
                  type="text"
                  value={upgradePassword}
                  onChange={(e) => setUpgradePassword(e.target.value)}
                  placeholder={
                    showUpgradeModal.account_password
                      ? `${isKu ? 'وشەی نهێنی ئێستا:' : 'Current:'} ${showUpgradeModal.account_password}`
                      : isKu
                      ? 'وشەی نهێنی نوێ'
                      : 'New password'
                  }
                  className={`w-full px-3.5 py-2.5 rounded-xl text-xs font-mono outline-none border ${
                    isDarkMode ? 'bg-[#0E1524] border-slate-700 text-white' : 'bg-slate-50 border-slate-200'
                  }`}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1">{isKu ? 'تێبینی' : 'Notes'}</label>
                <input
                  type="text"
                  value={upgradeNotes}
                  onChange={(e) => setUpgradeNotes(e.target.value)}
                  placeholder={isKu ? 'بۆ نموونە: پارەی کاشی داوە بۆ ١ ساڵ' : 'Notes'}
                  className={`w-full px-3.5 py-2.5 rounded-xl text-xs outline-none border ${
                    isDarkMode ? 'bg-[#0E1524] border-slate-700 text-white' : 'bg-slate-50 border-slate-200'
                  }`}
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowUpgradeModal(null)}
                  className="px-4 py-2.5 rounded-xl border border-slate-700 text-xs font-bold text-slate-400 hover:text-white"
                >
                  {isKu ? 'پاشگەزبوونەوە' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  disabled={upgradeSubmitting}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-tr from-[#D4AF37] to-[#B8860B] text-slate-950 text-xs font-black shadow-md cursor-pointer disabled:opacity-50"
                >
                  {upgradeSubmitting
                    ? isKu
                      ? 'بەرزکردنەوە...'
                      : 'Upgrading...'
                    : isKu
                    ? 'بەرزکردنەوەی هەژمار'
                    : 'Upgrade Plan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
