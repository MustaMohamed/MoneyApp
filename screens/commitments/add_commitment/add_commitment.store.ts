import { create } from 'zustand';

import { AmountType, DurationType } from '@/constants/enums';

export type RecurrencePreset = 'monthly' | 'weekly' | 'annually' | 'custom';

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
  recurrencePreset: 'monthly',
  durationType: DurationType.Forever,
};

export const useAddCommitmentStore = create<AddCommitmentStore>((set) => ({
  state: INITIAL_STATE,
  setAmountType: (v) => set((s) => ({ state: { ...s.state, amountType: v } })),
  setRecurrencePreset: (v) => set((s) => ({ state: { ...s.state, recurrencePreset: v } })),
  setDurationType: (v) => set((s) => ({ state: { ...s.state, durationType: v } })),
  reset: () => set({ state: INITIAL_STATE }),
}));
