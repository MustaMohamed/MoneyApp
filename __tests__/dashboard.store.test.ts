import { useDashboardStore } from '@/screens/dashboard/dashboard.store';
import type { AccountStats } from '@/database/account_stats';

beforeEach(() => useDashboardStore.getState().reset());

describe('useDashboardStore', () => {
  it('starts with empty statsMap', () => {
    expect(useDashboardStore.getState().state.statsMap).toEqual({});
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
    expect(useDashboardStore.getState().state.statsMap).toEqual(next);
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
    expect(useDashboardStore.getState().state.statsMap).toEqual({});
  });
});
