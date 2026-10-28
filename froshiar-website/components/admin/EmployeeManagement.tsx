'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Users,
  UserPlus,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Lock,
  Unlock,
  Eye,
  EyeOff,
  Smartphone,
  Check,
  CheckCircle2,
  X,
  XCircle,
  Trash2,
  Edit3,
  Copy,
  Search,
  RefreshCw,
  AlertCircle,
  Key,
  Mail,
  Settings,
  Calendar,
  ChevronDown,
  Power,
  Sparkles,
  Laptop,
  Clock,
  ArrowRight,
  ArrowLeft,
  Sliders,
  DollarSign,
  ShoppingCart,
  Receipt,
  RotateCcw,
  Globe,
  Phone,
  MessageCircle,
  Infinity as InfinityIcon,
  Store,
  Layers,
  ArrowUpDown,
  AlertTriangle,
} from 'lucide-react';
import { getClientFirestore } from '@/lib/firebase';
import {
  collection,
  doc,
  getDocs,
  setDoc,
  deleteDoc,
  onSnapshot,
  query,
} from 'firebase/firestore';

export type PermissionState = 'active' | 'disabled' | 'hidden';

export interface EmployeeUsageLimits {
  maxItems: number | 'unlimited';
  maxQuantity: number | 'unlimited';
  maxSales: number | 'unlimited';
  maxInvoices: number | 'unlimited';
  maxQuotations: number | 'unlimited';
}

export interface OnlineStoreConfig {
  enabled: boolean;
  storeName: string;
  subdomain: string;
  status: 'active' | 'suspended';
  activatedAt?: string;
  expiresAt?: string;
}

export interface EmployeePermissions {
  // Modules
  sales: PermissionState;
  purchases: PermissionState;
  inventory: PermissionState;
  reports: PermissionState;
  history: PermissionState;
  invoices: PermissionState;
  debts: PermissionState;
  expenses: PermissionState;
  quotations: PermissionState;
  dashboard: PermissionState;
  onlineStore: PermissionState;

  // Actions
  canDeleteInvoice: boolean;

  // Granular Settings items (button-by-button)
  settingsLanguage: PermissionState;
  settingsProfile: PermissionState;
  settingsCurrency: PermissionState;
  settingsTheme: PermissionState;
  settingsBackup: PermissionState;
  settingsDeleteAccount: PermissionState;
}

export interface EmployeeAccount {
  id: string;
  email: string;
  displayName: string;
  managerEmail: string;
  password?: string;
  phone?: string;
  priceAmount?: string;
  durationDays?: number;
  expiresAt?: string;
  status: 'active' | 'suspended';
  managerStatus?: 'active' | 'suspended';
  limits?: EmployeeUsageLimits;
  onlineStore?: OnlineStoreConfig;
  createdAt: string;
  lastLoginAt?: string;
  lastLogoutAt?: string;
  deviceModel?: string;
  deviceName?: string;
  permissions: EmployeePermissions;
}

export const DEFAULT_LIMITS: EmployeeUsageLimits = {
  maxItems: 20,
  maxQuantity: 30,
  maxSales: 15,
  maxInvoices: 40,
  maxQuotations: 5,
};

export const DEFAULT_PERMISSIONS: EmployeePermissions = {
  sales: 'active',
  purchases: 'active',
  inventory: 'active',
  reports: 'disabled',
  history: 'active',
  invoices: 'active',
  debts: 'active',
  expenses: 'active',
  quotations: 'active',
  dashboard: 'active',
  onlineStore: 'disabled',

  canDeleteInvoice: false,

  settingsLanguage: 'disabled',
  settingsProfile: 'hidden',
  settingsCurrency: 'hidden',
  settingsTheme: 'active',
  settingsBackup: 'hidden',
  settingsDeleteAccount: 'hidden',
};

const MODULE_ITEMS: Array<{
  key: keyof EmployeePermissions;
  labelKu: string;
  labelEn: string;
  descKu: string;
}> = [
  { key: 'sales', labelKu: 'فرۆشتن و کاشێر', labelEn: 'Sales & POS', descKu: 'تۆمارکردنی پسوڵەی نوێ و فرۆشتنی کاڵا' },
  { key: 'purchases', labelKu: 'کڕین و دابینکەران', labelEn: 'Purchases & Bills', descKu: 'تۆمارکردنی پسوڵەی کڕین لە وەکیل' },
  { key: 'inventory', labelKu: 'کۆگا و کاڵاکان', labelEn: 'Inventory & Stock', descKu: 'بینینی عەمبار، زیادکردنی کاڵا، بارکۆد' },
  { key: 'reports', labelKu: 'ڕاپۆرت و قازانج', labelEn: 'Reports & Profit', descKu: 'ئامار و قازانجی ڕاستەقینە و داهات' },
  { key: 'history', labelKu: 'مێژووی جووڵەکان', labelEn: 'Movement History', descKu: 'مێژووی فرۆشتنەکان و کڕینەکان' },
  { key: 'invoices', labelKu: 'وەسڵ و پسوڵەکان', labelEn: 'Invoices & Slips', descKu: 'بینین و چاپکردنی پسوڵەکان' },
  { key: 'debts', labelKu: 'قەرز و باڵانس', labelEn: 'Debts & Accounts', descKu: 'قەرزی کڕیاران و حیساباتی وەکیلەکان' },
  { key: 'expenses', labelKu: 'خەرجییەکان', labelEn: 'Expenses', descKu: 'خەرجی ڕۆژانە و کرێ و مووچە' },
  { key: 'quotations', labelKu: 'عەرز و ئۆفەر', labelEn: 'Quotations', descKu: 'دروستکردنی پێشنیاری نرخ بۆ کڕیار' },
  { key: 'dashboard', labelKu: 'داشبۆردی سەرەکی', labelEn: 'Main Dashboard', descKu: 'پوختەی سەرەکی و هۆمی ئەپەکە' },
  { key: 'onlineStore', labelKu: 'فرۆشگای ئۆنلاین', labelEn: 'Online Storefront', descKu: 'بەڕێوەبردنی کاڵا و فرۆشگای سەر وێب' },
];

const SETTINGS_ITEMS: Array<{
  key: keyof EmployeePermissions;
  labelKu: string;
  labelEn: string;
  descKu: string;
}> = [
  { key: 'settingsProfile', labelKu: 'پڕۆفایل و ناوی مارکێت', labelEn: 'Profile & Store Name', descKu: 'گۆڕینی ناوی مارکێت، لۆگۆ و ناونیشان' },
  { key: 'settingsLanguage', labelKu: 'گۆڕینی زمان (کوردی/ئینگلیزی)', labelEn: 'Language Switch', descKu: 'دەسەڵاتی گۆڕینی زمانی سیستەم' },
  { key: 'settingsCurrency', labelKu: 'دراو و نرخی دۆلار', labelEn: 'Currency & Exchange Rate', descKu: 'دیاریکردنی دراوی بنەڕەتی و نرخی ئاڵوگۆڕ' },
  { key: 'settingsTheme', labelKu: 'دۆخی تاریک / ڕۆشن', labelEn: 'Theme Light / Dark', descKu: 'گۆڕینی ڕەنگ و ڕووکاری سیستەم' },
  { key: 'settingsBackup', labelKu: 'باک ئەپ و گۆگڵ درایڤ', labelEn: 'Backup & Cloud Sync', descKu: 'کۆپی یەدەگ و بەستنەوەی هەور' },
  { key: 'settingsDeleteAccount', labelKu: 'سڕینەوەی ئەکاونت و داتا', labelEn: 'Reset & Delete Data', descKu: 'سڕینەوەی سەرجەم داتا و مێژووی سیستەم' },
];

function getCleanDocId(email: string): string {
  return email.trim().toLowerCase().replace(/[^a-z0-9_]/gi, '_');
}

interface EmployeeManagementProps {
  isDarkMode: boolean;
  language: 'ku' | 'en';
}

export default function EmployeeManagement({ isDarkMode, language }: EmployeeManagementProps) {
  const isKu = language === 'ku';

  // Real-time State
  const [employees, setEmployees] = useState<EmployeeAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'suspended' | 'expired'>('all');
  const [selectedManagerFilter, setSelectedManagerFilter] = useState<string>('all');

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isRenewModalOpen, setIsRenewModalOpen] = useState(false);
  const [isPermModalOpen, setIsPermModalOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<EmployeeAccount | null>(null);

  // Add / Edit Form State
  const [formName, setFormName] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formPassword, setFormPassword] = useState('');
  const [formManagerEmail, setFormManagerEmail] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formPrice, setFormPrice] = useState('');
  const [formDuration, setFormDuration] = useState<number>(30); // days
  const [formExpiresAt, setFormExpiresAt] = useState<string>('');

  // Limits in form
  const [formLimits, setFormLimits] = useState<EmployeeUsageLimits>(DEFAULT_LIMITS);
  const [unlimitedItems, setUnlimitedItems] = useState(false);
  const [unlimitedQuantity, setUnlimitedQuantity] = useState(false);
  const [unlimitedSales, setUnlimitedSales] = useState(false);
  const [unlimitedInvoices, setUnlimitedInvoices] = useState(false);
  const [unlimitedQuotations, setUnlimitedQuotations] = useState(false);

  // Online Store in form
  const [storeEnabled, setStoreEnabled] = useState(false);
  const [storeName, setStoreName] = useState('');
  const [storeSubdomain, setStoreSubdomain] = useState('');

  // Submission helpers
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Renew modal state
  const [renewDays, setRenewDays] = useState<number>(30);
  const [renewPrice, setRenewPrice] = useState<string>('');
  const [renewing, setRenewing] = useState(false);

  // Permissions modal state
  const [editingPermissions, setEditingPermissions] = useState<EmployeePermissions>(DEFAULT_PERMISSIONS);
  const [permTab, setPermTab] = useState<'modules' | 'settings' | 'actions'>('modules');
  const [savingPerms, setSavingPerms] = useState(false);

  // Copy feedback
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Live Subscription
  useEffect(() => {
    setLoading(true);
    const db = getClientFirestore();
    if (!db) {
      setLoading(false);
      return;
    }

    try {
      const colRef = collection(db, 'employee_accounts');
      const q = query(colRef);

      const unsubscribe = onSnapshot(
        q,
        (snapshot) => {
          const list: EmployeeAccount[] = [];
          snapshot.forEach((docSnap) => {
            const data = docSnap.data() as EmployeeAccount;
            if (data && data.email) {
              list.push({
                ...data,
                id: docSnap.id,
                permissions: {
                  ...DEFAULT_PERMISSIONS,
                  ...(data.permissions || {}),
                },
                limits: data.limits || DEFAULT_LIMITS,
              });
            }
          });
          list.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
          setEmployees(list);
          setLoading(false);
        },
        (error) => {
          console.error('Error fetching employees:', error);
          setLoading(false);
        }
      );

      return () => unsubscribe();
    } catch (e) {
      console.error('Snapshot init error:', e);
      setLoading(false);
    }
  }, []);

  // Unique list of managers
  const managerList = useMemo(() => {
    const map = new Map<string, number>();
    employees.forEach((emp) => {
      const mgr = (emp.managerEmail || '').trim().toLowerCase();
      if (mgr) {
        map.set(mgr, (map.get(mgr) || 0) + 1);
      }
    });
    return Array.from(map.entries()).map(([email, count]) => ({ email, count }));
  }, [employees]);

  // Helper: Is account expired
  const isAccountExpired = (emp: EmployeeAccount) => {
    if (!emp.expiresAt) return false;
    const exp = new Date(emp.expiresAt).getTime();
    return exp > 0 && exp < Date.now();
  };

  // Helper: Remaining days
  const getRemainingDays = (emp: EmployeeAccount) => {
    if (!emp.expiresAt) return null;
    const ms = new Date(emp.expiresAt).getTime() - Date.now();
    return Math.ceil(ms / (1000 * 60 * 60 * 24));
  };

  // Filtered employees
  const filteredEmployees = useMemo(() => {
    return employees.filter((emp) => {
      const matchesSearch =
        (emp.displayName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (emp.email || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (emp.phone || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (emp.managerEmail || '').toLowerCase().includes(searchQuery.toLowerCase());

      const expired = isAccountExpired(emp);
      const isSuspended = emp.status === 'suspended' || emp.managerStatus === 'suspended';

      let matchesStatus = true;
      if (statusFilter === 'active') {
        matchesStatus = !isSuspended && !expired;
      } else if (statusFilter === 'suspended') {
        matchesStatus = isSuspended;
      } else if (statusFilter === 'expired') {
        matchesStatus = expired;
      }

      const matchesManager =
        selectedManagerFilter === 'all'
          ? true
          : (emp.managerEmail || '').trim().toLowerCase() === selectedManagerFilter;

      return matchesSearch && matchesStatus && matchesManager;
    });
  }, [employees, searchQuery, statusFilter, selectedManagerFilter]);

  // KPIs
  const stats = useMemo(() => {
    const total = employees.length;
    const active = employees.filter((e) => e.status === 'active' && e.managerStatus !== 'suspended' && !isAccountExpired(e)).length;
    const suspended = employees.filter((e) => e.status === 'suspended' || e.managerStatus === 'suspended').length;
    const expiredCount = employees.filter((e) => isAccountExpired(e)).length;
    return { total, active, suspended, expiredCount };
  }, [employees]);

  // Toggle Employee Status
  const handleToggleStatus = async (emp: EmployeeAccount) => {
    const db = getClientFirestore();
    if (!db) return;
    const nextStatus = emp.status === 'active' ? 'suspended' : 'active';
    try {
      const docRef = doc(db, 'employee_accounts', emp.id || getCleanDocId(emp.email));
      await setDoc(docRef, { status: nextStatus }, { merge: true });
    } catch (e) {
      console.error('Failed to toggle status:', e);
      alert(isKu ? 'هەڵەیەک ڕوویدا لە گۆڕینی دۆخ' : 'Failed to update status');
    }
  };

  // Toggle Manager Cascaded Suspension
  const handleToggleManagerSuspension = async (managerEmail: string, currentStatus: 'active' | 'suspended') => {
    const nextStatus = currentStatus === 'active' ? 'suspended' : 'active';
    const confirmMsg = isKu
      ? `ئایا دڵنیایت لە ${nextStatus === 'suspended' ? 'وەستاندنی' : 'چالاککردنەوەی'} بەڕێوەبەر (${managerEmail})؟ بەم کارە هەموو ئەو کارمەندانەی لەسەر ئەم بەڕێوەبەرەن یەکسەر ${nextStatus === 'suspended' ? 'قفڵ دەبن' : 'چالاک دەبنەوە'}.`
      : `Are you sure you want to ${nextStatus} manager (${managerEmail}) and all linked employees?`;

    if (!window.confirm(confirmMsg)) return;

    const db = getClientFirestore();
    if (!db) return;

    try {
      const cleanManager = managerEmail.trim().toLowerCase();
      const colRef = collection(db, 'employee_accounts');
      const snap = await getDocs(colRef);

      const promises: Promise<any>[] = [];
      snap.forEach((d) => {
        const data = d.data() as EmployeeAccount;
        if ((data.managerEmail || '').trim().toLowerCase() === cleanManager) {
          promises.push(
            setDoc(doc(db, 'employee_accounts', d.id), { managerStatus: nextStatus }, { merge: true })
          );
        }
      });
      await Promise.all(promises);
    } catch (e) {
      console.error('Failed to toggle manager suspension:', e);
      alert(isKu ? 'هەڵەیەک ڕوویدا' : 'Failed to cascade manager status');
    }
  };

  // Delete Employee
  const handleDeleteEmployee = async (emp: EmployeeAccount) => {
    const confirmMsg = isKu
      ? `ئایا دڵنیایت لە سڕینەوەی تەواوەتی کارمەند "${emp.displayName}"؟ ئەم کارە ناگەڕێتەوە.`
      : `Are you sure you want to permanently delete employee "${emp.displayName}"?`;

    if (!window.confirm(confirmMsg)) return;

    const db = getClientFirestore();
    if (!db) return;

    try {
      const docRef = doc(db, 'employee_accounts', emp.id || getCleanDocId(emp.email));
      await deleteDoc(docRef);
    } catch (e) {
      console.error('Failed to delete employee:', e);
      alert(isKu ? 'هەڵەیەک ڕوویدا لە سڕینەوە' : 'Failed to delete employee');
    }
  };

  // Toggle Online Store status
  const handleToggleOnlineStore = async (emp: EmployeeAccount) => {
    const db = getClientFirestore();
    if (!db) return;

    const currentStore = emp.onlineStore || {
      enabled: false,
      storeName: emp.displayName,
      subdomain: getCleanDocId(emp.displayName),
      status: 'suspended' as const,
    };
    const nextStatus = currentStore.status === 'active' ? 'suspended' : 'active';

    try {
      const docRef = doc(db, 'employee_accounts', emp.id || getCleanDocId(emp.email));
      await setDoc(
        docRef,
        {
          onlineStore: {
            ...currentStore,
            enabled: true,
            status: nextStatus,
          },
        },
        { merge: true }
      );
    } catch (e) {
      console.error('Failed to toggle online store:', e);
      alert(isKu ? 'هەڵەیەک ڕوویدا لە گۆڕینی ستۆری ئۆنلاین' : 'Failed to update store');
    }
  };

  // Open Edit Modal
  const handleOpenEdit = (emp: EmployeeAccount) => {
    setSelectedEmployee(emp);
    setFormName(emp.displayName || '');
    setFormEmail(emp.email || '');
    setFormPassword(emp.password || '');
    setFormManagerEmail(emp.managerEmail || '');
    setFormPhone(emp.phone || '');
    setFormPrice(emp.priceAmount || '');
    setFormExpiresAt(emp.expiresAt || '');

    const limits = emp.limits || DEFAULT_LIMITS;
    setFormLimits(limits);
    setUnlimitedItems(limits.maxItems === 'unlimited');
    setUnlimitedQuantity(limits.maxQuantity === 'unlimited');
    setUnlimitedSales(limits.maxSales === 'unlimited');
    setUnlimitedInvoices(limits.maxInvoices === 'unlimited');
    setUnlimitedQuotations(limits.maxQuotations === 'unlimited');

    const store = emp.onlineStore;
    setStoreEnabled(store?.enabled || false);
    setStoreName(store?.storeName || '');
    setStoreSubdomain(store?.subdomain || '');

    setFormError(null);
    setIsEditModalOpen(true);
  };

  // Save Edit
  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEmployee) return;

    const db = getClientFirestore();
    if (!db) return;

    setSubmitting(true);
    setFormError(null);

    try {
      const docRef = doc(db, 'employee_accounts', selectedEmployee.id || getCleanDocId(selectedEmployee.email));

      const updatedLimits: EmployeeUsageLimits = {
        maxItems: unlimitedItems ? 'unlimited' : Number(formLimits.maxItems) || 20,
        maxQuantity: unlimitedQuantity ? 'unlimited' : Number(formLimits.maxQuantity) || 30,
        maxSales: unlimitedSales ? 'unlimited' : Number(formLimits.maxSales) || 15,
        maxInvoices: unlimitedInvoices ? 'unlimited' : Number(formLimits.maxInvoices) || 40,
        maxQuotations: unlimitedQuotations ? 'unlimited' : Number(formLimits.maxQuotations) || 5,
      };

      const updatedStore: OnlineStoreConfig | undefined = storeEnabled
        ? {
            enabled: true,
            storeName: storeName.trim() || selectedEmployee.displayName,
            subdomain: storeSubdomain.trim() || getCleanDocId(selectedEmployee.displayName),
            status: selectedEmployee.onlineStore?.status || 'active',
          }
        : undefined;

      const payload: Partial<EmployeeAccount> = {
        displayName: formName.trim(),
        email: formEmail.trim().toLowerCase(),
        password: formPassword.trim(),
        managerEmail: formManagerEmail.trim().toLowerCase(),
        phone: formPhone.trim(),
        priceAmount: formPrice.trim(),
        expiresAt: formExpiresAt || undefined,
        limits: updatedLimits,
        onlineStore: updatedStore,
      };

      await setDoc(docRef, payload, { merge: true });
      setIsEditModalOpen(false);
      setSelectedEmployee(null);
    } catch (err: any) {
      console.error('Error updating employee:', err);
      setFormError(err?.message || (isKu ? 'هەڵەیەک ڕوویدا' : 'Failed to update'));
    } finally {
      setSubmitting(false);
    }
  };

  // Open Renew Modal
  const handleOpenRenew = (emp: EmployeeAccount) => {
    setSelectedEmployee(emp);
    setRenewDays(30);
    setRenewPrice(emp.priceAmount || '');
    setIsRenewModalOpen(true);
  };

  // Execute Renewal
  const handleSaveRenew = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEmployee) return;

    const db = getClientFirestore();
    if (!db) return;

    setRenewing(true);
    try {
      let baseDate = new Date();
      if (selectedEmployee.expiresAt && new Date(selectedEmployee.expiresAt).getTime() > Date.now()) {
        baseDate = new Date(selectedEmployee.expiresAt);
      }
      baseDate.setDate(baseDate.getDate() + Number(renewDays));
      const newExpiresAt = baseDate.toISOString();

      const docRef = doc(db, 'employee_accounts', selectedEmployee.id || getCleanDocId(selectedEmployee.email));
      await setDoc(
        docRef,
        {
          expiresAt: newExpiresAt,
          status: 'active',
          priceAmount: renewPrice.trim() || selectedEmployee.priceAmount,
        },
        { merge: true }
      );

      setIsRenewModalOpen(false);
      setSelectedEmployee(null);
    } catch (err) {
      console.error('Error renewing subscription:', err);
      alert(isKu ? 'هەڵەیەک ڕوویدا لە نوێکردنەوە' : 'Failed to renew');
    } finally {
      setRenewing(false);
    }
  };

  // Open Permissions Modal
  const handleOpenPermissions = (emp: EmployeeAccount) => {
    setSelectedEmployee(emp);
    setEditingPermissions({
      ...DEFAULT_PERMISSIONS,
      ...(emp.permissions || {}),
    });
    setPermTab('modules');
    setIsPermModalOpen(true);
  };

  // Save Permissions
  const handleSavePermissions = async () => {
    if (!selectedEmployee) return;
    const db = getClientFirestore();
    if (!db) return;

    setSavingPerms(true);
    try {
      const docRef = doc(db, 'employee_accounts', selectedEmployee.id || getCleanDocId(selectedEmployee.email));
      await setDoc(docRef, { permissions: editingPermissions }, { merge: true });
      setIsPermModalOpen(false);
      setSelectedEmployee(null);
    } catch (e) {
      console.error('Failed to save permissions:', e);
      alert(isKu ? 'هەڵەیەک ڕوویدا لە پاشەکەوتکردنی دەسەڵاتەکان' : 'Failed to save permissions');
    } finally {
      setSavingPerms(false);
    }
  };

  // Open Add Modal
  const handleOpenAdd = () => {
    setFormName('');
    setFormEmail('');
    setFormPassword('');
    setFormManagerEmail('');
    setFormPhone('');
    setFormPrice('');
    setFormDuration(30);

    const future = new Date();
    future.setDate(future.getDate() + 30);
    setFormExpiresAt(future.toISOString().split('T')[0]);

    setFormLimits(DEFAULT_LIMITS);
    setUnlimitedItems(false);
    setUnlimitedQuantity(false);
    setUnlimitedSales(false);
    setUnlimitedInvoices(false);
    setUnlimitedQuotations(false);

    setStoreEnabled(false);
    setStoreName('');
    setStoreSubdomain('');

    setFormError(null);
    setIsAddModalOpen(true);
  };

  // Execute Add
  const handleSaveAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim() || !formEmail.trim() || !formPassword.trim() || !formManagerEmail.trim()) {
      setFormError(isKu ? 'تکایە هەموو خانە سەرەکییەکان پڕبکەرەوە' : 'Please fill all required fields');
      return;
    }

    const cleanEmail = formEmail.trim().toLowerCase();
    const docId = getCleanDocId(cleanEmail);

    const db = getClientFirestore();
    if (!db) return;

    setSubmitting(true);
    setFormError(null);

    try {
      const updatedLimits: EmployeeUsageLimits = {
        maxItems: unlimitedItems ? 'unlimited' : Number(formLimits.maxItems) || 20,
        maxQuantity: unlimitedQuantity ? 'unlimited' : Number(formLimits.maxQuantity) || 30,
        maxSales: unlimitedSales ? 'unlimited' : Number(formLimits.maxSales) || 15,
        maxInvoices: unlimitedInvoices ? 'unlimited' : Number(formLimits.maxInvoices) || 40,
        maxQuotations: unlimitedQuotations ? 'unlimited' : Number(formLimits.maxQuotations) || 5,
      };

      const updatedStore: OnlineStoreConfig | undefined = storeEnabled
        ? {
            enabled: true,
            storeName: storeName.trim() || formName.trim(),
            subdomain: storeSubdomain.trim() || getCleanDocId(formName.trim()),
            status: 'active',
          }
        : undefined;

      const expDate = formExpiresAt
        ? new Date(formExpiresAt).toISOString()
        : new Date(Date.now() + formDuration * 24 * 60 * 60 * 1000).toISOString();

      const newAccount: EmployeeAccount = {
        id: `emp_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        email: cleanEmail,
        displayName: formName.trim(),
        password: formPassword.trim(),
        managerEmail: formManagerEmail.trim().toLowerCase(),
        phone: formPhone.trim(),
        priceAmount: formPrice.trim(),
        durationDays: formDuration,
        expiresAt: expDate,
        status: 'active',
        limits: updatedLimits,
        onlineStore: updatedStore,
        permissions: DEFAULT_PERMISSIONS,
        createdAt: new Date().toISOString(),
      };

      const docRef = doc(db, 'employee_accounts', docId);
      await setDoc(docRef, newAccount, { merge: true });

      setIsAddModalOpen(false);
    } catch (err: any) {
      console.error('Error adding employee:', err);
      setFormError(err?.message || (isKu ? 'هەڵەیەک ڕوویدا' : 'Failed to add employee'));
    } finally {
      setSubmitting(false);
    }
  };

  // WhatsApp quick reminder
  const handleSendWhatsApp = (emp: EmployeeAccount) => {
    if (!emp.phone) {
      alert(isKu ? 'ژمارەی مۆبایل تۆمار نەکراوە' : 'No phone number available');
      return;
    }
    const cleanPhone = emp.phone.replace(/[^0-9]/g, '');
    const dateFormatted = emp.expiresAt ? new Date(emp.expiresAt).toLocaleDateString(isKu ? 'ckb' : 'en-US') : '—';
    const text = isKu
      ? `سڵاو بەڕێز ${emp.displayName} 🌟\nئاگاداری لە سیستەمی فرۆشیارەوە:\nماوەی بەشداریکردنی فرۆشگاکەت لە بەرواری (${dateFormatted}) بەسەردەچێت.\nبڕی پارەی دیاریکراو: ${emp.priceAmount || 'دیارینەکراو'}\nتکایە پەیوەندیمان پێوە بکە بۆ نوێکردنەوە تاوەکو سیستەمەکەت بەردەوام چالاک بێت.`
      : `Hello ${emp.displayName},\nNotice from Froshiar: Your subscription will expire on ${dateFormatted}. Amount due: ${emp.priceAmount || '—'}. Please contact us to renew.`;

    window.open(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(text)}`, '_blank');
  };

  // Copy helper
  const handleCopyCredentials = (emp: EmployeeAccount) => {
    const text = `🔹 هەژماری کارمەندی فرۆشیار\n👤 ناو: ${emp.displayName}\n📧 ئیمەیڵ: ${emp.email}\n🔑 تێپەڕەوشە: ${emp.password || '••••••••'}\n👑 بەڕێوەبەر: ${emp.managerEmail}\n🗓️ بەسەرچوون: ${emp.expiresAt ? new Date(emp.expiresAt).toLocaleDateString() : 'بێ سنوور'}`;
    navigator.clipboard.writeText(text);
    setCopiedId(emp.id);
    setTimeout(() => setCopiedId(null), 2500);
  };

  return (
    <div className="space-y-6">
      {/* ── Top Header Section ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-purple-600 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-purple-500/20 shrink-0">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-black tracking-tight">
                {isKu ? 'مەنجمێنت، بەشداریکردن و دەسەڵاتەکان' : 'Employee & Subscription Management'}
              </h1>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-purple-500/15 text-purple-400 border border-purple-500/30">
                Enterprise RBAC
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-400">
              {isKu
                ? 'کۆنترۆڵی پارەدان، کاتی بەسەرچوون، لیمیتی ئایتم و فرۆشتن، ستۆری ئۆنلاین و دەسەڵاتی کارمەندان'
                : 'Fine-grained RBAC, pricing, custom usage limits, online storefront, and real-time manager synchronization'}
            </p>
          </div>
        </div>

        {/* Action Button: Add Employee */}
        <button
          onClick={handleOpenAdd}
          className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs sm:text-sm font-bold shadow-lg shadow-purple-500/25 flex items-center justify-center gap-2 transition cursor-pointer shrink-0"
        >
          <UserPlus className="w-4 h-4" />
          <span>{isKu ? '+ زیادکردنی ئەکاونتی نوێ' : '+ Add New Account'}</span>
        </button>
      </div>

      {/* ── KPI Stat Cards ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        {/* Total Accounts */}
        <div
          className={`p-4 rounded-2xl border transition ${
            isDarkMode ? 'bg-[#141C2E] border-slate-800' : 'bg-white border-slate-200'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">
              {isKu ? 'کۆی ئەکاونتەکان' : 'Total Accounts'}
            </span>
            <div className="w-8 h-8 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-black">{stats.total}</div>
          <div className="text-[11px] text-slate-400 mt-0.5">
            {managerList.length} {isKu ? 'بەڕێوەبەری سەرپەرشتیار' : 'Managers'}
          </div>
        </div>

        {/* Active Accounts */}
        <div
          className={`p-4 rounded-2xl border transition ${
            isDarkMode ? 'bg-[#141C2E] border-slate-800' : 'bg-white border-slate-200'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">
              {isKu ? 'چالاک و لەکاردا' : 'Active Accounts'}
            </span>
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-black text-emerald-500">{stats.active}</div>
          <div className="text-[11px] text-slate-400 mt-0.5">
            {isKu ? 'مۆڵەتی کارپێکردن تەواوە' : 'Valid subscriptions'}
          </div>
        </div>

        {/* Expired Accounts */}
        <div
          className={`p-4 rounded-2xl border transition ${
            isDarkMode ? 'bg-[#141C2E] border-slate-800' : 'bg-white border-slate-200'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">
              {isKu ? 'بەسەرچووەکان' : 'Expired'}
            </span>
            <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-black text-amber-500">{stats.expiredCount}</div>
          <div className="text-[11px] text-slate-400 mt-0.5">
            {isKu ? 'پێویستیان بە تازەکردنەوەیە' : 'Need subscription renewal'}
          </div>
        </div>

        {/* Suspended Accounts */}
        <div
          className={`p-4 rounded-2xl border transition ${
            isDarkMode ? 'bg-[#141C2E] border-slate-800' : 'bg-white border-slate-200'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">
              {isKu ? 'ڕاگیراوەکان (وەستاو)' : 'Suspended'}
            </span>
            <div className="w-8 h-8 rounded-xl bg-rose-500/10 text-rose-400 flex items-center justify-center">
              <ShieldAlert className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-black text-rose-500">{stats.suspended}</div>
          <div className="text-[11px] text-slate-400 mt-0.5">
            {isKu ? 'قفڵکراو لەلایەن ئەدمینەوە' : 'Locked out on mobile'}
          </div>
        </div>
      </div>

      {/* ── Search, Filters, and Manager Selector ── */}
      <div
        className={`p-4 rounded-2xl border flex flex-col md:flex-row items-center justify-between gap-3 ${
          isDarkMode ? 'bg-[#141C2E] border-slate-800' : 'bg-white border-slate-200'
        }`}
      >
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 absolute top-1/2 -translate-y-1/2 start-3 text-slate-400" />
          <input
            type="text"
            placeholder={isKu ? 'گەڕان بەپێی ناو، ئیمەیڵ، مۆبایل، بەڕێوەبەر...' : 'Search by name, email, phone, manager...'}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={`w-full ps-9 pe-4 py-2 rounded-xl text-xs sm:text-sm border outline-none transition ${
              isDarkMode
                ? 'bg-[#0E1524] border-slate-800 text-slate-100 focus:border-purple-500'
                : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-purple-500'
            }`}
          />
        </div>

        {/* Manager Filter Dropdown */}
        <div className="flex items-center gap-2 w-full md:w-auto flex-wrap justify-end">
          <select
            value={selectedManagerFilter}
            onChange={(e) => setSelectedManagerFilter(e.target.value)}
            className={`px-3 py-2 rounded-xl text-xs font-semibold border outline-none cursor-pointer ${
              isDarkMode ? 'bg-[#0E1524] border-slate-800 text-slate-200' : 'bg-slate-50 border-slate-200 text-slate-800'
            }`}
          >
            <option value="all">{isKu ? 'هەموو بەڕێوەبەرەکان' : 'All Managers'}</option>
            {managerList.map((mgr) => (
              <option key={mgr.email} value={mgr.email}>
                {mgr.email} ({mgr.count} {isKu ? 'کارمەند' : 'staff'})
              </option>
            ))}
          </select>

          {/* Status Tabs */}
          <div className="flex items-center p-1 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-800 text-xs font-semibold">
            <button
              onClick={() => setStatusFilter('all')}
              className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
                statusFilter === 'all' ? 'bg-purple-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {isKu ? 'هەموو' : 'All'}
            </button>
            <button
              onClick={() => setStatusFilter('active')}
              className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
                statusFilter === 'active' ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {isKu ? 'چالاک' : 'Active'}
            </button>
            <button
              onClick={() => setStatusFilter('expired')}
              className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
                statusFilter === 'expired' ? 'bg-amber-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {isKu ? 'بەسەرچوو' : 'Expired'}
            </button>
            <button
              onClick={() => setStatusFilter('suspended')}
              className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
                statusFilter === 'suspended' ? 'bg-rose-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {isKu ? 'وەستاو' : 'Suspended'}
            </button>
          </div>
        </div>
      </div>

      {/* ── Employee Cards Grid ── */}
      {loading ? (
        <div className="py-16 text-center text-slate-400 flex flex-col items-center gap-3">
          <RefreshCw className="w-8 h-8 animate-spin text-purple-500" />
          <span className="text-sm">{isKu ? 'بارکردنی ئەکاونتەکان...' : 'Loading accounts...'}</span>
        </div>
      ) : filteredEmployees.length === 0 ? (
        <div
          className={`py-16 text-center rounded-2xl border ${
            isDarkMode ? 'bg-[#141C2E] border-slate-800' : 'bg-white border-slate-200'
          }`}
        >
          <div className="w-14 h-14 rounded-2xl bg-purple-500/10 text-purple-400 flex items-center justify-center mx-auto mb-3">
            <Users className="w-7 h-7" />
          </div>
          <h3 className="text-base font-bold text-slate-200">
            {isKu ? 'هیچ ئەکاونتێک نەدۆزرایەوە' : 'No accounts found'}
          </h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto mt-1 mb-4">
            {isKu
              ? 'دەتوانیت بە کلیک لەسەر "+ زیادکردنی ئەکاونتی نوێ" یەکەم ئەکاونت زیاد بکەیت.'
              : 'Add your first account using the button above.'}
          </p>
          <button
            onClick={handleOpenAdd}
            className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold transition cursor-pointer"
          >
            {isKu ? '+ دروستکردنی ئەکاونت' : '+ Create Account'}
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {filteredEmployees.map((emp) => {
            const isSuspended = emp.status === 'suspended' || emp.managerStatus === 'suspended';
            const isExpired = isAccountExpired(emp);
            const remaining = getRemainingDays(emp);

            return (
              <div
                key={emp.id}
                className={`p-5 rounded-2xl border transition-all flex flex-col justify-between ${
                  isDarkMode ? 'bg-[#141C2E] border-slate-800 hover:border-slate-700' : 'bg-white border-slate-200 hover:border-slate-300'
                } ${isSuspended ? 'border-rose-500/40 bg-rose-500/5' : isExpired ? 'border-amber-500/40 bg-amber-500/5' : ''}`}
              >
                <div>
                  {/* Top row: Avatar, Name, Status Badge, WhatsApp */}
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={`w-11 h-11 rounded-2xl flex items-center justify-center text-white font-black text-base shrink-0 shadow-sm ${
                          isSuspended
                            ? 'bg-rose-600'
                            : isExpired
                            ? 'bg-amber-600'
                            : 'bg-gradient-to-tr from-purple-600 to-indigo-600'
                        }`}
                      >
                        {emp.displayName ? emp.displayName.charAt(0).toUpperCase() : 'E'}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="text-sm font-bold truncate">{emp.displayName}</h3>

                          {/* Status Badge */}
                          <span
                            className={`text-[10px] px-2 py-0.5 rounded-full font-bold flex items-center gap-1 ${
                              isSuspended
                                ? 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                                : isExpired
                                ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                                : 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                            }`}
                          >
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${
                                isSuspended ? 'bg-rose-400' : isExpired ? 'bg-amber-400' : 'bg-emerald-400 animate-pulse'
                              }`}
                            />
                            {isSuspended
                              ? isKu ? 'ڕاگیراو (قفڵ)' : 'Suspended'
                              : isExpired
                              ? isKu ? 'بەسەرچوو' : 'Expired'
                              : isKu ? 'چالاک' : 'Active'}
                          </span>

                          {/* Price Tag */}
                          {emp.priceAmount && (
                            <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-[#D4AF37]/15 text-[#D4AF37] border border-[#D4AF37]/30">
                              {emp.priceAmount}
                            </span>
                          )}
                        </div>

                        <div className="text-xs text-slate-400 flex items-center gap-2 mt-0.5 truncate">
                          <span className="truncate">{emp.email}</span>
                          {emp.phone && (
                            <span className="text-slate-500 font-mono text-[11px] truncate">({emp.phone})</span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* WhatsApp Quick Reminder + Edit */}
                    <div className="flex items-center gap-1.5 shrink-0">
                      {emp.phone && (
                        <button
                          onClick={() => handleSendWhatsApp(emp)}
                          className="p-2 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 border border-emerald-500/30 transition cursor-pointer"
                          title={isKu ? 'ناردنی نامەی وەتسئەپ' : 'Send WhatsApp Reminder'}
                        >
                          <MessageCircle className="w-4 h-4" />
                        </button>
                      )}

                      <button
                        onClick={() => handleOpenEdit(emp)}
                        className="p-2 rounded-xl bg-slate-700/20 hover:bg-slate-700/40 text-slate-300 border border-slate-700/40 transition cursor-pointer"
                        title={isKu ? 'دەستکاریکردنی زانیارییەکان' : 'Edit Account Details'}
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Info Box: Manager, Expiry, Limits, Online Store */}
                  <div
                    className={`p-3 rounded-xl text-xs space-y-2 mb-3 ${
                      isDarkMode ? 'bg-[#0E1524]' : 'bg-slate-50'
                    }`}
                  >
                    {/* Manager Email & Cascade Suspend Button */}
                    <div className="flex items-center justify-between text-slate-400">
                      <span className="flex items-center gap-1.5">
                        <Shield className="w-3.5 h-3.5 text-purple-400" />
                        <span>{isKu ? 'بەڕێوەبەری سەرپەرشتیار:' : 'Supervising Manager:'}</span>
                      </span>
                      <div className="flex items-center gap-1.5">
                        <span className="font-semibold text-slate-200 font-mono text-[11px] truncate max-w-[150px]">
                          {emp.managerEmail || '—'}
                        </span>
                        {emp.managerEmail && (
                          <button
                            onClick={() =>
                              handleToggleManagerSuspension(
                                emp.managerEmail,
                                emp.managerStatus || 'active'
                              )
                            }
                            className={`px-1.5 py-0.5 rounded text-[9px] font-bold transition cursor-pointer border ${
                              emp.managerStatus === 'suspended'
                                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                                : 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                            }`}
                            title={isKu ? 'وەستاندنی تەواوی بەڕێوەبەرەکە' : 'Suspend entire manager group'}
                          >
                            {emp.managerStatus === 'suspended'
                              ? isKu ? 'چالاککردنی گرووپ' : 'Activate All'
                              : isKu ? 'ڕاگرتنی بەڕێوەبەر' : 'Suspend Mgr'}
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Expiry / Validity Count */}
                    <div className="flex items-center justify-between text-slate-400">
                      <span className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-blue-400" />
                        <span>{isKu ? 'ماوەی بەشداریکردن:' : 'Subscription Validity:'}</span>
                      </span>
                      <div className="flex items-center gap-2">
                        <span
                          className={`font-mono font-bold text-[11px] ${
                            isExpired
                              ? 'text-rose-400'
                              : remaining !== null && remaining <= 5
                              ? 'text-amber-400'
                              : 'text-emerald-400'
                          }`}
                        >
                          {emp.expiresAt
                            ? `${new Date(emp.expiresAt).toLocaleDateString()} (${remaining !== null ? `${remaining} ڕۆژ` : ''})`
                            : isKu ? 'بێ سنوور' : 'Unlimited'}
                        </span>
                        <button
                          onClick={() => handleOpenRenew(emp)}
                          className="px-2 py-0.5 rounded-lg bg-purple-500/15 hover:bg-purple-500/25 text-purple-300 border border-purple-500/30 text-[10px] font-bold cursor-pointer"
                        >
                          {isKu ? 'تازەکردنەوە ↻' : 'Renew ↻'}
                        </button>
                      </div>
                    </div>

                    {/* Usage Limits Summary */}
                    <div className="flex items-center justify-between text-slate-400 pt-1 border-t border-slate-700/30">
                      <span className="flex items-center gap-1.5">
                        <Sliders className="w-3.5 h-3.5 text-indigo-400" />
                        <span>{isKu ? 'سنووری بەکارهێنان:' : 'Usage Limits:'}</span>
                      </span>
                      <div className="flex items-center gap-1.5 font-mono text-[10px] text-slate-300">
                        <span>ئایتم: {emp.limits?.maxItems === 'unlimited' ? '∞' : emp.limits?.maxItems ?? 20}</span>
                        <span>•</span>
                        <span>بڕ: {emp.limits?.maxQuantity === 'unlimited' ? '∞' : emp.limits?.maxQuantity ?? 30}</span>
                        <span>•</span>
                        <span>فرۆشتن: {emp.limits?.maxSales === 'unlimited' ? '∞' : emp.limits?.maxSales ?? 15}</span>
                        <span>•</span>
                        <span>وەسڵ: {emp.limits?.maxInvoices === 'unlimited' ? '∞' : emp.limits?.maxInvoices ?? 40}</span>
                      </div>
                    </div>

                    {/* Online Storefront Integration */}
                    <div className="flex items-center justify-between text-slate-400 pt-1 border-t border-slate-700/30">
                      <span className="flex items-center gap-1.5">
                        <Globe className="w-3.5 h-3.5 text-emerald-400" />
                        <span>{isKu ? 'ستۆری ئۆنلاین (Storefront):' : 'Online Store:'}</span>
                      </span>
                      <div className="flex items-center gap-2">
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded font-bold ${
                            emp.onlineStore?.enabled && emp.onlineStore?.status === 'active'
                              ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                              : 'bg-slate-700/30 text-slate-400 border border-slate-700/50'
                          }`}
                        >
                          {emp.onlineStore?.enabled && emp.onlineStore?.status === 'active'
                            ? (emp.onlineStore?.storeName || 'چالاک')
                            : isKu ? 'ناچالاکە' : 'Disabled'}
                        </span>

                        <button
                          onClick={() => handleToggleOnlineStore(emp)}
                          className={`px-2 py-0.5 rounded text-[10px] font-bold cursor-pointer border ${
                            emp.onlineStore?.status === 'active'
                              ? 'bg-rose-500/15 text-rose-400 border-rose-500/30'
                              : 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                          }`}
                        >
                          {emp.onlineStore?.status === 'active'
                            ? (isKu ? 'وەستاندنی وێبسایت' : 'Suspend Web')
                            : (isKu ? 'چالاککردنی وێبسایت' : 'Activate Web')}
                        </button>
                      </div>
                    </div>

                    {/* Password & Copy */}
                    <div className="flex items-center justify-between text-slate-400 pt-1 border-t border-slate-700/30">
                      <span className="flex items-center gap-1.5">
                        <Key className="w-3.5 h-3.5 text-amber-400" />
                        <span>{isKu ? 'تێپەڕەوشە (پاسۆرد):' : 'Password:'}</span>
                      </span>
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono text-slate-200 text-xs">
                          {emp.password ? emp.password : '••••••••'}
                        </span>
                        <button
                          onClick={() => handleCopyCredentials(emp)}
                          className="p-1 rounded hover:bg-slate-700/50 text-slate-400 hover:text-white transition"
                          title={isKu ? 'کۆپیکردنی زانیاری چوونەژوورەوە' : 'Copy credentials'}
                        >
                          {copiedId === emp.id ? (
                            <Check className="w-3 h-3 text-emerald-400" />
                          ) : (
                            <Copy className="w-3 h-3" />
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Bottom Row: Permissions Button, Suspend Toggle, Delete */}
                <div className="flex items-center justify-between pt-3 border-t border-slate-700/30 gap-2">
                  <button
                    onClick={() => handleOpenPermissions(emp)}
                    className="flex-1 py-2 px-3 rounded-xl bg-purple-600/15 hover:bg-purple-600/25 border border-purple-500/30 text-purple-400 hover:text-purple-300 text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Sliders className="w-3.5 h-3.5" />
                    <span>{isKu ? 'دەسەڵاتەکان (RBAC)' : 'Permissions'}</span>
                  </button>

                  <button
                    onClick={() => handleToggleStatus(emp)}
                    className={`px-3 py-2 rounded-xl text-xs font-bold transition cursor-pointer border ${
                      emp.status === 'active'
                        ? 'bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 border-rose-500/30'
                        : 'bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 border-emerald-500/30'
                    }`}
                  >
                    {emp.status === 'active' ? (isKu ? 'ڕاگرتنی ئەکاونت' : 'Suspend') : (isKu ? 'چالاککردن' : 'Activate')}
                  </button>

                  <button
                    onClick={() => handleDeleteEmployee(emp)}
                    className="p-2 rounded-xl hover:bg-rose-500/15 text-slate-400 hover:text-rose-400 border border-transparent hover:border-rose-500/30 transition cursor-pointer"
                    title={isKu ? 'سڕینەوەی ئەکاونت' : 'Delete'}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* ── MODAL 1: ADD NEW ACCOUNT ──                                      */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-sm animate-in fade-in duration-200">
          <div
            className={`w-full max-w-2xl rounded-3xl border shadow-2xl p-5 sm:p-6 space-y-4 max-h-[92vh] overflow-y-auto ${
              isDarkMode ? 'bg-[#10182B] border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-900'
            }`}
          >
            <div className="flex items-center justify-between border-b pb-3 border-slate-700/40">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-purple-500/15 text-purple-400 flex items-center justify-center">
                  <UserPlus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold">
                    {isKu ? 'زیادکردنی ئەکاونتی کارمەند و بەشداریکردن' : 'Add Employee Account & Plan'}
                  </h3>
                  <p className="text-xs text-slate-400">
                    {isKu ? 'تۆمارکردنی ئیمەیڵ، پاسۆرد، بەڕێوەبەر، پارە و لیمیتەکان' : 'Set credentials, manager link, validity & limits'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {formError && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleSaveAdd} className="space-y-4">
              {/* Basic Fields */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    {isKu ? 'ناوی کارمەند / لق *' : 'Display Name / Store *'}
                  </label>
                  <input
                    type="text"
                    required
                    placeholder={isKu ? 'نموونە: ئارام ئەحمەد' : 'e.g. John Doe'}
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    className={`w-full px-3 py-2 rounded-xl text-xs sm:text-sm border outline-none transition ${
                      isDarkMode ? 'bg-[#0E1524] border-slate-800 text-slate-100' : 'bg-slate-50 border-slate-200 text-slate-900'
                    }`}
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    {isKu ? 'ژمارەی مۆبایل (بۆ وەتسئەپ)' : 'Phone Number'}
                  </label>
                  <input
                    type="text"
                    placeholder="0750XXXXXXX"
                    value={formPhone}
                    onChange={(e) => setFormPhone(e.target.value)}
                    className={`w-full px-3 py-2 rounded-xl text-xs sm:text-sm border outline-none transition font-mono ${
                      isDarkMode ? 'bg-[#0E1524] border-slate-800 text-slate-100' : 'bg-slate-50 border-slate-200 text-slate-900'
                    }`}
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    {isKu ? 'ئیمەیڵی کارمەند (بۆ چوونەژوورەوە) *' : 'Employee Login Email *'}
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="cashier@market.com"
                    value={formEmail}
                    onChange={(e) => setFormEmail(e.target.value)}
                    className={`w-full px-3 py-2 rounded-xl text-xs sm:text-sm border outline-none transition font-mono ${
                      isDarkMode ? 'bg-[#0E1524] border-slate-800 text-slate-100' : 'bg-slate-50 border-slate-200 text-slate-900'
                    }`}
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    {isKu ? 'تێپەڕەوشە (پاسۆرد) *' : 'Password *'}
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="••••••••"
                    value={formPassword}
                    onChange={(e) => setFormPassword(e.target.value)}
                    className={`w-full px-3 py-2 rounded-xl text-xs sm:text-sm border outline-none transition font-mono ${
                      isDarkMode ? 'bg-[#0E1524] border-slate-800 text-slate-100' : 'bg-slate-50 border-slate-200 text-slate-900'
                    }`}
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    {isKu ? 'ئیمەیڵی فەرمی بەڕێوەبەر (بۆ بەستنەوەی گووگڵ درایڤ و کۆنترۆڵ) *' : 'Supervising Manager Email *'}
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="manager@gmail.com"
                    value={formManagerEmail}
                    onChange={(e) => setFormManagerEmail(e.target.value)}
                    className={`w-full px-3 py-2 rounded-xl text-xs sm:text-sm border outline-none transition font-mono ${
                      isDarkMode ? 'bg-[#0E1524] border-slate-800 text-slate-100' : 'bg-slate-50 border-slate-200 text-slate-900'
                    }`}
                  />
                </div>
              </div>

              {/* Pricing & Duration Section */}
              <div
                className={`p-3.5 rounded-2xl border space-y-3 ${
                  isDarkMode ? 'bg-[#0E1524] border-slate-800' : 'bg-slate-50 border-slate-200'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-purple-400 flex items-center gap-1.5">
                    <DollarSign className="w-4 h-4" />
                    <span>{isKu ? 'بڕی پارە و ماوەی بەشداریکردن:' : 'Pricing & Validity Duration:'}</span>
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-300 mb-1">
                      {isKu ? 'بڕی پارەی دیاریکراو (دینار یان دۆلار)' : 'Fee Amount (e.g. 25,000 IQD)'}
                    </label>
                    <input
                      type="text"
                      placeholder={isKu ? 'نموونە: 25,000 IQD یان $20' : 'e.g. $25'}
                      value={formPrice}
                      onChange={(e) => setFormPrice(e.target.value)}
                      className={`w-full px-3 py-2 rounded-xl text-xs border outline-none font-mono ${
                        isDarkMode ? 'bg-[#10182B] border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-900'
                      }`}
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-300 mb-1">
                      {isKu ? 'بەرواری بەسەرچوون (Expires At)' : 'Expiry Date'}
                    </label>
                    <input
                      type="date"
                      value={formExpiresAt}
                      onChange={(e) => setFormExpiresAt(e.target.value)}
                      className={`w-full px-3 py-2 rounded-xl text-xs border outline-none ${
                        isDarkMode ? 'bg-[#10182B] border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-900'
                      }`}
                    />
                  </div>
                </div>

                {/* Preset Days Buttons */}
                <div className="flex items-center gap-2 flex-wrap pt-1">
                  <span className="text-[10px] text-slate-400 font-bold">{isKu ? 'ماوە خێراکان:' : 'Presets:'}</span>
                  {[
                    { label: isKu ? '١ مانگ (٣٠ ڕۆژ)' : '1 Month', days: 30 },
                    { label: isKu ? '٣ مانگ (٩٠ ڕۆژ)' : '3 Months', days: 90 },
                    { label: isKu ? '٦ مانگ (١٨٠ ڕۆژ)' : '6 Months', days: 180 },
                    { label: isKu ? '١ ساڵ (٣٦٥ ڕۆژ)' : '1 Year', days: 365 },
                  ].map((preset) => (
                    <button
                      key={preset.days}
                      type="button"
                      onClick={() => {
                        setFormDuration(preset.days);
                        const future = new Date();
                        future.setDate(future.getDate() + preset.days);
                        setFormExpiresAt(future.toISOString().split('T')[0]);
                      }}
                      className="px-2.5 py-1 rounded-lg bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/30 text-[10px] font-bold text-purple-300 transition cursor-pointer"
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Usage Limits Configuration */}
              <div
                className={`p-3.5 rounded-2xl border space-y-3 ${
                  isDarkMode ? 'bg-[#0E1524] border-slate-800' : 'bg-slate-50 border-slate-200'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-indigo-400 flex items-center gap-1.5">
                    <Sliders className="w-4 h-4" />
                    <span>{isKu ? 'دیاریکردنی سنووری بەکارهێنان (Usage Limits):' : 'Custom Usage Limits:'}</span>
                  </span>
                  <span className="text-[10px] text-slate-400">
                    {isKu ? 'بۆ بێ سنوور، دوگمەی ∞ داگرە' : 'Toggle ∞ for Unlimited'}
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                  {/* Items Limit */}
                  <div className="p-2.5 rounded-xl border border-slate-700/40 bg-slate-900/40 space-y-1">
                    <div className="flex items-center justify-between text-[11px] font-bold">
                      <span>{isKu ? 'ئایتم (کاڵا)' : 'Max Items'}</span>
                      <button
                        type="button"
                        onClick={() => setUnlimitedItems(!unlimitedItems)}
                        className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                          unlimitedItems ? 'bg-purple-600 text-white' : 'bg-slate-700 text-slate-300'
                        }`}
                      >
                        ∞ بێ سنوور
                      </button>
                    </div>
                    {!unlimitedItems ? (
                      <input
                        type="number"
                        min="1"
                        value={formLimits.maxItems === 'unlimited' ? 20 : formLimits.maxItems}
                        onChange={(e) => setFormLimits((p) => ({ ...p, maxItems: Number(e.target.value) }))}
                        className="w-full px-2 py-1 rounded bg-[#0E1524] border border-slate-700 text-xs text-center font-mono"
                      />
                    ) : (
                      <div className="text-center font-bold text-purple-400 text-xs py-1">∞ بێ سنوور</div>
                    )}
                  </div>

                  {/* Stock Quantity Limit */}
                  <div className="p-2.5 rounded-xl border border-slate-700/40 bg-slate-900/40 space-y-1">
                    <div className="flex items-center justify-between text-[11px] font-bold">
                      <span>{isKu ? 'زۆرترین بڕ' : 'Max Qty'}</span>
                      <button
                        type="button"
                        onClick={() => setUnlimitedQuantity(!unlimitedQuantity)}
                        className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                          unlimitedQuantity ? 'bg-purple-600 text-white' : 'bg-slate-700 text-slate-300'
                        }`}
                      >
                        ∞ بێ سنوور
                      </button>
                    </div>
                    {!unlimitedQuantity ? (
                      <input
                        type="number"
                        min="1"
                        value={formLimits.maxQuantity === 'unlimited' ? 30 : formLimits.maxQuantity}
                        onChange={(e) => setFormLimits((p) => ({ ...p, maxQuantity: Number(e.target.value) }))}
                        className="w-full px-2 py-1 rounded bg-[#0E1524] border border-slate-700 text-xs text-center font-mono"
                      />
                    ) : (
                      <div className="text-center font-bold text-purple-400 text-xs py-1">∞ بێ سنوور</div>
                    )}
                  </div>

                  {/* Sales Limit */}
                  <div className="p-2.5 rounded-xl border border-slate-700/40 bg-slate-900/40 space-y-1">
                    <div className="flex items-center justify-between text-[11px] font-bold">
                      <span>{isKu ? 'فرۆشتن' : 'Max Sales'}</span>
                      <button
                        type="button"
                        onClick={() => setUnlimitedSales(!unlimitedSales)}
                        className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                          unlimitedSales ? 'bg-purple-600 text-white' : 'bg-slate-700 text-slate-300'
                        }`}
                      >
                        ∞ بێ سنوور
                      </button>
                    </div>
                    {!unlimitedSales ? (
                      <input
                        type="number"
                        min="1"
                        value={formLimits.maxSales === 'unlimited' ? 15 : formLimits.maxSales}
                        onChange={(e) => setFormLimits((p) => ({ ...p, maxSales: Number(e.target.value) }))}
                        className="w-full px-2 py-1 rounded bg-[#0E1524] border border-slate-700 text-xs text-center font-mono"
                      />
                    ) : (
                      <div className="text-center font-bold text-purple-400 text-xs py-1">∞ بێ سنوور</div>
                    )}
                  </div>

                  {/* Printed Invoices Limit */}
                  <div className="p-2.5 rounded-xl border border-slate-700/40 bg-slate-900/40 space-y-1">
                    <div className="flex items-center justify-between text-[11px] font-bold">
                      <span>{isKu ? 'وەسڵی چاپ' : 'Invoices'}</span>
                      <button
                        type="button"
                        onClick={() => setUnlimitedInvoices(!unlimitedInvoices)}
                        className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                          unlimitedInvoices ? 'bg-purple-600 text-white' : 'bg-slate-700 text-slate-300'
                        }`}
                      >
                        ∞ بێ سنوور
                      </button>
                    </div>
                    {!unlimitedInvoices ? (
                      <input
                        type="number"
                        min="1"
                        value={formLimits.maxInvoices === 'unlimited' ? 40 : formLimits.maxInvoices}
                        onChange={(e) => setFormLimits((p) => ({ ...p, maxInvoices: Number(e.target.value) }))}
                        className="w-full px-2 py-1 rounded bg-[#0E1524] border border-slate-700 text-xs text-center font-mono"
                      />
                    ) : (
                      <div className="text-center font-bold text-purple-400 text-xs py-1">∞ بێ سنوور</div>
                    )}
                  </div>

                  {/* Quotations Limit */}
                  <div className="p-2.5 rounded-xl border border-slate-700/40 bg-slate-900/40 space-y-1">
                    <div className="flex items-center justify-between text-[11px] font-bold">
                      <span>{isKu ? 'عەرز و ئۆفەر' : 'Quotations'}</span>
                      <button
                        type="button"
                        onClick={() => setUnlimitedQuotations(!unlimitedQuotations)}
                        className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                          unlimitedQuotations ? 'bg-purple-600 text-white' : 'bg-slate-700 text-slate-300'
                        }`}
                      >
                        ∞ بێ سنوور
                      </button>
                    </div>
                    {!unlimitedQuotations ? (
                      <input
                        type="number"
                        min="1"
                        value={formLimits.maxQuotations === 'unlimited' ? 5 : formLimits.maxQuotations}
                        onChange={(e) => setFormLimits((p) => ({ ...p, maxQuotations: Number(e.target.value) }))}
                        className="w-full px-2 py-1 rounded bg-[#0E1524] border border-slate-700 text-xs text-center font-mono"
                      />
                    ) : (
                      <div className="text-center font-bold text-purple-400 text-xs py-1">∞ بێ سنوور</div>
                    )}
                  </div>
                </div>
              </div>

              {/* Online Storefront Section */}
              <div
                className={`p-3.5 rounded-2xl border space-y-3 ${
                  isDarkMode ? 'bg-[#0E1524] border-slate-800' : 'bg-slate-50 border-slate-200'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                    <Globe className="w-4 h-4" />
                    <span>{isKu ? 'ستۆری ئۆنلاین (Online Store):' : 'Online Storefront:'}</span>
                  </span>
                  <label className="flex items-center gap-2 cursor-pointer text-xs font-bold">
                    <input
                      type="checkbox"
                      checked={storeEnabled}
                      onChange={(e) => setStoreEnabled(e.target.checked)}
                      className="w-4 h-4 rounded text-emerald-600 cursor-pointer"
                    />
                    <span>{isKu ? 'چالاککردنی ستۆری ئۆنلاین' : 'Enable Storefront'}</span>
                  </label>
                </div>

                {storeEnabled && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-300 mb-1">
                        {isKu ? 'ناوی فرۆشگا / مارکێت' : 'Store Display Name'}
                      </label>
                      <input
                        type="text"
                        placeholder={isKu ? 'نموونە: مارکێتی ئارام' : 'Store name'}
                        value={storeName}
                        onChange={(e) => setStoreName(e.target.value)}
                        className="w-full px-3 py-1.5 rounded-xl text-xs bg-[#10182B] border border-slate-700 text-slate-100"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-300 mb-1">
                        {isKu ? 'ناوی بەستەر / Subdomain' : 'Subdomain / Slug'}
                      </label>
                      <input
                        type="text"
                        placeholder="aram-market"
                        value={storeSubdomain}
                        onChange={(e) => setStoreSubdomain(e.target.value)}
                        className="w-full px-3 py-1.5 rounded-xl text-xs bg-[#10182B] border border-slate-700 text-slate-100 font-mono"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Submit / Cancel Buttons */}
              <div className="pt-3 border-t border-slate-700/40 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-400 hover:text-white transition"
                >
                  {isKu ? 'پاشگەزبوونەوە' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white text-xs sm:text-sm font-bold shadow-lg shadow-purple-500/25 flex items-center gap-2 transition cursor-pointer"
                >
                  {submitting ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <UserPlus className="w-4 h-4" />
                  )}
                  <span>{isKu ? 'دروستکردنی ئەکاونت' : 'Create Account'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* ── MODAL 2: EDIT ACCOUNT DETAILS ──                                 */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      {isEditModalOpen && selectedEmployee && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-sm animate-in fade-in duration-200">
          <div
            className={`w-full max-w-2xl rounded-3xl border shadow-2xl p-5 sm:p-6 space-y-4 max-h-[92vh] overflow-y-auto ${
              isDarkMode ? 'bg-[#10182B] border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-900'
            }`}
          >
            <div className="flex items-center justify-between border-b pb-3 border-slate-700/40">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-purple-500/15 text-purple-400 flex items-center justify-center">
                  <Edit3 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold">
                    {isKu ? 'دەستکاریکردنی زانیاری و لیمیتەکانی ئەکاونت' : 'Edit Account Details & Limits'}
                  </h3>
                  <p className="text-xs text-slate-400">{selectedEmployee.email}</p>
                </div>
              </div>
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {formError && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleSaveEdit} className="space-y-4">
              {/* Basic Fields */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    {isKu ? 'ناوی کارمەند / لق *' : 'Display Name / Store *'}
                  </label>
                  <input
                    type="text"
                    required
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl text-xs sm:text-sm border outline-none bg-[#0E1524] border-slate-800 text-slate-100"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    {isKu ? 'ژمارەی مۆبایل (بۆ وەتسئەپ)' : 'Phone Number'}
                  </label>
                  <input
                    type="text"
                    value={formPhone}
                    onChange={(e) => setFormPhone(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl text-xs sm:text-sm border outline-none bg-[#0E1524] border-slate-800 text-slate-100 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    {isKu ? 'ئیمەیڵی کارمەند (چوونەژوورەوە) *' : 'Employee Email *'}
                  </label>
                  <input
                    type="email"
                    required
                    value={formEmail}
                    onChange={(e) => setFormEmail(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl text-xs sm:text-sm border outline-none bg-[#0E1524] border-slate-800 text-slate-100 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    {isKu ? 'تێپەڕەوشە (پاسۆرد) *' : 'Password *'}
                  </label>
                  <input
                    type="text"
                    required
                    value={formPassword}
                    onChange={(e) => setFormPassword(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl text-xs sm:text-sm border outline-none bg-[#0E1524] border-slate-800 text-slate-100 font-mono"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    {isKu ? 'ئیمەیڵی بەڕێوەبەری سەرپەرشتیار (دەتوانیت بیگۆڕیت) *' : 'Supervising Manager Email *'}
                  </label>
                  <input
                    type="email"
                    required
                    value={formManagerEmail}
                    onChange={(e) => setFormManagerEmail(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl text-xs sm:text-sm border outline-none bg-[#0E1524] border-slate-800 text-slate-100 font-mono"
                  />
                </div>
              </div>

              {/* Pricing & Expiry */}
              <div className="p-3.5 rounded-2xl border border-slate-800 bg-[#0E1524] space-y-3">
                <span className="text-xs font-bold text-purple-400 flex items-center gap-1.5">
                  <DollarSign className="w-4 h-4" />
                  <span>{isKu ? 'نرخ و بەرواری بەسەرچوون:' : 'Price & Expiry Date:'}</span>
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-300 mb-1">
                      {isKu ? 'بڕی پارەی دیاریکراو' : 'Fee Amount'}
                    </label>
                    <input
                      type="text"
                      value={formPrice}
                      onChange={(e) => setFormPrice(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl text-xs bg-[#10182B] border border-slate-800 text-slate-100 font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-300 mb-1">
                      {isKu ? 'بەرواری بەسەرچوون' : 'Expires At'}
                    </label>
                    <input
                      type="date"
                      value={formExpiresAt ? formExpiresAt.split('T')[0] : ''}
                      onChange={(e) => setFormExpiresAt(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl text-xs bg-[#10182B] border border-slate-800 text-slate-100"
                    />
                  </div>
                </div>
              </div>

              {/* Usage Limits Configuration */}
              <div className="p-3.5 rounded-2xl border border-slate-800 bg-[#0E1524] space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-indigo-400 flex items-center gap-1.5">
                    <Sliders className="w-4 h-4" />
                    <span>{isKu ? 'سنووری بەکارهێنان (Custom Limits):' : 'Custom Limits:'}</span>
                  </span>
                  <span className="text-[10px] text-slate-400">
                    {isKu ? 'بۆ بێ سنوور، دوگمەی ∞ داگرە' : 'Toggle ∞ for Unlimited'}
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                  {/* Items */}
                  <div className="p-2.5 rounded-xl border border-slate-700/40 bg-slate-900/40 space-y-1">
                    <div className="flex items-center justify-between text-[11px] font-bold">
                      <span>{isKu ? 'ئایتم (کاڵا)' : 'Items'}</span>
                      <button
                        type="button"
                        onClick={() => setUnlimitedItems(!unlimitedItems)}
                        className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                          unlimitedItems ? 'bg-purple-600 text-white' : 'bg-slate-700 text-slate-300'
                        }`}
                      >
                        ∞ بێ سنوور
                      </button>
                    </div>
                    {!unlimitedItems ? (
                      <input
                        type="number"
                        min="1"
                        value={formLimits.maxItems === 'unlimited' ? 20 : formLimits.maxItems}
                        onChange={(e) => setFormLimits((p) => ({ ...p, maxItems: Number(e.target.value) }))}
                        className="w-full px-2 py-1 rounded bg-[#0E1524] border border-slate-700 text-xs text-center font-mono"
                      />
                    ) : (
                      <div className="text-center font-bold text-purple-400 text-xs py-1">∞ بێ سنوور</div>
                    )}
                  </div>

                  {/* Quantity */}
                  <div className="p-2.5 rounded-xl border border-slate-700/40 bg-slate-900/40 space-y-1">
                    <div className="flex items-center justify-between text-[11px] font-bold">
                      <span>{isKu ? 'زۆرترین بڕ' : 'Max Qty'}</span>
                      <button
                        type="button"
                        onClick={() => setUnlimitedQuantity(!unlimitedQuantity)}
                        className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                          unlimitedQuantity ? 'bg-purple-600 text-white' : 'bg-slate-700 text-slate-300'
                        }`}
                      >
                        ∞ بێ سنوور
                      </button>
                    </div>
                    {!unlimitedQuantity ? (
                      <input
                        type="number"
                        min="1"
                        value={formLimits.maxQuantity === 'unlimited' ? 30 : formLimits.maxQuantity}
                        onChange={(e) => setFormLimits((p) => ({ ...p, maxQuantity: Number(e.target.value) }))}
                        className="w-full px-2 py-1 rounded bg-[#0E1524] border border-slate-700 text-xs text-center font-mono"
                      />
                    ) : (
                      <div className="text-center font-bold text-purple-400 text-xs py-1">∞ بێ سنوور</div>
                    )}
                  </div>

                  {/* Sales */}
                  <div className="p-2.5 rounded-xl border border-slate-700/40 bg-slate-900/40 space-y-1">
                    <div className="flex items-center justify-between text-[11px] font-bold">
                      <span>{isKu ? 'فرۆشتن' : 'Sales'}</span>
                      <button
                        type="button"
                        onClick={() => setUnlimitedSales(!unlimitedSales)}
                        className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                          unlimitedSales ? 'bg-purple-600 text-white' : 'bg-slate-700 text-slate-300'
                        }`}
                      >
                        ∞ بێ سنوور
                      </button>
                    </div>
                    {!unlimitedSales ? (
                      <input
                        type="number"
                        min="1"
                        value={formLimits.maxSales === 'unlimited' ? 15 : formLimits.maxSales}
                        onChange={(e) => setFormLimits((p) => ({ ...p, maxSales: Number(e.target.value) }))}
                        className="w-full px-2 py-1 rounded bg-[#0E1524] border border-slate-700 text-xs text-center font-mono"
                      />
                    ) : (
                      <div className="text-center font-bold text-purple-400 text-xs py-1">∞ بێ سنوور</div>
                    )}
                  </div>

                  {/* Invoices */}
                  <div className="p-2.5 rounded-xl border border-slate-700/40 bg-slate-900/40 space-y-1">
                    <div className="flex items-center justify-between text-[11px] font-bold">
                      <span>{isKu ? 'وەسڵی چاپ' : 'Invoices'}</span>
                      <button
                        type="button"
                        onClick={() => setUnlimitedInvoices(!unlimitedInvoices)}
                        className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                          unlimitedInvoices ? 'bg-purple-600 text-white' : 'bg-slate-700 text-slate-300'
                        }`}
                      >
                        ∞ بێ سنوور
                      </button>
                    </div>
                    {!unlimitedInvoices ? (
                      <input
                        type="number"
                        min="1"
                        value={formLimits.maxInvoices === 'unlimited' ? 40 : formLimits.maxInvoices}
                        onChange={(e) => setFormLimits((p) => ({ ...p, maxInvoices: Number(e.target.value) }))}
                        className="w-full px-2 py-1 rounded bg-[#0E1524] border border-slate-700 text-xs text-center font-mono"
                      />
                    ) : (
                      <div className="text-center font-bold text-purple-400 text-xs py-1">∞ بێ سنوور</div>
                    )}
                  </div>

                  {/* Quotations */}
                  <div className="p-2.5 rounded-xl border border-slate-700/40 bg-slate-900/40 space-y-1">
                    <div className="flex items-center justify-between text-[11px] font-bold">
                      <span>{isKu ? 'عەرز و ئۆفەر' : 'Quotations'}</span>
                      <button
                        type="button"
                        onClick={() => setUnlimitedQuotations(!unlimitedQuotations)}
                        className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                          unlimitedQuotations ? 'bg-purple-600 text-white' : 'bg-slate-700 text-slate-300'
                        }`}
                      >
                        ∞ بێ سنوور
                      </button>
                    </div>
                    {!unlimitedQuotations ? (
                      <input
                        type="number"
                        min="1"
                        value={formLimits.maxQuotations === 'unlimited' ? 5 : formLimits.maxQuotations}
                        onChange={(e) => setFormLimits((p) => ({ ...p, maxQuotations: Number(e.target.value) }))}
                        className="w-full px-2 py-1 rounded bg-[#0E1524] border border-slate-700 text-xs text-center font-mono"
                      />
                    ) : (
                      <div className="text-center font-bold text-purple-400 text-xs py-1">∞ بێ سنوور</div>
                    )}
                  </div>
                </div>
              </div>

              {/* Online Storefront Section */}
              <div className="p-3.5 rounded-2xl border border-slate-800 bg-[#0E1524] space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                    <Globe className="w-4 h-4" />
                    <span>{isKu ? 'ستۆری ئۆنلاین (Storefront):' : 'Online Store:'}</span>
                  </span>
                  <label className="flex items-center gap-2 cursor-pointer text-xs font-bold">
                    <input
                      type="checkbox"
                      checked={storeEnabled}
                      onChange={(e) => setStoreEnabled(e.target.checked)}
                      className="w-4 h-4 rounded text-emerald-600 cursor-pointer"
                    />
                    <span>{isKu ? 'چالاککردنی ستۆری ئۆنلاین' : 'Enable Storefront'}</span>
                  </label>
                </div>

                {storeEnabled && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-300 mb-1">
                        {isKu ? 'ناوی فرۆشگا' : 'Store Name'}
                      </label>
                      <input
                        type="text"
                        value={storeName}
                        onChange={(e) => setStoreName(e.target.value)}
                        className="w-full px-3 py-1.5 rounded-xl text-xs bg-[#10182B] border border-slate-700 text-slate-100"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-300 mb-1">
                        {isKu ? 'ناوی بەستەر / Subdomain' : 'Subdomain'}
                      </label>
                      <input
                        type="text"
                        value={storeSubdomain}
                        onChange={(e) => setStoreSubdomain(e.target.value)}
                        className="w-full px-3 py-1.5 rounded-xl text-xs bg-[#10182B] border border-slate-700 text-slate-100 font-mono"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Submit Buttons */}
              <div className="pt-3 border-t border-slate-700/40 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-400 hover:text-white transition"
                >
                  {isKu ? 'پاشگەزبوونەوە' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white text-xs sm:text-sm font-bold shadow-lg shadow-purple-500/25 flex items-center gap-2 transition cursor-pointer"
                >
                  {submitting ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <CheckCircle2 className="w-4 h-4" />
                  )}
                  <span>{isKu ? 'پاشەکەوتکردنی گۆڕانکارییەکان' : 'Save Changes'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* ── MODAL 3: RENEW SUBSCRIPTION ──                                   */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      {isRenewModalOpen && selectedEmployee && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-sm animate-in fade-in duration-200">
          <div
            className={`w-full max-w-md rounded-3xl border shadow-2xl p-5 sm:p-6 space-y-4 ${
              isDarkMode ? 'bg-[#10182B] border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-900'
            }`}
          >
            <div className="flex items-center justify-between border-b pb-3 border-slate-700/40">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-purple-500/15 text-purple-400 flex items-center justify-center">
                  <RotateCcw className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold">
                    {isKu ? 'تازەکردنەوەی بەشداریکردن' : 'Renew Subscription'}
                  </h3>
                  <p className="text-xs text-slate-400">{selectedEmployee.displayName}</p>
                </div>
              </div>
              <button
                onClick={() => setIsRenewModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveRenew} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  {isKu ? 'ماوەی تازەکردنەوە (ڕۆژ)' : 'Extension Days'}
                </label>
                <div className="grid grid-cols-4 gap-2 mb-2">
                  {[
                    { label: isKu ? '٣٠ ڕۆژ' : '30d', days: 30 },
                    { label: isKu ? '٩٠ ڕۆژ' : '90d', days: 90 },
                    { label: isKu ? '١٨٠ ڕۆژ' : '180d', days: 180 },
                    { label: isKu ? '٣٦٥ ڕۆژ' : '365d', days: 365 },
                  ].map((p) => (
                    <button
                      key={p.days}
                      type="button"
                      onClick={() => setRenewDays(p.days)}
                      className={`py-2 rounded-xl text-xs font-bold border transition cursor-pointer ${
                        renewDays === p.days
                          ? 'bg-purple-600 text-white border-purple-500 shadow-md'
                          : 'bg-slate-800/40 border-slate-700 text-slate-400'
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
                <input
                  type="number"
                  min="1"
                  required
                  value={renewDays}
                  onChange={(e) => setRenewDays(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl text-xs bg-[#0E1524] border border-slate-800 text-slate-100 font-mono text-center font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  {isKu ? 'بڕی پارەی وەرگیراو بۆ ئەم نوێکردنەوەیە' : 'Renewal Fee Amount'}
                </label>
                <input
                  type="text"
                  placeholder="e.g. 25,000 IQD"
                  value={renewPrice}
                  onChange={(e) => setRenewPrice(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl text-xs bg-[#0E1524] border border-slate-800 text-slate-100 font-mono"
                />
              </div>

              <div className="pt-3 border-t border-slate-700/40 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsRenewModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-400 hover:text-white transition"
                >
                  {isKu ? 'پاشگەزبوونەوە' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  disabled={renewing}
                  className="px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white text-xs font-bold shadow-lg shadow-purple-500/25 flex items-center gap-2 transition cursor-pointer"
                >
                  {renewing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <RotateCcw className="w-4 h-4" />}
                  <span>{isKu ? 'نوێکردنەوەی دەستبەجێ' : 'Apply Renewal'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* ── MODAL 4: PERMISSIONS (RBAC) ──                                   */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      {isPermModalOpen && selectedEmployee && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-sm animate-in fade-in duration-200">
          <div
            className={`w-full max-w-2xl rounded-3xl border shadow-2xl p-5 sm:p-6 space-y-4 max-h-[92vh] flex flex-col ${
              isDarkMode ? 'bg-[#10182B] border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-900'
            }`}
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b pb-3 border-slate-700/40 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-purple-500/15 text-purple-400 flex items-center justify-center">
                  <Sliders className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold flex items-center gap-2">
                    <span>{isKu ? 'دەسەڵاتەکانی کارمەند:' : 'Staff Permissions:'}</span>
                    <span className="text-purple-400 font-extrabold">{selectedEmployee.displayName}</span>
                  </h3>
                  <p className="text-xs text-slate-400 font-mono">{selectedEmployee.email}</p>
                </div>
              </div>
              <button
                onClick={() => setIsPermModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Explanatory Legend for the 3 States */}
            <div
              className={`p-3 rounded-2xl border text-xs grid grid-cols-3 gap-2 shrink-0 ${
                isDarkMode ? 'bg-[#0E1524] border-slate-800' : 'bg-slate-50 border-slate-200'
              }`}
            >
              <div className="flex items-center gap-1.5 text-emerald-400">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <div>
                  <div className="font-bold">{isKu ? 'چالاک (Active)' : 'Active'}</div>
                  <div className="text-[10px] text-slate-400">{isKu ? 'دەسەڵاتی تەواو' : 'Full access'}</div>
                </div>
              </div>

              <div className="flex items-center gap-1.5 text-amber-400">
                <Lock className="w-4 h-4 shrink-0" />
                <div>
                  <div className="font-bold">{isKu ? 'ناچالاک (Disabled)' : 'Disabled'}</div>
                  <div className="text-[10px] text-slate-400">{isKu ? 'دیارە بەڵام قفڵە' : 'Visible but locked'}</div>
                </div>
              </div>

              <div className="flex items-center gap-1.5 text-rose-400">
                <EyeOff className="w-4 h-4 shrink-0" />
                <div>
                  <div className="font-bold">{isKu ? 'شاردراوە (Hidden)' : 'Hidden'}</div>
                  <div className="text-[10px] text-slate-400">{isKu ? 'لە ئەپەکە نابینرێت' : 'Completely removed'}</div>
                </div>
              </div>
            </div>

            {/* Navigation Tabs inside modal */}
            <div className="flex items-center gap-1 p-1 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-800 text-xs font-bold shrink-0">
              <button
                type="button"
                onClick={() => setPermTab('modules')}
                className={`flex-1 py-2 rounded-lg transition cursor-pointer text-center ${
                  permTab === 'modules' ? 'bg-purple-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {isKu ? 'مۆدیوولەکان (١١)' : 'Modules (11)'}
              </button>
              <button
                type="button"
                onClick={() => setPermTab('settings')}
                className={`flex-1 py-2 rounded-lg transition cursor-pointer text-center ${
                  permTab === 'settings' ? 'bg-purple-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {isKu ? 'سیتینگی بەتن-بەتن (٦)' : 'Settings Buttons (6)'}
              </button>
              <button
                type="button"
                onClick={() => setPermTab('actions')}
                className={`flex-1 py-2 rounded-lg transition cursor-pointer text-center ${
                  permTab === 'actions' ? 'bg-purple-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {isKu ? 'سڕینەوەی وەسڵ' : 'Delete Invoices'}
              </button>
            </div>

            {/* Scrollable Permissions Body */}
            <div className="flex-1 overflow-y-auto pe-1 space-y-3">
              {/* TAB 1: MAIN MODULES */}
              {permTab === 'modules' && (
                <div className="space-y-2.5">
                  {MODULE_ITEMS.map((item) => {
                    const currentVal = editingPermissions[item.key] as PermissionState;

                    return (
                      <div
                        key={item.key}
                        className={`p-3 rounded-2xl border transition flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 ${
                          isDarkMode ? 'bg-[#0E1524] border-slate-800/80' : 'bg-slate-50 border-slate-200'
                        }`}
                      >
                        <div>
                          <div className="text-xs sm:text-sm font-bold text-slate-100">
                            {isKu ? item.labelKu : item.labelEn}
                          </div>
                          <div className="text-[11px] text-slate-400">{item.descKu}</div>
                        </div>

                        {/* 3-State Segmented Control */}
                        <div className="flex items-center p-1 rounded-xl bg-slate-900/80 border border-slate-700/60 shrink-0 self-start sm:self-auto">
                          <button
                            type="button"
                            onClick={() =>
                              setEditingPermissions((prev) => ({
                                ...prev,
                                [item.key]: 'active',
                              }))
                            }
                            className={`px-3 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer ${
                              currentVal === 'active'
                                ? 'bg-emerald-600 text-white shadow-sm'
                                : 'text-slate-400 hover:text-emerald-400'
                            }`}
                          >
                            <Check className="w-3 h-3" />
                            <span>{isKu ? 'چالاک' : 'Active'}</span>
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              setEditingPermissions((prev) => ({
                                ...prev,
                                [item.key]: 'disabled',
                              }))
                            }
                            className={`px-3 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer ${
                              currentVal === 'disabled'
                                ? 'bg-amber-600 text-white shadow-sm'
                                : 'text-slate-400 hover:text-amber-400'
                            }`}
                          >
                            <Lock className="w-3 h-3" />
                            <span>{isKu ? 'ناچالاک' : 'Disabled'}</span>
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              setEditingPermissions((prev) => ({
                                ...prev,
                                [item.key]: 'hidden',
                              }))
                            }
                            className={`px-3 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer ${
                              currentVal === 'hidden'
                                ? 'bg-rose-600 text-white shadow-sm'
                                : 'text-slate-400 hover:text-rose-400'
                            }`}
                          >
                            <EyeOff className="w-3 h-3" />
                            <span>{isKu ? 'شاردراوە' : 'Hidden'}</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* TAB 2: SETTINGS BUTTONS */}
              {permTab === 'settings' && (
                <div className="space-y-2.5">
                  {SETTINGS_ITEMS.map((item) => {
                    const currentVal = editingPermissions[item.key] as PermissionState;

                    return (
                      <div
                        key={item.key}
                        className={`p-3 rounded-2xl border transition flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 ${
                          isDarkMode ? 'bg-[#0E1524] border-slate-800/80' : 'bg-slate-50 border-slate-200'
                        }`}
                      >
                        <div>
                          <div className="text-xs sm:text-sm font-bold text-slate-100">
                            {isKu ? item.labelKu : item.labelEn}
                          </div>
                          <div className="text-[11px] text-slate-400">{item.descKu}</div>
                        </div>

                        <div className="flex items-center p-1 rounded-xl bg-slate-900/80 border border-slate-700/60 shrink-0 self-start sm:self-auto">
                          <button
                            type="button"
                            onClick={() =>
                              setEditingPermissions((prev) => ({
                                ...prev,
                                [item.key]: 'active',
                              }))
                            }
                            className={`px-3 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer ${
                              currentVal === 'active'
                                ? 'bg-emerald-600 text-white shadow-sm'
                                : 'text-slate-400 hover:text-emerald-400'
                            }`}
                          >
                            <Check className="w-3 h-3" />
                            <span>{isKu ? 'چالاک' : 'Active'}</span>
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              setEditingPermissions((prev) => ({
                                ...prev,
                                [item.key]: 'disabled',
                              }))
                            }
                            className={`px-3 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer ${
                              currentVal === 'disabled'
                                ? 'bg-amber-600 text-white shadow-sm'
                                : 'text-slate-400 hover:text-amber-400'
                            }`}
                          >
                            <Lock className="w-3 h-3" />
                            <span>{isKu ? 'ناچالاک' : 'Disabled'}</span>
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              setEditingPermissions((prev) => ({
                                ...prev,
                                [item.key]: 'hidden',
                              }))
                            }
                            className={`px-3 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer ${
                              currentVal === 'hidden'
                                ? 'bg-rose-600 text-white shadow-sm'
                                : 'text-slate-400 hover:text-rose-400'
                            }`}
                          >
                            <EyeOff className="w-3 h-3" />
                            <span>{isKu ? 'شاردراوە' : 'Hidden'}</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* TAB 3: ACTIONS */}
              {permTab === 'actions' && (
                <div className="space-y-4">
                  <div
                    className={`p-4 rounded-2xl border flex items-center justify-between gap-4 ${
                      isDarkMode ? 'bg-[#0E1524] border-slate-800' : 'bg-slate-50 border-slate-200'
                    }`}
                  >
                    <div>
                      <div className="text-sm font-bold text-slate-100 flex items-center gap-2">
                        <Trash2 className="w-4 h-4 text-rose-400" />
                        <span>{isKu ? 'دەسەڵاتی سڕینەوەی وەسڵ و پسوڵەکان' : 'Can Delete Invoices'}</span>
                      </div>
                      <p className="text-xs text-slate-400 mt-1 max-w-md">
                        {isKu
                          ? 'ئەگەر ئەم دەسەڵاتە بکوژێنیتەوە، کارمەند ناتوانێت هیچ وەسڵ و پسوڵەیەک بسڕێتەوە بۆ پاراستنی داتاکان لە دەستکاری نەخوازراو.'
                          : 'If OFF, employee cannot delete any receipts or sales.'}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() =>
                        setEditingPermissions((prev) => ({
                          ...prev,
                          canDeleteInvoice: !prev.canDeleteInvoice,
                        }))
                      }
                      className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer shrink-0 ${
                        editingPermissions.canDeleteInvoice
                          ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
                          : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                      }`}
                    >
                      {editingPermissions.canDeleteInvoice ? (
                        <>
                          <Check className="w-4 h-4" />
                          <span>{isKu ? 'ڕێگەپێدراوە' : 'Allowed'}</span>
                        </>
                      ) : (
                        <>
                          <Lock className="w-4 h-4" />
                          <span>{isKu ? 'قەدەغەیە (ناچالاک)' : 'Disallowed'}</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="pt-3 border-t border-slate-700/40 flex items-center justify-between gap-3 shrink-0">
              <button
                type="button"
                onClick={() => setIsPermModalOpen(false)}
                className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-400 hover:text-white transition"
              >
                {isKu ? 'داخستن' : 'Close'}
              </button>

              <button
                type="button"
                disabled={savingPerms}
                onClick={handleSavePermissions}
                className="px-6 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white text-xs sm:text-sm font-bold shadow-lg shadow-purple-500/25 flex items-center gap-2 transition cursor-pointer"
              >
                {savingPerms ? <RefreshCw className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                <span>{isKu ? 'پاشەکەوتکردنی دەسەڵاتەکان' : 'Save Changes'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
