import { create } from 'zustand';

import type { BudgetGroup } from '@/constants/enums';
import { createMoneyAppSelectors } from '@/utils/zustand_selectors';

interface SetBudgetSheetStateShape {
  selectedCategoryId: string | undefined;
  pickerExpanded: boolean;
  groupValue: BudgetGroup | null;
}

type SetBudgetSheetState = SetBudgetSheetStateShape & {
  initAddMode: (firstCategoryId: string | undefined) => void;
  setSelectedCategoryId: (id: string) => void;
  setGroupValue: (group: BudgetGroup | null) => void;
  togglePicker: () => void;
  collapsePicker: () => void;
  reset: () => void;
};

const INITIAL_STATE: SetBudgetSheetStateShape = {
  selectedCategoryId: undefined,
  pickerExpanded: false,
  groupValue: null,
};

export const useSetBudgetSheetState = createMoneyAppSelectors(
  create<SetBudgetSheetState>((set) => ({
    ...INITIAL_STATE,
    initAddMode: (firstCategoryId) =>
      set({
        ...INITIAL_STATE,
        selectedCategoryId: firstCategoryId,
      }),
    setSelectedCategoryId: (id) => set({ selectedCategoryId: id, pickerExpanded: false }),
    setGroupValue: (group) => set({ groupValue: group }),
    togglePicker: () => set((s) => ({ pickerExpanded: !s.pickerExpanded })),
    collapsePicker: () => set({ pickerExpanded: false }),
    reset: () => set(INITIAL_STATE),
  })),
);
