import { AccountType, CommitmentPaymentStatus, Currency } from '@/constants/enums';
import type { CommitmentPayment } from '@/modules/commitments/entities/commitment_payment.entity';
import {
  buildDashboardBudgetSummary,
  computeDashboardAccountCounts,
  computeDashboardCommitmentSummary,
  computeDashboardSpendDeltaPct,
  computeLiabilitiesBreakdown,
  computeLiquidityBreakdown,
  computeNetWorth,
  groupAccountsByType,
  reduceDashboardTransactionFacts,
} from '@/modules/dashboard/screens/dashboard/dashboard.helpers';
import type { Account } from '@/store/account.store';

const makeAccount = (overrides: Partial<Account> = {}): Account => ({
  id: 'acc-1',
  name: 'Test',
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
  balance_review_required: 0,
  is_archived: 0,
  sort_order: 0,
  created_at: '2026-01-01T00:00:00.000Z',
  updated_at: '2026-01-01T00:00:00.000Z',
  ...overrides,
});

const makePayment = (overrides: Partial<CommitmentPayment> = {}): CommitmentPayment => ({
  id: 'payment-1',
  commitment_id: 'commitment-1',
  due_date: '2026-07-10',
  paid_date: null,
  skipped_date: null,
  amount_due: 100,
  amount_paid: null,
  currency: Currency.EGP,
  exchange_rate_snapshot: null,
  account_id: null,
  transaction_id: null,
  status: CommitmentPaymentStatus.Upcoming,
  notes: null,
  created_at: '2026-01-01T00:00:00.000Z',
  updated_at: '2026-01-01T00:00:00.000Z',
  ...overrides,
});

describe('computeNetWorth', () => {
  it('returns all zeros for empty accounts', () => {
    expect(computeNetWorth([], 50)).toEqual({
      assetsEgp: 0,
      assetsUsd: 0,
      liabilitiesEgp: 0,
      netWorthEgp: 0,
      netWorthUsd: 0,
    });
  });

  it('adds EGP non-CC account balance to assets', () => {
    const result = computeNetWorth([makeAccount({ current_balance: 10000 })], 50);
    expect(result.assetsEgp).toBe(10000);
    expect(result.liabilitiesEgp).toBe(0);
    expect(result.netWorthEgp).toBe(10000);
  });

  it('converts USD account to EGP using rate', () => {
    const result = computeNetWorth(
      [makeAccount({ current_balance: 100, currency: Currency.USD })],
      50,
    );
    expect(result.assetsEgp).toBe(5000);
  });

  it('adds credit card balance to liabilities, not assets', () => {
    const result = computeNetWorth(
      [makeAccount({ type: AccountType.CreditCard, current_balance: 2000 })],
      50,
    );
    expect(result.liabilitiesEgp).toBe(2000);
    expect(result.assetsEgp).toBe(0);
    expect(result.netWorthEgp).toBe(-2000);
  });

  it('computes net worth = assets − liabilities across mixed accounts', () => {
    const accounts = [
      makeAccount({ id: 'a1', current_balance: 10000 }),
      makeAccount({ id: 'a2', type: AccountType.CreditCard, current_balance: 3000 }),
    ];
    const result = computeNetWorth(accounts, 50);
    expect(result.netWorthEgp).toBe(7000);
    expect(result.netWorthUsd).toBeCloseTo(140, 1);
  });

  it('returns netWorthUsd=0 when rate=0 to avoid division by zero', () => {
    const result = computeNetWorth([makeAccount({ current_balance: 5000 })], 0);
    expect(result.netWorthUsd).toBe(0);
  });
});

describe('groupAccountsByType', () => {
  it('returns empty object for empty accounts', () => {
    expect(groupAccountsByType([])).toEqual({});
  });

  it('groups accounts by type', () => {
    const accounts = [
      makeAccount({ id: 'a1', type: AccountType.Bank }),
      makeAccount({ id: 'a2', type: AccountType.Bank }),
      makeAccount({ id: 'a3', type: AccountType.CreditCard }),
    ];
    const groups = groupAccountsByType(accounts);
    expect(groups[AccountType.Bank]).toHaveLength(2);
    expect(groups[AccountType.CreditCard]).toHaveLength(1);
    expect(groups[AccountType.SmartWallet]).toBeUndefined();
  });

  it('preserves order within each group', () => {
    const a1 = makeAccount({ id: 'a1', name: 'First', type: AccountType.Bank });
    const a2 = makeAccount({ id: 'a2', name: 'Second', type: AccountType.Bank });
    const groups = groupAccountsByType([a1, a2]);
    expect(groups[AccountType.Bank]![0].name).toBe('First');
    expect(groups[AccountType.Bank]![1].name).toBe('Second');
  });
});

describe('computeLiquidityBreakdown', () => {
  it('splits accounts into liquid and reserve tiers (L-01 canonical)', () => {
    const accounts: Account[] = [
      makeAccount({ id: '1', type: AccountType.Bank, current_balance: 27000 }),
      makeAccount({ id: '2', type: AccountType.SmartWallet, current_balance: 3500 }),
      makeAccount({ id: '3', type: AccountType.PhysicalWallet, current_balance: 2000 }),
      makeAccount({ id: '4', type: AccountType.PhysicalSavings, current_balance: 10000 }),
      makeAccount({ id: '5', type: AccountType.CreditCard, current_balance: 4080 }),
    ];
    const result = computeLiquidityBreakdown(accounts, 48.85);
    expect(result.liquidEgp).toBe(32500);
    expect(result.liquidCount).toBe(3);
    expect(result.reserveEgp).toBe(10000);
    expect(result.reserveCount).toBe(1);
  });

  it('excludes credit cards from both tiers', () => {
    const accounts: Account[] = [
      makeAccount({ id: '1', type: AccountType.CreditCard, current_balance: 4080 }),
    ];
    const result = computeLiquidityBreakdown(accounts, 48.85);
    expect(result.liquidEgp).toBe(0);
    expect(result.reserveEgp).toBe(0);
  });

  it('excludes archived accounts (L-07)', () => {
    const accounts: Account[] = [
      makeAccount({ id: '1', type: AccountType.Bank, current_balance: 1000, is_archived: 1 }),
      makeAccount({ id: '2', type: AccountType.Bank, current_balance: 2000 }),
    ];
    const result = computeLiquidityBreakdown(accounts, 48.85);
    expect(result.liquidEgp).toBe(2000);
    expect(result.liquidCount).toBe(1);
  });

  it('converts USD accounts via the rate (L-03)', () => {
    const accounts: Account[] = [
      makeAccount({
        id: '1',
        type: AccountType.Bank,
        currency: Currency.USD,
        current_balance: 100,
      }),
    ];
    const result = computeLiquidityBreakdown(accounts, 48.85);
    expect(result.liquidEgp).toBeCloseTo(4885, 0);
  });

  it('returns zeros for empty input (L-02)', () => {
    const result = computeLiquidityBreakdown([], 48.85);
    expect(result).toEqual({
      liquidEgp: 0,
      liquidCount: 0,
      liquidAccounts: [],
      reserveEgp: 0,
      reserveCount: 0,
      reserveAccounts: [],
    });
  });

  it('includes per-tier accounts ordered by balance descending', () => {
    const accounts: Account[] = [
      makeAccount({ id: '1', name: 'CIB', type: AccountType.Bank, current_balance: 5000 }),
      makeAccount({
        id: '2',
        name: 'Cash',
        type: AccountType.PhysicalWallet,
        current_balance: 2000,
      }),
      makeAccount({ id: '3', name: 'QNB', type: AccountType.Bank, current_balance: 10000 }),
      makeAccount({
        id: '4',
        name: 'Savings',
        type: AccountType.PhysicalSavings,
        current_balance: 3000,
      }),
    ];
    const result = computeLiquidityBreakdown(accounts, 48.85);
    expect(result.liquidAccounts.map((a) => a.name)).toEqual(['QNB', 'CIB', 'Cash']);
    expect(result.reserveAccounts.map((a) => a.name)).toEqual(['Savings']);
  });

  it('returns zero reserve when no PhysicalSavings present', () => {
    const accounts: Account[] = [
      makeAccount({ id: '1', type: AccountType.Bank, current_balance: 1000 }),
    ];
    const result = computeLiquidityBreakdown(accounts, 48.85);
    expect(result.reserveEgp).toBe(0);
    expect(result.reserveCount).toBe(0);
  });

  it('returns zero liquid when only PhysicalSavings present (L-05)', () => {
    const accounts: Account[] = [
      makeAccount({ id: '1', type: AccountType.PhysicalSavings, current_balance: 1000 }),
    ];
    const result = computeLiquidityBreakdown(accounts, 48.85);
    expect(result.liquidEgp).toBe(0);
    expect(result.reserveEgp).toBe(1000);
  });
});

describe('computeLiabilitiesBreakdown', () => {
  it('returns one row per credit card, ordered by balance descending (L-08)', () => {
    const accounts: Account[] = [
      makeAccount({ id: '1', name: 'Visa A', type: AccountType.CreditCard, current_balance: 1000 }),
      makeAccount({ id: '2', name: 'Visa B', type: AccountType.CreditCard, current_balance: 4080 }),
    ];
    const result = computeLiabilitiesBreakdown(accounts, 48.85);
    expect(result).toEqual([
      { id: '2', name: 'Visa B', balanceEgp: 4080, statementDueDay: null },
      { id: '1', name: 'Visa A', balanceEgp: 1000, statementDueDay: null },
    ]);
  });

  it('carries statement_due_day through to the row', () => {
    const accounts: Account[] = [
      makeAccount({
        id: '1',
        name: 'Visa',
        type: AccountType.CreditCard,
        current_balance: 1000,
        statement_due_day: 28,
      }),
    ];
    const [row] = computeLiabilitiesBreakdown(accounts, 48.85);
    expect(row.statementDueDay).toBe(28);
  });

  it('returns an empty array when no credit cards', () => {
    const accounts: Account[] = [
      makeAccount({ id: '1', type: AccountType.Bank, current_balance: 1000 }),
    ];
    expect(computeLiabilitiesBreakdown(accounts, 48.85)).toEqual([]);
  });

  it('excludes archived credit cards (L-07)', () => {
    const accounts: Account[] = [
      makeAccount({
        id: '1',
        name: 'Old Visa',
        type: AccountType.CreditCard,
        current_balance: 1000,
        is_archived: 1,
      }),
    ];
    expect(computeLiabilitiesBreakdown(accounts, 48.85)).toEqual([]);
  });

  it('converts USD credit card balance to EGP via the rate (L-03)', () => {
    const accounts: Account[] = [
      makeAccount({
        id: '1',
        name: 'USD Card',
        type: AccountType.CreditCard,
        currency: Currency.USD,
        current_balance: 100,
      }),
    ];
    const [row] = computeLiabilitiesBreakdown(accounts, 48.85);
    expect(row.balanceEgp).toBeCloseTo(4885, 0);
  });

  it('uses absolute value if a card balance is stored as negative (defensive)', () => {
    const accounts: Account[] = [
      makeAccount({
        id: '1',
        name: 'Visa',
        type: AccountType.CreditCard,
        current_balance: -1000,
      }),
    ];
    const [row] = computeLiabilitiesBreakdown(accounts, 48.85);
    expect(row.balanceEgp).toBe(1000);
  });
});

describe('reduceDashboardTransactionFacts', () => {
  it('builds current and previous month facts without clamping card credits', () => {
    const reduced = reduceDashboardTransactionFacts(
      [
        {
          year_month: '2026-07',
          category_id: 'food',
          income_egp: 0,
          expense_egp: 600,
          usd_native: 10,
          transaction_count: 2,
        },
        {
          year_month: '2026-07',
          category_id: 'food',
          income_egp: 0,
          expense_egp: -750,
          usd_native: -15,
          transaction_count: 1,
        },
        {
          year_month: '2026-07',
          category_id: null,
          income_egp: 1000,
          expense_egp: 0,
          usd_native: 0,
          transaction_count: 0,
        },
        {
          year_month: '2026-06',
          category_id: null,
          income_egp: 500,
          expense_egp: 200,
          usd_native: 4,
          transaction_count: 1,
        },
      ],
      '2026-07',
      '2026-06',
    );

    expect(reduced.currentMonth).toEqual({
      totals: { incomeEgp: 1000, expenseEgp: -150, netEgp: 1150 },
      spend: { totalEgp: -150, usdNative: -5, count: 3 },
    });
    expect(reduced.previousMonth.totals).toEqual({
      incomeEgp: 500,
      expenseEgp: 200,
      netEgp: 300,
    });
    expect(reduced.currentCategorySpendEgp).toEqual({ food: -150 });
  });

  it('returns legitimate zero facts for empty rows', () => {
    expect(reduceDashboardTransactionFacts([], '2026-07', '2026-06')).toEqual({
      currentMonth: {
        totals: { incomeEgp: 0, expenseEgp: 0, netEgp: 0 },
        spend: { totalEgp: 0, usdNative: 0, count: 0 },
      },
      previousMonth: {
        totals: { incomeEgp: 0, expenseEgp: 0, netEgp: 0 },
        spend: { totalEgp: 0, usdNative: 0, count: 0 },
      },
      currentCategorySpendEgp: {},
    });
  });
});

describe('buildDashboardBudgetSummary', () => {
  it('clamps category credits and excludes unbudgeted categories', () => {
    expect(
      buildDashboardBudgetSummary(
        [
          { category_id: 'food', limit_amount: 7000 },
          { category_id: 'transport', limit_amount: 3000 },
        ],
        { food: -150, transport: 500, unbudgeted: 900 },
      ),
    ).toEqual({
      budgeted: 10000,
      spent: 500,
      left: 9500,
      pct: 0.05,
      categoryCount: 2,
    });
  });

  it('returns zero progress when no budget limits exist', () => {
    expect(buildDashboardBudgetSummary([], { food: 500 })).toEqual({
      budgeted: 0,
      spent: 0,
      left: 0,
      pct: 0,
      categoryCount: 0,
    });
  });
});

describe('computeDashboardAccountCounts', () => {
  it('counts active assets and liabilities', () => {
    expect(
      computeDashboardAccountCounts([
        makeAccount({ id: 'bank' }),
        makeAccount({ id: 'card', type: AccountType.CreditCard }),
        makeAccount({ id: 'archived', is_archived: 1 }),
      ]),
    ).toEqual({ assets: 1, liabilities: 1 });
  });
});

describe('computeDashboardSpendDeltaPct', () => {
  it('rounds the percentage change from the previous month', () => {
    expect(computeDashboardSpendDeltaPct(151, 100)).toBe(51);
  });

  it.each([0, -100])('returns null when the previous spend is %s', (previousEgp) => {
    expect(computeDashboardSpendDeltaPct(100, previousEgp)).toBeNull();
  });
});

describe('computeDashboardCommitmentSummary', () => {
  it('counts statuses and totals non-skipped amounts by native currency', () => {
    const summary = computeDashboardCommitmentSummary([
      makePayment({
        id: 'paid',
        status: CommitmentPaymentStatus.Paid,
        amount_due: 100,
        amount_paid: 90,
      }),
      makePayment({
        id: 'paid-fallback',
        status: CommitmentPaymentStatus.Paid,
        amount_due: 70,
      }),
      makePayment({
        id: 'overdue-usd',
        status: CommitmentPaymentStatus.Overdue,
        currency: Currency.USD,
        amount_due: 20,
      }),
      makePayment({ id: 'due', status: CommitmentPaymentStatus.Due, amount_due: 40 }),
      makePayment({ id: 'upcoming', amount_due: null }),
      makePayment({
        id: 'skipped',
        status: CommitmentPaymentStatus.Skipped,
        amount_due: 500,
      }),
    ]);

    expect(summary.counts).toEqual({
      paid: 2,
      overdue: 1,
      due: 1,
      upcoming: 1,
      skipped: 1,
      total: 5,
    });
    expect(summary.totalsByCurrency).toEqual(
      new Map([
        [Currency.EGP, 200],
        [Currency.USD, 20],
      ]),
    );
  });
});
