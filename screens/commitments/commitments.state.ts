import { create } from 'zustand';

import { CommitmentPaymentStatus } from '@/constants/enums';

export type CommitmentStatusFilter = 'all' | CommitmentPaymentStatus;

interface CommitmentsScreenStateShape {
  refreshing: boolean;
  statusFilter: CommitmentStatusFilter;
}

interface CommitmentsScreenState {
  state: CommitmentsScreenStateShape;
  setRefreshing: (v: boolean) => void;
  setStatusFilter: (f: CommitmentStatusFilter) => void;
  reset: () => void;
}

const INITIAL_STATE: CommitmentsScreenStateShape = {
  refreshing: false,
  statusFilter: 'all',
};

export const useCommitmentsScreenState = create<CommitmentsScreenState>((set) => ({
  state: INITIAL_STATE,
  setRefreshing: (v) => set((s) => ({ state: { ...s.state, refreshing: v } })),
  setStatusFilter: (f) => set((s) => ({ state: { ...s.state, statusFilter: f } })),
  reset: () => set({ state: INITIAL_STATE }),
}));
