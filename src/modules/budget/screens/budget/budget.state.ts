import { create } from 'zustand';

import { createMoneyAppSelectors } from '@/utils/zustand_selectors';

export type BudgetSheetMode = 'add' | 'edit';
export type LensTab = 'categories' | 'fiftythirty';

interface BudgetStateShape {
  sheetVisible: boolean;
  mode: BudgetSheetMode;
  targetCategoryId: string | undefined;
  lensTab: LensTab;
}

type BudgetState = BudgetStateShape & {
  openAdd: () => void;
  openEdit: (categoryId: string) => void;
  close: () => void;
  setLensTab: (tab: LensTab) => void;
  reset: () => void;
};

const INITIAL_STATE: BudgetStateShape = {
  sheetVisible: false,
  mode: 'add',
  targetCategoryId: undefined,
  lensTab: 'categories',
};

export const useBudgetState = createMoneyAppSelectors(
  create<BudgetState>((set) => ({
    ...INITIAL_STATE,
    openAdd: () =>
      set({
        sheetVisible: true,
        mode: 'add',
        targetCategoryId: undefined,
      }),
    openEdit: (categoryId) =>
      set({
        sheetVisible: true,
        mode: 'edit',
        targetCategoryId: categoryId,
      }),
    close: () => set({ sheetVisible: false }),
    setLensTab: (tab) => set({ lensTab: tab }),
    reset: () => set(INITIAL_STATE),
  })),
);
