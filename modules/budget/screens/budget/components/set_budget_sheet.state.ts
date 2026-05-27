import { create } from 'zustand';

import { createMoneyAppSelectors } from '@/utils/zustand_selectors';

interface SetBudgetSheetStateShape {
  selectedCategoryId: string | undefined;
  pickerExpanded: boolean;
}

interface SetBudgetSheetState {
  state: SetBudgetSheetStateShape;
  initAddMode: (firstCategoryId: string | undefined) => void;
  setSelectedCategoryId: (id: string) => void;
  togglePicker: () => void;
  collapsePicker: () => void;
  reset: () => void;
}

const INITIAL_STATE: SetBudgetSheetStateShape = {
  selectedCategoryId: undefined,
  pickerExpanded: false,
};

export const useSetBudgetSheetState = createMoneyAppSelectors(
  create<SetBudgetSheetState>((set) => ({
    state: INITIAL_STATE,
    initAddMode: (firstCategoryId) =>
      set({
        state: { ...INITIAL_STATE, selectedCategoryId: firstCategoryId },
      }),
    setSelectedCategoryId: (id) =>
      set((s) => ({ state: { ...s.state, selectedCategoryId: id, pickerExpanded: false } })),
    togglePicker: () =>
      set((s) => ({ state: { ...s.state, pickerExpanded: !s.state.pickerExpanded } })),
    collapsePicker: () => set((s) => ({ state: { ...s.state, pickerExpanded: false } })),
    reset: () => set({ state: INITIAL_STATE }),
  })),
);
