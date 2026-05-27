import type { AccountStats } from '@/database/account_stats';
import { useDashboardStore } from '@/modules/dashboard/screens/dashboard/dashboard.store';

beforeEach(() => useDashboardStore.getState().reset());

describe('useDashboardStore', () => {
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

  it('setMonthSpendStats updates current and previous spend', () => {
    const current = { totalEgp: 1000, usdNative: 20, count: 5 };
    const previous = { totalEgp: 800, usdNative: 16, count: 4 };
    useDashboardStore.getState().setMonthSpendStats(current, previous);
    expect(useDashboardStore.getState().currentMonthSpend).toEqual(current);
    expect(useDashboardStore.getState().previousMonthSpend).toEqual(previous);
  });
});
