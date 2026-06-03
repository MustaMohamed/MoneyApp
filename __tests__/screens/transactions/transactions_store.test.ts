import { act, renderHook } from '@testing-library/react-native';

import { TransactionType } from '@/constants/enums';
import {
  EMPTY_FILTERS_V2,
  type AdvancedFilters,
} from '@/modules/transactions/screens/transactions/filter/filter.store';
import { useTransactionsScreenStore } from '@/modules/transactions/screens/transactions/transactions.store';

function setup() {
  const hook = renderHook(() => useTransactionsScreenStore());
  act(() => hook.result.current.reset());
  return hook;
}

describe('useTransactionsScreenStore initial state', () => {
  it('starts with empty search, "all" filter, a month period, and empty applied filters', () => {
    const { result } = setup();
    const { state } = result.current;

    expect(state.searchQuery.value).toBe('');
    expect(state.activeFilter.value).toBe('all');
    expect(state.period.value.type).toBe('month');
    expect(state.appliedFilters.value).toEqual(EMPTY_FILTERS_V2);
  });

  it('seeds the period with the current year-month string', () => {
    const { result } = setup();
    const period = result.current.state.period.value;

    if (period.type !== 'month') throw new Error('expected month period');
    expect(period.yearMonth).toMatch(/^\d{4}-\d{2}$/);
  });
});

describe('useTransactionsScreenStore setters', () => {
  it('setSearchQuery updates the query', () => {
    const { result } = setup();

    act(() => result.current.setSearchQuery('coffee'));

    expect(result.current.state.searchQuery.value).toBe('coffee');
  });

  it('setActiveFilter updates the active filter', () => {
    const { result } = setup();

    act(() => result.current.setActiveFilter(TransactionType.Expense));

    expect(result.current.state.activeFilter.value).toBe(TransactionType.Expense);
  });

  it('setPeriod replaces the period selection', () => {
    const { result } = setup();

    act(() => result.current.setPeriod({ type: 'all' }));

    expect(result.current.state.period.value).toEqual({ type: 'all' });
  });

  it('setAppliedFilters replaces the applied filters', () => {
    const { result } = setup();
    const next: AdvancedFilters = { ...EMPTY_FILTERS_V2, accountIds: ['a1'] };

    act(() => result.current.setAppliedFilters(next));

    expect(result.current.state.appliedFilters.value).toEqual(next);
  });

  it('clearSearch empties the query without touching other fields', () => {
    const { result } = setup();

    act(() => result.current.setSearchQuery('rent'));
    act(() => result.current.setActiveFilter(TransactionType.Income));
    act(() => result.current.clearSearch());

    expect(result.current.state.searchQuery.value).toBe('');
    expect(result.current.state.activeFilter.value).toBe(TransactionType.Income);
  });
});

describe('useTransactionsScreenStore reset', () => {
  it('returns every field to its initial value', () => {
    const { result } = setup();

    act(() => result.current.setSearchQuery('x'));
    act(() => result.current.setActiveFilter(TransactionType.Expense));
    act(() => result.current.setPeriod({ type: 'all' }));
    act(() => result.current.setAppliedFilters({ ...EMPTY_FILTERS_V2, accountIds: ['a'] }));
    act(() => result.current.reset());

    const { state } = result.current;
    expect(state.searchQuery.value).toBe('');
    expect(state.activeFilter.value).toBe('all');
    expect(state.period.value.type).toBe('month');
    expect(state.appliedFilters.value).toEqual(EMPTY_FILTERS_V2);
  });
});
