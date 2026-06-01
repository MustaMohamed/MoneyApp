import { CommitmentPaymentStatus, Currency } from '@/constants/enums';
import type { AccountStats } from '@/database/account_stats';
import type { CommitmentPayment } from '@/database/entities/commitment_payment.entity';
import { useDashboardStore } from '@/modules/dashboard/screens/dashboard/dashboard.store';

beforeEach(() => useDashboardStore().reset());

describe('useDashboardStore', () => {
  it('starts with empty statsMap', () => {
    expect(useDashboardStore().state.statsMap.value).toEqual({});
  });

  it('setStatsMap replaces the map', () => {
    const fakeStats: AccountStats = {
      month_in: 100,
      month_out: 50,
      week_in: 25,
      week_out: 10,
    };
    const next: Record<string, AccountStats> = { 'acc-1': fakeStats };
    useDashboardStore().setStatsMap(next);
    expect(useDashboardStore().state.statsMap.value).toEqual(next);
  });

  it('reset returns to empty map', () => {
    const fakeStats: AccountStats = {
      month_in: 0,
      month_out: 0,
      week_in: 0,
      week_out: 0,
    };
    useDashboardStore().setStatsMap({ 'acc-1': fakeStats });
    useDashboardStore().reset();
    expect(useDashboardStore().state.statsMap.value).toEqual({});
  });

  it('setCurrentMonthCommitmentPayments updates the list', () => {
    const payments: CommitmentPayment[] = [
      {
        id: 'p1',
        commitment_id: 'c1',
        due_date: '2026-06-01',
        paid_date: null,
        skipped_date: null,
        amount_due: 100,
        amount_paid: null,
        currency: Currency.EGP,
        exchange_rate_snapshot: null,
        account_id: null,
        transaction_id: null,
        status: CommitmentPaymentStatus.Due,
        notes: null,
        created_at: '2026-06-01T00:00:00.000Z',
        updated_at: '2026-06-01T00:00:00.000Z',
      },
    ];
    useDashboardStore().setCurrentMonthCommitmentPayments(payments);
    expect(useDashboardStore().state.currentMonthCommitmentPayments.value).toEqual(payments);
  });

  it('setMonthSpendStats updates current and previous spend', () => {
    const current = { totalEgp: 1000, usdNative: 20, count: 5 };
    const previous = { totalEgp: 800, usdNative: 16, count: 4 };
    useDashboardStore().setMonthSpendStats(current, previous);
    expect(useDashboardStore().state.currentMonthSpend.value).toEqual(current);
    expect(useDashboardStore().state.previousMonthSpend.value).toEqual(previous);
  });
});
