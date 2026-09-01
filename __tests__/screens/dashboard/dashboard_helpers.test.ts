import { AccountType, CommitmentPaymentStatus, Currency } from '@/constants/enums';
import {
  AccountAggregationError,
  type DashboardNetWorth,
} from '@/modules/accounts/domain/account_aggregation';
import type { CommitmentPayment } from '@/modules/commitments/entities/commitment_payment.entity';
import { shouldShowProportionBar } from '@/modules/dashboard/screens/dashboard/components/net_worth_breakdown_sheet.helpers';
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
import { formatAmount, formatCurrencyAmount } from '@/utils/format_amount';

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

// The gate reads only whether this marker is null; a non-null value means a rate was written.
const VERIFIED = '2026-08-18T09:00:00.000Z';

function amount(outcome: DashboardNetWorth): Extract<DashboardNetWorth, { kind: 'amount' }> {
  if (outcome.kind !== 'amount') {
    throw new Error(`expected an amount outcome, got "${outcome.kind}"`);
  }
  return outcome;
}

interface NetWorthRow {
  case: string;
  accounts: Account[];
  baseCurrency: Currency;
  rate: number;
  rateUpdatedAt: string | null;
  expected: DashboardNetWorth;
}

// Every `expected` is a literal; an assertion re-derived through the code under test cannot fail.
const NET_WORTH_ROWS: readonly NetWorthRow[] = [
  {
    case: 'an EGP-only portfolio with a verified rate; nothing is converted, the ~USD line still fills in',
    accounts: [makeAccount({ current_balance: 10000 })],
    rate: 50,
    rateUpdatedAt: VERIFIED,
    baseCurrency: Currency.EGP,
    expected: {
      kind: 'amount',
      assets: 10000,
      liabilities: 0,
      netWorth: 10000,
      assetsForeign: 200,
      netWorthForeign: 200,
    },
  },
  {
    case: 'an EGP-only portfolio whose rate was never verified; the ~USD fields are absent',
    accounts: [makeAccount({ current_balance: 12000 })],
    rate: 50,
    rateUpdatedAt: null,
    baseCurrency: Currency.EGP,
    expected: {
      kind: 'amount',
      assets: 12000,
      liabilities: 0,
      netWorth: 12000,
      assetsForeign: undefined,
      netWorthForeign: undefined,
    },
  },
  {
    case: 'no accounts at all; the helper is total, and an unusable rate is irrelevant',
    accounts: [],
    rate: 50,
    rateUpdatedAt: null,
    baseCurrency: Currency.EGP,
    expected: {
      kind: 'amount',
      assets: 0,
      liabilities: 0,
      netWorth: 0,
      assetsForeign: undefined,
      netWorthForeign: undefined,
    },
  },
  {
    // The marker must stay null; with a verified rate the refusal branch is unreachable.
    case: 'an archived USD wallet leaves the foreign count, so an unverified rate is still irrelevant',
    accounts: [
      makeAccount({ current_balance: 1000 }),
      makeAccount({
        type: AccountType.SmartWallet,
        currency: Currency.USD,
        current_balance: 500,
        is_archived: 1,
      }),
    ],
    rate: 50,
    rateUpdatedAt: null,
    baseCurrency: Currency.EGP,
    expected: {
      kind: 'amount',
      assets: 1000,
      liabilities: 0,
      netWorth: 1000,
      assetsForeign: undefined,
      netWorthForeign: undefined,
    },
  },
  {
    case: 'a USD wallet converted into EGP, an EGP card subtracted',
    accounts: [
      makeAccount({ current_balance: 48250 }),
      makeAccount({ type: AccountType.SmartWallet, currency: Currency.USD, current_balance: 1350 }),
      makeAccount({ type: AccountType.CreditCard, current_balance: 8450 }),
    ],
    rate: 48.6,
    rateUpdatedAt: VERIFIED,
    baseCurrency: Currency.EGP,
    expected: {
      kind: 'amount',
      assets: 113860,
      liabilities: 8450,
      netWorth: 105410,
      assetsForeign: 2342.8,
      netWorthForeign: 2168.93,
    },
  },
  {
    case: 'a USD CREDIT CARD — converted and subtracted on the same row',
    accounts: [
      makeAccount({ current_balance: 5000 }),
      makeAccount({
        type: AccountType.CreditCard,
        currency: Currency.USD,
        current_balance: 100,
      }),
    ],
    rate: 48.6,
    rateUpdatedAt: VERIFIED,
    baseCurrency: Currency.EGP,
    expected: {
      kind: 'amount',
      assets: 5000,
      liabilities: 4860,
      netWorth: 140,
      assetsForeign: 102.88,
      netWorthForeign: 2.88,
    },
  },
  {
    case: 'a single credit card, so the whole position is owed',
    accounts: [makeAccount({ type: AccountType.CreditCard, current_balance: 8450 })],
    rate: 50,
    rateUpdatedAt: VERIFIED,
    baseCurrency: Currency.EGP,
    expected: {
      kind: 'amount',
      assets: 0,
      liabilities: 8450,
      netWorth: -8450,
      assetsForeign: 0,
      netWorthForeign: -169,
    },
  },
  {
    case: 'an archived card never contributes, however large',
    accounts: [
      makeAccount({ current_balance: 1000 }),
      makeAccount({ type: AccountType.CreditCard, current_balance: 50000, is_archived: 1 }),
    ],
    rate: 50,
    rateUpdatedAt: VERIFIED,
    baseCurrency: Currency.EGP,
    expected: {
      kind: 'amount',
      assets: 1000,
      liabilities: 0,
      netWorth: 1000,
      assetsForeign: 20,
      netWorthForeign: 20,
    },
  },
  {
    // 0.502 USD at rate 2 is 1.004; rounding each value gives 2.00, rounding the sum gives 2.01.
    case: 'sub-cent residue: each converted value is rounded BEFORE it is summed',
    accounts: [
      makeAccount({
        type: AccountType.SmartWallet,
        currency: Currency.USD,
        current_balance: 0.502,
      }),
      makeAccount({
        type: AccountType.SmartWallet,
        currency: Currency.USD,
        current_balance: 0.502,
      }),
    ],
    rate: 2,
    rateUpdatedAt: VERIFIED,
    baseCurrency: Currency.EGP,
    expected: {
      kind: 'amount',
      assets: 2,
      liabilities: 0,
      netWorth: 2,
      assetsForeign: 1,
      netWorthForeign: 1,
    },
  },
  {
    // Array order is the contract: 0.3 - 0.1 - 0.2 summed in it gives -2.7755575615628914e-17.
    case: 'a portfolio that cancels out to a floating-point residue',
    accounts: [
      makeAccount({ current_balance: 0.3 }),
      makeAccount({ type: AccountType.CreditCard, current_balance: 0.1 }),
      makeAccount({ type: AccountType.CreditCard, current_balance: 0.2 }),
    ],
    rate: 50,
    rateUpdatedAt: VERIFIED,
    baseCurrency: Currency.EGP,
    expected: {
      kind: 'amount',
      assets: 0.3,
      liabilities: 0.3,
      netWorth: 0,
      assetsForeign: 0.01,
      netWorthForeign: 0,
    },
  },
  {
    case: 'a USD wallet whose rate marker was never set; no number at all',
    accounts: [
      makeAccount({ current_balance: 48250 }),
      makeAccount({ type: AccountType.SmartWallet, currency: Currency.USD, current_balance: 1350 }),
    ],
    rate: 48.6,
    rateUpdatedAt: null,
    baseCurrency: Currency.EGP,
    expected: { kind: 'rate-needed', foreignCount: 1 },
  },
  {
    case: 'TWO unverified USD wallets — the refusal reports how many, not whether',
    accounts: [
      makeAccount({ type: AccountType.SmartWallet, currency: Currency.USD, current_balance: 1000 }),
      makeAccount({ type: AccountType.SmartWallet, currency: Currency.USD, current_balance: 350 }),
    ],
    rate: 48.6,
    rateUpdatedAt: null,
    baseCurrency: Currency.EGP,
    expected: { kind: 'rate-needed', foreignCount: 2 },
  },
  ...([0, -1, NaN, Infinity] as const).map((rate) => ({
    case: `a USD wallet at an unusable rate of ${String(rate)}, marker present; no number at all`,
    accounts: [
      makeAccount({ current_balance: 48250 }),
      makeAccount({ type: AccountType.SmartWallet, currency: Currency.USD, current_balance: 1350 }),
    ],
    rate,
    rateUpdatedAt: VERIFIED,
    baseCurrency: Currency.EGP,
    expected: { kind: 'rate-needed' as const, foreignCount: 1 },
  })),

  // USD base. The shared rate is 48.85, at which 4885 EGP is exactly 100.00 USD.
  {
    case: 'USD base, USD-only portfolio, no usable rate — stated, not refused',
    accounts: [
      makeAccount({ currency: Currency.USD, current_balance: 1000 }),
      makeAccount({ currency: Currency.USD, current_balance: 500 }),
    ],
    rate: 50,
    rateUpdatedAt: null,
    baseCurrency: Currency.USD,
    expected: {
      kind: 'amount',
      assets: 1500,
      liabilities: 0,
      netWorth: 1500,
      assetsForeign: undefined,
      netWorthForeign: undefined,
    },
  },
  {
    case: 'USD base, one EGP bank, no usable rate — still refused, because EGP is now the foreign side',
    accounts: [makeAccount({ current_balance: 1000 })],
    rate: 50,
    rateUpdatedAt: null,
    baseCurrency: Currency.USD,
    expected: { kind: 'rate-needed', foreignCount: 1 },
  },
  {
    case: 'USD base, one EGP bank — the divide branch, exact round trip',
    accounts: [makeAccount({ current_balance: 4885 })],
    rate: 48.85,
    rateUpdatedAt: VERIFIED,
    baseCurrency: Currency.USD,
    expected: {
      kind: 'amount',
      assets: 100,
      liabilities: 0,
      netWorth: 100,
      assetsForeign: 4885,
      netWorthForeign: 4885,
    },
  },
  {
    // 100 / 48.85 rounds to 2.05 each, so 4.10; converting the 200 sum instead gives 4.09.
    case: 'USD base, two EGP banks — each converted value is rounded BEFORE it is summed',
    accounts: [
      makeAccount({ current_balance: 100 }),
      makeAccount({ id: 'acc-2', current_balance: 100 }),
    ],
    rate: 48.85,
    rateUpdatedAt: VERIFIED,
    baseCurrency: Currency.USD,
    expected: {
      kind: 'amount',
      assets: 4.1,
      liabilities: 0,
      netWorth: 4.1,
      assetsForeign: 200.28,
      netWorthForeign: 200.28,
    },
  },
  {
    // Converting the 6.15 total once gives 300.43; converting each account again gives 300.42.
    case: 'USD base, three EGP banks — the foreign figure converts the TOTAL once, never per account',
    accounts: [
      makeAccount({ current_balance: 100 }),
      makeAccount({ id: 'acc-2', current_balance: 100 }),
      makeAccount({ id: 'acc-3', current_balance: 100 }),
    ],
    rate: 48.85,
    rateUpdatedAt: VERIFIED,
    baseCurrency: Currency.USD,
    expected: {
      kind: 'amount',
      assets: 6.15,
      liabilities: 0,
      netWorth: 6.15,
      assetsForeign: 300.43,
      netWorthForeign: 300.43,
    },
  },
  {
    // 45.01 / 2 is exactly 22.505; banker's rounding takes 22.50, half-up would give 22.51.
    case: 'USD base, an EGP bank landing on an exact half cent — banker’s rounding takes the even one',
    accounts: [makeAccount({ current_balance: 45.01 })],
    rate: 2,
    rateUpdatedAt: VERIFIED,
    baseCurrency: Currency.USD,
    expected: {
      kind: 'amount',
      assets: 22.5,
      liabilities: 0,
      netWorth: 22.5,
      assetsForeign: 45,
      netWorthForeign: 45,
    },
  },
  {
    case: 'USD base, an EGP bank and a larger EGP card — the sign path under a divide',
    accounts: [
      makeAccount({ current_balance: 4885 }),
      makeAccount({ id: 'acc-2', type: AccountType.CreditCard, current_balance: 9770 }),
    ],
    rate: 48.85,
    rateUpdatedAt: VERIFIED,
    baseCurrency: Currency.USD,
    expected: {
      kind: 'amount',
      assets: 100,
      liabilities: 200,
      netWorth: -100,
      assetsForeign: 4885,
      netWorthForeign: -4885,
    },
  },
  {
    // The two foreign figures differ on purpose: 17097.5 is assets, 12212.5 is net worth.
    case: 'USD base, the mixed portfolio — an identity-pair account beside three converted ones',
    accounts: [
      makeAccount({ current_balance: 4885 }),
      makeAccount({ id: 'acc-2', type: AccountType.PhysicalSavings, current_balance: 9770 }),
      makeAccount({ id: 'acc-3', currency: Currency.USD, current_balance: 50 }),
      makeAccount({ id: 'acc-4', type: AccountType.CreditCard, current_balance: 4885 }),
    ],
    rate: 48.85,
    rateUpdatedAt: VERIFIED,
    baseCurrency: Currency.USD,
    expected: {
      kind: 'amount',
      assets: 350,
      liabilities: 100,
      netWorth: 250,
      assetsForeign: 17097.5,
      netWorthForeign: 12212.5,
    },
  },
  {
    // An implausible rate is flagged at the field, never clamped, so this divides by it as stored.
    case: 'USD base, an implausible stored rate — divided by unmodified, never clamped',
    accounts: [makeAccount({ current_balance: 1 })],
    rate: 0.0001,
    rateUpdatedAt: VERIFIED,
    baseCurrency: Currency.USD,
    expected: {
      kind: 'amount',
      assets: 10000,
      liabilities: 0,
      netWorth: 10000,
      assetsForeign: 1,
      netWorthForeign: 1,
    },
  },
];

describe('computeNetWorth', () => {
  // `toStrictEqual`, not `toEqual`: an absent key must not equal an explicit `undefined`.
  it.each(NET_WORTH_ROWS)('$case', ({ accounts, baseCurrency, rate, rateUpdatedAt, expected }) => {
    expect(
      computeNetWorth({ accounts, baseCurrency, rate, rateUpdatedAt, isManualOverride: false }),
    ).toStrictEqual(expected);
  });

  describe('currencies outside EGP | USD throw', () => {
    const unsupported = 'GBP' as unknown as Currency;

    it('throws on an account currency the schema should never have allowed', () => {
      expect(() =>
        computeNetWorth({
          accounts: [makeAccount({ currency: unsupported, current_balance: 1000 })],
          baseCurrency: Currency.EGP,
          rate: 48.6,
          rateUpdatedAt: VERIFIED,
          isManualOverride: false,
        }),
      ).toThrow(AccountAggregationError);
    });

    it('throws on an unsupported BASE currency, before the accounts are read', () => {
      expect(() =>
        computeNetWorth({
          accounts: [makeAccount({ current_balance: 1000 })],
          baseCurrency: unsupported,
          rate: 48.6,
          rateUpdatedAt: null,
          isManualOverride: false,
        }),
      ).toThrow(AccountAggregationError);
    });

    // `constructor` is on `Object.prototype`, so a prototype-chain lookup accepts it as a currency.
    it('throws on an Object.prototype member masquerading as a currency', () => {
      expect(() =>
        computeNetWorth({
          accounts: [
            makeAccount({
              currency: 'constructor' as unknown as Currency,
              current_balance: 1000,
            }),
          ],
          baseCurrency: Currency.EGP,
          rate: 48.6,
          rateUpdatedAt: VERIFIED,
          isManualOverride: false,
        }),
      ).toThrow(AccountAggregationError);
    });
  });
});

describe('computeNetWorth — a manual rate carrying no marker', () => {
  // `shouldRefreshRate` returns false for a manual override, so a missing marker never repairs.
  const accounts: Account[] = [
    makeAccount({ current_balance: 1000 }),
    makeAccount({ type: AccountType.Bank, currency: Currency.USD, current_balance: 100 }),
  ];

  it('states the total, because the user supplied the rate', () => {
    expect(
      computeNetWorth({
        accounts,
        baseCurrency: Currency.EGP,
        rate: 48,
        rateUpdatedAt: null,
        isManualOverride: true,
      }),
    ).toStrictEqual({
      kind: 'amount',
      assets: 5800,
      liabilities: 0,
      netWorth: 5800,
      assetsForeign: 120.83,
      netWorthForeign: 120.83,
    });
  });

  it('refuses the identical rate when nothing says where it came from', () => {
    expect(
      computeNetWorth({
        accounts,
        baseCurrency: Currency.EGP,
        rate: 48,
        rateUpdatedAt: null,
        isManualOverride: false,
      }),
    ).toStrictEqual({ kind: 'rate-needed', foreignCount: 1 });
  });
});

describe('computeNetWorth — negative zero', () => {
  // `netWorthForeign` divides the raw accumulator, not the normalised `netWorth`.
  const negativeZeroAccounts = [
    makeAccount({ current_balance: 0.3 }),
    makeAccount({ type: AccountType.CreditCard, current_balance: 0.1 }),
    makeAccount({ type: AccountType.CreditCard, current_balance: 0.2 }),
  ];
  const result = () =>
    amount(
      computeNetWorth({
        accounts: negativeZeroAccounts,
        baseCurrency: Currency.EGP,
        rate: 50,
        rateUpdatedAt: VERIFIED,
        isManualOverride: false,
      }),
    );

  it('normalises netWorth to +0', () => {
    expect(Object.is(result().netWorth, 0)).toBe(true);
  });

  it('normalises netWorthForeign to +0', () => {
    expect(Object.is(result().netWorthForeign, 0)).toBe(true);
  });

  it('and therefore renders "0", which is what the user sees', () => {
    // The -0 bug is Intl's, so it only appears once the number reaches the formatter.
    expect(formatAmount(result().netWorth)).toBe('0');
  });

  it('while a raw -0 still renders "-0" — the tripwire proving the three above can fail', () => {
    expect(formatAmount(-0)).toBe('-0');
  });
});

describe('computeNetWorth — negative zero under a USD base, where the reciprocal multiplies', () => {
  // Array order is load-bearing: 15 - 5 - 10 at rate 50 gives the 0.3 - 0.1 - 0.2 residue.
  const cancellingAccounts = [
    makeAccount({ current_balance: 15 }),
    makeAccount({ type: AccountType.CreditCard, current_balance: 5 }),
    makeAccount({ type: AccountType.CreditCard, current_balance: 10 }),
  ];
  const result = () =>
    amount(
      computeNetWorth({
        accounts: cancellingAccounts,
        baseCurrency: Currency.USD,
        rate: 50,
        rateUpdatedAt: VERIFIED,
        isManualOverride: false,
      }),
    );

  it('states the two group totals in the base currency', () => {
    expect(result().assets).toBe(0.3);
    expect(result().liabilities).toBe(0.3);
  });

  it('normalises netWorth to +0', () => {
    expect(Object.is(result().netWorth, 0)).toBe(true);
  });

  it('normalises netWorthForeign to +0 after multiplying the raw accumulator', () => {
    expect(Object.is(result().netWorthForeign, 0)).toBe(true);
  });

  it('converts the assets accumulator back to the original EGP figure', () => {
    expect(result().assetsForeign).toBe(15);
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

// Typed as a `Record` over the enum so a new `AccountType` is a type error, not a silent drop.
const EXPECTED_TIERS: Record<AccountType, 'liquid' | 'reserve' | 'excluded'> = {
  [AccountType.Bank]: 'liquid',
  [AccountType.SmartWallet]: 'liquid',
  [AccountType.PhysicalWallet]: 'liquid',
  [AccountType.PhysicalSavings]: 'reserve',
  [AccountType.CreditCard]: 'excluded',
};

describe('the tier allowlists classify every AccountType', () => {
  it.each(Object.entries(EXPECTED_TIERS))('%s → %s', (type, expected) => {
    const { liquidCount, reserveCount } = computeLiquidityBreakdown(
      [makeAccount({ type: type as AccountType, current_balance: 100 })],
      50,
      Currency.EGP,
    );
    let actual: 'liquid' | 'reserve' | 'excluded' = 'excluded';
    if (liquidCount === 1) actual = 'liquid';
    else if (reserveCount === 1) actual = 'reserve';
    expect(actual).toBe(expected);
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
    const result = computeLiquidityBreakdown(accounts, 48.85, Currency.EGP);
    expect(result.liquid).toBe(32500);
    expect(result.liquidCount).toBe(3);
    expect(result.reserve).toBe(10000);
    expect(result.reserveCount).toBe(1);
  });

  it('excludes credit cards from both tiers', () => {
    const accounts: Account[] = [
      makeAccount({ id: '1', type: AccountType.CreditCard, current_balance: 4080 }),
    ];
    const result = computeLiquidityBreakdown(accounts, 48.85, Currency.EGP);
    expect(result.liquid).toBe(0);
    expect(result.reserve).toBe(0);
  });

  it('excludes archived accounts (L-07)', () => {
    const accounts: Account[] = [
      makeAccount({ id: '1', type: AccountType.Bank, current_balance: 1000, is_archived: 1 }),
      makeAccount({ id: '2', type: AccountType.Bank, current_balance: 2000 }),
    ];
    const result = computeLiquidityBreakdown(accounts, 48.85, Currency.EGP);
    expect(result.liquid).toBe(2000);
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
    const result = computeLiquidityBreakdown(accounts, 48.85, Currency.EGP);
    expect(result.liquid).toBeCloseTo(4885, 0);
  });

  it('returns zeros for empty input (L-02)', () => {
    const result = computeLiquidityBreakdown([], 48.85, Currency.EGP);
    expect(result).toEqual({
      liquid: 0,
      liquidCount: 0,
      liquidAccounts: [],
      reserve: 0,
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
    const result = computeLiquidityBreakdown(accounts, 48.85, Currency.EGP);
    expect(result.liquidAccounts.map((a) => a.name)).toEqual(['QNB', 'CIB', 'Cash']);
    expect(result.reserveAccounts.map((a) => a.name)).toEqual(['Savings']);
  });

  it('returns zero reserve when no PhysicalSavings present', () => {
    const accounts: Account[] = [
      makeAccount({ id: '1', type: AccountType.Bank, current_balance: 1000 }),
    ];
    const result = computeLiquidityBreakdown(accounts, 48.85, Currency.EGP);
    expect(result.reserve).toBe(0);
    expect(result.reserveCount).toBe(0);
  });

  it('returns zero liquid when only PhysicalSavings present (L-05)', () => {
    const accounts: Account[] = [
      makeAccount({ id: '1', type: AccountType.PhysicalSavings, current_balance: 1000 }),
    ];
    const result = computeLiquidityBreakdown(accounts, 48.85, Currency.EGP);
    expect(result.liquid).toBe(0);
    expect(result.reserve).toBe(1000);
  });

  it('collapses to false through the bar gate when a sub-1.0 rate rounds every part to zero (S7)', () => {
    const accounts: Account[] = [
      makeAccount({
        id: '1',
        type: AccountType.Bank,
        currency: Currency.USD,
        current_balance: 0.02,
      }),
    ];
    const { liquid, reserve } = computeLiquidityBreakdown(accounts, 0.0001, Currency.EGP);

    expect(shouldShowProportionBar({ liquid, reserve })).toBe(false);
  });

  it('sums three Bank balances to an exact -0 float-noise total, unnormalized (#332)', () => {
    // 0.3 - 0.1 - 0.2 leaves a -2.78e-17 residual; roundMoney(that) is -0, not 0. This function
    // does not normalize it — `formatOwnedAmountParts` at the render site absorbs it instead.
    const accounts: Account[] = [
      makeAccount({ id: '1', type: AccountType.Bank, current_balance: 0.3 }),
      makeAccount({ id: '2', type: AccountType.Bank, current_balance: -0.1 }),
      makeAccount({ id: '3', type: AccountType.Bank, current_balance: -0.2 }),
    ];
    const { liquid } = computeLiquidityBreakdown(accounts, 48.85, Currency.EGP);

    expect(Object.is(liquid, -0)).toBe(true);
  });

  it('rounds a single overdrawn sub-cent Bank balance to an exact -0 row (#332)', () => {
    const accounts: Account[] = [
      makeAccount({ id: '1', type: AccountType.Bank, current_balance: -0.001 }),
    ];
    const { liquidAccounts } = computeLiquidityBreakdown(accounts, 48.85, Currency.EGP);

    expect(Object.is(liquidAccounts[0]?.balance, -0)).toBe(true);
  });
});

describe('computeLiabilitiesBreakdown', () => {
  it('returns one row per credit card, ordered by balance descending (L-08)', () => {
    const accounts: Account[] = [
      makeAccount({ id: '1', name: 'Visa A', type: AccountType.CreditCard, current_balance: 1000 }),
      makeAccount({ id: '2', name: 'Visa B', type: AccountType.CreditCard, current_balance: 4080 }),
    ];
    const result = computeLiabilitiesBreakdown(accounts, 48.85, Currency.EGP);
    expect(result).toEqual([
      { id: '2', name: 'Visa B', balance: 4080, statementDueDay: null },
      { id: '1', name: 'Visa A', balance: 1000, statementDueDay: null },
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
    const [row] = computeLiabilitiesBreakdown(accounts, 48.85, Currency.EGP);
    expect(row.statementDueDay).toBe(28);
  });

  it('returns an empty array when no credit cards', () => {
    const accounts: Account[] = [
      makeAccount({ id: '1', type: AccountType.Bank, current_balance: 1000 }),
    ];
    expect(computeLiabilitiesBreakdown(accounts, 48.85, Currency.EGP)).toEqual([]);
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
    expect(computeLiabilitiesBreakdown(accounts, 48.85, Currency.EGP)).toEqual([]);
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
    const [row] = computeLiabilitiesBreakdown(accounts, 48.85, Currency.EGP);
    expect(row.balance).toBeCloseTo(4885, 0);
  });

  it('keeps a negative stored balance signed — an overpaid card is in credit, not a magnitude to launder (#259)', () => {
    const accounts: Account[] = [
      makeAccount({
        id: '1',
        name: 'Visa',
        type: AccountType.CreditCard,
        current_balance: -1000,
      }),
    ];
    const [row] = computeLiabilitiesBreakdown(accounts, 48.85, Currency.EGP);
    expect(row.balance).toBe(-1000);
  });

  it('keeps rows signed and sorted debt-first: an overpaid card sorts last (S5)', () => {
    const accounts: Account[] = [
      makeAccount({ id: '1', name: 'Visa A', type: AccountType.CreditCard, current_balance: 5000 }),
      makeAccount({ id: '2', name: 'Visa B', type: AccountType.CreditCard, current_balance: -300 }),
    ];
    const result = computeLiabilitiesBreakdown(accounts, 48.85, Currency.EGP);
    expect(result.map((row) => row.balance)).toEqual([5000, -300]);
  });
});

describe('the breakdown resolvers follow the base currency', () => {
  const mixedPortfolio = (): Account[] => [
    makeAccount({ id: 'bank', name: 'EGP Bank', current_balance: 4885 }),
    makeAccount({
      id: 'savings',
      name: 'EGP Savings',
      type: AccountType.PhysicalSavings,
      current_balance: 9770,
    }),
    makeAccount({
      id: 'usd-bank',
      name: 'USD Bank',
      currency: Currency.USD,
      current_balance: 50,
    }),
    makeAccount({
      id: 'card',
      name: 'EGP Card',
      type: AccountType.CreditCard,
      current_balance: 4885,
    }),
  ];

  it('splits liquid and reserve in the base currency, identity pair included', () => {
    const { liquid, reserve } = computeLiquidityBreakdown(mixedPortfolio(), 48.85, Currency.USD);

    // 4885 EGP divides to 100.00 and the USD bank's 50.00 passes through untouched.
    expect(liquid).toBe(150);
    expect(reserve).toBe(200);
  });

  it('states each liability row in the base currency', () => {
    const rows = computeLiabilitiesBreakdown(mixedPortfolio(), 48.85, Currency.USD);

    expect(rows).toHaveLength(1);
    expect(rows[0].balance).toBe(100);
  });
});

describe('computeNetWorth — liabilities is the signed owed-frame total (#259 T4)', () => {
  it('nets an overpaid card against unpaid debt (S5)', () => {
    const accounts: Account[] = [
      makeAccount({ id: '1', type: AccountType.CreditCard, current_balance: 5000 }),
      makeAccount({ id: '2', type: AccountType.CreditCard, current_balance: -300 }),
    ];
    const { liabilities } = amount(
      computeNetWorth({
        accounts,
        baseCurrency: Currency.EGP,
        rate: 50,
        rateUpdatedAt: VERIFIED,
        isManualOverride: false,
      }),
    );
    expect(liabilities).toBe(4700);
    expect(formatAmount(liabilities)).toBe('4,700');
  });

  it('goes negative when every card is in credit (S5b)', () => {
    const accounts: Account[] = [
      makeAccount({ id: '1', type: AccountType.CreditCard, current_balance: -300 }),
    ];
    const { liabilities } = amount(
      computeNetWorth({
        accounts,
        baseCurrency: Currency.EGP,
        rate: 50,
        rateUpdatedAt: VERIFIED,
        isManualOverride: false,
      }),
    );
    expect(liabilities).toBe(-300);
    expect(formatAmount(liabilities)).toBe('-300');
  });
});

describe('computeLiquidityBreakdown and computeLiabilitiesBreakdown are rate-independent when nothing foreign remains (#259 C7)', () => {
  it('return the same result at rate = 50 and rate = 0.0001', () => {
    const accounts: Account[] = [
      makeAccount({ id: '1', type: AccountType.Bank, current_balance: 5000 }),
      makeAccount({ id: '2', type: AccountType.CreditCard, current_balance: 1200 }),
      makeAccount({
        id: '3',
        type: AccountType.PhysicalWallet,
        currency: Currency.USD,
        current_balance: 40,
        is_archived: 1,
      }),
    ];

    expect(computeLiquidityBreakdown(accounts, 0.0001, Currency.EGP)).toEqual(
      computeLiquidityBreakdown(accounts, 50, Currency.EGP),
    );
    expect(computeLiabilitiesBreakdown(accounts, 0.0001, Currency.EGP)).toEqual(
      computeLiabilitiesBreakdown(accounts, 50, Currency.EGP),
    );
  });
});

describe('the breakdown sheet renders ONE number per account (MA-013)', () => {
  // 9.51 USD at 40.01 is 380.4951, which rounds to 380.50 and renders as 381 rather than 380.
  const RATE = 40.01;

  it('liabilities: section header, the card row and the total-debt footer agree', () => {
    const accounts: Account[] = [
      makeAccount({
        id: '1',
        name: 'USD Card',
        type: AccountType.CreditCard,
        currency: Currency.USD,
        current_balance: 9.51,
      }),
    ];

    const { liabilities } = amount(
      computeNetWorth({
        accounts,
        baseCurrency: Currency.EGP,
        rate: RATE,
        rateUpdatedAt: VERIFIED,
        isManualOverride: false,
      }),
    );
    const rows = computeLiabilitiesBreakdown(accounts, RATE, Currency.EGP);
    const totalDebt = rows.reduce((sum, row) => sum + row.balance, 0);

    expect(formatAmount(liabilities)).toBe('381');
    expect(rows.map((row) => formatAmount(row.balance))).toEqual(['381']);
    expect(formatAmount(totalDebt)).toBe('381');
  });

  it('assets: section header, the tier legend and the account sub-row agree', () => {
    const accounts: Account[] = [
      makeAccount({
        id: '1',
        name: 'USD Bank',
        type: AccountType.Bank,
        currency: Currency.USD,
        current_balance: 9.51,
      }),
    ];

    const { assets } = amount(
      computeNetWorth({
        accounts,
        baseCurrency: Currency.EGP,
        rate: RATE,
        rateUpdatedAt: VERIFIED,
        isManualOverride: false,
      }),
    );
    const { liquid, liquidAccounts } = computeLiquidityBreakdown(accounts, RATE, Currency.EGP);

    expect(formatAmount(assets)).toBe('381');
    expect(formatAmount(liquid)).toBe('381');
    expect(liquidAccounts.map((account) => formatAmount(account.balance))).toEqual(['381']);
  });

  // Ten 0.05 balances accumulate to 0.49999999999999994, so the tier total needs its own rounding.
  const tenAt5Piastres = (type: AccountType): Account[] =>
    Array.from({ length: 10 }, (_, i) =>
      makeAccount({ id: `${type}-${i}`, type, current_balance: 0.05 }),
    );

  it('assets: the liquid tier total is rounded, so the legend agrees with the header', () => {
    const accounts = tenAt5Piastres(AccountType.PhysicalWallet);

    const { assets } = amount(
      computeNetWorth({
        accounts,
        baseCurrency: Currency.EGP,
        rate: RATE,
        rateUpdatedAt: VERIFIED,
        isManualOverride: false,
      }),
    );
    const { liquid } = computeLiquidityBreakdown(accounts, RATE, Currency.EGP);

    expect(liquid).toBe(0.5);
    expect(formatAmount(assets)).toBe('1');
    expect(formatAmount(liquid)).toBe('1');
  });

  it('assets: the reserve tier total is rounded on the same contract', () => {
    const accounts = tenAt5Piastres(AccountType.PhysicalSavings);

    const { assets } = amount(
      computeNetWorth({
        accounts,
        baseCurrency: Currency.EGP,
        rate: RATE,
        rateUpdatedAt: VERIFIED,
        isManualOverride: false,
      }),
    );
    const { reserve } = computeLiquidityBreakdown(accounts, RATE, Currency.EGP);

    expect(reserve).toBe(0.5);
    expect(formatAmount(assets)).toBe('1');
    expect(formatAmount(reserve)).toBe('1');
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

  it('and therefore renders "749 EGP" for the header total — three 249.50 commitments summing to 748.5', () => {
    const summary = computeDashboardCommitmentSummary([
      makePayment({ id: 'a', status: CommitmentPaymentStatus.Due, amount_due: 249.5 }),
      makePayment({ id: 'b', status: CommitmentPaymentStatus.Due, amount_due: 249.5 }),
      makePayment({ id: 'c', status: CommitmentPaymentStatus.Due, amount_due: 249.5 }),
    ]);
    const total = summary.totalsByCurrency.get(Currency.EGP);
    expect(total).toBe(748.5);
    expect(formatCurrencyAmount(total ?? 0, Currency.EGP)).toBe('749 EGP');
  });
});
