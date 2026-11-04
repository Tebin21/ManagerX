'use client';

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
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
  Crown,
  KeyRound,
  UserCheck,
  BadgeCheck,
  Wand2,
  Coins,
  Wallet,
  Building2,
  FileText,
  ChevronUp,
  TrendingUp,
  ArrowUpRight,
  ExternalLink,
} from 'lucide-react';
import { getClientFirestore } from '@/lib/firebase';
import {
  collection,
  doc,
  getDocs,
  setDoc,
  deleteDoc,
  updateDoc,
  deleteField,
  onSnapshot,
  query,
  where,
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

export interface OnlineStoreActivation {
  id: string;
  email: string;
  customerName?: string;
  phone?: string;
  storeName: string;
  subdomain: string;
  enabled: boolean;
  status: 'active' | 'suspended';
  priceAmount?: string;
  currency?: string;
  durationDays?: number | 'unlimited';
  startDate?: string;
  expiresAt?: string | null;
  activatedAt?: string;
  updatedAt?: string;
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
  canEditReceiptCustomization?: boolean;

  // Granular Settings items (button-by-button)
  settingsLanguage: PermissionState;
  settingsProfile: PermissionState;
  settingsCurrency: PermissionState;
  settingsTheme: PermissionState;
  settingsBackup: PermissionState;
  settingsReceiptCustomization?: PermissionState;
  settingsDeleteAccount: PermissionState;
}

export interface UpgradeReceipt {
  receiptId: string;
  upgradedAt: string;
  customerName: string;
  email: string;
  planDuration: string;
  startDate: string;
  expiresAt?: string | null;
  priceAmount?: string | null;
  limits?: EmployeeUsageLimits;
  storeEnabled?: boolean;
}

export interface EmployeeAccount {
  id: string;
  email: string;
  displayName: string;
  managerEmail: string;
  password?: string;
  passwordUpdatedAt?: string;
  phone?: string;
  priceAmount?: string;
  durationDays?: number;
  startedAt?: string; // ISO date string (Subscription start)
  expiresAt?: string; // ISO date string
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
  accountType?: 'registered' | 'custom';
  role?: 'manager' | 'employee' | 'user';
  targetPlatform?: 'all' | 'macos' | 'windows';
  provider?: string;
  upgradeReceipt?: UpgradeReceipt;
}

export const ALL_ACTIVE_PERMISSIONS: EmployeePermissions = {
  sales: 'active',
  purchases: 'active',
  inventory: 'active',
  reports: 'active',
  history: 'active',
  invoices: 'active',
  debts: 'active',
  expenses: 'active',
  quotations: 'active',
  dashboard: 'active',
  onlineStore: 'active',

  canDeleteInvoice: true,
  canEditReceiptCustomization: true,

  settingsLanguage: 'active',
  settingsProfile: 'active',
  settingsCurrency: 'active',
  settingsTheme: 'active',
  settingsBackup: 'active',
  settingsReceiptCustomization: 'active',
  settingsDeleteAccount: 'active',
};

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
  canEditReceiptCustomization: false,

  settingsLanguage: 'disabled',
  settingsProfile: 'hidden',
  settingsCurrency: 'hidden',
  settingsTheme: 'active',
  settingsBackup: 'hidden',
  settingsReceiptCustomization: 'disabled',
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
  { key: 'settingsReceiptCustomization', labelKu: 'شێوازی چاپ و ڕێکخستنی پسوولەکان', labelEn: 'Print & Receipt Customization', descKu: 'دەسەڵاتی گۆڕینی قەبارە و داتای وەسڵەکان' },
  { key: 'settingsDeleteAccount', labelKu: 'سڕینەوەی ئەکاونت و داتا', labelEn: 'Reset & Delete Data', descKu: 'سڕینەوەی سەرجەم داتا و مێژووی سیستەم' },
];

function getCleanDocId(email: string): string {
  return email.trim().toLowerCase().replace(/[^a-z0-9_]/gi, '_');
}

function slugifyStoreName(name: string): string {
  if (!name) return '';
  const kurdishMap: Record<string, string> = {
    'ئ': '', 'ا': 'a', 'آ': 'a', 'ب': 'b', 'پ': 'p', 'ت': 't', 'ج': 'j', 'چ': 'ch',
    'ح': 'h', 'خ': 'kh', 'د': 'd', 'ر': 'r', 'ڕ': 'rr', 'ز': 'z', 'ژ': 'zh', 'س': 's',
    'ش': 'sh', 'ص': 's', 'ض': 'd', 'ط': 't', 'ظ': 'z', 'ع': 'a', 'غ': 'gh', 'ف': 'f',
    'ڤ': 'v', 'ق': 'q', 'ک': 'k', 'گ': 'g', 'ل': 'l', 'ڵ': 'll', 'م': 'm', 'ن': 'n',
    'و': 'w', 'ۆ': 'o', 'وو': 'oo', 'ه': 'h', 'ھ': 'h', 'ە': 'a', 'ی': 'y', 'ێ': 'e',
    'ي': 'y', 'ك': 'k', 'ة': 'a', 'ء': ''
  };

  let transliterated = '';
  for (const char of name.toLowerCase()) {
    if (kurdishMap[char] !== undefined) {
      transliterated += kurdishMap[char];
    } else if (/[a-z0-9]/.test(char)) {
      transliterated += char;
    } else if (/\s|-|_/.test(char)) {
      transliterated += '-';
    }
  }

  const clean = transliterated
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');

  return clean || getCleanDocId(name);
}

function stripUndefined<T>(obj: T): T {
  if (obj === null || obj === undefined || typeof obj !== 'object') {
    return obj;
  }
  if (Array.isArray(obj)) {
    return obj.map(stripUndefined) as unknown as T;
  }
  const clean: any = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined) {
      clean[key] = stripUndefined(value);
    }
  }
  return clean;
}

const PRESET_OPTIONS = [
  { days: 30,  titleKu: '١ مانگ',  subKu: '+٣٠ ڕۆژ',  titleEn: '1 Month',  subEn: '+30 Days' },
  { days: 60,  titleKu: '٢ مانگ',  subKu: '+٦٠ ڕۆژ',  titleEn: '2 Months', subEn: '+60 Days' },
  { days: 90,  titleKu: '٣ مانگ',  subKu: '+٩٠ ڕۆژ',  titleEn: '3 Months', subEn: '+90 Days' },
  { days: 180, titleKu: '٦ مانگ',  subKu: '+١٨٠ ڕۆژ', titleEn: '6 Months', subEn: '+180 Days' },
  { days: 365, titleKu: '١ ساڵ',   subKu: '+٣٦٥ ڕۆژ', titleEn: '1 Year',   subEn: '+365 Days' },
  { days: 'unlimited' as const, titleKu: '∞ بێ سنوور', subKu: 'هەمیشەیی', titleEn: '∞ Unlimited', subEn: 'Lifetime' },
];

interface InteractiveCalendarPickerProps {
  startDate: string;
  endDate: string;
  onSelectStart: (d: string) => void;
  onSelectEnd: (d: string) => void;
  isKu: boolean;
  isDarkMode: boolean;
  onClose?: () => void;
}

const InteractiveCalendarPicker: React.FC<InteractiveCalendarPickerProps> = ({
  startDate,
  endDate,
  onSelectStart,
  onSelectEnd,
  isKu,
  isDarkMode,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<'start' | 'end'>('start');
  const [viewYear, setViewYear] = useState<number>(() => {
    const base = startDate ? new Date(startDate) : new Date();
    return isNaN(base.getTime()) ? new Date().getFullYear() : base.getFullYear();
  });
  const [viewMonth, setViewMonth] = useState<number>(() => {
    const base = startDate ? new Date(startDate) : new Date();
    return isNaN(base.getTime()) ? new Date().getMonth() : base.getMonth();
  });

  const monthNamesKu = [
    'کانوونی دووەم (١)', 'شوبات (٢)', 'ئازار (٣)', 'نیسان (٤)', 'ئایار (٥)', 'حوزەیران (٦)',
    'تەممووز (٧)', 'ئاب (٨)', 'ئەیلوول (٩)', 'تشرینی یەکەم (١٠)', 'تشرینی دووەم (١١)', 'کانوونی یەکەم (١٢)'
  ];
  const monthNamesEn = [
    'January (1)', 'February (2)', 'March (3)', 'April (4)', 'May (5)', 'June (6)',
    'July (7)', 'August (8)', 'September (9)', 'October (10)', 'November (11)', 'December (12)'
  ];

  const weekDaysKu = ['شەممە', '١شەم', '٢شەم', '٣شەم', '٤شەم', '٥شەم', 'هەینی'];
  const weekDaysEn = ['Sat', 'Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri'];

  const prevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((y) => y - 1);
    } else {
      setViewMonth((m) => m - 1);
    }
  };

  const nextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((y) => y + 1);
    } else {
      setViewMonth((m) => m + 1);
    }
  };

  const jumpToToday = () => {
    const now = new Date();
    setViewYear(now.getFullYear());
    setViewMonth(now.getMonth());
    const pad = (n: number) => (n < 10 ? `0${n}` : `${n}`);
    const todayStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
    if (activeTab === 'start') {
      onSelectStart(todayStr);
      setActiveTab('end');
    } else {
      onSelectEnd(todayStr);
    }
  };

  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const firstDay = new Date(viewYear, viewMonth, 1).getDay(); // 0=Sun..6=Sat
  const startOffset = (firstDay + 1) % 7;

  const pad = (n: number) => (n < 10 ? `0${n}` : `${n}`);
  const formatYMD = (day: number) => `${viewYear}-${pad(viewMonth + 1)}-${pad(day)}`;

  const now = new Date();
  const todayYMD = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;

  return (
    <div className={`p-4 sm:p-5 rounded-2xl border transition-all space-y-3.5 ${
      isDarkMode ? 'bg-[#0B101D] border-purple-500/30 shadow-xl' : 'bg-white border-purple-300 shadow-xl'
    }`}>
      {/* Mode / Target Selector Tabs */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className={`flex items-center p-1 rounded-xl border text-xs font-bold ${
          isDarkMode ? 'bg-slate-900 border-slate-700' : 'bg-slate-100 border-slate-300'
        }`}>
          <button
            type="button"
            onClick={() => setActiveTab('start')}
            className={`px-3 py-1.5 rounded-lg transition cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'start'
                ? 'bg-purple-600 text-white shadow-sm font-extrabold'
                : isDarkMode ? 'text-slate-400 hover:text-white' : 'text-slate-700 hover:text-slate-900'
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>{isKu ? 'دیاریکردنی دەستپێک:' : 'Set Start:'}</span>
            <span className="font-mono underline">{startDate || '—'}</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('end')}
            className={`px-3 py-1.5 rounded-lg transition cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'end'
                ? 'bg-emerald-600 text-white shadow-sm font-extrabold'
                : isDarkMode ? 'text-slate-400 hover:text-white' : 'text-slate-700 hover:text-slate-900'
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>{isKu ? 'دیاریکردنی کۆتایی:' : 'Set End:'}</span>
            <span className={endDate ? "font-mono underline" : "underline font-bold"}>{endDate || (isKu ? 'بێ سنوور' : 'Unlimited')}</span>
          </button>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={jumpToToday}
            className={`px-2.5 py-1.5 rounded-lg text-xs font-bold border transition cursor-pointer ${
              isDarkMode
                ? 'bg-slate-800 text-amber-300 border-slate-700 hover:bg-slate-700'
                : 'bg-amber-50 text-amber-900 border-amber-300 hover:bg-amber-100 font-extrabold'
            }`}
          >
            {isKu ? 'ئەمڕۆ (Today)' : 'Today'}
          </button>
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className={`p-1.5 rounded-lg border transition cursor-pointer ${
                isDarkMode ? 'border-slate-700 text-slate-400 hover:text-white' : 'border-slate-300 text-slate-600 hover:text-slate-900'
              }`}
              title={isKu ? 'داخستن' : 'Close'}
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Month Navigation */}
      <div className={`p-2.5 rounded-xl border flex items-center justify-between ${
        isDarkMode ? 'bg-[#10182B] border-slate-800' : 'bg-slate-50 border-slate-200'
      }`}>
        <button
          type="button"
          onClick={prevMonth}
          className={`px-2.5 py-1.5 rounded-lg border text-xs font-bold transition cursor-pointer flex items-center gap-1 ${
            isDarkMode ? 'bg-slate-800 border-slate-700 hover:bg-slate-700 text-slate-200' : 'bg-white border-slate-300 hover:bg-slate-100 text-slate-800 shadow-2xs'
          }`}
        >
          <ArrowRight className="w-3.5 h-3.5 rtl:rotate-180" />
          <span>{isKu ? 'مانگی پێشوو' : 'Prev'}</span>
        </button>

        <span className="text-xs sm:text-sm font-black text-purple-600 dark:text-purple-400">
          {isKu ? monthNamesKu[viewMonth] : monthNamesEn[viewMonth]} {viewYear}
        </span>

        <button
          type="button"
          onClick={nextMonth}
          className={`px-2.5 py-1.5 rounded-lg border text-xs font-bold transition cursor-pointer flex items-center gap-1 ${
            isDarkMode ? 'bg-slate-800 border-slate-700 hover:bg-slate-700 text-slate-200' : 'bg-white border-slate-300 hover:bg-slate-100 text-slate-800 shadow-2xs'
          }`}
        >
          <span>{isKu ? 'مانگی داهاتوو' : 'Next'}</span>
          <ArrowLeft className="w-3.5 h-3.5 rtl:rotate-180" />
        </button>
      </div>

      {/* Calendar Grid Table */}
      <div className="w-full">
        {/* Days of week header */}
        <div className="grid grid-cols-7 gap-1 text-center mb-1.5">
          {(isKu ? weekDaysKu : weekDaysEn).map((dayName, idx) => (
            <div
              key={idx}
              className={`text-[11px] font-extrabold py-1 ${
                idx === 6
                  ? 'text-rose-500' // Friday
                  : isDarkMode ? 'text-slate-400' : 'text-slate-600'
              }`}
            >
              {dayName}
            </div>
          ))}
        </div>

        {/* Days grid */}
        <div className="grid grid-cols-7 gap-1">
          {Array.from({ length: startOffset }).map((_, i) => (
            <div key={`offset-${i}`} className="h-9 sm:h-10" />
          ))}

          {Array.from({ length: daysInMonth }).map((_, i) => {
            const dayNum = i + 1;
            const ymd = formatYMD(dayNum);
            const isStart = ymd === startDate;
            const isEnd = ymd === endDate;
            const inRange = Boolean(
              startDate && endDate && ymd > startDate && ymd < endDate
            );
            const isToday = ymd === todayYMD;

            return (
              <button
                key={ymd}
                type="button"
                onClick={() => {
                  if (activeTab === 'start') {
                    onSelectStart(ymd);
                    setActiveTab('end');
                  } else {
                    onSelectEnd(ymd);
                  }
                }}
                className={`h-9 sm:h-10 rounded-xl text-xs font-bold transition-all flex flex-col items-center justify-center relative cursor-pointer ${
                  isStart
                    ? 'bg-purple-600 text-white font-black shadow-md shadow-purple-500/40 ring-2 ring-purple-400 scale-[1.04] z-10'
                    : isEnd
                    ? 'bg-emerald-600 text-white font-black shadow-md shadow-emerald-500/40 ring-2 ring-emerald-400 scale-[1.04] z-10'
                    : inRange
                    ? isDarkMode
                      ? 'bg-purple-900/40 text-purple-200 border border-purple-700/50'
                      : 'bg-purple-100 text-purple-950 font-bold border border-purple-200'
                    : isToday
                    ? isDarkMode
                      ? 'border border-amber-400 text-amber-300 hover:bg-slate-800'
                      : 'border-2 border-amber-500 text-amber-950 bg-amber-50/50 hover:bg-amber-100 font-extrabold'
                    : isDarkMode
                    ? 'hover:bg-slate-800 text-slate-200 border border-transparent'
                    : 'hover:bg-purple-50 text-slate-800 border border-transparent hover:border-purple-200'
                }`}
              >
                <span>{dayNum}</span>
                {isStart && (
                  <span className="text-[8px] font-black leading-none mt-0.5 opacity-90">دەستپێک</span>
                )}
                {isEnd && (
                  <span className="text-[8px] font-black leading-none mt-0.5 opacity-90">کۆتایی</span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Footer Info: Current Selection & Close */}
      <div className={`pt-2.5 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs flex-wrap gap-2`}>
        <div className="flex items-center gap-2">
          <span className={`font-bold ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
            {isKu ? 'ماوەی هەڵبژێردراو:' : 'Selected Range:'}
          </span>
          <span className={`font-mono font-black ${isDarkMode ? 'text-purple-300' : 'text-purple-800'}`}>
            {startDate || '—'} ← {endDate || (isKu ? 'بێ سنوور ∞' : 'Unlimited ∞')}
          </span>
        </div>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1 rounded-lg bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs cursor-pointer shadow-xs"
          >
            {isKu ? 'تەواو / داخستن ✓' : 'Done ✓'}
          </button>
        )}
      </div>
    </div>
  );
};

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
  const [addModalMode, setAddModalMode] = useState<'upgrade_registered' | 'create_custom'>('upgrade_registered');
  const [registeredUsers, setRegisteredUsers] = useState<any[]>([]);
  const [regUsersLoading, setRegUsersLoading] = useState(false);
  const [selectedRegisteredUserEmail, setSelectedRegisteredUserEmail] = useState('');
  const [userSearchTerm, setUserSearchTerm] = useState('');
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
  const [formDuration, setFormDuration] = useState<number | 'unlimited'>(30); // days
  const [customAccountRole, setCustomAccountRole] = useState<'manager' | 'employee'>('manager');
  const [formPlatform, setFormPlatform] = useState<'all' | 'macos' | 'windows'>('all');
  const [formStartedAt, setFormStartedAt] = useState<string>(''); // YYYY-MM-DD
  const [formExpiresAt, setFormExpiresAt] = useState<string>(''); // YYYY-MM-DD
  const [showCalendar, setShowCalendar] = useState<boolean>(false);

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

  // Live password change alert
  const [passwordAlert, setPasswordAlert] = useState<{
    name: string;
    email: string;
    pass: string;
    manager: string;
    time: string;
  } | null>(null);
  const previousPasswordsRef = useRef<Map<string, string>>(new Map());

  // ── Admin Sections: 1. Accounts | 2. Financials | 3. Online Stores | 4. Domains ──
  const [adminSection, setAdminSection] = useState<'accounts' | 'financials' | 'online_stores' | 'domains'>('accounts');
  const [financialSearch, setFinancialSearch] = useState('');
  const [financialFilter, setFinancialFilter] = useState<'all' | 'paid' | 'managers' | 'custom'>('all');
  const [expandedManagerEmails, setExpandedManagerEmails] = useState<Set<string>>(new Set());

  // ── Created Domains (لیستی دۆمەینەکان) Section State ──
  const [domainSearchTerm, setDomainSearchTerm] = useState('');
  const [domainStatusFilter, setDomainStatusFilter] = useState<'all' | 'active' | 'suspended' | 'expired'>('all');
  const [selectedDomainDetail, setSelectedDomainDetail] = useState<OnlineStoreActivation | null>(null);

  // ── Online Stores (وێب ستۆرەکان) Section State ──
  const [storeActivations, setStoreActivations] = useState<OnlineStoreActivation[]>([]);
  const [storeSearchTerm, setStoreSearchTerm] = useState('');
  const [storeStatusFilter, setStoreStatusFilter] = useState<'all' | 'active' | 'suspended' | 'expired'>('all');

  // Dedicated New Store Modal State
  const [showNewStoreModal, setShowNewStoreModal] = useState(false);
  const [newStoreAccountSearch, setNewStoreAccountSearch] = useState('');
  const [newStoreEmail, setNewStoreEmail] = useState('');
  const [newStoreCustomerName, setNewStoreCustomerName] = useState('');
  const [newStorePhone, setNewStorePhone] = useState('');
  const [newStoreName, setNewStoreName] = useState('');
  const [newStoreSubdomain, setNewStoreSubdomain] = useState('');
  const [newStorePrice, setNewStorePrice] = useState('');
  const [newStoreDuration, setNewStoreDuration] = useState<number | 'unlimited'>(30);
  const [newStoreStartDate, setNewStoreStartDate] = useState('');
  const [newStoreCustomExpiry, setNewStoreCustomExpiry] = useState('');
  const [newStoreSubmitting, setNewStoreSubmitting] = useState(false);
  const [newStoreError, setNewStoreError] = useState<string | null>(null);

  // Dedicated Edit / Renew Store Modal State
  const [editingStoreData, setEditingStoreData] = useState<OnlineStoreActivation | null>(null);
  const [editStoreName, setEditStoreName] = useState('');
  const [editStoreSubdomain, setEditStoreSubdomain] = useState('');
  const [editStorePhone, setEditStorePhone] = useState('');
  const [editStorePrice, setEditStorePrice] = useState('');
  const [editStoreDuration, setEditStoreDuration] = useState<number | 'unlimited'>(30);
  const [editStoreStartDate, setEditStoreStartDate] = useState('');
  const [editStoreCustomExpiry, setEditStoreCustomExpiry] = useState('');
  const [editStoreSubmitting, setEditStoreSubmitting] = useState(false);

  // Quick Price Edit Modal State
  const [quickPriceEmployee, setQuickPriceEmployee] = useState<EmployeeAccount | null>(null);
  const [quickPriceValue, setQuickPriceValue] = useState('');
  const [savingQuickPrice, setSavingQuickPrice] = useState(false);

  // Official Receipt Preview Modal State
  const [viewingReceiptEmployee, setViewingReceiptEmployee] = useState<EmployeeAccount | null>(null);

  // Online Store Activation Table Modal State (25s countdown, trilingual)
  interface StoreActivationModalData {
    employee: EmployeeAccount;
    storeName: string;
    subdomain: string;
    url: string;
    email: string;
    phone?: string;
    activatedAt: string;
  }
  const [storeActivationData, setStoreActivationData] = useState<StoreActivationModalData | null>(null);
  const [activationCountdown, setActivationCountdown] = useState<number>(25);
  const [activationModalLang, setActivationModalLang] = useState<'ku' | 'ar' | 'en'>('ku');
  const [copiedStoreUrl, setCopiedStoreUrl] = useState<boolean>(false);

  useEffect(() => {
    if (!storeActivationData) return;
    setActivationCountdown(25);
    const interval = setInterval(() => {
      setActivationCountdown((prev) => {
        if (prev <= 1) {
          setStoreActivationData(null);
          return 25;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [storeActivationData]);

  const storeActivationI18n = {
    ku: {
      title: 'وەسڵی فەرمیی چالاککردنی وێبسایت',
      badge: 'چالاک کراوە 🟢',
      customerName: 'ناوی کڕیار / مارکێت:',
      storeName: 'ناوی فرۆشگا:',
      email: 'ئیمەیڵی فەرمی:',
      phone: 'ژمارەی مۆبایل:',
      subdomain: 'دۆمەینی تەرخانکراو:',
      storeUrl: 'بەستەری فەرمیی ماڵپەڕ:',
      status: 'دۆخی وێبسایت:',
      statusValue: 'چالاکە و ئامادەیە بۆ کڕین',
      activatedAt: 'کاتی چالاککردن:',
      copyBtn: 'کۆپیکردن',
      openBtn: 'کردنەوە',
      copied: 'کۆپی کرا!',
      sendWhatsapp: 'ناردنی زانیاری بە واتسئەپ',
      close: 'داخستن',
      countdown: (sec: number) => `داخستنی خۆکار لەماوەی (${sec}) چرکەدا...`,
      waMsg: (s: any) =>
        `سڵاو بەڕێز ${s.employee?.displayName || s.storeName}\n\n پیرۆزە! فرۆشگای ئۆنلاینی تایبەت بە مارکێتەکەت بە سەرکەوتوویی لەسەر پلاتفۆرمی فرۆشیار چالاککرا.\n\n ناوی فرۆشگا: ${s.storeName}\n بەستەری ماڵپەڕەکەت:\n${s.url}\n\nدەتوانیت لەناو ئەپی فرۆشیار لە بەشی (ستۆری ئۆنلاین) کاڵاکانت ڕاستەوخۆ هاوکات (Sync) بکەیت.`,
    },
    ar: {
      title: 'إيصال تفعيل المتجر الإلكتروني',
      badge: 'مفعل بنجاح 🟢',
      customerName: 'اسم العميل / المتجر:',
      storeName: 'اسم المتجر:',
      email: 'البريد الرسمي:',
      phone: 'رقم الهاتف:',
      subdomain: 'النطاق المخصص:',
      storeUrl: 'رابط المتجر الرسمي:',
      status: 'حالة المتجر:',
      statusValue: 'مفعل وجاهز للطلبات',
      activatedAt: 'وقت التفعيل:',
      copyBtn: 'نسخ الرابط',
      openBtn: 'زيارة المتجر',
      copied: 'تم النسخ!',
      sendWhatsapp: 'إرسال التفاصيل عبر واتساب',
      close: 'إغلاق',
      countdown: (sec: number) => `الإغلاق التلقائي خلال (${sec}) ثانية...`,
      waMsg: (s: any) =>
        `مرحباً بك ${s.employee?.displayName || s.storeName}\n\n مبروك! تم تفعيل متجرك الإلكتروني بنجاح على منصة فروشيار.\n\n اسم المتجر: ${s.storeName}\n رابط متجرك:\n${s.url}\n\nيمكنك الآن مزامنة المنتجات مباشرة من تطبيق فروشيار.`,
    },
    en: {
      title: 'Official Storefront Activation Receipt',
      badge: 'Active & Verified 🟢',
      customerName: 'Customer / Business:',
      storeName: 'Store Name:',
      email: 'Official Email:',
      phone: 'Phone Number:',
      subdomain: 'Assigned Subdomain:',
      storeUrl: 'Official Storefront URL:',
      status: 'Storefront Status:',
      statusValue: 'Active & Ready for Orders',
      activatedAt: 'Activation Timestamp:',
      copyBtn: 'Copy URL',
      openBtn: 'Open Storefront',
      copied: 'Copied!',
      sendWhatsapp: 'Send via WhatsApp',
      close: 'Close',
      countdown: (sec: number) => `Auto-closing in (${sec}) seconds...`,
      waMsg: (s: any) =>
        `Hello ${s.employee?.displayName || s.storeName},\n\nCongratulations! Your official online store has been activated on Froshiar.\n\nStore Name: ${s.storeName}\nStorefront URL:\n${s.url}\n\nYou can now sync your catalog directly from the Froshiar app.`,
    },
  };

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
          const isInitialLoad = previousPasswordsRef.current.size === 0;
          const list: EmployeeAccount[] = [];

          snapshot.forEach((docSnap) => {
            const data = docSnap.data() as EmployeeAccount;
            if (data && data.email) {
              const prevPass = previousPasswordsRef.current.get(docSnap.id);

              // If password was changed live by manager after initial load:
              if (!isInitialLoad && prevPass && data.password && prevPass !== data.password) {
                setPasswordAlert({
                  name: data.displayName || data.email,
                  email: data.email,
                  pass: data.password,
                  manager: data.managerEmail || '—',
                  time: new Date().toLocaleTimeString(),
                });
              }

              previousPasswordsRef.current.set(docSnap.id, data.password || '');

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

  // Fetch registered users from app_telemetry_users
  const fetchRegisteredUsers = useCallback(async () => {
    const db = getClientFirestore();
    if (!db) return;
    setRegUsersLoading(true);
    try {
      const snap = await getDocs(collection(db, 'app_telemetry_users'));
      const list: any[] = [];
      snap.forEach((d) => {
        const data = d.data();
        if (data && (data.email || data.user_id || data.display_name)) {
          list.push({ id: d.id, ...data });
        }
      });
      list.sort((a, b) => new Date(b.last_login_at || b.created_at || 0).getTime() - new Date(a.last_login_at || a.created_at || 0).getTime());
      setRegisteredUsers(list);
    } catch (err) {
      console.warn('Could not fetch app_telemetry_users:', err);
    } finally {
      setRegUsersLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRegisteredUsers();
  }, [fetchRegisteredUsers]);

  // Filtered registered users
  const filteredRegisteredUsers = useMemo(() => {
    if (!userSearchTerm.trim()) return registeredUsers.slice(0, 35);
    const q = userSearchTerm.toLowerCase().trim();
    return registeredUsers.filter((u) => {
      const email = (u.email || '').toLowerCase();
      const name = (u.display_name || '').toLowerCase();
      const bName = (u.business_name || '').toLowerCase();
      const phone = (u.phone || '').toLowerCase();
      return email.includes(q) || name.includes(q) || bName.includes(q) || phone.includes(q);
    });
  }, [registeredUsers, userSearchTerm]);

  // ── Online Store Activations Realtime Listener ──
  useEffect(() => {
    const db = getClientFirestore();
    if (!db) return;

    try {
      const colRef = collection(db, 'store_activations');
      const unsubscribe = onSnapshot(
        colRef,
        (snapshot) => {
          const list: OnlineStoreActivation[] = [];
          snapshot.forEach((docSnap) => {
            const data = docSnap.data();
            if (data) {
              list.push({
                id: docSnap.id,
                email: data.email || '',
                customerName: data.customerName || data.name || data.displayName || '',
                phone: data.phone || '',
                storeName: data.storeName || '',
                subdomain: data.subdomain || '',
                enabled: data.enabled !== false,
                status: data.status === 'suspended' ? 'suspended' : 'active',
                priceAmount: data.priceAmount || '',
                currency: data.currency || '',
                durationDays: data.durationDays,
                startDate: data.startDate || data.activatedAt || '',
                expiresAt: data.expiresAt || null,
                activatedAt: data.activatedAt || '',
                updatedAt: data.updatedAt || '',
              });
            }
          });
          setStoreActivations(list);
        },
        (err) => {
          console.warn('store_activations onSnapshot error:', err);
        }
      );
      return () => unsubscribe();
    } catch (e) {
      console.warn('store_activations init error:', e);
    }
  }, []);

  // ── Unified Online Stores (merging store_activations and employee accounts) ──
  const allOnlineStores = useMemo(() => {
    const map = new Map<string, OnlineStoreActivation>();

    // 1. From store_activations
    storeActivations.forEach((st) => {
      const key = (st.email || st.id || '').trim().toLowerCase();
      if (key) map.set(key, st);
    });

    // 2. From employees who have onlineStore configured
    employees.forEach((emp) => {
      const key = (emp.email || emp.id || '').trim().toLowerCase();
      if (emp.onlineStore && (emp.onlineStore.enabled || emp.onlineStore.subdomain)) {
        const existing = map.get(key);
        if (!existing) {
          map.set(key, {
            id: getCleanDocId(emp.email) || emp.id,
            email: emp.email || '',
            customerName: emp.displayName || '',
            phone: emp.phone || '',
            storeName: emp.onlineStore.storeName || emp.displayName || 'Store',
            subdomain: emp.onlineStore.subdomain || '',
            enabled: emp.onlineStore.enabled !== false,
            status: emp.onlineStore.status === 'suspended' ? 'suspended' : 'active',
            priceAmount: emp.priceAmount || '',
            durationDays: emp.durationDays,
            startDate: emp.startedAt || emp.createdAt || '',
            expiresAt: emp.expiresAt || null,
            activatedAt: emp.onlineStore.activatedAt || emp.createdAt || '',
          });
        } else {
          map.set(key, {
            ...existing,
            customerName: existing.customerName || emp.displayName || '',
            phone: existing.phone || emp.phone || '',
            priceAmount: existing.priceAmount || emp.priceAmount || '',
            expiresAt: existing.expiresAt || emp.expiresAt || null,
            startDate: existing.startDate || emp.startedAt || emp.createdAt || '',
          });
        }
      }
    });

    const list = Array.from(map.values());
    list.sort((a, b) => new Date(b.activatedAt || b.startDate || 0).getTime() - new Date(a.activatedAt || a.startDate || 0).getTime());
    return list;
  }, [storeActivations, employees]);

  // ── Financial Stats for Online Stores ──
  const storeFinancialStats = useMemo(() => {
    let totalUsd = 0;
    let totalIqd = 0;
    let paidCount = 0;
    let activeCount = 0;
    let suspendedCount = 0;
    let expiredCount = 0;

    allOnlineStores.forEach((st) => {
      const isExp = st.expiresAt ? new Date(st.expiresAt).getTime() < Date.now() : false;
      const isSusp = st.status === 'suspended' || !st.enabled;

      if (isSusp) {
        suspendedCount++;
      } else if (isExp) {
        expiredCount++;
      } else {
        activeCount++;
      }

      const price = (st.priceAmount || '').trim();
      if (price) {
        paidCount++;
        const isUsd =
          price.includes('$') ||
          /usd/i.test(price) ||
          (!price.includes('IQD') && !price.includes('دینار') && (parseFloat(price.replace(/[^0-9.]/g, '')) || 0) <= 500);
        const numericVal = parseFloat(price.replace(/[^0-9.]/g, '')) || 0;
        if (numericVal > 0) {
          if (isUsd) totalUsd += numericVal;
          else totalIqd += numericVal;
        }
      }
    });

    return {
      totalStores: allOnlineStores.length,
      activeCount,
      suspendedCount,
      expiredCount,
      paidCount,
      totalUsd,
      totalIqd,
    };
  }, [allOnlineStores]);

  // ── Selectable Accounts for Store Activation (Deduplicated: Employees + Registered Users) ──
  const selectableAccounts = useMemo(() => {
    const map = new Map<string, {
      email: string;
      displayName: string;
      phone: string;
      accountType: 'employee' | 'registered' | 'both';
      hasStore: boolean;
      currentSubdomain?: string;
    }>();

    // 1. Employees / Custom Staff
    employees.forEach((emp) => {
      const em = (emp.email || '').trim().toLowerCase();
      if (!em) return;
      map.set(em, {
        email: em,
        displayName: emp.displayName || em.split('@')[0],
        phone: emp.phone || '',
        accountType: emp.accountType === 'registered' ? 'registered' : 'employee',
        hasStore: Boolean(emp.onlineStore?.enabled || emp.onlineStore?.subdomain),
        currentSubdomain: emp.onlineStore?.subdomain,
      });
    });

    // 2. Registered Users (Google / Apple / Email from app_telemetry_users)
    registeredUsers.forEach((u) => {
      const em = (u.email || u.user_id || '').trim().toLowerCase();
      if (!em) return;
      const existing = map.get(em);
      if (existing) {
        existing.displayName = existing.displayName || u.display_name || u.business_name || em.split('@')[0];
        existing.phone = existing.phone || u.phone || '';
        existing.accountType = 'both';
      } else {
        map.set(em, {
          email: em,
          displayName: u.display_name || u.business_name || em.split('@')[0],
          phone: u.phone || '',
          accountType: 'registered',
          hasStore: false,
        });
      }
    });

    // Cross-check with store activations
    allOnlineStores.forEach((st) => {
      const em = (st.email || '').trim().toLowerCase();
      if (em && map.has(em)) {
        const item = map.get(em)!;
        item.hasStore = true;
        item.currentSubdomain = st.subdomain;
      }
    });

    return Array.from(map.values());
  }, [employees, registeredUsers, allOnlineStores]);

  const filteredSelectableAccounts = useMemo(() => {
    if (!newStoreAccountSearch.trim()) return selectableAccounts.slice(0, 15);
    const q = newStoreAccountSearch.toLowerCase().trim();
    return selectableAccounts
      .filter((acc) => {
        return (
          acc.email.toLowerCase().includes(q) ||
          acc.displayName.toLowerCase().includes(q) ||
          acc.phone.toLowerCase().includes(q)
        );
      })
      .slice(0, 25);
  }, [selectableAccounts, newStoreAccountSearch]);

  // ── Filtered Online Stores for Table/Grid ──
  const filteredOnlineStores = useMemo(() => {
    return allOnlineStores.filter((st) => {
      const q = storeSearchTerm.toLowerCase().trim();
      const matchSearch =
        !q ||
        (st.storeName || '').toLowerCase().includes(q) ||
        (st.subdomain || '').toLowerCase().includes(q) ||
        (st.email || '').toLowerCase().includes(q) ||
        (st.customerName || '').toLowerCase().includes(q) ||
        (st.phone || '').toLowerCase().includes(q) ||
        (st.priceAmount || '').toLowerCase().includes(q);

      const isExp = st.expiresAt ? new Date(st.expiresAt).getTime() < Date.now() : false;
      const isSusp = st.status === 'suspended' || !st.enabled;

      let matchStatus = true;
      if (storeStatusFilter === 'active') matchStatus = !isSusp && !isExp;
      else if (storeStatusFilter === 'suspended') matchStatus = isSusp;
      else if (storeStatusFilter === 'expired') matchStatus = isExp;

      return matchSearch && matchStatus;
    });
  }, [allOnlineStores, storeSearchTerm, storeStatusFilter]);

  // ── All Registered Domains List (Unique by Subdomain) ──
  const allDomainsList = useMemo(() => {
    const seen = new Set<string>();
    const list: OnlineStoreActivation[] = [];

    allOnlineStores.forEach((st) => {
      const cleanSub = (st.subdomain || '').trim().toLowerCase();
      if (cleanSub && !seen.has(cleanSub)) {
        seen.add(cleanSub);
        list.push(st);
      }
    });

    list.sort((a, b) => new Date(b.activatedAt || b.startDate || 0).getTime() - new Date(a.activatedAt || a.startDate || 0).getTime());
    return list;
  }, [allOnlineStores]);

  const domainStats = useMemo(() => {
    let activeCount = 0;
    let suspendedCount = 0;
    let expiredCount = 0;

    allDomainsList.forEach((d) => {
      const isExp = d.expiresAt ? new Date(d.expiresAt).getTime() < Date.now() : false;
      const isSusp = d.status === 'suspended' || !d.enabled;
      if (isSusp) suspendedCount++;
      else if (isExp) expiredCount++;
      else activeCount++;
    });

    return {
      total: allDomainsList.length,
      activeCount,
      suspendedCount,
      expiredCount,
    };
  }, [allDomainsList]);

  const filteredDomainsList = useMemo(() => {
    return allDomainsList.filter((item) => {
      const q = domainSearchTerm.trim().toLowerCase();
      const matchQuery =
        !q ||
        (item.subdomain || '').toLowerCase().includes(q) ||
        (item.storeName || '').toLowerCase().includes(q) ||
        (item.customerName || '').toLowerCase().includes(q) ||
        (item.email || '').toLowerCase().includes(q) ||
        (item.phone || '').includes(q);

      if (!matchQuery) return false;

      const isExp = item.expiresAt ? new Date(item.expiresAt).getTime() < Date.now() : false;
      const isSusp = item.status === 'suspended' || !item.enabled;

      if (domainStatusFilter === 'active') return !isSusp && !isExp;
      if (domainStatusFilter === 'suspended') return isSusp;
      if (domainStatusFilter === 'expired') return isExp;
      return true;
    });
  }, [allDomainsList, domainSearchTerm, domainStatusFilter]);

  // Select a registered user in Upgrade Modal
  const handleSelectRegisteredUser = (user: any) => {
    const cleanEmail = (user.email || user.user_id || '').trim().toLowerCase();
    setSelectedRegisteredUserEmail(cleanEmail);
    const dName = user.display_name || user.business_name || (cleanEmail ? cleanEmail.split('@')[0] : '');
    setFormName(dName);
    setFormEmail(cleanEmail);
    setFormPhone(user.phone || '');
    setFormManagerEmail(cleanEmail); // Defaults to user's email for independent Google Drive sync
    const sName = user.business_name || dName;
    setStoreName(sName);
    setStoreSubdomain(slugifyStoreName(sName || cleanEmail.split('@')[0]));
  };

  // Helper: Generate Random Password
  const generateRandomPassword = () => {
    const chars = '23456789abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ';
    let pass = '';
    for (let i = 0; i < 8; i++) {
      pass += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return pass;
  };

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

  // Helper: Format Date as YYYY/MM/DD
  const formatDate = (isoOrDateStr?: string) => {
    if (!isoOrDateStr) return '—';
    try {
      const d = new Date(isoOrDateStr);
      if (isNaN(d.getTime())) return isoOrDateStr;
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${y}/${m}/${day}`;
    } catch {
      return isoOrDateStr;
    }
  };

  // Helper: Apply Preset Duration to End Date
  const applyPresetDuration = (days: number | 'unlimited') => {
    setFormDuration(days);
    if (days === 'unlimited') {
      setFormExpiresAt('');
      return;
    }
    const base = formStartedAt ? new Date(formStartedAt) : new Date();
    base.setDate(base.getDate() + days);
    const y = base.getFullYear();
    const m = String(base.getMonth() + 1).padStart(2, '0');
    const day = String(base.getDate()).padStart(2, '0');
    setFormExpiresAt(`${y}-${m}-${day}`);
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

  // ── Accounting & Financial Aggregations ──
  const managerEmployeesMap = useMemo(() => {
    const map = new Map<string, EmployeeAccount[]>();
    employees.forEach((emp) => {
      const mgr = (emp.managerEmail || '').trim().toLowerCase();
      const myEmail = (emp.email || '').trim().toLowerCase();
      if (mgr && mgr !== myEmail) {
        const list = map.get(mgr) || [];
        list.push(emp);
        map.set(mgr, list);
      }
    });
    return map;
  }, [employees]);

  const financialStats = useMemo(() => {
    let totalUsd = 0;
    let totalIqd = 0;
    let paidCount = 0;
    let managersCount = 0;
    let upgradedCount = 0;

    employees.forEach((emp) => {
      const isUpgraded =
        emp.accountType === 'registered' ||
        emp.role === 'manager' ||
        Boolean(emp.upgradeReceipt) ||
        Boolean(emp.priceAmount && emp.priceAmount.trim());

      if (isUpgraded) {
        upgradedCount++;
      }

      const myEmail = (emp.email || '').trim().toLowerCase();
      const isManager = managerEmployeesMap.has(myEmail) || emp.role === 'manager';
      if (isManager) {
        managersCount++;
      }

      const price = (emp.priceAmount || '').trim();
      if (price) {
        paidCount++;
        // Check currency and parse numeric value
        const isUsd =
          price.includes('$') ||
          /usd/i.test(price) ||
          (!price.includes('IQD') && !price.includes('دینار') && (parseFloat(price.replace(/[^0-9.]/g, '')) || 0) <= 500);
        const numericVal = parseFloat(price.replace(/[^0-9.]/g, '')) || 0;
        if (numericVal > 0) {
          if (isUsd) {
            totalUsd += numericVal;
          } else {
            totalIqd += numericVal;
          }
        }
      }
    });

    return {
      totalUsd,
      totalIqd,
      paidCount,
      managersCount,
      upgradedCount,
      totalAccounts: employees.length,
    };
  }, [employees, managerEmployeesMap]);

  const financialAccounts = useMemo(() => {
    return employees.filter((emp) => {
      const myEmail = (emp.email || '').trim().toLowerCase();
      const name = (emp.displayName || '').toLowerCase();
      const phone = (emp.phone || '').toLowerCase();
      const price = (emp.priceAmount || '').toLowerCase();
      const receiptId = (emp.upgradeReceipt?.receiptId || '').toLowerCase();
      const q = financialSearch.trim().toLowerCase();

      const matchesSearch =
        !q ||
        myEmail.includes(q) ||
        name.includes(q) ||
        phone.includes(q) ||
        price.includes(q) ||
        receiptId.includes(q);

      if (!matchesSearch) return false;

      if (financialFilter === 'paid') {
        return Boolean(emp.priceAmount && emp.priceAmount.trim());
      }
      if (financialFilter === 'managers') {
        return managerEmployeesMap.has(myEmail) || emp.role === 'manager';
      }
      if (financialFilter === 'custom') {
        return emp.accountType === 'custom' || Boolean(emp.password);
      }
      return true;
    });
  }, [employees, financialSearch, financialFilter, managerEmployeesMap]);

  const toggleManagerExpand = (email: string) => {
    const clean = email.trim().toLowerCase();
    setExpandedManagerEmails((prev) => {
      const next = new Set(prev);
      if (next.has(clean)) {
        next.delete(clean);
      } else {
        next.add(clean);
      }
      return next;
    });
  };

  const handleOpenQuickPrice = (emp: EmployeeAccount) => {
    setQuickPriceEmployee(emp);
    setQuickPriceValue(emp.priceAmount || '');
  };

  const handleSaveQuickPrice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickPriceEmployee) return;
    const db = getClientFirestore();
    if (!db) return;

    setSavingQuickPrice(true);
    const docId = getCleanDocId(quickPriceEmployee.email) || quickPriceEmployee.id;
    const cleanPrice = quickPriceValue.trim() || null;

    try {
      await setDoc(
        doc(db, 'employee_accounts', docId),
        { priceAmount: cleanPrice },
        { merge: true }
      );

      try {
        await setDoc(
          doc(db, 'user_subscriptions', docId),
          { priceAmount: cleanPrice, updatedAt: new Date().toISOString() },
          { merge: true }
        );
      } catch (sErr) {
        console.warn('Subscription price sync warning:', sErr);
      }

      setQuickPriceEmployee(null);
    } catch (err: any) {
      console.error('Failed to update price:', err);
      alert(isKu ? 'هەڵەیەک ڕوویدا لە پاشەکەوتکردنی نرخ' : 'Failed to save price');
    } finally {
      setSavingQuickPrice(false);
    }
  };

  // Toggle Employee Status
  const handleToggleStatus = async (emp: EmployeeAccount) => {
    const db = getClientFirestore();
    if (!db) return;
    const nextStatus = emp.status === 'active' ? 'suspended' : 'active';
    try {
      const docRef = doc(db, 'employee_accounts', getCleanDocId(emp.email) || emp.id);
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

  // Comprehensive Online Store and Domain deletion helper (Backend API + all Firestore collections)
  const purgeOnlineStoreCompletely = async (subdomain: string, email?: string, candidateId?: string) => {
    const cleanSubdomain = (subdomain || '').trim().toLowerCase();
    const db = getClientFirestore();

    // 1. Delete on backend API if subdomain exists
    if (cleanSubdomain) {
      try {
        await fetch(`https://api.froshiar.store/api/admin/stores/${encodeURIComponent(cleanSubdomain)}`, {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ae436b2edb88e0003304a1b01a9080b00a6e410b717c9bc43aaf00c95cf88d96',
          },
          body: JSON.stringify({ confirm: 'DELETE' }),
        });
      } catch (apiErr) {
        console.warn('Backend delete store error:', apiErr);
      }
    }

    if (!db) return;

    // 2. Candidate Doc IDs
    const candidateDocIds = new Set<string>();
    if (candidateId) candidateDocIds.add(candidateId);
    if (email) {
      const cleanEmail = email.trim().toLowerCase();
      candidateDocIds.add(cleanEmail);
      const cleanId = getCleanDocId(cleanEmail);
      if (cleanId) candidateDocIds.add(cleanId);
    }

    // 3. Delete from store_activations (by candidate doc IDs & by query)
    for (const dId of candidateDocIds) {
      try {
        await deleteDoc(doc(db, 'store_activations', dId));
      } catch {}
    }
    if (cleanSubdomain) {
      try {
        const q = query(collection(db, 'store_activations'), where('subdomain', '==', cleanSubdomain));
        const snap = await getDocs(q);
        for (const docSnap of snap.docs) {
          try {
            await deleteDoc(docSnap.ref);
          } catch {}
        }
      } catch {}
    }

    // 4. Clear from employee_accounts
    for (const dId of candidateDocIds) {
      try {
        await updateDoc(doc(db, 'employee_accounts', dId), {
          onlineStore: deleteField(),
        });
      } catch {
        try {
          await setDoc(doc(db, 'employee_accounts', dId), { onlineStore: null }, { merge: true });
        } catch {}
      }
    }
    if (cleanSubdomain) {
      try {
        const q = query(collection(db, 'employee_accounts'), where('onlineStore.subdomain', '==', cleanSubdomain));
        const snap = await getDocs(q);
        for (const docSnap of snap.docs) {
          try {
            await updateDoc(docSnap.ref, { onlineStore: deleteField() });
          } catch {}
        }
      } catch {}
    }

    // 5. Clear from user_subscriptions
    for (const dId of candidateDocIds) {
      try {
        await updateDoc(doc(db, 'user_subscriptions', dId), {
          onlineStore: deleteField(),
          storefront_enabled: false,
          onlineStoreActive: false,
        });
      } catch {
        try {
          await setDoc(doc(db, 'user_subscriptions', dId), {
            onlineStore: null,
            storefront_enabled: false,
            onlineStoreActive: false,
          }, { merge: true });
        } catch {}
      }
    }
    if (cleanSubdomain) {
      try {
        const q = query(collection(db, 'user_subscriptions'), where('onlineStore.subdomain', '==', cleanSubdomain));
        const snap = await getDocs(q);
        for (const docSnap of snap.docs) {
          try {
            await updateDoc(docSnap.ref, {
              onlineStore: deleteField(),
              storefront_enabled: false,
              onlineStoreActive: false,
            });
          } catch {}
        }
      } catch {}
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
      if (emp.onlineStore?.subdomain) {
        await purgeOnlineStoreCompletely(emp.onlineStore.subdomain, emp.email, getCleanDocId(emp.email) || emp.id);
      }
      const docRef = doc(db, 'employee_accounts', getCleanDocId(emp.email) || emp.id);
      await deleteDoc(docRef);
    } catch (e) {
      console.error('Failed to delete employee:', e);
      alert(isKu ? 'هەڵەیەک ڕوویدا لە سڕینەوە' : 'Failed to delete employee');
    }
  };

  // Activate Online Store and show 25s Receipt Table Modal
  const handleActivateOnlineStore = async (emp: EmployeeAccount) => {
    const db = getClientFirestore();
    if (!db) return;

    const docId = getCleanDocId(emp.email) || emp.id;
    const cleanEmail = (emp.email || '').trim().toLowerCase();
    const finalStoreName = (emp.onlineStore?.storeName || emp.displayName || cleanEmail.split('@')[0] || 'store').trim();
    const finalSubdomain = (emp.onlineStore?.subdomain || slugifyStoreName(finalStoreName) || docId || 'store').trim().toLowerCase();
    const activatedAt = new Date().toISOString();

    const storePayload = {
      enabled: true,
      storeName: finalStoreName,
      subdomain: finalSubdomain,
      status: 'active' as const,
      activatedAt,
    };

    try {
      // 1. Update employee_accounts
      await setDoc(
        doc(db, 'employee_accounts', docId),
        { onlineStore: stripUndefined(storePayload) },
        { merge: true }
      );

      // 2. Mirror to user_subscriptions
      try {
        await setDoc(
          doc(db, 'user_subscriptions', docId),
          stripUndefined({
            storefront_enabled: true,
            onlineStoreActive: true,
            onlineStore: storePayload,
            updatedAt: activatedAt,
          }),
          { merge: true }
        );

        // 3. Mirror to store_activations
        await setDoc(
          doc(db, 'store_activations', docId),
          stripUndefined({
            email: cleanEmail,
            enabled: true,
            status: 'active',
            storeName: finalStoreName,
            subdomain: finalSubdomain,
            activatedAt,
          }),
          { merge: true }
        );
      } catch (syncErr) {
        console.warn('Sync to user_subscriptions/store_activations warning:', syncErr);
      }

      // 4. Notify backend API to unsuspend if existing
      try {
        await fetch(`https://api.froshiar.store/api/admin/stores/${encodeURIComponent(finalSubdomain)}/suspend`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ae436b2edb88e0003304a1b01a9080b00a6e410b717c9bc43aaf00c95cf88d96',
          },
          body: JSON.stringify({ suspended: false }),
        });
      } catch (apiErr) {
        console.warn('Backend unsuspend warning:', apiErr);
      }

      // 5. Open the 25-second official activation receipt table modal!
      const storeUrl = `https://froshiar.store/${finalSubdomain}`;
      setStoreActivationData({
        employee: emp,
        storeName: finalStoreName,
        subdomain: finalSubdomain,
        url: storeUrl,
        email: emp.email,
        phone: emp.phone,
        activatedAt,
      });
      setActivationCountdown(25);
      setActivationModalLang(isKu ? 'ku' : 'en');
    } catch (e: any) {
      console.error('Failed to activate online store:', e);
      alert(isKu ? `هەڵەیەک ڕوویدا لە چالاککردنی وێبسایت: ${e?.message || ''}` : `Failed to activate store: ${e?.message || ''}`);
    }
  };

  // Suspend Online Store
  const handleSuspendOnlineStore = async (emp: EmployeeAccount) => {
    const db = getClientFirestore();
    if (!db) return;

    const docId = getCleanDocId(emp.email) || emp.id;
    const finalSubdomain = (emp.onlineStore?.subdomain || '').trim().toLowerCase();

    try {
      // 1. Update employee_accounts
      await setDoc(
        doc(db, 'employee_accounts', docId),
        {
          onlineStore: {
            ...(emp.onlineStore || {}),
            enabled: false,
            status: 'suspended',
          },
        },
        { merge: true }
      );

      // 2. Mirror to user_subscriptions
      try {
        await setDoc(
          doc(db, 'user_subscriptions', docId),
          {
            storefront_enabled: false,
            onlineStoreActive: false,
            'onlineStore.enabled': false,
            'onlineStore.status': 'suspended',
          },
          { merge: true }
        );

        // 3. Mirror to store_activations
        await setDoc(
          doc(db, 'store_activations', docId),
          {
            enabled: false,
            status: 'suspended',
          },
          { merge: true }
        );
      } catch (syncErr) {
        console.warn('Sync to user_subscriptions/store_activations warning:', syncErr);
      }

      // 4. Notify backend API to suspend
      if (finalSubdomain) {
        try {
          await fetch(`https://api.froshiar.store/api/admin/stores/${encodeURIComponent(finalSubdomain)}/suspend`, {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': 'Bearer ae436b2edb88e0003304a1b01a9080b00a6e410b717c9bc43aaf00c95cf88d96',
            },
            body: JSON.stringify({ suspended: true }),
          });
        } catch (apiErr) {
          console.warn('Backend suspend warning:', apiErr);
        }
      }

      alert(isKu ? 'وێبسایتەکە بە سەرکەوتوویی وەستێنرا (ناچالاککرا).' : 'Storefront successfully suspended.');
    } catch (e: any) {
      console.error('Failed to suspend online store:', e);
      alert(isKu ? `هەڵە: ${e?.message || ''}` : `Error: ${e?.message || ''}`);
    }
  };

  // Delete Online Store and free domain
  const handleDeleteOnlineStore = async (emp: EmployeeAccount) => {
    const storeName = emp.onlineStore?.storeName || emp.displayName || 'store';
    const subdomain = (emp.onlineStore?.subdomain || '').trim().toLowerCase();

    const confirmMsg = isKu
      ? `ئایا دڵنیایت لە سڕینەوەی یەکجارەکی ئەم ماڵپەڕە و بەتاڵکردنەوەی دۆمەینەکەی؟\n\n🔹 ناوی فرۆشگا: ${storeName}\n🔹 دۆمەین: ${subdomain || '—'}\n\n⚠️ هەموو کاڵا و وێنەکانی سەر سێرڤەر بە تەواوی دەسڕدرێنەوە و ئەم دۆمەینە ئازاد دەبێت.`
      : `Are you sure you want to permanently delete this online store and free up its domain?\n\nStore: ${storeName}\nSubdomain: ${subdomain}\n\nAll products and images on the server will be permanently deleted.`;

    if (!window.confirm(confirmMsg)) return;

    try {
      await purgeOnlineStoreCompletely(subdomain, emp.email, getCleanDocId(emp.email) || emp.id);
      alert(isKu ? 'ماڵپەڕەکە و دۆمەینەکەی بە سەرکەوتوویی سڕدرانەوە و ئازاد کران.' : 'Online store and domain deleted successfully.');
    } catch (e: any) {
      console.error('Failed to delete online store:', e);
      alert(isKu ? `هەڵەیەک ڕوویدا لە سڕینەوە: ${e?.message || ''}` : `Failed to delete store: ${e?.message || ''}`);
    }
  };

  // Toggle Online Store status
  const handleToggleOnlineStore = async (emp: EmployeeAccount) => {
    if (emp.onlineStore?.status === 'active') {
      await handleSuspendOnlineStore(emp);
    } else {
      await handleActivateOnlineStore(emp);
    }
  };

  // ── Dedicated Online Store Management Handlers ──
  const handleOpenNewStoreModal = () => {
    setNewStoreAccountSearch('');
    setNewStoreEmail('');
    setNewStoreCustomerName('');
    setNewStorePhone('');
    setNewStoreName('');
    setNewStoreSubdomain('');
    setNewStorePrice('');
    setNewStoreDuration(30);
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    setNewStoreStartDate(todayStr);
    const nextMonth = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);
    setNewStoreCustomExpiry(nextMonth.toISOString().split('T')[0]);
    setNewStoreError(null);
    setShowNewStoreModal(true);
  };

  const handleSelectAccountForNewStore = (acc: { email: string; displayName: string; phone: string }) => {
    setNewStoreEmail(acc.email);
    setNewStoreCustomerName(acc.displayName);
    setNewStorePhone(acc.phone || '');
    const suggestedStoreName = acc.displayName || acc.email.split('@')[0];
    setNewStoreName(suggestedStoreName);
    setNewStoreSubdomain(slugifyStoreName(suggestedStoreName || acc.email.split('@')[0]));
  };

  const handleNewStoreDurationPreset = (days: number | 'unlimited') => {
    setNewStoreDuration(days);
    if (days === 'unlimited') {
      setNewStoreCustomExpiry('');
      return;
    }
    const base = newStoreStartDate ? new Date(newStoreStartDate) : new Date();
    base.setDate(base.getDate() + days);
    setNewStoreCustomExpiry(base.toISOString().split('T')[0]);
  };

  const handleActivateNewStore = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStoreEmail.trim()) {
      setNewStoreError(isKu ? 'تکایە ئیمەیڵی خاوەنی فڕۆشگا بنووسە یان هەڵبژێرە' : 'Please select or enter the account email');
      return;
    }
    const cleanEmail = newStoreEmail.trim().toLowerCase();
    const docId = getCleanDocId(cleanEmail);
    const finalStoreName = (newStoreName.trim() || newStoreCustomerName.trim() || cleanEmail.split('@')[0] || 'Store').trim();
    const finalSubdomain = (newStoreSubdomain.trim() || slugifyStoreName(finalStoreName) || docId || 'store')
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, '-')
      .replace(/-+/g, '-');

    if (!finalSubdomain) {
      setNewStoreError(isKu ? 'تکایە ناوی بەستەر (Subdomain) بنووسە' : 'Please enter a valid subdomain');
      return;
    }

    // ── Check if Domain is already registered (Duplicate Domain Prevention) ──
    const duplicateStore = allOnlineStores.find(
      (s) =>
        (s.subdomain || '').trim().toLowerCase() === finalSubdomain &&
        (s.email || '').trim().toLowerCase() !== cleanEmail &&
        (s.id || '').trim().toLowerCase() !== docId
    );
    if (duplicateStore) {
      setNewStoreError(
        isKu
          ? `⚠️ ئەم بەستەرە («${finalSubdomain}») پێشتر بۆ وێبسایتێک دروستکراوە لەلایەن «${duplicateStore.customerName || duplicateStore.storeName || duplicateStore.email}»! لەبەر ئەوە ناتوانیت هەمان دۆمەین دووبارە دروستبکەیتەوە. تکایە ناوێکی تری جیاواز بنووسە.`
          : `⚠️ Domain "${finalSubdomain}" already exists for "${duplicateStore.customerName || duplicateStore.storeName || duplicateStore.email}"! Duplicate domains are not allowed. Please enter a different subdomain.`
      );
      return;
    }

    const RESERVED_DOMAINS = ['admin', 'api', 'froshiar', 'www', 'store', 'app', 'auth', 'support', 'terms', 'privacy', 'delete-account'];
    if (RESERVED_DOMAINS.includes(finalSubdomain) && finalSubdomain !== 'demo') {
      setNewStoreError(
        isKu
          ? `⚠️ ناوی «${finalSubdomain}» ناوێکی پارێزراوی سیستەمە و ناتوانرێت وەک دۆمەین بەکاربێت. تکایە ناوێکی تر بنووسە.`
          : `⚠️ "${finalSubdomain}" is a reserved system domain. Please choose a different subdomain.`
      );
      return;
    }

    const db = getClientFirestore();
    if (!db) return;

    setNewStoreSubmitting(true);
    setNewStoreError(null);

    const startIso = newStoreStartDate ? new Date(newStoreStartDate).toISOString() : new Date().toISOString();
    let expIso: string | null = null;
    if (newStoreDuration === 'unlimited') {
      expIso = null;
    } else if (newStoreCustomExpiry) {
      expIso = new Date(newStoreCustomExpiry).toISOString();
    } else if (typeof newStoreDuration === 'number' && newStoreDuration > 0) {
      expIso = new Date(new Date(startIso).getTime() + newStoreDuration * 24 * 60 * 60 * 1000).toISOString();
    }

    const storePayload = {
      enabled: true,
      storeName: finalStoreName,
      subdomain: finalSubdomain,
      status: 'active' as const,
      activatedAt: new Date().toISOString(),
    };

    try {
      // 1. Write to store_activations
      await setDoc(
        doc(db, 'store_activations', docId),
        stripUndefined({
          id: docId,
          email: cleanEmail,
          customerName: newStoreCustomerName.trim() || finalStoreName,
          phone: newStorePhone.trim() || null,
          storeName: finalStoreName,
          subdomain: finalSubdomain,
          enabled: true,
          status: 'active',
          priceAmount: newStorePrice.trim() || null,
          durationDays: newStoreDuration === 'unlimited' ? null : newStoreDuration,
          startDate: startIso,
          expiresAt: expIso,
          activatedAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }),
        { merge: true }
      );

      // 2. Mirror to employee_accounts
      try {
        await setDoc(
          doc(db, 'employee_accounts', docId),
          stripUndefined({
            onlineStore: storePayload,
            phone: newStorePhone.trim() || undefined,
          }),
          { merge: true }
        );
      } catch (empErr) {
        console.warn('employee_accounts mirror warning:', empErr);
      }

      // 3. Mirror to user_subscriptions
      try {
        await setDoc(
          doc(db, 'user_subscriptions', docId),
          stripUndefined({
            storefront_enabled: true,
            onlineStoreActive: true,
            onlineStore: storePayload,
            updatedAt: new Date().toISOString(),
          }),
          { merge: true }
        );
      } catch (subErr) {
        console.warn('user_subscriptions mirror warning:', subErr);
      }

      // 4. Notify backend API to unsuspend
      try {
        await fetch(`https://api.froshiar.store/api/admin/stores/${encodeURIComponent(finalSubdomain)}/suspend`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ae436b2edb88e0003304a1b01a9080b00a6e410b717c9bc43aaf00c95cf88d96',
          },
          body: JSON.stringify({ suspended: false }),
        });
      } catch (apiErr) {
        console.warn('Backend unsuspend warning:', apiErr);
      }

      setShowNewStoreModal(false);

      // 5. Open Official 25s Receipt Table Modal
      const storeUrl = `https://froshiar.store/${finalSubdomain}`;
      setStoreActivationData({
        employee: {
          id: docId,
          email: cleanEmail,
          displayName: newStoreCustomerName.trim() || finalStoreName,
          managerEmail: cleanEmail,
          phone: newStorePhone.trim(),
          createdAt: new Date().toISOString(),
          status: 'active',
          permissions: ALL_ACTIVE_PERMISSIONS,
        },
        storeName: finalStoreName,
        subdomain: finalSubdomain,
        url: storeUrl,
        email: cleanEmail,
        phone: newStorePhone.trim(),
        activatedAt: new Date().toISOString(),
      });
      setActivationCountdown(25);
      setActivationModalLang(isKu ? 'ku' : 'en');
    } catch (err: any) {
      console.error('Failed to activate new store:', err);
      setNewStoreError(err?.message || (isKu ? 'هەڵەیەک ڕوویدا لە چالاککردنی وێب ستۆر' : 'Failed to activate store'));
    } finally {
      setNewStoreSubmitting(false);
    }
  };

  const handleToggleOnlineStoreByDoc = async (store: OnlineStoreActivation) => {
    const db = getClientFirestore();
    if (!db) return;
    const docId = store.id || getCleanDocId(store.email);
    const newStatus = store.status === 'active' && store.enabled ? 'suspended' : 'active';
    const isSusp = newStatus === 'suspended';

    try {
      // 1. Update store_activations
      await setDoc(
        doc(db, 'store_activations', docId),
        {
          enabled: !isSusp,
          status: newStatus,
          updatedAt: new Date().toISOString(),
        },
        { merge: true }
      );

      // 2. Update employee_accounts
      try {
        await setDoc(
          doc(db, 'employee_accounts', docId),
          {
            onlineStore: {
              enabled: !isSusp,
              status: newStatus,
              storeName: store.storeName,
              subdomain: store.subdomain,
            },
          },
          { merge: true }
        );
      } catch {}

      // 3. Update user_subscriptions
      try {
        await setDoc(
          doc(db, 'user_subscriptions', docId),
          {
            storefront_enabled: !isSusp,
            onlineStoreActive: !isSusp,
            'onlineStore.enabled': !isSusp,
            'onlineStore.status': newStatus,
            updatedAt: new Date().toISOString(),
          },
          { merge: true }
        );
      } catch {}

      // 4. Notify backend API
      if (store.subdomain) {
        try {
          await fetch(`https://api.froshiar.store/api/admin/stores/${encodeURIComponent(store.subdomain)}/suspend`, {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': 'Bearer ae436b2edb88e0003304a1b01a9080b00a6e410b717c9bc43aaf00c95cf88d96',
            },
            body: JSON.stringify({ suspended: isSusp }),
          });
        } catch (apiErr) {
          console.warn('Backend suspend/unsuspend error:', apiErr);
        }
      }

      alert(
        isSusp
          ? (isKu ? 'وێب ستۆرەکە بە سەرکەوتوویی ڕاگیرا (موعەتەل کرا).' : 'Online store suspended successfully.')
          : (isKu ? 'وێب ستۆرەکە بە سەرکەوتوویی کارا کرایەوە!' : 'Online store unsuspended successfully!')
      );
    } catch (e: any) {
      console.error('Toggle store error:', e);
      alert(isKu ? `هەڵە: ${e?.message || ''}` : `Error: ${e?.message || ''}`);
    }
  };

  const handleDeleteOnlineStoreByDoc = async (store: OnlineStoreActivation) => {
    const confirmMsg = isKu
      ? `ئایا دڵنیایت لە سڕینەوەی یەکجارەکی ئەم ماڵپەڕە و بەتاڵکردنەوەی دۆمەینەکەی؟\n\n🔹 ناوی فرۆشگا: ${store.storeName}\n🔹 بەستەر: https://froshiar.store/${store.subdomain}\n🔹 ئیمەیڵ: ${store.email}\n\n⚠️ هەموو کاڵا و وێنەکانی سەر سێرڤەر بە تەواوی دەسڕدرێنەوە و ئەم بەستەرە ئازاد دەبێت.`
      : `Are you sure you want to permanently delete this online store?\n\nStore: ${store.storeName}\nSubdomain: ${store.subdomain}\n\nAll data will be permanently deleted.`;

    if (!window.confirm(confirmMsg)) return;

    try {
      await purgeOnlineStoreCompletely(store.subdomain, store.email, store.id);
      alert(isKu ? 'وێب ستۆرەکە بە سەرکەوتوویی سڕدرایەوە و بەستەرەکەی ئازاد کرا.' : 'Online store deleted successfully.');
    } catch (e: any) {
      console.error('Delete store error:', e);
      alert(isKu ? `هەڵەیەک ڕوویدا لە سڕینەوە: ${e?.message || ''}` : `Failed to delete store: ${e?.message || ''}`);
    }
  };

  const handleOpenEditStore = (store: OnlineStoreActivation) => {
    setEditingStoreData(store);
    setEditStoreName(store.storeName || '');
    setEditStoreSubdomain(store.subdomain || '');
    setEditStorePhone(store.phone || '');
    setEditStorePrice(store.priceAmount || '');
    setEditStoreDuration(store.durationDays || 30);
    const startStr = store.startDate ? store.startDate.split('T')[0] : new Date().toISOString().split('T')[0];
    setEditStoreStartDate(startStr);
    const expStr = store.expiresAt ? store.expiresAt.split('T')[0] : '';
    setEditStoreCustomExpiry(expStr);
  };

  const handleSaveEditStore = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStoreData) return;
    const db = getClientFirestore();
    if (!db) return;

    setEditStoreSubmitting(true);
    const docId = editingStoreData.id || getCleanDocId(editingStoreData.email);
    const finalStoreName = (editStoreName.trim() || editingStoreData.storeName).trim();
    const finalSubdomain = (editStoreSubdomain.trim() || editingStoreData.subdomain)
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, '-')
      .replace(/-+/g, '-');

    // ── Check if Modified Subdomain is already taken by another store ──
    const duplicateStore = allOnlineStores.find(
      (s) =>
        (s.subdomain || '').trim().toLowerCase() === finalSubdomain &&
        (s.id || '').trim().toLowerCase() !== docId &&
        (s.email || '').trim().toLowerCase() !== (editingStoreData.email || '').trim().toLowerCase()
    );
    if (duplicateStore) {
      alert(
        isKu
          ? `⚠️ ئەم بەستەرە («${finalSubdomain}») پێشتر بەکارهاتووە لەلایەن «${duplicateStore.customerName || duplicateStore.storeName || duplicateStore.email}». نابێت دوو وێبسایت هەمان دۆمەینیان هەبێت!`
          : `⚠️ Subdomain "${finalSubdomain}" is already in use by "${duplicateStore.customerName || duplicateStore.email}".`
      );
      setEditStoreSubmitting(false);
      return;
    }

    const startIso = editStoreStartDate ? new Date(editStoreStartDate).toISOString() : editingStoreData.startDate || new Date().toISOString();
    let expIso: string | null = null;
    if (editStoreDuration === 'unlimited') {
      expIso = null;
    } else if (editStoreCustomExpiry) {
      expIso = new Date(editStoreCustomExpiry).toISOString();
    } else if (typeof editStoreDuration === 'number' && editStoreDuration > 0) {
      expIso = new Date(new Date(startIso).getTime() + editStoreDuration * 24 * 60 * 60 * 1000).toISOString();
    }

    try {
      // 0. If subdomain changed, delete old subdomain from backend API
      const oldSubdomain = (editingStoreData.subdomain || '').trim().toLowerCase();
      if (oldSubdomain && oldSubdomain !== finalSubdomain) {
        try {
          await fetch(`https://api.froshiar.store/api/admin/stores/${encodeURIComponent(oldSubdomain)}`, {
            method: 'DELETE',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': 'Bearer ae436b2edb88e0003304a1b01a9080b00a6e410b717c9bc43aaf00c95cf88d96',
            },
            body: JSON.stringify({ confirm: 'DELETE' }),
          });
        } catch (oldErr) {
          console.warn('Failed to delete old subdomain on rename:', oldErr);
        }
      }

      // 1. Update store_activations
      await setDoc(
        doc(db, 'store_activations', docId),
        stripUndefined({
          storeName: finalStoreName,
          subdomain: finalSubdomain,
          phone: editStorePhone.trim() || null,
          priceAmount: editStorePrice.trim() || null,
          durationDays: editStoreDuration === 'unlimited' ? null : editStoreDuration,
          startDate: startIso,
          expiresAt: expIso,
          updatedAt: new Date().toISOString(),
        }),
        { merge: true }
      );

      // 2. Update employee_accounts
      try {
        await setDoc(
          doc(db, 'employee_accounts', docId),
          stripUndefined({
            phone: editStorePhone.trim() || undefined,
            'onlineStore.storeName': finalStoreName,
            'onlineStore.subdomain': finalSubdomain,
          }),
          { merge: true }
        );
      } catch {}

      // 3. Update user_subscriptions
      try {
        await setDoc(
          doc(db, 'user_subscriptions', docId),
          stripUndefined({
            'onlineStore.storeName': finalStoreName,
            'onlineStore.subdomain': finalSubdomain,
            updatedAt: new Date().toISOString(),
          }),
          { merge: true }
        );
      } catch {}

      setEditingStoreData(null);
      alert(isKu ? 'زانیاری و بەرواری وێب ستۆر بە سەرکەوتوویی نوێکرایەوە!' : 'Store details updated successfully!');
    } catch (e: any) {
      console.error('Edit store error:', e);
      alert(isKu ? `هەڵە: ${e?.message || ''}` : `Error: ${e?.message || ''}`);
    } finally {
      setEditStoreSubmitting(false);
    }
  };

  const handleSendStoreWhatsAppReceipt = (store: OnlineStoreActivation) => {
    if (!store.phone) {
      alert(isKu ? 'ژمارەی مۆبایل تۆمار نەکراوە بۆ ئەم فرۆشگایە' : 'No phone number available for this store');
      return;
    }
    const cleanPhone = store.phone.replace(/[^0-9]/g, '');
    const url = `https://froshiar.store/${store.subdomain}`;
    const expiry = store.expiresAt ? formatDate(store.expiresAt) : (isKu ? 'بێ سنوور (هەمیشەیی)' : 'Unlimited (Lifetime)');
    const price = store.priceAmount ? `\n💳 بڕی پارەی دراو: ${store.priceAmount}` : '';
    const text = isKu
      ? `سڵاو بەڕێز ${store.customerName || store.storeName} 🌟\n\n🎉 وێب ستۆرەکەت (فڕۆشگای ئۆنلاین) لە سیستەمی فرۆشیار بە سەرکەوتوویی چالاک کرا!\n\n🏪 ناوی فرۆشگا: ${store.storeName}\n🔗 بەستەری فرۆشگا:\n${url}\n📅 بەرواری بەسەرچوون: ${expiry}${price}\n\n✅ دەتوانیت لە ڕێگەی ئەپی فرۆشیارەوە کاڵاکانت ڕاستەوخۆ بەرزبکەیتەوە و لەم بەستەرەوە بەردەست دەبن بۆ کڕیارەکانت.\n\nتیمی پشتگیریی فەرمیی فرۆشیار ✨`
      : `Hello ${store.customerName || store.storeName} 🌟\n\nYour online store has been activated on Froshiar!\n\nStore: ${store.storeName}\nURL: ${url}\nExpires: ${expiry}${price}\n\nFroshiar Support Team`;

    window.open(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(text)}`, '_blank');
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

    const start = emp.startedAt || emp.createdAt || new Date().toISOString();
    setFormStartedAt(start.split('T')[0]);
    setFormExpiresAt(emp.expiresAt ? emp.expiresAt.split('T')[0] : '');
    setFormDuration(emp.durationDays || 30);

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
    setFormPlatform(emp.targetPlatform || 'all');

    setShowCalendar(false);
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
      const cleanEmail = formEmail.trim().toLowerCase();
      const docId = getCleanDocId(cleanEmail) || selectedEmployee.id;
      const docRef = doc(db, 'employee_accounts', docId);

      const updatedLimits: EmployeeUsageLimits = {
        maxItems: unlimitedItems ? 'unlimited' : Number(formLimits.maxItems) || 20,
        maxQuantity: unlimitedQuantity ? 'unlimited' : Number(formLimits.maxQuantity) || 30,
        maxSales: unlimitedSales ? 'unlimited' : Number(formLimits.maxSales) || 15,
        maxInvoices: unlimitedInvoices ? 'unlimited' : Number(formLimits.maxInvoices) || 40,
        maxQuotations: unlimitedQuotations ? 'unlimited' : Number(formLimits.maxQuotations) || 5,
      };

      const finalStoreName = (storeName.trim() || formName.trim() || selectedEmployee.displayName || cleanEmail.split('@')[0] || 'store').trim();
      const finalSubdomain = (storeSubdomain.trim() || slugifyStoreName(finalStoreName) || docId || 'store').trim();

      const updatedStore: OnlineStoreConfig | null = storeEnabled
        ? {
            enabled: true,
            storeName: finalStoreName,
            subdomain: finalSubdomain,
            status: selectedEmployee.onlineStore?.status || 'active',
            activatedAt: selectedEmployee.onlineStore?.activatedAt || new Date().toISOString(),
          }
        : null;

      const startDate = formStartedAt ? new Date(formStartedAt).toISOString() : selectedEmployee.startedAt || selectedEmployee.createdAt;
      const expDate = formExpiresAt ? new Date(formExpiresAt).toISOString() : undefined;

      const payload: any = {
        displayName: formName.trim() || cleanEmail.split('@')[0],
        email: cleanEmail,
        password: formPassword.trim() ? formPassword.trim() : (selectedEmployee.password || ''),
        managerEmail: formManagerEmail.trim().toLowerCase() || cleanEmail,
        phone: formPhone.trim() || null,
        priceAmount: formPrice.trim() || null,
        startedAt: startDate,
        expiresAt: expDate || null,
        durationDays: typeof formDuration === 'number' ? formDuration : null,
        limits: updatedLimits,
        targetPlatform: formPlatform || 'all',
        onlineStore: updatedStore ? stripUndefined(updatedStore) : null,
      };

      await setDoc(docRef, stripUndefined(payload), { merge: true });

      // Synchronize to user_subscriptions
      try {
        const subRef = doc(db, 'user_subscriptions', docId);
        await setDoc(
          subRef,
          stripUndefined({
            id: docId,
            email: cleanEmail,
            customerName: formName.trim() || cleanEmail.split('@')[0],
            phone: formPhone.trim() || null,
            status: selectedEmployee.status || 'active',
            startDate: startDate,
            expiresAt: expDate || null,
            storefront_enabled: storeEnabled,
            onlineStoreActive: storeEnabled,
            onlineStore: updatedStore ? stripUndefined(updatedStore) : null,
            priceAmount: formPrice.trim() || null,
            limits: updatedLimits,
            targetPlatform: formPlatform || 'all',
            updatedAt: new Date().toISOString(),
          }),
          { merge: true }
        );

        if (storeEnabled) {
          await setDoc(
            doc(db, 'store_activations', docId),
            stripUndefined({
              email: cleanEmail,
              enabled: true,
              status: selectedEmployee.onlineStore?.status || 'active',
              storeName: finalStoreName,
              subdomain: finalSubdomain,
              activatedAt: new Date().toISOString(),
            }),
            { merge: true }
          );
        } else {
          await setDoc(
            doc(db, 'store_activations', docId),
            {
              enabled: false,
              status: 'suspended',
            },
            { merge: true }
          );
        }
      } catch (subErr) {
        console.warn('Subscription sync warning in edit:', subErr);
      }

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
      const docId = getCleanDocId(selectedEmployee.email) || selectedEmployee.id;

      const docRef = doc(db, 'employee_accounts', docId);
      await setDoc(
        docRef,
        {
          expiresAt: newExpiresAt,
          status: 'active',
          priceAmount: renewPrice.trim() || selectedEmployee.priceAmount,
        },
        { merge: true }
      );

      // Also sync user_subscriptions
      try {
        await setDoc(
          doc(db, 'user_subscriptions', docId),
          {
            status: 'active',
            expiresAt: newExpiresAt,
            priceAmount: renewPrice.trim() || selectedEmployee.priceAmount,
            updatedAt: new Date().toISOString(),
          },
          { merge: true }
        );
      } catch (sErr) {
        console.warn('Subscription renewal sync warning:', sErr);
      }

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
      const docRef = doc(db, 'employee_accounts', getCleanDocId(selectedEmployee.email) || selectedEmployee.id);
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

  // ── Button 1: Open Upgrade Registered User Modal ──
  const handleOpenUpgradeUser = () => {
    setAddModalMode('upgrade_registered');
    setFormName('');
    setFormEmail('');
    setFormPassword('');
    setFormManagerEmail('');
    setFormPhone('');
    setFormPrice('');
    setFormDuration('unlimited');

    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    setFormStartedAt(todayStr);
    setFormExpiresAt(''); // Unlimited default for upgraded registered owners

    setFormLimits({
      maxItems: 'unlimited',
      maxQuantity: 'unlimited',
      maxSales: 'unlimited',
      maxInvoices: 'unlimited',
      maxQuotations: 'unlimited',
    });
    setUnlimitedItems(true);
    setUnlimitedQuantity(true);
    setUnlimitedSales(true);
    setUnlimitedInvoices(true);
    setUnlimitedQuotations(true);

    setStoreEnabled(true);
    setStoreName('');
    setStoreSubdomain('');
    setFormPlatform('all');

    setSelectedRegisteredUserEmail('');
    setUserSearchTerm('');
    setShowCalendar(false);
    setFormError(null);
    setIsAddModalOpen(true);

    fetchRegisteredUsers();
  };

  // ── Button 2: Open Create Custom Account with Password Modal ──
  const handleOpenCreateCustom = () => {
    setAddModalMode('create_custom');
    setCustomAccountRole('manager');
    setFormName('');
    setFormEmail('');
    setFormPassword(generateRandomPassword());
    setFormManagerEmail('');
    setFormPhone('');
    setFormPrice('PRO / هەمیشەیی');
    setFormDuration('unlimited');

    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    setFormStartedAt(todayStr);
    setFormExpiresAt('');

    setFormLimits(DEFAULT_LIMITS);
    setUnlimitedItems(true);
    setUnlimitedQuantity(true);
    setUnlimitedSales(true);
    setUnlimitedInvoices(true);
    setUnlimitedQuotations(true);

    setStoreEnabled(false);
    setStoreName('');
    setStoreSubdomain('');
    setFormPlatform('all');

    setSelectedRegisteredUserEmail('');
    setUserSearchTerm('');
    setShowCalendar(false);
    setFormError(null);
    setIsAddModalOpen(true);
  };

  // Alias for backward compatibility
  const handleOpenAdd = handleOpenUpgradeUser;

  // Execute Add / Upgrade
  const handleSaveAdd = async (e: React.FormEvent) => {
    e.preventDefault();

    if (addModalMode === 'create_custom') {
      const isMgr = customAccountRole === 'manager';
      if (!formName.trim() || !formEmail.trim() || !formPassword.trim() || (!isMgr && !formManagerEmail.trim())) {
        setFormError(
          isKu
            ? isMgr
              ? 'تکایە خانە سەرەکییەکان (ناو، ئیمەیڵ، تێپەڕەوشە) پڕبکەرەوە'
              : 'تکایە هەموو خانە سەرەکییەکان (ناو، ئیمەیڵ، تێپەڕەوشە، ئیمەیڵی بەڕێوەبەر) پڕبکەرەوە'
            : isMgr
            ? 'Please fill required fields (Name, Email, Password)'
            : 'Please fill all required fields (Name, Email, Password, Manager Email)'
        );
        return;
      }
    } else {
      // upgrade_registered mode
      if (!formEmail.trim()) {
        setFormError(
          isKu
            ? 'تکایە ئیمەیڵی بەکارهێنەری تۆمارکراو دیاریبکە یان بنووسە'
            : 'Please select or type the registered user email'
        );
        return;
      }
      if (!formName.trim()) {
        setFormName(formEmail.trim().split('@')[0]);
      }
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

      const finalStoreName = (storeName.trim() || formName.trim() || cleanEmail.split('@')[0] || 'store').trim();
      const finalSubdomain = (storeSubdomain.trim() || slugifyStoreName(finalStoreName) || docId || 'store').trim();

      const updatedStore: OnlineStoreConfig | null = storeEnabled
        ? {
            enabled: true,
            storeName: finalStoreName,
            subdomain: finalSubdomain,
            status: 'active',
            activatedAt: new Date().toISOString(),
          }
        : null;

      const startDate = formStartedAt ? new Date(formStartedAt).toISOString() : new Date().toISOString();
      const expDate = formExpiresAt
        ? new Date(formExpiresAt).toISOString()
        : typeof formDuration === 'number' && formDuration > 0
        ? new Date(Date.now() + formDuration * 24 * 60 * 60 * 1000).toISOString()
        : undefined;

      const isStoreManager =
        addModalMode === 'upgrade_registered' ||
        customAccountRole === 'manager' ||
        !formManagerEmail.trim() ||
        formManagerEmail.trim().toLowerCase() === cleanEmail;

      const mgrEmail = isStoreManager ? cleanEmail : (formManagerEmail.trim().toLowerCase() || cleanEmail);

      const receiptId = `REC-${Date.now().toString(36).toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}`;
      const planDurationLabel = formDuration === 'unlimited' || !expDate
        ? (isKu ? 'بێ سنوور (هەمیشەیی)' : 'Unlimited (Lifetime)')
        : typeof formDuration === 'number'
        ? (isKu ? `${formDuration} ڕۆژ` : `${formDuration} Days`)
        : (isKu ? 'دیاریکراو' : 'Custom');

      const upgradeReceiptData = {
        receiptId,
        upgradedAt: new Date().toISOString(),
        customerName: formName.trim() || cleanEmail.split('@')[0],
        email: cleanEmail,
        planDuration: planDurationLabel,
        startDate: startDate,
        expiresAt: expDate || null,
        priceAmount: formPrice.trim() || null,
        limits: updatedLimits,
        storeEnabled: !!storeEnabled,
      };

      // 1. Write to employee_accounts
      const newAccount: any = {
        id: `emp_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        email: cleanEmail,
        displayName: formName.trim() || cleanEmail.split('@')[0],
        password: addModalMode === 'create_custom' ? formPassword.trim() : '',
        managerEmail: mgrEmail,
        phone: formPhone.trim() || null,
        priceAmount: formPrice.trim() || (isStoreManager ? 'PRO / هەمیشەیی' : null),
        durationDays: typeof formDuration === 'number' ? formDuration : null,
        startedAt: startDate,
        expiresAt: expDate || null,
        status: 'active',
        limits: updatedLimits,
        onlineStore: updatedStore || null,
        permissions: isStoreManager ? ALL_ACTIVE_PERMISSIONS : DEFAULT_PERMISSIONS,
        createdAt: new Date().toISOString(),
        accountType: addModalMode === 'upgrade_registered' ? 'registered' : 'custom',
        role: isStoreManager ? 'manager' : 'employee',
        targetPlatform: formPlatform || 'all',
        upgradeReceipt: upgradeReceiptData,
      };

      const docRef = doc(db, 'employee_accounts', docId);
      await setDoc(docRef, stripUndefined(newAccount), { merge: true });

      // 2. Synchronize to user_subscriptions so cloud verification activates in mobile app
      try {
        const subRef = doc(db, 'user_subscriptions', docId);
        await setDoc(
          subRef,
          stripUndefined({
            id: docId,
            email: cleanEmail,
            customerName: formName.trim() || cleanEmail.split('@')[0],
            phone: formPhone.trim() || null,
            status: 'active',
            tier: isStoreManager ? 'pro' : 'standard',
            planId: formDuration === 'unlimited' || !expDate ? 'lifetime' : `${formDuration}d`,
            startDate: startDate,
            expiresAt: expDate || null,
            storefront_enabled: storeEnabled,
            onlineStoreActive: storeEnabled,
            onlineStore: updatedStore || null,
            priceAmount: formPrice.trim() || (isStoreManager ? 'PRO / هەمیشەیی' : null),
            limits: updatedLimits,
            targetPlatform: formPlatform || 'all',
            upgradeReceipt: upgradeReceiptData,
            upgradedAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          }),
          { merge: true }
        );

        // 3. If online storefront is enabled, also write to store_activations
        if (storeEnabled) {
          await setDoc(
            doc(db, 'store_activations', docId),
            {
              email: cleanEmail,
              enabled: true,
              status: 'active',
              storeName: finalStoreName,
              subdomain: finalSubdomain,
              activatedAt: new Date().toISOString(),
            },
            { merge: true }
          );
        }

        // 4. Update app_telemetry_users tier & details
        await setDoc(
          doc(db, 'app_telemetry_users', docId),
          {
            email: cleanEmail,
            phone: formPhone.trim() || null,
            display_name: formName.trim() || null,
            business_name: finalStoreName,
            tier: 'pro',
            subscription_status: 'active',
            updated_at: new Date().toISOString(),
          },
          { merge: true }
        );
      } catch (subErr) {
        console.warn('Subscription sync warning:', subErr);
      }

      setIsAddModalOpen(false);
    } catch (err: any) {
      console.error('Error adding/upgrading employee:', err);
      setFormError(err?.message || (isKu ? 'هەڵەیەک ڕوویدا' : 'Failed to save account'));
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
    const startFormatted = formatDate(emp.startedAt || emp.createdAt);
    const endFormatted = emp.expiresAt ? formatDate(emp.expiresAt) : (isKu ? 'بێ سنوور' : 'Unlimited');
    const text = isKu
      ? `سڵاو بەڕێز ${emp.displayName} 🌟\nئاگاداری لە سیستەمی فرۆشیارەوە:\nماوەی بەشداریکردن لە بەرواری (${startFormatted}) تاوەکو (${endFormatted})\nبڕی پارەی دیاریکراو: ${emp.priceAmount || 'دیارینەکراو'}\nتکایە پەیوەندیمان پێوە بکە بۆ نوێکردنەوە تاوەکو سیستەمەکەت بەردەوام کارا بێت.`
      : `Hello ${emp.displayName},\nNotice from Froshiar: Your subscription started on ${startFormatted} and ends on ${endFormatted}. Amount due: ${emp.priceAmount || '—'}. Please contact us to renew.`;

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
      {/* ── Real-Time Password Changed Alert Banner ── */}
      {passwordAlert && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-50 w-11/12 max-w-lg p-4 rounded-2xl border bg-gradient-to-r from-amber-500/20 via-purple-500/20 to-emerald-500/20 backdrop-blur-xl border-amber-500/40 shadow-2xl animate-in slide-in-from-top-4 duration-300">
          <div className="flex items-start justify-between gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-500 flex items-center justify-center shrink-0">
              <Key className="w-5 h-5 animate-pulse" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-xs font-black text-amber-500">
                  {isKu ? '🔔 پاسۆردی کارمەند گۆڕدرا!' : '🔔 Employee Password Updated!'}
                </span>
                <span className="text-[10px] text-slate-400 font-mono">{passwordAlert.time}</span>
              </div>
              <p className="text-xs font-bold text-slate-800 dark:text-slate-100 mt-0.5 truncate">
                {passwordAlert.name} ({passwordAlert.email})
              </p>
              <div className="flex items-center gap-2 mt-2">
                <span className="text-[11px] font-bold text-slate-600 dark:text-slate-300">
                  {isKu ? 'پاسۆردی تازە:' : 'New Password:'}
                </span>
                <span className="px-2.5 py-1 rounded-md font-mono font-black text-xs bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30 select-all">
                  {passwordAlert.pass}
                </span>
                <button
                  onClick={() => {
                    navigator.clipboard?.writeText(passwordAlert.pass);
                    alert(isKu ? 'پاسۆرد کۆپیکرا!' : 'Password copied!');
                  }}
                  className="text-[10px] px-2.5 py-1 rounded-md font-bold bg-purple-600 hover:bg-purple-700 text-white cursor-pointer shadow-sm"
                >
                  {isKu ? 'کۆپیکردن' : 'Copy'}
                </button>
              </div>
            </div>
            <button
              onClick={() => setPasswordAlert(null)}
              className="p-1 rounded-md text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

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

        {/* Action Buttons: 1. Dedicated Store Activation | 2. Upgrade Registered User | 3. Create Account with Password */}
        <div className="flex items-center gap-2.5 flex-wrap shrink-0">
          {/* Button 1: Dedicated Online Store Activation */}
          <button
            type="button"
            onClick={handleOpenNewStoreModal}
            className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 font-black text-xs sm:text-sm shadow-lg shadow-emerald-500/25 flex items-center justify-center gap-2 transition-all duration-200 active:scale-95 cursor-pointer shrink-0 border border-emerald-400/50"
          >
            <Globe className="w-4 h-4 text-slate-950" />
            <span>{isKu ? '+ چالاککردنی وێب ستۆر' : '+ Activate Web Store'}</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-slate-950/20 font-mono font-extrabold hidden md:inline">
              {isKu ? 'فڕۆشگا' : 'Store'}
            </span>
          </button>

          {/* Button 2: Upgrade Registered User */}
          <button
            type="button"
            onClick={handleOpenUpgradeUser}
            className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 hover:from-amber-400 hover:to-orange-500 text-slate-950 font-black text-xs sm:text-sm shadow-lg shadow-amber-500/25 flex items-center justify-center gap-2 transition-all duration-200 active:scale-95 cursor-pointer shrink-0 border border-amber-400/50"
          >
            <Sparkles className="w-4 h-4 text-slate-950 fill-slate-950" />
            <span>{isKu ? '+ بەرزکردنەوەی ئەکاونتی تۆمارکراو' : '+ Upgrade Registered User'}</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-slate-950/20 font-mono font-extrabold hidden md:inline">
              {isKu ? 'گووگڵ / ئەپڵ' : 'Google/Apple'}
            </span>
          </button>

          {/* Button 3: Create Custom Account with Password */}
          <button
            type="button"
            onClick={handleOpenCreateCustom}
            className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-black text-xs sm:text-sm shadow-lg shadow-purple-500/25 flex items-center justify-center gap-2 transition-all duration-200 active:scale-95 cursor-pointer shrink-0 border border-purple-400/30"
          >
            <UserPlus className="w-4 h-4" />
            <span>{isKu ? '+ دروستکردنی ئەکاونتی نوێ بە پاسۆرد' : '+ Create Account with Password'}</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-white/20 font-mono font-extrabold hidden md:inline">
              {isKu ? 'کارمەند' : 'Staff'}
            </span>
          </button>
        </div>
      </div>

      {/* ── Section View Switcher: 1. ئەکاونتەکان | 2. حسابات و داهات | 3. وێب ستۆرەکان ── */}
      <div className="flex items-center gap-2 p-1.5 rounded-2xl bg-slate-900/40 dark:bg-slate-950/60 border border-slate-800/80 backdrop-blur-md flex-wrap">
        <button
          type="button"
          onClick={() => setAdminSection('accounts')}
          className={`flex-1 sm:flex-initial px-5 py-2.5 rounded-xl text-xs sm:text-sm font-extrabold flex items-center justify-center gap-2 transition-all cursor-pointer ${
            adminSection === 'accounts'
              ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/30 border border-purple-400/40'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>{isKu ? 'ئەکاونتەکان و دەسەڵاتەکان (RBAC)' : 'Accounts & Permissions'}</span>
          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-black/20 font-mono font-bold">
            {employees.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setAdminSection('financials')}
          className={`flex-1 sm:flex-initial px-5 py-2.5 rounded-xl text-xs sm:text-sm font-extrabold flex items-center justify-center gap-2 transition-all cursor-pointer ${
            adminSection === 'financials'
              ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 shadow-lg shadow-amber-500/30 border border-amber-300/50'
              : 'text-slate-400 hover:text-amber-400 hover:bg-slate-800/50'
          }`}
        >
          <DollarSign className="w-4 h-4 text-inherit" />
          <span>{isKu ? 'حسابات و داهاتی بەشداریکردن' : 'Financial Accounting & Revenue'}</span>
          <span className="text-[11px] px-2 py-0.5 rounded-full font-mono font-black bg-slate-950/20 text-inherit border border-current/20">
            {financialStats.totalUsd > 0
              ? `$${financialStats.totalUsd.toLocaleString()}`
              : `${financialStats.totalIqd.toLocaleString()} IQD`}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setAdminSection('online_stores')}
          className={`flex-1 sm:flex-initial px-5 py-2.5 rounded-xl text-xs sm:text-sm font-extrabold flex items-center justify-center gap-2 transition-all cursor-pointer ${
            adminSection === 'online_stores'
              ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-slate-950 shadow-lg shadow-emerald-500/30 border border-emerald-300/50'
              : 'text-slate-400 hover:text-emerald-400 hover:bg-slate-800/50'
          }`}
        >
          <Globe className="w-4 h-4 text-inherit" />
          <span>{isKu ? 'وێب ستۆرەکان (Online Stores)' : 'Online Stores'}</span>
          <span className="text-[10px] px-2 py-0.5 rounded-full font-mono font-black bg-slate-950/20 text-inherit border border-current/20">
            {storeFinancialStats.totalStores}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setAdminSection('domains')}
          className={`flex-1 sm:flex-initial px-5 py-2.5 rounded-xl text-xs sm:text-sm font-extrabold flex items-center justify-center gap-2 transition-all cursor-pointer ${
            adminSection === 'domains'
              ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-slate-950 shadow-lg shadow-cyan-500/30 border border-cyan-300/50'
              : 'text-slate-400 hover:text-cyan-400 hover:bg-slate-800/50'
          }`}
        >
          <Globe className="w-4 h-4 text-inherit" />
          <span>{isKu ? '🌐 لیستی دۆمەینەکان (Domains)' : '🌐 Domains Directory'}</span>
          <span className="text-[10px] px-2 py-0.5 rounded-full font-mono font-black bg-slate-950/20 text-inherit border border-current/20">
            {allDomainsList.length}
          </span>
        </button>
      </div>

      {adminSection === 'online_stores' ? (
        /* ═════════════════════════════════════════════════════════════════════ */
        /* ── ONLINE STORES MANAGEMENT PORTAL (بەشی وێب ستۆرەکان) ──           */
        /* ═════════════════════════════════════════════════════════════════════ */
        <div className="space-y-5 animate-in fade-in duration-300">
          {/* Top Online Stores KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4">
            {/* KPI 1: Total Store Revenue */}
            <div
              className={`p-5 rounded-3xl border relative overflow-hidden transition-all shadow-lg ${
                isDarkMode
                  ? 'bg-gradient-to-br from-[#122420] via-[#101D24] to-[#0D161F] border-emerald-500/50 shadow-emerald-500/10'
                  : 'bg-gradient-to-br from-[#F0FDF4] via-[#ECFDF5] to-[#E6FFFA] border-emerald-500 shadow-emerald-500/10'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className={`text-xs font-black uppercase tracking-wider ${isDarkMode ? 'text-emerald-400' : 'text-emerald-800'}`}>
                  {isKu ? '💰 کۆی داهاتی وێب ستۆرەکان' : '💰 Store Revenue'}
                </span>
                <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shadow-sm">
                  <Coins className="w-5 h-5" />
                </div>
              </div>
              <div className="mt-3 flex items-baseline gap-2 flex-wrap">
                <span className={`text-2xl sm:text-3xl font-black font-mono tracking-tight ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                  {storeFinancialStats.totalUsd > 0 && `$${storeFinancialStats.totalUsd.toLocaleString()}`}
                  {storeFinancialStats.totalUsd > 0 && storeFinancialStats.totalIqd > 0 && ' + '}
                  {storeFinancialStats.totalIqd > 0 && `${storeFinancialStats.totalIqd.toLocaleString()} IQD`}
                  {storeFinancialStats.totalUsd === 0 && storeFinancialStats.totalIqd === 0 && '$0'}
                </span>
              </div>
              <div className={`text-xs mt-2 font-bold flex items-center gap-1.5 ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span>
                  {storeFinancialStats.paidCount} {isKu ? 'فرۆشگای پارەدراو هەن' : 'Paid Stores'}
                </span>
              </div>
            </div>

            {/* KPI 2: Total Stores */}
            <div
              className={`p-5 rounded-3xl border transition-all ${
                isDarkMode ? 'bg-[#141C2E] border-slate-800' : 'bg-white border-slate-200 shadow-sm'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className={`text-xs font-bold ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                  {isKu ? 'کۆی گشتی وێب ستۆرەکان' : 'Total Web Stores'}
                </span>
                <div className="w-10 h-10 rounded-2xl bg-teal-500/15 text-teal-400 border border-teal-500/30 flex items-center justify-center">
                  <Store className="w-5 h-5" />
                </div>
              </div>
              <div className={`mt-3 text-2xl sm:text-3xl font-black font-mono ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                {storeFinancialStats.totalStores}
              </div>
              <div className={`text-xs mt-2 font-medium ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                {isKu ? 'هەموو فرۆشگا تۆمارکراوەکان' : 'All Registered Storefronts'}
              </div>
            </div>

            {/* KPI 3: Active Stores */}
            <div
              className={`p-5 rounded-3xl border transition-all ${
                isDarkMode ? 'bg-[#141C2E] border-slate-800' : 'bg-white border-slate-200 shadow-sm'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className={`text-xs font-bold ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                  {isKu ? 'فرۆشگا چالاکەکان' : 'Active Stores'}
                </span>
                <div className="w-10 h-10 rounded-2xl bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 flex items-center justify-center">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
              </div>
              <div className="mt-3 flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-emerald-400 animate-pulse" />
                <span className={`text-2xl sm:text-3xl font-black font-mono ${isDarkMode ? 'text-emerald-400' : 'text-emerald-700'}`}>
                  {storeFinancialStats.activeCount}
                </span>
              </div>
              <div className={`text-xs mt-2 font-medium ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                {isKu ? 'ئۆنلاینن و ئامادەی کڕینن' : 'Live & Open for Customers'}
              </div>
            </div>

            {/* KPI 4: Suspended & Expired */}
            <div
              className={`p-5 rounded-3xl border transition-all ${
                isDarkMode ? 'bg-[#141C2E] border-slate-800' : 'bg-white border-slate-200 shadow-sm'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className={`text-xs font-bold ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                  {isKu ? 'ڕاگیراو / بەسەرچوو' : 'Suspended / Expired'}
                </span>
                <div className="w-10 h-10 rounded-2xl bg-amber-500/15 text-amber-400 border border-amber-500/30 flex items-center justify-center">
                  <AlertTriangle className="w-5 h-5" />
                </div>
              </div>
              <div className={`mt-3 text-2xl sm:text-3xl font-black font-mono ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                {storeFinancialStats.suspendedCount + storeFinancialStats.expiredCount}
              </div>
              <div className={`text-xs mt-2 font-medium ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                {storeFinancialStats.suspendedCount} {isKu ? 'ڕاگیراو' : 'Suspended'} • {storeFinancialStats.expiredCount} {isKu ? 'بەسەرچوو' : 'Expired'}
              </div>
            </div>
          </div>

          {/* Search, Filter & Quick Action Bar */}
          <div className="p-4 rounded-3xl bg-slate-900/40 dark:bg-slate-950/60 border border-slate-800/80 backdrop-blur-md flex items-center justify-between gap-3 flex-wrap">
            {/* Filter Pills */}
            <div className="flex items-center gap-1.5 flex-wrap">
              {(['all', 'active', 'suspended', 'expired'] as const).map((st) => (
                <button
                  key={st}
                  type="button"
                  onClick={() => setStoreStatusFilter(st)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                    storeStatusFilter === st
                      ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30 font-black'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                  }`}
                >
                  <span>
                    {st === 'all'
                      ? (isKu ? 'هەموو' : 'All')
                      : st === 'active'
                      ? (isKu ? 'چالاکەکان' : 'Active')
                      : st === 'suspended'
                      ? (isKu ? 'ڕاگیراوەکان' : 'Suspended')
                      : (isKu ? 'بەسەرچووەکان' : 'Expired')}
                  </span>
                  <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-black/20 font-mono">
                    {st === 'all'
                      ? allOnlineStores.length
                      : st === 'active'
                      ? storeFinancialStats.activeCount
                      : st === 'suspended'
                      ? storeFinancialStats.suspendedCount
                      : storeFinancialStats.expiredCount}
                  </span>
                </button>
              ))}
            </div>

            {/* Search Input & Button */}
            <div className="flex items-center gap-2 flex-1 sm:flex-initial min-w-[280px]">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder={isKu ? 'گەڕان بەپێی ناوی فرۆشگا، بەستەر، ئیمەیڵ، ژمارە...' : 'Search store, slug, email, phone...'}
                  value={storeSearchTerm}
                  onChange={(e) => setStoreSearchTerm(e.target.value)}
                  className={`w-full pr-9 pl-3 py-2 rounded-xl text-xs border outline-none font-bold ${
                    isDarkMode ? 'bg-slate-900/90 border-slate-800 text-white' : 'bg-white border-slate-300 text-slate-950'
                  }`}
                />
              </div>

              <button
                type="button"
                onClick={handleOpenNewStoreModal}
                className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 font-black text-xs shadow-md shadow-emerald-500/20 flex items-center gap-1.5 transition cursor-pointer shrink-0"
              >
                <Globe className="w-3.5 h-3.5" />
                <span>{isKu ? '+ فرۆشگای نوێ' : '+ New Store'}</span>
              </button>
            </div>
          </div>

          {/* Online Stores List */}
          {filteredOnlineStores.length === 0 ? (
            <div className="p-12 text-center rounded-3xl border border-dashed border-slate-800 space-y-3">
              <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 text-emerald-400 mx-auto flex items-center justify-center border border-emerald-500/20">
                <Store className="w-7 h-7" />
              </div>
              <h3 className="text-base font-black text-white">
                {isKu ? 'هیچ وێب ستۆرێک بەم تایبەتمەندییە نەدۆزرایەوە' : 'No online stores match this query'}
              </h3>
              <p className="text-xs text-slate-400">
                {isKu ? 'دەتوانیت هەر ئێستا یەکەمین وێب ستۆر بۆ هەر بەکارهێنەرێک یان کارمەندێک چالاک بکەیت' : 'You can activate a web store for any user or staff member right now.'}
              </p>
              <button
                type="button"
                onClick={handleOpenNewStoreModal}
                className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs inline-flex items-center gap-2 cursor-pointer transition shadow-lg shadow-emerald-600/30"
              >
                <Globe className="w-4 h-4" />
                <span>{isKu ? '+ چالاککردنی وێب ستۆر' : '+ Activate Web Store'}</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredOnlineStores.map((store) => {
                const isExp = store.expiresAt ? new Date(store.expiresAt).getTime() < Date.now() : false;
                const isSusp = store.status === 'suspended' || !store.enabled;
                const daysRemaining = store.expiresAt
                  ? Math.ceil((new Date(store.expiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
                  : null;

                return (
                  <div
                    key={store.id || store.email || store.subdomain}
                    className={`p-5 rounded-3xl border transition-all relative overflow-hidden flex flex-col justify-between gap-4 ${
                      isDarkMode
                        ? 'bg-gradient-to-br from-[#121927] via-[#101724] to-[#0D1420] border-slate-800 hover:border-emerald-500/40'
                        : 'bg-white border-slate-200 hover:border-emerald-500/60 shadow-sm'
                    }`}
                  >
                    {/* Top Row: Store Avatar, Name, Status Badge */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white flex items-center justify-center shrink-0 shadow-md shadow-emerald-600/20 font-black">
                          <Store className="w-6 h-6" />
                        </div>
                        <div className="min-w-0">
                          <h3 className={`text-base sm:text-lg font-black truncate ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                            {store.storeName}
                          </h3>
                          <div className="text-xs text-slate-400 truncate flex items-center gap-1.5">
                            <span>{store.customerName || (isKu ? 'خاوەن هەژمار' : 'Owner')}</span>
                            <span>•</span>
                            <span className="font-mono text-[11px] truncate">{store.email}</span>
                          </div>
                        </div>
                      </div>

                      {/* Status Badge */}
                      <span
                        className={`text-[11px] px-2.5 py-1 rounded-xl font-bold border shrink-0 flex items-center gap-1.5 ${
                          isSusp
                            ? isDarkMode ? 'bg-amber-500/15 text-amber-400 border-amber-500/30' : 'bg-amber-100 text-amber-900 border-amber-300'
                            : isExp
                            ? isDarkMode ? 'bg-rose-500/15 text-rose-400 border-rose-500/30' : 'bg-rose-100 text-rose-900 border-rose-300'
                            : isDarkMode ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' : 'bg-emerald-100 text-emerald-800 border-emerald-300'
                        }`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            isSusp ? 'bg-amber-400' : isExp ? 'bg-rose-400' : 'bg-emerald-400 animate-pulse'
                          }`}
                        />
                        <span>
                          {isSusp
                            ? (isKu ? 'ڕاگیراوە (وەستێنراو)' : 'Suspended')
                            : isExp
                            ? (isKu ? 'بەسەرچووە' : 'Expired')
                            : (isKu ? 'چالاکە' : 'Active')}
                        </span>
                      </span>
                    </div>

                    {/* Storefront Link Bar */}
                    <div className="p-3 rounded-2xl bg-slate-900/80 dark:bg-slate-950/80 border border-slate-800 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0" dir="ltr">
                        <Globe className="w-4 h-4 text-emerald-400 shrink-0" />
                        <span className="font-mono text-xs font-bold text-cyan-300 truncate select-all">
                          https://froshiar.store/{store.subdomain}
                        </span>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => {
                            const url = `https://froshiar.store/${store.subdomain}`;
                            navigator.clipboard?.writeText(url);
                            alert(isKu ? `بەستەری فرۆشگا کۆپیکرا:\n${url}` : `Store URL copied:\n${url}`);
                          }}
                          className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition cursor-pointer"
                          title={isKu ? 'کۆپیکردنی بەستەر' : 'Copy URL'}
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                        <a
                          href={`https://froshiar.store/${store.subdomain}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1.5 rounded-lg bg-emerald-600/30 hover:bg-emerald-600/50 text-emerald-300 hover:text-white transition cursor-pointer"
                          title={isKu ? 'کردنەوەی فرۆشگا لە وێبگەڕ' : 'Open in browser'}
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      </div>
                    </div>

                    {/* Details Info Grid */}
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      {/* Phone */}
                      <div className="p-2.5 rounded-xl bg-slate-800/40 border border-slate-800/60">
                        <span className="text-[10px] font-bold text-slate-400 block mb-0.5">
                          {isKu ? 'ژمارەی مۆبایل:' : 'Phone:'}
                        </span>
                        <span className="font-mono font-bold text-slate-200" dir="ltr">
                          {store.phone || (isKu ? 'دیارینەکراو' : 'Not set')}
                        </span>
                      </div>

                      {/* Price / Fee */}
                      <div className="p-2.5 rounded-xl bg-slate-800/40 border border-slate-800/60">
                        <span className="text-[10px] font-bold text-slate-400 block mb-0.5">
                          {isKu ? 'بڕی پارەی دراو:' : 'Store Fee:'}
                        </span>
                        <span className="font-mono font-black text-amber-400">
                          {store.priceAmount && store.priceAmount.trim() ? store.priceAmount : (isKu ? 'بێبەرامبەر (0)' : 'Free')}
                        </span>
                      </div>

                      {/* Dates */}
                      <div className="col-span-2 p-2.5 rounded-xl bg-slate-800/40 border border-slate-800/60 flex items-center justify-between gap-2 flex-wrap">
                        <div className="flex items-center gap-1.5 text-slate-300">
                          <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span className="text-[11px]">
                            {isKu ? 'دەستپێک:' : 'Start:'}{' '}
                            <strong className="font-mono text-white">{formatDate(store.startDate || store.activatedAt)}</strong>
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span className="text-[11px] text-slate-300">
                            {isKu ? 'کۆتایی:' : 'End:'}{' '}
                            <strong className={`font-mono ${isExp ? 'text-rose-400' : 'text-emerald-300'}`}>
                              {store.expiresAt ? formatDate(store.expiresAt) : (isKu ? 'بێ سنوور (هەمیشەیی)' : 'Unlimited')}
                            </strong>
                          </span>
                          {store.expiresAt && (
                            <span className={`text-[10px] px-1.5 py-0.2 rounded font-mono font-bold ${
                              isExp ? 'bg-rose-500/20 text-rose-400' : 'bg-emerald-500/20 text-emerald-400'
                            }`}>
                              {isExp ? (isKu ? 'بەسەرچووە' : 'Expired') : `${daysRemaining} ${isKu ? 'ڕۆژ ماوە' : 'd left'}`}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Bottom Action Buttons */}
                    <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between gap-2 flex-wrap">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {/* Toggle Suspend / Unsuspend */}
                        <button
                          type="button"
                          onClick={() => handleToggleOnlineStoreByDoc(store)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition cursor-pointer flex items-center gap-1.5 ${
                            isSusp
                              ? 'bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 border-emerald-500/40'
                              : 'bg-amber-600/20 hover:bg-amber-600/30 text-amber-400 border-amber-500/40'
                          }`}
                        >
                          <Power className="w-3.5 h-3.5" />
                          <span>{isSusp ? (isKu ? 'کاراکردنەوە' : 'Unsuspend') : (isKu ? 'ڕاگرتن (وەستاندن)' : 'Suspend')}</span>
                        </button>

                        {/* Renew & Edit Modal */}
                        <button
                          type="button"
                          onClick={() => handleOpenEditStore(store)}
                          className="px-3 py-1.5 rounded-xl text-xs font-bold border border-slate-700 hover:border-slate-600 bg-slate-800/80 hover:bg-slate-700 text-slate-200 transition cursor-pointer flex items-center gap-1.5"
                        >
                          <RotateCcw className="w-3.5 h-3.5 text-cyan-400" />
                          <span>{isKu ? 'نوێکردنەوە / دەستکاری' : 'Renew / Edit'}</span>
                        </button>

                        {/* WhatsApp Send Receipt */}
                        {store.phone && (
                          <button
                            type="button"
                            onClick={() => handleSendStoreWhatsAppReceipt(store)}
                            className="px-2.5 py-1.5 rounded-xl text-xs font-bold bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 border border-emerald-500/40 transition cursor-pointer flex items-center gap-1"
                            title={isKu ? 'ناردنی وەسڵ بە واتسئەپ' : 'Send receipt via WhatsApp'}
                          >
                            <MessageCircle className="w-3.5 h-3.5 text-emerald-400" />
                            <span>{isKu ? 'واتسئەپ' : 'WhatsApp'}</span>
                          </button>
                        )}
                      </div>

                      {/* Delete Store */}
                      <button
                        type="button"
                        onClick={() => handleDeleteOnlineStoreByDoc(store)}
                        className="p-2 rounded-xl text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 border border-transparent hover:border-rose-500/30 transition cursor-pointer"
                        title={isKu ? 'سڕینەوەی وێب ستۆر' : 'Delete store'}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : adminSection === 'domains' ? (
        /* ═════════════════════════════════════════════════════════════════════ */
        /* ── CREATED DOMAINS DIRECTORY (لیستی هەموو دۆمەینە دروستکراوەکان) ──  */
        /* ═════════════════════════════════════════════════════════════════════ */
        <div className="space-y-5 animate-in fade-in duration-300">
          {/* Top Header Card */}
          <div
            className={`p-6 rounded-3xl border transition-all ${
              isDarkMode
                ? 'bg-gradient-to-br from-[#0c1929] via-[#0d1624] to-[#0a111c] border-cyan-500/30 shadow-lg shadow-cyan-500/5'
                : 'bg-gradient-to-br from-cyan-50/50 via-sky-50/40 to-white border-cyan-200 shadow-sm'
            }`}
          >
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center gap-3.5">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-cyan-500 to-blue-600 text-slate-950 flex items-center justify-center shrink-0 shadow-lg shadow-cyan-500/20 font-black">
                  <Globe className="w-7 h-7" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white">
                      {isKu ? 'لیستی هەموو دۆمەینە دروستکراوەکان' : 'All Created Domains Directory'}
                    </h2>
                    <span className="px-2.5 py-0.5 rounded-full text-[11px] font-mono font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                      {allDomainsList.length} {isKu ? 'دۆمەین تۆمارکراوە' : 'Domains'}
                    </span>
                  </div>
                  <p className="text-xs sm:text-sm text-slate-400 mt-1">
                    {isKu
                      ? 'لێرەدا تەواوی ئەو دۆمەین و بەستەرانە ڕیزکراون کە دروستکراون. دەست بنێ بە هەر دۆمەینێکدا بۆ زانینی خاوەنەکەی، کڕیار، ژمارەی پەیوەندی و وردەکارییەکان.'
                      : 'All created web domains. Click on any domain to inspect its owner, customer details, and live status.'}
                  </p>
                </div>
              </div>

              {/* Action Button: Create New Domain */}
              <button
                type="button"
                onClick={handleOpenNewStoreModal}
                className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-black text-xs sm:text-sm shadow-lg shadow-cyan-500/25 flex items-center justify-center gap-2 transition cursor-pointer shrink-0"
              >
                <Globe className="w-4 h-4" />
                <span>{isKu ? '+ دروستکردنی دۆمەینی نوێ' : '+ Create New Domain'}</span>
              </button>
            </div>

            {/* Quick KPI Counters */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-5 border-t border-slate-800/80">
              <div className="p-3 rounded-2xl bg-slate-900/60 border border-slate-800/80 text-center">
                <span className="text-[11px] font-bold text-slate-400 block mb-1">
                  {isKu ? 'کۆی گشتی دۆمەینەکان' : 'Total Domains'}
                </span>
                <span className="text-xl sm:text-2xl font-mono font-black text-white">
                  {domainStats.total}
                </span>
              </div>

              <div className="p-3 rounded-2xl bg-emerald-950/30 border border-emerald-800/50 text-center">
                <span className="text-[11px] font-bold text-emerald-400 block mb-1">
                  {isKu ? '🟢 چالاکەکان' : '🟢 Active'}
                </span>
                <span className="text-xl sm:text-2xl font-mono font-black text-emerald-300">
                  {domainStats.activeCount}
                </span>
              </div>

              <div className="p-3 rounded-2xl bg-amber-950/30 border border-amber-800/50 text-center">
                <span className="text-[11px] font-bold text-amber-400 block mb-1">
                  {isKu ? '🟡 ڕاگیراوەکان' : '🟡 Suspended'}
                </span>
                <span className="text-xl sm:text-2xl font-mono font-black text-amber-300">
                  {domainStats.suspendedCount}
                </span>
              </div>

              <div className="p-3 rounded-2xl bg-rose-950/30 border border-rose-800/50 text-center">
                <span className="text-[11px] font-bold text-rose-400 block mb-1">
                  {isKu ? '🔴 بەسەرچووەکان' : '🔴 Expired'}
                </span>
                <span className="text-xl sm:text-2xl font-mono font-black text-rose-300">
                  {domainStats.expiredCount}
                </span>
              </div>
            </div>
          </div>

          {/* Search & Filter Bar */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            {/* Filter Chips */}
            <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-slate-900/60 border border-slate-800/80 overflow-x-auto">
              {(['all', 'active', 'suspended', 'expired'] as const).map((st) => (
                <button
                  key={st}
                  type="button"
                  onClick={() => setDomainStatusFilter(st)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shrink-0 cursor-pointer ${
                    domainStatusFilter === st
                      ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <span>
                    {st === 'all'
                      ? (isKu ? 'هەموو' : 'All')
                      : st === 'active'
                      ? (isKu ? 'چالاک' : 'Active')
                      : st === 'suspended'
                      ? (isKu ? 'ڕاگیراو' : 'Suspended')
                      : (isKu ? 'بەسەرچوو' : 'Expired')}
                  </span>
                  <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-black/20 font-mono">
                    {st === 'all'
                      ? allDomainsList.length
                      : st === 'active'
                      ? domainStats.activeCount
                      : st === 'suspended'
                      ? domainStats.suspendedCount
                      : domainStats.expiredCount}
                  </span>
                </button>
              ))}
            </div>

            {/* Search Input */}
            <div className="relative flex-1 sm:max-w-md">
              <Search className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder={isKu ? 'گەڕان بەپێی ناوی دۆمەین، خاوەنەکەی، فڕۆشگا، ئیمەیڵ، مۆبایل...' : 'Search domain, owner, phone, store...'}
                value={domainSearchTerm}
                onChange={(e) => setDomainSearchTerm(e.target.value)}
                className={`w-full pr-9 pl-3 py-2 rounded-xl text-xs border outline-none font-bold ${
                  isDarkMode ? 'bg-slate-900/90 border-slate-800 text-white' : 'bg-white border-slate-300 text-slate-950'
                }`}
              />
            </div>
          </div>

          {/* Domains Grid */}
          {filteredDomainsList.length === 0 ? (
            <div className="p-12 text-center rounded-3xl border border-dashed border-slate-800 space-y-3">
              <div className="w-14 h-14 rounded-2xl bg-cyan-500/10 text-cyan-400 mx-auto flex items-center justify-center border border-cyan-500/20">
                <Globe className="w-7 h-7" />
              </div>
              <h3 className="text-base font-black text-white">
                {isKu ? 'هیچ دۆمەینێک بەم گەڕانە نەدۆزرایەوە' : 'No domains found'}
              </h3>
              <p className="text-xs text-slate-400">
                {isKu ? 'دەتوانیت گەڕانەکەت پاک بکەیتەوە یان دۆمەینێکی نوێ دروست بکەیت.' : 'Clear your search query or create a new domain.'}
              </p>
              <button
                type="button"
                onClick={handleOpenNewStoreModal}
                className="px-5 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-black text-xs inline-flex items-center gap-2 cursor-pointer transition shadow-lg shadow-cyan-600/30"
              >
                <Globe className="w-4 h-4" />
                <span>{isKu ? '+ دروستکردنی دۆمەینی نوێ' : '+ Create New Domain'}</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredDomainsList.map((store) => {
                const isExp = store.expiresAt ? new Date(store.expiresAt).getTime() < Date.now() : false;
                const isSusp = store.status === 'suspended' || !store.enabled;
                const daysRemaining = store.expiresAt
                  ? Math.ceil((new Date(store.expiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
                  : null;

                return (
                  <div
                    key={store.id || store.email || store.subdomain}
                    onClick={() => setSelectedDomainDetail(store)}
                    className={`p-5 rounded-3xl border transition-all duration-200 cursor-pointer relative overflow-hidden flex flex-col justify-between gap-4 group ${
                      isDarkMode
                        ? 'bg-gradient-to-br from-[#0f172a] via-[#10192e] to-[#0c1322] border-slate-800/90 hover:border-cyan-500/60 hover:shadow-xl hover:shadow-cyan-500/10 hover:-translate-y-0.5'
                        : 'bg-white border-slate-200 hover:border-cyan-500/70 shadow-sm hover:shadow-md'
                    }`}
                  >
                    {/* Top: Domain URL Pill & Status */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0" dir="ltr">
                        <div className="w-8 h-8 rounded-xl bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shrink-0 group-hover:scale-110 transition-transform">
                          <Globe className="w-4 h-4" />
                        </div>
                        <span className="font-mono text-sm font-black text-cyan-300 truncate group-hover:text-cyan-200">
                          froshiar.store/{store.subdomain}
                        </span>
                      </div>

                      {/* Status */}
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-full font-bold border shrink-0 flex items-center gap-1 ${
                          isSusp
                            ? 'bg-amber-500/15 text-amber-400 border-amber-500/30'
                            : isExp
                            ? 'bg-rose-500/15 text-rose-400 border-rose-500/30'
                            : 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                        }`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            isSusp ? 'bg-amber-400' : isExp ? 'bg-rose-400' : 'bg-emerald-400 animate-pulse'
                          }`}
                        />
                        <span>
                          {isSusp
                            ? (isKu ? 'ڕاگیراو' : 'Suspended')
                            : isExp
                            ? (isKu ? 'بەسەرچوو' : 'Expired')
                            : (isKu ? 'چالاک' : 'Active')}
                        </span>
                      </span>
                    </div>

                    {/* Middle: Who does it belong to (هی کێیە) */}
                    <div className="p-3 rounded-2xl bg-slate-900/70 border border-slate-800/70 space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-400 font-bold flex items-center gap-1.5">
                          <Users className="w-3.5 h-3.5 text-cyan-400" />
                          <span>{isKu ? 'خاوەنی دۆمەین:' : 'Domain Owner:'}</span>
                        </span>
                        <strong className="text-white font-extrabold truncate max-w-[150px]">
                          {store.customerName || store.storeName || (isKu ? 'دیارینەکراو' : 'Unknown')}
                        </strong>
                      </div>

                      <div className="flex items-center justify-between text-xs text-slate-400">
                        <span className="text-[11px] font-bold">{isKu ? 'ئیمەیڵ:' : 'Email:'}</span>
                        <span className="font-mono text-[11px] text-slate-300 truncate max-w-[180px]">{store.email}</span>
                      </div>

                      <div className="flex items-center justify-between text-xs text-slate-400">
                        <span className="text-[11px] font-bold">{isKu ? 'ژمارەی مۆبایل:' : 'Phone:'}</span>
                        <span className="font-mono text-[11px] text-slate-300" dir="ltr">{store.phone || (isKu ? 'دیارینەکراو' : 'None')}</span>
                      </div>

                      <div className="flex items-center justify-between text-xs text-slate-400 pt-1 border-t border-slate-800/60">
                        <span className="text-[11px] font-bold">{isKu ? 'ناوی فڕۆشگا:' : 'Store Name:'}</span>
                        <span className="text-white font-bold truncate max-w-[150px]">{store.storeName}</span>
                      </div>
                    </div>

                    {/* Bottom: Dates & Tap to Inspect CTA */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-[11px] text-slate-400 px-1">
                        <span>{isKu ? 'بەرواری بەسەرچوون:' : 'Expires:'}</span>
                        <strong className={`font-mono ${isExp ? 'text-rose-400' : 'text-emerald-400'}`}>
                          {store.expiresAt ? formatDate(store.expiresAt) : (isKu ? 'بێ سنوور' : 'Unlimited')}
                        </strong>
                      </div>

                      {/* Prominent Tap Button */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedDomainDetail(store);
                        }}
                        className="w-full py-2.5 rounded-xl bg-gradient-to-r from-cyan-500/20 via-blue-500/20 to-cyan-500/20 hover:from-cyan-500/30 hover:to-blue-500/30 text-cyan-300 border border-cyan-500/40 text-xs font-black flex items-center justify-center gap-2 transition cursor-pointer group-hover:border-cyan-400"
                      >
                        <Search className="w-3.5 h-3.5" />
                        <span>{isKu ? '🔍 دەست بنێ بۆ بینینی هەموو زانیارییەکان' : '🔍 Tap to View Owner & Details'}</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : adminSection === 'financials' ? (
        /* ═════════════════════════════════════════════════════════════════════ */
        /* ── FINANCIAL ACCOUNTING & REVENUE PORTAL (بەشی حسابات و داهات) ──    */
        /* ═════════════════════════════════════════════════════════════════════ */
        <div className="space-y-5 animate-in fade-in duration-300">
          {/* Top Financial KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4">
            {/* KPI 1: Total Revenue (کۆی گشتی داهات) */}
            <div
              className={`p-5 rounded-3xl border relative overflow-hidden transition-all shadow-lg ${
                isDarkMode
                  ? 'bg-gradient-to-br from-[#1E2538] via-[#161D2E] to-[#121826] border-[#D4AF37]/50 shadow-[#D4AF37]/10'
                  : 'bg-gradient-to-br from-[#FFFDF5] via-[#FFF9E6] to-[#FFF4D0] border-[#D4AF37] shadow-amber-500/10'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className={`text-xs font-black uppercase tracking-wider ${isDarkMode ? 'text-[#D4AF37]' : 'text-amber-800'}`}>
                  {isKu ? '💰 کۆی گشتی داهات' : '💰 Total Revenue'}
                </span>
                <div className="w-10 h-10 rounded-2xl bg-[#D4AF37]/20 border border-[#D4AF37]/40 flex items-center justify-center text-[#D4AF37] shadow-sm">
                  <Coins className="w-5 h-5" />
                </div>
              </div>
              <div className="mt-3 flex items-baseline gap-2 flex-wrap">
                <span className={`text-2xl sm:text-3xl font-black font-mono tracking-tight ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                  {financialStats.totalUsd > 0 && `$${financialStats.totalUsd.toLocaleString()}`}
                  {financialStats.totalUsd > 0 && financialStats.totalIqd > 0 && ' + '}
                  {financialStats.totalIqd > 0 && `${financialStats.totalIqd.toLocaleString()} IQD`}
                  {financialStats.totalUsd === 0 && financialStats.totalIqd === 0 && '$0'}
                </span>
              </div>
              <div className={`text-xs mt-2 font-bold flex items-center gap-1.5 ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span>
                  {financialStats.paidCount} {isKu ? 'ئەکاونت پارەی بەشداریکردنیان داوە' : 'Paid Accounts'}
                </span>
              </div>
            </div>

            {/* KPI 2: Upgraded Accounts (ئەکاونتە بەرزکراوەکان) */}
            <div
              className={`p-5 rounded-3xl border transition-all ${
                isDarkMode ? 'bg-[#141C2E] border-slate-800' : 'bg-white border-slate-200 shadow-sm'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className={`text-xs font-bold ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                  {isKu ? 'ئەکاونتە بەرزکراوەکان' : 'Upgraded Accounts'}
                </span>
                <div className="w-10 h-10 rounded-2xl bg-amber-500/15 text-amber-500 border border-amber-500/30 flex items-center justify-center">
                  <Sparkles className="w-5 h-5" />
                </div>
              </div>
              <div className={`mt-3 text-2xl sm:text-3xl font-black font-mono ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                {financialStats.upgradedCount}
              </div>
              <div className={`text-xs mt-2 font-medium ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                {stats.active} {isKu ? 'چالاک' : 'Active'} • {stats.expiredCount} {isKu ? 'بەسەرچوو' : 'Expired'}
              </div>
            </div>

            {/* KPI 3: Managers & Teams (بەڕێوەبەر و تیمەکان) */}
            <div
              className={`p-5 rounded-3xl border transition-all ${
                isDarkMode ? 'bg-[#141C2E] border-slate-800' : 'bg-white border-slate-200 shadow-sm'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className={`text-xs font-bold ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                  {isKu ? 'بەڕێوەبەر و تیمەکان' : 'Managers & Teams'}
                </span>
                <div className="w-10 h-10 rounded-2xl bg-purple-500/15 text-purple-400 border border-purple-500/30 flex items-center justify-center">
                  <Crown className="w-5 h-5" />
                </div>
              </div>
              <div className={`mt-3 text-2xl sm:text-3xl font-black font-mono ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                {financialStats.managersCount}
              </div>
              <div className={`text-xs mt-2 font-medium ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                {isKu ? 'خاوەن کارمەندی بەستراوە' : 'Supervising accounts with staff'}
              </div>
            </div>

            {/* KPI 4: Direct / Custom Accounts (ئەکاونتی تاکەکەسی و تایبەت) */}
            <div
              className={`p-5 rounded-3xl border transition-all ${
                isDarkMode ? 'bg-[#141C2E] border-slate-800' : 'bg-white border-slate-200 shadow-sm'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className={`text-xs font-bold ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                  {isKu ? 'ئەکاونتی سەربەخۆ / تایبەت' : 'Direct / Custom Accounts'}
                </span>
                <div className="w-10 h-10 rounded-2xl bg-blue-500/15 text-blue-400 border border-blue-500/30 flex items-center justify-center">
                  <KeyRound className="w-5 h-5" />
                </div>
              </div>
              <div className={`mt-3 text-2xl sm:text-3xl font-black font-mono ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                {Math.max(0, financialStats.totalAccounts - financialStats.managersCount)}
              </div>
              <div className={`text-xs mt-2 font-medium ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                {isKu ? 'تۆمارکراوی پاسۆرد یان گووگڵ' : 'Independent single store users'}
              </div>
            </div>
          </div>

          {/* Financial Filter & Search Bar */}
          <div
            className={`p-4 rounded-2xl border flex flex-col md:flex-row items-center justify-between gap-3 ${
              isDarkMode ? 'bg-[#141C2E] border-slate-800' : 'bg-white border-slate-200 shadow-sm'
            }`}
          >
            {/* Search Input */}
            <div className="relative w-full md:w-96">
              <Search className="w-4 h-4 text-slate-400 absolute start-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                placeholder={isKu ? 'گەڕان بەپێی ناو، ئیمەیڵ، ژمارەی تەلەفۆن، یان نرخی پارەدان...' : 'Search by name, email, phone, or price...'}
                value={financialSearch}
                onChange={(e) => setFinancialSearch(e.target.value)}
                className={`w-full ps-10 pe-4 py-2.5 rounded-xl text-xs sm:text-sm border outline-none transition ${
                  isDarkMode
                    ? 'bg-[#0E1524] border-slate-700 text-slate-100 focus:border-amber-500'
                    : 'bg-slate-50 border-slate-300 text-slate-900 focus:border-amber-500'
                }`}
              />
            </div>

            {/* Filter Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto pb-1 md:pb-0">
              <button
                type="button"
                onClick={() => setFinancialFilter('all')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer border ${
                  financialFilter === 'all'
                    ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-sm'
                    : isDarkMode
                    ? 'bg-slate-800/80 text-slate-300 border-slate-700 hover:text-white'
                    : 'bg-slate-100 text-slate-700 border-slate-200 hover:text-slate-900'
                }`}
              >
                {isKu ? 'هەموو تۆمارەکان' : 'All'} ({employees.length})
              </button>

              <button
                type="button"
                onClick={() => setFinancialFilter('paid')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer border ${
                  financialFilter === 'paid'
                    ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-sm'
                    : isDarkMode
                    ? 'bg-slate-800/80 text-slate-300 border-slate-700 hover:text-white'
                    : 'bg-slate-100 text-slate-700 border-slate-200 hover:text-slate-900'
                }`}
              >
                💰 {isKu ? 'تەنها پارەدراوەکان' : 'Paid Only'} ({financialStats.paidCount})
              </button>

              <button
                type="button"
                onClick={() => setFinancialFilter('managers')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer border ${
                  financialFilter === 'managers'
                    ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-sm'
                    : isDarkMode
                    ? 'bg-slate-800/80 text-slate-300 border-slate-700 hover:text-white'
                    : 'bg-slate-100 text-slate-700 border-slate-200 hover:text-slate-900'
                }`}
              >
                👑 {isKu ? 'بەڕێوەبەر و تیم' : 'Managers & Teams'} ({financialStats.managersCount})
              </button>

              <button
                type="button"
                onClick={() => setFinancialFilter('custom')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer border ${
                  financialFilter === 'custom'
                    ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-sm'
                    : isDarkMode
                    ? 'bg-slate-800/80 text-slate-300 border-slate-700 hover:text-white'
                    : 'bg-slate-100 text-slate-700 border-slate-200 hover:text-slate-900'
                }`}
              >
                🔑 {isKu ? 'ئەکاونتی تایبەت' : 'Custom'}
              </button>
            </div>
          </div>

          {/* Financial Records List */}
          {financialAccounts.length === 0 ? (
            <div
              className={`p-12 text-center rounded-3xl border ${
                isDarkMode ? 'bg-[#141C2E] border-slate-800 text-slate-400' : 'bg-white border-slate-200 text-slate-500 shadow-sm'
              }`}
            >
              <DollarSign className="w-12 h-12 text-amber-500/50 mx-auto mb-3" />
              <h3 className="text-base font-bold text-slate-200 mb-1">
                {isKu ? 'هیچ تۆمارێکی دارایی نەدۆزرایەوە' : 'No financial records match your filter'}
              </h3>
              <p className="text-xs text-slate-400">
                {isKu ? 'تکایە فلتەر یان وشەی گەڕانەکەت بگۆڕە' : 'Try clearing your search or filters.'}
              </p>
            </div>
          ) : (
            <div className="space-y-3.5">
              {financialAccounts.map((emp) => {
                const myEmail = (emp.email || '').trim().toLowerCase();
                const teamEmployees = managerEmployeesMap.get(myEmail) || [];
                const hasTeam = teamEmployees.length > 0;
                const isExpanded = expandedManagerEmails.has(myEmail);
                const expired = isAccountExpired(emp);
                const hasReceipt = Boolean(emp.upgradeReceipt);

                return (
                  <div
                    key={emp.id}
                    className={`rounded-2xl border transition-all overflow-hidden ${
                      isDarkMode
                        ? 'bg-[#141C2E] border-slate-800 hover:border-slate-700'
                        : 'bg-white border-slate-200 hover:border-slate-300 shadow-xs'
                    }`}
                  >
                    {/* Main Row */}
                    <div className="p-4 sm:p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                      {/* Left: User Identity & Badges */}
                      <div className="flex items-start gap-3.5 min-w-0">
                        <div
                          className={`w-12 h-12 rounded-2xl flex items-center justify-center text-white font-black text-lg shrink-0 shadow-md ${
                            hasTeam
                              ? 'bg-gradient-to-tr from-amber-600 to-amber-500 text-slate-950 font-black'
                              : emp.accountType === 'registered'
                              ? 'bg-gradient-to-tr from-purple-600 to-indigo-600'
                              : 'bg-gradient-to-tr from-blue-600 to-cyan-600'
                          }`}
                        >
                          {hasTeam ? '👑' : (emp.displayName ? emp.displayName.charAt(0).toUpperCase() : 'U')}
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className={`text-base font-extrabold truncate ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                              {emp.displayName || emp.email.split('@')[0]}
                            </h3>

                            {/* Status badge */}
                            <span
                              className={`text-[11px] px-2.5 py-0.5 rounded-full font-bold flex items-center gap-1 border ${
                                emp.status === 'suspended'
                                  ? 'bg-rose-500/15 text-rose-400 border-rose-500/30'
                                  : expired
                                  ? 'bg-amber-500/15 text-amber-400 border-amber-500/30'
                                  : 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                              }`}
                            >
                              <span className={`w-1.5 h-1.5 rounded-full ${
                                emp.status === 'suspended' ? 'bg-rose-500' : expired ? 'bg-amber-500' : 'bg-emerald-500 animate-pulse'
                              }`} />
                              {emp.status === 'suspended' ? (isKu ? 'ڕاگیراو' : 'Suspended') : expired ? (isKu ? 'بەسەرچوو' : 'Expired') : (isKu ? 'چالاک' : 'Active')}
                            </span>

                            {/* Role badge */}
                            {hasTeam ? (
                              <span className="text-[11px] px-2.5 py-0.5 rounded-full font-bold bg-amber-500/20 text-[#D4AF37] border border-amber-500/40 flex items-center gap-1">
                                <Crown className="w-3 h-3 text-amber-500" />
                                <span>{isKu ? `بەڕێوەبەر (${teamEmployees.length} کارمەند)` : `Manager (${teamEmployees.length} Staff)`}</span>
                              </span>
                            ) : emp.accountType === 'registered' ? (
                              <span className="text-[11px] px-2.5 py-0.5 rounded-full font-bold bg-purple-500/15 text-purple-400 border border-purple-500/30 flex items-center gap-1">
                                <Sparkles className="w-3 h-3 text-purple-400" />
                                <span>{isKu ? 'ئەکاونتی فەرمی (گووگڵ/ئەپڵ)' : 'Registered User'}</span>
                              </span>
                            ) : (
                              <span className="text-[11px] px-2.5 py-0.5 rounded-full font-bold bg-blue-500/15 text-blue-400 border border-blue-500/30 flex items-center gap-1">
                                <KeyRound className="w-3 h-3 text-blue-400" />
                                <span>{isKu ? 'ئەکاونتی تایبەت (پاسۆرد)' : 'Custom Account'}</span>
                              </span>
                            )}

                            {/* Target Platform Badge */}
                            {emp.targetPlatform === 'macos' ? (
                              <span className="text-[11px] px-2.5 py-0.5 rounded-full font-bold bg-purple-500/15 text-purple-300 border border-purple-500/30 flex items-center gap-1">
                                <Laptop className="w-3 h-3 text-purple-400" />
                                <span> macOS (ماکبووک)</span>
                              </span>
                            ) : emp.targetPlatform === 'windows' ? (
                              <span className="text-[11px] px-2.5 py-0.5 rounded-full font-bold bg-blue-500/15 text-blue-300 border border-blue-500/30 flex items-center gap-1">
                                <Laptop className="w-3 h-3 text-blue-400" />
                                <span>⊞ Windows (ویندۆز)</span>
                              </span>
                            ) : (
                              <span className="text-[11px] px-2.5 py-0.5 rounded-full font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                                <Globe className="w-3 h-3 text-emerald-400" />
                                <span>{isKu ? 'گشتی (گشت ئامێرێک)' : 'All Platforms'}</span>
                              </span>
                            )}
                          </div>

                          {/* Email & Phone */}
                          <div className="flex items-center gap-2.5 mt-1 flex-wrap text-xs text-slate-400">
                            <span className="font-mono">{emp.email}</span>
                            {emp.phone && (
                              <button
                                type="button"
                                onClick={() => handleSendWhatsApp(emp)}
                                className="text-emerald-400 font-mono font-bold flex items-center gap-1 hover:underline cursor-pointer"
                              >
                                <MessageCircle className="w-3 h-3" />
                                <span>{emp.phone}</span>
                              </button>
                            )}
                            {emp.upgradeReceipt?.receiptId && (
                              <span className="font-mono text-[11px] text-[#D4AF37] bg-[#D4AF37]/10 px-2 py-0.5 rounded border border-[#D4AF37]/25">
                                #{emp.upgradeReceipt.receiptId}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Right: Paid Price & Quick Financial Actions */}
                      <div className="flex items-center gap-3 flex-wrap justify-between lg:justify-end border-t lg:border-t-0 pt-3 lg:pt-0 border-slate-800">
                        {/* Price Badge */}
                        <div className="flex items-center gap-2">
                          <div
                            className={`px-3.5 py-2 rounded-xl border flex items-center gap-2 ${
                              emp.priceAmount && emp.priceAmount.trim()
                                ? 'bg-gradient-to-r from-amber-500/15 to-orange-500/15 border-amber-500/40 text-[#D4AF37]'
                                : isDarkMode
                                ? 'bg-slate-800/60 border-slate-700 text-slate-400'
                                : 'bg-slate-100 border-slate-300 text-slate-600'
                            }`}
                          >
                            <DollarSign className="w-4 h-4 text-amber-500" />
                            <div className="text-start">
                              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                                {isKu ? 'بڕی پارەی دراو' : 'Paid Fee'}
                              </div>
                              <div className="text-sm font-black font-mono">
                                {emp.priceAmount && emp.priceAmount.trim() ? emp.priceAmount : (isKu ? 'دیارینەکراو' : 'Not set')}
                              </div>
                            </div>
                          </div>

                          {/* Quick Price Edit Button */}
                          <button
                            type="button"
                            onClick={() => handleOpenQuickPrice(emp)}
                            className="p-2.5 rounded-xl border border-amber-500/30 hover:bg-amber-500/15 text-amber-400 transition cursor-pointer"
                            title={isKu ? 'دەستکاری نرخ' : 'Edit Fee'}
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                        </div>

                        {/* Dates Info */}
                        <div className="text-xs space-y-0.5 min-w-[130px] hidden sm:block">
                          <div className="text-slate-400 flex items-center gap-1">
                            <Clock className="w-3 h-3 text-slate-500" />
                            <span>{isKu ? 'دەستپێک:' : 'Start:'} {formatDate(emp.startedAt || emp.createdAt)}</span>
                          </div>
                          <div className={`font-bold flex items-center gap-1 ${expired ? 'text-amber-400' : 'text-slate-300'}`}>
                            <Calendar className="w-3 h-3 text-slate-500" />
                            <span>{isKu ? 'کۆتایی:' : 'End:'} {emp.expiresAt ? formatDate(emp.expiresAt) : (isKu ? 'بێ سنوور' : 'Unlimited')}</span>
                          </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex items-center gap-2">
                          {/* WhatsApp Reminder */}
                          <button
                            type="button"
                            onClick={() => handleSendWhatsApp(emp)}
                            className="px-3 py-2 rounded-xl text-xs font-bold bg-emerald-600/15 hover:bg-emerald-600/25 text-emerald-400 border border-emerald-500/30 transition flex items-center gap-1.5 cursor-pointer"
                            title={isKu ? 'ناردنی زانیاری بە واتسئەپ' : 'WhatsApp Receipt'}
                          >
                            <MessageCircle className="w-3.5 h-3.5" />
                            <span className="hidden xl:inline">{isKu ? 'واتسئەپ' : 'WhatsApp'}</span>
                          </button>

                          {/* View Official Receipt */}
                          {hasReceipt && (
                            <button
                              type="button"
                              onClick={() => setViewingReceiptEmployee(emp)}
                              className="px-3 py-2 rounded-xl text-xs font-bold bg-[#D4AF37]/15 hover:bg-[#D4AF37]/25 text-[#D4AF37] border border-[#D4AF37]/30 transition flex items-center gap-1.5 cursor-pointer"
                            >
                              <FileText className="w-3.5 h-3.5" />
                              <span className="hidden xl:inline">{isKu ? 'وەصڵ' : 'Receipt'}</span>
                            </button>
                          )}

                          {/* Renew Subscription */}
                          <button
                            type="button"
                            onClick={() => handleOpenRenew(emp)}
                            className="px-3 py-2 rounded-xl text-xs font-bold bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 border border-purple-500/30 transition flex items-center gap-1.5 cursor-pointer"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                            <span>{isKu ? 'نوێکردنەوە' : 'Renew'}</span>
                          </button>

                          {/* Toggle Team Expand if Manager */}
                          {hasTeam && (
                            <button
                              type="button"
                              onClick={() => toggleManagerExpand(emp.email)}
                              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition cursor-pointer"
                              title={isExpanded ? (isKu ? 'داخستنی تیم' : 'Collapse') : (isKu ? 'پیشاندانی تیم' : 'Expand team')}
                            >
                              {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                            </button>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Expandable Team List for Managers */}
                    {hasTeam && isExpanded && (
                      <div className="bg-slate-950/60 p-4 border-t border-slate-800/80 animate-in slide-in-from-top-2 duration-200">
                        <div className="flex items-center justify-between mb-3">
                          <span className="text-xs font-black text-amber-400 flex items-center gap-1.5">
                            <Users className="w-3.5 h-3.5" />
                            <span>{isKu ? `تیمی ئەم بەڕێوەبەرە (${teamEmployees.length} کارمەند):` : `Supervised Team (${teamEmployees.length} Employees):`}</span>
                          </span>
                          <span className="text-[10px] text-slate-400">
                            {isKu ? 'هەموو ئەم کارمەندانە لەسەر لایسێنس و ژمێریاری ئەم بەڕێوەبەرەن' : 'Linked under this manager account'}
                          </span>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5">
                          {teamEmployees.map((staff) => (
                            <div
                              key={staff.id}
                              className="p-3 rounded-xl bg-[#141C2E] border border-slate-800 flex items-center justify-between gap-2"
                            >
                              <div className="min-w-0">
                                <div className="text-xs font-bold text-white truncate">
                                  {staff.displayName}
                                </div>
                                <div className="text-[11px] font-mono text-slate-400 truncate">
                                  {staff.email}
                                </div>
                                {staff.phone && (
                                  <div className="text-[10px] font-mono text-emerald-400 mt-0.5">
                                    {staff.phone}
                                  </div>
                                )}
                              </div>
                              <span
                                className={`text-[10px] px-2 py-0.5 rounded font-bold shrink-0 ${
                                  staff.status === 'active' ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30' : 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                                }`}
                              >
                                {staff.status === 'active' ? (isKu ? 'چالاک' : 'Active') : (isKu ? 'ڕاگیراو' : 'Suspended')}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        /* ── Standard Accounts & RBAC View ── */
        <>
          {/* ── KPI Stat Cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Total Accounts */}
        <div
          className={`p-4 sm:p-5 rounded-2xl border transition-all ${
            isDarkMode ? 'bg-[#141C2E] border-slate-800' : 'bg-white border-slate-200 shadow-sm'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className={`text-xs font-bold ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
              {isKu ? 'کۆی ئەکاونتەکان' : 'Total Accounts'}
            </span>
            <div className="w-8 h-8 rounded-xl bg-purple-500/15 text-purple-600 dark:text-purple-400 flex items-center justify-center font-bold">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className={`mt-2 text-2xl font-black ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{stats.total}</div>
          <div className={`text-[11px] mt-0.5 font-medium ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
            {managerList.length} {isKu ? 'بەڕێوەبەری سەرپەرشتیار' : 'Managers'}
          </div>
        </div>

        {/* Active Accounts */}
        <div
          className={`p-4 sm:p-5 rounded-2xl border transition-all ${
            isDarkMode ? 'bg-[#141C2E] border-slate-800' : 'bg-white border-slate-200 shadow-sm'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className={`text-xs font-bold ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
              {isKu ? 'چالاک و لەکاردا' : 'Active Accounts'}
            </span>
            <div className="w-8 h-8 rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-black text-emerald-600 dark:text-emerald-400">{stats.active}</div>
          <div className={`text-[11px] mt-0.5 font-medium ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
            {isKu ? 'مۆڵەتی کارپێکردن تەواوە' : 'Valid subscriptions'}
          </div>
        </div>

        {/* Expired Accounts */}
        <div
          className={`p-4 sm:p-5 rounded-2xl border transition-all ${
            isDarkMode ? 'bg-[#141C2E] border-slate-800' : 'bg-white border-slate-200 shadow-sm'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className={`text-xs font-bold ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
              {isKu ? 'بەسەرچووەکان' : 'Expired'}
            </span>
            <div className="w-8 h-8 rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-black text-amber-600 dark:text-amber-400">{stats.expiredCount}</div>
          <div className={`text-[11px] mt-0.5 font-medium ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
            {isKu ? 'پێویستیان بە تازەکردنەوەیە' : 'Need subscription renewal'}
          </div>
        </div>

        {/* Suspended Accounts */}
        <div
          className={`p-4 sm:p-5 rounded-2xl border transition-all ${
            isDarkMode ? 'bg-[#141C2E] border-slate-800' : 'bg-white border-slate-200 shadow-sm'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className={`text-xs font-bold ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
              {isKu ? 'ڕاگیراوەکان (وەستاو)' : 'Suspended'}
            </span>
            <div className="w-8 h-8 rounded-xl bg-rose-500/15 text-rose-600 dark:text-rose-400 flex items-center justify-center font-bold">
              <ShieldAlert className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-black text-rose-600 dark:text-rose-400">{stats.suspended}</div>
          <div className={`text-[11px] mt-0.5 font-medium ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
            {isKu ? 'قفڵکراو لەلایەن ئەدمینەوە' : 'Locked out on mobile'}
          </div>
        </div>
      </div>

      {/* ── Search, Filters, and Manager Selector ── */}
      <div
        className={`p-4 rounded-2xl border flex flex-col md:flex-row items-center justify-between gap-3 ${
          isDarkMode ? 'bg-[#141C2E] border-slate-800' : 'bg-white border-slate-200 shadow-sm'
        }`}
      >
        <div className="relative w-full md:w-80">
          <Search className={`w-4 h-4 absolute top-1/2 -translate-y-1/2 start-3 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`} />
          <input
            type="text"
            placeholder={isKu ? 'گەڕان بەپێی ناو، ئیمەیڵ، مۆبایل، بەڕێوەبەر...' : 'Search by name, email, phone, manager...'}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={`w-full ps-9 pe-4 py-2.5 rounded-xl text-xs sm:text-sm border outline-none transition font-medium ${
              isDarkMode
                ? 'bg-[#0E1524] border-slate-800 text-slate-100 placeholder-slate-500 focus:border-purple-500'
                : 'bg-slate-50 border-slate-300 text-slate-900 placeholder-slate-400 focus:border-purple-600 focus:bg-white focus:ring-2 focus:ring-purple-100'
            }`}
          />
        </div>

        {/* Manager Filter Dropdown */}
        <div className="flex items-center gap-2 w-full md:w-auto flex-wrap justify-end">
          <select
            value={selectedManagerFilter}
            onChange={(e) => setSelectedManagerFilter(e.target.value)}
            className={`px-3 py-2.5 rounded-xl text-xs font-bold border outline-none cursor-pointer ${
              isDarkMode
                ? 'bg-[#0E1524] border-slate-800 text-slate-200'
                : 'bg-slate-50 border-slate-300 text-slate-900 shadow-2xs'
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
          <div className={`flex items-center p-1 rounded-xl border text-xs font-bold ${
            isDarkMode ? 'bg-slate-800/80 border-slate-700/60' : 'bg-slate-100 border-slate-300'
          }`}>
            <button
              onClick={() => setStatusFilter('all')}
              className={`px-3 py-1.5 rounded-lg transition cursor-pointer font-bold ${
                statusFilter === 'all'
                  ? 'bg-purple-600 text-white shadow-sm'
                  : isDarkMode ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {isKu ? 'هەموو' : 'All'}
            </button>
            <button
              onClick={() => setStatusFilter('active')}
              className={`px-3 py-1.5 rounded-lg transition cursor-pointer font-bold ${
                statusFilter === 'active'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : isDarkMode ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {isKu ? 'چالاک' : 'Active'}
            </button>
            <button
              onClick={() => setStatusFilter('expired')}
              className={`px-3 py-1.5 rounded-lg transition cursor-pointer font-bold ${
                statusFilter === 'expired'
                  ? 'bg-amber-600 text-white shadow-sm'
                  : isDarkMode ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {isKu ? 'بەسەرچوو' : 'Expired'}
            </button>
            <button
              onClick={() => setStatusFilter('suspended')}
              className={`px-3 py-1.5 rounded-lg transition cursor-pointer font-bold ${
                statusFilter === 'suspended'
                  ? 'bg-rose-600 text-white shadow-sm'
                  : isDarkMode ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-900'
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
                  isDarkMode
                    ? 'bg-[#141C2E] border-slate-800 hover:border-slate-700 shadow-lg shadow-black/20'
                    : 'bg-white border-slate-200 hover:border-slate-300 shadow-md shadow-slate-100'
                } ${isSuspended ? 'border-rose-500/50 bg-rose-500/5' : isExpired ? 'border-amber-500/50 bg-amber-500/5' : ''}`}
              >
                <div>
                  {/* Top row: Avatar, Name, Status Badge, WhatsApp, Edit */}
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={`w-12 h-12 rounded-2xl flex items-center justify-center text-white font-black text-lg shrink-0 shadow-md ${
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
                          <h3 className={`text-base font-extrabold truncate ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                            {emp.displayName}
                          </h3>

                          {/* Status Badge */}
                          <span
                            className={`text-[11px] px-2.5 py-0.5 rounded-full font-bold flex items-center gap-1 border ${
                              isSuspended
                                ? isDarkMode ? 'bg-rose-500/15 text-rose-400 border-rose-500/30' : 'bg-rose-100 text-rose-800 border-rose-300'
                                : isExpired
                                ? isDarkMode ? 'bg-amber-500/15 text-amber-400 border-amber-500/30' : 'bg-amber-100 text-amber-900 border-amber-300'
                                : isDarkMode ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' : 'bg-emerald-100 text-emerald-800 border-emerald-300'
                            }`}
                          >
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${
                                isSuspended ? 'bg-rose-500' : isExpired ? 'bg-amber-500' : 'bg-emerald-500 animate-pulse'
                              }`}
                            />
                            {isSuspended
                              ? isKu ? 'ڕاگیراو (قفڵ)' : 'Suspended'
                              : isExpired
                              ? isKu ? 'بەسەرچوو' : 'Expired'
                              : isKu ? 'چالاک' : 'Active'}
                          </span>

                          {/* Account Type Badge */}
                          {emp.accountType === 'registered' || !emp.password ? (
                            <span className="text-[11px] px-2.5 py-0.5 rounded-full font-bold bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30 flex items-center gap-1">
                              <Sparkles className="w-3 h-3 text-amber-500" />
                              <span>{isKu ? 'ئەکاونتی فەرمی (گووگڵ/ئەپڵ)' : 'Registered User'}</span>
                            </span>
                          ) : (
                            <span className="text-[11px] px-2.5 py-0.5 rounded-full font-bold bg-purple-500/15 text-purple-700 dark:text-purple-300 border border-purple-500/30 flex items-center gap-1">
                              <Key className="w-3 h-3 text-purple-500" />
                              <span>{isKu ? 'کارمەند (پاسۆرد)' : 'Password Account'}</span>
                            </span>
                          )}

                          {/* Target Platform Badge */}
                          {emp.targetPlatform === 'macos' ? (
                            <span className="text-[11px] px-2.5 py-0.5 rounded-full font-bold bg-purple-500/15 text-purple-700 dark:text-purple-300 border border-purple-500/30 flex items-center gap-1">
                              <Laptop className="w-3 h-3 text-purple-500" />
                              <span> macOS (ماکبووک)</span>
                            </span>
                          ) : emp.targetPlatform === 'windows' ? (
                            <span className="text-[11px] px-2.5 py-0.5 rounded-full font-bold bg-blue-500/15 text-blue-700 dark:text-blue-300 border border-blue-500/30 flex items-center gap-1">
                              <Laptop className="w-3 h-3 text-blue-500" />
                              <span>⊞ Windows (ویندۆز)</span>
                            </span>
                          ) : (
                            <span className="text-[11px] px-2.5 py-0.5 rounded-full font-bold bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                              <Globe className="w-3 h-3 text-emerald-500" />
                              <span>{isKu ? 'گشتی (گشت ئامێرێک)' : 'All Platforms'}</span>
                            </span>
                          )}

                          {/* Price Tag */}
                          {emp.priceAmount && (
                            <span className={`text-[11px] px-2.5 py-0.5 rounded-full font-bold border ${
                              isDarkMode ? 'bg-[#D4AF37]/15 text-[#D4AF37] border-[#D4AF37]/40' : 'bg-amber-50 text-amber-900 border-amber-300'
                            }`}>
                              {emp.priceAmount}
                            </span>
                          )}
                        </div>

                        <div className={`text-xs flex items-center gap-2 mt-0.5 truncate ${isDarkMode ? 'text-slate-400' : 'text-slate-600 font-semibold'}`}>
                          <span className="truncate">{emp.email}</span>
                          {emp.phone && (
                            <span className="text-purple-600 dark:text-purple-400 font-mono text-xs font-bold truncate">({emp.phone})</span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* WhatsApp Quick Reminder + Edit */}
                    <div className="flex items-center gap-1.5 shrink-0">
                      {emp.phone && (
                        <button
                          onClick={() => handleSendWhatsApp(emp)}
                          className={`p-2 sm:p-2.5 rounded-xl border transition cursor-pointer ${
                            isDarkMode
                              ? 'bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 border-emerald-500/30'
                              : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border-emerald-300 shadow-2xs'
                          }`}
                          title={isKu ? 'ناردنی نامەی وەتسئەپ' : 'Send WhatsApp Reminder'}
                        >
                          <MessageCircle className="w-4 h-4" />
                        </button>
                      )}

                      <button
                        onClick={() => handleOpenEdit(emp)}
                        className={`p-2 sm:px-3 py-2 rounded-xl border transition cursor-pointer flex items-center gap-1.5 text-xs font-bold ${
                          isDarkMode
                            ? 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
                            : 'bg-slate-100 hover:bg-slate-200 text-slate-900 border-slate-300 shadow-2xs'
                        }`}
                        title={isKu ? 'دەستکاریکردنی زانیارییەکان' : 'Edit Account Details'}
                      >
                        <Edit3 className="w-4 h-4 text-purple-500" />
                        <span className="hidden sm:inline">{isKu ? 'دەستکاری' : 'Edit'}</span>
                      </button>
                    </div>
                  </div>

                  {/* Info Box: Manager, Dates, Limits, Store, Password */}
                  <div
                    className={`p-3.5 sm:p-4 rounded-2xl border text-xs sm:text-sm space-y-2.5 mb-3.5 ${
                      isDarkMode ? 'bg-[#0E1524] border-slate-800/90' : 'bg-slate-50 border-slate-200/90 shadow-2xs'
                    }`}
                  >
                    {/* Row 1: Manager Email & Cascade Suspend Button */}
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <span className={`flex items-center gap-1.5 ${isDarkMode ? 'text-slate-400' : 'text-slate-700 font-bold'}`}>
                        <Shield className="w-4 h-4 text-purple-500 shrink-0" />
                        <span>{isKu ? 'بەڕێوەبەری سەرپەرشتیار:' : 'Supervising Manager:'}</span>
                      </span>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className={`font-mono text-xs font-bold px-2 py-0.5 rounded border ${
                          isDarkMode ? 'bg-slate-800/80 text-slate-200 border-slate-700' : 'bg-white text-slate-900 border-slate-300 shadow-2xs'
                        }`}>
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
                            className={`px-2 py-0.5 rounded text-[10px] font-bold transition cursor-pointer border ${
                              emp.managerStatus === 'suspended'
                                ? isDarkMode ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' : 'bg-emerald-100 text-emerald-800 border-emerald-300 font-extrabold'
                                : isDarkMode ? 'bg-rose-500/15 text-rose-400 border-rose-500/30' : 'bg-rose-100 text-rose-800 border-rose-300 font-extrabold'
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

                    {/* Row 2: Subscription Validity: Start Date & End Date */}
                    <div className={`p-2.5 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-2 ${
                      isDarkMode ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200 shadow-2xs'
                    }`}>
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-4 h-4 text-purple-600 dark:text-purple-400 shrink-0" />
                        <span className={`text-xs font-bold ${isDarkMode ? 'text-slate-300' : 'text-slate-800'}`}>
                          {isKu ? 'ماوەی بەشداریکردن:' : 'Subscription:'}
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-1.5 text-xs">
                        {/* Start Date */}
                        <div className={`px-2.5 py-1 rounded-lg border flex items-center gap-1.5 ${
                          isDarkMode ? 'bg-slate-800/80 text-slate-300 border-slate-700' : 'bg-slate-100 text-slate-800 border-slate-300 font-bold'
                        }`}>
                          <span className="text-[11px] text-slate-500 font-bold">{isKu ? 'دەستپێک:' : 'Start:'}</span>
                          <span className="font-mono font-bold text-slate-900 dark:text-slate-100">{formatDate(emp.startedAt || emp.createdAt)}</span>
                        </div>

                        <span className="text-slate-400 font-black">←</span>

                        {/* End Date */}
                        <div className={`px-2.5 py-1 rounded-lg border flex items-center gap-1.5 font-bold ${
                          isExpired
                            ? isDarkMode ? 'bg-rose-500/15 text-rose-400 border-rose-500/30' : 'bg-rose-100 text-rose-800 border-rose-300'
                            : remaining !== null && remaining <= 5
                            ? isDarkMode ? 'bg-amber-500/15 text-amber-400 border-amber-500/30' : 'bg-amber-100 text-amber-900 border-amber-300'
                            : isDarkMode ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' : 'bg-emerald-100 text-emerald-800 border-emerald-300'
                        }`}>
                          <span className="text-[11px] font-bold opacity-80">{isKu ? 'کۆتایی:' : 'End:'}</span>
                          <span className={emp.expiresAt ? 'font-mono font-bold' : 'font-extrabold'}>
                            {emp.expiresAt ? formatDate(emp.expiresAt) : (isKu ? 'بێ سنوور' : 'Unlimited')}
                          </span>
                          {emp.expiresAt && remaining !== null && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded font-mono font-bold bg-black/10 dark:bg-white/15">
                              {isExpired ? (isKu ? 'بەسەرچووە' : 'Expired') : `${remaining} ${isKu ? 'ڕۆژ' : 'd'}`}
                            </span>
                          )}
                        </div>

                        {/* Renew Button */}
                        <button
                          onClick={() => handleOpenRenew(emp)}
                          className={`px-3 py-1 rounded-lg text-xs font-bold border transition cursor-pointer flex items-center gap-1.5 ${
                            isDarkMode
                              ? 'bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 border-purple-500/40'
                              : 'bg-purple-100 hover:bg-purple-200 text-purple-900 border-purple-300 shadow-2xs font-extrabold'
                          }`}
                        >
                          <RotateCcw className="w-3.5 h-3.5 shrink-0" />
                          <span>{isKu ? 'تازەکردنەوە ↻' : 'Renew ↻'}</span>
                        </button>
                      </div>
                    </div>

                    {/* Row 3: Usage Limits Summary */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 pt-2 border-t border-slate-200 dark:border-slate-800">
                      <span className={`flex items-center gap-1.5 ${isDarkMode ? 'text-slate-400' : 'text-slate-800 font-bold'}`}>
                        <Sliders className="w-4 h-4 text-indigo-500 shrink-0" />
                        <span>{isKu ? 'سنووری بەکارهێنان:' : 'Usage Limits:'}</span>
                      </span>
                      <div className="flex flex-wrap items-center gap-1.5 text-xs">
                        <span className={`px-2 py-0.5 rounded-md border flex items-center gap-1 ${
                          isDarkMode ? 'bg-slate-800/80 border-slate-700' : 'bg-white border-slate-300 shadow-2xs'
                        }`}>
                          <span className="text-slate-600 dark:text-slate-400 font-bold">ئایتم:</span>
                          <span className="font-mono font-black text-indigo-600 dark:text-indigo-400">
                            {emp.limits?.maxItems === 'unlimited' ? '∞' : emp.limits?.maxItems ?? 20}
                          </span>
                        </span>
                        <span className={`px-2 py-0.5 rounded-md border flex items-center gap-1 ${
                          isDarkMode ? 'bg-slate-800/80 border-slate-700' : 'bg-white border-slate-300 shadow-2xs'
                        }`}>
                          <span className="text-slate-600 dark:text-slate-400 font-bold">بڕ:</span>
                          <span className="font-mono font-black text-indigo-600 dark:text-indigo-400">
                            {emp.limits?.maxQuantity === 'unlimited' ? '∞' : emp.limits?.maxQuantity ?? 30}
                          </span>
                        </span>
                        <span className={`px-2 py-0.5 rounded-md border flex items-center gap-1 ${
                          isDarkMode ? 'bg-slate-800/80 border-slate-700' : 'bg-white border-slate-300 shadow-2xs'
                        }`}>
                          <span className="text-slate-600 dark:text-slate-400 font-bold">فرۆشتن:</span>
                          <span className="font-mono font-black text-indigo-600 dark:text-indigo-400">
                            {emp.limits?.maxSales === 'unlimited' ? '∞' : emp.limits?.maxSales ?? 15}
                          </span>
                        </span>
                        <span className={`px-2 py-0.5 rounded-md border flex items-center gap-1 ${
                          isDarkMode ? 'bg-slate-800/80 border-slate-700' : 'bg-white border-slate-300 shadow-2xs'
                        }`}>
                          <span className="text-slate-600 dark:text-slate-400 font-bold">وەسڵ:</span>
                          <span className="font-mono font-black text-indigo-600 dark:text-indigo-400">
                            {emp.limits?.maxInvoices === 'unlimited' ? '∞' : emp.limits?.maxInvoices ?? 40}
                          </span>
                        </span>
                      </div>
                    </div>

                    {/* Row 4: Online Storefront Integration */}
                    <div className="flex items-center justify-between gap-2 flex-wrap pt-2 border-t border-slate-200 dark:border-slate-800">
                      <span className={`flex items-center gap-1.5 ${isDarkMode ? 'text-slate-400' : 'text-slate-800 font-bold'}`}>
                        <Globe className="w-4 h-4 text-emerald-500 shrink-0" />
                        <span>{isKu ? 'ستۆری ئۆنلاین (Storefront):' : 'Online Store:'}</span>
                      </span>
                      <div className="flex items-center gap-2 flex-wrap">
                        {/* Status Badge */}
                        <span
                          className={`text-[11px] px-2.5 py-1 rounded-lg font-bold border flex items-center gap-1.5 ${
                            emp.onlineStore?.enabled && emp.onlineStore?.status === 'active'
                              ? isDarkMode
                                ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                                : 'bg-emerald-100 text-emerald-800 border-emerald-300'
                              : emp.onlineStore?.status === 'suspended'
                              ? isDarkMode
                                ? 'bg-amber-500/15 text-amber-400 border-amber-500/30'
                                : 'bg-amber-100 text-amber-900 border-amber-300'
                              : isDarkMode
                              ? 'bg-slate-800 text-slate-400 border-slate-700'
                              : 'bg-slate-100 text-slate-700 border-slate-300 font-semibold'
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              emp.onlineStore?.enabled && emp.onlineStore?.status === 'active'
                                ? 'bg-emerald-400 animate-pulse'
                                : emp.onlineStore?.status === 'suspended'
                                ? 'bg-amber-400'
                                : 'bg-slate-400'
                            }`}
                          />
                          {emp.onlineStore?.enabled && emp.onlineStore?.status === 'active'
                            ? (emp.onlineStore?.storeName || (isKu ? 'چالاکە' : 'Active'))
                            : emp.onlineStore?.status === 'suspended'
                            ? (isKu ? 'ڕاگیراوە (وەستێنراو)' : 'Suspended')
                            : (isKu ? 'ناچالاکە' : 'Disabled')}
                        </span>

                        {/* Subdomain pill link preview */}
                        {emp.onlineStore?.subdomain && (
                          <a
                            href={`https://froshiar.store/${emp.onlineStore.subdomain}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[11px] font-mono px-2 py-0.5 rounded-md bg-slate-800/80 hover:bg-slate-700 text-cyan-400 border border-slate-700 flex items-center gap-1 transition"
                            title={isKu ? 'سەردانکردنی وێبسایت' : 'Open Storefront'}
                          >
                            <span>/{emp.onlineStore.subdomain}</span>
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        )}

                        {/* Activate button (if not active) */}
                        {emp.onlineStore?.status !== 'active' ? (
                          <button
                            onClick={() => handleActivateOnlineStore(emp)}
                            className={`px-3 py-1 rounded-lg text-[11px] font-bold cursor-pointer border transition flex items-center gap-1.5 ${
                              isDarkMode
                                ? 'bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border-emerald-500/40 shadow-xs'
                                : 'bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-600 shadow-xs'
                            }`}
                          >
                            <Sparkles className="w-3.5 h-3.5" />
                            <span>{isKu ? 'چالاککردنی وێبسایت ⚡' : 'Activate Web ⚡'}</span>
                          </button>
                        ) : (
                          /* Suspend button (if active) */
                          <button
                            onClick={() => handleSuspendOnlineStore(emp)}
                            className={`px-2.5 py-1 rounded-lg text-[11px] font-bold cursor-pointer border transition ${
                              isDarkMode
                                ? 'bg-amber-500/15 hover:bg-amber-500/25 text-amber-400 border-amber-500/30'
                                : 'bg-amber-100 hover:bg-amber-200 text-amber-900 border-amber-300 font-bold'
                            }`}
                          >
                            {isKu ? 'وەستاندنی وێبسایت' : 'Suspend Web'}
                          </button>
                        )}

                        {/* Delete Store & Domain Button */}
                        {emp.onlineStore?.subdomain && (
                          <button
                            onClick={() => handleDeleteOnlineStore(emp)}
                            className={`px-2 py-1 rounded-lg text-[11px] font-bold cursor-pointer border transition flex items-center gap-1 ${
                              isDarkMode
                                ? 'bg-rose-500/15 hover:bg-rose-500/25 text-rose-400 border-rose-500/30'
                                : 'bg-rose-100 hover:bg-rose-200 text-rose-800 border-rose-300 font-bold'
                            }`}
                            title={isKu ? 'سڕینەوەی وێبسایت و ئازادکردنی دۆمەین' : 'Delete Store & Free Domain'}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline">{isKu ? 'سڕینەوە' : 'Delete'}</span>
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Row 5: Password & Copy */}
                    <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
                      <span className={`flex items-center gap-1.5 ${isDarkMode ? 'text-slate-400' : 'text-slate-800 font-bold'}`}>
                        <Key className="w-4 h-4 text-amber-500 shrink-0" />
                        <span>{isKu ? 'شێوازی چوونەژوورەوە:' : 'Login Method:'}</span>
                      </span>
                      <div className="flex items-center gap-2">
                        {emp.accountType === 'registered' || !emp.password ? (
                          <span className="text-xs font-black px-2.5 py-1 rounded-lg bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 flex items-center gap-1.5">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                            <span>{isKu ? 'چوونەژوورەوەی فەرمی (گووگڵ / ئەپڵ / ئیمەیڵ - بێ پاسۆرد)' : 'Official Login (Passwordless)'}</span>
                          </span>
                        ) : (
                          <>
                            {emp.passwordUpdatedAt && (
                              <span className="text-[10px] px-2 py-0.5 rounded-md font-bold bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30">
                                {isKu ? 'نوێکراوەتەوە ⚡' : 'Updated ⚡'}
                              </span>
                            )}
                            <span className={`font-mono text-xs sm:text-sm font-black px-2.5 py-1 rounded-lg border tracking-wider select-all ${
                              isDarkMode ? 'bg-slate-800 text-amber-300 border-amber-500/40' : 'bg-amber-50 text-amber-950 border-amber-300 font-bold shadow-2xs'
                            }`}>
                              {emp.password}
                            </span>
                            <button
                              onClick={() => handleCopyCredentials(emp)}
                              className={`p-1.5 rounded-md transition cursor-pointer border ${
                                isDarkMode
                                  ? 'hover:bg-slate-800 text-slate-400 hover:text-white border-transparent'
                                  : 'hover:bg-slate-200 text-slate-700 border-slate-300 shadow-2xs'
                              }`}
                              title={isKu ? 'کۆپیکردنی زانیاری چوونەژوورەوە' : 'Copy credentials'}
                            >
                              {copiedId === emp.id ? (
                                <Check className="w-3.5 h-3.5 text-emerald-500" />
                              ) : (
                                <Copy className="w-3.5 h-3.5" />
                              )}
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Bottom Row: Permissions Button, Suspend Toggle, Delete */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between pt-3 border-t border-slate-200 dark:border-slate-800 gap-2">
                  <button
                    onClick={() => handleOpenPermissions(emp)}
                    className={`flex-1 py-2.5 px-3 rounded-xl text-xs sm:text-sm font-bold transition flex items-center justify-center gap-2 cursor-pointer shadow-sm ${
                      isDarkMode
                        ? 'bg-purple-600/20 hover:bg-purple-600/30 border border-purple-500/40 text-purple-300'
                        : 'bg-purple-600 hover:bg-purple-700 text-white shadow-purple-500/20'
                    }`}
                  >
                    <Sliders className="w-4 h-4" />
                    <span>{isKu ? 'دەسەڵاتەکان (RBAC)' : 'Permissions'}</span>
                  </button>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleToggleStatus(emp)}
                      className={`flex-1 sm:flex-none px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition cursor-pointer border ${
                        emp.status === 'active'
                          ? isDarkMode
                            ? 'bg-rose-500/15 text-rose-400 hover:bg-rose-500/25 border-rose-500/30'
                            : 'bg-rose-50 text-rose-700 hover:bg-rose-100 border-rose-300 font-bold'
                          : isDarkMode
                          ? 'bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/25 border-emerald-500/30'
                          : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border-emerald-300 font-bold'
                      }`}
                    >
                      {emp.status === 'active' ? (isKu ? 'ڕاگرتنی ئەکاونت' : 'Suspend') : (isKu ? 'چالاککردن' : 'Activate')}
                    </button>

                    <button
                      onClick={() => handleDeleteEmployee(emp)}
                      className={`p-2.5 rounded-xl transition cursor-pointer border ${
                        isDarkMode
                          ? 'hover:bg-rose-500/15 text-slate-400 hover:text-rose-400 border-transparent hover:border-rose-500/30'
                          : 'hover:bg-rose-50 text-slate-500 hover:text-rose-700 border-slate-200 hover:border-rose-300'
                      }`}
                      title={isKu ? 'سڕینەوەی ئەکاونت' : 'Delete'}
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
        </>
      )}

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* ── MODAL: QUICK PRICE UPDATE (دەستکاری خێرای نرخی بەشداریکردن) ──   */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      {quickPriceEmployee && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-sm animate-in fade-in duration-150">
          <div
            className={`w-full max-w-md rounded-3xl border shadow-2xl p-6 space-y-4 ${
              isDarkMode ? 'bg-[#0F172A] border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-900'
            }`}
          >
            <div className="flex items-center justify-between border-b pb-3 border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-500 flex items-center justify-center font-bold">
                  <DollarSign className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black">
                    {isKu ? 'دەستکاری نرخی بەشداریکردن' : 'Edit Subscription Price'}
                  </h3>
                  <p className="text-xs text-slate-400">
                    {quickPriceEmployee.displayName} ({quickPriceEmployee.email})
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setQuickPriceEmployee(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveQuickPrice} className="space-y-4">
              <div>
                <label className="block text-xs font-bold mb-1.5 text-slate-300">
                  {isKu ? 'بڕی پارەی دیاریکراو (دینار یان دۆلار)' : 'Fee Amount (USD or IQD)'}
                </label>
                <input
                  type="text"
                  placeholder={isKu ? 'نموونە: 25,000 IQD یان $25' : 'e.g. $50'}
                  value={quickPriceValue}
                  onChange={(e) => setQuickPriceValue(e.target.value)}
                  autoFocus
                  className="w-full px-4 py-2.5 rounded-xl text-sm font-mono font-bold bg-[#10182B] border border-slate-700 text-slate-100 outline-none focus:border-amber-500"
                />

                {/* Preset Chips */}
                <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                  {['$25', '$50', '$100', '25,000 IQD', '50,000 IQD', '100,000 IQD', 'بێ بەرامبەر (Free)'].map((chip) => (
                    <button
                      key={chip}
                      type="button"
                      onClick={() => setQuickPriceValue(chip)}
                      className={`text-[11px] px-2.5 py-1 rounded-lg font-mono font-bold border transition cursor-pointer ${
                        quickPriceValue === chip
                          ? 'bg-amber-500 text-slate-950 border-amber-400'
                          : 'bg-slate-800 text-slate-300 border-slate-700 hover:border-amber-500/50'
                      }`}
                    >
                      {chip}
                    </button>
                  ))}
                </div>
              </div>

              <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setQuickPriceEmployee(null)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-400 hover:text-white transition cursor-pointer"
                >
                  {isKu ? 'داخستن' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  disabled={savingQuickPrice}
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 font-black shadow-md transition cursor-pointer disabled:opacity-50"
                >
                  {savingQuickPrice ? (isKu ? 'پاشەکەوت دەکرێت...' : 'Saving...') : (isKu ? 'خەزنکردن' : 'Save')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* ── MODAL: OFFICIAL RECEIPT PREVIEW (بینینی وەسڵی فەرمی) ──          */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      {viewingReceiptEmployee && viewingReceiptEmployee.upgradeReceipt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-sm animate-in fade-in duration-150">
          <div
            className={`w-full max-w-md rounded-3xl border border-[#D4AF37]/50 shadow-2xl p-6 space-y-4 ${
              isDarkMode ? 'bg-[#0F172A] text-slate-100 shadow-[#D4AF37]/10' : 'bg-white text-slate-900 shadow-2xl'
            }`}
          >
            <div className="flex items-center justify-between border-b pb-3 border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-[#D4AF37]/20 border border-[#D4AF37]/40 text-[#D4AF37] flex items-center justify-center font-bold">
                  <Receipt className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-white">
                    {isKu ? 'وەسڵی فەرمیی بەشداریکردن' : 'Official Subscription Receipt'}
                  </h3>
                  <span className="font-mono text-xs text-[#D4AF37] font-bold">
                    #{viewingReceiptEmployee.upgradeReceipt.receiptId}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setViewingReceiptEmployee(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Receipt Table */}
            <div className="rounded-2xl border border-slate-800 bg-[#141C2E] p-4 space-y-2.5 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-400">{isKu ? 'ناوی کڕیار / مارکێت:' : 'Customer Name:'}</span>
                <span className="font-bold text-white">{viewingReceiptEmployee.displayName}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">{isKu ? 'ئیمەیڵی فەرمی:' : 'Email:'}</span>
                <span className="font-mono text-slate-300">{viewingReceiptEmployee.email}</span>
              </div>
              {viewingReceiptEmployee.phone && (
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">{isKu ? 'ژمارەی مۆبایل:' : 'Phone:'}</span>
                  <span className="font-mono text-slate-300">{viewingReceiptEmployee.phone}</span>
                </div>
              )}
              <div className="flex items-center justify-between pt-2 border-t border-slate-800">
                <span className="text-slate-400">{isKu ? 'بڕی پارەی پاکێج:' : 'Package Price:'}</span>
                <span className="font-mono font-black text-sm text-[#D4AF37] bg-[#D4AF37]/15 px-2.5 py-0.5 rounded-lg border border-[#D4AF37]/30">
                  {viewingReceiptEmployee.priceAmount || viewingReceiptEmployee.upgradeReceipt.priceAmount || (isKu ? 'دیارینەکراو' : '—')}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">{isKu ? 'ماوەی پاکێج:' : 'Duration:'}</span>
                <span className="font-bold text-slate-200">
                  {viewingReceiptEmployee.upgradeReceipt.planDuration || (isKu ? 'بێ سنوور (هەمیشەیی)' : 'Unlimited')}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">{isKu ? 'کاتی بەشداریکردن:' : 'Start Date:'}</span>
                <span className="font-mono text-slate-300">{formatDate(viewingReceiptEmployee.startedAt || viewingReceiptEmployee.createdAt)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">{isKu ? 'کاتی کۆتاییهاتن:' : 'Expires At:'}</span>
                <span className="font-mono font-bold text-emerald-400">
                  {viewingReceiptEmployee.expiresAt ? formatDate(viewingReceiptEmployee.expiresAt) : (isKu ? 'بێ سنوور (هەمیشەیی)' : 'Lifetime')}
                </span>
              </div>
            </div>

            <div className="pt-2 flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => handleSendWhatsApp(viewingReceiptEmployee)}
                className="flex-1 py-2.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white flex items-center justify-center gap-1.5 transition cursor-pointer"
              >
                <MessageCircle className="w-4 h-4" />
                <span>{isKu ? 'ناردن بە واتسئەپ' : 'Send via WhatsApp'}</span>
              </button>
              <button
                type="button"
                onClick={() => setViewingReceiptEmployee(null)}
                className="px-4 py-2.5 rounded-xl text-xs font-bold border border-slate-700 text-slate-300 hover:text-white cursor-pointer"
              >
                {isKu ? 'داخستن' : 'Close'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* ── MODAL: ONLINE STORE ACTIVATION RECEIPT (وەسڵی فەرمیی چالاککردنی وێبسایت) ── */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      {storeActivationData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-sm animate-in fade-in duration-150">
          <div
            className={`w-full max-w-md rounded-3xl border border-[#D4AF37]/50 shadow-2xl p-6 space-y-4 ${
              isDarkMode ? 'bg-[#0F172A] text-slate-100 shadow-[#D4AF37]/15' : 'bg-white text-slate-900 shadow-2xl'
            }`}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b pb-3 border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-[#D4AF37]/20 border border-[#D4AF37]/40 text-[#D4AF37] flex items-center justify-center font-bold">
                  <Globe className="w-5 h-5 text-[#D4AF37]" />
                </div>
                <div>
                  <h3 className="text-base font-black text-white">
                    {storeActivationI18n[activationModalLang].title}
                  </h3>
                  <span className="font-mono text-xs text-emerald-400 font-bold flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    {storeActivationI18n[activationModalLang].badge}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setStoreActivationData(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Trilingual Language Switcher (Kurdish / Arabic / English) */}
            <div className="flex items-center justify-center gap-1.5 p-1 rounded-xl bg-[#141C2E] border border-slate-800 text-xs font-bold">
              <button
                type="button"
                onClick={() => setActivationModalLang('ku')}
                className={`flex-1 py-1 px-2.5 rounded-lg transition cursor-pointer ${
                  activationModalLang === 'ku'
                    ? 'bg-[#D4AF37] text-slate-950 shadow-xs'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                کوردی
              </button>
              <button
                type="button"
                onClick={() => setActivationModalLang('ar')}
                className={`flex-1 py-1 px-2.5 rounded-lg transition cursor-pointer ${
                  activationModalLang === 'ar'
                    ? 'bg-[#D4AF37] text-slate-950 shadow-xs'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                العربية
              </button>
              <button
                type="button"
                onClick={() => setActivationModalLang('en')}
                className={`flex-1 py-1 px-2.5 rounded-lg transition cursor-pointer ${
                  activationModalLang === 'en'
                    ? 'bg-[#D4AF37] text-slate-950 shadow-xs'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                English
              </button>
            </div>

            {/* 25-Second Countdown Bar */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-[11px] text-[#D4AF37] font-bold">
                <span className="flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 animate-spin" />
                  {storeActivationI18n[activationModalLang].countdown(activationCountdown)}
                </span>
                <span className="font-mono bg-[#D4AF37]/15 border border-[#D4AF37]/30 px-2 py-0.5 rounded-md text-[10px]">
                  {activationCountdown}s / 25s
                </span>
              </div>
              <div className="w-full h-1.5 rounded-full bg-slate-800 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-[#D4AF37] via-amber-400 to-emerald-400 transition-all duration-1000 ease-linear rounded-full"
                  style={{ width: `${(activationCountdown / 25) * 100}%` }}
                />
              </div>
            </div>

            {/* Receipt Table */}
            <div className="rounded-2xl border border-slate-800 bg-[#141C2E] p-4 space-y-2.5 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-400">{storeActivationI18n[activationModalLang].customerName}</span>
                <span className="font-bold text-white">{storeActivationData.employee.displayName || storeActivationData.storeName}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">{storeActivationI18n[activationModalLang].storeName}</span>
                <span className="font-bold text-[#D4AF37]">{storeActivationData.storeName}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">{storeActivationI18n[activationModalLang].email}</span>
                <span className="font-mono text-slate-300">{storeActivationData.email}</span>
              </div>
              {storeActivationData.phone && (
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">{storeActivationI18n[activationModalLang].phone}</span>
                  <span className="font-mono text-slate-300" dir="ltr">{storeActivationData.phone}</span>
                </div>
              )}
              <div className="flex items-center justify-between pt-2 border-t border-slate-800">
                <span className="text-slate-400">{storeActivationI18n[activationModalLang].subdomain}</span>
                <span className="font-mono font-bold text-amber-300 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                  {storeActivationData.subdomain}
                </span>
              </div>
              <div className="flex flex-col gap-1.5 pt-1">
                <span className="text-slate-400">{storeActivationI18n[activationModalLang].storeUrl}</span>
                <div className="flex items-center justify-between gap-2 p-2 rounded-xl bg-slate-900/90 border border-slate-800">
                  <span className="font-mono text-[11px] text-amber-300 truncate select-all" dir="ltr">
                    {storeActivationData.url}
                  </span>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(storeActivationData.url);
                        setCopiedStoreUrl(true);
                        setTimeout(() => setCopiedStoreUrl(false), 2000);
                      }}
                      className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition cursor-pointer"
                      title={storeActivationI18n[activationModalLang].copyBtn}
                    >
                      {copiedStoreUrl ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                    <a
                      href={storeActivationData.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1.5 rounded-lg bg-emerald-600/30 hover:bg-emerald-600/50 text-emerald-400 hover:text-emerald-300 transition cursor-pointer"
                      title={storeActivationI18n[activationModalLang].openBtn}
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-between pt-2 border-t border-slate-800">
                <span className="text-slate-400">{storeActivationI18n[activationModalLang].status}</span>
                <span className="font-bold text-emerald-400 bg-emerald-500/15 border border-emerald-500/30 px-2.5 py-0.5 rounded-lg flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400" />
                  {storeActivationI18n[activationModalLang].statusValue}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">{storeActivationI18n[activationModalLang].activatedAt}</span>
                <span className="font-mono text-slate-300">{formatDate(storeActivationData.activatedAt)}</span>
              </div>
            </div>

            {/* Bottom Actions: WhatsApp Send & Close */}
            <div className="pt-2 flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => {
                  const cleanPhone = (storeActivationData.phone || '').replace(/[^0-9]/g, '');
                  const msg = storeActivationI18n[activationModalLang].waMsg(storeActivationData);
                  if (cleanPhone) {
                    window.open(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(msg)}`, '_blank');
                  } else {
                    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank');
                  }
                }}
                className="flex-1 py-2.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white flex items-center justify-center gap-1.5 transition cursor-pointer shadow-lg shadow-emerald-950/40"
              >
                <MessageCircle className="w-4 h-4" />
                <span>{storeActivationI18n[activationModalLang].sendWhatsapp}</span>
              </button>
              <button
                type="button"
                onClick={() => setStoreActivationData(null)}
                className="px-4 py-2.5 rounded-xl text-xs font-bold border border-slate-700 text-slate-300 hover:text-white cursor-pointer hover:bg-slate-800 transition"
              >
                {storeActivationI18n[activationModalLang].close}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* ── MODAL 1: ADD NEW ACCOUNT ──                                      */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 md:p-6 bg-slate-950/85 backdrop-blur-sm animate-in fade-in duration-200">
          <div
            className={`w-full max-w-4xl lg:max-w-5xl rounded-3xl border shadow-2xl p-5 sm:p-8 md:p-10 space-y-6 max-h-[94vh] overflow-y-auto ${
              isDarkMode
                ? 'bg-[#0F172A] border-slate-800 text-slate-100 shadow-black/60'
                : 'bg-white border-slate-200 text-slate-900 shadow-2xl'
            }`}
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b pb-4 border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-white shadow-md shrink-0 ${
                  addModalMode === 'upgrade_registered'
                    ? 'bg-gradient-to-tr from-amber-500 via-orange-500 to-amber-600 text-slate-950 shadow-amber-500/20'
                    : 'bg-gradient-to-tr from-purple-600 to-indigo-600 text-white shadow-purple-500/20'
                }`}>
                  {addModalMode === 'upgrade_registered' ? (
                    <Sparkles className="w-6 h-6 text-slate-950 fill-slate-950" />
                  ) : (
                    <UserPlus className="w-6 h-6 text-white" />
                  )}
                </div>
                <div>
                  <h3 className={`text-lg sm:text-xl font-black ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                    {addModalMode === 'upgrade_registered'
                      ? (isKu ? 'بەرزکردنەوە و کاراکردنی پلانی بەکارهێنەری تۆمارکراو' : 'Upgrade & Activate Registered User Plan')
                      : (isKu ? 'دروستکردنی ئەکاونتی نوێ بە تێپەڕەوشە (پاسۆرد)' : 'Create New Account with Password')}
                  </h3>
                  <p className={`text-xs sm:text-sm font-medium ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                    {addModalMode === 'upgrade_registered'
                      ? (isKu ? 'تایبەت بە بەکارهێنەرانی چوونەژوورەوەی فەرمی (گووگڵ / ئەپڵ / ئیمەیڵ) بێ پێویستی بە پاسۆرد' : 'For users logged in via official providers (Google/Apple/Email) - passwordless')
                      : (isKu ? 'تۆمارکردنی ناوی کارمەند، ئیمەیڵ، تێپەڕەوشە، ئیمەیڵی بەڕێوەبەر، ماوە و سنوورەکان' : 'Name, phone, employee login, password, supervising manager, dates & limits')}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className={`p-2 rounded-xl transition cursor-pointer ${
                  isDarkMode ? 'text-slate-400 hover:text-white hover:bg-slate-800' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Mode Switcher Tabs */}
            <div className="flex items-center gap-2 p-1.5 rounded-2xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700">
              <button
                type="button"
                onClick={() => {
                  setAddModalMode('upgrade_registered');
                  setFormDuration('unlimited');
                  setFormExpiresAt('');
                  setFormLimits({
                    maxItems: 'unlimited',
                    maxQuantity: 'unlimited',
                    maxSales: 'unlimited',
                    maxInvoices: 'unlimited',
                    maxQuotations: 'unlimited',
                  });
                  setUnlimitedItems(true);
                  setUnlimitedQuantity(true);
                  setUnlimitedSales(true);
                  setUnlimitedInvoices(true);
                  setUnlimitedQuotations(true);
                  setStoreEnabled(true);
                }}
                className={`flex-1 py-2.5 px-3 rounded-xl text-xs sm:text-sm font-black transition-all flex items-center justify-center gap-2 cursor-pointer ${
                  addModalMode === 'upgrade_registered'
                    ? 'bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 text-slate-950 shadow-md shadow-amber-500/25 border border-amber-400/50'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <Sparkles className="w-4 h-4 shrink-0" />
                <span>{isKu ? '١. بەرزکردنەوەی ئەکاونتی تۆمارکراو (گووگڵ / ئەپڵ)' : '1. Upgrade Registered User (Google/Apple)'}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setAddModalMode('create_custom');
                  if (!formPassword) setFormPassword(generateRandomPassword());
                  setFormLimits(DEFAULT_LIMITS);
                  setUnlimitedItems(false);
                  setUnlimitedQuantity(false);
                  setUnlimitedSales(false);
                  setUnlimitedInvoices(false);
                  setUnlimitedQuotations(false);
                }}
                className={`flex-1 py-2.5 px-3 rounded-xl text-xs sm:text-sm font-black transition-all flex items-center justify-center gap-2 cursor-pointer ${
                  addModalMode === 'create_custom'
                    ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-md shadow-purple-500/25 border border-purple-400/30'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <KeyRound className="w-4 h-4 shrink-0" />
                <span>{isKu ? '٢. دروستکردنی ئەکاونتی نوێ بە پاسۆرد (کارمەند)' : '2. Create Custom Account (Password)'}</span>
              </button>
            </div>

            {formError && (
              <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-500 dark:text-rose-400 text-xs sm:text-sm flex items-center gap-2 font-bold">
                <AlertCircle className="w-5 h-5 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleSaveAdd} className="space-y-6">
              {/* Section 1: User Selection or Credentials */}
              {addModalMode === 'upgrade_registered' ? (
                /* ── UPGRADE REGISTERED USER FLOW ── */
                <div className="space-y-4">
                  <div className={`p-4 sm:p-5 rounded-2xl border space-y-3.5 ${
                    isDarkMode ? 'bg-[#0E1524] border-amber-500/30' : 'bg-amber-50/70 border-amber-200'
                  }`}>
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold">
                          <Sparkles className="w-4 h-4" />
                        </div>
                        <span className="text-xs sm:text-sm font-black text-amber-700 dark:text-amber-400">
                          {isKu ? 'هەڵبژاردنی بەکارهێنەری تۆمارکراو لەناو سیستەمدا:' : 'Select Registered App User:'}
                        </span>
                      </div>
                      <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
                        {registeredUsers.length} {isKu ? 'بەکارهێنەر لە سیستەمدا هەن' : 'registered users found'}
                      </span>
                    </div>

                    {/* Search box for registered users */}
                    <div className="relative">
                      <input
                        type="text"
                        placeholder={isKu ? 'گەڕان بەپێی ناو، ئیمەیڵ، ژمارە تەلەفۆن، یان ناوی مارکێت...' : 'Search by name, email, phone, business...'}
                        value={userSearchTerm}
                        onChange={(e) => setUserSearchTerm(e.target.value)}
                        className={`w-full px-4 py-2.5 pr-10 rounded-xl text-xs sm:text-sm border outline-none font-medium transition ${
                          isDarkMode ? 'bg-[#10182B] border-slate-700 text-white placeholder-slate-500 focus:border-amber-500' : 'bg-white border-slate-300 text-slate-900 placeholder-slate-400 focus:border-amber-500 shadow-2xs'
                        }`}
                      />
                      <Search className="w-4 h-4 absolute right-3 top-3 text-slate-400" />
                    </div>

                    {/* Quick Registered Users List Scrollable */}
                    <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1">
                      {regUsersLoading ? (
                        <div className="text-center py-4 text-xs font-bold text-slate-400 flex items-center justify-center gap-2">
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          <span>{isKu ? 'بارکردنی بەکارهێنەران...' : 'Loading users...'}</span>
                        </div>
                      ) : filteredRegisteredUsers.length === 0 ? (
                        <div className="text-center py-4 text-xs font-bold text-slate-400">
                          {isKu ? 'هیچ بەکارهێنەرێک نەدۆزرایەوە بەم ناوە' : 'No matching users found'}
                        </div>
                      ) : (
                        filteredRegisteredUsers.map((u) => {
                          const uEmail = (u.email || u.user_id || '').trim().toLowerCase();
                          const isSelected = selectedRegisteredUserEmail === uEmail && uEmail !== '';
                          const providerName = u.provider || (u.email?.includes('gmail') ? 'google.com' : u.email?.includes('privaterelay') ? 'apple.com' : 'email');
                          const isGoogle = providerName.includes('google');
                          const isApple = providerName.includes('apple');

                          return (
                            <div
                              key={u.id || u.user_id || u.email}
                              onClick={() => handleSelectRegisteredUser(u)}
                              className={`p-2.5 sm:p-3 rounded-xl border flex items-center justify-between gap-3 cursor-pointer transition-all ${
                                isSelected
                                  ? 'bg-amber-500/20 border-amber-500 shadow-sm'
                                  : isDarkMode
                                  ? 'bg-[#10182B] border-slate-800 hover:border-amber-500/60 hover:bg-slate-800/60'
                                  : 'bg-white border-slate-200 hover:border-amber-400 hover:bg-amber-50/50 shadow-2xs'
                              }`}
                            >
                              <div className="flex items-center gap-2.5 min-w-0">
                                <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-black text-xs shrink-0 ${
                                  isGoogle
                                    ? 'bg-red-500/15 text-red-600 dark:text-red-400 border border-red-500/30'
                                    : isApple
                                    ? 'bg-slate-500/15 text-slate-700 dark:text-slate-300 border border-slate-500/30'
                                    : 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30'
                                }`}>
                                  {u.display_name ? u.display_name.charAt(0).toUpperCase() : 'U'}
                                </div>
                                <div className="min-w-0">
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <span className={`text-xs font-black truncate ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                                      {u.display_name || u.business_name || (u.email ? u.email.split('@')[0] : 'User')}
                                    </span>
                                    {/* Provider badge */}
                                    <span className={`text-[10px] px-1.5 py-0.2 rounded font-bold uppercase ${
                                      isGoogle ? 'bg-red-500/15 text-red-600' : isApple ? 'bg-slate-500/15 text-slate-700 dark:text-slate-300' : 'bg-blue-500/15 text-blue-600'
                                    }`}>
                                      {isGoogle ? 'Google' : isApple ? 'Apple' : 'Email'}
                                    </span>
                                  </div>
                                  <div className="text-[11px] font-mono text-slate-500 truncate">
                                    {u.email || u.user_id} {u.phone ? `• ${u.phone}` : ''}
                                  </div>
                                </div>
                              </div>

                              <div className="shrink-0 flex items-center gap-2">
                                {isSelected ? (
                                  <span className="px-2 py-1 rounded-lg bg-amber-500 text-slate-950 font-black text-[11px] flex items-center gap-1">
                                    <Check className="w-3 h-3" />
                                    <span>{isKu ? 'دیاریکراو' : 'Selected'}</span>
                                  </span>
                                ) : (
                                  <span className={`text-xs font-bold px-2.5 py-1 rounded-lg border transition ${
                                    isDarkMode ? 'border-slate-700 text-slate-300 hover:text-white' : 'border-slate-300 text-slate-700 hover:text-slate-900 bg-slate-50'
                                  }`}>
                                    {isKu ? 'هەڵبژاردن' : 'Select'}
                                  </span>
                                )}
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>

                    {/* Explanatory callout */}
                    <div className={`p-3 rounded-xl border text-xs leading-relaxed space-y-1 ${
                      isDarkMode ? 'bg-amber-950/20 border-amber-500/30 text-amber-300/90' : 'bg-amber-50 border-amber-300 text-amber-950'
                    }`}>
                      <div className="flex items-center gap-1.5 font-bold text-amber-700 dark:text-amber-400">
                        <Sparkles className="w-3.5 h-3.5 shrink-0" />
                        <span>{isKu ? 'چۆنیەتی کارکردن و بەستنەوە:' : 'How this account works:'}</span>
                      </div>
                      <p>
                        {isKu
                          ? 'ئەم بەکارهێنەرە بە فەرمی بە (Google / Apple / Email) دەچێتەژوورەوە و هیچ پێویستی بە پاسۆرد نییە. کاتێك پلانەکەی بۆ بەرز دەکەیتەوە، یەکسەر هەموو سنوورەکان و ستۆری ئۆنلاین بۆی دەکرێتەوە و ڕاستەوخۆ دەتوانێت گووگڵ درایڤ ببەستێتەوە بۆ باکئەپی سەرەکی.'
                          : 'User logs in via official provider without a password. Upgrading unlocks their limits & online store and enables instant Google Drive sync.'}
                      </p>
                    </div>
                  </div>

                  {/* Upgraded User Fields */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5 sm:gap-4">
                    {/* User Email */}
                    <div className="md:col-span-2">
                      <label className={`block text-xs font-bold mb-1.5 ${isDarkMode ? 'text-slate-300' : 'text-slate-800'}`}>
                        {isKu ? 'ئیمەیڵی فەرمی بەکارهێنەر (بۆ بەرزکردنەوە) *' : 'Registered User Email *'}
                      </label>
                      <input
                        type="email"
                        required
                        placeholder="user@gmail.com"
                        value={formEmail}
                        onChange={(e) => {
                          const val = e.target.value;
                          setFormEmail(val);
                          if (!formManagerEmail) setFormManagerEmail(val);
                        }}
                        className={`w-full px-4 py-2.5 rounded-xl text-xs sm:text-sm border outline-none transition font-mono ${
                          isDarkMode
                            ? 'bg-[#0E1524] border-amber-500/50 text-slate-100 placeholder-slate-500 focus:border-amber-500'
                            : 'bg-white border-amber-300 text-slate-900 placeholder-slate-400 focus:border-amber-600 focus:bg-white focus:ring-2 focus:ring-amber-100 shadow-2xs'
                        }`}
                      />
                    </div>

                    {/* Display Name */}
                    <div>
                      <label className={`block text-xs font-bold mb-1.5 ${isDarkMode ? 'text-slate-300' : 'text-slate-800'}`}>
                        {isKu ? 'ناوی بەکارهێنەر / مارکێت' : 'Display / Store Name'}
                      </label>
                      <input
                        type="text"
                        placeholder={isKu ? 'نموونە: ئارام محەمەد' : 'e.g. John Doe'}
                        value={formName}
                        onChange={(e) => setFormName(e.target.value)}
                        className={`w-full px-4 py-2.5 rounded-xl text-xs sm:text-sm border outline-none transition font-medium ${
                          isDarkMode
                            ? 'bg-[#0E1524] border-slate-700 text-slate-100 placeholder-slate-500 focus:border-amber-500'
                            : 'bg-slate-50 border-slate-300 text-slate-900 placeholder-slate-400 focus:border-amber-600 focus:bg-white focus:ring-2 focus:ring-amber-100 shadow-2xs'
                        }`}
                      />
                    </div>

                    {/* Phone */}
                    <div>
                      <label className={`block text-xs font-bold mb-1.5 ${isDarkMode ? 'text-slate-300' : 'text-slate-800'}`}>
                        {isKu ? 'ژمارەی مۆبایل (بۆ وەتسئەپ)' : 'Phone (WhatsApp)'}
                      </label>
                      <input
                        type="text"
                        placeholder="0750XXXXXXX"
                        value={formPhone}
                        onChange={(e) => setFormPhone(e.target.value)}
                        className={`w-full px-4 py-2.5 rounded-xl text-xs sm:text-sm border outline-none transition font-mono ${
                          isDarkMode
                            ? 'bg-[#0E1524] border-slate-700 text-slate-100 placeholder-slate-500 focus:border-amber-500'
                            : 'bg-slate-50 border-slate-300 text-slate-900 placeholder-slate-400 focus:border-amber-600 focus:bg-white focus:ring-2 focus:ring-amber-100 shadow-2xs'
                        }`}
                      />
                    </div>

                    {/* Individual Account Status Notice (No Manager/Employee Hierarchy) */}
                    <div className="md:col-span-2 p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-300 text-xs font-bold flex items-center gap-2.5">
                      <Sparkles className="w-4 h-4 shrink-0 text-amber-500" />
                      <span>
                        {isKu
                          ? 'ئەم بەرزکردنەوەیە بۆ ئەکاونتی تاکەکەسییە (خاوەن مارکێت)؛ نابێتە کارمەند و سەربەخۆیانە هەموو بەش و دەسەڵاتەکانی پێدەدرێت.'
                          : 'This is an individual store owner upgrade; no staff/manager hierarchy is assigned and full access is granted independently.'}
                      </span>
                    </div>
                  </div>
                </div>
              ) : (
                /* ── CREATE CUSTOM ACCOUNT FLOW (WITH PASSWORD) ── */
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-sm font-bold text-purple-600 dark:text-purple-400">
                    <KeyRound className="w-4 h-4" />
                    <span>{isKu ? 'زانیارییە سەرەکییەکان و هەژماری چوونەژوورەوە:' : 'Basic Credentials & Login:'}</span>
                  </div>

                  {/* Account Role Selector: Store Manager (PRO) vs Employee */}
                  <div className="flex items-center gap-2 p-1.5 rounded-xl bg-slate-200/60 dark:bg-slate-800/60 border border-slate-300 dark:border-slate-700">
                    <button
                      type="button"
                      onClick={() => {
                        setCustomAccountRole('manager');
                        setFormDuration('unlimited');
                        setUnlimitedItems(true);
                        setUnlimitedQuantity(true);
                        setUnlimitedSales(true);
                        setUnlimitedInvoices(true);
                        setUnlimitedQuotations(true);
                        setFormPrice('PRO / هەمیشەیی');
                      }}
                      className={`flex-1 py-2 px-3 rounded-lg text-xs font-black transition-all flex items-center justify-center gap-2 cursor-pointer ${
                        customAccountRole === 'manager'
                          ? 'bg-amber-500 text-slate-950 shadow-sm font-black'
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                      }`}
                    >
                      <span>{isKu ? '👑 خاوەن فرۆشگا / کۆمپیوتەر (PRO هەمیشەیی)' : '👑 Store Owner / Desktop (PRO Lifetime)'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setCustomAccountRole('employee');
                        setFormDuration(30);
                        setUnlimitedItems(false);
                        setUnlimitedQuantity(false);
                        setUnlimitedSales(false);
                        setUnlimitedInvoices(false);
                        setUnlimitedQuotations(false);
                        setFormPrice('');
                      }}
                      className={`flex-1 py-2 px-3 rounded-lg text-xs font-black transition-all flex items-center justify-center gap-2 cursor-pointer ${
                        customAccountRole === 'employee'
                          ? 'bg-purple-600 text-white shadow-sm font-black'
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                      }`}
                    >
                      <span>{isKu ? '👤 کارمەندی فرۆشگا (لەژێر چاودێری بەڕێوەبەردا)' : '👤 Staff Employee (Supervised)'}</span>
                    </button>
                  </div>

                  {customAccountRole === 'manager' && (
                    <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-300 text-xs font-bold flex items-center gap-2.5">
                      <Sparkles className="w-4 h-4 shrink-0 text-amber-500" />
                      <span>
                        {isKu
                          ? '⭐ ئەم هەژمارە وەک خاوەن فرۆشگا (PRO بێ سنوور) لەسەر کۆمپیوتەر و مۆبایل کاردەکات بە بەستنەوەی گووگڵ درایڤ و کۆنترۆڵی کارمەندان.'
                          : '⭐ This account activates as Store Owner (PRO Lifetime) on Desktop and Mobile with Google Drive and Staff Control.'}
                      </span>
                    </div>
                  )}

                  {/* Target Platform / Operating System Selector */}
                  <div className={`p-3.5 rounded-2xl border space-y-2.5 ${
                    isDarkMode ? 'bg-[#0E1524] border-slate-800' : 'bg-slate-50 border-slate-200'
                  }`}>
                    <div className="flex items-center justify-between">
                      <label className={`block text-xs font-bold ${isDarkMode ? 'text-slate-300' : 'text-slate-800'}`}>
                        {isKu ? '💻 سیستەمی کۆمپیوتەر / کارپێکردن:' : '💻 Target Operating System:'}
                      </label>
                      <span className="text-[11px] font-medium text-slate-400">
                        {isKu ? 'دیاریبکە بۆ چ ئامێرێک کاربکات' : 'Specify intended OS'}
                      </span>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <button
                        type="button"
                        onClick={() => setFormPlatform('all')}
                        className={`py-2 px-3 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer border ${
                          formPlatform === 'all'
                            ? 'bg-emerald-500 text-white border-emerald-400 shadow-md shadow-emerald-500/20'
                            : isDarkMode
                            ? 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white'
                            : 'bg-white border-slate-300 text-slate-700 hover:text-slate-900 shadow-2xs'
                        }`}
                      >
                        <Globe className="w-3.5 h-3.5 shrink-0" />
                        <span>{isKu ? 'گشتی (گشت سیستمەکان)' : 'All Systems'}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setFormPlatform('macos')}
                        className={`py-2 px-3 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer border ${
                          formPlatform === 'macos'
                            ? 'bg-purple-600 text-white border-purple-400 shadow-md shadow-purple-500/20'
                            : isDarkMode
                            ? 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white'
                            : 'bg-white border-slate-300 text-slate-700 hover:text-slate-900 shadow-2xs'
                        }`}
                      >
                        <Laptop className="w-3.5 h-3.5 shrink-0" />
                        <span>{isKu ? ' ماکبووک (macOS)' : ' macOS (Mac)'}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setFormPlatform('windows')}
                        className={`py-2 px-3 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer border ${
                          formPlatform === 'windows'
                            ? 'bg-blue-600 text-white border-blue-400 shadow-md shadow-blue-500/20'
                            : isDarkMode
                            ? 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white'
                            : 'bg-white border-slate-300 text-slate-700 hover:text-slate-900 shadow-2xs'
                        }`}
                      >
                        <Laptop className="w-3.5 h-3.5 shrink-0" />
                        <span>{isKu ? '⊞ ویندۆز (Windows)' : '⊞ Windows PC'}</span>
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5 sm:gap-4">
                    {/* Name */}
                    <div>
                      <label className={`block text-xs font-bold mb-1.5 ${isDarkMode ? 'text-slate-300' : 'text-slate-800'}`}>
                        {customAccountRole === 'manager' ? (isKu ? 'ناوی فرۆشگا / خاوەن کار *' : 'Store / Owner Name *') : (isKu ? 'ناوی کارمەند / لق *' : 'Display Name / Store *')}
                      </label>
                      <input
                        type="text"
                        required
                        placeholder={isKu ? 'نموونە: مارکێتی سەردەم' : 'e.g. John Doe'}
                        value={formName}
                        onChange={(e) => setFormName(e.target.value)}
                        className={`w-full px-4 py-2.5 rounded-xl text-xs sm:text-sm border outline-none transition font-medium ${
                          isDarkMode
                            ? 'bg-[#0E1524] border-slate-700 text-slate-100 placeholder-slate-500 focus:border-purple-500'
                            : 'bg-slate-50 border-slate-300 text-slate-900 placeholder-slate-400 focus:border-purple-600 focus:bg-white focus:ring-2 focus:ring-purple-100 shadow-2xs'
                        }`}
                      />
                    </div>

                    {/* Phone */}
                    <div>
                      <label className={`block text-xs font-bold mb-1.5 ${isDarkMode ? 'text-slate-300' : 'text-slate-800'}`}>
                        {isKu ? 'ژمارەی مۆبایل (بۆ وەتسئەپ)' : 'Phone (WhatsApp)'}
                      </label>
                      <input
                        type="text"
                        placeholder="0750XXXXXXX"
                        value={formPhone}
                        onChange={(e) => setFormPhone(e.target.value)}
                        className={`w-full px-4 py-2.5 rounded-xl text-xs sm:text-sm border outline-none transition font-mono ${
                          isDarkMode
                            ? 'bg-[#0E1524] border-slate-700 text-slate-100 placeholder-slate-500 focus:border-purple-500'
                            : 'bg-slate-50 border-slate-300 text-slate-900 placeholder-slate-400 focus:border-purple-600 focus:bg-white focus:ring-2 focus:ring-purple-100 shadow-2xs'
                        }`}
                      />
                    </div>

                    {/* Email */}
                    <div>
                      <label className={`block text-xs font-bold mb-1.5 ${isDarkMode ? 'text-slate-300' : 'text-slate-800'}`}>
                        {customAccountRole === 'manager' ? (isKu ? 'ئیمەیڵ / ناوی بەکارهێنەری فرۆشگا *' : 'Store Owner Email *') : (isKu ? 'ئیمەیڵی کارمەند (بۆ چوونەژوورەوە) *' : 'Employee Login Email *')}
                      </label>
                      <input
                        type="email"
                        required
                        placeholder="owner@market.com"
                        value={formEmail}
                        onChange={(e) => setFormEmail(e.target.value)}
                        className={`w-full px-4 py-2.5 rounded-xl text-xs sm:text-sm border outline-none transition font-mono ${
                          isDarkMode
                            ? 'bg-[#0E1524] border-slate-700 text-slate-100 placeholder-slate-500 focus:border-purple-500'
                            : 'bg-slate-50 border-slate-300 text-slate-900 placeholder-slate-400 focus:border-purple-600 focus:bg-white focus:ring-2 focus:ring-purple-100 shadow-2xs'
                        }`}
                      />
                    </div>

                    {/* Password */}
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className={`block text-xs font-bold ${isDarkMode ? 'text-slate-300' : 'text-slate-800'}`}>
                          {isKu ? 'تێپەڕەوشە (پاسۆرد) *' : 'Password *'}
                        </label>
                        <button
                          type="button"
                          onClick={() => setFormPassword(generateRandomPassword())}
                          className="text-[10px] text-purple-600 dark:text-purple-400 font-bold hover:underline cursor-pointer flex items-center gap-1"
                        >
                          <Wand2 className="w-3 h-3" />
                          <span>{isKu ? '🎲 هەڕەمەکی' : '🎲 Random'}</span>
                        </button>
                      </div>
                      <input
                        type="text"
                        required
                        placeholder="••••••••"
                        value={formPassword}
                        onChange={(e) => setFormPassword(e.target.value)}
                        className={`w-full px-4 py-2.5 rounded-xl text-xs sm:text-sm border outline-none transition font-mono font-bold ${
                          isDarkMode
                            ? 'bg-[#0E1524] border-slate-700 text-slate-100 placeholder-slate-500 focus:border-purple-500'
                            : 'bg-slate-50 border-slate-300 text-slate-900 placeholder-slate-400 focus:border-purple-600 focus:bg-white focus:ring-2 focus:ring-purple-100 shadow-2xs'
                        }`}
                      />
                    </div>

                    {/* Supervising Manager Email (only for staff employees) */}
                    {customAccountRole === 'employee' && (
                      <div className="md:col-span-2">
                        <label className={`block text-xs font-bold mb-1.5 ${isDarkMode ? 'text-slate-300' : 'text-slate-800'}`}>
                          {isKu ? 'ئیمەیڵی فەرمی بەڕێوەبەر (بۆ بەستنەوەی گووگڵ درایڤ و کۆنترۆڵ) *' : 'Supervising Manager Email *'}
                        </label>
                        <input
                          type="email"
                          required
                          placeholder="manager@gmail.com"
                          value={formManagerEmail}
                          onChange={(e) => setFormManagerEmail(e.target.value)}
                          className={`w-full px-4 py-2.5 rounded-xl text-xs sm:text-sm border outline-none transition font-mono ${
                            isDarkMode
                              ? 'bg-[#0E1524] border-slate-700 text-slate-100 placeholder-slate-500 focus:border-purple-500'
                              : 'bg-slate-50 border-slate-300 text-slate-900 placeholder-slate-400 focus:border-purple-600 focus:bg-white focus:ring-2 focus:ring-purple-100 shadow-2xs'
                          }`}
                        />
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Section 2: Subscription Validity, Dates & Pricing */}
              <div
                className={`p-4 sm:p-5 rounded-2xl border space-y-4 ${
                  isDarkMode ? 'bg-[#0E1524] border-slate-800' : 'bg-slate-50/90 border-slate-200'
                }`}
              >
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <span className="text-xs sm:text-sm font-bold text-purple-600 dark:text-purple-400 flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    <span>{isKu ? 'ماوەی بەشداریکردن، نرخ و بەروارەکان:' : 'Subscription Validity, Dates & Pricing:'}</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowCalendar(!showCalendar)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition cursor-pointer flex items-center gap-1.5 ${
                      showCalendar
                        ? 'bg-purple-600 text-white border-purple-500 shadow-sm'
                        : isDarkMode
                        ? 'bg-purple-500/10 hover:bg-purple-500/20 text-purple-300 border-purple-500/30'
                        : 'bg-purple-50 hover:bg-purple-100 text-purple-800 border-purple-300 shadow-2xs'
                    }`}
                  >
                    <Calendar className="w-3.5 h-3.5" />
                    <span>{showCalendar ? (isKu ? 'داخستنی خشتەی ڕۆژژمێر ✕' : 'Close Calendar Table ✕') : (isKu ? 'کردنەوەی خشتەی ڕۆژژمێر 📅' : 'Open Calendar Table 📅')}</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
                  {/* Fee Amount */}
                  <div>
                    <label className={`block text-xs font-bold mb-1.5 ${isDarkMode ? 'text-slate-300' : 'text-slate-800'}`}>
                      {isKu ? 'بڕی پارەی دیاریکراو (دینار یان دۆلار)' : 'Fee Amount (e.g. 25,000 IQD)'}
                    </label>
                    <input
                      type="text"
                      placeholder={isKu ? 'نموونە: 25,000 IQD یان $25' : 'e.g. $25'}
                      value={formPrice}
                      onChange={(e) => setFormPrice(e.target.value)}
                      className={`w-full px-4 py-2.5 rounded-xl text-xs sm:text-sm border outline-none font-mono ${
                        isDarkMode ? 'bg-[#10182B] border-slate-700 text-slate-100' : 'bg-white border-slate-300 text-slate-900 shadow-2xs'
                      }`}
                    />
                    <div className="flex items-center gap-1 mt-1.5 flex-wrap">
                      {['$25', '$50', '$100', '25,000 IQD', '50,000 IQD', '100,000 IQD'].map((preset) => (
                        <button
                          key={preset}
                          type="button"
                          onClick={() => setFormPrice(preset)}
                          className={`text-[10px] px-2 py-0.5 rounded-md font-mono font-bold transition border cursor-pointer ${
                            formPrice === preset
                              ? 'bg-amber-500 text-slate-950 border-amber-400 font-black'
                              : isDarkMode
                              ? 'bg-slate-800 text-slate-300 border-slate-700 hover:border-amber-500/50'
                              : 'bg-slate-100 text-slate-700 border-slate-200 hover:border-amber-500/50'
                          }`}
                        >
                          {preset}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Start Date Trigger */}
                  <div>
                    <label className={`block text-xs font-bold mb-1.5 ${isDarkMode ? 'text-slate-300' : 'text-slate-800'}`}>
                      {isKu ? 'کاتی دەستپێکردن (Start Date) *' : 'Subscription Start Date *'}
                    </label>
                    <div
                      onClick={() => setShowCalendar(true)}
                      className={`w-full px-3.5 py-2.5 rounded-xl border flex items-center justify-between cursor-pointer transition ${
                        isDarkMode
                          ? 'bg-[#10182B] border-slate-700 hover:border-purple-500 text-slate-100'
                          : 'bg-white border-slate-300 hover:border-purple-500 text-slate-900 shadow-2xs'
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <Calendar className="w-4 h-4 text-purple-500 shrink-0" />
                        <span className="font-mono text-xs sm:text-sm font-bold truncate">
                          {formStartedAt ? formatDate(formStartedAt) : (isKu ? 'دەستپێک دیاری بکە' : 'Pick start date')}
                        </span>
                      </div>
                      <span className="text-[10px] px-2 py-0.5 rounded bg-purple-500/10 text-purple-600 dark:text-purple-400 font-bold shrink-0">
                        {isKu ? 'خشتە 📅' : 'Pick 📅'}
                      </span>
                    </div>
                  </div>

                  {/* End Date Trigger */}
                  <div>
                    <label className={`block text-xs font-bold mb-1.5 ${isDarkMode ? 'text-slate-300' : 'text-slate-800'}`}>
                      {isKu ? 'کاتی بەسەرچوون (End Date)' : 'Subscription Expiry Date'}
                    </label>
                    <div
                      onClick={() => setShowCalendar(true)}
                      className={`w-full px-3.5 py-2.5 rounded-xl border flex items-center justify-between cursor-pointer transition ${
                        isDarkMode
                          ? 'bg-[#10182B] border-slate-700 hover:border-emerald-500 text-slate-100'
                          : 'bg-white border-slate-300 hover:border-emerald-500 text-slate-900 shadow-2xs'
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <Calendar className="w-4 h-4 text-emerald-500 shrink-0" />
                        <span className="font-mono text-xs sm:text-sm font-bold truncate">
                          {formExpiresAt ? formatDate(formExpiresAt) : (isKu ? '∞ بێ سنوور (Unlimited)' : '∞ Unlimited')}
                        </span>
                      </div>
                      <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold shrink-0">
                        {isKu ? 'خشتە 📅' : 'Pick 📅'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Interactive Calendar Table Expansion */}
                {showCalendar && (
                  <div className="pt-2 animate-in fade-in duration-200">
                    <InteractiveCalendarPicker
                      startDate={formStartedAt}
                      endDate={formExpiresAt}
                      onSelectStart={(newStart) => {
                        setFormStartedAt(newStart);
                        if (typeof formDuration === 'number' && formDuration > 0) {
                          const b = new Date(newStart);
                          b.setDate(b.getDate() + formDuration);
                          const y = b.getFullYear();
                          const m = String(b.getMonth() + 1).padStart(2, '0');
                          const d = String(b.getDate()).padStart(2, '0');
                          setFormExpiresAt(`${y}-${m}-${d}`);
                        }
                      }}
                      onSelectEnd={(newEnd) => {
                        setFormExpiresAt(newEnd);
                        if (formStartedAt && newEnd) {
                          const diffMs = new Date(newEnd).getTime() - new Date(formStartedAt).getTime();
                          const days = Math.round(diffMs / (1000 * 60 * 60 * 24));
                          if (days > 0) setFormDuration(days);
                        }
                      }}
                      isKu={isKu}
                      isDarkMode={isDarkMode}
                      onClose={() => setShowCalendar(false)}
                    />
                  </div>
                )}

                {/* Large Preset Days Buttons */}
                <div className="space-y-2 pt-2 border-t border-slate-200 dark:border-slate-800">
                  <div className="flex items-center justify-between">
                    <span className={`text-xs font-black ${isDarkMode ? 'text-slate-300' : 'text-slate-800'}`}>
                      {isKu ? 'دیاریکردنی خێرای ماوە لە کاتی دەستپێکەوە:' : 'Quick Presets from Start Date:'}
                    </span>
                    <span className={`text-[11px] font-bold ${isDarkMode ? 'text-purple-400' : 'text-purple-700'}`}>
                      {formDuration === 'unlimited' || !formExpiresAt ? (isKu ? 'بێ سنوور ∞' : 'Unlimited ∞') : `${formDuration} ${isKu ? 'ڕۆژ' : 'days'}`}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
                    {PRESET_OPTIONS.map((preset) => {
                      const isSelected =
                        preset.days === 'unlimited'
                          ? !formExpiresAt || formDuration === 'unlimited'
                          : formDuration === preset.days && Boolean(formExpiresAt);

                      return (
                        <button
                          key={String(preset.days)}
                          type="button"
                          onClick={() => applyPresetDuration(preset.days)}
                          className={`p-3 sm:p-3.5 rounded-2xl border text-center transition-all cursor-pointer flex flex-col items-center justify-center ${
                            isSelected
                              ? preset.days === 'unlimited'
                                ? 'bg-gradient-to-tr from-emerald-600 to-teal-600 text-white border-emerald-500 shadow-md shadow-emerald-500/30 scale-[1.02]'
                                : 'bg-gradient-to-tr from-purple-600 to-indigo-600 text-white border-purple-500 shadow-md shadow-purple-500/30 scale-[1.02]'
                              : isDarkMode
                              ? 'bg-[#10182B] border-slate-700/80 hover:border-purple-500 text-slate-200 hover:bg-slate-800'
                              : 'bg-white border-slate-300 hover:border-purple-500 text-slate-900 hover:bg-purple-50 shadow-2xs'
                          }`}
                        >
                          <span className="text-sm sm:text-base font-black tracking-tight">
                            {isKu ? preset.titleKu : preset.titleEn}
                          </span>
                          <span className="text-[11px] font-bold opacity-80 mt-0.5">
                            {isKu ? preset.subKu : preset.subEn}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Section 3: Usage Limits Configuration */}
              <div
                className={`p-4 sm:p-5 rounded-2xl border space-y-3 ${
                  isDarkMode ? 'bg-[#0E1524] border-slate-800' : 'bg-slate-50/90 border-slate-200'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs sm:text-sm font-bold text-indigo-500 flex items-center gap-2">
                    <Sliders className="w-4 h-4" />
                    <span>{isKu ? 'دیاریکردنی سنووری بەکارهێنان (Usage Limits):' : 'Custom Usage Limits:'}</span>
                  </span>
                  <span className={`text-[11px] font-bold ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                    {isKu ? 'بۆ بێ سنوور، دوگمەی ∞ داگرە' : 'Toggle ∞ for Unlimited'}
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                  {/* Items Limit */}
                  <div className={`p-3 rounded-xl border space-y-1.5 ${
                    isDarkMode ? 'bg-slate-900/60 border-slate-700/60' : 'bg-white border-slate-200 shadow-2xs'
                  }`}>
                    <div className="flex items-center justify-between text-xs font-bold">
                      <span className={isDarkMode ? 'text-slate-200' : 'text-slate-800'}>{isKu ? 'ئایتم (کاڵا)' : 'Max Items'}</span>
                      <button
                        type="button"
                        onClick={() => setUnlimitedItems(!unlimitedItems)}
                        className={`px-1.5 py-0.5 rounded text-[10px] font-bold transition cursor-pointer ${
                          unlimitedItems ? 'bg-purple-600 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        ∞
                      </button>
                    </div>
                    {!unlimitedItems ? (
                      <input
                        type="number"
                        min="1"
                        value={formLimits.maxItems === 'unlimited' ? 20 : formLimits.maxItems}
                        onChange={(e) => setFormLimits((p) => ({ ...p, maxItems: Number(e.target.value) }))}
                        className={`w-full px-2 py-1.5 rounded-lg border text-xs text-center font-mono font-bold ${
                          isDarkMode ? 'bg-[#0E1524] border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                        }`}
                      />
                    ) : (
                      <div className="text-center font-extrabold text-purple-600 dark:text-purple-400 text-xs py-1.5">∞ بێ سنوور</div>
                    )}
                  </div>

                  {/* Stock Quantity Limit */}
                  <div className={`p-3 rounded-xl border space-y-1.5 ${
                    isDarkMode ? 'bg-slate-900/60 border-slate-700/60' : 'bg-white border-slate-200 shadow-2xs'
                  }`}>
                    <div className="flex items-center justify-between text-xs font-bold">
                      <span className={isDarkMode ? 'text-slate-200' : 'text-slate-800'}>{isKu ? 'زۆرترین بڕ' : 'Max Qty'}</span>
                      <button
                        type="button"
                        onClick={() => setUnlimitedQuantity(!unlimitedQuantity)}
                        className={`px-1.5 py-0.5 rounded text-[10px] font-bold transition cursor-pointer ${
                          unlimitedQuantity ? 'bg-purple-600 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        ∞
                      </button>
                    </div>
                    {!unlimitedQuantity ? (
                      <input
                        type="number"
                        min="1"
                        value={formLimits.maxQuantity === 'unlimited' ? 30 : formLimits.maxQuantity}
                        onChange={(e) => setFormLimits((p) => ({ ...p, maxQuantity: Number(e.target.value) }))}
                        className={`w-full px-2 py-1.5 rounded-lg border text-xs text-center font-mono font-bold ${
                          isDarkMode ? 'bg-[#0E1524] border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                        }`}
                      />
                    ) : (
                      <div className="text-center font-extrabold text-purple-600 dark:text-purple-400 text-xs py-1.5">∞ بێ سنوور</div>
                    )}
                  </div>

                  {/* Sales Limit */}
                  <div className={`p-3 rounded-xl border space-y-1.5 ${
                    isDarkMode ? 'bg-slate-900/60 border-slate-700/60' : 'bg-white border-slate-200 shadow-2xs'
                  }`}>
                    <div className="flex items-center justify-between text-xs font-bold">
                      <span className={isDarkMode ? 'text-slate-200' : 'text-slate-800'}>{isKu ? 'فرۆشتن' : 'Max Sales'}</span>
                      <button
                        type="button"
                        onClick={() => setUnlimitedSales(!unlimitedSales)}
                        className={`px-1.5 py-0.5 rounded text-[10px] font-bold transition cursor-pointer ${
                          unlimitedSales ? 'bg-purple-600 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        ∞
                      </button>
                    </div>
                    {!unlimitedSales ? (
                      <input
                        type="number"
                        min="1"
                        value={formLimits.maxSales === 'unlimited' ? 15 : formLimits.maxSales}
                        onChange={(e) => setFormLimits((p) => ({ ...p, maxSales: Number(e.target.value) }))}
                        className={`w-full px-2 py-1.5 rounded-lg border text-xs text-center font-mono font-bold ${
                          isDarkMode ? 'bg-[#0E1524] border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                        }`}
                      />
                    ) : (
                      <div className="text-center font-extrabold text-purple-600 dark:text-purple-400 text-xs py-1.5">∞ بێ سنوور</div>
                    )}
                  </div>

                  {/* Printed Invoices Limit */}
                  <div className={`p-3 rounded-xl border space-y-1.5 ${
                    isDarkMode ? 'bg-slate-900/60 border-slate-700/60' : 'bg-white border-slate-200 shadow-2xs'
                  }`}>
                    <div className="flex items-center justify-between text-xs font-bold">
                      <span className={isDarkMode ? 'text-slate-200' : 'text-slate-800'}>{isKu ? 'وەسڵی چاپ' : 'Invoices'}</span>
                      <button
                        type="button"
                        onClick={() => setUnlimitedInvoices(!unlimitedInvoices)}
                        className={`px-1.5 py-0.5 rounded text-[10px] font-bold transition cursor-pointer ${
                          unlimitedInvoices ? 'bg-purple-600 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        ∞
                      </button>
                    </div>
                    {!unlimitedInvoices ? (
                      <input
                        type="number"
                        min="1"
                        value={formLimits.maxInvoices === 'unlimited' ? 40 : formLimits.maxInvoices}
                        onChange={(e) => setFormLimits((p) => ({ ...p, maxInvoices: Number(e.target.value) }))}
                        className={`w-full px-2 py-1.5 rounded-lg border text-xs text-center font-mono font-bold ${
                          isDarkMode ? 'bg-[#0E1524] border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                        }`}
                      />
                    ) : (
                      <div className="text-center font-extrabold text-purple-600 dark:text-purple-400 text-xs py-1.5">∞ بێ سنوور</div>
                    )}
                  </div>

                  {/* Quotations Limit */}
                  <div className={`p-3 rounded-xl border space-y-1.5 ${
                    isDarkMode ? 'bg-slate-900/60 border-slate-700/60' : 'bg-white border-slate-200 shadow-2xs'
                  }`}>
                    <div className="flex items-center justify-between text-xs font-bold">
                      <span className={isDarkMode ? 'text-slate-200' : 'text-slate-800'}>{isKu ? 'عەرز و ئۆفەر' : 'Quotations'}</span>
                      <button
                        type="button"
                        onClick={() => setUnlimitedQuotations(!unlimitedQuotations)}
                        className={`px-1.5 py-0.5 rounded text-[10px] font-bold transition cursor-pointer ${
                          unlimitedQuotations ? 'bg-purple-600 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        ∞
                      </button>
                    </div>
                    {!unlimitedQuotations ? (
                      <input
                        type="number"
                        min="1"
                        value={formLimits.maxQuotations === 'unlimited' ? 5 : formLimits.maxQuotations}
                        onChange={(e) => setFormLimits((p) => ({ ...p, maxQuotations: Number(e.target.value) }))}
                        className={`w-full px-2 py-1.5 rounded-lg border text-xs text-center font-mono font-bold ${
                          isDarkMode ? 'bg-[#0E1524] border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                        }`}
                      />
                    ) : (
                      <div className="text-center font-extrabold text-purple-600 dark:text-purple-400 text-xs py-1.5">∞ بێ سنوور</div>
                    )}
                  </div>
                </div>
              </div>

              {/* Online Store Note */}
              <div
                className={`p-3.5 rounded-2xl border flex items-center justify-between gap-3 ${
                  isDarkMode ? 'bg-[#0E1524] border-slate-800' : 'bg-slate-50 border-slate-200'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Globe className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span className="text-xs text-slate-300 font-bold">
                    {isKu
                      ? '💡 چالاککردنی وێب ستۆر (فڕۆشگای ئۆنلاین) لە بەشی تایبەتی «وێب ستۆرەکان» ئەنجام دەدرێت بە داتا و نرخی جیاواز.'
                      : '💡 Online store activation is handled separately in the dedicated "Online Stores" tab.'}
                  </span>
                </div>
              </div>

              {/* Submit / Cancel Buttons */}
              <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className={`px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition border cursor-pointer ${
                    isDarkMode ? 'border-slate-700 text-slate-300 hover:text-white hover:bg-slate-800' : 'border-slate-300 text-slate-700 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  {isKu ? 'پاشگەزبوونەوە' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className={`px-6 py-2.5 rounded-xl disabled:opacity-50 text-xs sm:text-sm font-black shadow-lg flex items-center gap-2 transition cursor-pointer ${
                    addModalMode === 'upgrade_registered'
                      ? 'bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 hover:from-amber-400 hover:to-orange-500 text-slate-950 shadow-amber-500/25 border border-amber-400/50'
                      : 'bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white shadow-purple-500/25 border border-purple-400/30'
                  }`}
                >
                  {submitting ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : addModalMode === 'upgrade_registered' ? (
                    <Sparkles className="w-4 h-4 text-slate-950 fill-slate-950" />
                  ) : (
                    <UserPlus className="w-4 h-4" />
                  )}
                  <span>
                    {addModalMode === 'upgrade_registered'
                      ? (isKu ? '🌟 بەرزکردنەوە و کاراکردنی پلانی بەکارهێنەر' : '🌟 Upgrade & Activate User Plan')
                      : (isKu ? 'دروستکردنی ئەکاونت' : 'Create Account')}
                  </span>
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 md:p-6 bg-slate-950/85 backdrop-blur-sm animate-in fade-in duration-200">
          <div
            className={`w-full max-w-4xl lg:max-w-5xl rounded-3xl border shadow-2xl p-5 sm:p-8 md:p-10 space-y-6 max-h-[94vh] overflow-y-auto ${
              isDarkMode
                ? 'bg-[#0F172A] border-slate-800 text-slate-100 shadow-black/60'
                : 'bg-white border-slate-200 text-slate-900 shadow-2xl'
            }`}
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b pb-4 border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-purple-600 to-indigo-600 text-white flex items-center justify-center shadow-md shadow-purple-500/20 shrink-0">
                  <Edit3 className="w-6 h-6" />
                </div>
                <div>
                  <h3 className={`text-lg sm:text-xl font-black ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                    {isKu ? 'دەستکاریکردنی زانیاری، بەشداریکردن و لیمیتەکانی ئەکاونت' : 'Edit Account Details & Limits'}
                  </h3>
                  <p className={`text-xs sm:text-sm font-mono font-semibold ${isDarkMode ? 'text-purple-400' : 'text-purple-700'}`}>
                    {selectedEmployee.email}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsEditModalOpen(false)}
                className={`p-2 rounded-xl transition cursor-pointer ${
                  isDarkMode ? 'text-slate-400 hover:text-white hover:bg-slate-800' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {formError && (
              <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-500 dark:text-rose-400 text-xs sm:text-sm flex items-center gap-2 font-bold">
                <AlertCircle className="w-5 h-5 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleSaveEdit} className="space-y-6">
              {/* Section 1: Basic Information & Credentials */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm font-bold text-purple-600 dark:text-purple-400">
                  <Users className="w-4 h-4" />
                  <span>{isKu ? 'زانیارییە سەرەکییەکان و هەژماری چوونەژوورەوە:' : 'Basic Credentials & Login:'}</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5 sm:gap-4">
                  {/* Name */}
                  <div>
                    <label className={`block text-xs font-bold mb-1.5 ${isDarkMode ? 'text-slate-300' : 'text-slate-800'}`}>
                      {isKu ? 'ناوی کارمەند / لق *' : 'Display Name / Store *'}
                    </label>
                    <input
                      type="text"
                      required
                      value={formName}
                      onChange={(e) => setFormName(e.target.value)}
                      className={`w-full px-4 py-2.5 rounded-xl text-xs sm:text-sm border outline-none transition font-medium ${
                        isDarkMode
                          ? 'bg-[#0E1524] border-slate-700 text-slate-100 placeholder-slate-500 focus:border-purple-500'
                          : 'bg-slate-50 border-slate-300 text-slate-900 placeholder-slate-400 focus:border-purple-600 focus:bg-white focus:ring-2 focus:ring-purple-100 shadow-2xs'
                      }`}
                    />
                  </div>

                  {/* Phone */}
                  <div>
                    <label className={`block text-xs font-bold mb-1.5 ${isDarkMode ? 'text-slate-300' : 'text-slate-800'}`}>
                      {isKu ? 'ژمارەی مۆبایل (بۆ وەتسئەپ)' : 'Phone (WhatsApp)'}
                    </label>
                    <input
                      type="text"
                      value={formPhone}
                      onChange={(e) => setFormPhone(e.target.value)}
                      className={`w-full px-4 py-2.5 rounded-xl text-xs sm:text-sm border outline-none transition font-mono ${
                        isDarkMode
                          ? 'bg-[#0E1524] border-slate-700 text-slate-100 placeholder-slate-500 focus:border-purple-500'
                          : 'bg-slate-50 border-slate-300 text-slate-900 placeholder-slate-400 focus:border-purple-600 focus:bg-white focus:ring-2 focus:ring-purple-100 shadow-2xs'
                      }`}
                    />
                  </div>

                  {/* Email */}
                  <div>
                    <label className={`block text-xs font-bold mb-1.5 ${isDarkMode ? 'text-slate-300' : 'text-slate-800'}`}>
                      {isKu ? 'ئیمەیڵی کارمەند (چوونەژوورەوە) *' : 'Employee Login Email *'}
                    </label>
                    <input
                      type="email"
                      required
                      value={formEmail}
                      onChange={(e) => setFormEmail(e.target.value)}
                      className={`w-full px-4 py-2.5 rounded-xl text-xs sm:text-sm border outline-none transition font-mono ${
                        isDarkMode
                          ? 'bg-[#0E1524] border-slate-700 text-slate-100 placeholder-slate-500 focus:border-purple-500'
                          : 'bg-slate-50 border-slate-300 text-slate-900 placeholder-slate-400 focus:border-purple-600 focus:bg-white focus:ring-2 focus:ring-purple-100 shadow-2xs'
                      }`}
                    />
                  </div>

                  {/* Password */}
                  <div>
                    <label className={`block text-xs font-bold mb-1.5 ${isDarkMode ? 'text-slate-300' : 'text-slate-800'}`}>
                      {selectedEmployee.accountType === 'registered' || !selectedEmployee.password
                        ? (isKu ? 'تێپەڕەوشە (ئارەزوومەندانە - ئەکاونتی فەرمییە)' : 'Password (Optional - Provider Login)')
                        : (isKu ? 'تێپەڕەوشە (پاسۆرد) *' : 'Password *')}
                    </label>
                    <input
                      type="text"
                      required={selectedEmployee.accountType !== 'registered' && Boolean(selectedEmployee.password)}
                      placeholder={selectedEmployee.accountType === 'registered' || !selectedEmployee.password ? (isKu ? 'بێ پاسۆرد (بە فەرمی لۆگین دەبێت)' : 'No password (Provider login)') : '••••••••'}
                      value={formPassword}
                      onChange={(e) => setFormPassword(e.target.value)}
                      className={`w-full px-4 py-2.5 rounded-xl text-xs sm:text-sm border outline-none transition font-mono ${
                        isDarkMode
                          ? 'bg-[#0E1524] border-slate-700 text-slate-100 placeholder-slate-500 focus:border-purple-500'
                          : 'bg-slate-50 border-slate-300 text-slate-900 placeholder-slate-400 focus:border-purple-600 focus:bg-white focus:ring-2 focus:ring-purple-100 shadow-2xs'
                      }`}
                    />
                  </div>

                  {/* Supervising Manager Email */}
                  <div className="md:col-span-2">
                    <label className={`block text-xs font-bold mb-1.5 ${isDarkMode ? 'text-slate-300' : 'text-slate-800'}`}>
                      {isKu ? 'ئیمەیڵی بەڕێوەبەری سەرپەرشتیار (دەتوانیت بیگۆڕیت) *' : 'Supervising Manager Email *'}
                    </label>
                    <input
                      type="email"
                      required
                      value={formManagerEmail}
                      onChange={(e) => setFormManagerEmail(e.target.value)}
                      className={`w-full px-4 py-2.5 rounded-xl text-xs sm:text-sm border outline-none transition font-mono ${
                        isDarkMode
                          ? 'bg-[#0E1524] border-slate-700 text-slate-100 placeholder-slate-500 focus:border-purple-500'
                          : 'bg-slate-50 border-slate-300 text-slate-900 placeholder-slate-400 focus:border-purple-600 focus:bg-white focus:ring-2 focus:ring-purple-100 shadow-2xs'
                      }`}
                    />
                  </div>

                  {/* Target Platform / Operating System Selector */}
                  <div className="col-span-1 md:col-span-2 lg:col-span-3 p-3.5 rounded-2xl border space-y-2.5 bg-slate-200/30 dark:bg-slate-900/40 border-slate-300 dark:border-slate-800">
                    <div className="flex items-center justify-between">
                      <label className={`block text-xs font-bold ${isDarkMode ? 'text-slate-300' : 'text-slate-800'}`}>
                        {isKu ? '💻 سیستەمی کۆمپیوتەر / کارپێکردن:' : '💻 Target Operating System:'}
                      </label>
                      <span className="text-[11px] font-medium text-slate-400">
                        {isKu ? 'دیاریبکە بۆ چ ئامێرێک کاربکات' : 'Specify intended OS'}
                      </span>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <button
                        type="button"
                        onClick={() => setFormPlatform('all')}
                        className={`py-2 px-3 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer border ${
                          formPlatform === 'all'
                            ? 'bg-emerald-500 text-white border-emerald-400 shadow-md shadow-emerald-500/20'
                            : isDarkMode
                            ? 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white'
                            : 'bg-white border-slate-300 text-slate-700 hover:text-slate-900 shadow-2xs'
                        }`}
                      >
                        <Globe className="w-3.5 h-3.5 shrink-0" />
                        <span>{isKu ? 'گشتی (گشت سیستمەکان)' : 'All Systems'}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setFormPlatform('macos')}
                        className={`py-2 px-3 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer border ${
                          formPlatform === 'macos'
                            ? 'bg-purple-600 text-white border-purple-400 shadow-md shadow-purple-500/20'
                            : isDarkMode
                            ? 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white'
                            : 'bg-white border-slate-300 text-slate-700 hover:text-slate-900 shadow-2xs'
                        }`}
                      >
                        <Laptop className="w-3.5 h-3.5 shrink-0" />
                        <span>{isKu ? ' ماکبووک (macOS)' : ' macOS (Mac)'}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setFormPlatform('windows')}
                        className={`py-2 px-3 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer border ${
                          formPlatform === 'windows'
                            ? 'bg-blue-600 text-white border-blue-400 shadow-md shadow-blue-500/20'
                            : isDarkMode
                            ? 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white'
                            : 'bg-white border-slate-300 text-slate-700 hover:text-slate-900 shadow-2xs'
                        }`}
                      >
                        <Laptop className="w-3.5 h-3.5 shrink-0" />
                        <span>{isKu ? '⊞ ویندۆز (Windows)' : '⊞ Windows PC'}</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Section 2: Subscription Validity, Dates & Pricing */}
              <div
                className={`p-4 sm:p-5 rounded-2xl border space-y-4 ${
                  isDarkMode ? 'bg-[#0E1524] border-slate-800' : 'bg-slate-50/90 border-slate-200'
                }`}
              >
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <span className="text-xs sm:text-sm font-bold text-purple-600 dark:text-purple-400 flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    <span>{isKu ? 'ماوەی بەشداریکردن، نرخ و بەروارەکان:' : 'Subscription Validity, Dates & Pricing:'}</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowCalendar(!showCalendar)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition cursor-pointer flex items-center gap-1.5 ${
                      showCalendar
                        ? 'bg-purple-600 text-white border-purple-500 shadow-sm'
                        : isDarkMode
                        ? 'bg-purple-500/10 hover:bg-purple-500/20 text-purple-300 border-purple-500/30'
                        : 'bg-purple-50 hover:bg-purple-100 text-purple-800 border-purple-300 shadow-2xs'
                    }`}
                  >
                    <Calendar className="w-3.5 h-3.5" />
                    <span>{showCalendar ? (isKu ? 'داخستنی خشتەی ڕۆژژمێر ✕' : 'Close Calendar Table ✕') : (isKu ? 'کردنەوەی خشتەی ڕۆژژمێر 📅' : 'Open Calendar Table 📅')}</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
                  {/* Fee Amount */}
                  <div>
                    <label className={`block text-xs font-bold mb-1.5 ${isDarkMode ? 'text-slate-300' : 'text-slate-800'}`}>
                      {isKu ? 'بڕی پارەی دیاریکراو' : 'Fee Amount'}
                    </label>
                    <input
                      type="text"
                      placeholder={isKu ? 'نموونە: 25,000 IQD یان $25' : 'e.g. $25'}
                      value={formPrice}
                      onChange={(e) => setFormPrice(e.target.value)}
                      className={`w-full px-4 py-2.5 rounded-xl text-xs sm:text-sm border outline-none font-mono ${
                        isDarkMode ? 'bg-[#10182B] border-slate-700 text-slate-100' : 'bg-white border-slate-300 text-slate-900 shadow-2xs'
                      }`}
                    />
                    <div className="flex items-center gap-1 mt-1.5 flex-wrap">
                      {['$25', '$50', '$100', '25,000 IQD', '50,000 IQD', '100,000 IQD'].map((preset) => (
                        <button
                          key={preset}
                          type="button"
                          onClick={() => setFormPrice(preset)}
                          className={`text-[10px] px-2 py-0.5 rounded-md font-mono font-bold transition border cursor-pointer ${
                            formPrice === preset
                              ? 'bg-amber-500 text-slate-950 border-amber-400 font-black'
                              : isDarkMode
                              ? 'bg-slate-800 text-slate-300 border-slate-700 hover:border-amber-500/50'
                              : 'bg-slate-100 text-slate-700 border-slate-200 hover:border-amber-500/50'
                          }`}
                        >
                          {preset}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Start Date Trigger */}
                  <div>
                    <label className={`block text-xs font-bold mb-1.5 ${isDarkMode ? 'text-slate-300' : 'text-slate-800'}`}>
                      {isKu ? 'کاتی دەستپێکردن (Start Date) *' : 'Subscription Start Date *'}
                    </label>
                    <div
                      onClick={() => setShowCalendar(true)}
                      className={`w-full px-3.5 py-2.5 rounded-xl border flex items-center justify-between cursor-pointer transition ${
                        isDarkMode
                          ? 'bg-[#10182B] border-slate-700 hover:border-purple-500 text-slate-100'
                          : 'bg-white border-slate-300 hover:border-purple-500 text-slate-900 shadow-2xs'
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <Calendar className="w-4 h-4 text-purple-500 shrink-0" />
                        <span className="font-mono text-xs sm:text-sm font-bold truncate">
                          {formStartedAt ? formatDate(formStartedAt) : (isKu ? 'دەستپێک دیاری بکە' : 'Pick start date')}
                        </span>
                      </div>
                      <span className="text-[10px] px-2 py-0.5 rounded bg-purple-500/10 text-purple-600 dark:text-purple-400 font-bold shrink-0">
                        {isKu ? 'خشتە 📅' : 'Pick 📅'}
                      </span>
                    </div>
                  </div>

                  {/* End Date Trigger */}
                  <div>
                    <label className={`block text-xs font-bold mb-1.5 ${isDarkMode ? 'text-slate-300' : 'text-slate-800'}`}>
                      {isKu ? 'کاتی بەسەرچوون (End Date)' : 'Subscription Expiry Date'}
                    </label>
                    <div
                      onClick={() => setShowCalendar(true)}
                      className={`w-full px-3.5 py-2.5 rounded-xl border flex items-center justify-between cursor-pointer transition ${
                        isDarkMode
                          ? 'bg-[#10182B] border-slate-700 hover:border-emerald-500 text-slate-100'
                          : 'bg-white border-slate-300 hover:border-emerald-500 text-slate-900 shadow-2xs'
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <Calendar className="w-4 h-4 text-emerald-500 shrink-0" />
                        <span className="font-mono text-xs sm:text-sm font-bold truncate">
                          {formExpiresAt ? formatDate(formExpiresAt) : (isKu ? '∞ بێ سنوور (Unlimited)' : '∞ Unlimited')}
                        </span>
                      </div>
                      <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold shrink-0">
                        {isKu ? 'خشتە 📅' : 'Pick 📅'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Interactive Calendar Table Expansion */}
                {showCalendar && (
                  <div className="pt-2 animate-in fade-in duration-200">
                    <InteractiveCalendarPicker
                      startDate={formStartedAt}
                      endDate={formExpiresAt}
                      onSelectStart={(newStart) => {
                        setFormStartedAt(newStart);
                        if (typeof formDuration === 'number' && formDuration > 0) {
                          const b = new Date(newStart);
                          b.setDate(b.getDate() + formDuration);
                          const y = b.getFullYear();
                          const m = String(b.getMonth() + 1).padStart(2, '0');
                          const d = String(b.getDate()).padStart(2, '0');
                          setFormExpiresAt(`${y}-${m}-${d}`);
                        }
                      }}
                      onSelectEnd={(newEnd) => {
                        setFormExpiresAt(newEnd);
                        if (formStartedAt && newEnd) {
                          const diffMs = new Date(newEnd).getTime() - new Date(formStartedAt).getTime();
                          const days = Math.round(diffMs / (1000 * 60 * 60 * 24));
                          if (days > 0) setFormDuration(days);
                        }
                      }}
                      isKu={isKu}
                      isDarkMode={isDarkMode}
                      onClose={() => setShowCalendar(false)}
                    />
                  </div>
                )}

                {/* Large Preset Days Buttons */}
                <div className="space-y-2 pt-2 border-t border-slate-200 dark:border-slate-800">
                  <div className="flex items-center justify-between">
                    <span className={`text-xs font-black ${isDarkMode ? 'text-slate-300' : 'text-slate-800'}`}>
                      {isKu ? 'دیاریکردنی خێرای ماوە لە کاتی دەستپێکەوە:' : 'Quick Presets from Start Date:'}
                    </span>
                    <span className={`text-[11px] font-bold ${isDarkMode ? 'text-purple-400' : 'text-purple-700'}`}>
                      {formDuration === 'unlimited' || !formExpiresAt ? (isKu ? 'بێ سنوور ∞' : 'Unlimited ∞') : `${formDuration} ${isKu ? 'ڕۆژ' : 'days'}`}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
                    {PRESET_OPTIONS.map((preset) => {
                      const isSelected =
                        preset.days === 'unlimited'
                          ? !formExpiresAt || formDuration === 'unlimited'
                          : formDuration === preset.days && Boolean(formExpiresAt);

                      return (
                        <button
                          key={String(preset.days)}
                          type="button"
                          onClick={() => applyPresetDuration(preset.days)}
                          className={`p-3 sm:p-3.5 rounded-2xl border text-center transition-all cursor-pointer flex flex-col items-center justify-center ${
                            isSelected
                              ? preset.days === 'unlimited'
                                ? 'bg-gradient-to-tr from-emerald-600 to-teal-600 text-white border-emerald-500 shadow-md shadow-emerald-500/30 scale-[1.02]'
                                : 'bg-gradient-to-tr from-purple-600 to-indigo-600 text-white border-purple-500 shadow-md shadow-purple-500/30 scale-[1.02]'
                              : isDarkMode
                              ? 'bg-[#10182B] border-slate-700/80 hover:border-purple-500 text-slate-200 hover:bg-slate-800'
                              : 'bg-white border-slate-300 hover:border-purple-500 text-slate-900 hover:bg-purple-50 shadow-2xs'
                          }`}
                        >
                          <span className="text-sm sm:text-base font-black tracking-tight">
                            {isKu ? preset.titleKu : preset.titleEn}
                          </span>
                          <span className="text-[11px] font-bold opacity-80 mt-0.5">
                            {isKu ? preset.subKu : preset.subEn}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Section 3: Usage Limits Configuration */}
              <div
                className={`p-4 sm:p-5 rounded-2xl border space-y-3 ${
                  isDarkMode ? 'bg-[#0E1524] border-slate-800' : 'bg-slate-50/90 border-slate-200'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs sm:text-sm font-bold text-indigo-500 flex items-center gap-2">
                    <Sliders className="w-4 h-4" />
                    <span>{isKu ? 'سنووری بەکارهێنان (Custom Limits):' : 'Custom Limits:'}</span>
                  </span>
                  <span className={`text-[11px] font-bold ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                    {isKu ? 'بۆ بێ سنوور، دوگمەی ∞ داگرە' : 'Toggle ∞ for Unlimited'}
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                  {/* Items */}
                  <div className={`p-3 rounded-xl border space-y-1.5 ${
                    isDarkMode ? 'bg-slate-900/60 border-slate-700/60' : 'bg-white border-slate-200 shadow-2xs'
                  }`}>
                    <div className="flex items-center justify-between text-xs font-bold">
                      <span className={isDarkMode ? 'text-slate-200' : 'text-slate-800'}>{isKu ? 'ئایتم (کاڵا)' : 'Items'}</span>
                      <button
                        type="button"
                        onClick={() => setUnlimitedItems(!unlimitedItems)}
                        className={`px-1.5 py-0.5 rounded text-[10px] font-bold transition cursor-pointer ${
                          unlimitedItems ? 'bg-purple-600 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        ∞
                      </button>
                    </div>
                    {!unlimitedItems ? (
                      <input
                        type="number"
                        min="1"
                        value={formLimits.maxItems === 'unlimited' ? 20 : formLimits.maxItems}
                        onChange={(e) => setFormLimits((p) => ({ ...p, maxItems: Number(e.target.value) }))}
                        className={`w-full px-2 py-1.5 rounded-lg border text-xs text-center font-mono font-bold ${
                          isDarkMode ? 'bg-[#0E1524] border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                        }`}
                      />
                    ) : (
                      <div className="text-center font-extrabold text-purple-600 dark:text-purple-400 text-xs py-1.5">∞ بێ سنوور</div>
                    )}
                  </div>

                  {/* Quantity */}
                  <div className={`p-3 rounded-xl border space-y-1.5 ${
                    isDarkMode ? 'bg-slate-900/60 border-slate-700/60' : 'bg-white border-slate-200 shadow-2xs'
                  }`}>
                    <div className="flex items-center justify-between text-xs font-bold">
                      <span className={isDarkMode ? 'text-slate-200' : 'text-slate-800'}>{isKu ? 'زۆرترین بڕ' : 'Max Qty'}</span>
                      <button
                        type="button"
                        onClick={() => setUnlimitedQuantity(!unlimitedQuantity)}
                        className={`px-1.5 py-0.5 rounded text-[10px] font-bold transition cursor-pointer ${
                          unlimitedQuantity ? 'bg-purple-600 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        ∞
                      </button>
                    </div>
                    {!unlimitedQuantity ? (
                      <input
                        type="number"
                        min="1"
                        value={formLimits.maxQuantity === 'unlimited' ? 30 : formLimits.maxQuantity}
                        onChange={(e) => setFormLimits((p) => ({ ...p, maxQuantity: Number(e.target.value) }))}
                        className={`w-full px-2 py-1.5 rounded-lg border text-xs text-center font-mono font-bold ${
                          isDarkMode ? 'bg-[#0E1524] border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                        }`}
                      />
                    ) : (
                      <div className="text-center font-extrabold text-purple-600 dark:text-purple-400 text-xs py-1.5">∞ بێ سنوور</div>
                    )}
                  </div>

                  {/* Sales */}
                  <div className={`p-3 rounded-xl border space-y-1.5 ${
                    isDarkMode ? 'bg-slate-900/60 border-slate-700/60' : 'bg-white border-slate-200 shadow-2xs'
                  }`}>
                    <div className="flex items-center justify-between text-xs font-bold">
                      <span className={isDarkMode ? 'text-slate-200' : 'text-slate-800'}>{isKu ? 'فرۆشتن' : 'Sales'}</span>
                      <button
                        type="button"
                        onClick={() => setUnlimitedSales(!unlimitedSales)}
                        className={`px-1.5 py-0.5 rounded text-[10px] font-bold transition cursor-pointer ${
                          unlimitedSales ? 'bg-purple-600 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        ∞
                      </button>
                    </div>
                    {!unlimitedSales ? (
                      <input
                        type="number"
                        min="1"
                        value={formLimits.maxSales === 'unlimited' ? 15 : formLimits.maxSales}
                        onChange={(e) => setFormLimits((p) => ({ ...p, maxSales: Number(e.target.value) }))}
                        className={`w-full px-2 py-1.5 rounded-lg border text-xs text-center font-mono font-bold ${
                          isDarkMode ? 'bg-[#0E1524] border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                        }`}
                      />
                    ) : (
                      <div className="text-center font-extrabold text-purple-600 dark:text-purple-400 text-xs py-1.5">∞ بێ سنوور</div>
                    )}
                  </div>

                  {/* Invoices */}
                  <div className={`p-3 rounded-xl border space-y-1.5 ${
                    isDarkMode ? 'bg-slate-900/60 border-slate-700/60' : 'bg-white border-slate-200 shadow-2xs'
                  }`}>
                    <div className="flex items-center justify-between text-xs font-bold">
                      <span className={isDarkMode ? 'text-slate-200' : 'text-slate-800'}>{isKu ? 'وەسڵی چاپ' : 'Invoices'}</span>
                      <button
                        type="button"
                        onClick={() => setUnlimitedInvoices(!unlimitedInvoices)}
                        className={`px-1.5 py-0.5 rounded text-[10px] font-bold transition cursor-pointer ${
                          unlimitedInvoices ? 'bg-purple-600 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        ∞
                      </button>
                    </div>
                    {!unlimitedInvoices ? (
                      <input
                        type="number"
                        min="1"
                        value={formLimits.maxInvoices === 'unlimited' ? 40 : formLimits.maxInvoices}
                        onChange={(e) => setFormLimits((p) => ({ ...p, maxInvoices: Number(e.target.value) }))}
                        className={`w-full px-2 py-1.5 rounded-lg border text-xs text-center font-mono font-bold ${
                          isDarkMode ? 'bg-[#0E1524] border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                        }`}
                      />
                    ) : (
                      <div className="text-center font-extrabold text-purple-600 dark:text-purple-400 text-xs py-1.5">∞ بێ سنوور</div>
                    )}
                  </div>

                  {/* Quotations */}
                  <div className={`p-3 rounded-xl border space-y-1.5 ${
                    isDarkMode ? 'bg-slate-900/60 border-slate-700/60' : 'bg-white border-slate-200 shadow-2xs'
                  }`}>
                    <div className="flex items-center justify-between text-xs font-bold">
                      <span className={isDarkMode ? 'text-slate-200' : 'text-slate-800'}>{isKu ? 'عەرز و ئۆفەر' : 'Quotations'}</span>
                      <button
                        type="button"
                        onClick={() => setUnlimitedQuotations(!unlimitedQuotations)}
                        className={`px-1.5 py-0.5 rounded text-[10px] font-bold transition cursor-pointer ${
                          unlimitedQuotations ? 'bg-purple-600 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        ∞
                      </button>
                    </div>
                    {!unlimitedQuotations ? (
                      <input
                        type="number"
                        min="1"
                        value={formLimits.maxQuotations === 'unlimited' ? 5 : formLimits.maxQuotations}
                        onChange={(e) => setFormLimits((p) => ({ ...p, maxQuotations: Number(e.target.value) }))}
                        className={`w-full px-2 py-1.5 rounded-lg border text-xs text-center font-mono font-bold ${
                          isDarkMode ? 'bg-[#0E1524] border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                        }`}
                      />
                    ) : (
                      <div className="text-center font-extrabold text-purple-600 dark:text-purple-400 text-xs py-1.5">∞ بێ سنوور</div>
                    )}
                  </div>
                </div>
              </div>

              {/* Online Store Note */}
              <div
                className={`p-3.5 rounded-2xl border flex items-center justify-between gap-3 ${
                  isDarkMode ? 'bg-[#0E1524] border-slate-800' : 'bg-slate-50 border-slate-200'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Globe className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span className="text-xs text-slate-300 font-bold">
                    {isKu
                      ? '💡 چالاککردنی وێب ستۆر (فڕۆشگای ئۆنلاین) لە بەشی تایبەتی «وێب ستۆرەکان» ئەنجام دەدرێت بە داتا و نرخی جیاواز.'
                      : '💡 Online store activation is handled separately in the dedicated "Online Stores" tab.'}
                  </span>
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className={`px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition border cursor-pointer ${
                    isDarkMode ? 'border-slate-700 text-slate-300 hover:text-white hover:bg-slate-800' : 'border-slate-300 text-slate-700 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  {isKu ? 'پاشگەزبوونەوە' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 disabled:opacity-50 text-white text-xs sm:text-sm font-bold shadow-lg shadow-purple-500/25 flex items-center gap-2 transition cursor-pointer"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/85 backdrop-blur-sm animate-in fade-in duration-200">
          <div
            className={`w-full max-w-lg rounded-3xl border shadow-2xl p-5 sm:p-7 space-y-5 ${
              isDarkMode ? 'bg-[#10182B] border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-900'
            }`}
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b pb-3.5 border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-purple-500/15 text-purple-600 dark:text-purple-400 flex items-center justify-center">
                  <RotateCcw className="w-5 h-5" />
                </div>
                <div>
                  <h3 className={`text-base sm:text-lg font-black ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                    {isKu ? 'تازەکردنەوەی بەشداریکردن' : 'Renew Subscription'}
                  </h3>
                  <p className={`text-xs font-bold ${isDarkMode ? 'text-purple-400' : 'text-purple-700'}`}>
                    {selectedEmployee.displayName} ({selectedEmployee.email})
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsRenewModalOpen(false)}
                className={`p-1.5 rounded-lg transition cursor-pointer ${
                  isDarkMode ? 'text-slate-400 hover:text-white hover:bg-slate-800' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Current Dates Overview */}
            <div className={`p-3 rounded-2xl border text-xs grid grid-cols-2 gap-2.5 ${
              isDarkMode ? 'bg-[#0E1524] border-slate-800' : 'bg-slate-50 border-slate-200 shadow-2xs'
            }`}>
              <div>
                <span className={`block text-[10px] font-bold ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                  {isKu ? 'کاتی دەستپێکردن:' : 'Start Date:'}
                </span>
                <span className={`font-mono font-bold ${isDarkMode ? 'text-slate-200' : 'text-slate-900'}`}>
                  {formatDate(selectedEmployee.startedAt || selectedEmployee.createdAt)}
                </span>
              </div>
              <div>
                <span className={`block text-[10px] font-bold ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                  {isKu ? 'بەسەرچوونی ئێستا:' : 'Current Expiry:'}
                </span>
                <span className={`font-mono font-bold ${
                  isAccountExpired(selectedEmployee)
                    ? 'text-rose-500'
                    : isDarkMode ? 'text-emerald-400' : 'text-emerald-700'
                }`}>
                  {selectedEmployee.expiresAt ? formatDate(selectedEmployee.expiresAt) : (isKu ? 'بێ سنوور' : 'Unlimited')}
                </span>
              </div>
            </div>

            <form onSubmit={handleSaveRenew} className="space-y-4">
              {/* Extension Days */}
              <div>
                <label className={`block text-xs font-bold mb-1.5 ${isDarkMode ? 'text-slate-300' : 'text-slate-800'}`}>
                  {isKu ? 'ماوەی تازەکردنەوە (ڕۆژ) *' : 'Extension Days *'}
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-2">
                  {[
                    { label: isKu ? '٣٠ ڕۆژ (١ مانگ)' : '30d (1m)', days: 30 },
                    { label: isKu ? '٦٠ ڕۆژ (٢ مانگ)' : '60d (2m)', days: 60 },
                    { label: isKu ? '٩٠ ڕۆژ (٣ مانگ)' : '90d (3m)', days: 90 },
                    { label: isKu ? '١٨٠ ڕۆژ (٦ مانگ)' : '180d (6m)', days: 180 },
                    { label: isKu ? '٣٦٥ ڕۆژ (١ ساڵ)' : '365d (1y)', days: 365 },
                  ].map((p) => (
                    <button
                      key={p.days}
                      type="button"
                      onClick={() => setRenewDays(p.days)}
                      className={`p-2.5 rounded-xl text-xs font-bold border transition cursor-pointer text-center ${
                        renewDays === p.days
                          ? 'bg-gradient-to-tr from-purple-600 to-indigo-600 text-white border-purple-500 shadow-md shadow-purple-500/25 scale-[1.02]'
                          : isDarkMode
                          ? 'bg-slate-800/60 border-slate-700 text-slate-300 hover:bg-slate-800'
                          : 'bg-white border-slate-300 text-slate-800 hover:bg-purple-50 shadow-2xs'
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
                  className={`w-full px-4 py-2.5 rounded-xl text-xs sm:text-sm border outline-none font-mono text-center font-bold ${
                    isDarkMode ? 'bg-[#0E1524] border-slate-700 text-slate-100' : 'bg-slate-50 border-slate-300 text-slate-900 shadow-2xs'
                  }`}
                />
              </div>

              {/* Renewal Price */}
              <div>
                <label className={`block text-xs font-bold mb-1.5 ${isDarkMode ? 'text-slate-300' : 'text-slate-800'}`}>
                  {isKu ? 'بڕی پارەی وەرگیراو بۆ ئەم نوێکردنەوەیە' : 'Renewal Fee Amount'}
                </label>
                <input
                  type="text"
                  placeholder={isKu ? 'نموونە: 25,000 IQD یان $25' : 'e.g. 25,000 IQD'}
                  value={renewPrice}
                  onChange={(e) => setRenewPrice(e.target.value)}
                  className={`w-full px-4 py-2.5 rounded-xl text-xs sm:text-sm border outline-none font-mono font-bold ${
                    isDarkMode ? 'bg-[#0E1524] border-slate-700 text-slate-100' : 'bg-slate-50 border-slate-300 text-slate-900 shadow-2xs'
                  }`}
                />
                <div className="flex items-center gap-1 mt-1.5 flex-wrap">
                  {['$25', '$50', '$100', '25,000 IQD', '50,000 IQD', '100,000 IQD'].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setRenewPrice(preset)}
                      className={`text-[10px] px-2 py-0.5 rounded-md font-mono font-bold transition border cursor-pointer ${
                        renewPrice === preset
                          ? 'bg-amber-500 text-slate-950 border-amber-400 font-black'
                          : isDarkMode
                          ? 'bg-slate-800 text-slate-300 border-slate-700 hover:border-amber-500/50'
                          : 'bg-slate-100 text-slate-700 border-slate-200 hover:border-amber-500/50'
                      }`}
                    >
                      {preset}
                    </button>
                  ))}
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="pt-3.5 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsRenewModalOpen(false)}
                  className={`px-4 py-2.5 rounded-xl text-xs font-bold transition border cursor-pointer ${
                    isDarkMode ? 'border-slate-700 text-slate-400 hover:text-white' : 'border-slate-300 text-slate-700 hover:text-slate-900'
                  }`}
                >
                  {isKu ? 'پاشگەزبوونەوە' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  disabled={renewing}
                  className="px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white text-xs sm:text-sm font-bold shadow-lg shadow-purple-500/25 flex items-center gap-2 transition cursor-pointer"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/85 backdrop-blur-sm animate-in fade-in duration-200">
          <div
            className={`w-full max-w-3xl rounded-3xl border shadow-2xl p-5 sm:p-7 space-y-4 max-h-[92vh] flex flex-col ${
              isDarkMode ? 'bg-[#10182B] border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-900 shadow-2xl'
            }`}
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b pb-3.5 border-slate-200 dark:border-slate-800 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-purple-500/15 text-purple-600 dark:text-purple-400 flex items-center justify-center">
                  <Sliders className="w-5 h-5" />
                </div>
                <div>
                  <h3 className={`text-base sm:text-lg font-black flex items-center gap-2 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                    <span>{isKu ? 'دەسەڵاتەکانی کارمەند:' : 'Staff Permissions:'}</span>
                    <span className="text-purple-600 dark:text-purple-400 font-extrabold">{selectedEmployee.displayName}</span>
                  </h3>
                  <p className={`text-xs font-mono ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>{selectedEmployee.email}</p>
                </div>
              </div>
              <button
                onClick={() => setIsPermModalOpen(false)}
                className={`p-1.5 rounded-lg transition cursor-pointer ${
                  isDarkMode ? 'text-slate-400 hover:text-white hover:bg-slate-800' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'
                }`}
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
              <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <div>
                  <div className="font-extrabold">{isKu ? 'چالاک (Active)' : 'Active'}</div>
                  <div className={`text-[10px] ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>{isKu ? 'دەسەڵاتی تەواو' : 'Full access'}</div>
                </div>
              </div>

              <div className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400">
                <Lock className="w-4 h-4 shrink-0" />
                <div>
                  <div className="font-extrabold">{isKu ? 'ناچالاک (Disabled)' : 'Disabled'}</div>
                  <div className={`text-[10px] ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>{isKu ? 'دیارە بەڵام قفڵە' : 'Visible but locked'}</div>
                </div>
              </div>

              <div className="flex items-center gap-1.5 text-rose-600 dark:text-rose-400">
                <EyeOff className="w-4 h-4 shrink-0" />
                <div>
                  <div className="font-extrabold">{isKu ? 'شاردراوە (Hidden)' : 'Hidden'}</div>
                  <div className={`text-[10px] ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>{isKu ? 'لە ئەپەکە نابینرێت' : 'Completely removed'}</div>
                </div>
              </div>
            </div>

            {/* Navigation Tabs inside modal */}
            <div className={`flex items-center gap-1 p-1 rounded-xl border text-xs font-bold shrink-0 ${
              isDarkMode ? 'bg-slate-800/80 border-slate-700/60' : 'bg-slate-100 border-slate-300'
            }`}>
              <button
                type="button"
                onClick={() => setPermTab('modules')}
                className={`flex-1 py-2 rounded-lg transition cursor-pointer text-center font-bold ${
                  permTab === 'modules'
                    ? 'bg-purple-600 text-white shadow-sm'
                    : isDarkMode ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {isKu ? 'مۆدیوولەکان (١١)' : 'Modules (11)'}
              </button>
              <button
                type="button"
                onClick={() => setPermTab('settings')}
                className={`flex-1 py-2 rounded-lg transition cursor-pointer text-center font-bold ${
                  permTab === 'settings'
                    ? 'bg-purple-600 text-white shadow-sm'
                    : isDarkMode ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {isKu ? 'سیتینگی بەتن-بەتن (٦)' : 'Settings Buttons (6)'}
              </button>
              <button
                type="button"
                onClick={() => setPermTab('actions')}
                className={`flex-1 py-2 rounded-lg transition cursor-pointer text-center font-bold ${
                  permTab === 'actions'
                    ? 'bg-purple-600 text-white shadow-sm'
                    : isDarkMode ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-900'
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
                        className={`p-3.5 rounded-2xl border transition flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                          isDarkMode ? 'bg-[#0E1524] border-slate-800' : 'bg-slate-50 border-slate-200'
                        }`}
                      >
                        <div>
                          <div className={`text-xs sm:text-sm font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                            {isKu ? item.labelKu : item.labelEn}
                          </div>
                          <div className={`text-[11px] font-medium ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>{item.descKu}</div>
                        </div>

                        {/* 3-State Segmented Control */}
                        <div className={`flex items-center p-1 rounded-xl border shrink-0 self-start sm:self-auto ${
                          isDarkMode ? 'bg-slate-900/90 border-slate-700/60' : 'bg-slate-200/80 border-slate-300'
                        }`}>
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
                                : isDarkMode ? 'text-slate-400 hover:text-emerald-400' : 'text-slate-700 hover:text-emerald-700'
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
                                : isDarkMode ? 'text-slate-400 hover:text-amber-400' : 'text-slate-700 hover:text-amber-700'
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
                                : isDarkMode ? 'text-slate-400 hover:text-rose-400' : 'text-slate-700 hover:text-rose-700'
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
                        className={`p-3.5 rounded-2xl border transition flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                          isDarkMode ? 'bg-[#0E1524] border-slate-800' : 'bg-slate-50 border-slate-200'
                        }`}
                      >
                        <div>
                          <div className={`text-xs sm:text-sm font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                            {isKu ? item.labelKu : item.labelEn}
                          </div>
                          <div className={`text-[11px] font-medium ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>{item.descKu}</div>
                        </div>

                        <div className={`flex items-center p-1 rounded-xl border shrink-0 self-start sm:self-auto ${
                          isDarkMode ? 'bg-slate-900/90 border-slate-700/60' : 'bg-slate-200/80 border-slate-300'
                        }`}>
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
                                : isDarkMode ? 'text-slate-400 hover:text-emerald-400' : 'text-slate-700 hover:text-emerald-700'
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
                                : isDarkMode ? 'text-slate-400 hover:text-amber-400' : 'text-slate-700 hover:text-amber-700'
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
                                : isDarkMode ? 'text-slate-400 hover:text-rose-400' : 'text-slate-700 hover:text-rose-700'
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
                      <div className={`text-sm font-bold flex items-center gap-2 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                        <Trash2 className="w-4 h-4 text-rose-500" />
                        <span>{isKu ? 'دەسەڵاتی سڕینەوەی وەسڵ و پسوڵەکان' : 'Can Delete Invoices'}</span>
                      </div>
                      <p className={`text-xs mt-1 max-w-md ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
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
                          : 'bg-rose-500/20 text-rose-500 dark:text-rose-400 border border-rose-500/30'
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
            <div className="pt-3.5 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3 shrink-0">
              <button
                type="button"
                onClick={() => setIsPermModalOpen(false)}
                className={`px-4 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                  isDarkMode ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-900'
                }`}
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

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* ── MODAL 5: DEDICATED ONLINE STORE ACTIVATION MODAL ──              */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      {showNewStoreModal && (() => {
        const typedCleanSubdomain = (newStoreSubdomain.trim() || slugifyStoreName(newStoreName.trim()) || '').toLowerCase();
        const liveConflictStore = typedCleanSubdomain
          ? allOnlineStores.find(
              (s) =>
                (s.subdomain || '').trim().toLowerCase() === typedCleanSubdomain &&
                (s.email || '').trim().toLowerCase() !== newStoreEmail.trim().toLowerCase()
            )
          : null;

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 md:p-6 bg-slate-950/85 backdrop-blur-sm animate-in fade-in duration-200">
          <div
            className={`w-full max-w-2xl sm:max-w-3xl rounded-3xl border shadow-2xl p-5 sm:p-8 space-y-6 max-h-[94vh] overflow-y-auto ${
              isDarkMode ? 'bg-[#101726] border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
            }`}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-500 text-slate-950 flex items-center justify-center shadow-lg shadow-emerald-500/20 font-black">
                  <Globe className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg sm:text-xl font-black">
                    {isKu ? 'چالاککردنی وێب ستۆری نوێ (Online Store)' : 'Activate New Online Store'}
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-400">
                    {isKu ? 'تەرخانکردنی دۆمەین و حسابی جیاواز بۆ وێبسایت بۆ هەژمارە تۆمارکراوەکان یان کارمەندەکان' : 'Assign domain, duration, and pricing for registered users or staff'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowNewStoreModal(false)}
                className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {newStoreError && (
              <div className="p-3.5 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs font-bold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                <span>{newStoreError}</span>
              </div>
            )}

            <form onSubmit={handleActivateNewStore} className="space-y-5">
              {/* Step 1: Account Picker */}
              <div className="p-4 rounded-2xl border border-slate-800 bg-slate-900/50 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs sm:text-sm font-bold text-emerald-400 flex items-center gap-2">
                    <Users className="w-4 h-4" />
                    <span>{isKu ? '١. دیاریکردنی هەژمار (هەموو بەکارهێنەران و کارمەندەکان):' : '1. Select Account:'}</span>
                  </label>
                  <span className="text-[11px] text-slate-400 font-mono">
                    {selectableAccounts.length} {isKu ? 'هەژمار بەردەستە' : 'accounts available'}
                  </span>
                </div>

                {/* Account Search */}
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder={isKu ? 'گەڕان لە نێوان ناوی کارمەند، بەکارهێنەری گووگڵ، ئیمەیڵ، ژمارە...' : 'Search by user name, google email, phone...'}
                    value={newStoreAccountSearch}
                    onChange={(e) => setNewStoreAccountSearch(e.target.value)}
                    className="w-full pr-9 pl-3 py-2 rounded-xl text-xs bg-slate-950 border border-slate-800 text-white outline-none font-bold"
                  />
                </div>

                {/* Scrollable Account Cards */}
                <div className="max-h-44 overflow-y-auto space-y-1.5 pr-1">
                  {filteredSelectableAccounts.map((acc) => {
                    const isSelected = newStoreEmail.toLowerCase() === acc.email.toLowerCase();
                    return (
                      <div
                        key={acc.email}
                        onClick={() => handleSelectAccountForNewStore(acc)}
                        className={`p-2.5 rounded-xl border transition cursor-pointer flex items-center justify-between gap-2 ${
                          isSelected
                            ? 'bg-emerald-500/20 border-emerald-500/50 text-white shadow-sm'
                            : 'bg-slate-900/60 hover:bg-slate-800/80 border-slate-800 text-slate-300'
                        }`}
                      >
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-black truncate">{acc.displayName}</span>
                            <span className={`text-[9px] px-1.5 py-0.2 rounded font-bold ${
                              acc.accountType === 'registered'
                                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                                : 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                            }`}>
                              {acc.accountType === 'registered' ? (isKu ? 'گووگڵ/ئەپڵ' : 'Registered') : (isKu ? 'کارمەند' : 'Staff')}
                            </span>
                            {acc.hasStore && (
                              <span className="text-[9px] px-1.5 py-0.2 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 font-bold">
                                {isKu ? 'وێب ستۆری هەیە' : 'Has store'}
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] font-mono text-slate-400 truncate">
                            {acc.email} {acc.phone ? `• ${acc.phone}` : ''}
                          </div>
                        </div>

                        <span className={`text-[11px] font-bold px-2.5 py-1 rounded-lg border shrink-0 ${
                          isSelected
                            ? 'bg-emerald-500 text-slate-950 font-black border-emerald-400'
                            : 'bg-slate-800 text-slate-300 border-slate-700'
                        }`}>
                          {isSelected ? (isKu ? '✓ هەڵبژێردرا' : '✓ Selected') : (isKu ? 'هەڵبژاردن' : 'Select')}
                        </span>
                      </div>
                    );
                  })}
                </div>

                {/* Direct Manual Email & Name inputs (in case admin wants custom) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-800">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-300 mb-1">
                      {isKu ? 'ئیمەیڵی هەژمار (پێویستە):' : 'Account Email (Required):'}
                    </label>
                    <input
                      type="email"
                      required
                      placeholder="owner@gmail.com"
                      value={newStoreEmail}
                      onChange={(e) => {
                        const val = e.target.value;
                        setNewStoreEmail(val);
                        if (!newStoreName) {
                          setNewStoreName(val.split('@')[0]);
                          setNewStoreSubdomain(slugifyStoreName(val.split('@')[0]));
                        }
                      }}
                      className="w-full px-3 py-2 rounded-xl text-xs bg-slate-950 border border-slate-800 text-white font-mono outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-300 mb-1">
                      {isKu ? 'ناوی کڕیار / خاوەن هەژمار:' : 'Customer / Owner Name:'}
                    </label>
                    <input
                      type="text"
                      placeholder={isKu ? 'ناوی خاوەن' : 'Owner Name'}
                      value={newStoreCustomerName}
                      onChange={(e) => setNewStoreCustomerName(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl text-xs bg-slate-950 border border-slate-800 text-white outline-none font-bold"
                    />
                  </div>
                </div>
              </div>

              {/* Step 2: Store Details */}
              <div className="p-4 rounded-2xl border border-slate-800 bg-slate-900/50 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs sm:text-sm font-bold text-emerald-400 flex items-center gap-2">
                    <Store className="w-4 h-4" />
                    <span>{isKu ? '٢. زانیارییەکانی وێب ستۆر (فڕۆشگای ئۆنلاین):' : '2. Store Details:'}</span>
                  </label>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  {/* Store Name */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-xs font-bold text-slate-300">
                        {isKu ? 'ناوی فرۆشگا / مارکێت:' : 'Store Name:'}
                      </label>
                      <button
                        type="button"
                        onClick={() => {
                          const s = slugifyStoreName(newStoreName || newStoreCustomerName || newStoreEmail.split('@')[0]);
                          if (s) setNewStoreSubdomain(s);
                        }}
                        className="text-[10px] text-teal-400 font-bold hover:underline cursor-pointer"
                      >
                        {isKu ? '🪄 دروستکردنی ناوی بەستەر' : '🪄 Generate Slug'}
                      </button>
                    </div>
                    <input
                      type="text"
                      required
                      placeholder={isKu ? 'نموونە: مارکێتی ئارام' : 'Store display name'}
                      value={newStoreName}
                      onChange={(e) => {
                        const val = e.target.value;
                        setNewStoreName(val);
                        if (!newStoreSubdomain) {
                          setNewStoreSubdomain(slugifyStoreName(val));
                        }
                      }}
                      className="w-full px-3 py-2.5 rounded-xl text-xs sm:text-sm bg-slate-950 border border-slate-800 text-white font-bold outline-none"
                    />
                  </div>

                  {/* Subdomain */}
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">
                      {isKu ? 'ناوی بەستەر (Subdomain):' : 'Subdomain / Slug:'}
                    </label>
                    <div className={`flex items-center rounded-xl border bg-slate-950 overflow-hidden ${
                      liveConflictStore ? 'border-rose-500' : 'border-slate-800'
                    }`} dir="ltr">
                      <span className={`px-2.5 py-2 text-xs font-mono font-bold border-r select-none ${
                        liveConflictStore ? 'bg-rose-950/40 text-rose-400 border-rose-800' : 'bg-slate-800 text-emerald-400 border-slate-700'
                      }`}>
                        froshiar.store/
                      </span>
                      <input
                        type="text"
                        required
                        placeholder="aram-market"
                        value={newStoreSubdomain}
                        onChange={(e) => {
                          const clean = e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-');
                          setNewStoreSubdomain(clean);
                        }}
                        className="w-full px-2.5 py-2 text-xs font-mono font-bold text-white bg-transparent outline-none"
                      />
                    </div>

                    {/* Live duplicate domain conflict detection banner */}
                    {liveConflictStore ? (
                      <div className="mt-1.5 p-2 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-[11px] flex items-center gap-1.5 font-bold animate-in fade-in">
                        <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-rose-400" />
                        <span>
                          {isKu
                            ? `ئەم دۆمەینە پێشتر گیراوە بۆ «${liveConflictStore.customerName || liveConflictStore.storeName || liveConflictStore.email}»! نابێت دوو وێبسایت هەمان دۆمەینیان هەبێت.`
                            : `Domain taken by "${liveConflictStore.customerName || liveConflictStore.email}".`}
                        </span>
                      </div>
                    ) : typedCleanSubdomain ? (
                      <div className="mt-1.5 p-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[11px] flex items-center gap-1.5 font-bold">
                        <CheckCircle2 className="w-3.5 h-3.5 shrink-0 text-emerald-400" />
                        <span>
                          {isKu ? `بەستەر بەردەستە: froshiar.store/${typedCleanSubdomain} ✅` : `Available: froshiar.store/${typedCleanSubdomain} ✅`}
                        </span>
                      </div>
                    ) : null}
                  </div>

                  {/* Phone */}
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-bold text-slate-300 mb-1">
                      {isKu ? 'ژمارەی مۆبایل (بۆ پەیوەندی و وەرگرتنی داواکاری لە واتسئەپ):' : 'Phone Number (for orders):'}
                    </label>
                    <input
                      type="tel"
                      placeholder="07708229696"
                      value={newStorePhone}
                      onChange={(e) => setNewStorePhone(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl text-xs bg-slate-950 border border-slate-800 text-white font-mono outline-none"
                    />
                  </div>
                </div>

                {/* Live URL Preview Pill */}
                <div className="p-2.5 rounded-xl bg-emerald-950/30 border border-emerald-800/40 text-emerald-200 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2 truncate" dir="ltr">
                    <Globe className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span className="font-mono text-xs font-bold text-emerald-300 truncate select-all">
                      https://froshiar.store/{newStoreSubdomain || 'your-shop'}
                    </span>
                  </div>
                  <span className="text-[10px] text-emerald-400 font-extrabold uppercase shrink-0">
                    {isKu ? 'بەستەری ڕاستەوخۆ' : 'Live URL'}
                  </span>
                </div>
              </div>

              {/* Step 3: Pricing & Revenue */}
              <div className="p-4 rounded-2xl border border-slate-800 bg-slate-900/50 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs sm:text-sm font-bold text-amber-400 flex items-center gap-2">
                    <DollarSign className="w-4 h-4" />
                    <span>{isKu ? '٣. حسابات و نرخی بەشداریکردنی وێب ستۆر:' : '3. Pricing & Store Fee:'}</span>
                  </label>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  {['Free (0)', '$25', '$50', '$100', '35,000 IQD', '50,000 IQD', '75,000 IQD'].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setNewStorePrice(preset === 'Free (0)' ? '0' : preset)}
                      className="px-2.5 py-1 rounded-lg text-xs font-bold bg-slate-800 hover:bg-slate-700 text-amber-300 border border-slate-700 cursor-pointer transition"
                    >
                      {preset}
                    </button>
                  ))}
                </div>

                <div>
                  <input
                    type="text"
                    placeholder={isKu ? 'نموونە: $50 یان 50000 IQD' : 'e.g. $50 or 50,000 IQD'}
                    value={newStorePrice}
                    onChange={(e) => setNewStorePrice(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl text-xs bg-slate-950 border border-slate-800 text-white font-mono font-bold outline-none"
                  />
                </div>
              </div>

              {/* Step 4: Duration & Expiry */}
              <div className="p-4 rounded-2xl border border-slate-800 bg-slate-900/50 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs sm:text-sm font-bold text-teal-400 flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    <span>{isKu ? '٤. ماوە و بەرواری بەسەرچوونی فرۆشگا:' : '4. Duration & Expiry:'}</span>
                  </label>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                  {[
                    { label: isKu ? '١ مانگ (30 ڕۆژ)' : '1 Month', days: 30 },
                    { label: isKu ? '٣ مانگ (90 ڕۆژ)' : '3 Months', days: 90 },
                    { label: isKu ? '٦ مانگ (180 ڕۆژ)' : '6 Months', days: 180 },
                    { label: isKu ? '١ ساڵ (365 ڕۆژ)' : '1 Year', days: 365 },
                    { label: isKu ? '∞ بێ سنوور' : '∞ Unlimited', days: 'unlimited' as const },
                  ].map((item) => (
                    <button
                      key={item.label}
                      type="button"
                      onClick={() => handleNewStoreDurationPreset(item.days)}
                      className={`p-2 rounded-xl text-xs font-bold border transition cursor-pointer text-center ${
                        newStoreDuration === item.days
                          ? 'bg-teal-600 text-white border-teal-400 font-black shadow-md'
                          : 'bg-slate-800/80 hover:bg-slate-700 text-slate-300 border-slate-700'
                      }`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>

                {/* Dates pickers */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-800">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 mb-1">
                      {isKu ? 'بەرواری دەستپێکردن:' : 'Start Date:'}
                    </label>
                    <input
                      type="date"
                      value={newStoreStartDate}
                      onChange={(e) => setNewStoreStartDate(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl text-xs bg-slate-950 border border-slate-800 text-white font-mono outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 mb-1">
                      {isKu ? 'بەرواری بەسەرچوون:' : 'Expiry Date:'}
                    </label>
                    {newStoreDuration === 'unlimited' ? (
                      <div className="px-3 py-2 rounded-xl text-xs bg-slate-950 border border-slate-800 text-emerald-400 font-extrabold">
                        {isKu ? '∞ بێ سنوور (هەمیشەیی)' : '∞ Unlimited (Lifetime)'}
                      </div>
                    ) : (
                      <input
                        type="date"
                        value={newStoreCustomExpiry}
                        onChange={(e) => setNewStoreCustomExpiry(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl text-xs bg-slate-950 border border-slate-800 text-white font-mono outline-none"
                      />
                    )}
                  </div>
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="pt-4 border-t border-slate-800 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowNewStoreModal(false)}
                  className="px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold border border-slate-700 text-slate-300 hover:text-white hover:bg-slate-800 transition cursor-pointer"
                >
                  {isKu ? 'پاشگەزبوونەوە' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  disabled={newStoreSubmitting || Boolean(liveConflictStore)}
                  className={`px-6 py-2.5 rounded-xl font-black text-xs sm:text-sm shadow-lg flex items-center gap-2 transition cursor-pointer disabled:opacity-50 ${
                    liveConflictStore
                      ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40 cursor-not-allowed shadow-none'
                      : 'bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 shadow-emerald-500/25'
                  }`}
                >
                  {liveConflictStore ? (
                    <>
                      <AlertTriangle className="w-4 h-4 text-rose-400" />
                      <span>{isKu ? 'دۆمەینەکە پێشتر گیراوە ❌' : 'Domain Already Taken ❌'}</span>
                    </>
                  ) : newStoreSubmitting ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>{isKu ? 'خەریکی چالاککردنە...' : 'Activating...'}</span>
                    </>
                  ) : (
                    <>
                      <Globe className="w-4 h-4" />
                      <span>{isKu ? '🚀 چالاککردنی وێب ستۆر و دەرهێنانی وەسڵ' : 'Activate Store & Generate Receipt'}</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
        );
      })()}

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* ── MODAL 6: DEDICATED RENEW / EDIT ONLINE STORE MODAL ──            */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      {editingStoreData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 md:p-6 bg-slate-950/85 backdrop-blur-sm animate-in fade-in duration-200">
          <div
            className={`w-full max-w-xl rounded-3xl border shadow-2xl p-5 sm:p-8 space-y-5 max-h-[94vh] overflow-y-auto ${
              isDarkMode ? 'bg-[#101726] border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
            }`}
          >
            {/* Header */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-teal-500/20 text-teal-400 border border-teal-500/40 flex items-center justify-center font-black">
                  <RotateCcw className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-black">
                    {isKu ? 'نوێکردنەوە و دەستکاریکردنی وێب ستۆر' : 'Renew / Edit Online Store'}
                  </h3>
                  <p className="text-xs text-slate-400 font-mono">
                    {editingStoreData.storeName} ({editingStoreData.subdomain})
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditingStoreData(null)}
                className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEditStore} className="space-y-4">
              {/* Store Name & Subdomain */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    {isKu ? 'ناوی فرۆشگا:' : 'Store Name:'}
                  </label>
                  <input
                    type="text"
                    required
                    value={editStoreName}
                    onChange={(e) => setEditStoreName(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl text-xs bg-slate-950 border border-slate-800 text-white font-bold outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    {isKu ? 'ناوی بەستەر (Subdomain):' : 'Subdomain:'}
                  </label>
                  <input
                    type="text"
                    required
                    value={editStoreSubdomain}
                    onChange={(e) => setEditStoreSubdomain(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-'))}
                    className="w-full px-3 py-2 rounded-xl text-xs bg-slate-950 border border-slate-800 text-white font-mono font-bold outline-none"
                  />
                </div>
              </div>

              {/* Phone & Price */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    {isKu ? 'ژمارەی مۆبایل:' : 'Phone Number:'}
                  </label>
                  <input
                    type="tel"
                    value={editStorePhone}
                    onChange={(e) => setEditStorePhone(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl text-xs bg-slate-950 border border-slate-800 text-white font-mono outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    {isKu ? 'بڕی پارەی دراو:' : 'Price Amount:'}
                  </label>
                  <input
                    type="text"
                    value={editStorePrice}
                    onChange={(e) => setEditStorePrice(e.target.value)}
                    placeholder="e.g. $50"
                    className="w-full px-3 py-2 rounded-xl text-xs bg-slate-950 border border-slate-800 text-white font-mono font-bold outline-none"
                  />
                </div>
              </div>

              {/* Duration Presets to Extend / Renew */}
              <div className="space-y-2 pt-2 border-t border-slate-800">
                <label className="block text-xs font-bold text-teal-400">
                  {isKu ? 'نوێکردنەوە و درێژکردنەوەی ماوە:' : 'Renew / Extend Validity:'}
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    { label: isKu ? '+٣٠ ڕۆژ' : '+30 Days', days: 30 },
                    { label: isKu ? '+٩٠ ڕۆژ' : '+90 Days', days: 90 },
                    { label: isKu ? '+١ ساڵ' : '+1 Year', days: 365 },
                    { label: isKu ? '∞ بێ سنوور' : '∞ Unlimited', days: 'unlimited' as const },
                  ].map((preset) => (
                    <button
                      key={preset.label}
                      type="button"
                      onClick={() => {
                        setEditStoreDuration(preset.days);
                        if (preset.days === 'unlimited') {
                          setEditStoreCustomExpiry('');
                        } else {
                          const base = new Date();
                          base.setDate(base.getDate() + preset.days);
                          setEditStoreCustomExpiry(base.toISOString().split('T')[0]);
                        }
                      }}
                      className="p-2 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 cursor-pointer transition text-center"
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Expiry Date */}
              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1">
                  {isKu ? 'بەرواری نوێی بەسەرچوون:' : 'New Expiry Date:'}
                </label>
                {editStoreDuration === 'unlimited' ? (
                  <div className="px-3 py-2 rounded-xl text-xs bg-slate-950 border border-slate-800 text-emerald-400 font-extrabold">
                    {isKu ? '∞ بێ سنوور (هەمیشەیی)' : '∞ Unlimited (Lifetime)'}
                  </div>
                ) : (
                  <input
                    type="date"
                    value={editStoreCustomExpiry}
                    onChange={(e) => setEditStoreCustomExpiry(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl text-xs bg-slate-950 border border-slate-800 text-white font-mono outline-none"
                  />
                )}
              </div>

              {/* Submit / Cancel */}
              <div className="pt-4 border-t border-slate-800 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setEditingStoreData(null)}
                  className="px-4 py-2 rounded-xl text-xs font-bold border border-slate-700 text-slate-300 hover:text-white hover:bg-slate-800 transition cursor-pointer"
                >
                  {isKu ? 'پاشگەزبوونەوە' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  disabled={editStoreSubmitting}
                  className="px-5 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-black text-xs transition cursor-pointer flex items-center gap-1.5 shadow-md shadow-teal-600/20"
                >
                  {editStoreSubmitting ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <Check className="w-4 h-4" />
                  )}
                  <span>{isKu ? 'پاشەکەوتکردنی گۆڕانکارییەکان' : 'Save Changes'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* ── MODAL 7: DOMAIN OWNERSHIP & COMPLETE DETAILS (ناسنامەی دۆمەین) ── */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      {selectedDomainDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 md:p-6 bg-slate-950/85 backdrop-blur-sm animate-in fade-in duration-200">
          <div
            className={`w-full max-w-2xl rounded-3xl border shadow-2xl overflow-hidden flex flex-col max-h-[92vh] ${
              isDarkMode
                ? 'bg-gradient-to-b from-[#111827] to-[#0b1120] border-cyan-500/40 shadow-cyan-500/10'
                : 'bg-white border-slate-200 shadow-xl'
            }`}
          >
            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between bg-slate-900/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-500 to-blue-600 text-slate-950 flex items-center justify-center font-black shadow-md shadow-cyan-500/20">
                  <Globe className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-black text-white">
                    {isKu ? 'زانیاری و ناسنامەی دۆمەین' : 'Domain Ownership & Details'}
                  </h3>
                  <p className="text-xs text-slate-400">
                    {isKu ? 'ئەم دۆمەینە هی کێیە و زانیاری تەواوی خاوەنەکەی چییە' : 'Identity, ownership and configuration of this domain'}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelectedDomainDetail(null)}
                className="w-9 h-9 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-4 sm:p-6 overflow-y-auto space-y-4 text-xs">
              {/* 1. Large Live URL Banner */}
              <div className="p-4 rounded-2xl bg-cyan-950/40 border border-cyan-500/40 space-y-2">
                <span className="text-[11px] font-bold text-cyan-400 uppercase tracking-wider block">
                  {isKu ? 'بەستەری ڕاستەوخۆی دۆمەین:' : 'Live Domain URL:'}
                </span>
                <div className="flex items-center justify-between gap-2 flex-wrap" dir="ltr">
                  <span className="font-mono text-base sm:text-lg font-black text-cyan-200 select-all">
                    https://froshiar.store/{selectedDomainDetail.subdomain}
                  </span>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => {
                        const url = `https://froshiar.store/${selectedDomainDetail.subdomain}`;
                        navigator.clipboard?.writeText(url);
                        alert(isKu ? `بەستەری دۆمەین کۆپیکرا:\n${url}` : `Domain copied:\n${url}`);
                      }}
                      className="px-3 py-1.5 rounded-xl bg-cyan-600/30 hover:bg-cyan-600/50 text-cyan-200 border border-cyan-500/40 font-bold flex items-center gap-1.5 transition cursor-pointer"
                    >
                      <Copy className="w-3.5 h-3.5" />
                      <span>{isKu ? 'کۆپیکردن' : 'Copy'}</span>
                    </button>

                    <a
                      href={`https://froshiar.store/${selectedDomainDetail.subdomain}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-black flex items-center gap-1.5 transition cursor-pointer"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>{isKu ? 'سەردانیکردن' : 'Visit'}</span>
                    </a>
                  </div>
                </div>
              </div>

              {/* 2. هی کێیە؟ (Domain Ownership Identity) */}
              <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                  <span className="text-sm font-black text-amber-400 flex items-center gap-2">
                    <Users className="w-4 h-4" />
                    <span>{isKu ? 'ئەم دۆمەینە هی کێیە؟ (خاوەنی سەرەکی):' : 'Domain Owner Identity:'}</span>
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                    {isKu ? 'خاوەن هەژمار' : 'Account Owner'}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  {/* Customer Name */}
                  <div className="p-3 rounded-xl bg-slate-800/40 border border-slate-800/60">
                    <span className="text-[11px] font-bold text-slate-400 block mb-1">
                      {isKu ? 'ناوی کڕیار / خاوەن هەژمار:' : 'Owner / Customer Name:'}
                    </span>
                    <strong className="text-sm text-white font-extrabold block">
                      {selectedDomainDetail.customerName || selectedDomainDetail.storeName || (isKu ? 'دیارینەکراو' : 'Unknown')}
                    </strong>
                  </div>

                  {/* Email */}
                  <div className="p-3 rounded-xl bg-slate-800/40 border border-slate-800/60">
                    <span className="text-[11px] font-bold text-slate-400 block mb-1">
                      {isKu ? 'ئیمەیڵی هەژماری بەستراوە:' : 'Account Email:'}
                    </span>
                    <strong className="text-xs sm:text-sm font-mono text-cyan-300 font-bold block truncate" dir="ltr">
                      {selectedDomainDetail.email}
                    </strong>
                  </div>

                  {/* Phone & WhatsApp */}
                  <div className="p-3 rounded-xl bg-slate-800/40 border border-slate-800/60 sm:col-span-2 flex items-center justify-between gap-3 flex-wrap">
                    <div>
                      <span className="text-[11px] font-bold text-slate-400 block mb-0.5">
                        {isKu ? 'ژمارەی مۆبایل / پەیوەندی:' : 'Contact Phone:'}
                      </span>
                      <strong className="text-sm font-mono text-white font-bold" dir="ltr">
                        {selectedDomainDetail.phone || (isKu ? 'دیارینەکراو' : 'Not Provided')}
                      </strong>
                    </div>

                    {selectedDomainDetail.phone && (
                      <a
                        href={`https://wa.me/${selectedDomainDetail.phone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(
                          isKu
                            ? `سڵاو بەڕێز ${selectedDomainDetail.customerName || ''}، پەیوەندیتان پێوە دەکەین دەربارەی وێب ستۆری ${selectedDomainDetail.storeName} (https://froshiar.store/${selectedDomainDetail.subdomain})`
                            : `Hello, regarding your online store https://froshiar.store/${selectedDomainDetail.subdomain}`
                        )}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold flex items-center gap-1.5 transition cursor-pointer shadow-md shadow-emerald-600/20"
                      >
                        <MessageCircle className="w-4 h-4" />
                        <span>{isKu ? 'گفتوگۆ لە واتسئەپ' : 'Chat on WhatsApp'}</span>
                      </a>
                    )}
                  </div>
                </div>
              </div>

              {/* 3. زانیاری فڕۆشگا و حسابات (Store & Subscription Info) */}
              <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-3">
                <span className="text-sm font-black text-emerald-400 flex items-center gap-2">
                  <Store className="w-4 h-4" />
                  <span>{isKu ? 'زانیارییەکانی فرۆشگا و حسابات:' : 'Store & Subscription Details:'}</span>
                </span>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
                  <div className="p-2.5 rounded-xl bg-slate-800/40 border border-slate-800/60">
                    <span className="text-[10px] font-bold text-slate-400 block mb-0.5">
                      {isKu ? 'ناوی فڕۆشگا:' : 'Store Name:'}
                    </span>
                    <strong className="text-white font-bold truncate block">{selectedDomainDetail.storeName}</strong>
                  </div>

                  <div className="p-2.5 rounded-xl bg-slate-800/40 border border-slate-800/60">
                    <span className="text-[10px] font-bold text-slate-400 block mb-0.5">
                      {isKu ? 'دۆخی ماڵپەڕ:' : 'Status:'}
                    </span>
                    <strong className={`font-bold block ${
                      selectedDomainDetail.status === 'suspended' || !selectedDomainDetail.enabled
                        ? 'text-amber-400'
                        : selectedDomainDetail.expiresAt && new Date(selectedDomainDetail.expiresAt).getTime() < Date.now()
                        ? 'text-rose-400'
                        : 'text-emerald-400'
                    }`}>
                      {selectedDomainDetail.status === 'suspended' || !selectedDomainDetail.enabled
                        ? (isKu ? 'ڕاگیراو' : 'Suspended')
                        : selectedDomainDetail.expiresAt && new Date(selectedDomainDetail.expiresAt).getTime() < Date.now()
                        ? (isKu ? 'بەسەرچوو' : 'Expired')
                        : (isKu ? 'چالاکە' : 'Active')}
                    </strong>
                  </div>

                  <div className="p-2.5 rounded-xl bg-slate-800/40 border border-slate-800/60">
                    <span className="text-[10px] font-bold text-slate-400 block mb-0.5">
                      {isKu ? 'بڕی پارەی دراو:' : 'Price Paid:'}
                    </span>
                    <strong className="text-amber-400 font-mono font-bold block">
                      {selectedDomainDetail.priceAmount || (isKu ? 'بێبەرامبەر' : 'Free')}
                    </strong>
                  </div>

                  <div className="p-2.5 rounded-xl bg-slate-800/40 border border-slate-800/60">
                    <span className="text-[10px] font-bold text-slate-400 block mb-0.5">
                      {isKu ? 'ماوەی بەشداریکردن:' : 'Duration:'}
                    </span>
                    <strong className="text-white font-bold block">
                      {selectedDomainDetail.durationDays ? `${selectedDomainDetail.durationDays} ${isKu ? 'ڕۆژ' : 'days'}` : (isKu ? 'بێ سنوور' : 'Unlimited')}
                    </strong>
                  </div>

                  <div className="p-2.5 rounded-xl bg-slate-800/40 border border-slate-800/60 col-span-2">
                    <span className="text-[10px] font-bold text-slate-400 block mb-0.5">
                      {isKu ? 'بەرواری دەستپێکردن:' : 'Start Date:'}
                    </span>
                    <strong className="text-white font-mono block">
                      {formatDate(selectedDomainDetail.startDate || selectedDomainDetail.activatedAt)}
                    </strong>
                  </div>

                  <div className="p-2.5 rounded-xl bg-slate-800/40 border border-slate-800/60 col-span-2">
                    <span className="text-[10px] font-bold text-slate-400 block mb-0.5">
                      {isKu ? 'بەرواری بەسەرچوون:' : 'Expiry Date:'}
                    </span>
                    <strong className={`font-mono block ${
                      selectedDomainDetail.expiresAt && new Date(selectedDomainDetail.expiresAt).getTime() < Date.now()
                        ? 'text-rose-400'
                        : 'text-emerald-300'
                    }`}>
                      {selectedDomainDetail.expiresAt ? formatDate(selectedDomainDetail.expiresAt) : (isKu ? 'بێ سنوور (هەمیشەیی)' : 'Unlimited (Lifetime)')}
                    </strong>
                  </div>
                </div>
              </div>

              {/* 4. کردارەکانی دۆمەین (Actions Bar) */}
              <div className="p-4 rounded-2xl bg-slate-900/40 border border-slate-800 flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-2 flex-wrap">
                  {/* Print Official Receipt Button */}
                  <button
                    type="button"
                    onClick={() => {
                      const storeUrl = `https://froshiar.store/${selectedDomainDetail.subdomain}`;
                      setStoreActivationData({
                        employee: {
                          id: selectedDomainDetail.id,
                          email: selectedDomainDetail.email,
                          displayName: selectedDomainDetail.customerName || selectedDomainDetail.storeName,
                          managerEmail: selectedDomainDetail.email,
                          phone: selectedDomainDetail.phone,
                          createdAt: selectedDomainDetail.startDate || new Date().toISOString(),
                          status: 'active',
                          permissions: ALL_ACTIVE_PERMISSIONS,
                        },
                        storeName: selectedDomainDetail.storeName,
                        subdomain: selectedDomainDetail.subdomain,
                        url: storeUrl,
                        email: selectedDomainDetail.email,
                        phone: selectedDomainDetail.phone,
                        activatedAt: selectedDomainDetail.activatedAt || selectedDomainDetail.startDate || new Date().toISOString(),
                      });
                      setActivationCountdown(25);
                      setActivationModalLang(isKu ? 'ku' : 'en');
                    }}
                    className="px-3.5 py-2 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 font-bold flex items-center gap-1.5 transition cursor-pointer"
                  >
                    <Receipt className="w-4 h-4" />
                    <span>{isKu ? 'دەرهێنانی وەسڵ' : 'View Receipt'}</span>
                  </button>

                  {/* Toggle Suspend/Unsuspend */}
                  <button
                    type="button"
                    onClick={() => {
                      handleToggleOnlineStoreByDoc(selectedDomainDetail);
                      setSelectedDomainDetail(null);
                    }}
                    className={`px-3.5 py-2 rounded-xl font-bold border flex items-center gap-1.5 transition cursor-pointer ${
                      selectedDomainDetail.status === 'suspended' || !selectedDomainDetail.enabled
                        ? 'bg-emerald-600 hover:bg-emerald-500 text-white border-emerald-400'
                        : 'bg-amber-500/15 hover:bg-amber-500/25 text-amber-400 border-amber-500/30'
                    }`}
                  >
                    <Power className="w-4 h-4" />
                    <span>
                      {selectedDomainDetail.status === 'suspended' || !selectedDomainDetail.enabled
                        ? (isKu ? 'کاراکردنەوەی وێبسایت' : 'Unsuspend Store')
                        : (isKu ? 'ڕاگرتنی وێبسایت' : 'Suspend Store')}
                    </span>
                  </button>
                </div>

                {/* Delete and Free Domain Button */}
                <button
                  type="button"
                  onClick={() => {
                    handleDeleteOnlineStoreByDoc(selectedDomainDetail);
                    setSelectedDomainDetail(null);
                  }}
                  className="px-3.5 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 font-bold flex items-center gap-1.5 transition cursor-pointer"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>{isKu ? 'سڕینەوە و ئازادکردنی دۆمەین' : 'Delete & Free Domain'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
