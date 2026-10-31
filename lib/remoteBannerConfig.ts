import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getFirebaseFirestore, doc, onSnapshot } from '@/lib/firebase';
import { useAuthStore } from '@/store/authStore';

export interface RemoteBannerConfig {
  // Responsive Image URLs
  mobileBannerUrl?: string | null;
  ipadBannerUrl?: string | null;
  largeBannerUrl?: string | null;

  // Responsive 10-Second Looping Video URLs (Mobile, iPad, Large)
  mobileVideoUrl?: string | null;
  ipadVideoUrl?: string | null;
  largeVideoUrl?: string | null;

  // Animated Typewriter Phrases
  kurdishPhrases?: string[];
  englishPhrases?: string[];
  typingSpeed?: number;
  deletingSpeed?: number;
  holdDuration?: number;

  updatedAt?: string;
  updatedBy?: string;
  targetUserEmail?: string | null;
}

export function sanitizeEmailForDocId(email: string): string {
  return email.trim().toLowerCase().replace(/[^a-z0-9_]/g, '_');
}

const STORAGE_KEY = '@froshiar_remote_banner_config_v1';
const USER_OVERRIDE_KEY = '@froshiar_remote_banner_user_override_v1';

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
  globalConfig: RemoteBannerConfig | null;
  userOverrideConfig: RemoteBannerConfig | null;
  isLoading: boolean;
  setConfig: (config: RemoteBannerConfig | null) => void;
  initSubscription: () => () => void;
}

export const useRemoteBannerStore = create<RemoteBannerState>((set, get) => ({
  config: null,
  globalConfig: null,
  userOverrideConfig: null,
  isLoading: true,
  setConfig: (config) => set({ config, isLoading: false }),
  initSubscription: () => {
    let unsubGlobal: (() => void) | null = null;
    let unsubUser: (() => void) | null = null;
    let unsubAuth: (() => void) | null = null;

    // Helper to compute effective config: user override takes priority if available
    const applyEffectiveConfig = (
      gConfig: RemoteBannerConfig | null,
      uConfig: RemoteBannerConfig | null
    ) => {
      const effective = uConfig || gConfig;
      set({
        globalConfig: gConfig,
        userOverrideConfig: uConfig,
        config: effective,
        isLoading: false,
      });
      if (effective) {
        AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(effective)).catch(() => {});
      }
    };

    // 1. Immediately hydrate from local AsyncStorage for instant 0ms offline rendering
    AsyncStorage.getItem(STORAGE_KEY)
      .then((raw) => {
        if (raw) {
          try {
            const cached = JSON.parse(raw) as RemoteBannerConfig;
            set({ config: cached, globalConfig: cached, isLoading: false });
          } catch {}
        }
      })
      .catch(() => {});

    // 2. Subscribe live to Global Firestore doc (app_config/dashboard_banner)
    try {
      const db = getFirebaseFirestore();
      const globalDocRef = doc(db, 'app_config', 'dashboard_banner');

      unsubGlobal = onSnapshot(
        globalDocRef,
        (snap) => {
          let gData: RemoteBannerConfig | null = null;
          if (snap.exists()) {
            gData = snap.data() as RemoteBannerConfig;
          }
          applyEffectiveConfig(gData, get().userOverrideConfig);
        },
        (error) => {
          console.warn('[RemoteBanner] Global Firestore snapshot error:', error);
          set({ isLoading: false });
        }
      );

      // 3. User-specific banner override listener
      const setupUserListener = (email: string | null | undefined) => {
        if (unsubUser) {
          unsubUser();
          unsubUser = null;
        }

        if (!email || !email.trim()) {
          applyEffectiveConfig(get().globalConfig, null);
          return;
        }

        const cleanEmail = sanitizeEmailForDocId(email);
        const userDocRef = doc(db, 'user_banner_configs', cleanEmail);

        unsubUser = onSnapshot(
          userDocRef,
          (uSnap) => {
            let uData: RemoteBannerConfig | null = null;
            if (uSnap.exists()) {
              const rawData = uSnap.data() as RemoteBannerConfig;
              // Check if it has any meaningful custom config
              if (
                rawData.mobileBannerUrl ||
                rawData.ipadBannerUrl ||
                rawData.largeBannerUrl ||
                rawData.mobileVideoUrl ||
                rawData.ipadVideoUrl ||
                rawData.largeVideoUrl ||
                (rawData.kurdishPhrases && rawData.kurdishPhrases.length > 0)
              ) {
                uData = rawData;
              }
            }
            applyEffectiveConfig(get().globalConfig, uData);
          },
          (err) => {
            console.warn('[RemoteBanner] User-specific banner listener notice:', err);
          }
        );
      };

      // Initial user check
      const currentUserEmail = useAuthStore.getState().user?.email;
      setupUserListener(currentUserEmail);

      // React to user login / logout changes
      unsubAuth = useAuthStore.subscribe((state, prevState) => {
        const prevEmail = prevState?.user?.email;
        const nextEmail = state?.user?.email;
        if (prevEmail !== nextEmail) {
          setupUserListener(nextEmail);
        }
      });
    } catch (e) {
      console.warn('[RemoteBanner] Failed to initialize Firestore listeners:', e);
      set({ isLoading: false });
    }

    return () => {
      if (unsubGlobal) unsubGlobal();
      if (unsubUser) unsubUser();
      if (unsubAuth) unsubAuth();
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

/**
 * Returns the appropriate responsive 10-second looping video URL if configured:
 * - Large screens / Landscape iPad: largeVideoUrl -> ipadVideoUrl -> mobileVideoUrl -> null
 * - Tablet Portrait (iPad): ipadVideoUrl -> largeVideoUrl -> mobileVideoUrl -> null
 * - Mobile Phone: mobileVideoUrl -> null
 */
export function getResponsiveRemoteVideo(
  config: RemoteBannerConfig | null | undefined,
  options: {
    isTablet?: boolean;
    isTabletLandscape?: boolean;
  }
): string | null {
  if (!config) return null;

  if (options.isTabletLandscape) {
    if (config.largeVideoUrl && config.largeVideoUrl.trim()) return config.largeVideoUrl.trim();
    if (config.ipadVideoUrl && config.ipadVideoUrl.trim()) return config.ipadVideoUrl.trim();
    if (config.mobileVideoUrl && config.mobileVideoUrl.trim()) return config.mobileVideoUrl.trim();
  } else if (options.isTablet) {
    if (config.ipadVideoUrl && config.ipadVideoUrl.trim()) return config.ipadVideoUrl.trim();
    if (config.largeVideoUrl && config.largeVideoUrl.trim()) return config.largeVideoUrl.trim();
    if (config.mobileVideoUrl && config.mobileVideoUrl.trim()) return config.mobileVideoUrl.trim();
  } else {
    if (config.mobileVideoUrl && config.mobileVideoUrl.trim()) return config.mobileVideoUrl.trim();
  }

  return null;
}


