import { create } from 'zustand';

import { CommitmentPaymentStatus } from '@/constants/enums';
import { createMoneyAppSelectors } from '@/utils/zustand_selectors';

export type CommitmentStatusFilter = 'all' | CommitmentPaymentStatus;

interface CommitmentsScreenStateShape {
  refreshing: boolean;
  statusFilter: CommitmentStatusFilter;
}

type CommitmentsScreenState = CommitmentsScreenStateShape & {
  setRefreshing: (v: boolean) => void;
  setStatusFilter: (f: CommitmentStatusFilter) => void;
  reset: () => void;
};

const INITIAL_STATE: CommitmentsScreenStateShape = {
  refreshing: false,
  statusFilter: 'all',
};

export const useCommitmentsScreenState = createMoneyAppSelectors(
  create<CommitmentsScreenState>((set) => ({
    ...INITIAL_STATE,
    setRefreshing: (v) => set((s) => ({ ...s, refreshing: v })),
    setStatusFilter: (f) => set((s) => ({ ...s, statusFilter: f })),
    reset: () => set(INITIAL_STATE),
  })),
);
