import type { PeriodTotals } from '@/modules/transactions/database/transactions';
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

  it('initialises with totals unset', () => {
    expect(useTransactionsState.getState().totals).toBeNull();
  });

  it('setTotals stores current and previous totals', () => {
    const current: PeriodTotals = { incomeEgp: 100, expenseEgp: 40, netEgp: 60 };
    const previous: PeriodTotals = { incomeEgp: 80, expenseEgp: 30, netEgp: 50 };

    useTransactionsState.getState().setTotals({ current, previous });

    expect(useTransactionsState.getState().totals).toEqual({ current, previous });
  });

  it('reset() clears totals', () => {
    useTransactionsState.getState().setTotals({
      current: { incomeEgp: 100, expenseEgp: 40, netEgp: 60 },
      previous: null,
    });

    useTransactionsState.getState().reset();

    expect(useTransactionsState.getState().totals).toBeNull();
  });
});
