import { batch, signal } from '@preact/signals-react';

import { TransactionType } from '@/constants/enums';

import { EMPTY_FILTERS_V2, type AdvancedFilters } from './filter/filter.store';
import { currentYearMonth, type CarouselSelection } from './transactions.helpers';

export type TransactionFilter = TransactionType | 'all';

function initialPeriod(): CarouselSelection {
  return { type: 'month', yearMonth: currentYearMonth() };
}

const searchQuery = signal('');
const activeFilter = signal<TransactionFilter>('all');
const period = signal<CarouselSelection>(initialPeriod());
const appliedFilters = signal<AdvancedFilters>(EMPTY_FILTERS_V2);

function setSearchQuery(q: string): void {
  searchQuery.value = q;
}

function setActiveFilter(f: TransactionFilter): void {
  activeFilter.value = f;
}

function setPeriod(p: CarouselSelection): void {
  period.value = p;
}

function setAppliedFilters(f: AdvancedFilters): void {
  appliedFilters.value = f;
}

function clearSearch(): void {
  searchQuery.value = '';
}

function reset(): void {
  batch(() => {
    searchQuery.value = '';
    activeFilter.value = 'all';
    period.value = initialPeriod();
    appliedFilters.value = EMPTY_FILTERS_V2;
  });
}

export function useTransactionsScreenStore() {
  return {
    state: {
      searchQuery,
      activeFilter,
      period,
      appliedFilters,
    },
    setSearchQuery,
    setActiveFilter,
    setPeriod,
    setAppliedFilters,
    clearSearch,
    reset,
  };
}
