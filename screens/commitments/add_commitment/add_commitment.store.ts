import { create } from 'zustand';

import { AmountType, DurationType, RecurrencePreset } from '@/constants/enums';

interface AddCommitmentStoreShape {
  amountType: AmountType;
  recurrencePreset: RecurrencePreset;
  durationType: DurationType;
}

interface AddCommitmentStore {
  state: AddCommitmentStoreShape;
  setAmountType: (v: AmountType) => void;
  setRecurrencePreset: (v: RecurrencePreset) => void;
  setDurationType: (v: DurationType) => void;
  reset: () => void;
}

const INITIAL_STATE: AddCommitmentStoreShape = {
  amountType: AmountType.Fixed,
  recurrencePreset: RecurrencePreset.Monthly,
  durationType: DurationType.Forever,
};

export const useAddCommitmentStore = create<AddCommitmentStore>((set) => ({
  state: INITIAL_STATE,
  setAmountType: (v) => set((s) => ({ state: { ...s.state, amountType: v } })),
  setRecurrencePreset: (v) => set((s) => ({ state: { ...s.state, recurrencePreset: v } })),
  setDurationType: (v) => set((s) => ({ state: { ...s.state, durationType: v } })),
  reset: () => set({ state: INITIAL_STATE }),
}));
