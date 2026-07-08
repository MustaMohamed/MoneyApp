import { create } from 'zustand';

import { currentYearMonth } from '@/modules/budget/repositories/budget.repository';
import { previousYearMonth } from '@/modules/budget/screens/budget/budget.helpers';
import { createMoneyAppSelectors } from '@/utils/zustand_selectors';

export type BudgetSheetMode = 'add' | 'edit';
export type LensTab = 'categories' | 'fiftythirty';

interface BudgetStateShape {
  sheetVisible: boolean;
  mode: BudgetSheetMode;
  targetCategoryId: string | undefined;
  lensTab: LensTab;
  selectedMonth: string;
  copySourceMonth: string;
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
  setCopySourceMonth: (month: string) => void;
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
  const selectedMonth = currentYearMonth();
  return {
    sheetVisible: false,
    mode: 'add',
    targetCategoryId: undefined,
    lensTab: 'categories',
    selectedMonth,
    copySourceMonth: previousYearMonth(selectedMonth),
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
    setSelectedMonth: (month) =>
      set({ selectedMonth: month, copySourceMonth: previousYearMonth(month) }),
    setCopySourceMonth: (month) => set({ copySourceMonth: month }),
    resetSelectedMonthToCurrent: () => {
      const selectedMonth = currentYearMonth();
      set({ selectedMonth, copySourceMonth: previousYearMonth(selectedMonth) });
    },
    openCopy: (categoryIds = []) =>
      set({ copySheetVisible: true, copySelectedCategoryIds: categoryIds }),
    closeCopy: () =>
      set((state) => ({
        copySheetVisible: false,
        copySelectedCategoryIds: [],
        copySourceMonth: previousYearMonth(state.selectedMonth),
      })),
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
