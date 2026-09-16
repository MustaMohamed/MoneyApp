import { create } from 'zustand';

import { createMoneyAppSelectors } from '@/utils/zustand_selectors';

interface AccountDetailStateShape {
  isAdjustVisible: boolean;
  isArchiveVisible: boolean;
  isAdjusting: boolean;
  isArchiving: boolean;
  isConfirmingBalanceReview: boolean;
  balanceReviewError: string | undefined;
  archiveError: string | undefined;
  isUnarchiving: boolean;
  unarchiveError: string | undefined;
  isDeleteVisible: boolean;
  isDeleting: boolean;
  deleteError: string | undefined;
}

type AccountDetailState = AccountDetailStateShape & {
  setAdjustVisible: (v: boolean) => void;
  setArchiveVisible: (v: boolean) => void;
  setAdjusting: (v: boolean) => void;
  setArchiving: (v: boolean) => void;
  setConfirmingBalanceReview: (v: boolean) => void;
  setBalanceReviewError: (message: string | undefined) => void;
  setArchiveError: (message: string | undefined) => void;
  setUnarchiving: (v: boolean) => void;
  setUnarchiveError: (message: string | undefined) => void;
  setDeleteVisible: (v: boolean) => void;
  setDeleting: (v: boolean) => void;
  setDeleteError: (message: string | undefined) => void;
  reset: () => void;
};

const INITIAL_STATE: AccountDetailStateShape = {
  isAdjustVisible: false,
  isArchiveVisible: false,
  isAdjusting: false,
  isArchiving: false,
  isConfirmingBalanceReview: false,
  balanceReviewError: undefined,
  archiveError: undefined,
  isUnarchiving: false,
  unarchiveError: undefined,
  isDeleteVisible: false,
  isDeleting: false,
  deleteError: undefined,
};

export function createAccountDetailState() {
  return createMoneyAppSelectors(
    create<AccountDetailState>((set) => ({
      ...INITIAL_STATE,
      setAdjustVisible: (v) => set({ isAdjustVisible: v }),
      setArchiveVisible: (v) => set({ isArchiveVisible: v }),
      setAdjusting: (v) => set({ isAdjusting: v }),
      setArchiving: (v) => set({ isArchiving: v }),
      setConfirmingBalanceReview: (v) => set({ isConfirmingBalanceReview: v }),
      setBalanceReviewError: (message) => set({ balanceReviewError: message }),
      setArchiveError: (message) => set({ archiveError: message }),
      setUnarchiving: (v) => set({ isUnarchiving: v }),
      setUnarchiveError: (message) => set({ unarchiveError: message }),
      setDeleteVisible: (v) => set({ isDeleteVisible: v }),
      setDeleting: (v) => set({ isDeleting: v }),
      setDeleteError: (message) => set({ deleteError: message }),
      reset: () => set(INITIAL_STATE),
    })),
  );
}

export const useAccountDetailState = createAccountDetailState();
