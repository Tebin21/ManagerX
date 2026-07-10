import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { migratedAsyncStorage } from '@/lib/migratedStorage';

interface OnboardingState {
  hasCompletedOnboarding: boolean;
  completeOnboarding: () => void;
  resetOnboarding: () => void;
}

export const useOnboardingStore = create<OnboardingState>()(
  persist(
    (set) => ({
      hasCompletedOnboarding: false,
      completeOnboarding: () => set({ hasCompletedOnboarding: true }),
      resetOnboarding: () => set({ hasCompletedOnboarding: false }),
    }),
    {
      name: '@froshiar_onboarding',
      storage: createJSONStorage(() => migratedAsyncStorage),
    }
  )
);
