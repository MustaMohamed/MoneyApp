import { create } from 'zustand';

import { createMoneyAppSelectors } from '@/utils/zustand_selectors';

interface AccountDetailStateShape {
  isEditing: boolean;
  isAdjustVisible: boolean;
  isArchiveVisible: boolean;
  isSaving: boolean;
  isAdjusting: boolean;
  isArchiving: boolean;
}

type AccountDetailState = AccountDetailStateShape & {
  setEditing: (v: boolean) => void;
  setAdjustVisible: (v: boolean) => void;
  setArchiveVisible: (v: boolean) => void;
  setSaving: (v: boolean) => void;
  setAdjusting: (v: boolean) => void;
  setArchiving: (v: boolean) => void;
  reset: () => void;
};

const INITIAL_STATE: AccountDetailStateShape = {
  isEditing: false,
  isAdjustVisible: false,
  isArchiveVisible: false,
  isSaving: false,
  isAdjusting: false,
  isArchiving: false,
};

export function createAccountDetailState() {
  return createMoneyAppSelectors(
    create<AccountDetailState>((set) => ({
      ...INITIAL_STATE,
      setEditing: (v) => set((s) => ({ ...s, isEditing: v })),
      setAdjustVisible: (v) => set((s) => ({ ...s, isAdjustVisible: v })),
      setArchiveVisible: (v) => set((s) => ({ ...s, isArchiveVisible: v })),
      setSaving: (v) => set((s) => ({ ...s, isSaving: v })),
      setAdjusting: (v) => set((s) => ({ ...s, isAdjusting: v })),
      setArchiving: (v) => set((s) => ({ ...s, isArchiving: v })),
      reset: () => set(INITIAL_STATE),
    })),
  );
}

export const useAccountDetailState = createAccountDetailState();
