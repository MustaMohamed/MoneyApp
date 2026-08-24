import { create } from 'zustand';

import { createMoneyAppSelectors } from '@/utils/zustand_selectors';

export type SpendingPlanDatePickerTarget = 'start' | 'end';

interface SpendingPlanSheetStateShape {
  pickerExpanded: boolean;
  datePickerTarget: SpendingPlanDatePickerTarget | undefined;
  submitError: string | undefined;
  saving: boolean;
  // Unmutes the allocation rows whose text is an incomplete decimal ('1.').
  // Those stay silent while typing -- '0.40' passes through '0.' on the way in
  // -- and explain themselves the moment a Save is refused. Same semantics as
  // RHF's isSubmitted, which is the house answer to this question.
  allocationSubmitAttempted: boolean;
}

type SpendingPlanSheetState = SpendingPlanSheetStateShape & {
  setSubmitError: (error: string | undefined) => void;
  setAllocationSubmitAttempted: (attempted: boolean) => void;
  setSaving: (saving: boolean) => void;
  openPicker: () => void;
  closePicker: () => void;
  openDatePicker: (target: SpendingPlanDatePickerTarget) => void;
  closeDatePicker: () => void;
  reset: () => void;
};

const INITIAL_STATE: SpendingPlanSheetStateShape = {
  pickerExpanded: false,
  datePickerTarget: undefined,
  submitError: undefined,
  saving: false,
  allocationSubmitAttempted: false,
};

export const useSpendingPlanSheetState = createMoneyAppSelectors(
  create<SpendingPlanSheetState>((set) => ({
    ...INITIAL_STATE,
    setSubmitError: (submitError) => set({ submitError }),
    setAllocationSubmitAttempted: (allocationSubmitAttempted) => set({ allocationSubmitAttempted }),
    setSaving: (saving) => set({ saving }),
    openPicker: () => set({ pickerExpanded: true }),
    closePicker: () => set({ pickerExpanded: false }),
    openDatePicker: (datePickerTarget) => set({ datePickerTarget }),
    closeDatePicker: () => set({ datePickerTarget: undefined }),
    reset: () => set(INITIAL_STATE),
  })),
);
