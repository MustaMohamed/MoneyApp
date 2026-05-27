import { create } from 'zustand';

import { createMoneyAppSelectors } from '@/utils/zustand_selectors';

interface AddCommitmentStateShape {
  saving: boolean;
}

type AddCommitmentState = AddCommitmentStateShape & {
  setSaving: (v: boolean) => void;
  reset: () => void;
};

const INITIAL_STATE: AddCommitmentStateShape = { saving: false };

export const useAddCommitmentState = createMoneyAppSelectors(
  create<AddCommitmentState>((set) => ({
    ...INITIAL_STATE,
    setSaving: (v) => set((s) => ({ ...s, saving: v })),
    reset: () => set(INITIAL_STATE),
  })),
);
