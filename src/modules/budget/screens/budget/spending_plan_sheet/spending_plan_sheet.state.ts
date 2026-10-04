import { create } from 'zustand';

import { createMoneyAppSelectors } from '@/utils/zustand_selectors';

export type SpendingPlanDatePickerTarget = 'start' | 'end';

interface SpendingPlanSheetStateShape {
  pickerExpanded: boolean;
  datePickerTarget: SpendingPlanDatePickerTarget | undefined;
  submitError: string | undefined;
  saving: boolean;
  // An allocation row holding an incomplete decimal ('1.') stays silent until a save is refused.
  allocationSubmitAttempted: boolean;
  // The row the latest edit on the sheet was in: exempt from the incomplete fault while it is.
  lastTypedAllocationId: string | undefined;
}

type SpendingPlanSheetState = SpendingPlanSheetStateShape & {
  setSubmitError: (error: string | undefined) => void;
  setAllocationSubmitAttempted: (attempted: boolean) => void;
  setLastTypedAllocation: (categoryId: string | undefined) => void;
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
  lastTypedAllocationId: undefined,
};

export const useSpendingPlanSheetState = createMoneyAppSelectors(
  create<SpendingPlanSheetState>((set) => ({
    ...INITIAL_STATE,
    setSubmitError: (submitError) => set({ submitError }),
    // A Save attempt checks every row, the one last typed in included.
    setAllocationSubmitAttempted: (allocationSubmitAttempted) =>
      set({ allocationSubmitAttempted, lastTypedAllocationId: undefined }),
    setLastTypedAllocation: (lastTypedAllocationId) => set({ lastTypedAllocationId }),
    setSaving: (saving) => set({ saving }),
    openPicker: () => set({ pickerExpanded: true }),
    closePicker: () => set({ pickerExpanded: false }),
    openDatePicker: (datePickerTarget) => set({ datePickerTarget }),
    closeDatePicker: () => set({ datePickerTarget: undefined }),
    reset: () => set(INITIAL_STATE),
  })),
);
