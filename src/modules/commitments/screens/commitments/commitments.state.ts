import { create } from 'zustand';

import { CommitmentPaymentStatus } from '@/constants/enums';
import type { Commitment } from '@/modules/commitments/entities/commitment.entity';
import type { CommitmentMonthPayment } from '@/modules/commitments/entities/commitment_payment.entity';
import {
  EMPTY_COMMITMENT_FILTERS,
  type CommitmentAdvancedFilters,
} from '@/modules/commitments/screens/commitments/filter/filter.store';
import { createMoneyAppSelectors } from '@/utils/zustand_selectors';

export type CommitmentStatusFilter = 'all' | CommitmentPaymentStatus;

export interface CommitmentPayTarget {
  payment: CommitmentMonthPayment;
  commitment: Commitment;
}

interface CommitmentsScreenStateShape {
  refreshing: boolean;
  statusFilter: CommitmentStatusFilter;
  searchQuery: string;
  appliedFilters: CommitmentAdvancedFilters;
  /** The row the list's pay sheet draws; no close clears it, so a reload that drops a paid row leaves the closing sheet drawn. */
  payTarget: CommitmentPayTarget | undefined;
}

type CommitmentsScreenState = CommitmentsScreenStateShape & {
  setRefreshing: (v: boolean) => void;
  setStatusFilter: (f: CommitmentStatusFilter) => void;
  setSearchQuery: (query: string) => void;
  clearSearch: () => void;
  setAppliedFilters: (filters: CommitmentAdvancedFilters) => void;
  setPayTarget: (target: CommitmentPayTarget) => void;
  reset: () => void;
};

const INITIAL_STATE: CommitmentsScreenStateShape = {
  refreshing: false,
  statusFilter: 'all',
  searchQuery: '',
  appliedFilters: EMPTY_COMMITMENT_FILTERS,
  payTarget: undefined,
};

export const useCommitmentsScreenState = createMoneyAppSelectors(
  create<CommitmentsScreenState>((set) => ({
    ...INITIAL_STATE,
    setRefreshing: (v) => set({ refreshing: v }),
    setStatusFilter: (f) => set({ statusFilter: f }),
    setSearchQuery: (query) => set({ searchQuery: query }),
    clearSearch: () => set({ searchQuery: '' }),
    setAppliedFilters: (filters) => set({ appliedFilters: filters }),
    setPayTarget: (target) => set({ payTarget: target }),
    reset: () => set(INITIAL_STATE),
  })),
);
