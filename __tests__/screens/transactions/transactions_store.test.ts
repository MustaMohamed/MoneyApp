import { TransactionType } from '@/constants/enums';
import {
  EMPTY_FILTERS_V2,
  type AdvancedFilters,
} from '@/modules/transactions/screens/transactions/filter/filter.store';
import { useTransactionsScreenStore } from '@/modules/transactions/screens/transactions/transactions.store';

beforeEach(() => {
  useTransactionsScreenStore.getState().reset();
});

describe('useTransactionsScreenStore initial state', () => {
  it('starts with empty search, "all" filter, a month period, and empty applied filters', () => {
    const s = useTransactionsScreenStore.getState();
    expect(s.searchQuery).toBe('');
    expect(s.activeFilter).toBe('all');
    expect(s.period.type).toBe('month');
    expect(s.appliedFilters).toEqual(EMPTY_FILTERS_V2);
  });

  it('seeds the period with the current year-month string', () => {
    const s = useTransactionsScreenStore.getState();
    expect(s.period.yearMonth).toMatch(/^\d{4}-\d{2}$/);
  });
});

describe('useTransactionsScreenStore setters', () => {
  it('setSearchQuery updates the query', () => {
    useTransactionsScreenStore.getState().setSearchQuery('coffee');
    expect(useTransactionsScreenStore.getState().searchQuery).toBe('coffee');
  });

  it('setActiveFilter updates the active filter', () => {
    useTransactionsScreenStore.getState().setActiveFilter(TransactionType.Expense);
    expect(useTransactionsScreenStore.getState().activeFilter).toBe(TransactionType.Expense);
  });

  it('setSelectedMonth replaces the period with the selected month', () => {
    useTransactionsScreenStore.getState().setSelectedMonth('2026-08');
    expect(useTransactionsScreenStore.getState().period).toEqual({
      type: 'month',
      yearMonth: '2026-08',
    });
  });

  it('setAppliedFilters replaces the applied filters', () => {
    const next: AdvancedFilters = { ...EMPTY_FILTERS_V2, accountIds: ['a1'] };
    useTransactionsScreenStore.getState().setAppliedFilters(next);
    expect(useTransactionsScreenStore.getState().appliedFilters).toEqual(next);
  });

  it('clearSearch empties the query without touching other fields', () => {
    useTransactionsScreenStore.getState().setSearchQuery('rent');
    useTransactionsScreenStore.getState().setActiveFilter(TransactionType.Income);
    useTransactionsScreenStore.getState().clearSearch();
    expect(useTransactionsScreenStore.getState().searchQuery).toBe('');
    expect(useTransactionsScreenStore.getState().activeFilter).toBe(TransactionType.Income);
  });
});

describe('useTransactionsScreenStore reset', () => {
  it('returns every field to its initial value', () => {
    useTransactionsScreenStore.getState().setSearchQuery('x');
    useTransactionsScreenStore.getState().setActiveFilter(TransactionType.Expense);
    useTransactionsScreenStore.getState().setSelectedMonth('2026-08');
    useTransactionsScreenStore
      .getState()
      .setAppliedFilters({ ...EMPTY_FILTERS_V2, accountIds: ['a'] });
    useTransactionsScreenStore.getState().reset();
    const s = useTransactionsScreenStore.getState();
    expect(s.searchQuery).toBe('');
    expect(s.activeFilter).toBe('all');
    expect(s.period.type).toBe('month');
    expect(s.appliedFilters).toEqual(EMPTY_FILTERS_V2);
  });
});
