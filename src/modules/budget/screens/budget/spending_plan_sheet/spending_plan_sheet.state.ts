import { create } from 'zustand';

import { createMoneyAppSelectors } from '@/utils/zustand_selectors';

type SpendingPlanAmountField = { kind: 'total' } | { kind: 'allocation'; categoryId: string };

interface SpendingPlanSheetStateShape {
  pickerExpanded: boolean;
  submitError: string | undefined;
  saving: boolean;
  // An allocation row holding an incomplete decimal ('1.') stays silent until a save is refused.
  allocationSubmitAttempted: boolean;
  // The row the latest edit on the sheet was in: exempt from the incomplete fault while it is.
  lastTypedAllocationId: string | undefined;
  // The total or the limit row edited last: the field that carries the ring while limits are over.
  lastEditedAmountField: SpendingPlanAmountField | undefined;
}

type SpendingPlanSheetState = SpendingPlanSheetStateShape & {
  setSubmitError: (error: string | undefined) => void;
  setAllocationSubmitAttempted: (attempted: boolean) => void;
  setLastTypedAllocation: (categoryId: string | undefined) => void;
  setLastEditedAmountField: (field: SpendingPlanAmountField | undefined) => void;
  setSaving: (saving: boolean) => void;
  openPicker: () => void;
  closePicker: () => void;
  reset: () => void;
};

const INITIAL_STATE: SpendingPlanSheetStateShape = {
  pickerExpanded: false,
  submitError: undefined,
  saving: false,
  allocationSubmitAttempted: false,
  lastTypedAllocationId: undefined,
  lastEditedAmountField: undefined,
};

export const useSpendingPlanSheetState = createMoneyAppSelectors(
  create<SpendingPlanSheetState>((set) => ({
    ...INITIAL_STATE,
    setSubmitError: (submitError) => set({ submitError }),
    // A Save attempt checks every row, the one last typed in included.
    setAllocationSubmitAttempted: (allocationSubmitAttempted) =>
      set({ allocationSubmitAttempted, lastTypedAllocationId: undefined }),
    setLastTypedAllocation: (lastTypedAllocationId) => set({ lastTypedAllocationId }),
    setLastEditedAmountField: (lastEditedAmountField) => set({ lastEditedAmountField }),
    setSaving: (saving) => set({ saving }),
    openPicker: () => set({ pickerExpanded: true }),
    closePicker: () => set({ pickerExpanded: false }),
    reset: () => set(INITIAL_STATE),
  })),
);
