import { create } from 'zustand';

export type BudgetSheetMode = 'add' | 'edit';

interface BudgetStateShape {
  sheetVisible: boolean;
  mode: BudgetSheetMode;
  targetCategoryId: string | undefined;
}

interface BudgetState {
  state: BudgetStateShape;
  openAdd: () => void;
  openEdit: (categoryId: string) => void;
  close: () => void;
  reset: () => void;
}

const INITIAL_STATE: BudgetStateShape = {
  sheetVisible: false,
  mode: 'add',
  targetCategoryId: undefined,
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
  reset: () => set({ state: INITIAL_STATE }),
}));
