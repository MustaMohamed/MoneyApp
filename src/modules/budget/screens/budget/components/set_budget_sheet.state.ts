import { create } from 'zustand';

import type { BudgetGroup } from '@/constants/enums';
import { createMoneyAppSelectors } from '@/utils/zustand_selectors';

interface SetBudgetSheetStateShape {
  selectedCategoryId: string | undefined;
  pickerExpanded: boolean;
  groupValue: BudgetGroup | null;
  saving: boolean;
  errorMessage: string | undefined;
}

type SetBudgetSheetState = SetBudgetSheetStateShape & {
  initAddMode: (firstCategoryId: string | undefined) => void;
  setSelectedCategoryId: (id: string) => void;
  setGroupValue: (group: BudgetGroup | null) => void;
  setSaving: (saving: boolean) => void;
  setErrorMessage: (message: string | undefined) => void;
  clearError: () => void;
  togglePicker: () => void;
  collapsePicker: () => void;
  reset: () => void;
};

const INITIAL_STATE: SetBudgetSheetStateShape = {
  selectedCategoryId: undefined,
  pickerExpanded: false,
  groupValue: null,
  saving: false,
  errorMessage: undefined,
};

export const useSetBudgetSheetState = createMoneyAppSelectors(
  create<SetBudgetSheetState>((set) => ({
    ...INITIAL_STATE,
    initAddMode: (firstCategoryId) =>
      set({
        ...INITIAL_STATE,
        selectedCategoryId: firstCategoryId,
      }),
    setSelectedCategoryId: (id) =>
      set({ selectedCategoryId: id, pickerExpanded: false, errorMessage: undefined }),
    setGroupValue: (group) => set({ groupValue: group, errorMessage: undefined }),
    setSaving: (saving) => set({ saving }),
    setErrorMessage: (errorMessage) => set({ errorMessage }),
    clearError: () => set({ errorMessage: undefined }),
    togglePicker: () => set((s) => ({ pickerExpanded: !s.pickerExpanded })),
    collapsePicker: () => set({ pickerExpanded: false }),
    reset: () => set(INITIAL_STATE),
  })),
);
