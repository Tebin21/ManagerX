import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getFirebaseFirestore, doc, onSnapshot } from '@/lib/firebase';

export interface RemoteBannerConfig {
  mobileBannerUrl?: string | null;
  ipadBannerUrl?: string | null;
  largeBannerUrl?: string | null;
  kurdishPhrases?: string[];
  englishPhrases?: string[];
  typingSpeed?: number;
  deletingSpeed?: number;
  holdDuration?: number;
  updatedAt?: string;
}

const STORAGE_KEY = '@froshiar_remote_banner_config_v1';

export const DEFAULT_KURDISH_PHRASES = [
  'فرۆشیار',
  'لەگەڵ فرۆشیار فرۆشتنەکانت ئاسانتر بکە',
  'فرۆشیار پێشکەش بە تۆیە',
];

export const DEFAULT_ENGLISH_PHRASES = [
  'Froshiar',
  'Make your sales easier with Froshiar',
  'Froshiar is dedicated to you',
];

interface RemoteBannerState {
  config: RemoteBannerConfig | null;
  isLoading: boolean;
  setConfig: (config: RemoteBannerConfig | null) => void;
  initSubscription: () => () => void;
}

export const useRemoteBannerStore = create<RemoteBannerState>((set) => ({
  config: null,
  isLoading: true,
  setConfig: (config) => set({ config, isLoading: false }),
  initSubscription: () => {
    let unsubscribeSnapshot: (() => void) | null = null;

    // 1. Immediately hydrate from local AsyncStorage for instant 0ms offline rendering
    AsyncStorage.getItem(STORAGE_KEY)
      .then((raw) => {
        if (raw) {
          try {
            const cached = JSON.parse(raw) as RemoteBannerConfig;
            set({ config: cached, isLoading: false });
          } catch {}
        }
      })
      .catch(() => {});

    // 2. Subscribe live to Firebase Firestore
    try {
      const db = getFirebaseFirestore();
      const docRef = doc(db, 'app_config', 'dashboard_banner');

      unsubscribeSnapshot = onSnapshot(
        docRef,
        (snap) => {
          if (snap.exists()) {
            const data = snap.data() as RemoteBannerConfig;
            set({ config: data, isLoading: false });
            // Cache locally
            AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(data)).catch(() => {});
          } else {
            set({ isLoading: false });
          }
        },
        (error) => {
          console.warn('[RemoteBanner] Firestore snapshot error (offline or unreached):', error);
          set({ isLoading: false });
        }
      );
    } catch (e) {
      console.warn('[RemoteBanner] Failed to initialize Firestore listener:', e);
      set({ isLoading: false });
    }

    return () => {
      if (unsubscribeSnapshot) {
        unsubscribeSnapshot();
      }
    };
  },
}));

/**
 * Hook to retrieve remote banner configuration and start listening.
 */
export function useRemoteBannerConfig() {
  const config = useRemoteBannerStore((s) => s.config);
  const isLoading = useRemoteBannerStore((s) => s.isLoading);
  const initSubscription = useRemoteBannerStore((s) => s.initSubscription);

  return { config, isLoading, initSubscription };
}

/**
 * Returns the appropriate responsive image source for the default banner:
 * - Large screens / Landscape iPad: largeBannerUrl -> ipadBannerUrl -> mobileBannerUrl -> fallbackSource
 * - Tablet Portrait (iPad): ipadBannerUrl -> largeBannerUrl -> mobileBannerUrl -> fallbackSource
 * - Mobile Phone: mobileBannerUrl -> fallbackSource
 */
export function getResponsiveDefaultBanner(
  config: RemoteBannerConfig | null | undefined,
  options: {
    isTablet?: boolean;
    isTabletLandscape?: boolean;
    fallbackSource: any;
  }
): any {
  if (!config) return options.fallbackSource;

  if (options.isTabletLandscape) {
    if (config.largeBannerUrl && config.largeBannerUrl.trim()) {
      return { uri: config.largeBannerUrl.trim() };
    }
    if (config.ipadBannerUrl && config.ipadBannerUrl.trim()) {
      return { uri: config.ipadBannerUrl.trim() };
    }
    if (config.mobileBannerUrl && config.mobileBannerUrl.trim()) {
      return { uri: config.mobileBannerUrl.trim() };
    }
  } else if (options.isTablet) {
    if (config.ipadBannerUrl && config.ipadBannerUrl.trim()) {
      return { uri: config.ipadBannerUrl.trim() };
    }
    if (config.largeBannerUrl && config.largeBannerUrl.trim()) {
      return { uri: config.largeBannerUrl.trim() };
    }
    if (config.mobileBannerUrl && config.mobileBannerUrl.trim()) {
      return { uri: config.mobileBannerUrl.trim() };
    }
  } else {
    if (config.mobileBannerUrl && config.mobileBannerUrl.trim()) {
      return { uri: config.mobileBannerUrl.trim() };
    }
  }

  return options.fallbackSource;
}

