import { batch, signal, type ReadonlySignal } from '@preact/signals-react';

import { TransactionType } from '@/constants/enums';

import { EMPTY_FILTERS_V2, type AdvancedFilters } from './filter/filter.store';
import { currentYearMonth, type CarouselSelection } from './transactions.helpers';

export type TransactionFilter = TransactionType | 'all';

type TransactionsScreenSignalState = {
  searchQuery: ReadonlySignal<string>;
  activeFilter: ReadonlySignal<TransactionFilter>;
  period: ReadonlySignal<CarouselSelection>;
  appliedFilters: ReadonlySignal<AdvancedFilters>;
};

function initialPeriod(): CarouselSelection {
  return { type: 'month', yearMonth: currentYearMonth() };
}

class TransactionsScreenStore {
  private readonly searchQuery = signal('');
  private readonly activeFilter = signal<TransactionFilter>('all');
  private readonly period = signal<CarouselSelection>(initialPeriod());
  private readonly appliedFilters = signal(EMPTY_FILTERS_V2);

  readonly state: TransactionsScreenSignalState = {
    searchQuery: this.searchQuery,
    activeFilter: this.activeFilter,
    period: this.period,
    appliedFilters: this.appliedFilters,
  };

  setSearchQuery = (q: string) => {
    this.searchQuery.value = q;
  };
  setActiveFilter = (f: TransactionFilter) => {
    this.activeFilter.value = f;
  };
  setPeriod = (p: CarouselSelection) => {
    this.period.value = p;
  };
  setAppliedFilters = (f: AdvancedFilters) => {
    this.appliedFilters.value = f;
  };
  clearSearch = () => {
    this.searchQuery.value = '';
  };
  reset = () => {
    batch(() => {
      this.searchQuery.value = '';
      this.activeFilter.value = 'all';
      this.period.value = initialPeriod();
      this.appliedFilters.value = EMPTY_FILTERS_V2;
    });
  };
}

const transactionsScreenStore = new TransactionsScreenStore();

export function useTransactionsScreenStore(): TransactionsScreenStore {
  return transactionsScreenStore;
}
