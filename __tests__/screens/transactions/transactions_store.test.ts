import { TransactionType } from '@/constants/enums';
import type { PeriodTotals } from '@/modules/transactions/database/transactions';
import {
  EMPTY_FILTERS,
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
    expect(s.appliedFilters).toEqual(EMPTY_FILTERS);
    expect(s.totals).toBeNull();
    expect(s.totalsYearMonth).toBeNull();
  });

  it('seeds the period with the current year-month string', () => {
    const s = useTransactionsScreenStore.getState();
    expect(s.period.yearMonth).toMatch(/^\d{4}-\d{2}$/);
  });
});

describe('useTransactionsScreenStore totals ownership', () => {
  const older = {
    current: { incomeEgp: 100, expenseEgp: 80, netEgp: 20 } satisfies PeriodTotals,
    previous: null,
  };
  const newer = {
    current: { incomeEgp: 300, expenseEgp: 100, netEgp: 200 } satisfies PeriodTotals,
    previous: null,
  };

  it('accepts only the latest request for a month', () => {
    const store = useTransactionsScreenStore.getState();
    const first = store.beginTotalsRequest('2026-07', false);
    const second = useTransactionsScreenStore.getState().beginTotalsRequest('2026-07', false);

    expect(useTransactionsScreenStore.getState().resolveTotals('2026-07', first, older)).toBe(
      false,
    );
    expect(useTransactionsScreenStore.getState().resolveTotals('2026-07', second, newer)).toBe(
      true,
    );
    expect(useTransactionsScreenStore.getState().totals).toEqual(newer);
  });

  it('rejects completion owned by another month', () => {
    const july = useTransactionsScreenStore.getState().beginTotalsRequest('2026-07', false);
    useTransactionsScreenStore.getState().beginTotalsRequest('2026-08', false);

    expect(useTransactionsScreenStore.getState().resolveTotals('2026-07', july, older)).toBe(false);
    expect(useTransactionsScreenStore.getState()).toMatchObject({
      totals: null,
      totalsYearMonth: '2026-08',
    });
  });

  it('preserves only same-month totals when requested', () => {
    const first = useTransactionsScreenStore.getState().beginTotalsRequest('2026-07', false);
    useTransactionsScreenStore.getState().resolveTotals('2026-07', first, older);

    useTransactionsScreenStore.getState().beginTotalsRequest('2026-07', true);
    expect(useTransactionsScreenStore.getState().totals).toEqual(older);
    expect(useTransactionsScreenStore.getState().hasTotalsForMonth('2026-07')).toBe(true);

    useTransactionsScreenStore.getState().beginTotalsRequest('2026-08', true);
    expect(useTransactionsScreenStore.getState().totals).toBeNull();
    expect(useTransactionsScreenStore.getState().hasTotalsForMonth('2026-07')).toBe(false);
  });

  it('reports whether a failed request still owns the current month', () => {
    const first = useTransactionsScreenStore.getState().beginTotalsRequest('2026-07', false);
    const second = useTransactionsScreenStore.getState().beginTotalsRequest('2026-07', false);

    expect(useTransactionsScreenStore.getState().failTotals('2026-07', first)).toBe(false);
    expect(useTransactionsScreenStore.getState().failTotals('2026-07', second)).toBe(true);
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

describe('useTransactionsScreenStore reset', () => {
  it('returns every field to its initial value', () => {
    useTransactionsScreenStore.getState().setSearchQuery('x');
    useTransactionsScreenStore.getState().setActiveFilter(TransactionType.Expense);
    useTransactionsScreenStore.getState().setSelectedMonth('2026-08');
    useTransactionsScreenStore
      .getState()
      .setAppliedFilters({ ...EMPTY_FILTERS, accountIds: ['a'] });
    useTransactionsScreenStore.getState().reset();
    const s = useTransactionsScreenStore.getState();
    expect(s.searchQuery).toBe('');
    expect(s.activeFilter).toBe('all');
    expect(s.period.type).toBe('month');
    expect(s.appliedFilters).toEqual(EMPTY_FILTERS);
  });
});
