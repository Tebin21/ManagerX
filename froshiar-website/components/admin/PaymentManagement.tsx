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
  Phone,
  Mail,
  Building2,
  Calendar,
  Check,
  X,
  ShieldCheck,
  Trash2,
  Store,
  Tag,
  Sparkles,
  ChevronDown,
  Layers,
  ArrowUpRight,
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
  query,
  orderBy,
  onSnapshot,
  serverTimestamp,
} from 'firebase/firestore';

// ─── Plan Definitions ────────────────────────────────────────────────────────
export interface SubscriptionPlan {
  id: '1m' | '3m' | '6m' | '12m' | 'lifetime';
  labelKu: string;
  labelEn: string;
  durationMonths: number | null; // null for lifetime
  priceIqd: string;
  priceUsd: string;
}

export const SUBSCRIPTION_PLANS: SubscriptionPlan[] = [
  { id: '1m', labelKu: '١ مانگ (٣٠ ڕۆژ)', labelEn: '1 Month', durationMonths: 1, priceIqd: '١٥،٠٠٠ د.ع', priceUsd: '$10' },
  { id: '3m', labelKu: '٣ مانگ (٩٠ ڕۆژ)', labelEn: '3 Months', durationMonths: 3, priceIqd: '٤٠،٠٠٠ د.ع', priceUsd: '$25' },
  { id: '6m', labelKu: '٦ مانگ (نیو ساڵ)', labelEn: '6 Months', durationMonths: 6, priceIqd: '٧٥،٠٠٠ د.ع', priceUsd: '$50' },
  { id: '12m', labelKu: '١ ساڵ (١٢ مانگ)', labelEn: '1 Year', durationMonths: 12, priceIqd: '١٣٠،٠٠٠ د.ع', priceUsd: '$90' },
  { id: 'lifetime', labelKu: 'هەمیشەیی (Lifetime)', labelEn: 'Lifetime', durationMonths: null, priceIqd: '٢٥٠،٠٠٠ د.ع', priceUsd: '$170' },
];

export interface PaymentRequestRecord {
  id: string;
  customerName: string;
  email: string;
  phone: string;
  businessName: string;
  businessType?: string;
  planId: '1m' | '3m' | '6m' | '12m' | 'lifetime';
  planLabel: string;
  amount: string;
  paymentMethod: string; // FastPay, FIB, ZainCash, Cash, AsiaHawala
  receiptImage?: string; // base64 or URL
  status: 'pending' | 'approved' | 'rejected';
  rejectionReason?: string | null;
  createdAt: string;
  approvedAt?: string | null;
  notes?: string;
}

export interface UserSubscriptionRecord {
  id: string;
  email: string; // Primary link key!
  customerName: string;
  phone: string;
  businessName: string;
  businessType: string;
  address?: string;
  planId: '1m' | '3m' | '6m' | '12m' | 'lifetime';
  planLabel: string;
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

  // Active Tab: 'users' | 'requests' | 'subscriptions' (default to requests so admin sees incoming submissions immediately!)
  const [activeTab, setActiveTab] = useState<'users' | 'requests' | 'subscriptions'>('requests');

  // Data states
  const [appUsers, setAppUsers] = useState<AppUserRecord[]>([]);
  const [requests, setRequests] = useState<PaymentRequestRecord[]>([]);
  const [subscriptions, setSubscriptions] = useState<UserSubscriptionRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Modals & Forms
  const [previewReceipt, setPreviewReceipt] = useState<string | null>(null);
  const [showNewRequestModal, setShowNewRequestModal] = useState(false);
  const [showActivateModal, setShowActivateModal] = useState<AppUserRecord | UserSubscriptionRecord | null>(null);

  // New Request Form State
  const [formName, setFormName] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formBusiness, setFormBusiness] = useState('');
  const [formBusinessType, setFormBusinessType] = useState('Mobile Shop');
  const [formPlan, setFormPlan] = useState<'1m' | '3m' | '6m' | '12m' | 'lifetime'>('1m');
  const [formMethod, setFormMethod] = useState('FastPay');
  const [formReceiptBase64, setFormReceiptBase64] = useState<string>('');
  const [formNotes, setFormNotes] = useState('');
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Activate / Extend Subscription Form State
  const [activatePlan, setActivatePlan] = useState<'1m' | '3m' | '6m' | '12m' | 'lifetime'>('1m');
  const [activateNotes, setActivateNotes] = useState('');
  const [activateSubmitting, setActivateSubmitting] = useState(false);

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
      if (rList.length === 0) {
        const restReqs = await fetchCollectionRest('payment_requests');
        if (restReqs.length > 0) rList = restReqs;
      }
      if (uList.length === 0) {
        const restUsers = await fetchCollectionRest('app_telemetry_users');
        if (restUsers.length > 0) uList = restUsers;
      }
      if (sList.length === 0) {
        const restSubs = await fetchCollectionRest('user_subscriptions');
        if (restSubs.length > 0) sList = restSubs;
      }

      // Sort and update states
      uList.sort((a, b) => new Date(b.last_login_at || 0).getTime() - new Date(a.last_login_at || 0).getTime());
      rList.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());

      const now = Date.now();
      const processedSubs = sList.map((item) => {
        let status = item.status || 'active';
        if (item.expiresAt && item.planId !== 'lifetime') {
          const expTime = new Date(item.expiresAt).getTime();
          if (expTime < now) status = 'expired';
        }
        return { ...item, status };
      });

      setAppUsers(uList);
      setRequests(rList);
      setSubscriptions(processedSubs);
    } catch (err) {
      console.error('Failed to load payment data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();

    // Auto-polling interval every 8 seconds for rock-solid live syncing
    const interval = setInterval(() => {
      fetchData();
    }, 8000);

    // Also attempt realtime Firestore listener if client SDK is active
    let unsub: (() => void) | undefined;
    try {
      const db = getClientFirestore();
      if (db) {
        unsub = onSnapshot(
          collection(db, 'payment_requests'),
          (snapshot) => {
            const list: PaymentRequestRecord[] = [];
            snapshot.forEach((d) => list.push({ id: d.id, ...(d.data() as any) }));
            list.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
            setRequests(list);
          },
          (err) => console.warn('Realtime onSnapshot notice:', err)
        );
      }
    } catch {}

    return () => {
      clearInterval(interval);
      if (unsub) unsub();
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

  // ─── Create Subscription directly by Email ─────────────────────────────────
  const saveSubscriptionForEmail = async (
    email: string,
    customerName: string,
    phone: string,
    businessName: string,
    businessType: string,
    planId: '1m' | '3m' | '6m' | '12m' | 'lifetime',
    notes: string = ''
  ) => {
    const plan = SUBSCRIPTION_PLANS.find((p) => p.id === planId) || SUBSCRIPTION_PLANS[0];
    const now = new Date();
    let expiresAtIso: string | null = null;

    if (plan.durationMonths !== null) {
      const expDate = new Date();
      // If user already has an active subscription, extend from existing expiry date!
      const existing = getSubscriptionForEmail(email);
      if (existing && existing.expiresAt && new Date(existing.expiresAt).getTime() > Date.now()) {
        const baseDate = new Date(existing.expiresAt);
        baseDate.setMonth(baseDate.getMonth() + plan.durationMonths);
        expiresAtIso = baseDate.toISOString();
      } else {
        expDate.setMonth(expDate.getMonth() + plan.durationMonths);
        expiresAtIso = expDate.toISOString();
      }
    }

    const cleanEmail = email.trim().toLowerCase();
    const subDocId = cleanEmail.replace(/[^a-z0-9_]/gi, '_');

    const subRecord: UserSubscriptionRecord = {
      id: subDocId,
      email: cleanEmail,
      customerName: customerName.trim() || 'بەکارهێنەری فرۆشیار',
      phone: phone.trim(),
      businessName: businessName.trim() || 'فرۆشگا',
      businessType: businessType || 'Mobile Shop',
      planId,
      planLabel: isKu ? plan.labelKu : plan.labelEn,
      startDate: now.toISOString(),
      expiresAt: expiresAtIso,
      status: 'active',
      notes: notes.trim(),
      updatedAt: now.toISOString(),
    };

    // Try SDK first
    let saved = false;
    try {
      const db = getClientFirestore();
      if (db) {
        await setDoc(doc(db, 'user_subscriptions', subDocId), subRecord, { merge: true });
        saved = true;
      }
    } catch (e) {
      console.warn('SDK setDoc notice, using REST:', e);
    }

    // Fallback to REST
    if (!saved) {
      await setDocRest('user_subscriptions', subDocId, subRecord);
    }

    await fetchData();
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

      // 1. Update request status to approved
      try {
        const db = getClientFirestore();
        if (db) {
          await updateDoc(doc(db, 'payment_requests', req.id), {
            status: 'approved',
            approvedAt,
          });
          updated = true;
        }
      } catch (e) {
        console.warn('SDK updateDoc notice, using REST:', e);
      }

      if (!updated) {
        await updateDocRest('payment_requests', req.id, {
          status: 'approved',
          approvedAt,
        });
      }

      // 2. Automatically grant/extend subscription for this email
      await saveSubscriptionForEmail(
        req.email,
        req.customerName,
        req.phone,
        req.businessName,
        req.businessType || 'Store',
        req.planId,
        `Approved from Payment Request ID: ${req.id}`
      );

      alert(isKu ? 'داواکارییەکە بە سەرکەوتوویی پەسەندکرا و بەشداریکردنی بەکارهێنەر چالاک کرا!' : 'Request approved and subscription activated!');
      fetchData();
    } catch (err: any) {
      alert(err?.message || 'Error approving request');
    }
  };

  // ─── Reject Payment Request ────────────────────────────────────────────────
  const handleRejectRequest = async (req: PaymentRequestRecord) => {
    const reason = window.prompt(
      isKu ? 'تکایە هۆکاری ڕەتکردنەوە بنووسە (بۆ نموونە: وەسڵ ساختەیە یان پارە نەگەیشتووە):' : 'Rejection reason:',
      isKu ? 'پارەکە نەگەیشتووە یان وێنەی وەسڵ دروست نییە' : 'Payment not received or invalid receipt'
    );
    if (reason === null) return;

    try {
      const rejectedAt = new Date().toISOString();
      let updated = false;

      try {
        const db = getClientFirestore();
        if (db) {
          await updateDoc(doc(db, 'payment_requests', req.id), {
            status: 'rejected',
            rejectionReason: reason.trim(),
            rejectedAt,
          });
          updated = true;
        }
      } catch {}

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
      try {
        const db = getClientFirestore();
        if (db) {
          await deleteDoc(doc(db, 'payment_requests', id));
          deleted = true;
        }
      } catch {}

      if (!deleted) {
        await deleteDocRest('payment_requests', id);
      }
      fetchData();
    } catch (err: any) {
      alert(err?.message || 'Failed to delete');
    }
  };

  // ─── Handle New Payment Request Submit ─────────────────────────────────────
  const handleSubmitNewRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const email = formEmail.trim().toLowerCase();
    if (!email || !email.includes('@')) {
      setFormError(isKu ? 'تکایە ئیمەیڵێکی دروست بنووسە' : 'Please enter a valid email');
      return;
    }

    setFormSubmitting(true);
    try {
      const plan = SUBSCRIPTION_PLANS.find((p) => p.id === formPlan) || SUBSCRIPTION_PLANS[0];
      const newId = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `req_${Date.now()}`;

      const newRecord: PaymentRequestRecord = {
        id: newId,
        customerName: formName.trim() || 'کڕیاری نوێ',
        email,
        phone: formPhone.trim(),
        businessName: formBusiness.trim() || 'فرۆشگا',
        businessType: formBusinessType,
        planId: formPlan,
        planLabel: isKu ? plan.labelKu : plan.labelEn,
        amount: isKu ? plan.priceIqd : plan.priceUsd,
        paymentMethod: formMethod,
        receiptImage: formReceiptBase64 || undefined,
        status: 'pending',
        createdAt: new Date().toISOString(),
        notes: formNotes.trim(),
      };

      let saved = false;
      try {
        const db = getClientFirestore();
        if (db) {
          await setDoc(doc(db, 'payment_requests', newId), newRecord);
          saved = true;
        }
      } catch {}

      if (!saved) {
        await setDocRest('payment_requests', newId, newRecord);
      }

      // Reset
      setFormName('');
      setFormEmail('');
      setFormPhone('');
      setFormBusiness('');
      setFormReceiptBase64('');
      setFormNotes('');
      setShowNewRequestModal(false);
      fetchData();
    } catch (err: any) {
      setFormError(err?.message || 'Failed to submit request');
    } finally {
      setFormSubmitting(false);
    }
  };

  // ─── Handle Activate/Extend Submit from Modal ──────────────────────────────
  const handleActivateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!showActivateModal || !showActivateModal.email) return;

    setActivateSubmitting(true);
    try {
      const email = showActivateModal.email;
      const name =
        ('display_name' in showActivateModal
          ? (showActivateModal as any).display_name
          : (showActivateModal as any).customerName) || 'بەکارهێنەر';
      const phone = showActivateModal.phone || '';
      const business =
        ('business_name' in showActivateModal
          ? (showActivateModal as any).business_name
          : (showActivateModal as any).businessName) || 'فرۆشگا';
      const bType =
        ('business_type' in showActivateModal
          ? (showActivateModal as any).business_type
          : (showActivateModal as any).businessType) || 'Mobile Shop';

      await saveSubscriptionForEmail(
        email,
        name,
        phone,
        business,
        bType,
        activatePlan,
        activateNotes
      );

      setShowActivateModal(null);
      setActivateNotes('');
    } catch (err: any) {
      alert(err?.message || 'Error updating subscription');
    } finally {
      setActivateSubmitting(false);
    }
  };

  // ─── Image file handler for receipt upload ─────────────────────────────────
  const handleReceiptFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      alert(isKu ? 'قەبارەی وێنە نابێت لە ٢ مێگابایت زیاتر بێت' : 'Receipt image must be under 2MB');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setFormReceiptBase64(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  // ─── Stats Counts ──────────────────────────────────────────────────────────
  const statsCounts = useMemo(() => {
    const pendingReqs = requests.filter((r) => r.status === 'pending').length;
    const activeSubs = subscriptions.filter((s) => s.status === 'active').length;
    const expiredSubs = subscriptions.filter((s) => s.status === 'expired').length;
    return {
      totalUsers: appUsers.length,
      pendingReqs,
      activeSubs,
      expiredSubs,
    };
  }, [appUsers, requests, subscriptions]);

  // ─── Filtered Users ────────────────────────────────────────────────────────
  const filteredUsers = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return appUsers;
    return appUsers.filter((u) => {
      return (
        u.email?.toLowerCase().includes(q) ||
        u.display_name?.toLowerCase().includes(q) ||
        u.business_name?.toLowerCase().includes(q) ||
        u.phone?.toLowerCase().includes(q)
      );
    });
  }, [appUsers, searchQuery]);

  return (
    <div className="space-y-4 sm:space-y-6 animate-in fade-in duration-300">
      {/* ── KPI Summary Cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Card 1: Total Froshiar Users */}
        <div
          onClick={() => setActiveTab('users')}
          className={`p-4 sm:p-5 rounded-2xl border transition shadow-sm cursor-pointer hover:border-[#D4AF37]/60 active:scale-98 ${
            activeTab === 'users'
              ? 'border-[#D4AF37] ring-1 ring-[#D4AF37]/30'
              : ''
          } ${
            isDarkMode ? 'bg-[#141C2E] border-slate-800' : 'bg-white border-slate-200'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-slate-400 font-bold">{isKu ? 'کۆی بەکارهێنەران' : 'Total Users'}</span>
            <div className="w-9 h-9 rounded-xl bg-blue-500/15 flex items-center justify-center text-blue-500">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-black text-inherit">{statsCounts.totalUsers}</div>
          <p className="text-[11px] text-slate-400 mt-0.5">{isKu ? 'تۆمارکراو لە ناو فرۆشیار' : 'Registered in Froshiar'}</p>
        </div>

        {/* Card 2: Active Subscriptions */}
        <div
          onClick={() => setActiveTab('subscriptions')}
          className={`p-4 sm:p-5 rounded-2xl border transition shadow-sm cursor-pointer hover:border-emerald-500/60 active:scale-98 ${
            activeTab === 'subscriptions'
              ? 'border-emerald-500 ring-1 ring-emerald-500/30'
              : ''
          } ${
            isDarkMode ? 'bg-[#141C2E] border-slate-800' : 'bg-white border-slate-200'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-slate-400 font-bold">{isKu ? 'بەشداریکردنی چالاک' : 'Active Subscriptions'}</span>
            <div className="w-9 h-9 rounded-xl bg-emerald-500/15 flex items-center justify-center text-emerald-500">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-black text-emerald-500">{statsCounts.activeSubs}</div>
          <p className="text-[11px] text-slate-400 mt-0.5">{isKu ? 'ئەکاونتی پارەپێدراوی لایڤ' : 'Live paid accounts'}</p>
        </div>

        {/* Card 3: Pending Payment Requests (With Alert Badge) */}
        <div
          onClick={() => setActiveTab('requests')}
          className={`p-4 sm:p-5 rounded-2xl border transition shadow-sm cursor-pointer hover:border-amber-500/60 active:scale-98 ${
            activeTab === 'requests'
              ? 'border-amber-500 ring-1 ring-amber-500/30'
              : ''
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
            <span className="text-xs text-slate-400 font-bold">{isKu ? 'داواکاریی نوێی وەسڵ' : 'Pending Requests'}</span>
            <div
              className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                statsCounts.pendingReqs > 0 ? 'bg-amber-500 text-slate-950 animate-pulse' : 'bg-amber-500/15 text-amber-500'
              }`}
            >
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-black text-amber-500">{statsCounts.pendingReqs}</div>
          <p className="text-[11px] text-slate-400 mt-0.5">{isKu ? 'چاوەڕوانی پەسەندکردنن' : 'Awaiting admin approval'}</p>
        </div>

        {/* Card 4: Expired Accounts */}
        <div
          onClick={() => setActiveTab('subscriptions')}
          className={`p-4 sm:p-5 rounded-2xl border transition shadow-sm cursor-pointer hover:border-red-500/60 active:scale-98 ${
            isDarkMode ? 'bg-[#141C2E] border-slate-800' : 'bg-white border-slate-200'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-slate-400 font-bold">{isKu ? 'بەسەرچووەکان' : 'Expired'}</span>
            <div className="w-9 h-9 rounded-xl bg-red-500/15 flex items-center justify-center text-red-400">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-black text-red-400">{statsCounts.expiredSubs}</div>
          <p className="text-[11px] text-slate-400 mt-0.5">{isKu ? 'خزمەتگوزاری لایان وەستاوە' : 'Services automatically ended'}</p>
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
          {/* Tab 1: Users */}
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

          {/* Tab 2: Payment Requests */}
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

          {/* Tab 3: Subscriptions Tracker */}
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
        </div>

        {/* Right actions: Refresh & New Request Button */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={fetchData}
            disabled={loading}
            className={`p-2.5 rounded-xl border text-xs font-bold transition cursor-pointer ${
              isDarkMode ? 'bg-[#0E1524] border-slate-700 text-slate-200 hover:bg-slate-800' : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
            }`}
            title={isKu ? 'نوێکردنەوە' : 'Refresh'}
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-[#D4AF37]' : ''}`} />
          </button>

          <button
            onClick={() => setShowNewRequestModal(true)}
            className="px-3.5 py-2 sm:px-4 sm:py-2.5 rounded-xl sm:rounded-2xl bg-gradient-to-tr from-[#D4AF37] to-[#B8860B] text-slate-950 font-bold text-xs sm:text-sm flex items-center gap-1.5 shadow-md shadow-[#D4AF37]/20 cursor-pointer active:scale-98 transition"
          >
            <Plus className="w-4 h-4" />
            <span>{isKu ? '+ تۆمارکردنی داواکاری' : '+ New Request'}</span>
          </button>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {/* ── TAB 1: ALL USERS & BUSINESS PROFILES ──                             */}
      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'users' && (
        <div className="space-y-4">
          {/* Search Bar */}
          <div className="relative">
            <Search className="w-4 h-4 absolute top-3.5 left-3.5 sm:left-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={isKu ? 'گەڕان بەپێی ئیمەیڵ، ناوی کڕیار، ناوی بازرگانی، یان ژمارەی تەلەفۆن...' : 'Search users by email, name, business, phone...'}
              className={`w-full pl-10 pr-4 py-3 rounded-2xl text-xs sm:text-sm outline-none border transition ${
                isDarkMode
                  ? 'bg-[#141C2E] border-slate-800 text-white placeholder-slate-500 focus:border-[#D4AF37]'
                  : 'bg-white border-slate-200 text-slate-900 placeholder-slate-400 focus:border-[#D4AF37]'
              }`}
            />
          </div>

          {/* Users List Cards */}
          {filteredUsers.length === 0 ? (
            <div
              className={`p-12 text-center rounded-2xl border text-xs text-slate-400 ${
                isDarkMode ? 'bg-[#141C2E] border-slate-800' : 'bg-white border-slate-200'
              }`}
            >
              {isKu ? 'هیچ بەکارهێنەرێک نەدۆزرایەوە.' : 'No users found.'}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5 sm:gap-4">
              {filteredUsers.map((user) => {
                const sub = getSubscriptionForEmail(user.email);
                const remaining = sub ? calculateDaysRemaining(sub.expiresAt, sub.planId) : null;
                const isPaidActive = sub && sub.status === 'active' && remaining !== 'expired';

                return (
                  <div
                    key={user.id}
                    className={`p-4 sm:p-5 rounded-2xl sm:rounded-3xl border transition shadow-sm space-y-3.5 flex flex-col justify-between ${
                      isDarkMode
                        ? 'bg-[#141C2E] border-slate-800 hover:border-slate-700'
                        : 'bg-white border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    {/* Header: Business & Avatar */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        {/* Business Avatar / Icon */}
                        <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#D4AF37]/20 to-[#D4AF37]/40 flex items-center justify-center text-[#D4AF37] font-black text-lg border border-[#D4AF37]/30 shrink-0">
                          {user.business_name ? user.business_name.charAt(0).toUpperCase() : user.display_name ? user.display_name.charAt(0).toUpperCase() : 'B'}
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
                      {isPaidActive ? (
                        <span className="text-[10px] font-black px-2.5 py-1 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 shrink-0">
                          {isKu ? 'چالاکە' : 'Active'}
                        </span>
                      ) : sub && sub.status === 'expired' ? (
                        <span className="text-[10px] font-black px-2.5 py-1 rounded-full bg-red-500/15 text-red-400 border border-red-500/30 shrink-0">
                          {isKu ? 'بەسەرچووە' : 'Expired'}
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-500/15 text-slate-400 shrink-0">
                          {isKu ? 'بێ بەشداریکردن' : 'No Plan'}
                        </span>
                      )}
                    </div>

                    {/* Contact & Profile Details */}
                    <div
                      className={`p-3 rounded-xl border space-y-1.5 text-xs ${
                        isDarkMode ? 'bg-[#0E1524] border-slate-800/80 text-slate-300' : 'bg-slate-50 border-slate-100 text-slate-700'
                      }`}
                    >
                      <div className="flex items-center gap-2 truncate">
                        <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="font-mono text-[11px] truncate">{user.email || '—'}</span>
                      </div>
                      <div className="flex items-center gap-2 truncate">
                        <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="font-mono text-[11px]">{user.phone || '—'}</span>
                      </div>
                      <div className="flex items-center gap-2 truncate text-[11px] text-slate-400">
                        <Users className="w-3.5 h-3.5 shrink-0" />
                        <span className="truncate">{user.display_name || 'بەکارهێنەر'}</span>
                      </div>
                    </div>

                    {/* Subscription Duration Summary if exists */}
                    {sub && (
                      <div className="text-[11px] flex items-center justify-between px-1 text-slate-400">
                        <span>{sub.planLabel}</span>
                        <span className="font-bold text-inherit">
                          {remaining === 'lifetime'
                            ? isKu ? 'هەمیشەیی' : 'Lifetime'
                            : remaining === 'expired'
                            ? isKu ? 'بەسەرچووە' : 'Expired'
                            : `${remaining} ${isKu ? 'ڕۆژی ماوە' : 'days left'}`}
                        </span>
                      </div>
                    )}

                    {/* Action Button: Activate or Extend Subscription */}
                    <button
                      onClick={() => setShowActivateModal(user)}
                      className="w-full py-2.5 rounded-xl bg-gradient-to-tr from-[#D4AF37]/15 to-[#D4AF37]/25 hover:from-[#D4AF37]/30 hover:to-[#D4AF37]/40 text-[#D4AF37] font-bold text-xs border border-[#D4AF37]/30 transition flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>{isPaidActive ? (isKu ? 'نوێکردنەوە / درێژکردنەوە' : 'Renew / Extend') : (isKu ? 'چالاککردنی بەشداریکردن' : 'Activate Subscription')}</span>
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {/* ── TAB 2: PAYMENT REQUESTS (WITH RECEIPT PROOFS) ──                     */}
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
              <p className="text-[11px] text-slate-500 mt-1">
                {isKu ? 'کاتێک کڕیار لە وێبسایت یان ئەپ وەسڵی پارەدان دەنێرێت، لێرە پیشان دەدرێت بۆ پەسەندکردن.' : 'Receipt submissions from customers will appear here for approval.'}
              </p>
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
                            <h4 className="text-sm sm:text-base font-extrabold text-inherit truncate">
                              {req.customerName}
                            </h4>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-500/15 text-blue-400 border border-blue-500/30">
                              {req.paymentMethod}
                            </span>
                          </div>
                          <div className="text-xs text-slate-400 font-mono truncate">{req.email} · {req.phone}</div>
                        </div>
                      </div>

                      {/* Status Badge */}
                      <div>
                        {isPending && (
                          <span className="text-xs font-black px-3 py-1 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/30 flex items-center gap-1.5 animate-pulse">
                            <Clock className="w-3.5 h-3.5" />
                            <span>{isKu ? 'چاوەڕوانی پەسەندکردنە' : 'Pending Approval'}</span>
                          </span>
                        )}
                        {isApproved && (
                          <span className="text-xs font-black px-3 py-1 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 flex items-center gap-1.5">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>{isKu ? 'پەسەندکراوە' : 'Approved'}</span>
                          </span>
                        )}
                        {isRejected && (
                          <span className="text-xs font-black px-3 py-1 rounded-full bg-red-500/15 text-red-400 border border-red-500/30 flex items-center gap-1.5">
                            <XCircle className="w-3.5 h-3.5" />
                            <span>{isKu ? 'ڕەتکراوەتەوە' : 'Rejected'}</span>
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Middle Row: Plan details & Receipt Image Preview */}
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
                      {/* Left: Info capsules */}
                      <div className="md:col-span-8 flex flex-wrap items-center gap-2 text-xs">
                        <div
                          className={`px-3 py-1.5 rounded-xl border font-bold ${
                            isDarkMode ? 'bg-[#0E1524] border-slate-800' : 'bg-slate-50 border-slate-200'
                          }`}
                        >
                          <span className="text-slate-400">{isKu ? 'پاکێج: ' : 'Plan: '}</span>
                          <span className="text-[#D4AF37]">{req.planLabel}</span>
                        </div>

                        <div
                          className={`px-3 py-1.5 rounded-xl border font-bold ${
                            isDarkMode ? 'bg-[#0E1524] border-slate-800' : 'bg-slate-50 border-slate-200'
                          }`}
                        >
                          <span className="text-slate-400">{isKu ? 'بڕ: ' : 'Amount: '}</span>
                          <span className="text-emerald-400">{req.amount}</span>
                        </div>

                        <div className="text-[11px] text-slate-400 font-mono">
                          {new Date(req.createdAt).toLocaleDateString()} · {new Date(req.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>

                        {req.rejectionReason && (
                          <div className="w-full text-xs text-red-400 bg-red-500/10 p-2 rounded-lg border border-red-500/20">
                            {isKu ? 'هۆکاری ڕەتکردنەوە: ' : 'Reason: '} {req.rejectionReason}
                          </div>
                        )}
                      </div>

                      {/* Right: Receipt Image Thumbnail */}
                      <div className="md:col-span-4 flex items-center justify-end gap-2">
                        {req.receiptImage ? (
                          <button
                            onClick={() => setPreviewReceipt(req.receiptImage || null)}
                            className="flex items-center gap-2 p-1.5 px-3 rounded-xl border border-[#D4AF37]/40 bg-[#D4AF37]/10 hover:bg-[#D4AF37]/20 text-[#D4AF37] text-xs font-bold transition cursor-pointer"
                          >
                            <img
                              src={req.receiptImage}
                              alt="Receipt Thumbnail"
                              className="w-7 h-7 object-cover rounded-lg border border-[#D4AF37]/40"
                            />
                            <Eye className="w-3.5 h-3.5" />
                            <span>{isKu ? 'بینینی وێنەی وەسڵ' : 'View Receipt'}</span>
                          </button>
                        ) : (
                          <span className="text-[11px] text-slate-500 italic">
                            {isKu ? 'وێنەی وەسڵ نییە' : 'No receipt image'}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Bottom Actions Row: Approve / Reject / Delete */}
                    <div className="pt-2 border-t border-slate-200/60 dark:border-slate-800/60 flex items-center justify-between gap-2">
                      <div className="text-[11px] text-slate-400">
                        ID: <span className="font-mono">{req.id.slice(0, 10)}</span>
                      </div>

                      <div className="flex items-center gap-2">
                        {isPending && (
                          <>
                            {/* Approve Button */}
                            <button
                              onClick={() => handleApproveRequest(req)}
                              className="px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm cursor-pointer transition active:scale-98"
                            >
                              <Check className="w-3.5 h-3.5" />
                              <span>{isKu ? 'پەسەندکردن' : 'Approve'}</span>
                            </button>

                            {/* Reject Button */}
                            <button
                              onClick={() => handleRejectRequest(req)}
                              className="px-3 py-1.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 font-bold text-xs flex items-center gap-1.5 border border-red-500/30 cursor-pointer transition"
                            >
                              <X className="w-3.5 h-3.5" />
                              <span>{isKu ? 'ڕەتکردنەوە' : 'Reject'}</span>
                            </button>
                          </>
                        )}

                        {/* Delete Button */}
                        <button
                          onClick={() => handleDeleteRequest(req.id)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition cursor-pointer"
                          title={isKu ? 'سڕینەوە' : 'Delete'}
                        >
                          <Trash2 className="w-4 h-4" />
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
      {/* ── TAB 3: ACTIVE & EXPIRED SUBSCRIPTIONS TRACKER ──                    */}
      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'subscriptions' && (
        <div className="space-y-4">
          {subscriptions.length === 0 ? (
            <div
              className={`p-12 text-center rounded-2xl border text-xs text-slate-400 ${
                isDarkMode ? 'bg-[#141C2E] border-slate-800' : 'bg-white border-slate-200'
              }`}
            >
              {isKu ? 'هیچ بەشداریکردنێکی چالاک نییە. لە بەشی بەکارهێنەران یان داواکارییەکان بەشداریکردن چالاک بکە.' : 'No active subscriptions found.'}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 sm:gap-4">
              {subscriptions.map((sub) => {
                const remaining = calculateDaysRemaining(sub.expiresAt, sub.planId);
                const isLifetime = sub.planId === 'lifetime';
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
                      {/* Top: Email, Plan & Status */}
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <div>
                          <div className="font-extrabold text-sm sm:text-base text-inherit">
                            {sub.customerName || sub.businessName}
                          </div>
                          <div className="text-xs text-slate-400 font-mono">{sub.email}</div>
                        </div>

                        {isExpired ? (
                          <span className="text-[10px] font-black px-2.5 py-1 rounded-full bg-red-500/15 text-red-400 border border-red-500/30">
                            {isKu ? 'بەسەرچووە' : 'Expired'}
                          </span>
                        ) : isLifetime ? (
                          <span className="text-[10px] font-black px-2.5 py-1 rounded-full bg-[#D4AF37]/20 text-[#D4AF37] border border-[#D4AF37]/40">
                            {isKu ? 'هەمیشەیی' : 'Lifetime'}
                          </span>
                        ) : (
                          <span className="text-[10px] font-black px-2.5 py-1 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                            {isKu ? 'چالاکە' : 'Active'}
                          </span>
                        )}
                      </div>

                      {/* Timeline & Expiry Calculation */}
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
                      </div>
                    </div>

                    {/* Expiry Progress or Remaining badge */}
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

                      <button
                        onClick={() => setShowActivateModal(sub)}
                        className="px-3 py-1 rounded-lg text-xs font-bold text-[#D4AF37] hover:bg-[#D4AF37]/10 transition border border-[#D4AF37]/30 cursor-pointer"
                      >
                        {isKu ? 'درێژکردنەوە' : 'Extend'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {/* ── MODAL 1: VIEW RECEIPT IMAGE FULL SCREEN ──                          */}
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
              <button
                onClick={() => setPreviewReceipt(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="max-h-[75vh] overflow-auto flex items-center justify-center bg-black/40 rounded-2xl p-2">
              <img
                src={previewReceipt}
                alt="Full Receipt"
                className="max-h-[70vh] w-auto object-contain rounded-xl shadow-lg"
              />
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {/* ── MODAL 2: ADD NEW PAYMENT REQUEST MANUALLY ──                        */}
      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {showNewRequestModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div
            className={`max-w-lg w-full p-5 sm:p-6 rounded-3xl border shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto ${
              isDarkMode ? 'bg-[#141C2E] border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
            }`}
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-200/60 dark:border-slate-800/60">
              <div>
                <h3 className="text-base font-extrabold">{isKu ? 'تۆمارکردنی داواکاریی نوێی پەیمێنت' : 'New Payment Request'}</h3>
                <p className="text-xs text-slate-400">{isKu ? 'زانیاری پارەدانی کڕیار تۆمار بکە لەگەڵ وێنەی وەسڵ' : 'Record payment & receipt proof'}</p>
              </div>
              <button onClick={() => setShowNewRequestModal(false)} className="p-1.5 rounded-xl text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitNewRequest} className="space-y-3.5">
              {formError && (
                <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-medium">
                  {formError}
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1">{isKu ? 'ئیمەیڵی کڕیار (سەرەکی)' : 'Customer Email'} *</label>
                <input
                  type="email"
                  required
                  value={formEmail}
                  onChange={(e) => setFormEmail(e.target.value)}
                  placeholder="customer@example.com"
                  className={`w-full px-3.5 py-2.5 rounded-xl text-xs font-mono outline-none border ${
                    isDarkMode ? 'bg-[#0E1524] border-slate-700 text-white' : 'bg-slate-50 border-slate-200'
                  }`}
                />
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1">{isKu ? 'ناوی کڕیار' : 'Customer Name'}</label>
                  <input
                    type="text"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder={isKu ? 'ئارام کەریم' : 'Customer Name'}
                    className={`w-full px-3.5 py-2.5 rounded-xl text-xs outline-none border ${
                      isDarkMode ? 'bg-[#0E1524] border-slate-700 text-white' : 'bg-slate-50 border-slate-200'
                    }`}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1">{isKu ? 'ژمارەی مۆبایل' : 'Phone'}</label>
                  <input
                    type="text"
                    value={formPhone}
                    onChange={(e) => setFormPhone(e.target.value)}
                    placeholder="0750 000 0000"
                    className={`w-full px-3.5 py-2.5 rounded-xl text-xs font-mono outline-none border ${
                      isDarkMode ? 'bg-[#0E1524] border-slate-700 text-white' : 'bg-slate-50 border-slate-200'
                    }`}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1">{isKu ? 'ناوی بازرگانی' : 'Business Name'}</label>
                  <input
                    type="text"
                    value={formBusiness}
                    onChange={(e) => setFormBusiness(e.target.value)}
                    placeholder={isKu ? 'مارکێتی کوردستان' : 'Business Name'}
                    className={`w-full px-3.5 py-2.5 rounded-xl text-xs outline-none border ${
                      isDarkMode ? 'bg-[#0E1524] border-slate-700 text-white' : 'bg-slate-50 border-slate-200'
                    }`}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1">{isKu ? 'ڕێگەی پارەدان' : 'Method'}</label>
                  <select
                    value={formMethod}
                    onChange={(e) => setFormMethod(e.target.value)}
                    className={`w-full px-3.5 py-2.5 rounded-xl text-xs outline-none border ${
                      isDarkMode ? 'bg-[#0E1524] border-slate-700 text-white' : 'bg-slate-50 border-slate-200'
                    }`}
                  >
                    <option value="FastPay">FastPay</option>
                    <option value="FIB">FIB (First Iraqi Bank)</option>
                    <option value="ZainCash">ZainCash</option>
                    <option value="AsiaHawala">AsiaHawala</option>
                    <option value="Cash">Cash (کاش)</option>
                  </select>
                </div>
              </div>

              {/* Plan Picker */}
              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1">{isKu ? 'پاکێجی داواکراو' : 'Requested Plan'}</label>
                <div className="grid grid-cols-3 gap-2">
                  {SUBSCRIPTION_PLANS.map((plan) => (
                    <button
                      key={plan.id}
                      type="button"
                      onClick={() => setFormPlan(plan.id)}
                      className={`p-2 rounded-xl text-center border text-xs font-bold transition cursor-pointer ${
                        formPlan === plan.id
                          ? 'bg-[#D4AF37] text-slate-950 border-[#D4AF37] shadow-sm'
                          : isDarkMode
                          ? 'bg-[#0E1524] border-slate-700 text-slate-300'
                          : 'bg-slate-50 border-slate-200 text-slate-700'
                      }`}
                    >
                      <div>{isKu ? plan.labelKu : plan.labelEn}</div>
                      <div className="text-[10px] opacity-80 mt-0.5">{isKu ? plan.priceIqd : plan.priceUsd}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Receipt Image Upload */}
              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1">{isKu ? 'وێنەی وەسڵ (Receipt Proof)' : 'Receipt Proof Image'}</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleReceiptFileChange}
                  className="w-full text-xs text-slate-400 file:mr-3 file:py-2 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-[#D4AF37] file:text-slate-950 cursor-pointer"
                />
                {formReceiptBase64 && (
                  <div className="mt-2 flex items-center gap-2">
                    <img src={formReceiptBase64} alt="Preview" className="w-12 h-12 object-cover rounded-lg border border-[#D4AF37]" />
                    <span className="text-xs text-emerald-400 font-bold">{isKu ? 'وێنە بارکرا' : 'Image loaded'}</span>
                  </div>
                )}
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowNewRequestModal(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-700 text-xs font-bold text-slate-400 hover:text-white"
                >
                  {isKu ? 'پاشگەزبوونەوە' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  disabled={formSubmitting}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-tr from-[#D4AF37] to-[#B8860B] text-slate-950 text-xs font-black shadow-md cursor-pointer disabled:opacity-50"
                >
                  {formSubmitting ? (isKu ? 'چاوەڕوان بە...' : 'Submitting...') : (isKu ? 'تۆمارکردن' : 'Submit Request')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {/* ── MODAL 3: ACTIVATE OR EXTEND SUBSCRIPTION FOR USER ──                */}
      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {showActivateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div
            className={`max-w-md w-full p-5 sm:p-6 rounded-3xl border shadow-2xl space-y-4 ${
              isDarkMode ? 'bg-[#141C2E] border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
            }`}
          >
            <div className="flex items-center justify-between pb-2 border-b border-slate-200/60 dark:border-slate-800/60">
              <div>
                <h3 className="text-base font-extrabold">{isKu ? 'چالاککردنی بەشداریکردن' : 'Activate Subscription'}</h3>
                <p className="text-xs text-slate-400 font-mono mt-0.5">{showActivateModal.email}</p>
              </div>
              <button onClick={() => setShowActivateModal(null)} className="p-1 rounded-lg text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleActivateSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1.5">{isKu ? 'پاکێجی بەشداریکردن هەڵبژێرە:' : 'Select Plan:'}</label>
                <div className="grid grid-cols-2 gap-2">
                  {SUBSCRIPTION_PLANS.map((plan) => (
                    <button
                      key={plan.id}
                      type="button"
                      onClick={() => setActivatePlan(plan.id)}
                      className={`p-2.5 rounded-xl text-start border transition cursor-pointer ${
                        activatePlan === plan.id
                          ? 'bg-[#D4AF37] text-slate-950 border-[#D4AF37] font-bold shadow-md'
                          : isDarkMode
                          ? 'bg-[#0E1524] border-slate-700 text-slate-300'
                          : 'bg-slate-50 border-slate-200 text-slate-700'
                      }`}
                    >
                      <div className="text-xs font-bold">{isKu ? plan.labelKu : plan.labelEn}</div>
                      <div className="text-[10px] opacity-80">{isKu ? plan.priceIqd : plan.priceUsd}</div>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1">{isKu ? 'تێبینی' : 'Notes'}</label>
                <input
                  type="text"
                  value={activateNotes}
                  onChange={(e) => setActivateNotes(e.target.value)}
                  placeholder={isKu ? 'بۆ نموونە: پارەی دراوە بە کاش لە ئۆفیس' : 'Notes'}
                  className={`w-full px-3.5 py-2.5 rounded-xl text-xs outline-none border ${
                    isDarkMode ? 'bg-[#0E1524] border-slate-700 text-white' : 'bg-slate-50 border-slate-200'
                  }`}
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowActivateModal(null)}
                  className="px-4 py-2.5 rounded-xl border border-slate-700 text-xs font-bold text-slate-400 hover:text-white"
                >
                  {isKu ? 'پاشگەزبوونەوە' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  disabled={activateSubmitting}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-tr from-[#D4AF37] to-[#B8860B] text-slate-950 text-xs font-black shadow-md cursor-pointer disabled:opacity-50"
                >
                  {activateSubmitting ? (isKu ? 'چاوەڕوان بە...' : 'Activating...') : (isKu ? 'چالاککردنی خزمەتگوزاری' : 'Activate Plan')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
