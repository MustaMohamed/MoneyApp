import { DatePreset, TransactionType } from '@/constants/enums';
import { useTransactionsScreenStore } from '@/app/(app)/(tabs)/transactions/transactions.store';
import { EMPTY_FILTERS } from '@/app/(app)/(tabs)/transactions/filter/filter.store';

describe('transactionsScreenStore', () => {
  beforeEach(() => useTransactionsScreenStore.getState().reset());

  it('starts with empty search and "all" filter', () => {
    const s = useTransactionsScreenStore.getState();
    expect(s.searchQuery).toBe('');
    expect(s.activeFilter).toBe('all');
  });

  it('setSearchQuery updates only the search field', () => {
    useTransactionsScreenStore.getState().setSearchQuery('food');
    const s = useTransactionsScreenStore.getState();
    expect(s.searchQuery).toBe('food');
    expect(s.activeFilter).toBe('all');
  });

  it('setActiveFilter updates only the filter field', () => {
    useTransactionsScreenStore.getState().setActiveFilter(TransactionType.Income);
    const s = useTransactionsScreenStore.getState();
    expect(s.activeFilter).toBe(TransactionType.Income);
    expect(s.searchQuery).toBe('');
  });

  it('clearSearch resets only the search field', () => {
    const s = useTransactionsScreenStore.getState();
    s.setSearchQuery('food');
    s.setActiveFilter(TransactionType.Expense);
    s.clearSearch();
    const next = useTransactionsScreenStore.getState();
    expect(next.searchQuery).toBe('');
    expect(next.activeFilter).toBe(TransactionType.Expense);
  });

  it('reset returns both fields to defaults', () => {
    const s = useTransactionsScreenStore.getState();
    s.setSearchQuery('x');
    s.setActiveFilter(TransactionType.Transfer);
    s.reset();
    const next = useTransactionsScreenStore.getState();
    expect(next.searchQuery).toBe('');
    expect(next.activeFilter).toBe('all');
  });
});

describe('transactionsScreenStore — appliedFilters', () => {
  beforeEach(() => useTransactionsScreenStore.getState().reset());

  it('initial appliedFilters is EMPTY_FILTERS', () => {
    expect(useTransactionsScreenStore.getState().appliedFilters).toEqual(EMPTY_FILTERS);
  });

  it('setAppliedFilters updates the field', () => {
    const next = { ...EMPTY_FILTERS, datePreset: DatePreset.ThisMonth };
    useTransactionsScreenStore.getState().setAppliedFilters(next);
    expect(useTransactionsScreenStore.getState().appliedFilters).toEqual(next);
  });

  it('reset clears appliedFilters back to EMPTY_FILTERS', () => {
    useTransactionsScreenStore
      .getState()
      .setAppliedFilters({ ...EMPTY_FILTERS, accountIds: ['a'] });
    useTransactionsScreenStore.getState().reset();
    expect(useTransactionsScreenStore.getState().appliedFilters).toEqual(EMPTY_FILTERS);
  });
});
