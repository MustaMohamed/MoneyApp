import { TransactionType } from '@/constants/enums';
import { useTransactionsScreenStore } from '@/app/(app)/(tabs)/transactions/transactions.store';

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
