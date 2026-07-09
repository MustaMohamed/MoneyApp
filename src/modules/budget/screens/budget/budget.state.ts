import { create } from 'zustand';

import { currentYearMonth } from '@/modules/budget/repositories/budget.repository';
import { previousYearMonth } from '@/modules/budget/screens/budget/budget.helpers';
import { createMoneyAppSelectors } from '@/utils/zustand_selectors';

export type BudgetSheetMode = 'add' | 'edit';
export type LensTab = 'categories' | 'plans' | 'fiftythirty';

interface BudgetStateShape {
  sheetVisible: boolean;
  mode: BudgetSheetMode;
  targetBudgetId: string | undefined;
  lensTab: LensTab;
  selectedMonth: string;
  copySourceMonth: string;
  copySheetVisible: boolean;
  copySelectedBudgetIds: string[];
  incomeSuggestion: number | null;
}

type BudgetState = BudgetStateShape & {
  openAdd: () => void;
  openEdit: (budgetId: string) => void;
  close: () => void;
  setLensTab: (tab: LensTab) => void;
  setSelectedMonth: (month: string) => void;
  setCopySourceMonth: (month: string) => void;
  resetSelectedMonthToCurrent: () => void;
  openCopy: (budgetIds?: string[]) => void;
  closeCopy: () => void;
  setCopySelectedBudgetIds: (budgetIds: string[]) => void;
  toggleCopyBudgetId: (budgetId: string) => void;
  clearCopySelection: () => void;
  setIncomeSuggestion: (suggestion: number | null) => void;
  reset: () => void;
};

function initialState(): BudgetStateShape {
  const selectedMonth = currentYearMonth();
  return {
    sheetVisible: false,
    mode: 'add',
    targetBudgetId: undefined,
    lensTab: 'categories',
    selectedMonth,
    copySourceMonth: previousYearMonth(selectedMonth),
    copySheetVisible: false,
    copySelectedBudgetIds: [],
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
        targetBudgetId: undefined,
      }),
    openEdit: (budgetId) =>
      set({
        sheetVisible: true,
        mode: 'edit',
        targetBudgetId: budgetId,
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
    openCopy: (budgetIds = []) => set({ copySheetVisible: true, copySelectedBudgetIds: budgetIds }),
    closeCopy: () =>
      set((state) => ({
        copySheetVisible: false,
        copySelectedBudgetIds: [],
        copySourceMonth: previousYearMonth(state.selectedMonth),
      })),
    setCopySelectedBudgetIds: (budgetIds) => set({ copySelectedBudgetIds: budgetIds }),
    toggleCopyBudgetId: (budgetId) =>
      set((state) => {
        const selected = state.copySelectedBudgetIds.includes(budgetId);
        return {
          copySelectedBudgetIds: selected
            ? state.copySelectedBudgetIds.filter((id) => id !== budgetId)
            : [...state.copySelectedBudgetIds, budgetId],
        };
      }),
    clearCopySelection: () => set({ copySelectedBudgetIds: [] }),
    setIncomeSuggestion: (suggestion) => set({ incomeSuggestion: suggestion }),
    reset: () => set(initialState()),
  })),
);
