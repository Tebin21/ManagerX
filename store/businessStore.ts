import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { migratedAsyncStorage } from '@/lib/migratedStorage';

interface BusinessData {
  name: string;
  type: string;
  phone: string;
  address: string;
  logoUri: string | null;
}

interface BusinessState extends BusinessData {
  isSetupComplete: boolean;
  setBusiness: (data: BusinessData) => void;
  updateLogo: (uri: string) => void;
  clearBusiness: () => void;
}

export const useBusinessStore = create<BusinessState>()(
  persist(
    (set) => ({
      name: '',
      type: '',
      phone: '',
      address: '',
      logoUri: null,
      isSetupComplete: false,

      setBusiness: (data) =>
        set({ ...data, isSetupComplete: true }),

      updateLogo: (uri) => set({ logoUri: uri }),

      clearBusiness: () =>
        set({
          name: '',
          type: '',
          phone: '',
          address: '',
          logoUri: null,
          isSetupComplete: false,
        }),
    }),
    {
      name: '@froshiar_business',
      storage: createJSONStorage(() => migratedAsyncStorage),
    }
  )
);
