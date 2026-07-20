import { create } from 'zustand';

import { createMoneyAppSelectors } from '@/utils/zustand_selectors';

interface AccountDetailStateShape {
  isEditing: boolean;
  isAdjustVisible: boolean;
  isArchiveVisible: boolean;
  isSaving: boolean;
  isAdjusting: boolean;
  isArchiving: boolean;
  isConfirmingBalanceReview: boolean;
  balanceReviewError: string | undefined;
}

type AccountDetailState = AccountDetailStateShape & {
  setEditing: (v: boolean) => void;
  setAdjustVisible: (v: boolean) => void;
  setArchiveVisible: (v: boolean) => void;
  setSaving: (v: boolean) => void;
  setAdjusting: (v: boolean) => void;
  setArchiving: (v: boolean) => void;
  setConfirmingBalanceReview: (v: boolean) => void;
  setBalanceReviewError: (message: string | undefined) => void;
  reset: () => void;
};

const INITIAL_STATE: AccountDetailStateShape = {
  isEditing: false,
  isAdjustVisible: false,
  isArchiveVisible: false,
  isSaving: false,
  isAdjusting: false,
  isArchiving: false,
  isConfirmingBalanceReview: false,
  balanceReviewError: undefined,
};

export function createAccountDetailState() {
  return createMoneyAppSelectors(
    create<AccountDetailState>((set) => ({
      ...INITIAL_STATE,
      setEditing: (v) => set({ isEditing: v }),
      setAdjustVisible: (v) => set({ isAdjustVisible: v }),
      setArchiveVisible: (v) => set({ isArchiveVisible: v }),
      setSaving: (v) => set({ isSaving: v }),
      setAdjusting: (v) => set({ isAdjusting: v }),
      setArchiving: (v) => set({ isArchiving: v }),
      setConfirmingBalanceReview: (v) => set({ isConfirmingBalanceReview: v }),
      setBalanceReviewError: (message) => set({ balanceReviewError: message }),
      reset: () => set(INITIAL_STATE),
    })),
  );
}

export const useAccountDetailState = createAccountDetailState();
