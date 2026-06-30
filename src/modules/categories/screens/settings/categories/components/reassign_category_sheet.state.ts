import { create } from 'zustand';

import { createMoneyAppSelectors } from '@/utils/zustand_selectors';

interface ReassignCategorySheetStateShape {
  selectedId: string | null;
  isLoading: boolean;
}

type ReassignCategorySheetState = ReassignCategorySheetStateShape & {
  setSelectedId: (id: string | null) => void;
  setIsLoading: (v: boolean) => void;
  reset: () => void;
};

const INITIAL_STATE: ReassignCategorySheetStateShape = {
  selectedId: null,
  isLoading: false,
};

export const useReassignCategorySheetState = createMoneyAppSelectors(
  create<ReassignCategorySheetState>((set) => ({
    ...INITIAL_STATE,
    setSelectedId: (id) => set({ selectedId: id }),
    setIsLoading: (v) => set({ isLoading: v }),
    reset: () => set(INITIAL_STATE),
  })),
);
