import { useTransactionsState } from '@/modules/transactions/screens/transactions/transactions.state';

beforeEach(() => {
  useTransactionsState.getState().reset();
});

describe('useTransactionsState', () => {
  it('initialises with refreshing = false', () => {
    expect(useTransactionsState.getState().refreshing).toBe(false);
  });

  it('setRefreshing(true) flips refreshing on', () => {
    useTransactionsState.getState().setRefreshing(true);
    expect(useTransactionsState.getState().refreshing).toBe(true);
  });

  it('setRefreshing(false) flips refreshing off', () => {
    useTransactionsState.getState().setRefreshing(true);
    useTransactionsState.getState().setRefreshing(false);
    expect(useTransactionsState.getState().refreshing).toBe(false);
  });

  it('reset() returns refreshing to false', () => {
    useTransactionsState.getState().setRefreshing(true);
    useTransactionsState.getState().reset();
    expect(useTransactionsState.getState().refreshing).toBe(false);
  });
});
