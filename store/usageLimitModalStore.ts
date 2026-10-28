import { create } from 'zustand';

interface UsageLimitModalState {
  visible: boolean;
  message?: string;
  openModal: (message?: string) => void;
  closeModal: () => void;
}

export const useUsageLimitModalStore = create<UsageLimitModalState>((set) => ({
  visible: false,
  message: undefined,
  openModal: (message?: string) => set({ visible: true, message }),
  closeModal: () => set({ visible: false, message: undefined }),
}));

export function showUsageLimitModal(message?: string): void {
  useUsageLimitModalStore.getState().openModal(message);
}

export function hideUsageLimitModal(): void {
  useUsageLimitModalStore.getState().closeModal();
}

