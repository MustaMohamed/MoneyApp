import { create } from 'zustand';

import { AmountType, DurationType, RecurrencePreset } from '@/constants/enums';

interface EditCommitmentStoreShape {
  amountType: AmountType;
  recurrencePreset: RecurrencePreset;
  durationType: DurationType;
}

interface EditCommitmentStore {
  state: EditCommitmentStoreShape;
  setAmountType: (v: AmountType) => void;
  setRecurrencePreset: (v: RecurrencePreset) => void;
  setDurationType: (v: DurationType) => void;
  reset: () => void;
}

const INITIAL_STATE: EditCommitmentStoreShape = {
  amountType: AmountType.Fixed,
  recurrencePreset: RecurrencePreset.Monthly,
  durationType: DurationType.Forever,
};

export const useEditCommitmentStore = create<EditCommitmentStore>((set) => ({
  state: INITIAL_STATE,
  setAmountType: (v) => set((s) => ({ state: { ...s.state, amountType: v } })),
  setRecurrencePreset: (v) => set((s) => ({ state: { ...s.state, recurrencePreset: v } })),
  setDurationType: (v) => set((s) => ({ state: { ...s.state, durationType: v } })),
  reset: () => set({ state: INITIAL_STATE }),
}));
