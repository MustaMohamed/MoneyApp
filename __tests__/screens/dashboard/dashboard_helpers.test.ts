import { AccountType, CommitmentPaymentStatus, Currency } from '@/constants/enums';
import {
  AccountAggregationError,
  type DashboardNetWorth,
} from '@/modules/accounts/domain/account_aggregation';
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
import { formatAmount } from '@/utils/format_amount';

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

// Time is an input, never `new Date()`. The gate reads only whether this marker
// is null — a non-null value means the stored rate was actually verified.
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
  rate: number;
  rateUpdatedAt: string | null;
  expected: DashboardNetWorth;
}

// Every `expected` is a LITERAL: nothing here is re-derived through `roundMoney`
// or through `computeNetWorth` itself, because an assertion built from the code
// under test cannot fail. Mirrors the shape of
// `__tests__/starting_net_position.test.ts`'s resolver table.
//
// EGP is this function's base currency (see its doc comment), so USD balances
// MULTIPLY by the rate and the `~USD` fields divide.
//
// EVERY row states `rateUpdatedAt` explicitly, including the rows that do not
// need a rate: three of them carry `null` and still expect an amount, so
// deleting the `foreignCount >= 1 &&` conjunct from the gate turns all three red
// instead of leaving the suite green over a refusal nobody asked for.
const NET_WORTH_ROWS: readonly NetWorthRow[] = [
  {
    // Row 1 keeps its USD numbers because its marker is VERIFIED — which is what
    // makes `assetsUsd: 200` legitimate rather than a rate-50 guess asserted
    // inside the suite meant to forbid guesses.
    case: 'an EGP-only portfolio with a verified rate; nothing is converted, the ~USD line still fills in',
    accounts: [makeAccount({ current_balance: 10000 })],
    rate: 50,
    rateUpdatedAt: VERIFIED,
    expected: {
      kind: 'amount',
      assetsEgp: 10000,
      liabilitiesEgp: 0,
      netWorthEgp: 10000,
      assetsUsd: 200,
      netWorthUsd: 200,
    },
  },
  {
    // The largest affected population: a fresh install that has never fetched a
    // rate. The EGP total is stated normally; the ~USD equivalent is ABSENT, not
    // a placeholder-rate guess. Populate `assetsUsd` from `rate` unconditionally
    // and only this row and the two below it fail — repo policy forbids catching
    // it in a render test, so if this table does not catch it nothing does.
    case: 'an EGP-only portfolio whose rate was never verified; the ~USD fields are absent',
    accounts: [makeAccount({ current_balance: 12000 })],
    rate: 50,
    rateUpdatedAt: null,
    expected: {
      kind: 'amount',
      assetsEgp: 12000,
      liabilitiesEgp: 0,
      netWorthEgp: 12000,
      assetsUsd: undefined,
      netWorthUsd: undefined,
    },
  },
  {
    case: 'no accounts at all; the helper is total, and an unusable rate is irrelevant',
    accounts: [],
    rate: 50,
    rateUpdatedAt: null,
    expected: {
      kind: 'amount',
      assetsEgp: 0,
      liabilitiesEgp: 0,
      netWorthEgp: 0,
      assetsUsd: undefined,
      netWorthUsd: undefined,
    },
  },
  {
    // The COMPOSED outcome: an archived foreign row leaves the count, so an
    // unverified rate is irrelevant and this is an amount rather than a refusal.
    // It is NOT the signal for the filter/count ordering, which an earlier
    // version of this comment claimed: `countForeignAccounts` filters
    // `is_archived` itself, so handing it the unfiltered array returns the same
    // `0` and this row stays green. The two filters are defence in depth and
    // `resolveStartingNetPosition` composes the same pair.
    //
    // What this row guards, measured by mutation rather than argued: it is a
    // SECOND signal for `computeNetWorth`'s own archived filter, alongside the
    // archived-card row below. Delete that filter alone
    // (`dashboard.helpers.ts:63`) and the wallet enters the arithmetic at
    // `1000 + roundMoney(500 * 50)`, so this row reports `assetsEgp` and
    // `netWorthEgp` of 26000 against 1000 expected. It is INSENSITIVE to
    // `countForeignAccounts`'s inline filter in isolation: delete that one alone
    // and this whole table stays green, with only `account_aggregation.test.ts`'s
    // "never counts an archived account" going red. Losing both filters would
    // additionally flip `kind` to `rate-needed`, but that is a stricter
    // condition than this row needs — the whole-object `toStrictEqual` has
    // already failed on the value.
    //
    // The marker must stay `null`: with a verified rate the refusal branch is
    // unreachable and the row would prove nothing about the foreign count.
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
    expected: {
      kind: 'amount',
      assetsEgp: 1000,
      liabilitiesEgp: 0,
      netWorthEgp: 1000,
      assetsUsd: undefined,
      netWorthUsd: undefined,
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
    expected: {
      kind: 'amount',
      assetsEgp: 113860,
      liabilitiesEgp: 8450,
      netWorthEgp: 105410,
      assetsUsd: 2342.8,
      netWorthUsd: 2168.93,
    },
  },
  {
    // The conversion and the sign land on the SAME account here, and nowhere
    // else in this table. Cards otherwise appear only in EGP and USD only in
    // wallets, so a body reading `currency === USD && type !== CreditCard`
    // passes every other row. No two fields of this row collide either: a missed
    // conversion gives netWorthEgp 4900, a flipped sign 9860.
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
    expected: {
      kind: 'amount',
      assetsEgp: 5000,
      liabilitiesEgp: 4860,
      netWorthEgp: 140,
      assetsUsd: 102.88,
      netWorthUsd: 2.88,
    },
  },
  {
    case: 'a single credit card, so the whole position is owed',
    accounts: [makeAccount({ type: AccountType.CreditCard, current_balance: 8450 })],
    rate: 50,
    rateUpdatedAt: VERIFIED,
    expected: {
      kind: 'amount',
      assetsEgp: 0,
      liabilitiesEgp: 8450,
      netWorthEgp: -8450,
      assetsUsd: 0,
      netWorthUsd: -169,
    },
  },
  {
    // The archived row is deliberately large enough to flip the total, not
    // decorative: `getAccounts` filters archived at SQL today, so this asserts
    // the CONTRACT rather than the current call path.
    case: 'an archived card never contributes, however large',
    accounts: [
      makeAccount({ current_balance: 1000 }),
      makeAccount({ type: AccountType.CreditCard, current_balance: 50000, is_archived: 1 }),
    ],
    rate: 50,
    rateUpdatedAt: VERIFIED,
    expected: {
      kind: 'amount',
      assetsEgp: 1000,
      liabilitiesEgp: 0,
      netWorthEgp: 1000,
      assetsUsd: 20,
      netWorthUsd: 20,
    },
  },
  {
    // The round-then-sum catcher, and it is load-bearing: 0.502 USD at rate 2
    // converts to 1.004, so rounding each value gives 1.00 + 1.00 = 2.00 while
    // rounding the sum alone gives roundMoney(2.008) = 2.01. Delete the
    // per-value `roundMoney` and only this row goes red.
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
    expected: {
      kind: 'amount',
      assetsEgp: 2,
      liabilitiesEgp: 0,
      netWorthEgp: 2,
      assetsUsd: 1,
      netWorthUsd: 1,
    },
  },
  {
    // The ORDER is what produces the residue: 0.30 − 0.10 − 0.20 summed in
    // array order is -2.7755575615628914e-17, whose roundMoney is -0. A body
    // that grouped or sorted the rows first, or that derived netWorthEgp as
    // assetsEgp − liabilitiesEgp, would make this row a tautology — so
    // "accumulate in array order" is part of the contract.
    case: 'a portfolio that cancels out to a floating-point residue',
    accounts: [
      makeAccount({ current_balance: 0.3 }),
      makeAccount({ type: AccountType.CreditCard, current_balance: 0.1 }),
      makeAccount({ type: AccountType.CreditCard, current_balance: 0.2 }),
    ],
    rate: 50,
    rateUpdatedAt: VERIFIED,
    expected: {
      kind: 'amount',
      assetsEgp: 0.3,
      liabilitiesEgp: 0.3,
      netWorthEgp: 0,
      assetsUsd: 0.01,
      netWorthUsd: 0,
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
    expected: { kind: 'rate-needed', foreignCount: 1 },
  },
  {
    // A refusal member hardcoding `foreignCount: 1` survives every other row.
    case: 'TWO unverified USD wallets — the refusal reports how many, not whether',
    accounts: [
      makeAccount({ type: AccountType.SmartWallet, currency: Currency.USD, current_balance: 1000 }),
      makeAccount({ type: AccountType.SmartWallet, currency: Currency.USD, current_balance: 350 }),
    ],
    rate: 48.6,
    rateUpdatedAt: null,
    expected: { kind: 'rate-needed', foreignCount: 2 },
  },
  ...([0, -1, NaN, Infinity] as const).map((rate) => ({
    // Same outcome as the null-marker rows, different cause: the marker is
    // present and the number itself is unusable.
    case: `a USD wallet at an unusable rate of ${String(rate)}, marker present; no number at all`,
    accounts: [
      makeAccount({ current_balance: 48250 }),
      makeAccount({ type: AccountType.SmartWallet, currency: Currency.USD, current_balance: 1350 }),
    ],
    rate,
    rateUpdatedAt: VERIFIED,
    expected: { kind: 'rate-needed' as const, foreignCount: 1 },
  })),
];

describe('computeNetWorth', () => {
  // `toStrictEqual`, not `toEqual`: an ABSENT `assetsUsd` key must not be
  // silently equal to an explicit `undefined` one, because the union declares
  // both USD fields as present-and-possibly-undefined.
  it.each(NET_WORTH_ROWS)('$case', ({ accounts, rate, rateUpdatedAt, expected }) => {
    expect(computeNetWorth({ accounts, rate, rateUpdatedAt })).toStrictEqual(expected);
  });

  // RETIRED here: `it('returns netWorthUsd=0 when rate=0 to avoid division by
  // zero')`, which asserted the contract this ticket reverses. What it guarded —
  // the `rate > 0 ? value / rate : 0` fallback — no longer exists. What replaces
  // it is NOT a refusal: its fixture was a single EGP bank account at rate 0, so
  // `foreignCount` is 0, nothing needs converting, and the outcome is an amount
  // (`assetsEgp: 5000`, `netWorthEgp: 5000`) whose `assetsUsd` and `netWorthUsd`
  // are `undefined` because the rate is unusable. The EGP-only rows above assert
  // exactly that shape. Recorded in
  // `docs/adr/2026-08-19-dashboard-net-worth-refusal.md` §5; not deleted silently
  // to go green.

  describe('currencies outside EGP | USD throw', () => {
    const unsupported = 'GBP' as unknown as Currency;

    it('throws on an account currency the schema should never have allowed', () => {
      expect(() =>
        computeNetWorth({
          accounts: [makeAccount({ currency: unsupported, current_balance: 1000 })],
          rate: 48.6,
          rateUpdatedAt: VERIFIED,
        }),
      ).toThrow(AccountAggregationError);
    });
  });
});

describe('computeNetWorth — negative zero', () => {
  // Two independent -0 sites, and neither one's zero reaches the other (ADR
  // 2026-08-18 §4), so both need their own assertion: the netWorthEgp
  // accumulator lands on -2.7755575615628914e-17, and netWorthUsd divides that
  // RAW accumulator by the rate to -5.551115123125783e-19. roundMoney maps both
  // to -0. Divide the already-normalised netWorthEgp instead and the second
  // assertion below can never fail.
  //
  // The marker must be VERIFIED, or `netWorthUsd` is `undefined` and the second
  // assertion becomes vacuous rather than falsifiable — the same trap, one level
  // up, as dividing the normalised value.
  const negativeZeroAccounts = [
    makeAccount({ current_balance: 0.3 }),
    makeAccount({ type: AccountType.CreditCard, current_balance: 0.1 }),
    makeAccount({ type: AccountType.CreditCard, current_balance: 0.2 }),
  ];
  const result = () =>
    amount(computeNetWorth({ accounts: negativeZeroAccounts, rate: 50, rateUpdatedAt: VERIFIED }));

  it('normalises netWorthEgp to +0', () => {
    expect(Object.is(result().netWorthEgp, 0)).toBe(true);
  });

  it('normalises netWorthUsd to +0', () => {
    expect(Object.is(result().netWorthUsd, 0)).toBe(true);
  });

  it('and therefore renders "0", which is what the user sees', () => {
    // A helper-level assertion alone does not catch the render: the bug is
    // Intl's, and it only appears once the number reaches the formatter.
    expect(formatAmount(result().netWorthEgp)).toBe('0');
  });

  it('while a raw -0 still renders "-0" — the tripwire proving the three above can fail', () => {
    expect(formatAmount(-0)).toBe('-0');
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

// The guard shape `account_aggregation.test.ts` puts on the sign table, applied
// to the tier allowlists for the same hazard. `resolveAccountAggregationSign`
// defaults a new `AccountType` to +1, so it joins `assetsEgp` automatically,
// while `LIQUID_TYPES` and `RESERVE_TYPES` (`dashboard.helpers.ts`) are explicit
// `Set` allowlists that would silently drop it: the sheet's assets header would
// exceed liquid + reserve, the account count would undercount, and the tier
// percentage bar would use the wrong denominator. A `Set` literal cannot carry
// an exhaustiveness annotation — a `Record` over the enum can, so a sixth member
// is a TYPE ERROR here, and the assertions below then stay red until it is
// classified into a tier for real.
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

describe('the breakdown sheet renders ONE number per account (MA-013)', () => {
  // 9.51 USD at 40.01 converts to 380.4951, whose 2 dp rounding is 380.50 — and
  // `formatAmount` renders at zero decimals, half-expand, so the two sides of
  // that rounding are 380 and 381. `computeNetWorth` rounds; before #255 chunk 1
  // these two helpers did not, and `net_worth_breakdown_sheet.tsx` renders both
  // in one view: section header 381, the card's own row 380, total-debt footer
  // 380. Delete either helper's `roundMoney` and the row assertions below go red.
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

    const { liabilitiesEgp } = amount(
      computeNetWorth({ accounts, rate: RATE, rateUpdatedAt: VERIFIED }),
    );
    const rows = computeLiabilitiesBreakdown(accounts, RATE);
    // `net_worth_breakdown_sheet.tsx:143` — the footer is a raw reduce over the
    // rows, so it inherits whatever the rows carry.
    const totalDebt = rows.reduce((sum, row) => sum + row.balanceEgp, 0);

    expect(formatAmount(liabilitiesEgp)).toBe('381');
    expect(rows.map((row) => formatAmount(row.balanceEgp))).toEqual(['381']);
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

    const { assetsEgp } = amount(
      computeNetWorth({ accounts, rate: RATE, rateUpdatedAt: VERIFIED }),
    );
    const { liquidEgp, liquidAccounts } = computeLiquidityBreakdown(accounts, RATE);

    expect(formatAmount(assetsEgp)).toBe('381');
    expect(formatAmount(liquidEgp)).toBe('381');
    expect(liquidAccounts.map((account) => formatAmount(account.balanceEgp))).toEqual(['381']);
  });

  // Rounding each value is only half the contract: ten 0.05 EGP balances are
  // each already 2 dp, and the ACCUMULATOR still lands on 0.49999999999999994.
  // `computeNetWorth` rounds its sum to 0.5 and the assets header renders "1";
  // the tier legend, reading a raw accumulator, rendered "0" directly beneath
  // it. Delete either `roundMoney` at `computeLiquidityBreakdown`'s return and
  // the matching row goes red.
  const tenAt5Piastres = (type: AccountType): Account[] =>
    Array.from({ length: 10 }, (_, i) =>
      makeAccount({ id: `${type}-${i}`, type, current_balance: 0.05 }),
    );

  it('assets: the liquid tier total is rounded, so the legend agrees with the header', () => {
    const accounts = tenAt5Piastres(AccountType.PhysicalWallet);

    const { assetsEgp } = amount(
      computeNetWorth({ accounts, rate: RATE, rateUpdatedAt: VERIFIED }),
    );
    const { liquidEgp } = computeLiquidityBreakdown(accounts, RATE);

    expect(liquidEgp).toBe(0.5);
    expect(formatAmount(assetsEgp)).toBe('1');
    expect(formatAmount(liquidEgp)).toBe('1');
  });

  it('assets: the reserve tier total is rounded on the same contract', () => {
    const accounts = tenAt5Piastres(AccountType.PhysicalSavings);

    const { assetsEgp } = amount(
      computeNetWorth({ accounts, rate: RATE, rateUpdatedAt: VERIFIED }),
    );
    const { reserveEgp } = computeLiquidityBreakdown(accounts, RATE);

    expect(reserveEgp).toBe(0.5);
    expect(formatAmount(assetsEgp)).toBe('1');
    expect(formatAmount(reserveEgp)).toBe('1');
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
