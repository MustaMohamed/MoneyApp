import { create } from 'zustand';

import { currentYearMonth } from '@/modules/budget/repositories/budget.repository';
import { createMoneyAppSelectors } from '@/utils/zustand_selectors';

export type BudgetSheetMode = 'add' | 'edit';
export type LensTab = 'categories' | 'fiftythirty';

interface BudgetStateShape {
  sheetVisible: boolean;
  mode: BudgetSheetMode;
  targetCategoryId: string | undefined;
  lensTab: LensTab;
  selectedMonth: string;
  copySheetVisible: boolean;
  copySelectedCategoryIds: string[];
  incomeSuggestion: number | null;
}

type BudgetState = BudgetStateShape & {
  openAdd: () => void;
  openEdit: (categoryId: string) => void;
  close: () => void;
  setLensTab: (tab: LensTab) => void;
  setSelectedMonth: (month: string) => void;
  resetSelectedMonthToCurrent: () => void;
  openCopy: (categoryIds?: string[]) => void;
  closeCopy: () => void;
  setCopySelectedCategoryIds: (categoryIds: string[]) => void;
  toggleCopyCategoryId: (categoryId: string) => void;
  clearCopySelection: () => void;
  setIncomeSuggestion: (suggestion: number | null) => void;
  reset: () => void;
};

function initialState(): BudgetStateShape {
  return {
    sheetVisible: false,
    mode: 'add',
    targetCategoryId: undefined,
    lensTab: 'categories',
    selectedMonth: currentYearMonth(),
    copySheetVisible: false,
    copySelectedCategoryIds: [],
    incomeSuggestion: null,
  };
}

export const useBudgetState = createMoneyAppSelectors(
  create<BudgetState>((set) => ({
    ...initialState(),
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
    setSelectedMonth: (month) => set({ selectedMonth: month }),
    resetSelectedMonthToCurrent: () => set({ selectedMonth: currentYearMonth() }),
    openCopy: (categoryIds = []) =>
      set({ copySheetVisible: true, copySelectedCategoryIds: categoryIds }),
    closeCopy: () => set({ copySheetVisible: false, copySelectedCategoryIds: [] }),
    setCopySelectedCategoryIds: (categoryIds) => set({ copySelectedCategoryIds: categoryIds }),
    toggleCopyCategoryId: (categoryId) =>
      set((state) => {
        const selected = state.copySelectedCategoryIds.includes(categoryId);
        return {
          copySelectedCategoryIds: selected
            ? state.copySelectedCategoryIds.filter((id) => id !== categoryId)
            : [...state.copySelectedCategoryIds, categoryId],
        };
      }),
    clearCopySelection: () => set({ copySelectedCategoryIds: [] }),
    setIncomeSuggestion: (suggestion) => set({ incomeSuggestion: suggestion }),
    reset: () => set(initialState()),
  })),
);
