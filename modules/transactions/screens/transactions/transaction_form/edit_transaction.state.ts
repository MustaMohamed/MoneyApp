import { create } from 'zustand';

import type { Transaction } from '@/modules/transactions/entities/transaction.entity';
import { createMoneyAppSelectors } from '@/utils/zustand_selectors';

interface EditTransactionStateShape {
  visible: boolean;
  saving: boolean;
  showCategoryPicker: boolean;
  rateOverride: boolean;
}

type EditTransactionState = EditTransactionStateShape & {
  open: (tx: Transaction) => void;
  close: () => void;
  setSaving: (v: boolean) => void;
  setShowCategoryPicker: (v: boolean) => void;
  setRateOverride: (v: boolean) => void;
  reset: () => void;
};

const INITIAL_STATE: EditTransactionStateShape = {
  visible: false,
  saving: false,
  showCategoryPicker: false,
  rateOverride: false,
};

export const useEditTransactionState = createMoneyAppSelectors(
  create<EditTransactionState>((set) => ({
    ...INITIAL_STATE,

    open: () => set((s) => ({ ...s, visible: true })),
    close: () => set(INITIAL_STATE),
    setSaving: (v) => set((s) => ({ ...s, saving: v })),
    setShowCategoryPicker: (v) => set((s) => ({ ...s, showCategoryPicker: v })),
    setRateOverride: (v) => set((s) => ({ ...s, rateOverride: v })),
    reset: () => set(INITIAL_STATE),
  })),
);
