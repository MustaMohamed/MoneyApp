import { create } from 'zustand';

export type BudgetSheetMode = 'add' | 'edit';
export type LensTab = 'categories' | 'fiftythirty';

interface BudgetStateShape {
  sheetVisible: boolean;
  mode: BudgetSheetMode;
  targetCategoryId: string | undefined;
  lensTab: LensTab;
}

interface BudgetState {
  state: BudgetStateShape;
  openAdd: () => void;
  openEdit: (categoryId: string) => void;
  close: () => void;
  setLensTab: (tab: LensTab) => void;
  reset: () => void;
}

const INITIAL_STATE: BudgetStateShape = {
  sheetVisible: false,
  mode: 'add',
  targetCategoryId: undefined,
  lensTab: 'categories',
};

export const useBudgetState = create<BudgetState>((set) => ({
  state: INITIAL_STATE,
  openAdd: () =>
    set((s) => ({
      state: { ...s.state, sheetVisible: true, mode: 'add', targetCategoryId: undefined },
    })),
  openEdit: (categoryId) =>
    set((s) => ({
      state: { ...s.state, sheetVisible: true, mode: 'edit', targetCategoryId: categoryId },
    })),
  close: () => set((s) => ({ state: { ...s.state, sheetVisible: false } })),
  setLensTab: (tab) => set((s) => ({ state: { ...s.state, lensTab: tab } })),
  reset: () => set({ state: INITIAL_STATE }),
}));
