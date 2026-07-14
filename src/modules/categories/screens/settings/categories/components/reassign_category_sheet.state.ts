import { create } from 'zustand';

import { createMoneyAppSelectors } from '@/utils/zustand_selectors';

interface ReassignCategorySheetStateShape {
  selectedId: string | null;
  isLoading: boolean;
  errorMessage: string | undefined;
}

type ReassignCategorySheetState = ReassignCategorySheetStateShape & {
  setSelectedId: (id: string | null) => void;
  setIsLoading: (v: boolean) => void;
  setErrorMessage: (message: string | undefined) => void;
  reset: () => void;
};

const INITIAL_STATE: ReassignCategorySheetStateShape = {
  selectedId: null,
  isLoading: false,
  errorMessage: undefined,
};

export const useReassignCategorySheetState = createMoneyAppSelectors(
  create<ReassignCategorySheetState>((set) => ({
    ...INITIAL_STATE,
    setSelectedId: (id) => set({ selectedId: id }),
    setIsLoading: (v) => set({ isLoading: v }),
    setErrorMessage: (errorMessage) => set({ errorMessage }),
    reset: () => set(INITIAL_STATE),
  })),
);
