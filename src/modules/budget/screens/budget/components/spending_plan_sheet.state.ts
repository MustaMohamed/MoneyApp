import { create } from 'zustand';

import { createMoneyAppSelectors } from '@/utils/zustand_selectors';

interface SpendingPlanSheetStateShape {
  startDate: string;
  endDate: string;
  selectedCategoryIds: string[];
  allocations: Record<string, number | undefined>;
  allocateByCategory: boolean;
  pickerExpanded: boolean;
  datePickerTarget: 'start' | 'end' | null;
}

type SpendingPlanSheetState = SpendingPlanSheetStateShape & {
  initAddMode: (input: { month: string; firstCategoryId?: string }) => void;
  initEditMode: (input: {
    startDate: string;
    endDate: string;
    categoryIds: string[];
    allocations: Record<string, number | undefined>;
  }) => void;
  setStartDate: (date: string) => void;
  setEndDate: (date: string) => void;
  toggleCategoryId: (id: string) => void;
  setAllocation: (categoryId: string, amount: number | undefined) => void;
  setAllocateByCategory: (enabled: boolean) => void;
  openPicker: () => void;
  closePicker: () => void;
  openDatePicker: (target: 'start' | 'end') => void;
  closeDatePicker: () => void;
  reset: () => void;
};

const INITIAL_STATE: SpendingPlanSheetStateShape = {
  startDate: '',
  endDate: '',
  selectedCategoryIds: [],
  allocations: {},
  allocateByCategory: false,
  pickerExpanded: false,
  datePickerTarget: null,
};

export const useSpendingPlanSheetState = createMoneyAppSelectors(
  create<SpendingPlanSheetState>((set) => ({
    ...INITIAL_STATE,
    initAddMode: ({ month, firstCategoryId }) =>
      set({
        ...INITIAL_STATE,
        startDate: `${month}-01`,
        endDate: `${month}-01`,
        selectedCategoryIds: firstCategoryId ? [firstCategoryId] : [],
      }),
    initEditMode: ({ startDate, endDate, categoryIds, allocations }) =>
      set({
        ...INITIAL_STATE,
        startDate,
        endDate,
        selectedCategoryIds: categoryIds,
        allocations,
        allocateByCategory: Object.values(allocations).some((amount) => amount !== undefined),
      }),
    setStartDate: (date) => set({ startDate: date }),
    setEndDate: (date) => set({ endDate: date }),
    toggleCategoryId: (id) =>
      set((state) => {
        const selected = state.selectedCategoryIds.includes(id);
        const selectedCategoryIds = selected
          ? state.selectedCategoryIds.filter((categoryId) => categoryId !== id)
          : [...state.selectedCategoryIds, id];
        const allocations = { ...state.allocations };
        if (selected) delete allocations[id];
        return { selectedCategoryIds, allocations };
      }),
    setAllocation: (categoryId, amount) =>
      set((state) => ({ allocations: { ...state.allocations, [categoryId]: amount } })),
    setAllocateByCategory: (enabled) => set({ allocateByCategory: enabled }),
    openPicker: () => set({ pickerExpanded: true }),
    closePicker: () => set({ pickerExpanded: false }),
    openDatePicker: (target) => set({ datePickerTarget: target }),
    closeDatePicker: () => set({ datePickerTarget: null }),
    reset: () => set(INITIAL_STATE),
  })),
);
