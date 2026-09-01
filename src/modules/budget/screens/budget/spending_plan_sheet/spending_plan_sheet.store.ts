import { create } from 'zustand';

import { createMoneyAppSelectors } from '@/utils/zustand_selectors';

interface SpendingPlanSheetStoreShape {
  startDate: string;
  endDate: string;
  selectedCategoryIds: string[];
  // Raw field text, not a parsed number; a missing key and '' both mean unallocated.
  allocations: Record<string, string>;
  allocateByCategory: boolean;
}

type SpendingPlanSheetStore = SpendingPlanSheetStoreShape & {
  initAddMode: (input: { month: string; firstCategoryId?: string }) => void;
  initEditMode: (input: SpendingPlanSheetStoreShape) => void;
  setStartDate: (date: string) => void;
  setEndDate: (date: string) => void;
  toggleCategoryId: (id: string) => void;
  setAllocation: (categoryId: string, text: string) => void;
  setAllocateByCategory: (enabled: boolean) => void;
  reset: () => void;
};

const INITIAL_STATE: SpendingPlanSheetStoreShape = {
  startDate: '',
  endDate: '',
  selectedCategoryIds: [],
  allocations: {},
  allocateByCategory: false,
};

export const useSpendingPlanSheetStore = createMoneyAppSelectors(
  create<SpendingPlanSheetStore>((set) => ({
    ...INITIAL_STATE,
    initAddMode: ({ month, firstCategoryId }) =>
      set({
        ...INITIAL_STATE,
        startDate: `${month}-01`,
        endDate: `${month}-01`,
        selectedCategoryIds: firstCategoryId ? [firstCategoryId] : [],
      }),
    initEditMode: (input) => set(input),
    setStartDate: (startDate) => set({ startDate }),
    setEndDate: (endDate) => set({ endDate }),
    toggleCategoryId: (id) =>
      set((state) => {
        const selected = state.selectedCategoryIds.includes(id);
        const allocations = { ...state.allocations };
        if (selected) delete allocations[id];
        return {
          selectedCategoryIds: selected
            ? state.selectedCategoryIds.filter((categoryId) => categoryId !== id)
            : [...state.selectedCategoryIds, id],
          allocations,
        };
      }),
    setAllocation: (categoryId, text) =>
      set((state) => ({ allocations: { ...state.allocations, [categoryId]: text } })),
    setAllocateByCategory: (allocateByCategory) => set({ allocateByCategory }),
    reset: () => set(INITIAL_STATE),
  })),
);
