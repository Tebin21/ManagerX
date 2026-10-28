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
  createdAt: string;
  status: 'active' | 'suspended';
  lastLoginAt?: string;
  lastLogoutAt?: string;
  deviceModel?: string;
  deviceName?: string;
  permissions: EmployeePermissions;
}

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
  icon: string;
}> = [
  { key: 'sales', labelKu: 'فرۆشتن و کاشێر', labelEn: 'Sales & POS', descKu: 'تۆمارکردنی پسوڵەی نوێ و فرۆشتنی کاڵا', icon: 'ShoppingCart' },
  { key: 'purchases', labelKu: 'کڕین و دابینکەران', labelEn: 'Purchases & Bills', descKu: 'تۆمارکردنی پسوڵەی کڕین لە وەکیل', icon: 'Receipt' },
  { key: 'inventory', labelKu: 'کۆگا و کاڵاکان', labelEn: 'Inventory & Stock', descKu: 'بینینی عەمبار، زیادکردنی کاڵا، بارکۆد', icon: 'Package' },
  { key: 'reports', labelKu: 'ڕاپۆرت و قازانج', labelEn: 'Reports & Profit', descKu: 'ئامار و قازانجی ڕاستەقینە و داهات', icon: 'BarChart' },
  { key: 'history', labelKu: 'مێژووی جووڵەکان', labelEn: 'Movement History', descKu: 'مێژووی فرۆشتنەکان و کڕینەکان', icon: 'Clock' },
  { key: 'invoices', labelKu: 'وەسڵ و پسوڵەکان', labelEn: 'Invoices & Slips', descKu: 'بینین و چاپکردنی پسوڵەکان', icon: 'FileText' },
  { key: 'debts', labelKu: 'قەرز و باڵانس', labelEn: 'Debts & Accounts', descKu: 'قەرزی کڕیاران و حیساباتی وەکیلەکان', icon: 'DollarSign' },
  { key: 'expenses', labelKu: 'خەرجییەکان', labelEn: 'Expenses', descKu: 'خەرجی ڕۆژانە و کرێ و مووچە', icon: 'TrendingDown' },
  { key: 'quotations', labelKu: 'عەرز و ئۆفەر', labelEn: 'Quotations', descKu: 'دروستکردنی پێشنیاری نرخ بۆ کڕیار', icon: 'FileCheck' },
  { key: 'dashboard', labelKu: 'داشبۆردی سەرەکی', labelEn: 'Main Dashboard', descKu: 'پوختەی سەرەکی و هۆمی ئەپەکە', icon: 'LayoutDashboard' },
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

  // State
  const [employees, setEmployees] = useState<EmployeeAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'suspended'>('all');

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isPermModalOpen, setIsPermModalOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<EmployeeAccount | null>(null);

  // Form states for Add Employee
  const [addName, setAddName] = useState('');
  const [addEmail, setAddEmail] = useState('');
  const [addPassword, setAddPassword] = useState('');
  const [addManagerEmail, setAddManagerEmail] = useState('');
  const [addPreset, setAddPreset] = useState<'cashier' | 'standard' | 'restricted'>('standard');
  const [submittingAdd, setSubmittingAdd] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Permission edit state
  const [editingPermissions, setEditingPermissions] = useState<EmployeePermissions>(DEFAULT_PERMISSIONS);
  const [permTab, setPermTab] = useState<'modules' | 'settings' | 'actions'>('modules');
  const [savingPerms, setSavingPerms] = useState(false);

  // Copy password feedback
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

  // Filtered employees
  const filteredEmployees = useMemo(() => {
    return employees.filter((emp) => {
      const matchesSearch =
        (emp.displayName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (emp.email || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (emp.managerEmail || '').toLowerCase().includes(searchQuery.toLowerCase());

      const matchesStatus =
        statusFilter === 'all'
          ? true
          : statusFilter === 'active'
          ? emp.status === 'active'
          : emp.status === 'suspended';

      return matchesSearch && matchesStatus;
    });
  }, [employees, searchQuery, statusFilter]);

  // KPIs
  const stats = useMemo(() => {
    const total = employees.length;
    const active = employees.filter((e) => e.status === 'active').length;
    const suspended = employees.filter((e) => e.status === 'suspended').length;
    return { total, active, suspended };
  }, [employees]);

  // Toggle Employee Status (Suspend / Activate)
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

  // Apply Preset when adding employee
  const handlePresetSelect = (preset: 'cashier' | 'standard' | 'restricted') => {
    setAddPreset(preset);
  };

  // Handle Add Employee Submit
  const handleAddEmployeeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!addName.trim()) {
      setFormError(isKu ? 'تکایە ناوی کارمەند بنووسە' : 'Please enter employee name');
      return;
    }
    if (!addEmail.trim() || !addEmail.includes('@')) {
      setFormError(isKu ? 'تکایە ئیمەیڵێکی دروست بنووسە' : 'Please enter a valid email address');
      return;
    }
    if (!addPassword.trim() || addPassword.length < 6) {
      setFormError(isKu ? 'تێپەڕەوشە دەبێت لانیکەم ٦ پیت یان ژمارە بێت' : 'Password must be at least 6 characters');
      return;
    }
    if (!addManagerEmail.trim() || !addManagerEmail.includes('@')) {
      setFormError(isKu ? 'تکایە ئیمەیڵی فەرمی بەڕێوەبەر بۆ بەستنەوە دیاری بکە' : 'Please provide official manager email');
      return;
    }

    const cleanEmail = addEmail.trim().toLowerCase();
    const docId = getCleanDocId(cleanEmail);

    // Build permissions based on preset
    let perms: EmployeePermissions = { ...DEFAULT_PERMISSIONS };
    if (addPreset === 'cashier') {
      perms = {
        ...DEFAULT_PERMISSIONS,
        sales: 'active',
        purchases: 'disabled',
        inventory: 'disabled',
        reports: 'hidden',
        history: 'active',
        invoices: 'active',
        debts: 'disabled',
        expenses: 'hidden',
        quotations: 'disabled',
        dashboard: 'active',
        canDeleteInvoice: false,
        settingsLanguage: 'disabled',
        settingsProfile: 'hidden',
        settingsCurrency: 'hidden',
        settingsTheme: 'active',
        settingsBackup: 'hidden',
        settingsDeleteAccount: 'hidden',
      };
    } else if (addPreset === 'restricted') {
      perms = {
        ...DEFAULT_PERMISSIONS,
        sales: 'active',
        purchases: 'hidden',
        inventory: 'hidden',
        reports: 'hidden',
        history: 'disabled',
        invoices: 'active',
        debts: 'hidden',
        expenses: 'hidden',
        quotations: 'hidden',
        dashboard: 'active',
        canDeleteInvoice: false,
        settingsLanguage: 'hidden',
        settingsProfile: 'hidden',
        settingsCurrency: 'hidden',
        settingsTheme: 'active',
        settingsBackup: 'hidden',
        settingsDeleteAccount: 'hidden',
      };
    }

    const db = getClientFirestore();
    if (!db) {
      setFormError(isKu ? 'سێرڤەری داتابەیس بەردەست نییە' : 'Database client not ready');
      return;
    }

    setSubmittingAdd(true);
    try {
      const docRef = doc(db, 'employee_accounts', docId);
      const newAccount: EmployeeAccount = {
        id: `emp_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        email: cleanEmail,
        displayName: addName.trim(),
        password: addPassword.trim(),
        managerEmail: addManagerEmail.trim().toLowerCase(),
        createdAt: new Date().toISOString(),
        status: 'active',
        permissions: perms,
      };

      await setDoc(docRef, newAccount, { merge: true });

      // Reset form
      setAddName('');
      setAddEmail('');
      setAddPassword('');
      setAddManagerEmail('');
      setIsAddModalOpen(false);
    } catch (e: any) {
      console.error('Error adding employee:', e);
      setFormError(e?.message || (isKu ? 'هەڵەیەک ڕوویدا لە دروستکردنی کارمەند' : 'Failed to create employee'));
    } finally {
      setSubmittingAdd(false);
    }
  };

  // Copy helper
  const handleCopyCredentials = (emp: EmployeeAccount) => {
    const text = `🔹 هەژماری کارمەندی فرۆشیار\n👤 ناو: ${emp.displayName}\n📧 ئیمەیڵ: ${emp.email}\n🔑 تێپەڕەوشە: ${emp.password || '••••••••'}\n👑 بەڕێوەبەر: ${emp.managerEmail}`;
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
                {isKu ? 'مەنجمێنت و بەڕێوەبردنی کارمەندان' : 'Employee & RBAC Management'}
              </h1>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-purple-500/15 text-purple-400 border border-purple-500/30">
                RBAC Live
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-400">
              {isKu
                ? 'کۆنترۆڵکردنی دەسەڵاتەکان، شاردنەوە و ناچالاککردنی بەشەکان لەسەر مۆبایلی کارمەند'
                : 'Manage staff accounts, fine-grained access control (Active / Disabled / Hidden) in real-time'}
            </p>
          </div>
        </div>

        {/* Action Button: Add Employee */}
        <button
          onClick={() => {
            setFormError(null);
            setIsAddModalOpen(true);
          }}
          className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs sm:text-sm font-bold shadow-lg shadow-purple-500/25 flex items-center justify-center gap-2 transition cursor-pointer shrink-0"
        >
          <UserPlus className="w-4 h-4" />
          <span>{isKu ? 'زیادکردنی کارمەندی نوێ' : 'Add New Employee'}</span>
        </button>
      </div>

      {/* ── KPI Stat Cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
        {/* Total Employees */}
        <div
          className={`p-4 rounded-2xl border transition ${
            isDarkMode ? 'bg-[#141C2E] border-slate-800' : 'bg-white border-slate-200'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">
              {isKu ? 'کۆی کارمەندان' : 'Total Employees'}
            </span>
            <div className="w-8 h-8 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-black">{stats.total}</div>
          <div className="text-[11px] text-slate-400 mt-0.5">
            {isKu ? 'تۆمارکراو لە داتابەیسی ناوەندی' : 'Registered in central system'}
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
              {isKu ? 'کارمەندانی چالاک' : 'Active Employees'}
            </span>
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-black text-emerald-500">{stats.active}</div>
          <div className="text-[11px] text-slate-400 mt-0.5">
            {isKu ? 'ڕێگەپێدراو بۆ چوونەژوورەوە' : 'Authorized for POS operations'}
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
              {isKu ? 'ڕاگیراوەکان (وەستێنراو)' : 'Suspended Staff'}
            </span>
            <div className="w-8 h-8 rounded-xl bg-rose-500/10 text-rose-400 flex items-center justify-center">
              <ShieldAlert className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-black text-rose-500">{stats.suspended}</div>
          <div className="text-[11px] text-slate-400 mt-0.5">
            {isKu ? 'ئەپەکەیان بلۆک کراوە دەستبەجێ' : 'Locked out instantly on device'}
          </div>
        </div>
      </div>

      {/* ── Search and Filter Controls ── */}
      <div
        className={`p-4 rounded-2xl border flex flex-col md:flex-row items-center justify-between gap-3 ${
          isDarkMode ? 'bg-[#141C2E] border-slate-800' : 'bg-white border-slate-200'
        }`}
      >
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 absolute top-1/2 -translate-y-1/2 start-3 text-slate-400" />
          <input
            type="text"
            placeholder={isKu ? 'گەڕان بەپێی ناو، ئیمەیڵ، بەڕێوەبەر...' : 'Search by name, email, manager...'}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={`w-full ps-9 pe-4 py-2 rounded-xl text-xs sm:text-sm border outline-none transition ${
              isDarkMode
                ? 'bg-[#0E1524] border-slate-800 text-slate-100 focus:border-purple-500'
                : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-purple-500'
            }`}
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto justify-end">
          <div className="flex items-center p-1 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-800 text-xs font-semibold">
            <button
              onClick={() => setStatusFilter('all')}
              className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
                statusFilter === 'all'
                  ? 'bg-purple-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {isKu ? 'هەموو' : 'All'}
            </button>
            <button
              onClick={() => setStatusFilter('active')}
              className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
                statusFilter === 'active'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {isKu ? 'چالاکەکان' : 'Active'}
            </button>
            <button
              onClick={() => setStatusFilter('suspended')}
              className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
                statusFilter === 'suspended'
                  ? 'bg-rose-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {isKu ? 'ڕاگیراوەکان' : 'Suspended'}
            </button>
          </div>
        </div>
      </div>

      {/* ── Employee Accounts List ── */}
      {loading ? (
        <div className="py-16 text-center text-slate-400 flex flex-col items-center gap-3">
          <RefreshCw className="w-8 h-8 animate-spin text-purple-500" />
          <span className="text-sm">{isKu ? 'بارکردنی لیستی کارمەندان...' : 'Loading staff accounts...'}</span>
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
            {isKu ? 'هیچ کارمەندێک نەدۆزرایەوە' : 'No employees found'}
          </h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto mt-1 mb-4">
            {isKu
              ? 'دەتوانیت بە کلیک لەسەر دوگمەی "زیادکردنی کارمەندی نوێ" لە سەرەوە یەکەم ئەکاونتی کارمەند دروست بکەیت.'
              : 'Add your first employee account by clicking the button above.'}
          </p>
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold transition cursor-pointer"
          >
            {isKu ? '+ دروستکردنی کارمەند' : '+ Create Employee'}
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {filteredEmployees.map((emp) => {
            const isActive = emp.status === 'active';
            const permCount = Object.values(emp.permissions || {}).filter((v) => v === 'active').length;

            return (
              <div
                key={emp.id}
                className={`p-5 rounded-2xl border transition-all flex flex-col justify-between ${
                  isDarkMode
                    ? 'bg-[#141C2E] border-slate-800 hover:border-slate-700'
                    : 'bg-white border-slate-200 hover:border-slate-300'
                } ${!isActive ? 'opacity-85 border-rose-500/30' : ''}`}
              >
                <div>
                  {/* Top row: Avatar, Name, Status Badge */}
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={`w-11 h-11 rounded-2xl flex items-center justify-center text-white font-extrabold text-base shrink-0 shadow-sm ${
                          isActive
                            ? 'bg-gradient-to-tr from-purple-600 to-indigo-600'
                            : 'bg-gradient-to-tr from-rose-600 to-red-600'
                        }`}
                      >
                        {emp.displayName ? emp.displayName.charAt(0).toUpperCase() : 'E'}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="text-sm font-bold truncate">{emp.displayName}</h3>
                          <span
                            className={`text-[10px] px-2 py-0.5 rounded-full font-bold flex items-center gap-1 ${
                              isActive
                                ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                                : 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                            }`}
                          >
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${
                                isActive ? 'bg-emerald-400 animate-pulse' : 'bg-rose-400'
                              }`}
                            />
                            {isActive ? (isKu ? 'چالاک' : 'Active') : (isKu ? 'ڕاگیراو (وەستاو)' : 'Suspended')}
                          </span>
                        </div>
                        <div className="text-xs text-slate-400 flex items-center gap-1 mt-0.5 truncate">
                          <Mail className="w-3 h-3 shrink-0" />
                          <span className="truncate">{emp.email}</span>
                        </div>
                      </div>
                    </div>

                    {/* Quick Suspend / Activate toggle */}
                    <button
                      onClick={() => handleToggleStatus(emp)}
                      title={isActive ? (isKu ? 'وەستاندنی کارمەند' : 'Suspend') : (isKu ? 'چالاککردنەوە' : 'Activate')}
                      className={`p-2 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 shrink-0 ${
                        isActive
                          ? 'bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 border border-rose-500/20'
                          : 'bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/20'
                      }`}
                    >
                      <Power className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">
                        {isActive ? (isKu ? 'ڕاگرتن' : 'Suspend') : (isKu ? 'چالاککردن' : 'Activate')}
                      </span>
                    </button>
                  </div>

                  {/* Info Box: Manager, Device, Password */}
                  <div
                    className={`p-3 rounded-xl text-xs space-y-2 mb-4 ${
                      isDarkMode ? 'bg-[#0E1524]' : 'bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center justify-between text-slate-400">
                      <span className="flex items-center gap-1.5">
                        <Shield className="w-3.5 h-3.5 text-purple-400" />
                        <span>{isKu ? 'بەڕێوەبەری سەرپەرشتیار:' : 'Supervising Manager:'}</span>
                      </span>
                      <span className="font-semibold text-slate-200 font-mono text-[11px] truncate max-w-[180px]">
                        {emp.managerEmail || '—'}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-slate-400">
                      <span className="flex items-center gap-1.5">
                        <Smartphone className="w-3.5 h-3.5 text-blue-400" />
                        <span>{isKu ? 'ئامێری کارمەند:' : 'Device:'}</span>
                      </span>
                      <span className="font-semibold text-slate-200 text-[11px] truncate max-w-[180px]">
                        {emp.deviceName || emp.deviceModel || (isKu ? 'چاوەڕوانی چوونەژوورەوەیە' : 'Awaiting login')}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-slate-400">
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

                    {emp.lastLoginAt && (
                      <div className="flex items-center justify-between text-slate-400 pt-1 border-t border-slate-700/30">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3 text-slate-500" />
                          <span>{isKu ? 'دوایین لۆگین:' : 'Last login:'}</span>
                        </span>
                        <span className="text-[11px] font-mono text-slate-400">
                          {new Date(emp.lastLoginAt).toLocaleString(isKu ? 'ckb' : 'en-US')}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Summary of Permissions Badges */}
                  <div className="flex flex-wrap items-center gap-1.5 mb-4">
                    <span className="text-[10px] text-slate-400 font-semibold me-1">
                      {isKu ? 'دەسەڵاتەکان:' : 'Permissions:'}
                    </span>
                    {MODULE_ITEMS.map((mod) => {
                      const state = emp.permissions?.[mod.key] || 'active';
                      if (state === 'hidden') return null;
                      return (
                        <span
                          key={mod.key}
                          className={`text-[10px] px-1.5 py-0.5 rounded font-semibold flex items-center gap-1 ${
                            state === 'active'
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                              : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                          }`}
                        >
                          {state === 'disabled' && <Lock className="w-2.5 h-2.5" />}
                          <span>{isKu ? mod.labelKu.split(' ')[0] : mod.labelEn.split(' ')[0]}</span>
                        </span>
                      );
                    })}
                    {!emp.permissions?.canDeleteInvoice && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/20 flex items-center gap-0.5">
                        <Lock className="w-2.5 h-2.5" />
                        <span>{isKu ? 'قەدەغەی سڕینەوەی وەسڵ' : 'No Delete'}</span>
                      </span>
                    )}
                  </div>
                </div>

                {/* Bottom Row: Edit Permissions button & Delete */}
                <div className="flex items-center justify-between pt-3 border-t border-slate-700/30 gap-2">
                  <button
                    onClick={() => handleOpenPermissions(emp)}
                    className="flex-1 py-2 px-3 rounded-xl bg-purple-600/15 hover:bg-purple-600/25 border border-purple-500/30 text-purple-400 hover:text-purple-300 text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Sliders className="w-3.5 h-3.5" />
                    <span>{isKu ? 'ڕێکخستنی دەسەڵاتەکان (RBAC)' : 'Edit Permissions'}</span>
                  </button>

                  <button
                    onClick={() => handleDeleteEmployee(emp)}
                    className="p-2 rounded-xl hover:bg-rose-500/15 text-slate-400 hover:text-rose-400 border border-transparent hover:border-rose-500/30 transition cursor-pointer"
                    title={isKu ? 'سڕینەوەی کارمەند' : 'Delete Employee'}
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
      {/* ── MODAL 1: ADD NEW EMPLOYEE ──                                     */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div
            className={`w-full max-w-lg rounded-3xl border shadow-2xl p-5 sm:p-6 space-y-4 max-h-[90vh] overflow-y-auto ${
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
                    {isKu ? 'زیادکردنی ئەکاونتی کارمەند' : 'Add Employee Account'}
                  </h3>
                  <p className="text-xs text-slate-400">
                    {isKu ? 'دروستکردنی دەستڕاگەیشتن بۆ ئەپی فرۆشیار' : 'Create app login for your employee'}
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

            <form onSubmit={handleAddEmployeeSubmit} className="space-y-3.5">
              {/* Name */}
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  {isKu ? 'ناوی کارمەند (بۆ ناسینەوە)' : 'Employee Display Name'}
                </label>
                <input
                  type="text"
                  required
                  placeholder={isKu ? 'نموونە: ئارام ئەحمەد' : 'e.g. John Doe'}
                  value={addName}
                  onChange={(e) => setAddName(e.target.value)}
                  className={`w-full px-3.5 py-2.5 rounded-xl text-xs sm:text-sm border outline-none transition ${
                    isDarkMode
                      ? 'bg-[#0E1524] border-slate-800 text-slate-100 focus:border-purple-500'
                      : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-purple-500'
                  }`}
                />
              </div>

              {/* Email */}
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  {isKu ? 'ئیمەیڵی کارمەند (بۆ چوونەژوورەوە)' : 'Employee Email (Login Username)'}
                </label>
                <input
                  type="email"
                  required
                  placeholder="employee@froshiar.com"
                  value={addEmail}
                  onChange={(e) => setAddEmail(e.target.value)}
                  className={`w-full px-3.5 py-2.5 rounded-xl text-xs sm:text-sm border outline-none transition font-mono ${
                    isDarkMode
                      ? 'bg-[#0E1524] border-slate-800 text-slate-100 focus:border-purple-500'
                      : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-purple-500'
                  }`}
                />
              </div>

              {/* Password */}
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  {isKu ? 'تێپەڕەوشە (پاسۆرد)' : 'Password (Min 6 chars)'}
                </label>
                <input
                  type="text"
                  required
                  placeholder="••••••••"
                  value={addPassword}
                  onChange={(e) => setAddPassword(e.target.value)}
                  className={`w-full px-3.5 py-2.5 rounded-xl text-xs sm:text-sm border outline-none transition font-mono ${
                    isDarkMode
                      ? 'bg-[#0E1524] border-slate-800 text-slate-100 focus:border-purple-500'
                      : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-purple-500'
                  }`}
                />
              </div>

              {/* Manager Official Email */}
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  {isKu ? 'ئیمەیڵی فەرمی بەڕێوەبەر (بۆ بەستنەوەی گۆگڵ درایڤ و داتا)' : 'Manager Official Email (Cloud & Google Drive Link)'}
                </label>
                <input
                  type="email"
                  required
                  placeholder="manager@gmail.com"
                  value={addManagerEmail}
                  onChange={(e) => setAddManagerEmail(e.target.value)}
                  className={`w-full px-3.5 py-2.5 rounded-xl text-xs sm:text-sm border outline-none transition font-mono ${
                    isDarkMode
                      ? 'bg-[#0E1524] border-slate-800 text-slate-100 focus:border-purple-500'
                      : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-purple-500'
                  }`}
                />
                <p className="text-[11px] text-slate-500 mt-1">
                  {isKu
                    ? 'داتاکانی کارمەند ڕاستەوخۆ دەبەسترێنەوە بە هەور و گۆگڵ درایڤی ئەم بەڕێوەبەرە بە شێوەیەکی نەبینراو'
                    : 'Staff data syncs quietly to this manager Google Drive / cloud storage without revealing the destination'}
                </p>
              </div>

              {/* Preset selection */}
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-2">
                  {isKu ? 'مۆدێلی پێشوەختەی دەسەڵاتەکان:' : 'Initial Permission Preset:'}
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => handlePresetSelect('standard')}
                    className={`p-2.5 rounded-xl border text-center transition cursor-pointer ${
                      addPreset === 'standard'
                        ? 'border-purple-500 bg-purple-500/15 text-purple-300 font-bold'
                        : 'border-slate-800 bg-[#0E1524] text-slate-400'
                    }`}
                  >
                    <div className="text-xs font-bold">{isKu ? 'ئاسایی' : 'Standard'}</div>
                    <div className="text-[10px] text-slate-500">{isKu ? 'فرۆشتن و کڕین' : 'Sales & Stock'}</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => handlePresetSelect('cashier')}
                    className={`p-2.5 rounded-xl border text-center transition cursor-pointer ${
                      addPreset === 'cashier'
                        ? 'border-purple-500 bg-purple-500/15 text-purple-300 font-bold'
                        : 'border-slate-800 bg-[#0E1524] text-slate-400'
                    }`}
                  >
                    <div className="text-xs font-bold">{isKu ? 'کاشێر' : 'Cashier'}</div>
                    <div className="text-[10px] text-slate-500">{isKu ? 'تەنها فرۆشتن' : 'POS only'}</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => handlePresetSelect('restricted')}
                    className={`p-2.5 rounded-xl border text-center transition cursor-pointer ${
                      addPreset === 'restricted'
                        ? 'border-purple-500 bg-purple-500/15 text-purple-300 font-bold'
                        : 'border-slate-800 bg-[#0E1524] text-slate-400'
                    }`}
                  >
                    <div className="text-xs font-bold">{isKu ? 'سنووردار' : 'Strict'}</div>
                    <div className="text-[10px] text-slate-500">{isKu ? 'بەشەکان هایدە' : 'Most hidden'}</div>
                  </button>
                </div>
              </div>

              {/* Submit Button */}
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
                  disabled={submittingAdd}
                  className="px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white text-xs sm:text-sm font-bold shadow-lg shadow-purple-500/25 flex items-center gap-2 transition cursor-pointer"
                >
                  {submittingAdd ? (
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
      {/* ── MODAL 2: EDIT EMPLOYEE PERMISSIONS (RBAC) ──                     */}
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
                {isKu ? 'مۆدیوولە سەرەکییەکان (١٠)' : 'Main Modules (10)'}
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

              {/* TAB 2: GRANULAR SETTINGS BUTTONS */}
              {permTab === 'settings' && (
                <div className="space-y-2.5">
                  <div className="p-3 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-300 text-xs">
                    {isKu
                      ? 'ڕێکخستنەکان دوگمە بە دوگمە کۆنترۆڵ دەکرێن؛ دەتوانیت دیاری بکەیت کام دوگمەیەی سیتینگ لای کارمەند دەربکەوێت، قفڵ بێت، یان بە تەواوی بشاردرێتەوە.'
                      : 'Granular button-by-button permission for settings screen.'}
                  </div>

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

              {/* TAB 3: CAN DELETE INVOICES */}
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
                          ? 'ئەگەر ئەم دەسەڵاتە بکوژێنیتەوە، کارمەندەکە لە هیچ شوێنێکی ئەپەکە ناتوانێت هیچ وەسڵ و فرۆشتنێک بسڕێتەوە بۆ پاراستنی داتاکان لە دەستکاری نەخوازراو.'
                          : 'If turned OFF, this employee cannot delete any sales or purchase receipts anywhere in the app.'}
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
                          <span>{isKu ? 'قەدەغەیە (ناچالاکە)' : 'Disallowed'}</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Footer with Save Button */}
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
                {savingPerms ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <CheckCircle2 className="w-4 h-4" />
                )}
                <span>{isKu ? 'پاشەکەوتکردنی دەسەڵاتەکان' : 'Save Changes'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

