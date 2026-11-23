import { create } from 'zustand';

import type { BudgetGroup } from '@/constants/enums';
import { useBudgetState } from '@/modules/budget/screens/budget/budget.state';
import { createMoneyAppSelectors } from '@/utils/zustand_selectors';

export const BUDGET_TAB_SHEET_OWNER = 'budget-tab';

type SetBudgetSaveOutcome = 'added' | 'updated';

interface SetBudgetSheetStateShape {
  openOwner: string | undefined;
  owner: string | undefined;
  sessionKey: string | undefined;
  selectedCategoryId: string | undefined;
  pickerExpanded: boolean;
  groupValue: BudgetGroup | null;
  groupPickerOpen: boolean;
  saving: boolean;
  errorMessage: string | undefined;
  nameTaken: boolean;
  closeOutcome: SetBudgetSaveOutcome | undefined;
}

type SetBudgetSheetState = SetBudgetSheetStateShape & {
  openFor: (owner: string) => void;
  initAddMode: (
    owner: string,
    firstCategoryId: string | undefined,
    group?: BudgetGroup | null,
    sessionKey?: string,
  ) => boolean;
  initEditMode: (owner: string, group: BudgetGroup | null, sessionKey?: string) => boolean;
  release: (owner: string) => void;
  completeSave: (owner: string, outcome: SetBudgetSaveOutcome) => void;
  completeClose: (owner: string) => SetBudgetSaveOutcome | undefined;
  setSelectedCategoryId: (id: string) => void;
  setGroupValue: (group: BudgetGroup | null) => void;
  showGroupPicker: () => void;
  hideGroupPicker: () => void;
  chooseGroup: (group: BudgetGroup) => void;
  setSaving: (saving: boolean) => void;
  setErrorMessage: (message: string | undefined, nameTaken?: boolean) => void;
  clearError: () => void;
  togglePicker: () => void;
  collapsePicker: () => void;
  reset: () => void;
};

const INITIAL_STATE: SetBudgetSheetStateShape = {
  openOwner: undefined,
  owner: undefined,
  sessionKey: undefined,
  selectedCategoryId: undefined,
  pickerExpanded: false,
  groupValue: null,
  groupPickerOpen: false,
  saving: false,
  errorMessage: undefined,
  nameTaken: false,
  closeOutcome: undefined,
};

export const useSetBudgetSheetState = createMoneyAppSelectors(
  create<SetBudgetSheetState>((set, get) => {
    const refusesInit = (owner: string, sessionKey: string | undefined): boolean => {
      const s = get();
      return (
        s.saving || (sessionKey !== undefined && s.owner === owner && s.sessionKey === sessionKey)
      );
    };
    return {
      ...INITIAL_STATE,
      openFor: (openOwner) => set({ openOwner }),
      initAddMode: (owner, firstCategoryId, group, sessionKey) => {
        if (refusesInit(owner, sessionKey)) return false;
        set({
          ...INITIAL_STATE,
          openOwner: get().openOwner,
          owner,
          sessionKey,
          selectedCategoryId: firstCategoryId,
          groupValue: group ?? null,
        });
        return true;
      },
      initEditMode: (owner, groupValue, sessionKey) => {
        if (refusesInit(owner, sessionKey)) return false;
        set({ ...INITIAL_STATE, openOwner: get().openOwner, owner, sessionKey, groupValue });
        return true;
      },
      release: (owner) => {
        const s = get();
        if (s.owner !== owner) return;
        set({
          ...INITIAL_STATE,
          openOwner: s.openOwner,
          owner: s.owner,
          closeOutcome: s.closeOutcome,
        });
      },
      completeSave: (owner, outcome) => {
        if (get().owner === owner) set({ closeOutcome: outcome });
      },
      completeClose: (owner) => {
        const s = get();
        if (s.owner !== owner) return undefined;
        set({ closeOutcome: undefined });
        return s.closeOutcome;
      },
      setSelectedCategoryId: (id) =>
        set({
          selectedCategoryId: id,
          pickerExpanded: false,
          errorMessage: undefined,
          nameTaken: false,
        }),
      setGroupValue: (group) =>
        set({ groupValue: group, errorMessage: undefined, nameTaken: false }),
      showGroupPicker: () => set({ groupPickerOpen: true }),
      hideGroupPicker: () => set({ groupPickerOpen: false }),
      chooseGroup: (group) =>
        set({
          groupValue: group,
          groupPickerOpen: false,
          errorMessage: undefined,
          nameTaken: false,
        }),
      setSaving: (saving) => set({ saving }),
      setErrorMessage: (errorMessage, nameTaken = false) => set({ errorMessage, nameTaken }),
      clearError: () => set({ errorMessage: undefined, nameTaken: false }),
      togglePicker: () => set((s) => ({ pickerExpanded: !s.pickerExpanded })),
      collapsePicker: () => set({ pickerExpanded: false }),
      reset: () => set(INITIAL_STATE),
    };
  }),
);

export function openSetBudgetAdd(owner: string): void {
  useSetBudgetSheetState.getState().openFor(owner);
  useBudgetState.getState().openAdd();
}

export function openSetBudgetAddWithContext(
  owner: string,
  categoryId: string | undefined,
  group: BudgetGroup,
): void {
  useSetBudgetSheetState.getState().openFor(owner);
  useBudgetState.getState().openAddWithContext(categoryId, group);
}

export function openSetBudgetEdit(owner: string, budgetId: string): void {
  useSetBudgetSheetState.getState().openFor(owner);
  useBudgetState.getState().openEdit(budgetId);
}
