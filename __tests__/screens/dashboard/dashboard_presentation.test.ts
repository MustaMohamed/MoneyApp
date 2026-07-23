import { AccountType, Currency } from '@/constants/enums';
import type {
  DashboardSnapshot,
  DashboardSnapshotStatus,
} from '@/modules/dashboard/repositories/dashboard.repository';
import { selectDashboardPresentation } from '@/modules/dashboard/screens/dashboard/dashboard.presentation';

function snapshot(accountCount: number): DashboardSnapshot {
  return {
    key: '2026-07',
    yearMonth: '2026-07',
    previousYearMonth: '2026-06',
    accounts: Array.from({ length: accountCount }, (_, index) => ({
      id: `account-${index}`,
      name: `Account ${index}`,
      type: AccountType.Bank,
      currency: Currency.EGP,
      opening_balance: 0,
      current_balance: 0,
      color: null,
      credit_limit: null,
      revolving_balance: null,
      minimum_payment: null,
      statement_due_day: null,
      interest_tracking: 0,
      apr: null,
      is_archived: 0,
      balance_review_required: 0,
      sort_order: index,
      created_at: '2026-01-01T00:00:00.000Z',
      updated_at: '2026-01-01T00:00:00.000Z',
    })),
    statsMap: {},
    currentMonth: {
      totals: { incomeEgp: 0, expenseEgp: 0, netEgp: 0 },
      spend: { totalEgp: 0, usdNative: 0, count: 0 },
    },
    previousMonth: {
      totals: { incomeEgp: 0, expenseEgp: 0, netEgp: 0 },
      spend: { totalEgp: 0, usdNative: 0, count: 0 },
    },
    budgetSummary: {
      budgeted: 0,
      spent: 0,
      left: 0,
      pct: 0,
      categoryCount: 0,
    },
    commitmentPayments: [],
    loadedAt: new Date('2026-07-23T10:00:00.000Z').getTime(),
  };
}

const populatedSnapshot = snapshot(1);
const zeroAccountSnapshot = snapshot(0);

describe('selectDashboardPresentation', () => {
  it.each([
    ['idle', undefined, true, false, false, false],
    ['initialLoading', undefined, true, false, false, false],
    ['initialError', undefined, false, true, false, false],
    ['ready', populatedSnapshot, false, false, false, false],
    ['refreshing', populatedSnapshot, false, false, false, true],
    ['refreshErrorWithData', populatedSnapshot, false, false, true, false],
  ] as const)(
    '%s selects the expected presentation',
    (status, currentSnapshot, cardLoading, showInitialError, showRefreshError, isRefreshing) => {
      expect(
        selectDashboardPresentation({
          status: status as DashboardSnapshotStatus,
          snapshot: currentSnapshot,
          requestedKey: currentSnapshot?.key ?? '2026-07',
        }),
      ).toMatchObject({
        cardLoading,
        showInitialError,
        showRefreshError,
        isRefreshing,
      });
    },
  );

  it('shows the accounts empty state only for a successful matching snapshot', () => {
    expect(
      selectDashboardPresentation({
        status: 'ready',
        snapshot: zeroAccountSnapshot,
        requestedKey: zeroAccountSnapshot.key,
      }),
    ).toMatchObject({ showAccountsEmptyState: true });
    expect(
      selectDashboardPresentation({
        status: 'initialError',
        snapshot: undefined,
        requestedKey: '2026-07',
      }),
    ).toMatchObject({ showAccountsEmptyState: false });
  });

  it('keeps warm content mounted without card loading during refresh', () => {
    expect(
      selectDashboardPresentation({
        status: 'refreshing',
        snapshot: populatedSnapshot,
        requestedKey: populatedSnapshot.key,
      }),
    ).toMatchObject({
      showDashboardBody: true,
      cardLoading: false,
      isRefreshing: true,
    });
  });

  it('does not present an old-month snapshot under a new requested key', () => {
    expect(
      selectDashboardPresentation({
        status: 'initialLoading',
        snapshot: populatedSnapshot,
        requestedKey: '2026-08',
      }),
    ).toMatchObject({
      hasSnapshot: false,
      cardLoading: true,
      showAccountsEmptyState: false,
    });
  });
});
