import { TransactionType } from '@/constants/enums';
import {
  EMPTY_FILTERS_V2,
  type AdvancedFilters,
} from '@/modules/transactions/screens/transactions/filter/filter.store';
import { useTransactionsScreenStore } from '@/modules/transactions/screens/transactions/transactions.store';

beforeEach(() => {
  useTransactionsScreenStore().reset();
});

describe('useTransactionsScreenStore initial state', () => {
  it('starts with empty search, "all" filter, a month period, and empty applied filters', () => {
    const { state } = useTransactionsScreenStore();
    expect(state.searchQuery.value).toBe('');
    expect(state.activeFilter.value).toBe('all');
    expect(state.period.value.type).toBe('month');
    expect(state.appliedFilters.value).toEqual(EMPTY_FILTERS_V2);
  });

  it('seeds the period with the current year-month string', () => {
    const { state } = useTransactionsScreenStore();
    if (state.period.value.type !== 'month') throw new Error('expected month period');
    expect(state.period.value.yearMonth).toMatch(/^\d{4}-\d{2}$/);
  });
});

describe('useTransactionsScreenStore setters', () => {
  it('setSearchQuery updates the query', () => {
    useTransactionsScreenStore().setSearchQuery('coffee');
    expect(useTransactionsScreenStore().state.searchQuery.value).toBe('coffee');
  });

  it('setActiveFilter updates the active filter', () => {
    useTransactionsScreenStore().setActiveFilter(TransactionType.Expense);
    expect(useTransactionsScreenStore().state.activeFilter.value).toBe(TransactionType.Expense);
  });

  it('setPeriod replaces the period selection', () => {
    useTransactionsScreenStore().setPeriod({ type: 'all' });
    expect(useTransactionsScreenStore().state.period.value).toEqual({ type: 'all' });
  });

  it('setAppliedFilters replaces the applied filters', () => {
    const next: AdvancedFilters = { ...EMPTY_FILTERS_V2, accountIds: ['a1'] };
    useTransactionsScreenStore().setAppliedFilters(next);
    expect(useTransactionsScreenStore().state.appliedFilters.value).toEqual(next);
  });

  it('clearSearch empties the query without touching other fields', () => {
    useTransactionsScreenStore().setSearchQuery('rent');
    useTransactionsScreenStore().setActiveFilter(TransactionType.Income);
    useTransactionsScreenStore().clearSearch();
    expect(useTransactionsScreenStore().state.searchQuery.value).toBe('');
    expect(useTransactionsScreenStore().state.activeFilter.value).toBe(TransactionType.Income);
  });
});

describe('useTransactionsScreenStore reset', () => {
  it('returns every field to its initial value', () => {
    useTransactionsScreenStore().setSearchQuery('x');
    useTransactionsScreenStore().setActiveFilter(TransactionType.Expense);
    useTransactionsScreenStore().setPeriod({ type: 'all' });
    useTransactionsScreenStore().setAppliedFilters({ ...EMPTY_FILTERS_V2, accountIds: ['a'] });
    useTransactionsScreenStore().reset();
    const { state } = useTransactionsScreenStore();
    expect(state.searchQuery.value).toBe('');
    expect(state.activeFilter.value).toBe('all');
    expect(state.period.value.type).toBe('month');
    expect(state.appliedFilters.value).toEqual(EMPTY_FILTERS_V2);
  });
});
