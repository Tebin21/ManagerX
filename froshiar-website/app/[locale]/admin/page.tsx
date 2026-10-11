'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Users,
  Smartphone,
  Activity,
  Search,
  RefreshCw,
  Lock,
  Apple,
  Clock,
  Building2,
  Phone,
  Mail,
  CheckCircle2,
  Calendar,
  Layers,
  FileSpreadsheet,
  Moon,
  Sun,
  Menu,
  ArrowRight,
  ArrowLeft,
  TrendingUp,
  Database,
  Globe,
  ShieldCheck,
  Check,
  ChevronDown,
  Key,
} from 'lucide-react';
import LicenseManagement from '@/components/admin/LicenseManagement';

interface Stats {
  totalInstalls: number;
  installsToday: number;
  iosInstalls: number;
  androidInstalls: number;
  totalOpens: number;
  totalUsers: number;
  activeUsersToday: number;
  activeUsers7Days: number;
  recentEvents: Array<{
    id: string;
    event_type: string;
    user_email: string | null;
    platform: string;
    created_at: string;
  }>;
}

interface UserRecord {
  id: string;
  user_id: string;
  email: string | null;
  phone: string | null;
  display_name: string | null;
  business_name: string | null;
  device_id: string | null;
  platform: string;
  app_version: string;
  created_at: string;
  last_login_at: string;
  login_count: number;
}

interface InstallRecord {
  id: string;
  device_id: string;
  platform: string;
  os_version: string;
  app_version: string;
  brand: string;
  model_name: string;
  first_installed_at: string;
  last_seen_at: string;
  open_count: number;
}

// ─── Translations Dictionary ────────────────────────────────────────────────
const DICTIONARY = {
  ku: {
    adminTitle: 'داشبۆردی ئەدمین',
    adminSubtitle: 'بەڕێوەبردنی بەکارهێنەران و ئەپ',
    adminDescription: 'چاودێریکردنی وردی داگرتنەکان و بەکارهێنەرانی چوونەژوورەوە لە کاتی ڕاستەقینەدا',
    liveBadge: 'ڕاستەوخۆ',
    refresh: 'نوێکردنەوە',
    autoRefresh: 'نوێکردنەوەی خۆکار',
    paused: 'وەستێنراو',
    logout: 'دەرچوون',
    dateFilterLabel: 'فلتەری بەروار:',
    allTime: 'هەموو کات',
    today: 'ئەمڕۆ',
    yesterday: 'دوێنێ',
    last7Days: '٧ ڕۆژی ڕابردوو',
    last30Days: '٣٠ ڕۆژی ڕابردوو',
    thisMonth: 'ئەم مانگە',
    thisYear: 'ئەمساڵ',
    custom: 'کاستەم',
    systemSummary: 'پوختەی سیستەم',
    systemRealtime: 'ئامارەکانی سیستەم لە کاتی خۆیدا',
    systemStatus: 'دۆخی سیستەم',
    operational: 'Operational',
    totalInstallsTitle: 'کۆی تۆمارەکان (داگرتنەکان)',
    todayActiveTitle: 'چالاک و لۆگینی ئەمڕۆ',
    registeredUsersTitle: 'بەکارهێنەرانی فەرمی',
    autoRefreshEnabled: 'نوێکردنەوەی ئۆتۆماتیکی پێکراوە',
    lastUpdated: 'دوایین نوێکردنەوە:',
    now: 'ئێستا',
    usersTab: 'بەکارهێنەرە تۆمارکراوەکان',
    usersTabSub: 'لیستی بەکارهێنەرانی چوونەژوورەوە و ناوی مارکێت',
    installsTab: 'ئامێرەکان و داگرتنەکان',
    installsTabSub: 'ئامار و ئایدی ئامێرە داگیراوەکان (iOS / Android)',
    feedTab: 'چالاکییە ڕاستەوخۆکان',
    feedTabSub: 'تۆماری چرکەبەچرکەی لۆگین و کردنەوەی ئەپ',
    licensesTab: 'لایسێنسەکان',
    licensesTabSub: 'دروستکردن، ژمارەی ئایتم، کۆنترۆڵی ئۆنلاین',
    exportCsv: 'دەرهێنانی داتاکان بە فایلی Excel (CSV)',
    usersTableTitle: 'تۆماری بەکارهێنەرانی چوونەژوورەوە',
    usersTableSub: 'داتای ١٠٠٪ ڕاستەقینە لە بنکەی داتای Neon PostgreSQL',
    installsTableTitle: 'ئامێرە دابەزێنراوەکان و جۆری سیستەم',
    feedTableTitle: 'تۆماری ڕاستەوخۆی چالاکییەکان',
    licensesTableTitle: 'بەڕێوەبردنی لایسێنسەکان و سەبسکرایپشن',
    licensesTableSub: 'دروستکردنی لایسێنسی فەرمی بە کلیلەکانی Ed25519 بۆ ئامێرەکانی فرۆشیار',
    allPlatforms: 'هەموو پلاتفۆڕمەکان',
    searchPlaceholder: 'گەڕان بەپێی ئیمەیڵ، ناو، ناوی کۆمپانیا، یان ئایدی ئامێر...',
    noUsersFound: 'هیچ بەکارهێنەرێک نەدۆزرایەوە.',
    noInstallsFound: 'هیچ ئامێرێکی داگیراو نەدۆزرایەوە.',
    noEventsFound: 'هیچ چالاکییەکی نوێ تۆمار نەکراوە.',
    lastLogin: 'دوایین لۆگین:',
    firstInstall: 'یەکەم داگرتن:',
    lastSeen: 'دوایین چالاکی:',
    appVersion: 'وەشانی ئەپ:',
    loginsCount: 'لۆگین',
    opensCount: 'کردنەوە',
    userLoginEvent: 'چوونەژوورەوەی نوێی بەکارهێنەر',
    appOpenEvent: 'کردنەوەی ئەپ و سیگناڵی لایڤ',
    device: 'ئامێر',
    user: 'بەکارهێنەر',
    loginTitle: 'فرۆشیار · بەڕێوەبردن',
    loginSubtitle: 'Froshiar System Administration Portal',
    usernameLabel: 'ناوی بەکارهێنەر',
    usernamePlaceholder: 'ناوی بەکارهێنەر بنووسە',
    passwordLabel: 'تێپەڕەوشە',
    passwordPlaceholder: '••••••••',
    loginButton: 'چوونەژوورەوە بۆ پانێڵ',
    loginError: 'ناوی بەکارهێنەر یان تێپەڕەوشە هەڵەیە. تکایە دووبارە هەوڵ بدەرەوە.',
    darkMode: 'دۆخی تاریک',
    lightMode: 'دۆخی ڕۆشن',
  },
  en: {
    adminTitle: 'Admin Dashboard',
    adminSubtitle: 'App & Users Management',
    adminDescription: 'Real-time telemetry tracking of app installs, downloads, and active user logins',
    liveBadge: 'LIVE',
    refresh: 'Refresh',
    autoRefresh: 'Auto Refresh',
    paused: 'Paused',
    logout: 'Logout',
    dateFilterLabel: 'Date Filter:',
    allTime: 'All Time',
    today: 'Today',
    yesterday: 'Yesterday',
    last7Days: 'Last 7 Days',
    last30Days: 'Last 30 Days',
    thisMonth: 'This Month',
    thisYear: 'This Year',
    custom: 'Custom',
    systemSummary: 'System Summary',
    systemRealtime: 'Live real-time system metrics',
    systemStatus: 'System Status',
    operational: 'Operational',
    totalInstallsTitle: 'Total App Installs',
    todayActiveTitle: 'Active Users Today',
    registeredUsersTitle: 'Registered Users',
    autoRefreshEnabled: 'Auto-refresh enabled',
    lastUpdated: 'Last updated:',
    now: 'Just now',
    usersTab: 'Registered Users',
    usersTabSub: 'List of logged-in accounts and store names',
    installsTab: 'Devices & Installs',
    installsTabSub: 'Device hardware IDs & platforms (iOS / Android)',
    feedTab: 'Live Activity Feed',
    feedTabSub: 'Real-time stream of logins and app launches',
    licensesTab: 'Licenses & Plans',
    licensesTabSub: 'Generate, item limits, online control',
    exportCsv: 'Export Data to Excel (CSV)',
    usersTableTitle: 'Logged-in User Accounts',
    usersTableSub: '100% real data from Neon PostgreSQL database',
    installsTableTitle: 'Device Installations & OS',
    feedTableTitle: 'Real-Time Event Stream',
    licensesTableTitle: 'License & Subscription Management',
    licensesTableSub: 'Cryptographically signed Ed25519 licenses bound to hardware Device ID',
    allPlatforms: 'All Platforms',
    searchPlaceholder: 'Search by email, name, business, or device ID...',
    noUsersFound: 'No users found.',
    noInstallsFound: 'No device installs found.',
    noEventsFound: 'No recent activity recorded.',
    lastLogin: 'Last Login:',
    firstInstall: 'First Installed:',
    lastSeen: 'Last Active:',
    appVersion: 'App Version:',
    loginsCount: 'Logins',
    opensCount: 'Launches',
    userLoginEvent: 'User Logged In',
    appOpenEvent: 'App Opened / Ping',
    device: 'Device',
    user: 'User',
    loginTitle: 'Froshiar · Administration',
    loginSubtitle: 'Froshiar System Administration Portal',
    usernameLabel: 'Username',
    usernamePlaceholder: 'Enter username',
    passwordLabel: 'Password',
    passwordPlaceholder: '••••••••',
    loginButton: 'Sign In to Panel',
    loginError: 'Invalid username or password. Please try again.',
    darkMode: 'Dark Mode',
    lightMode: 'Light Mode',
  },
};

export default function AdminDashboardPage() {
  // ─── Theme & Localization ──────────────────────────────────────────────────
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [language, setLanguage] = useState<'ku' | 'en'>('ku');

  // ─── Authentication ────────────────────────────────────────────────────────
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [usernameInput, setUsernameInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [authError, setAuthError] = useState(false);

  // ─── Dashboard Navigation & Filters ───────────────────────────────────────
  const [activeTab, setActiveTab] = useState<'users' | 'installs' | 'feed' | 'licenses'>('users');
  const [licensesCount, setLicensesCount] = useState<number>(0);
  const [dateFilter, setDateFilter] = useState<'all' | 'today' | 'yesterday' | '7days' | '30days' | 'month' | 'year' | 'custom'>('all');
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [platformFilter, setPlatformFilter] = useState<'all' | 'ios' | 'android'>('all');
  const [lastUpdatedTime, setLastUpdatedTime] = useState<string>('');

  // ─── Real Telemetry Data ───────────────────────────────────────────────────
  const [stats, setStats] = useState<Stats | null>(null);
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [installs, setInstalls] = useState<InstallRecord[]>([]);

  // Current translation strings
  const t = DICTIONARY[language];
  const isKu = language === 'ku';

  // Check saved theme & auth & language
  useEffect(() => {
    const savedTheme = localStorage.getItem('@froshiar_admin_theme');
    if (savedTheme === 'dark') {
      setIsDarkMode(true);
    }
    const savedLang = localStorage.getItem('@froshiar_admin_lang');
    if (savedLang === 'en' || savedLang === 'ku') {
      setLanguage(savedLang);
    }
    const savedAuth = localStorage.getItem('@froshiar_admin_auth');
    if (savedAuth === 'zankoo') {
      setIsAuthenticated(true);
    }
  }, []);

  const toggleTheme = () => {
    const next = !isDarkMode;
    setIsDarkMode(next);
    localStorage.setItem('@froshiar_admin_theme', next ? 'dark' : 'light');
  };

  const handleLanguageToggle = () => {
    const nextLang = isKu ? 'en' : 'ku';
    setLanguage(nextLang);
    localStorage.setItem('@froshiar_admin_lang', nextLang);
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (usernameInput.trim() === 'zankoo' && passwordInput.trim() === 'zankoo') {
      setIsAuthenticated(true);
      localStorage.setItem('@froshiar_admin_auth', 'zankoo');
      setAuthError(false);
    } else {
      setAuthError(true);
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    localStorage.removeItem('@froshiar_admin_auth');
  };

  // Fetch real telemetry from API
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [statsRes, usersRes, installsRes, licRes] = await Promise.all([
        fetch('/api/telemetry/stats', { cache: 'no-store' }),
        fetch('/api/telemetry/users', { cache: 'no-store' }),
        fetch('/api/telemetry/installs', { cache: 'no-store' }),
        fetch('/api/licenses', { cache: 'no-store' }),
      ]);

      if (statsRes.ok) {
        const statsData = await statsRes.json();
        setStats(statsData);
      }
      if (usersRes.ok) {
        const usersData = await usersRes.json();
        setUsers(usersData.users || []);
      }
      if (installsRes.ok) {
        const installsData = await installsRes.json();
        setInstalls(installsData.installs || []);
      }
      if (licRes.ok) {
        const licData = await licRes.json();
        setLicensesCount(licData.licenses?.length || 0);
      }
      setLastUpdatedTime(new Date().toLocaleTimeString());
    } catch (err) {
      console.error('Failed to load telemetry:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isAuthenticated) return;
    fetchData();

    if (!autoRefresh) return;
    const interval = setInterval(fetchData, 10000);
    return () => clearInterval(interval);
  }, [isAuthenticated, autoRefresh, fetchData]);

  // Date filtering helper
  const isDateMatch = (isoDateStr?: string | null, filter: string = 'all'): boolean => {
    if (filter === 'all' || !isoDateStr) return true;
    const targetDate = new Date(isoDateStr);
    if (isNaN(targetDate.getTime())) return true;

    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    if (filter === 'today') {
      return targetDate >= startOfToday;
    }
    if (filter === 'yesterday') {
      const startOfYesterday = new Date(startOfToday);
      startOfYesterday.setDate(startOfYesterday.getDate() - 1);
      return targetDate >= startOfYesterday && targetDate < startOfToday;
    }
    if (filter === '7days') {
      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      return targetDate >= sevenDaysAgo;
    }
    if (filter === '30days') {
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      return targetDate >= thirtyDaysAgo;
    }
    if (filter === 'month') {
      return (
        targetDate.getMonth() === now.getMonth() &&
        targetDate.getFullYear() === now.getFullYear()
      );
    }
    if (filter === 'year') {
      return targetDate.getFullYear() === now.getFullYear();
    }
    return true;
  };

  // Filtered users
  const filteredUsers = users.filter((u) => {
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      !q ||
      u.email?.toLowerCase().includes(q) ||
      u.display_name?.toLowerCase().includes(q) ||
      u.business_name?.toLowerCase().includes(q) ||
      u.phone?.toLowerCase().includes(q) ||
      u.device_id?.toLowerCase().includes(q);

    const matchesPlatform =
      platformFilter === 'all' || u.platform?.toLowerCase() === platformFilter;

    const matchesDate =
      dateFilter === 'all' ||
      isDateMatch(u.last_login_at, dateFilter) ||
      isDateMatch(u.created_at, dateFilter);

    return matchesSearch && matchesPlatform && matchesDate;
  });

  // Filtered installs
  const filteredInstalls = installs.filter((i) => {
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      !q ||
      i.device_id?.toLowerCase().includes(q) ||
      i.brand?.toLowerCase().includes(q) ||
      i.model_name?.toLowerCase().includes(q);

    const matchesPlatform =
      platformFilter === 'all' || i.platform?.toLowerCase() === platformFilter;

    const matchesDate =
      dateFilter === 'all' ||
      isDateMatch(i.last_seen_at, dateFilter) ||
      isDateMatch(i.first_installed_at, dateFilter);

    return matchesSearch && matchesPlatform && matchesDate;
  });

  // Filtered events
  const filteredEvents = (stats?.recentEvents ?? []).filter((evt) => {
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      !q ||
      evt.user_email?.toLowerCase().includes(q) ||
      evt.platform?.toLowerCase().includes(q) ||
      evt.event_type?.toLowerCase().includes(q);

    const matchesPlatform =
      platformFilter === 'all' || evt.platform?.toLowerCase() === platformFilter;

    const matchesDate =
      dateFilter === 'all' || isDateMatch(evt.created_at, dateFilter);

    return matchesSearch && matchesPlatform && matchesDate;
  });

  const exportUsersCSV = () => {
    if (filteredUsers.length === 0) return;
    const headers = [
      'Email',
      'Display Name',
      'Business',
      'Phone',
      'Platform',
      'Version',
      'Device ID',
      'Created At',
      'Last Login',
      'Logins',
    ];
    const rows = filteredUsers.map((u) => [
      `"${u.email || ''}"`,
      `"${u.display_name || ''}"`,
      `"${u.business_name || ''}"`,
      `"${u.phone || ''}"`,
      `"${u.platform || ''}"`,
      `"${u.app_version || ''}"`,
      `"${u.device_id || ''}"`,
      `"${u.created_at || ''}"`,
      `"${u.last_login_at || ''}"`,
      u.login_count || 1,
    ]);
    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `froshiar_users_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // ─── LOGIN SCREEN ──────────────────────────────────────────────────────────
  if (!isAuthenticated) {
    return (
      <div
        className={`min-h-screen flex items-center justify-center p-4 transition-colors duration-300 ${
          isDarkMode ? 'bg-[#0B1120] text-slate-100' : 'bg-[#F8FAFC] text-slate-800'
        } ${isKu ? 'font-kurdish' : 'font-sans'}`}
        dir={isKu ? 'rtl' : 'ltr'}
      >
        <div
          className={`w-full max-w-md rounded-2xl sm:rounded-3xl p-5 sm:p-10 transition-all duration-300 border shadow-2xl ${
            isDarkMode
              ? 'bg-[#141C2E] border-slate-800 shadow-black/40'
              : 'bg-white border-slate-200 shadow-slate-200/60'
          }`}
        >
          {/* Logo & Header */}
          <div className="text-center mb-6 sm:mb-8">
            <div className="w-20 h-20 mx-auto mb-4 rounded-2xl bg-gradient-to-tr from-[#D4AF37]/20 to-[#D4AF37]/40 p-2.5 flex items-center justify-center border border-[#D4AF37]/30 shadow-lg">
              <img
                src="/logo.png"
                alt="Froshiar Logo"
                className="w-full h-full object-contain"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                }}
              />
              <span className="text-2xl font-black text-[#D4AF37] select-none">F</span>
            </div>

            <h1 className="text-2xl font-bold tracking-tight mb-1.5 text-inherit">
              {t.loginTitle}
            </h1>
            <p className="text-xs text-slate-400">
              {t.loginSubtitle}
            </p>
          </div>

          {/* Login Form */}
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-bold mb-1.5 text-slate-400">
                {t.usernameLabel}
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={usernameInput}
                  onChange={(e) => setUsernameInput(e.target.value)}
                  placeholder={t.usernamePlaceholder}
                  className={`w-full px-4 py-3 rounded-2xl text-sm transition-all outline-none border ${
                    isDarkMode
                      ? 'bg-[#0E1524] border-slate-700/80 text-white placeholder-slate-500 focus:border-[#D4AF37]'
                      : 'bg-[#F8FAFC] border-slate-200 text-slate-900 placeholder-slate-400 focus:border-[#D4AF37]'
                  }`}
                  autoFocus
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold mb-1.5 text-slate-400">
                {t.passwordLabel}
              </label>
              <div className="relative">
                <input
                  type="password"
                  value={passwordInput}
                  onChange={(e) => setPasswordInput(e.target.value)}
                  placeholder={t.passwordPlaceholder}
                  className={`w-full px-4 py-3 rounded-2xl text-sm transition-all outline-none border ${
                    isDarkMode
                      ? 'bg-[#0E1524] border-slate-700/80 text-white placeholder-slate-500 focus:border-[#D4AF37]'
                      : 'bg-[#F8FAFC] border-slate-200 text-slate-900 placeholder-slate-400 focus:border-[#D4AF37]'
                  }`}
                />
              </div>
            </div>

            {authError && (
              <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs text-center font-medium">
                {t.loginError}
              </div>
            )}

            <button
              type="submit"
              className="w-full py-3.5 mt-2 rounded-2xl bg-gradient-to-r from-[#D4AF37] to-[#B8860B] hover:from-[#C29E2F] hover:to-[#A67807] text-slate-950 font-bold text-sm shadow-lg shadow-[#D4AF37]/20 transition-all duration-200 active:scale-[0.99] flex items-center justify-center gap-2 cursor-pointer"
            >
              <Lock className="w-4 h-4 text-slate-950" />
              <span>{t.loginButton}</span>
            </button>
          </form>

          {/* Theme & Language Bar at bottom */}
          <div className="mt-8 pt-6 border-t border-slate-200/30 flex items-center justify-between text-xs text-slate-400">
            <button
              type="button"
              onClick={toggleTheme}
              className="flex items-center gap-1.5 hover:text-[#D4AF37] transition cursor-pointer"
            >
              {isDarkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4" />}
              <span>{isDarkMode ? t.lightMode : t.darkMode}</span>
            </button>

            <button
              type="button"
              onClick={handleLanguageToggle}
              className="flex items-center gap-1.5 hover:text-[#D4AF37] transition cursor-pointer"
            >
              <Globe className="w-4 h-4" />
              <span>{isKu ? 'English' : 'کوردی'}</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ─── MAIN DASHBOARD ────────────────────────────────────────────────────────
  return (
    <div
      className={`min-h-screen transition-colors duration-300 ${
        isDarkMode ? 'bg-[#0B1120] text-slate-100' : 'bg-[#F8FAFC] text-slate-800'
      } ${isKu ? 'font-kurdish' : 'font-sans'}`}
      dir={isKu ? 'rtl' : 'ltr'}
    >
      {/* ── Top Header Navigation Bar ── */}
      <header
        className={`sticky top-0 z-50 border-b transition-colors duration-300 ${
          isDarkMode
            ? 'bg-[#10182B]/95 border-slate-800/80 backdrop-blur'
            : 'bg-white/95 border-slate-200/80 backdrop-blur'
        }`}
      >
        <div className="max-w-[1440px] mx-auto px-3 sm:px-6 lg:px-8 h-15 sm:h-18 flex items-center justify-between gap-2 sm:gap-3">
          {/* Start Section: Menu & Dashboard Title */}
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <button
              className={`p-1.5 sm:p-2 rounded-xl transition cursor-pointer shrink-0 ${
                isDarkMode ? 'hover:bg-slate-800 text-slate-300' : 'hover:bg-slate-100 text-slate-700'
              }`}
              title="Menu"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="w-px h-5 bg-slate-300/40 dark:bg-slate-700/60 shrink-0" />
            <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
              <span className="text-sm sm:text-xl font-extrabold tracking-tight truncate">
                {t.adminTitle}
              </span>
              <span className="text-[10px] font-bold px-1.5 sm:px-2 py-0.5 rounded-full bg-[#D4AF37]/15 text-[#D4AF37] border border-[#D4AF37]/30 shrink-0">
                {t.liveBadge}
              </span>
            </div>
          </div>

          {/* End Section: Language Switcher, Dark Mode, Profile */}
          <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
            {/* Language Switcher */}
            <button
              onClick={handleLanguageToggle}
              className={`flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-full border text-[11px] sm:text-xs font-bold transition cursor-pointer ${
                isDarkMode
                  ? 'bg-[#141C2E] border-slate-800 text-slate-300 hover:border-slate-700'
                  : 'bg-slate-50 border-slate-200 text-slate-700 hover:border-slate-300'
              }`}
              title={isKu ? 'Switch to English' : 'گۆڕین بۆ کوردی'}
            >
              <Globe className="w-3.5 h-3.5 text-[#D4AF37]" />
              <span>{isKu ? 'English' : 'کوردی'}</span>
            </button>

            {/* Dark Mode Toggle */}
            <button
              onClick={toggleTheme}
              className={`p-1.5 sm:p-2 rounded-full border transition cursor-pointer ${
                isDarkMode
                  ? 'bg-[#141C2E] border-slate-800 text-amber-400 hover:bg-slate-800'
                  : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
              }`}
              title={isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            >
              {isDarkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>

            {/* User Profile Capsule */}
            <div
              className={`flex items-center gap-1.5 sm:gap-2.5 px-2 sm:px-3 py-1 sm:py-1.5 rounded-full border transition ${
                isDarkMode
                  ? 'bg-[#141C2E] border-slate-800'
                  : 'bg-slate-50 border-slate-200'
              }`}
            >
              <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-gradient-to-tr from-[#D4AF37] to-[#F59E0B] flex items-center justify-center text-slate-950 font-bold text-xs shadow-sm shrink-0">
                Z
              </div>
              <div className="hidden sm:block text-start">
                <div className="text-xs font-bold leading-tight">zankoo</div>
                <div className="text-[10px] text-slate-400 leading-none">admin</div>
              </div>
              <button
                onClick={handleLogout}
                className="text-[11px] sm:text-xs text-red-400 hover:text-red-300 font-bold ml-0.5 sm:ml-1 transition cursor-pointer"
                title={t.logout}
              >
                {t.logout}
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* ── Main Content Area ── */}
      <main className="max-w-[1440px] mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6 space-y-4 sm:space-y-6">
        {/* Top Controls: Page Title + Refresh Buttons */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
          <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-[#D4AF37]/15 flex items-center justify-center text-[#D4AF37] shrink-0">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h2 className="text-base sm:text-xl font-bold tracking-tight truncate">
                {t.adminSubtitle}
              </h2>
              <p className="text-[11px] sm:text-xs text-slate-400 line-clamp-1">
                {t.adminDescription}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3 self-start sm:self-auto shrink-0 flex-wrap">
            {/* Manual Refresh Pill Button */}
            <button
              onClick={fetchData}
              disabled={loading}
              className={`px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-2xl border text-xs font-bold transition flex items-center gap-1.5 shadow-sm cursor-pointer ${
                isDarkMode
                  ? 'bg-[#141C2E] border-slate-800 text-slate-200 hover:border-slate-700'
                  : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300'
              }`}
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-[#D4AF37]' : ''}`} />
              <span>{t.refresh}</span>
            </button>

            {/* Auto Refresh toggle */}
            <button
              onClick={() => setAutoRefresh(!autoRefresh)}
              className={`px-3 py-1.5 sm:px-3 sm:py-2 rounded-2xl border text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                autoRefresh
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                  : 'bg-slate-500/10 border-slate-500/30 text-slate-400'
              }`}
            >
              <span className={`w-2 h-2 rounded-full ${autoRefresh ? 'bg-emerald-400 animate-pulse' : 'bg-slate-400'}`} />
              <span>{autoRefresh ? t.autoRefresh : t.paused}</span>
            </button>
          </div>
        </div>

        {/* ── Date Filter Section (Right-aligned in Kurdish RTL, Left-aligned in English LTR) ── */}
        <div
          dir={isKu ? 'rtl' : 'ltr'}
          className={`p-2 sm:p-3 rounded-2xl border shadow-sm transition-colors overflow-hidden ${
            isDarkMode ? 'bg-[#141C2E] border-slate-800' : 'bg-white border-slate-200'
          }`}
        >
          <div className="flex items-center justify-start gap-2 sm:gap-3 overflow-x-auto no-scrollbar scroll-smooth py-0.5 touch-pan-x">
            {/* Filter Label */}
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-400 shrink-0">
              <Calendar className="w-4 h-4 text-[#D4AF37]" />
              <span className="whitespace-nowrap font-medium">{t.dateFilterLabel}</span>
            </div>

            <div className="w-px h-4 bg-slate-200 dark:bg-slate-800 shrink-0 hidden sm:block" />

            {/* Filter Pills starting immediately from the inline-start */}
            <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
              {[
                { id: 'all', label: t.allTime },
                { id: 'today', label: t.today },
                { id: 'yesterday', label: t.yesterday },
                { id: '7days', label: t.last7Days },
                { id: '30days', label: t.last30Days },
                { id: 'month', label: t.thisMonth },
                { id: 'year', label: t.thisYear },
                { id: 'custom', label: t.custom, hasChevron: true },
              ].map((pill) => {
                const isActive = dateFilter === pill.id;
                return (
                  <button
                    key={pill.id}
                    onClick={() => setDateFilter(pill.id as any)}
                    className={`px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-full text-[11px] sm:text-xs font-semibold whitespace-nowrap transition-all duration-150 cursor-pointer flex items-center gap-1 shrink-0 ${
                      isActive
                        ? 'bg-[#3B82F6] text-white shadow-md shadow-blue-500/25 ring-2 ring-blue-500/20'
                        : isDarkMode
                        ? 'bg-[#0E1524] text-slate-300 hover:bg-slate-800 hover:text-white'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200 hover:text-slate-900'
                    }`}
                  >
                    <span>{pill.label}</span>
                    {pill.hasChevron && <ChevronDown className="w-3 h-3 sm:w-3.5 sm:h-3.5 opacity-70" />}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* ── System Summary Card ("پوختەی سیستەم") ── */}
        <div
          className={`p-3.5 sm:p-6 rounded-2xl sm:rounded-3xl border transition shadow-sm space-y-4 sm:space-y-6 ${
            isDarkMode ? 'bg-[#141C2E] border-slate-800' : 'bg-white border-slate-200'
          }`}
        >
          {/* Card Header */}
          <div className="flex items-center justify-between gap-2">
            <div>
              <h3 className="text-base sm:text-lg font-extrabold text-inherit">{t.systemSummary}</h3>
              <div className="flex items-center gap-1.5 sm:gap-2 mt-0.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-[11px] sm:text-xs text-slate-400">{t.systemRealtime}</span>
              </div>
            </div>

            <div
              className={`p-2 sm:p-2.5 rounded-xl sm:rounded-2xl shrink-0 ${
                isDarkMode ? 'bg-[#0E1524] text-sky-400' : 'bg-sky-50 text-sky-600'
              }`}
            >
              <Clock className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
          </div>

          {/* 4 Inner Metric Blocks (Responsive Grid) */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
            {/* Block 1: System Status */}
            <div
              className={`p-3 sm:p-5 rounded-xl sm:rounded-2xl border text-center transition flex flex-col items-center justify-center ${
                isDarkMode
                  ? 'bg-[#0E1524] border-slate-800/80'
                  : 'bg-[#F8FAFC] border-slate-200/80'
              }`}
            >
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-emerald-500/15 flex items-center justify-center text-emerald-500 mb-1 sm:mb-2">
                <Activity className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
              <span className="text-[10px] sm:text-xs text-slate-400 font-medium line-clamp-1">{t.systemStatus}</span>
              <span className="text-xs sm:text-lg font-extrabold text-emerald-500 mt-0.5 truncate">{t.operational}</span>
            </div>

            {/* Block 2: Total Records / Installs */}
            <div
              className={`p-3 sm:p-5 rounded-xl sm:rounded-2xl border text-center transition flex flex-col items-center justify-center ${
                isDarkMode
                  ? 'bg-[#0E1524] border-slate-800/80'
                  : 'bg-[#F8FAFC] border-slate-200/80'
              }`}
            >
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-amber-500/15 flex items-center justify-center text-amber-500 mb-1 sm:mb-2">
                <Database className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
              <span className="text-[10px] sm:text-xs text-slate-400 font-medium line-clamp-1">{t.totalInstallsTitle}</span>
              <span className="text-lg sm:text-2xl font-black mt-0.5 text-inherit">
                {stats?.totalInstalls ?? 0}
              </span>
            </div>

            {/* Block 3: Logins / Today's Active */}
            <div
              className={`p-3 sm:p-5 rounded-xl sm:rounded-2xl border text-center transition flex flex-col items-center justify-center ${
                isDarkMode
                  ? 'bg-[#0E1524] border-slate-800/80'
                  : 'bg-[#F8FAFC] border-slate-200/80'
              }`}
            >
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-blue-500/15 flex items-center justify-center text-blue-500 mb-1 sm:mb-2">
                <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
              <span className="text-[10px] sm:text-xs text-slate-400 font-medium line-clamp-1">{t.todayActiveTitle}</span>
              <span className="text-lg sm:text-2xl font-black mt-0.5 text-inherit">
                {stats?.activeUsersToday ?? 0}
              </span>
            </div>

            {/* Block 4: Registered Accounts */}
            <div
              className={`p-3 sm:p-5 rounded-xl sm:rounded-2xl border text-center transition flex flex-col items-center justify-center ${
                isDarkMode
                  ? 'bg-[#0E1524] border-slate-800/80'
                  : 'bg-[#F8FAFC] border-slate-200/80'
              }`}
            >
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-emerald-500/15 flex items-center justify-center text-emerald-500 mb-1 sm:mb-2">
                <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
              <span className="text-[10px] sm:text-xs text-slate-400 font-medium line-clamp-1">{t.registeredUsersTitle}</span>
              <span className="text-lg sm:text-2xl font-black mt-0.5 text-inherit">
                {stats?.totalUsers ?? 0}
              </span>
            </div>
          </div>

          {/* Footer inside summary card */}
          <div className="pt-3 sm:pt-4 border-t border-slate-200/60 dark:border-slate-800/60 flex flex-wrap items-center justify-between text-[10px] sm:text-xs text-slate-400 gap-2">
            <div className="flex items-center gap-1.5 sm:gap-2">
              <span className="w-2 h-2 rounded-full bg-blue-500" />
              <span>{t.autoRefreshEnabled}</span>
            </div>

            <div className="flex items-center gap-1.5 sm:gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span>
                {t.lastUpdated} {lastUpdatedTime || t.now}
              </span>
            </div>
          </div>
        </div>

        {/* ── Main Layout: Sidebar & Content Panel ── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6 items-start">
          {/* Navigation Sidebar (Mobile tabs & Desktop sidebar) */}
          <div className="lg:col-span-4 space-y-2 sm:space-y-3">
            {[
              {
                id: 'users',
                label: t.usersTab,
                sub: t.usersTabSub,
                icon: Users,
                count: users.length,
              },
              {
                id: 'installs',
                label: t.installsTab,
                sub: t.installsTabSub,
                icon: Smartphone,
                count: installs.length,
              },
              {
                id: 'feed',
                label: t.feedTab,
                sub: t.feedTabSub,
                icon: Activity,
                count: stats?.recentEvents?.length ?? 0,
              },
              {
                id: 'licenses',
                label: t.licensesTab,
                sub: t.licensesTabSub,
                icon: Key,
                count: licensesCount,
              },
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              const Arrow = isKu ? ArrowLeft : ArrowRight;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`w-full text-start p-3 sm:p-4 rounded-xl sm:rounded-3xl border transition-all duration-200 flex items-center justify-between gap-3 cursor-pointer ${
                    isActive
                      ? isDarkMode
                        ? 'bg-[#1C2438] border-[#D4AF37]/50 shadow-md'
                        : 'bg-[#FDF9ED] border-[#D4AF37]/60 shadow-sm'
                      : isDarkMode
                      ? 'bg-[#141C2E] border-slate-800 hover:border-slate-700'
                      : 'bg-white border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
                    <div
                      className={`w-9 h-9 sm:w-11 sm:h-11 rounded-xl sm:rounded-2xl flex items-center justify-center shrink-0 ${
                        isActive
                          ? 'bg-[#D4AF37] text-slate-950 font-bold'
                          : isDarkMode
                          ? 'bg-[#0E1524] text-slate-400'
                          : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      <Icon className="w-4 h-4 sm:w-5 sm:h-5" />
                    </div>

                    <div className="text-start min-w-0">
                      <div className="text-xs sm:text-sm font-extrabold text-inherit flex items-center gap-1.5">
                        <span className="truncate">{tab.label}</span>
                        <span className="text-[10px] sm:text-[11px] px-1.5 py-0.2 rounded-full bg-slate-200/60 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-mono shrink-0">
                          {tab.count}
                        </span>
                      </div>
                      <div className="text-[10px] sm:text-xs text-slate-400 mt-0.5 line-clamp-1">
                        {tab.sub}
                      </div>
                    </div>
                  </div>

                  <Arrow
                    className={`w-4 h-4 shrink-0 transition-transform ${
                      isActive ? 'text-[#D4AF37]' : 'text-slate-400'
                    }`}
                  />
                </button>
              );
            })}

            {/* Quick Export Action */}
            <div
              className={`p-2.5 sm:p-4 rounded-xl sm:rounded-3xl border ${
                isDarkMode ? 'bg-[#141C2E] border-slate-800' : 'bg-white border-slate-200'
              }`}
            >
              <button
                onClick={exportUsersCSV}
                className="w-full py-2 sm:py-3 rounded-xl sm:rounded-2xl bg-[#D4AF37]/15 hover:bg-[#D4AF37]/25 text-[#D4AF37] border border-[#D4AF37]/30 text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer"
              >
                <FileSpreadsheet className="w-4 h-4" />
                <span>{t.exportCsv}</span>
              </button>
            </div>
          </div>

          {/* Main Content Card (8 cols on lg) */}
          <div
            className={`lg:col-span-8 p-3.5 sm:p-6 rounded-2xl sm:rounded-3xl border shadow-sm transition space-y-4 sm:space-y-6 overflow-hidden ${
              isDarkMode ? 'bg-[#141C2E] border-slate-800' : 'bg-white border-slate-200'
            }`}
          >
            {/* Header inside main card */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 border-b border-slate-200/60 dark:border-slate-800/60 pb-3.5 sm:pb-5">
              <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
                <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl bg-gradient-to-tr from-[#D4AF37]/20 to-[#D4AF37]/30 flex items-center justify-center text-[#D4AF37] border border-[#D4AF37]/30 shrink-0">
                  {activeTab === 'users' && <Users className="w-5 h-5" />}
                  {activeTab === 'installs' && <Smartphone className="w-5 h-5" />}
                  {activeTab === 'feed' && <Activity className="w-5 h-5" />}
                  {activeTab === 'licenses' && <Key className="w-5 h-5" />}
                </div>
                <div className="min-w-0">
                  <h4 className="text-sm sm:text-base font-extrabold text-inherit truncate">
                    {activeTab === 'users' && t.usersTableTitle}
                    {activeTab === 'installs' && t.installsTableTitle}
                    {activeTab === 'feed' && t.feedTableTitle}
                    {activeTab === 'licenses' && t.licensesTableTitle}
                  </h4>
                  <p className="text-[10px] sm:text-xs text-slate-400 line-clamp-1">
                    {activeTab === 'licenses' ? t.licensesTableSub : t.usersTableSub}
                  </p>
                </div>
              </div>

              {/* Platform Selector Filter (only for users, installs, feed) */}
              {activeTab !== 'licenses' && (
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <select
                    value={platformFilter}
                    onChange={(e) => setPlatformFilter(e.target.value as any)}
                    className={`w-full sm:w-auto px-3 py-1.5 sm:py-2 rounded-xl text-xs font-semibold outline-none border transition cursor-pointer ${
                      isDarkMode
                        ? 'bg-[#0E1524] border-slate-700 text-slate-200 focus:border-[#D4AF37]'
                        : 'bg-[#F8FAFC] border-slate-200 text-slate-700 focus:border-[#D4AF37]'
                    }`}
                  >
                    <option value="all">{t.allPlatforms}</option>
                    <option value="ios">Apple (iOS)</option>
                    <option value="android">Android</option>
                  </select>
                </div>
              )}
            </div>

            {/* Search Input Bar (only for users, installs, feed) */}
            {activeTab !== 'licenses' && (
              <div className="relative">
                <Search
                  className={`w-4 h-4 text-slate-400 absolute top-3 sm:top-3.5 ${
                    isKu ? 'right-3.5 sm:right-4' : 'left-3.5 sm:left-4'
                  } pointer-events-none`}
                />
                <input
                  type="text"
                  placeholder={t.searchPlaceholder}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className={`w-full py-2.5 sm:py-3 rounded-xl sm:rounded-2xl text-xs font-medium outline-none border transition ${
                    isKu ? 'pr-10 sm:pr-11 pl-3 sm:pl-4' : 'pl-10 sm:pl-11 pr-3 sm:pr-4'
                  } ${
                    isDarkMode
                      ? 'bg-[#0E1524] border-slate-700 text-white placeholder-slate-500 focus:border-[#D4AF37]'
                      : 'bg-[#F8FAFC] border-slate-200 text-slate-900 placeholder-slate-400 focus:border-[#D4AF37]'
                  }`}
                />
              </div>
            )}

            {/* ─── TAB 1: USERS LIST ──────────────────────────────────────── */}
            {activeTab === 'users' && (
              <div className="space-y-3">
                {filteredUsers.length === 0 ? (
                  <div className="py-16 text-center text-slate-400 text-xs">
                    {t.noUsersFound}
                  </div>
                ) : (
                  filteredUsers.map((u) => (
                    <div
                      key={u.id}
                      className={`p-3 sm:p-4 rounded-xl sm:rounded-2xl border transition flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-3 ${
                        isDarkMode
                          ? 'bg-[#0E1524] border-slate-800 hover:border-slate-700'
                          : 'bg-[#F8FAFC] border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      {/* User Info */}
                      <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
                        <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-tr from-[#D4AF37]/20 to-[#D4AF37]/30 flex items-center justify-center text-[#D4AF37] font-bold text-xs sm:text-sm shrink-0">
                          {u.display_name?.charAt(0) || u.email?.charAt(0).toUpperCase() || 'U'}
                        </div>
                        <div className="text-start min-w-0">
                          <div className="text-xs sm:text-sm font-bold text-inherit flex items-center gap-1.5 sm:gap-2">
                            <span className="truncate">{u.display_name || u.email?.split('@')[0] || t.user}</span>
                            <span
                              className={`text-[9px] sm:text-[10px] px-1.5 sm:px-2 py-0.5 rounded-full font-bold uppercase shrink-0 ${
                                u.platform?.toLowerCase() === 'ios'
                                  ? 'bg-sky-500/15 text-sky-400'
                                  : 'bg-emerald-500/15 text-emerald-400'
                              }`}
                            >
                              {u.platform || 'IOS'}
                            </span>
                          </div>

                          <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-xs text-slate-400 mt-0.5 sm:mt-1">
                            {u.email && (
                              <span className="flex items-center gap-1 font-mono text-[10px] sm:text-xs break-all">
                                <Mail className="w-3 h-3 text-slate-500 shrink-0" />
                                <span>{u.email}</span>
                              </span>
                            )}
                            {u.phone && (
                              <span className="flex items-center gap-1 font-mono text-[10px] sm:text-xs">
                                <Phone className="w-3 h-3 text-slate-500 shrink-0" />
                                <span>{u.phone}</span>
                              </span>
                            )}
                            {u.business_name && (
                              <span className="flex items-center gap-1 text-[#D4AF37] font-medium text-[10px] sm:text-xs truncate">
                                <Building2 className="w-3 h-3 shrink-0" />
                                <span className="truncate">{u.business_name}</span>
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Timestamps & Login count */}
                      <div className="flex items-center justify-between sm:justify-end gap-3 sm:gap-4 text-start pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-200/40 dark:border-slate-800/60 shrink-0">
                        <div className="text-start">
                          <div className="text-[11px] sm:text-xs font-semibold text-emerald-500">
                            {t.lastLogin} {new Date(u.last_login_at).toLocaleDateString()}
                          </div>
                          <div className="text-[10px] text-slate-400 font-mono">
                            {new Date(u.last_login_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </div>
                        </div>

                        <div className="px-2 sm:px-3 py-1 sm:py-1.5 rounded-xl bg-slate-200/60 dark:bg-slate-800 text-center shrink-0">
                          <div className="text-[9px] sm:text-[10px] text-slate-400">{t.loginsCount}</div>
                          <div className="text-xs font-bold font-mono">{u.login_count || 1}</div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* ─── TAB 2: INSTALLS LIST ───────────────────────────────────── */}
            {activeTab === 'installs' && (
              <div className="space-y-3">
                {filteredInstalls.length === 0 ? (
                  <div className="py-16 text-center text-slate-400 text-xs">
                    {t.noInstallsFound}
                  </div>
                ) : (
                  filteredInstalls.map((inst) => (
                    <div
                      key={inst.id}
                      className={`p-3 sm:p-4 rounded-xl sm:rounded-2xl border transition flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-3 ${
                        isDarkMode
                          ? 'bg-[#0E1524] border-slate-800 hover:border-slate-700'
                          : 'bg-[#F8FAFC] border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
                        <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-slate-200/60 dark:bg-slate-800 flex items-center justify-center shrink-0">
                          {inst.platform?.toLowerCase() === 'ios' ? (
                            <Apple className="w-4 h-4 sm:w-5 sm:h-5 text-sky-400" />
                          ) : (
                            <Smartphone className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-400" />
                          )}
                        </div>

                        <div className="text-start min-w-0">
                          <div className="text-xs sm:text-sm font-bold font-mono text-[#D4AF37] break-all">
                            {inst.device_id}
                          </div>
                          <div className="text-[11px] sm:text-xs text-slate-400 flex flex-wrap items-center gap-1.5 sm:gap-2 mt-0.5">
                            <span className="font-semibold">{inst.model_name || inst.brand || t.device}</span>
                            <span>·</span>
                            <span>{t.appVersion} v{inst.app_version || '1.0.0'}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between sm:justify-end gap-3 sm:gap-4 text-start pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-200/40 dark:border-slate-800/60 shrink-0">
                        <div className="text-start">
                          <div className="text-[11px] sm:text-xs text-inherit font-medium">
                            {t.lastSeen} {new Date(inst.last_seen_at).toLocaleDateString()}
                          </div>
                          <div className="text-[10px] text-slate-400">
                            {t.firstInstall} {new Date(inst.first_installed_at).toLocaleDateString()}
                          </div>
                        </div>

                        <div className="px-2 sm:px-3 py-1 sm:py-1.5 rounded-xl bg-slate-200/60 dark:bg-slate-800 text-center shrink-0">
                          <div className="text-[9px] sm:text-[10px] text-slate-400">{t.opensCount}</div>
                          <div className="text-xs font-bold font-mono">{inst.open_count}</div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* ─── TAB 3: LIVE FEED ───────────────────────────────────────── */}
            {activeTab === 'feed' && (
              <div className="space-y-2.5">
                {filteredEvents.length > 0 ? (
                  filteredEvents.map((evt) => (
                    <div
                      key={evt.id}
                      className={`p-2.5 sm:p-3.5 rounded-xl sm:rounded-2xl border transition flex items-center justify-between gap-2 sm:gap-3 ${
                        isDarkMode
                          ? 'bg-[#0E1524] border-slate-800'
                          : 'bg-[#F8FAFC] border-slate-200'
                      }`}
                    >
                      <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                        <div
                          className={`w-7 h-7 sm:w-8 sm:h-8 rounded-lg sm:rounded-xl flex items-center justify-center shrink-0 ${
                            evt.event_type === 'login'
                              ? 'bg-emerald-500/20 text-emerald-500'
                              : 'bg-sky-500/20 text-sky-500'
                          }`}
                        >
                          {evt.event_type === 'login' ? (
                            <Users className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                          ) : (
                            <Smartphone className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                          )}
                        </div>

                        <div className="text-start min-w-0">
                          <div className="text-xs font-bold text-inherit truncate">
                            {evt.event_type === 'login'
                              ? t.userLoginEvent
                              : t.appOpenEvent}
                          </div>
                          <div className="text-[10px] sm:text-[11px] text-slate-400 font-mono truncate">
                            {evt.user_email || evt.platform?.toUpperCase() || t.device}
                          </div>
                        </div>
                      </div>

                      <div className="text-end text-[10px] sm:text-[11px] text-slate-400 shrink-0">
                        <div>{new Date(evt.created_at).toLocaleDateString()}</div>
                        <div className="font-mono">{new Date(evt.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="py-16 text-center text-slate-400 text-xs">
                    {t.noEventsFound}
                  </div>
                )}
              </div>
            )}

            {/* ─── TAB 4: LICENSES & SUBSCRIPTIONS ────────────────────────── */}
            {activeTab === 'licenses' && (
              <LicenseManagement
                isDarkMode={isDarkMode}
                language={language}
                onLicensesUpdated={(cnt) => setLicensesCount(cnt)}
              />
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
