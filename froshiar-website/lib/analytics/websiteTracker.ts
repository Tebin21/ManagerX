import { getClientFirestore } from '@/lib/firebase';
import {
  doc,
  setDoc,
  addDoc,
  collection,
  updateDoc,
  arrayUnion,
  increment,
} from 'firebase/firestore';

export interface VisitorSession {
  sessionId: string;
  visitorId: string;
  startedAt: string;
  lastActiveAt: string;
  leftAt?: string;
  durationSeconds: number;
  domain: string;
  fullUrl: string;
  path: string;
  locale: string;
  referrer: string;
  referrerCategory: 'direct' | 'google' | 'social' | 'external';
  referrerSourceDetail: string;
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
  isOnline: boolean;
}

export interface WebsiteEventRecord {
  eventType:
    | 'download_app_click'
    | 'bexdr_link_click'
    | 'section_view'
    | 'page_view'
    | 'contact_click'
    | 'custom_click';
  sessionId: string;
  visitorId: string;
  timestamp: string;
  target?: string;
  label?: string;
  section?: string;
  platform?: string;
  device?: string;
  location?: string;
}

// Generate unique ID
function generateUUID(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'id_' + Math.random().toString(36).substring(2, 11) + Date.now().toString(36);
}

// Detect client device, OS and browser
function getDeviceDetails(): {
  deviceType: 'mobile' | 'tablet' | 'desktop';
  deviceModel: string;
  os: string;
  browser: string;
  screenSize: string;
} {
  if (typeof window === 'undefined') {
    return {
      deviceType: 'desktop',
      deviceModel: 'Unknown',
      os: 'Unknown',
      browser: 'Unknown',
      screenSize: '0x0',
    };
  }

  const ua = navigator.userAgent || '';
  const screenSize = `${window.innerWidth}x${window.innerHeight}`;

  let deviceType: 'mobile' | 'tablet' | 'desktop' = 'desktop';
  let os = 'Unknown OS';
  let deviceModel = 'Desktop PC';

  if (/ipad|tablet/i.test(ua)) {
    deviceType = 'tablet';
    deviceModel = 'iPad / Tablet';
    os = 'iPadOS';
  } else if (/iphone/i.test(ua)) {
    deviceType = 'mobile';
    deviceModel = 'iPhone';
    os = 'iOS';
  } else if (/android/i.test(ua)) {
    deviceType = /mobile/i.test(ua) ? 'mobile' : 'tablet';
    deviceModel = 'Android Device';
    os = 'Android';
  } else if (/macintosh|mac os x/i.test(ua)) {
    deviceType = 'desktop';
    deviceModel = 'Mac';
    os = 'macOS';
  } else if (/windows/i.test(ua)) {
    deviceType = 'desktop';
    deviceModel = 'Windows PC';
    os = 'Windows';
  } else if (/linux/i.test(ua)) {
    deviceType = 'desktop';
    deviceModel = 'Linux PC';
    os = 'Linux';
  }

  // Browser detection including in-app webviews
  let browser = 'Browser';
  if (/instagram/i.test(ua)) {
    browser = 'Instagram In-App';
  } else if (/tiktok|bytedance/i.test(ua)) {
    browser = 'TikTok In-App';
  } else if (/fbav|fban/i.test(ua)) {
    browser = 'Facebook In-App';
  } else if (/snapchat/i.test(ua)) {
    browser = 'Snapchat In-App';
  } else if (/chrome|crios/i.test(ua) && !/edg|opr|opera/i.test(ua)) {
    browser = 'Chrome';
  } else if (/safari/i.test(ua) && !/chrome|crios|android/i.test(ua)) {
    browser = 'Safari';
  } else if (/firefox|fxios/i.test(ua)) {
    browser = 'Firefox';
  } else if (/edg/i.test(ua)) {
    browser = 'Edge';
  } else if (/opera|opr/i.test(ua)) {
    browser = 'Opera';
  }

  return { deviceType, deviceModel, os, browser, screenSize };
}

// Classify Referrer & traffic origin
function detectTrafficSource(): {
  referrer: string;
  referrerCategory: 'direct' | 'google' | 'social' | 'external';
  referrerSourceDetail: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
} {
  if (typeof window === 'undefined') {
    return {
      referrer: 'Direct',
      referrerCategory: 'direct',
      referrerSourceDetail: 'ڕاستەوخۆ (Direct)',
    };
  }

  const rawRef = (document.referrer || '').trim();
  const ua = navigator.userAgent || '';
  const searchParams = new URLSearchParams(window.location.search);
  const utmSource = searchParams.get('utm_source') || '';
  const utmMedium = searchParams.get('utm_medium') || '';
  const utmCampaign = searchParams.get('utm_campaign') || '';
  const refParam = searchParams.get('ref') || '';

  // 1. Instagram
  if (
    /instagram/i.test(ua) ||
    utmSource.toLowerCase().includes('instagram') ||
    refParam.toLowerCase().includes('instagram') ||
    rawRef.includes('instagram.com')
  ) {
    return {
      referrer: 'Instagram',
      referrerCategory: 'social',
      referrerSourceDetail: 'ئینستاگرام (Instagram Bio / Story)',
      utmSource,
      utmMedium,
      utmCampaign,
    };
  }

  // 2. TikTok
  if (
    /tiktok|bytedance/i.test(ua) ||
    utmSource.toLowerCase().includes('tiktok') ||
    refParam.toLowerCase().includes('tiktok') ||
    rawRef.includes('tiktok.com')
  ) {
    return {
      referrer: 'TikTok',
      referrerCategory: 'social',
      referrerSourceDetail: 'تیک تۆک (TikTok Profile / Video)',
      utmSource,
      utmMedium,
      utmCampaign,
    };
  }

  // 3. Facebook
  if (
    /fbav|fban|facebook/i.test(ua) ||
    utmSource.toLowerCase().includes('facebook') ||
    refParam.toLowerCase().includes('facebook') ||
    rawRef.includes('facebook.com') ||
    rawRef.includes('fb.com')
  ) {
    return {
      referrer: 'Facebook',
      referrerCategory: 'social',
      referrerSourceDetail: 'فەیسبووک (Facebook Link / Ad)',
      utmSource,
      utmMedium,
      utmCampaign,
    };
  }

  // 4. Snapchat
  if (
    /snapchat/i.test(ua) ||
    utmSource.toLowerCase().includes('snapchat') ||
    rawRef.includes('snapchat.com')
  ) {
    return {
      referrer: 'Snapchat',
      referrerCategory: 'social',
      referrerSourceDetail: 'سناپچات (Snapchat Link)',
      utmSource,
      utmMedium,
      utmCampaign,
    };
  }

  // 5. Telegram
  if (
    /telegram|tg/i.test(ua) ||
    utmSource.toLowerCase().includes('telegram') ||
    rawRef.includes('t.me') ||
    rawRef.includes('telegram.org')
  ) {
    return {
      referrer: 'Telegram',
      referrerCategory: 'social',
      referrerSourceDetail: 'تێلێگرام (Telegram Channel)',
      utmSource,
      utmMedium,
      utmCampaign,
    };
  }

  // 6. WhatsApp
  if (
    /whatsapp/i.test(ua) ||
    utmSource.toLowerCase().includes('whatsapp') ||
    rawRef.includes('whatsapp.com') ||
    rawRef.includes('wa.me')
  ) {
    return {
      referrer: 'WhatsApp',
      referrerCategory: 'social',
      referrerSourceDetail: 'واتسئەپ (WhatsApp Share)',
      utmSource,
      utmMedium,
      utmCampaign,
    };
  }

  // 7. Google Search
  if (rawRef.includes('google.') || utmSource.toLowerCase().includes('google')) {
    return {
      referrer: 'Google Search',
      referrerCategory: 'google',
      referrerSourceDetail: 'گەڕانی گووگڵ (Google Search)',
      utmSource,
      utmMedium,
      utmCampaign,
    };
  }

  // 8. Other External Referral
  if (rawRef && rawRef !== '') {
    try {
      const url = new URL(rawRef);
      return {
        referrer: url.hostname,
        referrerCategory: 'external',
        referrerSourceDetail: `ماڵپەڕ (${url.hostname})`,
        utmSource,
        utmMedium,
        utmCampaign,
      };
    } catch {
      return {
        referrer: rawRef.slice(0, 50),
        referrerCategory: 'external',
        referrerSourceDetail: rawRef.slice(0, 50),
        utmSource,
        utmMedium,
        utmCampaign,
      };
    }
  }

  // 9. Direct Link / Typed / Bookmark
  return {
    referrer: 'Direct',
    referrerCategory: 'direct',
    referrerSourceDetail: 'ڕاستەوخۆ (Direct Link)',
    utmSource,
    utmMedium,
    utmCampaign,
  };
}

// Initial estimate from browser timezone
function getEstimatedLocation(): { city: string; country: string; locationLabel: string } {
  if (typeof window === 'undefined') {
    return { city: 'هەولێر', country: 'کوردستان / عێراق', locationLabel: 'هەولێر، کوردستان' };
  }

  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || '';
    if (tz.includes('Baghdad')) {
      return {
        city: 'هەولێر / سلێمانی',
        country: 'کوردستان / عێراق',
        locationLabel: 'کوردستان، عێراق',
      };
    }
    if (tz.includes('Tehran')) {
      return { city: 'تاران', country: 'ئێران', locationLabel: 'ئێران' };
    }
    if (tz.includes('Istanbul')) {
      return { city: 'ئیستەنبوڵ', country: 'تورکیا', locationLabel: 'تورکیا' };
    }
    if (tz.includes('London') || tz.includes('Europe/London')) {
      return { city: 'لەندەن', country: 'بەریتانیا', locationLabel: 'بەریتانیا' };
    }
    if (tz.includes('Berlin') || tz.includes('Stockholm')) {
      return { city: 'ئەوروپا', country: 'سوید / ئەڵمانیا', locationLabel: 'ئەوروپا' };
    }
    if (tz.includes('Dubai')) {
      return { city: 'دوبەی', country: 'ئیمارات', locationLabel: 'ئیمارات' };
    }
    return {
      city: tz.split('/')[1] || tz,
      country: tz.split('/')[0] || 'International',
      locationLabel: tz,
    };
  } catch {
    return { city: 'کوردستان', country: 'عێراق', locationLabel: 'کوردستان، عێراق' };
  }
}

// Active in-memory session reference
let currentSession: VisitorSession | null = null;
let heartbeatInterval: any = null;
let sessionStartTime = 0;

export async function initWebsiteTracker(locale: string = 'ckb') {
  if (typeof window === 'undefined') return;

  const hostname = window.location.hostname.toLowerCase();

  // EXCLUSION 1: Admin Panel is not counted as a public website visit
  if (window.location.pathname.includes('/admin')) {
    return;
  }

  // EXCLUSION 2: Localhost & local development are 100% EXCLUDED from real metrics
  if (
    hostname === 'localhost' ||
    hostname === '127.0.0.1' ||
    hostname.endsWith('.local') ||
    hostname.includes('192.168.') ||
    hostname.includes('10.0.')
  ) {
    return;
  }

  try {
    // Visitor ID (Persistent in localStorage)
    let visitorId = localStorage.getItem('froshiar_v_id');
    if (!visitorId) {
      visitorId = generateUUID();
      localStorage.setItem('froshiar_v_id', visitorId);
    }

    // Session ID (Per Tab in sessionStorage)
    let sessionId = sessionStorage.getItem('froshiar_s_id');
    if (!sessionId) {
      sessionId = 's_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 7);
      sessionStorage.setItem('froshiar_s_id', sessionId);
      sessionStartTime = Date.now();
      sessionStorage.setItem('froshiar_s_start', String(sessionStartTime));
    } else {
      const storedStart = sessionStorage.getItem('froshiar_s_start');
      sessionStartTime = storedStart ? parseInt(storedStart, 10) : Date.now();
    }

    const { deviceType, deviceModel, os, browser, screenSize } = getDeviceDetails();
    const traffic = detectTrafficSource();
    const initialLocation = getEstimatedLocation();
    const nowIso = new Date().toISOString();

    currentSession = {
      sessionId,
      visitorId,
      startedAt: nowIso,
      lastActiveAt: nowIso,
      durationSeconds: Math.max(0, Math.round((Date.now() - sessionStartTime) / 1000)),
      domain: hostname,
      fullUrl: window.location.href,
      path: window.location.pathname + window.location.hash,
      locale,
      referrer: traffic.referrer,
      referrerCategory: traffic.referrerCategory,
      referrerSourceDetail: traffic.referrerSourceDetail,
      utmSource: traffic.utmSource || '',
      utmMedium: traffic.utmMedium || '',
      utmCampaign: traffic.utmCampaign || '',
      deviceType,
      deviceModel,
      os,
      browser,
      screenSize,
      city: initialLocation.city,
      country: initialLocation.country,
      locationLabel: initialLocation.locationLabel,
      downloadClicked: false,
      bexdrClicked: false,
      sectionsViewed: ['#home'],
      clicksCount: 0,
      eventsCount: 0,
      isOnline: true,
    };

    const db = getClientFirestore();
    if (db) {
      const sessionRef = doc(db, 'website_visitors', sessionId);
      await setDoc(sessionRef, currentSession, { merge: true });
    }

    // Async precise IP location lookup (cached in localStorage to avoid repeated requests)
    resolvePreciseGeoLocation(sessionId);

    // Realtime Heartbeat: every 10 seconds while tab is active
    if (heartbeatInterval) clearInterval(heartbeatInterval);
    heartbeatInterval = setInterval(() => {
      sendHeartbeat();
    }, 10000);

    // Instant presence tracking on tab switch or page leave
    const handleVisibility = () => {
      if (document.visibilityState === 'hidden') {
        markSessionOffline();
      } else {
        markSessionOnline();
      }
    };

    const handleLeave = () => {
      markSessionOffline();
    };

    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('pagehide', handleLeave);
    window.addEventListener('beforeunload', handleLeave);
  } catch (err) {
    console.debug('[WebsiteTracker] Init notice:', err);
  }
}

// Asynchronous precise IP location lookup
async function resolvePreciseGeoLocation(sessionId: string) {
  try {
    const cached = localStorage.getItem('froshiar_geo_cache');
    if (cached) {
      const parsed = JSON.parse(cached);
      if (parsed.city && currentSession && parsed.city !== currentSession.city) {
        currentSession.city = parsed.city;
        currentSession.country = parsed.country;
        currentSession.locationLabel = parsed.locationLabel;
        const db = getClientFirestore();
        if (db) {
          const sessionRef = doc(db, 'website_visitors', sessionId);
          await updateDoc(sessionRef, {
            city: parsed.city,
            country: parsed.country,
            locationLabel: parsed.locationLabel,
          }).catch(() => null);
        }
      }
      return;
    }

    const res = await fetch('https://ipwho.is/', { cache: 'no-store' }).catch(() => null);
    if (!res || !res.ok) return;

    const geo = await res.json().catch(() => null);
    if (!geo || !geo.success) return;

    const city = geo.city || geo.region || 'کوردستان';
    const country = geo.region === 'Kurdistan' ? 'کوردستان / عێراق' : (geo.country || 'عێراق');
    const flag = geo.flag?.emoji ? `${geo.flag.emoji} ` : '';
    const locationLabel = `${flag}${city} (${country})`;

    localStorage.setItem('froshiar_geo_cache', JSON.stringify({ city, country, locationLabel }));

    if (currentSession) {
      currentSession.city = city;
      currentSession.country = country;
      currentSession.locationLabel = locationLabel;
    }

    const db = getClientFirestore();
    if (db) {
      const sessionRef = doc(db, 'website_visitors', sessionId);
      await updateDoc(sessionRef, {
        city,
        country,
        locationLabel,
      }).catch(() => null);
    }
  } catch {
    // Non-blocking fail-safe
  }
}

// Send active heartbeat to Firestore
async function sendHeartbeat() {
  if (!currentSession || document.visibilityState === 'hidden') return;
  try {
    const db = getClientFirestore();
    if (!db) return;

    const durationSeconds = Math.max(0, Math.round((Date.now() - sessionStartTime) / 1000));
    currentSession.durationSeconds = durationSeconds;
    currentSession.lastActiveAt = new Date().toISOString();
    currentSession.isOnline = true;

    const sessionRef = doc(db, 'website_visitors', currentSession.sessionId);
    await updateDoc(sessionRef, {
      durationSeconds,
      lastActiveAt: currentSession.lastActiveAt,
      isOnline: true,
      path: typeof window !== 'undefined' ? window.location.pathname + window.location.hash : '',
      fullUrl: typeof window !== 'undefined' ? window.location.href : '',
    }).catch(() => null);
  } catch {
    // Silently continue
  }
}

// Mark session online when tab becomes visible
async function markSessionOnline() {
  if (!currentSession) return;
  try {
    currentSession.isOnline = true;
    currentSession.lastActiveAt = new Date().toISOString();

    const db = getClientFirestore();
    if (db) {
      const sessionRef = doc(db, 'website_visitors', currentSession.sessionId);
      await updateDoc(sessionRef, {
        isOnline: true,
        lastActiveAt: currentSession.lastActiveAt,
      }).catch(() => null);
    }
  } catch {
    // Fail-safe
  }
}

// Mark session offline immediately when tab hidden or user leaves
async function markSessionOffline() {
  if (!currentSession) return;
  try {
    currentSession.isOnline = false;
    const nowIso = new Date().toISOString();
    currentSession.leftAt = nowIso;
    currentSession.lastActiveAt = nowIso;

    const db = getClientFirestore();
    if (db) {
      const sessionRef = doc(db, 'website_visitors', currentSession.sessionId);
      await updateDoc(sessionRef, {
        isOnline: false,
        leftAt: nowIso,
        lastActiveAt: nowIso,
        durationSeconds: Math.max(0, Math.round((Date.now() - sessionStartTime) / 1000)),
      }).catch(() => null);
    }
  } catch {
    // Fail-safe
  }
}

// Track Specific Event (Download, Bexdr, Section View, etc.)
export async function trackWebsiteEvent(
  eventType: WebsiteEventRecord['eventType'],
  data: Partial<WebsiteEventRecord> = {}
) {
  if (typeof window === 'undefined' || !currentSession) return;

  try {
    const db = getClientFirestore();
    const nowIso = new Date().toISOString();

    const record: WebsiteEventRecord = {
      eventType,
      sessionId: currentSession.sessionId,
      visitorId: currentSession.visitorId,
      timestamp: nowIso,
      target: data.target || '',
      label: data.label || '',
      section: data.section || '',
      platform: data.platform || currentSession.os,
      device: `${currentSession.deviceModel} (${currentSession.os})`,
      location: currentSession.locationLabel,
      ...data,
    };

    currentSession.eventsCount = (currentSession.eventsCount || 0) + 1;
    currentSession.clicksCount = (currentSession.clicksCount || 0) + 1;

    if (eventType === 'download_app_click') {
      currentSession.downloadClicked = true;
    }
    if (eventType === 'bexdr_link_click') {
      currentSession.bexdrClicked = true;
    }
    if (data.section && !currentSession.sectionsViewed.includes(data.section)) {
      currentSession.sectionsViewed.push(data.section);
    }

    if (db) {
      await addDoc(collection(db, 'website_events'), record).catch(() => null);

      const sessionRef = doc(db, 'website_visitors', currentSession.sessionId);
      const updates: any = {
        lastActiveAt: nowIso,
        clicksCount: increment(1),
        eventsCount: increment(1),
      };

      if (eventType === 'download_app_click') {
        updates.downloadClicked = true;
        updates.lastDownloadPlatform = data.platform || 'unknown';
      }
      if (eventType === 'bexdr_link_click') {
        updates.bexdrClicked = true;
      }
      if (data.section) {
        updates.sectionsViewed = arrayUnion(data.section);
      }

      await updateDoc(sessionRef, updates).catch(() => null);
    }
  } catch (err) {
    console.debug('[WebsiteTracker] Event notice:', err);
  }
}

// Convenient explicit event triggers
export function trackAppDownload(platform: 'ios' | 'android' | 'general' = 'general', label: string = 'Store Button') {
  trackWebsiteEvent('download_app_click', {
    platform,
    label,
    target: platform === 'ios' ? 'App Store' : platform === 'android' ? 'Google Play' : 'Download',
  });
}

export function trackBexdrVisit(sourceLocation: string = 'Footer') {
  trackWebsiteEvent('bexdr_link_click', {
    target: 'https://www.bexdre.com',
    label: `BexDre Official Website (${sourceLocation})`,
    section: sourceLocation,
  });
}

export function trackSectionView(sectionName: string) {
  trackWebsiteEvent('section_view', {
    section: sectionName,
    label: `Viewed ${sectionName}`,
  });
}
