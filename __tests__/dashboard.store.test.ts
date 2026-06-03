import type { AccountStats } from '@/database/account_stats';
import { DashboardStore } from '@/modules/dashboard/screens/dashboard/dashboard.store';

describe('DashboardStore', () => {
  it('starts with empty statsMap', () => {
    const store = new DashboardStore();

    expect(store.statsMap).toEqual({});
  });

  it('setStatsMap replaces the map', () => {
    const store = new DashboardStore();
    const fakeStats: AccountStats = {
      month_in: 100,
      month_out: 50,
      week_in: 25,
      week_out: 10,
    };
    const next: Record<string, AccountStats> = { 'acc-1': fakeStats };

    store.setStatsMap(next);

    expect(store.statsMap).toEqual(next);
  });

  it('reset returns all fields to their initial values', () => {
    const store = new DashboardStore();
    const fakeStats: AccountStats = {
      month_in: 0,
      month_out: 0,
      week_in: 0,
      week_out: 0,
    };
    const payments = [{ id: 'p1' } as any];

    store.setStatsMap({ 'acc-1': fakeStats });
    store.setCurrentMonthCommitmentPayments(payments);
    store.setMonthSpendStats(
      { totalEgp: 1000, usdNative: 20, count: 5 },
      { totalEgp: 800, usdNative: 16, count: 4 },
    );
    store.reset();

    expect(store.statsMap).toEqual({});
    expect(store.currentMonthCommitmentPayments).toEqual([]);
    expect(store.currentMonthSpend).toEqual({ totalEgp: 0, usdNative: 0, count: 0 });
    expect(store.previousMonthSpend).toEqual({ totalEgp: 0, usdNative: 0, count: 0 });
  });

  it('setCurrentMonthCommitmentPayments updates the list', () => {
    const store = new DashboardStore();
    const payments = [{ id: 'p1' } as any];

    store.setCurrentMonthCommitmentPayments(payments);

    expect(store.currentMonthCommitmentPayments).toEqual(payments);
  });

  it('setMonthSpendStats updates current and previous spend', () => {
    const store = new DashboardStore();
    const current = { totalEgp: 1000, usdNative: 20, count: 5 };
    const previous = { totalEgp: 800, usdNative: 16, count: 4 };

    store.setMonthSpendStats(current, previous);

    expect(store.currentMonthSpend).toEqual(current);
    expect(store.previousMonthSpend).toEqual(previous);
  });
});
