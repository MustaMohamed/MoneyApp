import { DatePreset, TransactionType } from '@/constants/enums';
import { useTransactionsScreenStore } from '@/screens/transactions/transactions.store';
import { EMPTY_FILTERS } from '@/screens/transactions/filter/filter.store';

describe('transactionsScreenStore', () => {
  beforeEach(() => useTransactionsScreenStore.getState().reset());

  it('starts with empty search and "all" filter', () => {
    const s = useTransactionsScreenStore.getState();
    expect(s.state.searchQuery).toBe('');
    expect(s.state.activeFilter).toBe('all');
  });

  it('setSearchQuery updates only the search field', () => {
    useTransactionsScreenStore.getState().setSearchQuery('food');
    const s = useTransactionsScreenStore.getState();
    expect(s.state.searchQuery).toBe('food');
    expect(s.state.activeFilter).toBe('all');
  });

  it('setActiveFilter updates only the filter field', () => {
    useTransactionsScreenStore.getState().setActiveFilter(TransactionType.Income);
    const s = useTransactionsScreenStore.getState();
    expect(s.state.activeFilter).toBe(TransactionType.Income);
    expect(s.state.searchQuery).toBe('');
  });

  it('clearSearch resets only the search field', () => {
    const s = useTransactionsScreenStore.getState();
    s.setSearchQuery('food');
    s.setActiveFilter(TransactionType.Expense);
    s.clearSearch();
    const next = useTransactionsScreenStore.getState();
    expect(next.state.searchQuery).toBe('');
    expect(next.state.activeFilter).toBe(TransactionType.Expense);
  });

  it('reset returns both fields to defaults', () => {
    const s = useTransactionsScreenStore.getState();
    s.setSearchQuery('x');
    s.setActiveFilter(TransactionType.Transfer);
    s.reset();
    const next = useTransactionsScreenStore.getState();
    expect(next.state.searchQuery).toBe('');
    expect(next.state.activeFilter).toBe('all');
  });
});

describe('transactionsScreenStore — appliedFilters', () => {
  beforeEach(() => useTransactionsScreenStore.getState().reset());

  it('initial appliedFilters is EMPTY_FILTERS', () => {
    expect(useTransactionsScreenStore.getState().state.appliedFilters).toEqual(EMPTY_FILTERS);
  });

  it('setAppliedFilters updates the field', () => {
    const next = { ...EMPTY_FILTERS, datePreset: DatePreset.ThisMonth };
    useTransactionsScreenStore.getState().setAppliedFilters(next);
    expect(useTransactionsScreenStore.getState().state.appliedFilters).toEqual(next);
  });

  it('reset clears appliedFilters back to EMPTY_FILTERS', () => {
    useTransactionsScreenStore
      .getState()
      .setAppliedFilters({ ...EMPTY_FILTERS, accountIds: ['a'] });
    useTransactionsScreenStore.getState().reset();
    expect(useTransactionsScreenStore.getState().state.appliedFilters).toEqual(EMPTY_FILTERS);
  });
});
