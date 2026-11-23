import { create } from 'zustand';

import type { BudgetGroup } from '@/constants/enums';
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
  saving: boolean;
  errorMessage: string | undefined;
  nameTaken: boolean;
  postClose: SetBudgetSaveOutcome | undefined;
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
  markSaved: (owner: string, outcome: SetBudgetSaveOutcome) => void;
  completeClose: (owner: string) => SetBudgetSaveOutcome | undefined;
  setSelectedCategoryId: (id: string) => void;
  setGroupValue: (group: BudgetGroup | null) => void;
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
  saving: false,
  errorMessage: undefined,
  nameTaken: false,
  postClose: undefined,
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
        set({ ...INITIAL_STATE, openOwner: s.openOwner, owner: s.owner, postClose: s.postClose });
      },
      markSaved: (owner, outcome) => {
        if (get().owner === owner) set({ postClose: outcome });
      },
      completeClose: (owner) => {
        const s = get();
        if (s.owner !== owner) return undefined;
        set({ postClose: undefined });
        return s.postClose;
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
      setSaving: (saving) => set({ saving }),
      setErrorMessage: (errorMessage, nameTaken = false) => set({ errorMessage, nameTaken }),
      clearError: () => set({ errorMessage: undefined, nameTaken: false }),
      togglePicker: () => set((s) => ({ pickerExpanded: !s.pickerExpanded })),
      collapsePicker: () => set({ pickerExpanded: false }),
      reset: () => set(INITIAL_STATE),
    };
  }),
);
