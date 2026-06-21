import { create } from 'zustand';
import {
  loadSubscriptionFromDb,
  activateSubscription,
  wasLegacyActiveStore,
  type SubscriptionPlan,
  type SubscriptionActivationResult,
} from '@/lib/onlineStoreSubscription/subscription';

function remainingDaysFrom(expiresAt: string | null): number | null {
  if (!expiresAt) return null; // Lifetime, or no active subscription
  const ms = new Date(expiresAt).getTime() - Date.now();
  return Math.max(0, Math.ceil(ms / (24 * 60 * 60 * 1000)));
}

interface OnlineStoreSubscriptionState {
  plan: SubscriptionPlan | null;
  deviceId: string | null;
  subscriptionCode: string | null;
  activatedAt: string | null;
  expiresAt: string | null;
  expired: boolean;
  isActive: boolean;
  /** null when Lifetime (or no active subscription) — there's nothing to count down. */
  remainingDays: number | null;
  /** True only for a device that already had the Online Store enabled before this
   *  gate shipped, AND has no active subscription yet — informational banner only,
   *  never consulted by any gate check. */
  isLegacyActiveStore: boolean;
  isLoaded: boolean;

  loadSubscription: () => Promise<void>;
  activate: (code: string) => Promise<SubscriptionActivationResult>;
}

export const useOnlineStoreSubscriptionStore = create<OnlineStoreSubscriptionState>((set, get) => ({
  plan: null,
  deviceId: null,
  subscriptionCode: null,
  activatedAt: null,
  expiresAt: null,
  expired: false,
  isActive: false,
  remainingDays: null,
  isLegacyActiveStore: false,
  isLoaded: false,

  loadSubscription: async () => {
    const [info, legacy] = await Promise.all([loadSubscriptionFromDb(), wasLegacyActiveStore()]);
    set({
      ...info,
      remainingDays: remainingDaysFrom(info.expiresAt),
      isLegacyActiveStore: legacy && !info.isActive,
      isLoaded: true,
    });
  },

  activate: async (code: string) => {
    const result = await activateSubscription(code);
    if (result.status === 'activated') {
      // Re-load from DB rather than hand-assembling state, so deviceId/subscriptionCode/
      // activatedAt stay perfectly in sync with what was actually persisted.
      await get().loadSubscription();
    }
    return result;
  },
}));
