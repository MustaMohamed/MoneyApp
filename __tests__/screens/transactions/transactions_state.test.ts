import { useTransactionsState } from '@/modules/transactions/screens/transactions/transactions.state';

beforeEach(() => {
  useTransactionsState().reset();
});

describe('useTransactionsState', () => {
  it('initialises with refreshing = false', () => {
    expect(useTransactionsState().state.refreshing.value).toBe(false);
  });

  it('setRefreshing(true) flips refreshing on', () => {
    useTransactionsState().setRefreshing(true);
    expect(useTransactionsState().state.refreshing.value).toBe(true);
  });

  it('setRefreshing(false) flips refreshing off', () => {
    useTransactionsState().setRefreshing(true);
    useTransactionsState().setRefreshing(false);
    expect(useTransactionsState().state.refreshing.value).toBe(false);
  });

  it('reset() returns refreshing to false', () => {
    useTransactionsState().setRefreshing(true);
    useTransactionsState().reset();
    expect(useTransactionsState().state.refreshing.value).toBe(false);
  });
});
