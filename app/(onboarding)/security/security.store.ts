import { create } from 'zustand';
import type { SecurityChoice } from '@/constants/enums';

interface SecurityStore {
  selected: SecurityChoice | undefined;
  setSelected: (choice: SecurityChoice) => void;
  reset: () => void;
}

export const useSecurityStore = create<SecurityStore>((set) => ({
  selected: undefined,
  setSelected: (choice) => set({ selected: choice }),
  reset: () => set({ selected: undefined }),
}));
