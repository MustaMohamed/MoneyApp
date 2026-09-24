import { TransactionType } from '@/constants/enums';
import {
  countActiveFilters,
  formatAppliedFilterSummary,
} from '@/modules/transactions/screens/transactions/filter/filter.helpers';
import {
  EMPTY_FILTERS,
  type AdvancedFilters,
} from '@/modules/transactions/screens/transactions/filter/filter.store';
import {
  type TransactionTotalsState,
  useTransactionsScreenStore,
} from '@/modules/transactions/screens/transactions/transactions.store';

beforeEach(() => {
  useTransactionsScreenStore.getState().reset();
});

describe('useTransactionsScreenStore initial state', () => {
  it('starts with empty search, "all" filter, a month period, and empty applied filters', () => {
    const s = useTransactionsScreenStore.getState();
    expect(s.searchQuery).toBe('');
    expect(s.activeFilter).toBe('all');
    expect(s.period.type).toBe('month');
    expect(s.appliedFilters).toEqual(EMPTY_FILTERS);
    expect(s.totals).toBeNull();
    expect(s.totalsYearMonth).toBeNull();
    expect(s.totalsQueryKey).toBeNull();
  });

  it('seeds the period with the current year-month string', () => {
    const s = useTransactionsScreenStore.getState();
    expect(s.period.yearMonth).toMatch(/^\d{4}-\d{2}$/);
  });
});

describe('useTransactionsScreenStore totals ownership', () => {
  const JULY_KEY = 'july';
  const JULY_SEARCH_KEY = 'july:coffee';
  const AUGUST_KEY = 'august';
  const older: Omit<TransactionTotalsState, 'queryKey'> = {
    current: { incomeEgp: 100, expenseEgp: 80, netEgp: 20 },
    previous: null,
    days: [],
    matchCount: 0,
    matchNetEgp: 0,
  };
  const newer: Omit<TransactionTotalsState, 'queryKey'> = {
    current: { incomeEgp: 300, expenseEgp: 100, netEgp: 200 },
    previous: null,
    days: [],
    matchCount: 0,
    matchNetEgp: 0,
  };

  it('accepts only the latest request for a month', () => {
    const store = useTransactionsScreenStore.getState();
    const first = store.beginTotalsRequest(JULY_KEY, '2026-07', false);
    const second = useTransactionsScreenStore
      .getState()
      .beginTotalsRequest(JULY_KEY, '2026-07', false);

    expect(useTransactionsScreenStore.getState().resolveTotals(JULY_KEY, first, older)).toBe(false);
    expect(useTransactionsScreenStore.getState().resolveTotals(JULY_KEY, second, newer)).toBe(true);
    expect(useTransactionsScreenStore.getState().totals).toEqual({ ...newer, queryKey: JULY_KEY });
  });

  it('rejects completion owned by another month', () => {
    const july = useTransactionsScreenStore
      .getState()
      .beginTotalsRequest(JULY_KEY, '2026-07', false);
    useTransactionsScreenStore.getState().beginTotalsRequest(AUGUST_KEY, '2026-08', false);

    expect(useTransactionsScreenStore.getState().resolveTotals(JULY_KEY, july, older)).toBe(false);
    expect(useTransactionsScreenStore.getState()).toMatchObject({
      totals: null,
      totalsYearMonth: '2026-08',
      totalsQueryKey: AUGUST_KEY,
    });
  });

  it('rejects completion owned by another query key', () => {
    useTransactionsScreenStore.getState().beginTotalsRequest(JULY_KEY, '2026-07', false);
    const search = useTransactionsScreenStore
      .getState()
      .beginTotalsRequest(JULY_SEARCH_KEY, '2026-07', true);

    expect(useTransactionsScreenStore.getState().resolveTotals(JULY_KEY, search, older)).toBe(
      false,
    );
    expect(useTransactionsScreenStore.getState()).toMatchObject({
      totals: null,
      totalsYearMonth: '2026-07',
      totalsQueryKey: JULY_SEARCH_KEY,
    });
    expect(
      useTransactionsScreenStore.getState().resolveTotals(JULY_SEARCH_KEY, search, newer),
    ).toBe(true);
    expect(useTransactionsScreenStore.getState().totals).toEqual({
      ...newer,
      queryKey: JULY_SEARCH_KEY,
    });
  });

  it('preserves only same-month totals when requested, across a key change', () => {
    const first = useTransactionsScreenStore
      .getState()
      .beginTotalsRequest(JULY_KEY, '2026-07', false);
    useTransactionsScreenStore.getState().resolveTotals(JULY_KEY, first, older);

    useTransactionsScreenStore.getState().beginTotalsRequest(JULY_SEARCH_KEY, '2026-07', true);
    expect(useTransactionsScreenStore.getState().totals).toEqual({ ...older, queryKey: JULY_KEY });
    expect(useTransactionsScreenStore.getState().totalsQueryKey).toBe(JULY_SEARCH_KEY);
    expect(useTransactionsScreenStore.getState().hasTotalsForMonth('2026-07')).toBe(true);

    useTransactionsScreenStore.getState().beginTotalsRequest(AUGUST_KEY, '2026-08', true);
    expect(useTransactionsScreenStore.getState().totals).toBeNull();
    expect(useTransactionsScreenStore.getState().hasTotalsForMonth('2026-07')).toBe(false);
  });

  it('stamps the resolved data with the key it was computed for, which a same-month begin keeps', () => {
    const first = useTransactionsScreenStore
      .getState()
      .beginTotalsRequest(JULY_KEY, '2026-07', false);
    useTransactionsScreenStore.getState().resolveTotals(JULY_KEY, first, older);
    expect(useTransactionsScreenStore.getState().totals?.queryKey).toBe(JULY_KEY);

    useTransactionsScreenStore.getState().beginTotalsRequest(JULY_SEARCH_KEY, '2026-07', true);
    expect(useTransactionsScreenStore.getState()).toMatchObject({
      totalsQueryKey: JULY_SEARCH_KEY,
      totals: { queryKey: JULY_KEY },
    });
  });

  it('reports whether a failed request still owns the current key', () => {
    const first = useTransactionsScreenStore
      .getState()
      .beginTotalsRequest(JULY_KEY, '2026-07', false);
    const second = useTransactionsScreenStore
      .getState()
      .beginTotalsRequest(JULY_SEARCH_KEY, '2026-07', false);

    expect(useTransactionsScreenStore.getState().failTotals(JULY_KEY, first)).toBe(false);
    expect(useTransactionsScreenStore.getState().failTotals(JULY_KEY, second)).toBe(false);
    expect(useTransactionsScreenStore.getState().failTotals(JULY_SEARCH_KEY, second)).toBe(true);
    expect(useTransactionsScreenStore.getState().totalsQueryKey).toBe(JULY_SEARCH_KEY);
  });

  it("keeps the scoped totals' identity when a new key resolves equal figures", () => {
    const scopedCurrent = { incomeEgp: 22300, expenseEgp: 10750, netEgp: 11550 };
    const scopedPrevious = { incomeEgp: 0, expenseEgp: 16900, netEgp: -16900 };
    const first = useTransactionsScreenStore
      .getState()
      .beginTotalsRequest(JULY_KEY, '2026-07', false);
    useTransactionsScreenStore.getState().resolveTotals(JULY_KEY, first, {
      current: { ...scopedCurrent },
      previous: { ...scopedPrevious },
      days: [],
      matchCount: 0,
      matchNetEgp: 0,
    });
    const heldCurrent = useTransactionsScreenStore.getState().totals?.current;
    const heldPrevious = useTransactionsScreenStore.getState().totals?.previous;

    const search = useTransactionsScreenStore
      .getState()
      .beginTotalsRequest(JULY_SEARCH_KEY, '2026-07', true);
    const days = [{ date: '2026-07-03', netEgp: -2100, count: 2 }];
    expect(
      useTransactionsScreenStore.getState().resolveTotals(JULY_SEARCH_KEY, search, {
        current: { ...scopedCurrent },
        previous: { ...scopedPrevious },
        days,
        matchCount: 2,
        matchNetEgp: -2100,
      }),
    ).toBe(true);

    const afterEqual = useTransactionsScreenStore.getState().totals;
    expect(afterEqual?.current).toBe(heldCurrent);
    expect(afterEqual?.previous).toBe(heldPrevious);
    expect(afterEqual).toMatchObject({ days, matchCount: 2, matchNetEgp: -2100 });

    const typed = useTransactionsScreenStore
      .getState()
      .beginTotalsRequest(`${JULY_SEARCH_KEY}:expense`, '2026-07', true);
    const changedCurrent = { incomeEgp: 22300, expenseEgp: 10000, netEgp: 12300 };
    useTransactionsScreenStore.getState().resolveTotals(`${JULY_SEARCH_KEY}:expense`, typed, {
      current: changedCurrent,
      previous: { ...scopedPrevious },
      days,
      matchCount: 2,
      matchNetEgp: -2100,
    });

    const afterUnequal = useTransactionsScreenStore.getState().totals;
    expect(afterUnequal?.current).not.toBe(heldCurrent);
    expect(afterUnequal?.current).toEqual(changedCurrent);
    expect(afterUnequal?.previous).toBe(heldPrevious);
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
    const next: AdvancedFilters = { ...EMPTY_FILTERS, accountIds: ['a1'] };
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

describe('useTransactionsScreenStore seedAccountFilter', () => {
  const accountsById = new Map([['acc1', { id: 'acc1', name: 'CIB' }]]);
  const categoriesById = new Map<string, { id: string; name: string }>();

  it('publishes the account filter, the month, and a cleared search and chip together', () => {
    useTransactionsScreenStore.getState().seedAccountFilter('acc1', '2026-09');

    const s = useTransactionsScreenStore.getState();
    expect(s.searchQuery).toBe('');
    expect(s.activeFilter).toBe('all');
    expect(s.period).toEqual({ type: 'month', yearMonth: '2026-09' });
    expect(s.appliedFilters).toEqual({ ...EMPTY_FILTERS, accountIds: ['acc1'] });
  });

  it('reads as exactly one active filter, labelled with the account name', () => {
    useTransactionsScreenStore.getState().seedAccountFilter('acc1', '2026-09');

    const { appliedFilters } = useTransactionsScreenStore.getState();
    expect(countActiveFilters(appliedFilters)).toBe(1);
    expect(formatAppliedFilterSummary(appliedFilters, accountsById, categoriesById)).toBe('CIB');
  });

  it('clears a typed search and a type chip that were already applied', () => {
    useTransactionsScreenStore.getState().setSearchQuery('coffee');
    useTransactionsScreenStore.getState().setActiveFilter(TransactionType.Expense);
    useTransactionsScreenStore
      .getState()
      .setAppliedFilters({ ...EMPTY_FILTERS, categoryIds: ['cat1'] });

    useTransactionsScreenStore.getState().seedAccountFilter('acc1', '2026-09');

    const s = useTransactionsScreenStore.getState();
    expect(s.searchQuery).toBe('');
    expect(s.activeFilter).toBe('all');
    expect(s.appliedFilters.categoryIds).toEqual([]);
  });

  it('leaves the totals slot to its own owner', () => {
    const requestId = useTransactionsScreenStore
      .getState()
      .beginTotalsRequest('august', '2026-08', false);
    useTransactionsScreenStore.getState().resolveTotals('august', requestId, {
      current: { incomeEgp: 100, expenseEgp: 80, netEgp: 20 },
      previous: null,
      days: [],
      matchCount: 0,
      matchNetEgp: 0,
    });

    useTransactionsScreenStore.getState().seedAccountFilter('acc1', '2026-09');

    const s = useTransactionsScreenStore.getState();
    expect(s.totalsYearMonth).toBe('2026-08');
    expect(s.totalsQueryKey).toBe('august');
    expect(s.totals?.current.netEgp).toBe(20);
  });
});

describe('useTransactionsScreenStore reset', () => {
  it('returns every field to its initial value', () => {
    useTransactionsScreenStore.getState().setSearchQuery('x');
    useTransactionsScreenStore.getState().setActiveFilter(TransactionType.Expense);
    useTransactionsScreenStore.getState().setSelectedMonth('2026-08');
    useTransactionsScreenStore
      .getState()
      .setAppliedFilters({ ...EMPTY_FILTERS, accountIds: ['a'] });
    useTransactionsScreenStore.getState().beginTotalsRequest('august', '2026-08', false);
    useTransactionsScreenStore.getState().reset();
    const s = useTransactionsScreenStore.getState();
    expect(s.searchQuery).toBe('');
    expect(s.activeFilter).toBe('all');
    expect(s.period.type).toBe('month');
    expect(s.appliedFilters).toEqual(EMPTY_FILTERS);
    expect(s.totalsYearMonth).toBeNull();
    expect(s.totalsQueryKey).toBeNull();
  });
});
