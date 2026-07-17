import { create } from 'zustand';

import type { BudgetGroup } from '@/constants/enums';
import { createMoneyAppSelectors } from '@/utils/zustand_selectors';

interface SetBudgetSheetStateShape {
  sessionKey: string | undefined;
  selectedCategoryId: string | undefined;
  pickerExpanded: boolean;
  groupValue: BudgetGroup | null;
  saving: boolean;
  errorMessage: string | undefined;
}

type SetBudgetSheetState = SetBudgetSheetStateShape & {
  initAddMode: (
    firstCategoryId: string | undefined,
    group?: BudgetGroup | null,
    sessionKey?: string,
  ) => boolean;
  initEditMode: (group: BudgetGroup | null, sessionKey?: string) => boolean;
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
  sessionKey: undefined,
  selectedCategoryId: undefined,
  pickerExpanded: false,
  groupValue: null,
  saving: false,
  errorMessage: undefined,
};

export const useSetBudgetSheetState = createMoneyAppSelectors(
  create<SetBudgetSheetState>((set, get) => ({
    ...INITIAL_STATE,
    initAddMode: (firstCategoryId, group, sessionKey) => {
      if (get().saving || (sessionKey !== undefined && get().sessionKey === sessionKey)) {
        return false;
      }
      set({
        ...INITIAL_STATE,
        sessionKey,
        selectedCategoryId: firstCategoryId,
        groupValue: group ?? null,
      });
      return true;
    },
    initEditMode: (groupValue, sessionKey) => {
      if (get().saving || (sessionKey !== undefined && get().sessionKey === sessionKey)) {
        return false;
      }
      set({ ...INITIAL_STATE, sessionKey, groupValue });
      return true;
    },
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
