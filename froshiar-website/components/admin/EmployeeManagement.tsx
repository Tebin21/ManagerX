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

  // Delete Employee
  const handleDeleteEmployee = async (emp: EmployeeAccount) => {
    const confirmMsg = isKu
      ? `ئایا دڵنیایت لە سڕینەوەی تەواوەتی کارمەند "${emp.displayName}"؟ ئەم کارە ناگەڕێتەوە.`
      : `Are you sure you want to permanently delete employee "${emp.displayName}"?`;

    if (!window.confirm(confirmMsg)) return;

    const db = getClientFirestore();
    if (!db) return;

    try {
      const docRef = doc(db, 'employee_accounts', getCleanDocId(emp.email) || emp.id);
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
      const docRef = doc(db, 'employee_accounts', getCleanDocId(emp.email) || emp.id);
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

      const finalStoreName = storeName.trim() || formName.trim() || selectedEmployee.displayName;
      const finalSubdomain = storeSubdomain.trim() || slugifyStoreName(finalStoreName) || getCleanDocId(selectedEmployee.displayName);

      const updatedStore: OnlineStoreConfig | undefined = storeEnabled
        ? {
            enabled: true,
            storeName: finalStoreName,
            subdomain: finalSubdomain,
            status: selectedEmployee.onlineStore?.status || 'active',
            activatedAt: selectedEmployee.onlineStore?.activatedAt || new Date().toISOString(),
          }
        : undefined;

      const startDate = formStartedAt ? new Date(formStartedAt).toISOString() : selectedEmployee.startedAt || selectedEmployee.createdAt;
      const expDate = formExpiresAt ? new Date(formExpiresAt).toISOString() : undefined;

      const payload: Partial<EmployeeAccount> = {
        displayName: formName.trim() || cleanEmail.split('@')[0],
        email: cleanEmail,
        password: formPassword.trim() ? formPassword.trim() : (selectedEmployee.password || ''),
        managerEmail: formManagerEmail.trim().toLowerCase() || cleanEmail,
        phone: formPhone.trim(),
        priceAmount: formPrice.trim(),
        startedAt: startDate,
        expiresAt: expDate,
        durationDays: typeof formDuration === 'number' ? formDuration : undefined,
        limits: updatedLimits,
        onlineStore: updatedStore,
      };

      await setDoc(docRef, payload, { merge: true });

      // Synchronize to user_subscriptions
      try {
        const subRef = doc(db, 'user_subscriptions', docId);
        await setDoc(
          subRef,
          {
            id: docId,
            email: cleanEmail,
            customerName: formName.trim() || cleanEmail.split('@')[0],
            phone: formPhone.trim(),
            status: selectedEmployee.status || 'active',
            startDate: startDate,
            expiresAt: expDate || null,
            storefront_enabled: storeEnabled,
            onlineStoreActive: storeEnabled,
            onlineStore: updatedStore || null,
            priceAmount: formPrice.trim() || null,
            limits: updatedLimits,
            updatedAt: new Date().toISOString(),
          },
          { merge: true }
        );

        if (storeEnabled) {
          await setDoc(
            doc(db, 'store_activations', docId),
            {
              email: cleanEmail,
              enabled: true,
              status: selectedEmployee.onlineStore?.status || 'active',
              storeName: finalStoreName,
              subdomain: finalSubdomain,
              activatedAt: new Date().toISOString(),
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
    setFormName('');
    setFormEmail('');
    setFormPassword(generateRandomPassword());
    setFormManagerEmail('');
    setFormPhone('');
    setFormPrice('');
    setFormDuration(30);

    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    setFormStartedAt(todayStr);

    const future = new Date(today);
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
      if (!formName.trim() || !formEmail.trim() || !formPassword.trim() || !formManagerEmail.trim()) {
        setFormError(
          isKu
            ? 'تکایە هەموو خانە سەرەکییەکان (ناو، ئیمەیڵ، تێپەڕەوشە، ئیمەیڵی بەڕێوەبەر) پڕبکەرەوە'
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

      const finalStoreName = storeName.trim() || formName.trim() || cleanEmail.split('@')[0];
      const finalSubdomain = storeSubdomain.trim() || slugifyStoreName(finalStoreName) || docId;

      const updatedStore: OnlineStoreConfig | undefined = storeEnabled
        ? {
            enabled: true,
            storeName: finalStoreName,
            subdomain: finalSubdomain,
            status: 'active',
            activatedAt: new Date().toISOString(),
          }
        : undefined;

      const startDate = formStartedAt ? new Date(formStartedAt).toISOString() : new Date().toISOString();
      const expDate = formExpiresAt
        ? new Date(formExpiresAt).toISOString()
        : typeof formDuration === 'number' && formDuration > 0
        ? new Date(Date.now() + formDuration * 24 * 60 * 60 * 1000).toISOString()
        : undefined;

      const mgrEmail = addModalMode === 'upgrade_registered' ? cleanEmail : (formManagerEmail.trim().toLowerCase() || cleanEmail);

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
      const newAccount: EmployeeAccount = {
        id: `emp_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        email: cleanEmail,
        displayName: formName.trim() || cleanEmail.split('@')[0],
        password: addModalMode === 'create_custom' ? formPassword.trim() : '',
        managerEmail: mgrEmail,
        phone: formPhone.trim(),
        priceAmount: formPrice.trim(),
        durationDays: typeof formDuration === 'number' ? formDuration : undefined,
        startedAt: startDate,
        expiresAt: expDate,
        status: 'active',
        limits: updatedLimits,
        onlineStore: updatedStore,
        permissions: addModalMode === 'upgrade_registered' ? ALL_ACTIVE_PERMISSIONS : DEFAULT_PERMISSIONS,
        createdAt: new Date().toISOString(),
        accountType: addModalMode === 'upgrade_registered' ? 'registered' : 'custom',
        role: 'user',
        upgradeReceipt: upgradeReceiptData,
      };

      const docRef = doc(db, 'employee_accounts', docId);
      await setDoc(docRef, newAccount, { merge: true });

      // 2. Synchronize to user_subscriptions so cloud verification activates in mobile app
      try {
        const subRef = doc(db, 'user_subscriptions', docId);
        await setDoc(
          subRef,
          {
            id: docId,
            email: cleanEmail,
            customerName: formName.trim() || cleanEmail.split('@')[0],
            phone: formPhone.trim(),
            status: 'active',
            tier: addModalMode === 'upgrade_registered' ? 'pro' : 'standard',
            planId: formDuration === 'unlimited' || !expDate ? 'lifetime' : `${formDuration}d`,
            startDate: startDate,
            expiresAt: expDate || null,
            storefront_enabled: storeEnabled,
            onlineStoreActive: storeEnabled,
            onlineStore: updatedStore || null,
            priceAmount: formPrice.trim() || null,
            limits: updatedLimits,
            upgradeReceipt: upgradeReceiptData,
            upgradedAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
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

        {/* Action Buttons: 1. Upgrade Registered User | 2. Create Account with Password */}
        <div className="flex items-center gap-2.5 flex-wrap shrink-0">
          {/* Button 1: Upgrade Registered User */}
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

          {/* Button 2: Create Custom Account with Password */}
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
                        <span
                          className={`text-[11px] px-2.5 py-0.5 rounded-md font-bold border ${
                            emp.onlineStore?.enabled && emp.onlineStore?.status === 'active'
                              ? isDarkMode
                                ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                                : 'bg-emerald-100 text-emerald-800 border-emerald-300'
                              : isDarkMode
                              ? 'bg-slate-800 text-slate-400 border-slate-700'
                              : 'bg-slate-100 text-slate-700 border-slate-300 font-semibold'
                          }`}
                        >
                          {emp.onlineStore?.enabled && emp.onlineStore?.status === 'active'
                            ? (emp.onlineStore?.storeName || (isKu ? 'چالاکە' : 'Active'))
                            : (isKu ? 'ناچالاکە' : 'Disabled')}
                        </span>

                        <button
                          onClick={() => handleToggleOnlineStore(emp)}
                          className={`px-2.5 py-0.5 rounded-md text-[11px] font-bold cursor-pointer border transition ${
                            emp.onlineStore?.status === 'active'
                              ? isDarkMode ? 'bg-rose-500/15 text-rose-400 border-rose-500/30' : 'bg-rose-100 text-rose-800 border-rose-300 hover:bg-rose-200 font-bold'
                              : isDarkMode ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' : 'bg-emerald-100 text-emerald-800 border-emerald-300 hover:bg-emerald-200 font-bold'
                          }`}
                        >
                          {emp.onlineStore?.status === 'active'
                            ? (isKu ? 'وەستاندنی وێبسایت' : 'Suspend Web')
                            : (isKu ? 'چالاککردنی وێبسایت' : 'Activate Web')}
                        </button>
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

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5 sm:gap-4">
                    {/* Name */}
                    <div>
                      <label className={`block text-xs font-bold mb-1.5 ${isDarkMode ? 'text-slate-300' : 'text-slate-800'}`}>
                        {isKu ? 'ناوی کارمەند / لق *' : 'Display Name / Store *'}
                      </label>
                      <input
                        type="text"
                        required
                        placeholder={isKu ? 'نموونە: ئارام ئەحمەد' : 'e.g. John Doe'}
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
                        {isKu ? 'ئیمەیڵی کارمەند (بۆ چوونەژوورەوە) *' : 'Employee Login Email *'}
                      </label>
                      <input
                        type="email"
                        required
                        placeholder="cashier@market.com"
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

                    {/* Supervising Manager Email */}
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

              {/* Section 4: Online Storefront Section */}
              <div
                className={`p-4 sm:p-5 rounded-2xl border space-y-3.5 ${
                  isDarkMode ? 'bg-[#0E1524] border-slate-800' : 'bg-slate-50/90 border-slate-200'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs sm:text-sm font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-2">
                    <Globe className="w-4 h-4" />
                    <span>{isKu ? 'ستۆری ئۆنلاین (Online Storefront):' : 'Online Storefront:'}</span>
                  </span>
                  <label className="flex items-center gap-2 cursor-pointer text-xs sm:text-sm font-bold">
                    <input
                      type="checkbox"
                      checked={storeEnabled}
                      onChange={(e) => {
                        const checked = e.target.checked;
                        setStoreEnabled(checked);
                        if (checked && !storeSubdomain) {
                          setStoreSubdomain(slugifyStoreName(storeName || formName));
                        }
                      }}
                      className="w-4 h-4 rounded text-emerald-600 cursor-pointer"
                    />
                    <span className={isDarkMode ? 'text-slate-200' : 'text-slate-800'}>{isKu ? 'چالاککردنی ستۆری ئۆنلاین' : 'Enable Storefront'}</span>
                  </label>
                </div>

                {storeEnabled && (
                  <div className="space-y-3 pt-2">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                      {/* Store Name */}
                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <label className={`block text-xs font-bold ${isDarkMode ? 'text-slate-300' : 'text-slate-800'}`}>
                            {isKu ? 'ناوی فرۆشگا / مارکێت' : 'Store Display Name'}
                          </label>
                          <button
                            type="button"
                            onClick={() => {
                              const generated = slugifyStoreName(storeName || formName);
                              if (generated) setStoreSubdomain(generated);
                            }}
                            className="text-[10px] text-purple-600 dark:text-purple-400 font-bold hover:underline cursor-pointer"
                          >
                            {isKu ? '🪄 دروستکردنی ناوی بەستەر' : '🪄 Generate Slug'}
                          </button>
                        </div>
                        <input
                          type="text"
                          placeholder={isKu ? 'نموونە: مارکێتی ئارام' : 'Store name'}
                          value={storeName}
                          onChange={(e) => {
                            const val = e.target.value;
                            setStoreName(val);
                            if (!storeSubdomain) {
                              setStoreSubdomain(slugifyStoreName(val));
                            }
                          }}
                          className={`w-full px-4 py-2.5 rounded-xl text-xs sm:text-sm border outline-none font-bold ${
                            isDarkMode ? 'bg-[#10182B] border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-950 shadow-2xs'
                          }`}
                          style={{ color: isDarkMode ? '#FFFFFF' : '#0F172A' }}
                        />
                      </div>

                      {/* Subdomain with Fixed Domain Prefix */}
                      <div>
                        <label className={`block text-xs font-bold mb-1.5 ${isDarkMode ? 'text-slate-300' : 'text-slate-800'}`}>
                          {isKu ? 'ناوی بەستەر / Subdomain (بەستەری فرۆشیار جێگیرە)' : 'Subdomain / Link (Locked Prefix)'}
                        </label>
                        <div
                          className={`flex items-center rounded-xl border overflow-hidden transition focus-within:ring-2 focus-within:ring-emerald-500 shadow-2xs ${
                            isDarkMode ? 'bg-[#10182B] border-slate-700' : 'bg-white border-slate-300'
                          }`}
                          dir="ltr"
                        >
                          {/* Locked Prefix */}
                          <div className={`px-3 py-2.5 font-mono text-xs font-bold select-none shrink-0 flex items-center gap-1 border-r ${
                            isDarkMode
                              ? 'bg-slate-800 text-purple-300 border-slate-700'
                              : 'bg-slate-100 text-purple-800 border-slate-300'
                          }`}>
                            <Globe className="w-3.5 h-3.5 text-purple-500" />
                            <span>froshiar.com/store/</span>
                          </div>
                          {/* User-editable Slug */}
                          <input
                            type="text"
                            required={storeEnabled}
                            placeholder="aram-market"
                            value={storeSubdomain}
                            onChange={(e) => {
                              const clean = e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-');
                              setStoreSubdomain(clean);
                            }}
                            className={`w-full px-3 py-2.5 bg-transparent text-xs sm:text-sm font-mono font-black outline-none ${
                              isDarkMode ? 'text-white placeholder-slate-500' : 'text-slate-950 placeholder-slate-400'
                            }`}
                            style={{ color: isDarkMode ? '#FFFFFF' : '#000000', opacity: 1 }}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Live Storefront Link Preview Box */}
                    <div className={`p-3 rounded-xl border flex items-center justify-between gap-2.5 text-xs flex-wrap ${
                      isDarkMode
                        ? 'bg-emerald-950/20 border-emerald-800/50 text-emerald-200'
                        : 'bg-emerald-50 border-emerald-200 text-emerald-900'
                    }`}>
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="w-7 h-7 rounded-lg bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                          <Globe className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <span className="text-[11px] font-extrabold block text-emerald-700 dark:text-emerald-300">
                            {isKu ? 'بەستەری تەواوی ستۆری ئۆنلاین بۆ ئەم کارمەندە:' : 'Live Online Storefront URL:'}
                          </span>
                          <span
                            className="font-mono text-xs font-black truncate block select-all"
                            style={{ color: isDarkMode ? '#6EE7B7' : '#064E3B' }}
                          >
                            https://froshiar.com/store/{storeSubdomain || 'my-shop'}
                          </span>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          const url = `https://froshiar.com/store/${storeSubdomain || 'store'}`;
                          navigator.clipboard?.writeText(url);
                          alert(isKu ? `بەستەری وێبسایت کۆپیکرا:\n${url}` : `Link copied:\n${url}`);
                        }}
                        className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition cursor-pointer flex items-center gap-1.5 shadow-xs shrink-0"
                      >
                        <Copy className="w-3.5 h-3.5" />
                        <span>{isKu ? 'کۆپیکردنی لینک' : 'Copy URL'}</span>
                      </button>
                    </div>
                  </div>
                )}
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

              {/* Section 4: Online Storefront Section */}
              <div
                className={`p-4 sm:p-5 rounded-2xl border space-y-3.5 ${
                  isDarkMode ? 'bg-[#0E1524] border-slate-800' : 'bg-slate-50/90 border-slate-200'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs sm:text-sm font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-2">
                    <Globe className="w-4 h-4" />
                    <span>{isKu ? 'ستۆری ئۆنلاین (Online Storefront):' : 'Online Storefront:'}</span>
                  </span>
                  <label className="flex items-center gap-2 cursor-pointer text-xs sm:text-sm font-bold">
                    <input
                      type="checkbox"
                      checked={storeEnabled}
                      onChange={(e) => {
                        const checked = e.target.checked;
                        setStoreEnabled(checked);
                        if (checked && !storeSubdomain) {
                          setStoreSubdomain(slugifyStoreName(storeName || formName));
                        }
                      }}
                      className="w-4 h-4 rounded text-emerald-600 cursor-pointer"
                    />
                    <span className={isDarkMode ? 'text-slate-200' : 'text-slate-800'}>{isKu ? 'چالاککردنی ستۆری ئۆنلاین' : 'Enable Storefront'}</span>
                  </label>
                </div>

                {storeEnabled && (
                  <div className="space-y-3 pt-2">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                      {/* Store Name */}
                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <label className={`block text-xs font-bold ${isDarkMode ? 'text-slate-300' : 'text-slate-800'}`}>
                            {isKu ? 'ناوی فرۆشگا / مارکێت' : 'Store Display Name'}
                          </label>
                          <button
                            type="button"
                            onClick={() => {
                              const generated = slugifyStoreName(storeName || formName);
                              if (generated) setStoreSubdomain(generated);
                            }}
                            className="text-[10px] text-purple-600 dark:text-purple-400 font-bold hover:underline cursor-pointer"
                          >
                            {isKu ? '🪄 دروستکردنی ناوی بەستەر' : '🪄 Generate Slug'}
                          </button>
                        </div>
                        <input
                          type="text"
                          placeholder={isKu ? 'نموونە: مارکێتی ئارام' : 'Store name'}
                          value={storeName}
                          onChange={(e) => {
                            const val = e.target.value;
                            setStoreName(val);
                            if (!storeSubdomain) {
                              setStoreSubdomain(slugifyStoreName(val));
                            }
                          }}
                          className={`w-full px-4 py-2.5 rounded-xl text-xs sm:text-sm border outline-none font-bold ${
                            isDarkMode ? 'bg-[#10182B] border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-950 shadow-2xs'
                          }`}
                          style={{ color: isDarkMode ? '#FFFFFF' : '#0F172A' }}
                        />
                      </div>

                      {/* Subdomain with Fixed Domain Prefix */}
                      <div>
                        <label className={`block text-xs font-bold mb-1.5 ${isDarkMode ? 'text-slate-300' : 'text-slate-800'}`}>
                          {isKu ? 'ناوی بەستەر / Subdomain (بەستەری فرۆشیار جێگیرە)' : 'Subdomain / Link (Locked Prefix)'}
                        </label>
                        <div
                          className={`flex items-center rounded-xl border overflow-hidden transition focus-within:ring-2 focus-within:ring-emerald-500 shadow-2xs ${
                            isDarkMode ? 'bg-[#10182B] border-slate-700' : 'bg-white border-slate-300'
                          }`}
                          dir="ltr"
                        >
                          {/* Locked Prefix */}
                          <div className={`px-3 py-2.5 font-mono text-xs font-bold select-none shrink-0 flex items-center gap-1 border-r ${
                            isDarkMode
                              ? 'bg-slate-800 text-purple-300 border-slate-700'
                              : 'bg-slate-100 text-purple-800 border-slate-300'
                          }`}>
                            <Globe className="w-3.5 h-3.5 text-purple-500" />
                            <span>froshiar.com/store/</span>
                          </div>
                          {/* User-editable Slug */}
                          <input
                            type="text"
                            required={storeEnabled}
                            placeholder="aram-market"
                            value={storeSubdomain}
                            onChange={(e) => {
                              const clean = e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-');
                              setStoreSubdomain(clean);
                            }}
                            className={`w-full px-3 py-2.5 bg-transparent text-xs sm:text-sm font-mono font-black outline-none ${
                              isDarkMode ? 'text-white placeholder-slate-500' : 'text-slate-950 placeholder-slate-400'
                            }`}
                            style={{ color: isDarkMode ? '#FFFFFF' : '#000000', opacity: 1 }}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Live Storefront Link Preview Box */}
                    <div className={`p-3 rounded-xl border flex items-center justify-between gap-2.5 text-xs flex-wrap ${
                      isDarkMode
                        ? 'bg-emerald-950/20 border-emerald-800/50 text-emerald-200'
                        : 'bg-emerald-50 border-emerald-200 text-emerald-900'
                    }`}>
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="w-7 h-7 rounded-lg bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                          <Globe className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <span className="text-[11px] font-extrabold block text-emerald-700 dark:text-emerald-300">
                            {isKu ? 'بەستەری تەواوی ستۆری ئۆنلاین بۆ ئەم کارمەندە:' : 'Live Online Storefront URL:'}
                          </span>
                          <span
                            className="font-mono text-xs font-black truncate block select-all"
                            style={{ color: isDarkMode ? '#6EE7B7' : '#064E3B' }}
                          >
                            https://froshiar.com/store/{storeSubdomain || 'my-shop'}
                          </span>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          const url = `https://froshiar.com/store/${storeSubdomain || 'store'}`;
                          navigator.clipboard?.writeText(url);
                          alert(isKu ? `بەستەری وێبسایت کۆپیکرا:\n${url}` : `Link copied:\n${url}`);
                        }}
                        className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition cursor-pointer flex items-center gap-1.5 shadow-xs shrink-0"
                      >
                        <Copy className="w-3.5 h-3.5" />
                        <span>{isKu ? 'کۆپیکردنی لینک' : 'Copy URL'}</span>
                      </button>
                    </div>
                  </div>
                )}
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
    </div>
  );
}
