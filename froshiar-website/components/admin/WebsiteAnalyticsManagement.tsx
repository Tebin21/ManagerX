'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Globe,
  Users,
  Smartphone,
  Download,
  ExternalLink,
  Clock,
  MapPin,
  TrendingUp,
  Activity,
  RefreshCw,
  Search,
  Calendar,
  Laptop,
  Compass,
  Sparkles,
  FileSpreadsheet,
  Eye,
  X,
  Layers,
  Radio,
} from 'lucide-react';
import { getClientFirestore } from '@/lib/firebase';
import { collection, query, orderBy, limit, onSnapshot, getDocs } from 'firebase/firestore';

interface WebsiteAnalyticsManagementProps {
  isDarkMode: boolean;
  language: 'ku' | 'en';
}

export interface VisitorItem {
  id: string;
  sessionId: string;
  visitorId: string;
  startedAt: string;
  lastActiveAt: string;
  leftAt?: string;
  durationSeconds: number;
  domain?: string;
  fullUrl?: string;
  path: string;
  locale: string;
  referrer: string;
  referrerCategory: 'direct' | 'google' | 'social' | 'external';
  referrerSourceDetail?: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  deviceType: 'mobile' | 'tablet' | 'desktop';
  deviceModel: string;
  os: string;
  browser: string;
  screenSize: string;
  city: string;
  country: string;
  locationLabel: string;
  downloadClicked: boolean;
  lastDownloadPlatform?: string;
  bexdrClicked: boolean;
  sectionsViewed: string[];
  clicksCount: number;
  eventsCount: number;
  isOnline?: boolean;
}

export interface WebsiteEventItem {
  id: string;
  eventType: string;
  target?: string;
  label?: string;
  section?: string;
  platform?: string;
  device?: string;
  location?: string;
  timestamp: string;
  sessionId: string;
}

export default function WebsiteAnalyticsManagement({
  isDarkMode,
  language,
}: WebsiteAnalyticsManagementProps) {
  const isKu = language === 'ku';

  // ── States ──
  // 100% Real data - Zero fake / seed visitors!
  const [visitors, setVisitors] = useState<VisitorItem[]>([]);
  const [events, setEvents] = useState<WebsiteEventItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isLiveConnected, setIsLiveConnected] = useState(false);
  const [lastRefreshedAt, setLastRefreshedAt] = useState<Date>(new Date());
  const [dateFilter, setDateFilter] = useState<'today' | 'yesterday' | '7days' | '30days' | 'all' | 'custom'>('7days');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [visitorFilterTab, setVisitorFilterTab] = useState<'all' | 'live' | 'download' | 'bexdr'>('all');
  const [selectedVisitor, setSelectedVisitor] = useState<VisitorItem | null>(null);

  // Fast clock timer (ticks every 2 seconds) so live active counts decrement immediately
  const [nowMs, setNowMs] = useState<number>(Date.now());
  useEffect(() => {
    const timer = setInterval(() => {
      setNowMs(Date.now());
    }, 2000);
    return () => clearInterval(timer);
  }, []);

  // Filter helper: STRICTLY EXCLUDE localhost and internal test sessions
  const isGenuineProductionDomain = useCallback((v: Partial<VisitorItem>) => {
    const d = (v.domain || '').toLowerCase();
    const u = (v.fullUrl || '').toLowerCase();
    const p = (v.path || '').toLowerCase();
    if (
      d.includes('localhost') ||
      d.includes('127.0.0.1') ||
      u.includes('localhost') ||
      u.includes('127.0.0.1') ||
      p.includes('localhost') ||
      d.includes('192.168.') ||
      d.includes('10.0.') ||
      d.endsWith('.local')
    ) {
      return false;
    }
    return true;
  }, []);

  // Map raw Firestore data to clean VisitorItem
  const mapDocToVisitor = useCallback((id: string, data: any): VisitorItem => {
    return {
      id,
      sessionId: data.sessionId || id,
      visitorId: data.visitorId || 'v_unknown',
      startedAt: data.startedAt || new Date().toISOString(),
      lastActiveAt: data.lastActiveAt || new Date().toISOString(),
      leftAt: data.leftAt || undefined,
      durationSeconds: Number(data.durationSeconds || 0),
      domain: data.domain || '',
      fullUrl: data.fullUrl || '',
      path: data.path || '/',
      locale: data.locale || 'ckb',
      referrer: data.referrer || 'Direct',
      referrerCategory: data.referrerCategory || 'direct',
      referrerSourceDetail: data.referrerSourceDetail || (data.referrer === 'Direct' ? 'ڕاستەوخۆ (Direct)' : data.referrer || 'ڕاستەوخۆ'),
      utmSource: data.utmSource || '',
      utmMedium: data.utmMedium || '',
      utmCampaign: data.utmCampaign || '',
      deviceType: data.deviceType || 'desktop',
      deviceModel: data.deviceModel || 'ئامێر',
      os: data.os || 'OS',
      browser: data.browser || 'Browser',
      screenSize: data.screenSize || '0x0',
      city: data.city || 'کوردستان',
      country: data.country || 'عێراق',
      locationLabel: data.locationLabel || 'کوردستان، عێراق',
      downloadClicked: Boolean(data.downloadClicked),
      lastDownloadPlatform: data.lastDownloadPlatform || '',
      bexdrClicked: Boolean(data.bexdrClicked),
      sectionsViewed: Array.isArray(data.sectionsViewed) ? data.sectionsViewed : ['#home'],
      clicksCount: Number(data.clicksCount || 0),
      eventsCount: Number(data.eventsCount || 0),
      isOnline: data.isOnline !== undefined ? Boolean(data.isOnline) : true,
    };
  }, []);

  // ── Realtime onSnapshot Firestore Sync ──
  useEffect(() => {
    const db = getClientFirestore();
    if (!db) {
      setLoading(false);
      return;
    }

    setLoading(true);

    // 1. Listen to real-time visitors collection
    const visitorsQuery = query(
      collection(db, 'website_visitors'),
      orderBy('lastActiveAt', 'desc'),
      limit(250)
    );

    const unsubscribeVisitors = onSnapshot(
      visitorsQuery,
      (snapshot) => {
        const rawList = snapshot.docs.map((docSnap) =>
          mapDocToVisitor(docSnap.id, docSnap.data())
        );
        // Exclude localhost
        const genuine = rawList.filter(isGenuineProductionDomain);
        setVisitors(genuine);
        setIsLiveConnected(true);
        setLoading(false);
        setLastRefreshedAt(new Date());
      },
      (error) => {
        console.debug('[WebsiteAnalytics] onSnapshot visitors error:', error);
        setIsLiveConnected(false);
        setLoading(false);
      }
    );

    // 2. Listen to real-time events collection
    const eventsQuery = query(
      collection(db, 'website_events'),
      orderBy('timestamp', 'desc'),
      limit(100)
    );

    const unsubscribeEvents = onSnapshot(
      eventsQuery,
      (snapshot) => {
        const evList = snapshot.docs.map((d) => ({
          id: d.id,
          ...d.data(),
        })) as WebsiteEventItem[];
        setEvents(evList);
      },
      (error) => {
        console.debug('[WebsiteAnalytics] onSnapshot events error:', error);
      }
    );

    return () => {
      unsubscribeVisitors();
      unsubscribeEvents();
    };
  }, [mapDocToVisitor, isGenuineProductionDomain]);

  // Manual one-click refresh button
  const handleManualRefresh = useCallback(async () => {
    try {
      setLoading(true);
      const db = getClientFirestore();
      if (!db) return;
      const snap = await getDocs(
        query(collection(db, 'website_visitors'), orderBy('lastActiveAt', 'desc'), limit(250))
      );
      const raw = snap.docs.map((d) => mapDocToVisitor(d.id, d.data()));
      setVisitors(raw.filter(isGenuineProductionDomain));
      setLastRefreshedAt(new Date());
    } catch (e) {
      console.debug('Manual refresh err:', e);
    } finally {
      setLoading(false);
    }
  }, [mapDocToVisitor, isGenuineProductionDomain]);

  // ── Realtime Live Calculation: Immediately drops when user leaves ──
  // A visitor is LIVE only if:
  // 1. isOnline is not false
  // 2. leftAt is not set
  // 3. lastActiveAt was within the last 25 seconds (heartbeat is sent every 10s)
  const isVisitorLive = useCallback(
    (v: VisitorItem) => {
      if (v.isOnline === false || v.leftAt) return false;
      try {
        const activeTime = new Date(v.lastActiveAt).getTime();
        return nowMs - activeTime < 25 * 1000;
      } catch {
        return false;
      }
    },
    [nowMs]
  );

  // ── Date Filtering ──
  const filteredVisitors = useMemo(() => {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const startOfYesterday = startOfToday - 24 * 3600 * 1000;
    const sevenDaysAgo = now.getTime() - 7 * 24 * 3600 * 1000;
    const thirtyDaysAgo = now.getTime() - 30 * 24 * 3600 * 1000;

    return visitors.filter((v) => {
      const vTime = new Date(v.startedAt).getTime();

      if (dateFilter === 'today') {
        return vTime >= startOfToday;
      }
      if (dateFilter === 'yesterday') {
        return vTime >= startOfYesterday && vTime < startOfToday;
      }
      if (dateFilter === '7days') {
        return vTime >= sevenDaysAgo;
      }
      if (dateFilter === '30days') {
        return vTime >= thirtyDaysAgo;
      }
      if (dateFilter === 'custom' && customStartDate && customEndDate) {
        const customStart = new Date(customStartDate).getTime();
        const customEnd = new Date(customEndDate).getTime() + 24 * 3600 * 1000;
        return vTime >= customStart && vTime <= customEnd;
      }
      return true; // 'all'
    });
  }, [visitors, dateFilter, customStartDate, customEndDate]);

  // ── Aggregate Metrics ──
  const metrics = useMemo(() => {
    const totalVisits = filteredVisitors.length;
    const uniqueVisitors = new Set(filteredVisitors.map((v) => v.visitorId)).size;
    // Realtime Live Count across ALL active sessions right now
    const liveCount = visitors.filter(isVisitorLive).length;

    const downloadClicks = filteredVisitors.filter((v) => v.downloadClicked).length;
    const iosDownloads = filteredVisitors.filter(
      (v) =>
        v.downloadClicked &&
        (v.lastDownloadPlatform === 'ios' ||
          (v.deviceType === 'mobile' && v.os.includes('iOS')) ||
          v.deviceModel.includes('iPhone'))
    ).length;
    const androidDownloads = Math.max(0, downloadClicks - iosDownloads);

    const bexdrClicks = filteredVisitors.filter((v) => v.bexdrClicked).length;

    const totalDuration = filteredVisitors.reduce((acc, v) => acc + (v.durationSeconds || 0), 0);
    const avgDurationSeconds = totalVisits > 0 ? Math.round(totalDuration / totalVisits) : 0;

    const downloadConversion =
      totalVisits > 0 ? ((downloadClicks / totalVisits) * 100).toFixed(1) : '0';
    const bexdrConversion =
      totalVisits > 0 ? ((bexdrClicks / totalVisits) * 100).toFixed(1) : '0';

    return {
      totalVisits,
      uniqueVisitors,
      liveCount,
      downloadClicks,
      iosDownloads,
      androidDownloads,
      bexdrClicks,
      avgDurationSeconds,
      downloadConversion,
      bexdrConversion,
    };
  }, [filteredVisitors, visitors, isVisitorLive]);

  // Format Duration helper
  const formatDuration = (seconds: number) => {
    if (seconds <= 0) return isKu ? 'کەمتر لە ١٠ چرکە' : '< 10s';
    if (seconds < 60) return `${seconds} ${isKu ? 'چرکە' : 'sec'}`;
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins} ${isKu ? 'خولەک' : 'min'}${secs > 0 ? ` ${secs} ${isKu ? 'چرکە' : 's'}` : ''}`;
  };

  // ── Acquisition / Referrer Breakdown ──
  const acquisitionBreakdown = useMemo(() => {
    const counts: Record<string, number> = {
      'Direct (ڕاستەوخۆ)': 0,
      'Google Search': 0,
      Instagram: 0,
      TikTok: 0,
      Facebook: 0,
      WhatsApp: 0,
      Other: 0,
    };

    filteredVisitors.forEach((v) => {
      const ref = (v.referrer || 'Direct').toLowerCase();
      const det = (v.referrerSourceDetail || '').toLowerCase();
      if (ref.includes('google') || det.includes('google')) counts['Google Search']++;
      else if (ref.includes('instagram') || det.includes('instagram')) counts['Instagram']++;
      else if (ref.includes('tiktok') || det.includes('tiktok')) counts['TikTok']++;
      else if (ref.includes('facebook') || det.includes('facebook')) counts['Facebook']++;
      else if (ref.includes('whatsapp') || det.includes('whatsapp')) counts['WhatsApp']++;
      else if (ref.includes('direct') || det.includes('direct') || v.referrerCategory === 'direct')
        counts['Direct (ڕاستەوخۆ)']++;
      else counts['Other']++;
    });

    const total = filteredVisitors.length || 1;
    return Object.entries(counts)
      .filter(([_, count]) => count > 0 || filteredVisitors.length === 0)
      .map(([source, count]) => ({
        source,
        count,
        percent: filteredVisitors.length > 0 ? Math.round((count / total) * 100) : 0,
      }))
      .sort((a, b) => b.count - a.count);
  }, [filteredVisitors]);

  // ── Geographic Breakdown ──
  const geographicBreakdown = useMemo(() => {
    const counts: Record<string, number> = {};
    filteredVisitors.forEach((v) => {
      const loc = v.city ? `${v.city} (${v.country})` : v.locationLabel || 'کوردستان، عێراق';
      counts[loc] = (counts[loc] || 0) + 1;
    });

    const total = filteredVisitors.length || 1;
    return Object.entries(counts)
      .map(([location, count]) => ({
        location,
        count,
        percent: filteredVisitors.length > 0 ? Math.round((count / total) * 100) : 0,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 6);
  }, [filteredVisitors]);

  // ── Device & Platform Breakdown ──
  const deviceBreakdown = useMemo(() => {
    let mobile = 0;
    let desktop = 0;
    let tablet = 0;
    let ios = 0;
    let android = 0;
    let mac = 0;
    let windows = 0;

    filteredVisitors.forEach((v) => {
      if (v.deviceType === 'mobile') mobile++;
      else if (v.deviceType === 'tablet') tablet++;
      else desktop++;

      const osStr = (v.os || '').toLowerCase();
      const devStr = (v.deviceModel || '').toLowerCase();
      if (osStr.includes('ios') || devStr.includes('iphone') || devStr.includes('ipad')) ios++;
      else if (osStr.includes('android')) android++;
      else if (osStr.includes('mac')) mac++;
      else if (osStr.includes('windows')) windows++;
    });

    const total = filteredVisitors.length || 1;
    return {
      mobilePct: filteredVisitors.length > 0 ? Math.round(((mobile + tablet) / total) * 100) : 0,
      desktopPct: filteredVisitors.length > 0 ? Math.round((desktop / total) * 100) : 0,
      iosCount: ios,
      androidCount: android,
      macCount: mac,
      windowsCount: windows,
    };
  }, [filteredVisitors]);

  // ── Top Clicked Sections & Buttons ──
  const topInteractions = useMemo(() => {
    let appDownloadClicks = 0;
    let bexdrClicks = 0;
    let featuresViews = 0;
    let contactViews = 0;
    let showcaseViews = 0;

    filteredVisitors.forEach((v) => {
      if (v.downloadClicked) appDownloadClicks += v.clicksCount || 1;
      if (v.bexdrClicked) bexdrClicks += 1;
      if (v.sectionsViewed?.some((s) => s.includes('features'))) featuresViews += 1;
      if (v.sectionsViewed?.some((s) => s.includes('contact'))) contactViews += 1;
      if (v.sectionsViewed?.some((s) => s.includes('showcase'))) showcaseViews += 1;
    });

    return [
      {
        name: isKu ? 'بەتنی داگرتنی ئەپ (App Store & Play)' : 'App Download Buttons',
        type: 'button',
        count: appDownloadClicks,
        tag: '🚀 داگرتن',
        color: 'amber',
      },
      {
        name: isKu ? 'لینکی ماڵپەڕی بێکسدر (BexDre Website)' : 'BexDre Official Link',
        type: 'link',
        count: bexdrClicks,
        tag: '🔗 دەرەکی',
        color: 'purple',
      },
      {
        name: isKu ? 'بەشی تایبەتمەندییەکان (Features)' : 'Features Section',
        type: 'section',
        count: featuresViews,
        tag: '👁️ بینین',
        color: 'blue',
      },
      {
        name: isKu ? 'بەشی ئامێرەکان (3D Showcase)' : '3D Devices Showcase',
        type: 'section',
        count: showcaseViews,
        tag: '📱 شاشەکان',
        color: 'emerald',
      },
      {
        name: isKu ? 'بەشی پەیوەندی و خزمەتگوزاری' : 'Contact & Support',
        type: 'section',
        count: contactViews,
        tag: '💬 ڕاژە',
        color: 'rose',
      },
    ].sort((a, b) => b.count - a.count);
  }, [filteredVisitors, isKu]);

  // ── Filtered Visitors Table Stream ──
  const displayedVisitors = useMemo(() => {
    return filteredVisitors.filter((v) => {
      // Tab filter
      if (visitorFilterTab === 'live' && !isVisitorLive(v)) return false;
      if (visitorFilterTab === 'download' && !v.downloadClicked) return false;
      if (visitorFilterTab === 'bexdr' && !v.bexdrClicked) return false;

      // Search query
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const match =
          v.deviceModel.toLowerCase().includes(query) ||
          v.city.toLowerCase().includes(query) ||
          v.country.toLowerCase().includes(query) ||
          v.referrer.toLowerCase().includes(query) ||
          (v.referrerSourceDetail || '').toLowerCase().includes(query) ||
          (v.fullUrl || '').toLowerCase().includes(query) ||
          v.path.toLowerCase().includes(query) ||
          v.os.toLowerCase().includes(query) ||
          v.browser.toLowerCase().includes(query) ||
          v.sessionId.toLowerCase().includes(query);
        if (!match) return false;
      }

      return true;
    });
  }, [filteredVisitors, visitorFilterTab, searchQuery, isVisitorLive]);

  // ── Export CSV Handler ──
  const handleExportCSV = () => {
    const headers = [
      'Session ID',
      'Visitor ID',
      'Opened Link / URL',
      'Referrer / Source',
      'Device Model',
      'OS',
      'Browser',
      'Location',
      'Downloaded App',
      'BexDre Clicked',
      'Duration (sec)',
      'Start Time',
      'Last Active',
      'Left At',
    ];

    const rows = filteredVisitors.map((v) => [
      v.sessionId,
      v.visitorId,
      `"${v.fullUrl || v.path}"`,
      `"${v.referrerSourceDetail || v.referrer}"`,
      `"${v.deviceModel}"`,
      v.os,
      v.browser,
      `"${v.locationLabel}"`,
      v.downloadClicked ? 'YES' : 'NO',
      v.bexdrClicked ? 'YES' : 'NO',
      v.durationSeconds,
      v.startedAt,
      v.lastActiveAt,
      v.leftAt || '',
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,\uFEFF' +
      [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `froshiar_real_analytics_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // ── Light / Dark Mode Color Classes ──
  const cardBg = isDarkMode ? 'bg-[#0F1422] border-slate-800/90' : 'bg-white border-slate-200/90 shadow-sm';
  const subCardBg = isDarkMode ? 'bg-slate-900/80 border-slate-800' : 'bg-slate-50 border-slate-200';
  const textTitle = isDarkMode ? 'text-white' : 'text-slate-900';
  const textBody = isDarkMode ? 'text-slate-300' : 'text-slate-700';
  const textMuted = isDarkMode ? 'text-slate-400' : 'text-slate-500';
  const borderSubtle = isDarkMode ? 'border-slate-800' : 'border-slate-200';

  return (
    <div className="space-y-5 sm:space-y-6 animate-in fade-in duration-300">
      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {/* ── HEADER BANNER: REAL LIVE TELEMETRY ──                              */}
      {/* ═══════════════════════════════════════════════════════════════════════ */}
      <div
        className={`flex flex-col lg:flex-row lg:items-center justify-between gap-4 p-5 sm:p-6 rounded-3xl border transition-colors shadow-xl ${
          isDarkMode
            ? 'bg-gradient-to-br from-[#121826]/95 via-[#0B0F17]/95 to-[#090C10] border-white/10'
            : 'bg-gradient-to-br from-white via-amber-50/20 to-slate-50 border-slate-200 shadow-slate-200/60'
        }`}
      >
        <div className="flex items-center gap-3.5 sm:gap-4">
          <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-gradient-to-tr from-amber-500 via-amber-400 to-yellow-300 flex items-center justify-center text-slate-950 font-black shadow-lg shadow-amber-500/20 shrink-0">
            <Globe className="w-6 h-6 sm:w-7 sm:h-7" />
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className={`text-xl sm:text-2xl font-black tracking-tight ${textTitle}`}>
                {isKu ? 'ئامارەکانی وێبسایتی فرۆشیار' : 'Froshiar Website Live Telemetry'}
              </h1>
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500" />
              </span>
            </div>
            <p className={`text-xs sm:text-sm mt-0.5 ${textMuted}`}>
              {isKu
                ? 'چاودێریکردنی ڕاستەوخۆ (لایڤ)، سەردانیکەرانی ئەکتیڤ، سەرچاوەی هاتنەژوورەوە و جوگرافیا'
                : '100% Real production analytics from froshiar.store with instant presence & traffic tracking'}
            </p>
          </div>
        </div>

        {/* Action Controls: Live Pill, Manual Refresh, CSV Export */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          {/* Live Indicator Badge */}
          <div
            className={`flex items-center gap-2 px-3.5 py-2 rounded-2xl border text-xs font-bold ${
              metrics.liveCount > 0
                ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-500'
                : isDarkMode
                ? 'bg-slate-800/80 border-slate-700 text-slate-400'
                : 'bg-slate-100 border-slate-200 text-slate-600'
            }`}
          >
            <span
              className={`w-2 h-2 rounded-full ${
                metrics.liveCount > 0 ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'
              }`}
            />
            <span>
              {metrics.liveCount}{' '}
              {isKu ? 'کەس لایڤە لەسەر وێبەکە' : 'Live Active Visitors'}
            </span>
          </div>

          {/* Realtime onSnapshot status badge */}
          <div
            className={`hidden sm:flex items-center gap-1.5 px-3 py-2 rounded-2xl border text-xs font-semibold ${
              isLiveConnected
                ? 'bg-blue-500/10 border-blue-500/30 text-blue-500'
                : isDarkMode
                ? 'bg-slate-800 border-slate-700 text-slate-400'
                : 'bg-slate-100 border-slate-200 text-slate-500'
            }`}
            title="Firestore Realtime onSnapshot Sync"
          >
            <Radio className={`w-3.5 h-3.5 ${isLiveConnected ? 'animate-pulse text-blue-500' : ''}`} />
            <span>{isKu ? 'پەیوەستکراوە (لایڤ)' : 'Live Stream'}</span>
          </div>

          {/* Manual Refresh Button */}
          <button
            onClick={handleManualRefresh}
            disabled={loading}
            className={`p-2 sm:px-3 sm:py-2 rounded-2xl border text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer ${
              isDarkMode
                ? 'bg-slate-800/90 hover:bg-slate-700 border-slate-700 text-slate-200'
                : 'bg-white hover:bg-slate-100 border-slate-200 text-slate-700 shadow-sm'
            }`}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">{isKu ? 'نوێکردنەوە' : 'Refresh'}</span>
          </button>

          {/* Export CSV */}
          <button
            onClick={handleExportCSV}
            className="px-3.5 py-2 rounded-2xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-500 text-xs font-bold flex items-center gap-2 transition cursor-pointer shadow-sm"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>{isKu ? 'دەرهێنان (Excel)' : 'Export CSV'}</span>
          </button>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {/* ── DATE PERIOD FILTERS ──                                             */}
      {/* ═══════════════════════════════════════════════════════════════════════ */}
      <div
        className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 sm:p-4 rounded-2xl border transition-colors ${
          isDarkMode ? 'bg-[#0E131F]/90 border-slate-800/80' : 'bg-white border-slate-200 shadow-sm'
        }`}
      >
        <div className="flex items-center gap-2 text-xs font-bold text-amber-500">
          <Calendar className="w-4 h-4 text-amber-500" />
          <span className={textTitle}>{isKu ? 'فلتەری کاتیی سەردانەکان:' : 'Date Period Filter:'}</span>
        </div>

        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
          {(
            [
              { key: 'today', ku: 'ئەمڕۆ', en: 'Today' },
              { key: 'yesterday', ku: 'دوێنێ', en: 'Yesterday' },
              { key: '7days', ku: '٧ ڕۆژی ڕابردوو', en: 'Last 7 Days' },
              { key: '30days', ku: '٣٠ ڕۆژی ڕابردوو', en: 'Last 30 Days' },
              { key: 'all', ku: 'هەموو کات', en: 'All Time' },
              { key: 'custom', ku: 'کاستەم', en: 'Custom' },
            ] as const
          ).map((item) => (
            <button
              key={item.key}
              onClick={() => setDateFilter(item.key)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                dateFilter === item.key
                  ? 'bg-amber-400 text-slate-950 shadow-md shadow-amber-400/20'
                  : isDarkMode
                  ? 'bg-slate-800/60 hover:bg-slate-700/80 text-slate-300 border border-slate-700/60'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200'
              }`}
            >
              {isKu ? item.ku : item.en}
            </button>
          ))}
        </div>
      </div>

      {/* Custom Date Inputs if Custom selected */}
      {dateFilter === 'custom' && (
        <div
          className={`p-4 rounded-2xl border flex flex-wrap items-center gap-4 animate-in fade-in ${
            isDarkMode ? 'bg-[#0F1422] border-amber-500/30' : 'bg-amber-50/50 border-amber-300 shadow-sm'
          }`}
        >
          <div className="flex items-center gap-2 text-xs">
            <span className={textTitle}>{isKu ? 'لە بەرواری:' : 'From:'}</span>
            <input
              type="date"
              value={customStartDate}
              onChange={(e) => setCustomStartDate(e.target.value)}
              className={`rounded-xl px-3 py-1.5 text-xs focus:outline-none focus:border-amber-400 border ${
                isDarkMode
                  ? 'bg-slate-900 border-slate-700 text-white'
                  : 'bg-white border-slate-300 text-slate-900 shadow-sm'
              }`}
            />
          </div>
          <div className="flex items-center gap-2 text-xs">
            <span className={textTitle}>{isKu ? 'تا بەرواری:' : 'To:'}</span>
            <input
              type="date"
              value={customEndDate}
              onChange={(e) => setCustomEndDate(e.target.value)}
              className={`rounded-xl px-3 py-1.5 text-xs focus:outline-none focus:border-amber-400 border ${
                isDarkMode
                  ? 'bg-slate-900 border-slate-700 text-white'
                  : 'bg-white border-slate-300 text-slate-900 shadow-sm'
              }`}
            />
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {/* ── 5 PRIMARY KPI CARDS (LIGHT & DARK RESPONSIVE) ──                   */}
      {/* ═══════════════════════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5 sm:gap-4">
        {/* CARD 1: LIVE ACTIVE NOW */}
        <div
          className={`relative overflow-hidden p-5 rounded-3xl border shadow-xl transition-all ${
            isDarkMode
              ? 'bg-gradient-to-br from-[#0F2218] via-[#0B1712] to-[#080D0A] border-emerald-500/30'
              : 'bg-gradient-to-br from-emerald-50/80 via-white to-emerald-50/30 border-emerald-200 shadow-emerald-100/50'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-emerald-500 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
              {isKu ? 'سەردانیکەرانی ئێستا' : 'Active Live Now'}
            </span>
            <div className="w-8 h-8 rounded-xl bg-emerald-500/20 flex items-center justify-center text-emerald-500">
              <Activity className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className={`text-3xl sm:text-4xl font-black tracking-tight ${textTitle}`}>
              {metrics.liveCount}
            </span>
            <span className="text-xs text-emerald-600 font-medium">
              {isKu ? 'کەس لەسەر وێبەکەیە' : 'online visitors'}
            </span>
          </div>
          <div className={`mt-2 text-[11px] flex items-center gap-1.5 ${textMuted}`}>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            <span>{isKu ? 'نوێکردنەوەی چرکەبەچرکە' : 'Real-time WebSocket / Ping'}</span>
          </div>
        </div>

        {/* CARD 2: TOTAL VISITS & UNIQUE */}
        <div
          className={`relative overflow-hidden p-5 rounded-3xl border shadow-xl transition-all ${
            isDarkMode ? 'bg-[#111624] border-slate-800' : 'bg-white border-slate-200 shadow-slate-100'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className={`text-xs font-bold ${textMuted}`}>
              {isKu ? 'کۆی سەردانەکان' : 'Total Pageviews / Visits'}
            </span>
            <div className="w-8 h-8 rounded-xl bg-blue-500/20 flex items-center justify-center text-blue-500">
              <Globe className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className={`text-3xl sm:text-4xl font-black tracking-tight ${textTitle}`}>
              {metrics.totalVisits}
            </span>
            <span className="text-xs text-blue-500 font-medium">
              {metrics.uniqueVisitors} {isKu ? 'کەسی جیاواز' : 'unique'}
            </span>
          </div>
          <div className={`mt-2 text-[11px] flex items-center gap-1 ${textMuted}`}>
            <TrendingUp className="w-3 h-3 text-emerald-500" />
            <span>{isKu ? 'بەپێی ماوەی دیاریکراو' : 'Within selected period'}</span>
          </div>
        </div>

        {/* CARD 3: APP DOWNLOAD CLICKS */}
        <div
          className={`relative overflow-hidden p-5 rounded-3xl border shadow-xl transition-all ${
            isDarkMode
              ? 'bg-gradient-to-br from-[#241C0A] via-[#1A1408] to-[#100C05] border-amber-500/40'
              : 'bg-gradient-to-br from-amber-50/70 via-white to-amber-50/30 border-amber-200 shadow-amber-100/50'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-amber-500 flex items-center gap-1">
              <Download className="w-3.5 h-3.5" />
              {isKu ? 'داگرتنی ئەپەکە' : 'App Download Clicks'}
            </span>
            <div className="w-8 h-8 rounded-xl bg-amber-500/20 flex items-center justify-center text-amber-500">
              <Smartphone className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl sm:text-4xl font-black text-amber-500 tracking-tight">
              {metrics.downloadClicks}
            </span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-600 font-bold border border-amber-500/30">
              {metrics.downloadConversion}%
            </span>
          </div>
          <div className={`mt-2 text-[11px] flex items-center justify-between ${textMuted}`}>
            <span>🍏 iOS: {metrics.iosDownloads}</span>
            <span>🤖 Android: {metrics.androidDownloads}</span>
          </div>
        </div>

        {/* CARD 4: BEXDR WEBSITE CLICKS */}
        <div
          className={`relative overflow-hidden p-5 rounded-3xl border shadow-xl transition-all ${
            isDarkMode
              ? 'bg-gradient-to-br from-[#1E1229] via-[#140D1C] to-[#0A070E] border-purple-500/30'
              : 'bg-gradient-to-br from-purple-50/70 via-white to-purple-50/30 border-purple-200 shadow-purple-100/50'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-purple-500 flex items-center gap-1">
              <ExternalLink className="w-3.5 h-3.5" />
              {isKu ? 'سەردانی وێبسایتی بێکسدر' : 'BexDre Website Clicks'}
            </span>
            <div className="w-8 h-8 rounded-xl bg-purple-500/20 flex items-center justify-center text-purple-500">
              <Sparkles className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl sm:text-4xl font-black text-purple-500 tracking-tight">
              {metrics.bexdrClicks}
            </span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-600 font-bold border border-purple-500/30">
              {metrics.bexdrConversion}%
            </span>
          </div>
          <div className={`mt-2 text-[11px] truncate ${textMuted}`}>
            {isKu ? 'کرتەکردن لە لۆگۆ و لینکی فەرمی بێکسدر' : 'Clicks on BexDre links'}
          </div>
        </div>

        {/* CARD 5: AVG TIME ON WEBSITE */}
        <div
          className={`relative overflow-hidden p-5 rounded-3xl border shadow-xl transition-all ${
            isDarkMode ? 'bg-[#111624] border-slate-800' : 'bg-white border-slate-200 shadow-slate-100'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className={`text-xs font-bold ${textMuted}`}>
              {isKu ? 'ماوەی مانەوە لە وێبەکە' : 'Avg Time on Site'}
            </span>
            <div className="w-8 h-8 rounded-xl bg-emerald-500/20 flex items-center justify-center text-emerald-500">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className={`text-2xl sm:text-3xl font-black tracking-tight ${textTitle}`}>
              {formatDuration(metrics.avgDurationSeconds)}
            </span>
          </div>
          <div className={`mt-2 text-[11px] ${textMuted}`}>
            {isKu ? 'تێکڕای کاتی مانەوەی هەر سەردانیکەرێک' : 'Average visitor duration'}
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {/* ── VISUAL BREAKDOWNS (REFERRERS, CITIES, DEVICES) ──                   */}
      {/* ═══════════════════════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-5">
        {/* PANEL 1: ACQUISITION / REFERRERS */}
        <div className={`p-5 sm:p-6 rounded-3xl border shadow-xl flex flex-col justify-between transition-colors ${cardBg}`}>
          <div>
            <div className={`flex items-center justify-between pb-3 border-b ${borderSubtle}`}>
              <div className="flex items-center gap-2 font-bold text-sm text-amber-500">
                <Compass className="w-4 h-4 text-amber-500" />
                <span className={textTitle}>
                  {isKu ? 'لە کوێوە داخڵ بوون؟ (سەرچاوەکان)' : 'Acquisition Channels'}
                </span>
              </div>
              <span className={`text-xs font-mono ${textMuted}`}>
                {filteredVisitors.length} {isKu ? 'سەردان' : 'hits'}
              </span>
            </div>

            <div className="mt-4 space-y-3">
              {acquisitionBreakdown.map((item) => (
                <div key={item.source} className="space-y-1">
                  <div className="flex items-center justify-between text-xs font-medium">
                    <span className={textBody}>{item.source}</span>
                    <span className={`font-mono ${textMuted}`}>
                      {item.count} ({item.percent}%)
                    </span>
                  </div>
                  <div
                    className={`w-full h-2 rounded-full overflow-hidden ${
                      isDarkMode ? 'bg-slate-800' : 'bg-slate-100'
                    }`}
                  >
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        item.source.includes('Direct')
                          ? 'bg-amber-400'
                          : item.source.includes('Google')
                          ? 'bg-blue-400'
                          : item.source.includes('Instagram')
                          ? 'bg-rose-400'
                          : item.source.includes('TikTok')
                          ? 'bg-emerald-400'
                          : 'bg-purple-400'
                      }`}
                      style={{ width: `${Math.max(item.percent, item.count > 0 ? 5 : 0)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className={`mt-4 pt-3 border-t text-[11px] ${borderSubtle} ${textMuted}`}>
            {isKu
              ? 'ناسینەوەی بەستەری ئینستاگرام، تیک تۆک، فەیسبووک و ڕاستەوخۆ'
              : 'Auto-detection of Instagram bio, TikTok, Facebook & Direct links'}
          </div>
        </div>

        {/* PANEL 2: GEOGRAPHIC & CITIES */}
        <div className={`p-5 sm:p-6 rounded-3xl border shadow-xl flex flex-col justify-between transition-colors ${cardBg}`}>
          <div>
            <div className={`flex items-center justify-between pb-3 border-b ${borderSubtle}`}>
              <div className="flex items-center gap-2 font-bold text-sm text-emerald-500">
                <MapPin className="w-4 h-4 text-emerald-500" />
                <span className={textTitle}>
                  {isKu ? 'شوێن و جوگرافیا (شارەکان)' : 'Geographic Distribution'}
                </span>
              </div>
              <span className="text-xs text-emerald-500 font-bold">
                {geographicBreakdown.length} {isKu ? 'شوێن' : 'locations'}
              </span>
            </div>

            <div className="mt-4 space-y-3">
              {geographicBreakdown.length === 0 ? (
                <div className={`py-6 text-center text-xs ${textMuted}`}>
                  {isKu ? 'چاوەڕوانی سەردانەکان...' : 'Waiting for visits...'}
                </div>
              ) : (
                geographicBreakdown.map((item) => (
                  <div key={item.location} className="space-y-1">
                    <div className="flex items-center justify-between text-xs font-medium">
                      <span className={`flex items-center gap-1.5 ${textBody}`}>
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                        {item.location}
                      </span>
                      <span className={`font-mono font-bold ${textMuted}`}>
                        {item.count} ({item.percent}%)
                      </span>
                    </div>
                    <div
                      className={`w-full h-2 rounded-full overflow-hidden ${
                        isDarkMode ? 'bg-slate-800' : 'bg-slate-100'
                      }`}
                    >
                      <div
                        className="h-full rounded-full bg-emerald-500 transition-all duration-500"
                        style={{ width: `${Math.max(item.percent, 5)}%` }}
                      />
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className={`mt-4 pt-3 border-t text-[11px] ${borderSubtle} ${textMuted}`}>
            {isKu ? 'شوێنی ورد لە ڕێگەی IP و وڵاتی وێبگەڕ' : 'Precise IP geo-location resolution'}
          </div>
        </div>

        {/* PANEL 3: DEVICES & PLATFORMS */}
        <div className={`p-5 sm:p-6 rounded-3xl border shadow-xl flex flex-col justify-between transition-colors ${cardBg}`}>
          <div>
            <div className={`flex items-center justify-between pb-3 border-b ${borderSubtle}`}>
              <div className="flex items-center gap-2 font-bold text-sm text-blue-500">
                <Laptop className="w-4 h-4 text-blue-500" />
                <span className={textTitle}>
                  {isKu ? 'ئامێرەکان و سیستەمەکان' : 'Device & OS Breakdown'}
                </span>
              </div>
              <span className={`text-xs font-mono ${textMuted}`}>
                {deviceBreakdown.mobilePct}% {isKu ? 'مۆبایل' : 'Mobile'}
              </span>
            </div>

            {/* Mobile vs Desktop Bar */}
            <div className="mt-4 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className={`flex items-center gap-1.5 ${textBody}`}>
                  <Smartphone className="w-3.5 h-3.5 text-amber-500" />
                  {isKu ? 'مۆبایل و تابلێت' : 'Mobile'} ({deviceBreakdown.mobilePct}%)
                </span>
                <span className={`flex items-center gap-1.5 ${textBody}`}>
                  <Laptop className="w-3.5 h-3.5 text-blue-500" />
                  {isKu ? 'کۆمپیوتەر' : 'Desktop'} ({deviceBreakdown.desktopPct}%)
                </span>
              </div>
              <div
                className={`w-full h-3 rounded-full flex overflow-hidden ${
                  isDarkMode ? 'bg-slate-800' : 'bg-slate-200'
                }`}
              >
                <div
                  className="bg-amber-400 h-full transition-all duration-500"
                  style={{ width: `${deviceBreakdown.mobilePct}%` }}
                />
                <div
                  className="bg-blue-500 h-full transition-all duration-500"
                  style={{ width: `${deviceBreakdown.desktopPct}%` }}
                />
              </div>
            </div>

            {/* Operating Systems list */}
            <div className="mt-5 grid grid-cols-2 gap-2 text-xs">
              <div className={`p-2.5 rounded-xl border flex items-center justify-between ${subCardBg}`}>
                <span className={textBody}>🍏 iOS:</span>
                <span className={`font-bold font-mono ${textTitle}`}>{deviceBreakdown.iosCount}</span>
              </div>
              <div className={`p-2.5 rounded-xl border flex items-center justify-between ${subCardBg}`}>
                <span className={textBody}>🤖 Android:</span>
                <span className={`font-bold font-mono ${textTitle}`}>{deviceBreakdown.androidCount}</span>
              </div>
              <div className={`p-2.5 rounded-xl border flex items-center justify-between ${subCardBg}`}>
                <span className={textBody}>💻 macOS:</span>
                <span className={`font-bold font-mono ${textTitle}`}>{deviceBreakdown.macCount}</span>
              </div>
              <div className={`p-2.5 rounded-xl border flex items-center justify-between ${subCardBg}`}>
                <span className={textBody}>🪟 Windows:</span>
                <span className={`font-bold font-mono ${textTitle}`}>{deviceBreakdown.windowsCount}</span>
              </div>
            </div>
          </div>

          <div className={`mt-4 pt-3 border-t text-[11px] ${borderSubtle} ${textMuted}`}>
            {isKu ? 'تایبەتمەندی ڕاستەقینەی ئامێری بەکارهێنەر' : 'Hardware & User-Agent metrics'}
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {/* ── TOP CLICKED BUTTONS & SECTIONS ──                                  */}
      {/* ═══════════════════════════════════════════════════════════════════════ */}
      <div className={`p-5 sm:p-6 rounded-3xl border shadow-xl transition-colors ${cardBg}`}>
        <div className={`flex items-center justify-between pb-3.5 border-b ${borderSubtle}`}>
          <div>
            <h2 className={`text-sm sm:text-base font-bold flex items-center gap-2 ${textTitle}`}>
              <Layers className="w-4 h-4 text-amber-500" />
              <span>{isKu ? 'زۆرترین بەش و بەتنی سەردانیکراو و کلیک لێکراو' : 'Most Clicked Buttons & Popular Sections'}</span>
            </h2>
            <p className={`text-xs mt-0.5 ${textMuted}`}>
              {isKu
                ? 'کام بەتن زۆرترین کرتەی لێ کراوە لەگەڵ لینکەکانی داگرتن و وێبسایتی بێکسدر'
                : 'Ranked interactions and clickstream distribution'}
            </p>
          </div>
          <span className="text-xs px-3 py-1 rounded-full bg-amber-400/10 text-amber-500 font-bold border border-amber-400/20">
            {isKu ? 'ڕیزبەندی کراو' : 'Ranked'}
          </span>
        </div>

        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
          {topInteractions.map((item, idx) => (
            <div
              key={idx}
              className={`p-4 rounded-2xl border transition flex flex-col justify-between ${subCardBg}`}
            >
              <div>
                <div className="flex items-center justify-between">
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      isDarkMode ? 'bg-slate-800 text-slate-300' : 'bg-slate-200 text-slate-700'
                    }`}
                  >
                    #{idx + 1}
                  </span>
                  <span className="text-[10px] font-bold text-amber-500 font-mono">
                    {item.tag}
                  </span>
                </div>
                <h3 className={`text-xs font-bold mt-2.5 line-clamp-2 leading-relaxed ${textTitle}`}>
                  {item.name}
                </h3>
              </div>
              <div className={`mt-4 pt-2.5 border-t flex items-baseline justify-between ${borderSubtle}`}>
                <span className={`text-[11px] ${textMuted}`}>{isKu ? 'کۆی کرتەکان:' : 'Total Clicks:'}</span>
                <span className="text-lg font-black text-amber-500 font-mono">{item.count}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {/* ── RECENT VISITORS STREAM TABLE (FULL DETAILS & URL DISPLAY) ──       */}
      {/* ═══════════════════════════════════════════════════════════════════════ */}
      <div className={`p-5 sm:p-6 rounded-3xl border shadow-xl space-y-4 transition-colors ${cardBg}`}>
        {/* Table Header & Controls */}
        <div className={`flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b ${borderSubtle}`}>
          <div>
            <h2 className={`text-base font-bold flex items-center gap-2 ${textTitle}`}>
              <Users className="w-4 h-4 text-blue-500" />
              <span>{isKu ? 'دواین سەردانیکەران بە وردەکاری تەواو' : 'Recent Visitors Stream'}</span>
            </h2>
            <p className={`text-xs mt-0.5 ${textMuted}`}>
              {isKu
                ? 'تۆماری چرکەبەچرکە: لینکی داواکراو، لە کوێوە هاتوە (سەرچاوە)، ئامێر، شار، داگرتن و مانەوە'
                : 'Realtime log of requested URL, referrer source, device, city, downloads, and duration'}
            </p>
          </div>

          {/* Table Search & Quick Tabs */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Search Input */}
            <div className="relative">
              <Search className={`w-3.5 h-3.5 absolute top-1/2 -translate-y-1/2 left-3 ${textMuted}`} />
              <input
                type="text"
                placeholder={isKu ? 'گەڕان بەپێی شار، ئامێر، بەستەر...' : 'Search city, link, device...'}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={`rounded-xl pl-8 pr-3 py-1.5 text-xs border focus:outline-none focus:border-amber-400 w-44 sm:w-56 ${
                  isDarkMode
                    ? 'bg-slate-900 border-slate-800 text-white placeholder-slate-500'
                    : 'bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400'
                }`}
              />
            </div>

            {/* Quick Filter Tabs */}
            <div
              className={`flex items-center gap-1 p-1 rounded-xl border ${
                isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-slate-100 border-slate-200'
              }`}
            >
              <button
                onClick={() => setVisitorFilterTab('all')}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                  visitorFilterTab === 'all'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : isDarkMode
                    ? 'text-slate-400 hover:text-white'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {isKu ? 'هەموو' : 'All'}
              </button>
              <button
                onClick={() => setVisitorFilterTab('live')}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1 ${
                  visitorFilterTab === 'live'
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : isDarkMode
                    ? 'text-slate-400 hover:text-emerald-400'
                    : 'text-slate-600 hover:text-emerald-600'
                }`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                {isKu ? 'لایڤ' : 'Live'}
              </button>
              <button
                onClick={() => setVisitorFilterTab('download')}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                  visitorFilterTab === 'download'
                    ? 'bg-amber-500 text-slate-950 font-black shadow-sm'
                    : isDarkMode
                    ? 'text-slate-400 hover:text-amber-400'
                    : 'text-slate-600 hover:text-amber-600'
                }`}
              >
                {isKu ? 'داگرتن' : 'Download'}
              </button>
              <button
                onClick={() => setVisitorFilterTab('bexdr')}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                  visitorFilterTab === 'bexdr'
                    ? 'bg-purple-600 text-white shadow-sm'
                    : isDarkMode
                    ? 'text-slate-400 hover:text-purple-400'
                    : 'text-slate-600 hover:text-purple-600'
                }`}
              >
                {isKu ? 'بێکسدر' : 'BexDre'}
              </button>
            </div>
          </div>
        </div>

        {/* Visitors Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-start text-xs">
            <thead>
              <tr
                className={`border-b font-bold ${
                  isDarkMode
                    ? 'border-slate-800/80 text-slate-400'
                    : 'border-slate-200 text-slate-600 bg-slate-50/70'
                }`}
              >
                <th className="py-2.5 px-3 text-start">{isKu ? 'دۆخ' : 'Status'}</th>
                <th className="py-2.5 px-3 text-start">{isKu ? 'لینکی کراوە (لاپەڕە)' : 'Opened URL / Page'}</th>
                <th className="py-2.5 px-3 text-start">{isKu ? 'لە کوێوە هاتوە (سەرچاوە)' : 'Referrer / Source'}</th>
                <th className="py-2.5 px-3 text-start">{isKu ? 'ئامێر و سیستەم' : 'Device & OS'}</th>
                <th className="py-2.5 px-3 text-start">{isKu ? 'شوێن و شار' : 'Location'}</th>
                <th className="py-2.5 px-3 text-start">{isKu ? 'مانەوە' : 'Duration'}</th>
                <th className="py-2.5 px-3 text-start">{isKu ? 'کردارەکان (کلیک)' : 'Actions'}</th>
                <th className="py-2.5 px-3 text-start">{isKu ? 'کات' : 'Time'}</th>
                <th className="py-2.5 px-3 text-center">{isKu ? 'وردەکاری' : 'Details'}</th>
              </tr>
            </thead>
            <tbody className={`divide-y ${isDarkMode ? 'divide-slate-800/60' : 'divide-slate-100'}`}>
              {displayedVisitors.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <div className="w-12 h-12 rounded-2xl bg-amber-500/10 flex items-center justify-center text-amber-500">
                        <Activity className="w-6 h-6 animate-pulse" />
                      </div>
                      <p className={`font-bold text-sm ${textTitle}`}>
                        {isKu
                          ? 'هیچ سەردانیکەرێکی ڕاستەقینە لەم ماوەیەدا نەدۆزرایەوە'
                          : 'No real website visitors recorded in this filter period'}
                      </p>
                      <p className={`text-xs max-w-md ${textMuted}`}>
                        {isKu
                          ? 'سیستەمی چاودێری ڕاستەوخۆ چالاکە. کاتێک سەردانیکەرێک لەسەر froshiar.store دەبێت، ڕاستەوخۆ لێرە دەردەکەوێت.'
                          : 'Realtime tracking is actively listening on froshiar.store. Live visits will appear here immediately.'}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                displayedVisitors.map((v) => {
                  const live = isVisitorLive(v);
                  const displayUrl = v.fullUrl || (v.domain ? `https://${v.domain}${v.path}` : v.path);

                  return (
                    <tr
                      key={v.id}
                      className={`transition cursor-pointer group ${
                        isDarkMode ? 'hover:bg-slate-800/30' : 'hover:bg-amber-50/40'
                      }`}
                      onClick={() => setSelectedVisitor(v)}
                    >
                      {/* STATUS */}
                      <td className="py-3 px-3 whitespace-nowrap">
                        {live ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/40 text-emerald-500 text-[10px] font-bold">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            {isKu ? 'لایڤ ئێستا' : 'Online Live'}
                          </span>
                        ) : (
                          <span className={`text-[11px] font-medium ${textMuted}`}>
                            {isKu ? 'تەواوبوو' : 'Past Visit'}
                          </span>
                        )}
                      </td>

                      {/* OPENED URL / PAGE */}
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-1.5 max-w-[180px] sm:max-w-[220px]">
                          <Globe className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                          <span
                            className={`font-mono text-xs font-semibold truncate ${textTitle}`}
                            title={displayUrl}
                          >
                            {v.domain ? `${v.domain}${v.path}` : v.path}
                          </span>
                        </div>
                        {v.locale && (
                          <span className={`text-[10px] font-mono ${textMuted}`}>
                            locale: {v.locale}
                          </span>
                        )}
                      </td>

                      {/* REFERRER & SOURCE */}
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`px-2.5 py-1 rounded-lg text-xs font-semibold border ${
                              v.referrerCategory === 'social'
                                ? 'bg-rose-500/10 border-rose-500/30 text-rose-500'
                                : v.referrerCategory === 'google'
                                ? 'bg-blue-500/10 border-blue-500/30 text-blue-500'
                                : isDarkMode
                                ? 'bg-slate-800 text-slate-300 border-slate-700/60'
                                : 'bg-slate-100 text-slate-700 border-slate-200'
                            }`}
                          >
                            {v.referrerSourceDetail || v.referrer}
                          </span>
                        </div>
                      </td>

                      {/* DEVICE */}
                      <td className="py-3 px-3 whitespace-nowrap">
                        <div className={`font-bold flex items-center gap-1.5 ${textTitle}`}>
                          {v.deviceType === 'mobile' ? (
                            <Smartphone className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                          ) : (
                            <Laptop className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                          )}
                          <span className="truncate max-w-[130px]">{v.deviceModel}</span>
                        </div>
                        <div className={`text-[10px] truncate ${textMuted}`}>
                          {v.os} · {v.browser}
                        </div>
                      </td>

                      {/* LOCATION */}
                      <td className="py-3 px-3 whitespace-nowrap">
                        <div className={`font-medium flex items-center gap-1 ${textBody}`}>
                          <MapPin className="w-3 h-3 text-emerald-500 shrink-0" />
                          <span>{v.city || 'کوردستان'}</span>
                        </div>
                        <div className={`text-[10px] ${textMuted}`}>
                          {v.country || 'عێراق'}
                        </div>
                      </td>

                      {/* DURATION */}
                      <td className={`py-3 px-3 whitespace-nowrap font-mono ${textBody}`}>
                        {formatDuration(v.durationSeconds)}
                      </td>

                      {/* ACTIONS & CLICKS */}
                      <td className="py-3 px-3 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          {v.downloadClicked && (
                            <span className="px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-600 text-[10px] font-bold border border-amber-500/40 flex items-center gap-1">
                              <Download className="w-2.5 h-2.5" />
                              {isKu ? 'داگرتن' : 'App DL'}
                            </span>
                          )}
                          {v.bexdrClicked && (
                            <span className="px-2 py-0.5 rounded-md bg-purple-500/20 text-purple-600 text-[10px] font-bold border border-purple-500/40 flex items-center gap-1">
                              <ExternalLink className="w-2.5 h-2.5" />
                              BexDre
                            </span>
                          )}
                          {!v.downloadClicked && !v.bexdrClicked && (
                            <span className={`text-[11px] ${textMuted}`}>
                              {v.sectionsViewed.length} {isKu ? 'بەش' : 'sections'}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* TIMESTAMP */}
                      <td className={`py-3 px-3 whitespace-nowrap text-[11px] font-mono ${textMuted}`}>
                        {new Date(v.lastActiveAt).toLocaleTimeString(isKu ? 'ckb' : 'en', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </td>

                      {/* VIEW BUTTON */}
                      <td className="py-3 px-3 text-center">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedVisitor(v);
                          }}
                          className={`p-1.5 rounded-xl border transition cursor-pointer ${
                            isDarkMode
                              ? 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700 hover:text-white'
                              : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200 hover:text-slate-900'
                          }`}
                          title="View visitor journey"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {/* ── VISITOR DETAILS MODAL (LIGHT & DARK RESPONSIVE) ──                 */}
      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {selectedVisitor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-in fade-in">
          <div
            className={`relative w-full max-w-xl rounded-3xl border shadow-2xl p-6 space-y-4 max-h-[90vh] overflow-y-auto ${
              isDarkMode ? 'bg-[#0F1422] border-slate-700' : 'bg-white border-slate-200'
            }`}
          >
            {/* Modal Header */}
            <div className={`flex items-center justify-between pb-3 border-b ${borderSubtle}`}>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center text-amber-500 font-bold">
                  {selectedVisitor.deviceType === 'mobile' ? (
                    <Smartphone className="w-5 h-5" />
                  ) : (
                    <Laptop className="w-5 h-5" />
                  )}
                </div>
                <div>
                  <h3 className={`text-base font-bold ${textTitle}`}>
                    {selectedVisitor.deviceModel} ({selectedVisitor.os})
                  </h3>
                  <p className={`text-xs font-mono ${textMuted}`}>
                    Session: {selectedVisitor.sessionId}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedVisitor(null)}
                className={`p-1.5 rounded-xl border transition cursor-pointer ${
                  isDarkMode
                    ? 'bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white border-slate-700'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-900 border-slate-200'
                }`}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Requested URL display */}
            <div className={`p-3.5 rounded-2xl border space-y-1 ${subCardBg}`}>
              <span className={`text-[11px] font-semibold block ${textMuted}`}>
                {isKu ? 'لینکی کراوە و داواکراو لە وێبسایت:' : 'Exact URL Requested on Website:'}
              </span>
              <div className="flex items-center gap-2">
                <Globe className="w-4 h-4 text-blue-500 shrink-0" />
                <a
                  href={selectedVisitor.fullUrl || `https://${selectedVisitor.domain || 'froshiar.store'}${selectedVisitor.path}`}
                  target="_blank"
                  rel="noreferrer"
                  className="font-mono text-xs font-bold text-blue-500 hover:underline break-all"
                >
                  {selectedVisitor.fullUrl || `https://${selectedVisitor.domain || 'froshiar.store'}${selectedVisitor.path}`}
                </a>
              </div>
            </div>

            {/* Modal Body: Details Grid */}
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className={`p-3 rounded-2xl border ${subCardBg}`}>
                <span className={`block mb-1 ${textMuted}`}>{isKu ? 'شوێن و شار:' : 'Location:'}</span>
                <span className={`font-bold flex items-center gap-1.5 ${textTitle}`}>
                  <MapPin className="w-3.5 h-3.5 text-emerald-500" />
                  {selectedVisitor.locationLabel}
                </span>
              </div>
              <div className={`p-3 rounded-2xl border ${subCardBg}`}>
                <span className={`block mb-1 ${textMuted}`}>{isKu ? 'سەرچاوەی هاتنەژوورەوە:' : 'Referrer Source:'}</span>
                <span className="font-bold text-amber-500">
                  {selectedVisitor.referrerSourceDetail || selectedVisitor.referrer}
                </span>
              </div>
              <div className={`p-3 rounded-2xl border ${subCardBg}`}>
                <span className={`block mb-1 ${textMuted}`}>{isKu ? 'ماوەی مانەوە:' : 'Duration:'}</span>
                <span className={`font-bold font-mono ${textTitle}`}>
                  {formatDuration(selectedVisitor.durationSeconds)}
                </span>
              </div>
              <div className={`p-3 rounded-2xl border ${subCardBg}`}>
                <span className={`block mb-1 ${textMuted}`}>{isKu ? 'قەبارەی سکرین:' : 'Screen:'}</span>
                <span className={`font-bold font-mono ${textTitle}`}>
                  {selectedVisitor.screenSize}
                </span>
              </div>
            </div>

            {/* Clicks & Conversions Performed */}
            <div className={`p-4 rounded-2xl border space-y-2 ${subCardBg}`}>
              <span className={`text-xs font-bold block ${textTitle}`}>
                {isKu ? 'کردارە سەرەکییەکان (Conversions):' : 'Key Actions & Conversions:'}
              </span>
              <div className="flex flex-wrap items-center gap-2">
                <div
                  className={`px-3 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 ${
                    selectedVisitor.downloadClicked
                      ? 'bg-amber-500/20 border-amber-500/50 text-amber-500'
                      : isDarkMode
                      ? 'bg-slate-800/40 border-slate-700/40 text-slate-500'
                      : 'bg-slate-100 border-slate-200 text-slate-400'
                  }`}
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>
                    {isKu ? 'داگرتنی ئەپ:' : 'App Download:'}{' '}
                    {selectedVisitor.downloadClicked ? (isKu ? 'بەڵێ (کلیک کرا)' : 'Yes') : (isKu ? 'نەخێر' : 'No')}
                  </span>
                </div>

                <div
                  className={`px-3 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 ${
                    selectedVisitor.bexdrClicked
                      ? 'bg-purple-500/20 border-purple-500/50 text-purple-500'
                      : isDarkMode
                      ? 'bg-slate-800/40 border-slate-700/40 text-slate-500'
                      : 'bg-slate-100 border-slate-200 text-slate-400'
                  }`}
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>
                    {isKu ? 'وێبسایتی بێکسدر:' : 'BexDre Visit:'}{' '}
                    {selectedVisitor.bexdrClicked ? (isKu ? 'بەڵێ (سەردانی کرا)' : 'Yes') : (isKu ? 'نەخێر' : 'No')}
                  </span>
                </div>
              </div>
            </div>

            {/* Sections Viewed */}
            <div className={`p-4 rounded-2xl border space-y-2 ${subCardBg}`}>
              <span className={`text-xs font-bold block ${textTitle}`}>
                {isKu ? 'بەشە بینراوەکان لەم سەردانەدا:' : 'Sections Browsed in this Session:'}
              </span>
              <div className="flex flex-wrap items-center gap-1.5">
                {selectedVisitor.sectionsViewed.map((sec, i) => (
                  <span
                    key={i}
                    className={`px-2.5 py-1 rounded-lg text-xs border font-mono ${
                      isDarkMode
                        ? 'bg-slate-800 text-slate-300 border-slate-700'
                        : 'bg-white text-slate-700 border-slate-200 shadow-sm'
                    }`}
                  >
                    #{sec}
                  </span>
                ))}
              </div>
            </div>

            {/* Modal Close Button */}
            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setSelectedVisitor(null)}
                className="px-5 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs transition cursor-pointer"
              >
                {isKu ? 'داخستن' : 'Close'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
