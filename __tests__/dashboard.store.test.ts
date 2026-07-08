import type { AccountStats } from '@/database/account_stats';
import { useDashboardStore } from '@/modules/dashboard/screens/dashboard/dashboard.store';
import type { PeriodTotals } from '@/modules/transactions/database/transactions';

beforeEach(() => useDashboardStore.getState().reset());

describe('useDashboardStore', () => {
  it('starts async numeric dashboard sections as not loaded', () => {
    const state = useDashboardStore.getState();

    expect(state.monthSpendLoaded).toBe(false);
    expect(state.transactionTotalsLoaded).toBe(false);
    expect(state.commitmentPaymentsLoaded).toBe(false);
  });

  it('starts with empty statsMap', () => {
    expect(useDashboardStore.getState().statsMap).toEqual({});
  });

  it('setStatsMap replaces the map', () => {
    const fakeStats: AccountStats = {
      month_in: 100,
      month_out: 50,
      week_in: 25,
      week_out: 10,
    };
    const next: Record<string, AccountStats> = { 'acc-1': fakeStats };
    useDashboardStore.getState().setStatsMap(next);
    expect(useDashboardStore.getState().statsMap).toEqual(next);
  });

  it('reset returns to empty map', () => {
    const fakeStats: AccountStats = {
      month_in: 0,
      month_out: 0,
      week_in: 0,
      week_out: 0,
    };
    useDashboardStore.getState().setStatsMap({ 'acc-1': fakeStats });
    useDashboardStore.getState().reset();
    expect(useDashboardStore.getState().statsMap).toEqual({});
  });

  it('setCurrentMonthCommitmentPayments updates the list', () => {
    const payments = [{ id: 'p1' } as any];
    useDashboardStore.getState().setCurrentMonthCommitmentPayments(payments);
    expect(useDashboardStore.getState().currentMonthCommitmentPayments).toEqual(payments);
  });

  it('marks commitment payments loaded when current month payments update', () => {
    useDashboardStore.getState().setCurrentMonthCommitmentPayments([]);

    expect(useDashboardStore.getState().commitmentPaymentsLoaded).toBe(true);
  });

  it('setMonthSpendStats updates current and previous spend', () => {
    const current = { totalEgp: 1000, usdNative: 20, count: 5 };
    const previous = { totalEgp: 800, usdNative: 16, count: 4 };
    useDashboardStore.getState().setMonthSpendStats(current, previous);
    expect(useDashboardStore.getState().currentMonthSpend).toEqual(current);
    expect(useDashboardStore.getState().previousMonthSpend).toEqual(previous);
  });

  it('marks month spend loaded when current and previous spend update', () => {
    const current = { totalEgp: 0, usdNative: 0, count: 0 };
    const previous = { totalEgp: 0, usdNative: 0, count: 0 };

    useDashboardStore.getState().setMonthSpendStats(current, previous);

    expect(useDashboardStore.getState().monthSpendLoaded).toBe(true);
  });

  it('setTransactionTotals updates current and previous transaction totals', () => {
    const current: PeriodTotals = { incomeEgp: 25000, expenseEgp: 13000, netEgp: 12000 };
    const previous: PeriodTotals = { incomeEgp: 22800, expenseEgp: 11300, netEgp: 11500 };

    useDashboardStore.getState().setTransactionTotals(current, previous);

    expect(useDashboardStore.getState().currentTransactionTotals).toEqual(current);
    expect(useDashboardStore.getState().previousTransactionTotals).toEqual(previous);
  });

  it('marks transaction totals loaded when current and previous totals update', () => {
    const current: PeriodTotals = { incomeEgp: 0, expenseEgp: 0, netEgp: 0 };
    const previous: PeriodTotals = { incomeEgp: 0, expenseEgp: 0, netEgp: 0 };

    useDashboardStore.getState().setTransactionTotals(current, previous);

    expect(useDashboardStore.getState().transactionTotalsLoaded).toBe(true);
  });

  it('reset clears async numeric loaded flags', () => {
    useDashboardStore.getState().setCurrentMonthCommitmentPayments([]);
    useDashboardStore
      .getState()
      .setMonthSpendStats(
        { totalEgp: 1, usdNative: 0, count: 1 },
        { totalEgp: 0, usdNative: 0, count: 0 },
      );
    useDashboardStore
      .getState()
      .setTransactionTotals(
        { incomeEgp: 1, expenseEgp: 0, netEgp: 1 },
        { incomeEgp: 0, expenseEgp: 0, netEgp: 0 },
      );

    useDashboardStore.getState().reset();

    const state = useDashboardStore.getState();
    expect(state.commitmentPaymentsLoaded).toBe(false);
    expect(state.monthSpendLoaded).toBe(false);
    expect(state.transactionTotalsLoaded).toBe(false);
  });
});
