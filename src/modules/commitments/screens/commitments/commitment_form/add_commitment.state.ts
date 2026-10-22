import { create } from 'zustand';

import { createMoneyAppSelectors } from '@/utils/zustand_selectors';

interface AddCommitmentStateShape {
  saving: boolean;
  saveError?: string;
}

type AddCommitmentState = AddCommitmentStateShape & {
  setSaving: (v: boolean) => void;
  setSaveError: (message?: string) => void;
  reset: () => void;
};

const INITIAL_STATE: AddCommitmentStateShape = { saving: false, saveError: undefined };

export const useAddCommitmentState = createMoneyAppSelectors(
  create<AddCommitmentState>((set) => ({
    ...INITIAL_STATE,
    setSaving: (v) => set({ saving: v }),
    setSaveError: (message) => set({ saveError: message }),
    reset: () => set(INITIAL_STATE),
  })),
);
