import { create } from 'zustand';

import { CommitmentPaymentStatus } from '@/constants/enums';
import {
  EMPTY_COMMITMENT_FILTERS,
  type CommitmentAdvancedFilters,
} from '@/modules/commitments/screens/commitments/filter/filter.store';
import { createMoneyAppSelectors } from '@/utils/zustand_selectors';

export type CommitmentStatusFilter = 'all' | CommitmentPaymentStatus;

interface CommitmentsScreenStateShape {
  refreshing: boolean;
  statusFilter: CommitmentStatusFilter;
  searchQuery: string;
  appliedFilters: CommitmentAdvancedFilters;
}

type CommitmentsScreenState = CommitmentsScreenStateShape & {
  setRefreshing: (v: boolean) => void;
  setStatusFilter: (f: CommitmentStatusFilter) => void;
  setSearchQuery: (query: string) => void;
  clearSearch: () => void;
  setAppliedFilters: (filters: CommitmentAdvancedFilters) => void;
  reset: () => void;
};

const INITIAL_STATE: CommitmentsScreenStateShape = {
  refreshing: false,
  statusFilter: 'all',
  searchQuery: '',
  appliedFilters: EMPTY_COMMITMENT_FILTERS,
};

export const useCommitmentsScreenState = createMoneyAppSelectors(
  create<CommitmentsScreenState>((set) => ({
    ...INITIAL_STATE,
    setRefreshing: (v) => set({ refreshing: v }),
    setStatusFilter: (f) => set({ statusFilter: f }),
    setSearchQuery: (query) => set({ searchQuery: query }),
    clearSearch: () => set({ searchQuery: '' }),
    setAppliedFilters: (filters) => set({ appliedFilters: filters }),
    reset: () => set(INITIAL_STATE),
  })),
);
