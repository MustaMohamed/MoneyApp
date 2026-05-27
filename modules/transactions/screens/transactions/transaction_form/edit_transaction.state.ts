import { create } from 'zustand';

import type { Transaction } from '@/modules/transactions/entities/transaction.entity';
import { createMoneyAppSelectors } from '@/utils/zustand_selectors';

interface EditTransactionStateShape {
  visible: boolean;
  saving: boolean;
  showCategoryPicker: boolean;
  rateOverride: boolean;
}

interface EditTransactionState {
  state: EditTransactionStateShape;
  open: (tx: Transaction) => void;
  close: () => void;
  setSaving: (v: boolean) => void;
  setShowCategoryPicker: (v: boolean) => void;
  setRateOverride: (v: boolean) => void;
  reset: () => void;
}

const INITIAL_STATE: EditTransactionStateShape = {
  visible: false,
  saving: false,
  showCategoryPicker: false,
  rateOverride: false,
};

export const useEditTransactionState = createMoneyAppSelectors(
  create<EditTransactionState>((set) => ({
    state: INITIAL_STATE,

    open: () => set((s) => ({ state: { ...s.state, visible: true } })),
    close: () => set({ state: INITIAL_STATE }),
    setSaving: (v) => set((s) => ({ state: { ...s.state, saving: v } })),
    setShowCategoryPicker: (v) => set((s) => ({ state: { ...s.state, showCategoryPicker: v } })),
    setRateOverride: (v) => set((s) => ({ state: { ...s.state, rateOverride: v } })),
    reset: () => set({ state: INITIAL_STATE }),
  })),
);
