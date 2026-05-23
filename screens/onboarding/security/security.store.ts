import { create } from 'zustand';

import type { SecurityChoice } from '@/constants/enums';

const INITIAL_STATE = { selected: undefined as SecurityChoice | undefined };

interface SecurityStore {
  state: typeof INITIAL_STATE;
  setSelected: (choice: SecurityChoice) => void;
  reset: () => void;
}

export const useSecurityStore = create<SecurityStore>((set) => ({
  state: INITIAL_STATE,
  setSelected: (choice) => set((s) => ({ state: { ...s.state, selected: choice } })),
  reset: () => set({ state: INITIAL_STATE }),
}));
