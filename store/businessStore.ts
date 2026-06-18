import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

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
      name: '@managerx_business',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
