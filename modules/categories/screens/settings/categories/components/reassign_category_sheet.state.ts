import { create } from 'zustand';

import { createMoneyAppSelectors } from '@/utils/zustand_selectors';

interface ReassignCategorySheetStateShape {
  selectedId: string | null;
  isLoading: boolean;
}

interface ReassignCategorySheetState {
  state: ReassignCategorySheetStateShape;
  setSelectedId: (id: string | null) => void;
  setIsLoading: (v: boolean) => void;
  reset: () => void;
}

const INITIAL_STATE: ReassignCategorySheetStateShape = {
  selectedId: null,
  isLoading: false,
};

export const useReassignCategorySheetState = createMoneyAppSelectors(
  create<ReassignCategorySheetState>((set) => ({
    state: INITIAL_STATE,
    setSelectedId: (id) => set((s) => ({ state: { ...s.state, selectedId: id } })),
    setIsLoading: (v) => set((s) => ({ state: { ...s.state, isLoading: v } })),
    reset: () => set({ state: INITIAL_STATE }),
  })),
);
