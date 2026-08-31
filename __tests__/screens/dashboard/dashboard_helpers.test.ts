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

// Time is an input, never `new Date()`. The gate reads only whether this marker
// is null — a non-null value means a fetch or a manual save actually wrote this
// rate. The other provenance source, `isManualOverride`, is false on every row
// of the table below and has its own describe further down.
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
  /**
   * A row field rather than a constant in the driver, so the table can carry
   * both bases. The pre-existing rows all state `Currency.EGP` and keep
   * byte-identical `expected` values, which is scenario 25's whole claim: under
   * an EGP base the resolver's new body is behaviour-identical. Required, with
   * no default — a driver-side `?? Currency.EGP` would be exactly the default
   * spec §7 forbids.
   */
  baseCurrency: Currency;
  rate: number;
  rateUpdatedAt: string | null;
  expected: DashboardNetWorth;
}

// Every `expected` is a LITERAL: nothing here is re-derived through `roundMoney`
// or through `computeNetWorth` itself, because an assertion built from the code
// under test cannot fail. Mirrors the shape of
// `__tests__/starting_net_position.test.ts`'s resolver table.
//
// The base is now a ROW field, and the two halves of the table are there to be
// read against each other. Every row down to the spread states `Currency.EGP`
// and keeps the `expected` value it had before `computeNetWorth` took a base at
// all — under an EGP base the new body is behaviour-identical, and that is the
// claim. The USD-base block after the spread is the new behaviour, and it is
// where the direction flips: under EGP a USD balance MULTIPLIES and the foreign
// fields divide; under USD an EGP balance DIVIDES and the foreign fields
// multiply.
//
// EVERY row states `rateUpdatedAt` explicitly, including the rows that do not
// need a rate: three of them carry `null` and still expect an amount, so
// deleting the `foreignCount >= 1 &&` conjunct from the gate turns all three red
// instead of leaving the suite green over a refusal nobody asked for.
const NET_WORTH_ROWS: readonly NetWorthRow[] = [
  {
    // Row 1 keeps its USD numbers because its marker is VERIFIED — which is what
    // makes `assetsForeign: 200` legitimate rather than a rate-50 guess asserted
    // inside the suite meant to forbid guesses.
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
    // The largest affected population: a fresh install that has never fetched a
    // rate. The EGP total is stated normally; the ~USD equivalent is ABSENT, not
    // a placeholder-rate guess. Populate `assetsForeign` from `rate` unconditionally
    // and only this row and the two below it fail — repo policy forbids catching
    // it in a render test, so if this table does not catch it nothing does.
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
    // `1000 + roundMoney(500 * 50)`, so this row reports `assets` and
    // `netWorth` of 26000 against 1000 expected. It is INSENSITIVE to
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
    // The conversion and the sign land on the SAME account here, and nowhere
    // else in this table. Cards otherwise appear only in EGP and USD only in
    // wallets, so a body reading `currency === USD && type !== CreditCard`
    // passes every other row. No two fields of this row collide either: a missed
    // conversion gives netWorth 4900, a flipped sign 9860.
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
    // The ORDER is what produces the residue: 0.30 − 0.10 − 0.20 summed in
    // array order is -2.7755575615628914e-17, whose roundMoney is -0. A body
    // that grouped or sorted the rows first, or that derived netWorth as
    // assets − liabilities, would make this row a tautology — so
    // "accumulate in array order" is part of the contract.
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
    // A refusal member hardcoding `foreignCount: 1` survives every other row.
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
    // Same outcome as the null-marker rows, different cause: the marker is
    // present and the number itself is unusable.
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

  // ─── USD base ──────────────────────────────────────────────────────────────
  // Everything below is a user who chose USD at N1. `48.85` is the shared rate:
  // 4885 EGP is exactly 100.00 USD at it, which is what lets the round-trip rows
  // assert an exact figure rather than a rounded one.
  {
    // THE BUG, as one row. Two USD accounts under a USD base need no conversion,
    // so the placeholder rate is irrelevant — yet before this ticket the gate
    // compared every account against a hardcoded EGP and refused a total the
    // portfolio never needed a rate for. `rateUpdatedAt: null` and
    // `isManualOverride: false` are the fresh install; revert the base to a
    // hardcoded EGP and this row alone reports `rate-needed`.
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
      // The rate is unusable, so the EGP equivalent is absent — the same second
      // question the EGP-base rows above ask, with the currencies swapped.
      assetsForeign: undefined,
      netWorthForeign: undefined,
    },
  },
  {
    // The mirror of the row above, and what keeps it honest: under a USD base an
    // EGP account IS foreign, so the refusal still fires. A body that dropped
    // the gate rather than re-pointing it would pass the row above and fail here.
    case: 'USD base, one EGP bank, no usable rate — still refused, because EGP is now the foreign side',
    accounts: [makeAccount({ current_balance: 1000 })],
    rate: 50,
    rateUpdatedAt: null,
    baseCurrency: Currency.USD,
    expected: { kind: 'rate-needed', foreignCount: 1 },
  },
  {
    // The divide branch, on a fixture that round-trips exactly: 4885 / 48.85 is
    // 100 with no residue, and 100 × 48.85 is 4885 back. A body that multiplied
    // here — the direction this function had for its whole life — would report
    // 238,632.25.
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
    // Round-then-sum, on the divide side. 100 / 48.85 is 2.0470829…, which
    // rounds to 2.05, so two of them are 4.10. Sum-then-convert is 200 / 48.85 =
    // 4.0942…, which rounds to 4.09 — the round-then-sum rule's first fixture
    // under a divide, and it fails by a cent rather than not at all.
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
    // The single-conversion pin, and the only row that separates it from a
    // second per-account pass. Three 2.05 values: converting the 6.15 total once
    // gives 300.4275 → 300.43, while converting each account again and summing
    // gives 300.42. One cent, and nothing else in the suite reaches it.
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
    // The first half-cent tie on a DIVIDE anywhere in this suite: 45.01 / 2 is
    // exactly 22.505, and banker's rounding takes the even cent, 22.50. Half-up
    // would give 22.51. The multiply side has had this coverage since #255; the
    // divide side had none until the branch existed.
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
    // The sign path under a divide. Both accounts convert, and the card is
    // subtracted after its own conversion — a body that signed before converting
    // would still land on -100 here, but one that skipped the card's conversion
    // reports -9670.
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
    // Spec §3B, the shared mixed-portfolio fixture, and the ONLY row mixing an
    // identity-pair account (the USD bank, which must not be touched by the
    // rate) with converted ones. Its two foreign figures are the numbers the two
    // `≈` sites render, and they are DIFFERENT on purpose: 17,097.50 is the
    // hero card's, which shows ASSETS, and 12,212.50 is the breakdown sheet's,
    // which shows NET WORTH. Making them agree compiles. It is wrong.
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
    // The arithmetic half of the rate-plausibility scenario, which lives here
    // rather than in the plausibility suite: a rate far outside `[1, 1000]` is
    // FLAGGED at the field and never clamped or substituted, so this resolver
    // divides by 0.0001 exactly as stored. 1 EGP at 0.0001 EGP/USD is 10,000
    // USD — absurd, and asserted precisely because the warning changes no value.
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
  // `toStrictEqual`, not `toEqual`: an ABSENT `assetsForeign` key must not be
  // silently equal to an explicit `undefined` one, because the union declares
  // both USD fields as present-and-possibly-undefined.
  //
  // Every row in this table is a NON-override rate, stated here once rather than
  // on each row: the table enumerates the arithmetic and the refusal, and
  // the provenance disjunction `isRateUsable` owns — marker OR override — has
  // its own four-row table in `__tests__/accounts/account_aggregation.test.ts`
  // plus the two resolver-level rows in the describe below this one. Hardcoding
  // `false` here is what keeps the null-marker rows above meaningful: with
  // `true` they would all state amounts and the refusal rows would go green for
  // the wrong reason.
  it.each(NET_WORTH_ROWS)('$case', ({ accounts, baseCurrency, rate, rateUpdatedAt, expected }) => {
    expect(
      computeNetWorth({ accounts, baseCurrency, rate, rateUpdatedAt, isManualOverride: false }),
    ).toStrictEqual(expected);
  });

  // RETIRED here: `it('returns netWorthForeign=0 when rate=0 to avoid division by
  // zero')`, which asserted the contract this ticket reverses. What it guarded —
  // the `rate > 0 ? value / rate : 0` fallback — no longer exists. What replaces
  // it is NOT a refusal: its fixture was a single EGP bank account at rate 0, so
  // `foreignCount` is 0, nothing needs converting, and the outcome is an amount
  // (`assets: 5000`, `netWorth: 5000`) whose `assetsForeign` and `netWorthForeign`
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
          baseCurrency: Currency.EGP,
          rate: 48.6,
          rateUpdatedAt: VERIFIED,
          isManualOverride: false,
        }),
      ).toThrow(AccountAggregationError);
    });

    // The base is asserted SEPARATELY from the account currencies, and this row
    // is the only thing holding that assert in place. On the refusal path
    // nothing else validates it: an unsupported base makes every account count
    // as foreign, so with an unusable rate the function returns at
    // `dashboard.helpers.ts:84`, before `convertCurrency` or `foreignCurrencyFor`
    // ever see the base. Delete the `assertSupportedCurrency(baseCurrency)` at
    // `:67` and this fixture returns `{ kind: 'rate-needed', foreignCount: 1 }` —
    // no throw, no wrong number, nothing downstream left to notice.
    // `resolveStartingNetPosition:106` asserts the base for the same reason.
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

    // The guard used to ask `CURRENCY_LOOKUP[currency] !== undefined`, which
    // resolves through the prototype chain: `constructor` is a member of
    // `Object.prototype`, so a row carrying it passed the guard and was summed
    // as an EGP balance.
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
  // The pre-#85 manual user, at the resolver that decides what the dashboard
  // shows: they saved 48 themselves, `usd_rate_manual_override` is 'true', and
  // no `usd_rate_updated_at` row was ever written because that key did not exist
  // yet. `shouldRefreshRate` returns false for an override, so nothing repairs
  // it — the refusal is permanent, and Settings shows them their own 48 the
  // whole time (ADR 2026-08-19 §4).
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
    // The same 48, the same accounts, override false. This is the row that keeps
    // the widening honest: what changed the answer above is the provenance, not
    // the number.
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
  // Two independent -0 sites, and neither one's zero reaches the other (ADR
  // 2026-08-18 §4), so both need their own assertion: the netWorth
  // accumulator lands on -2.7755575615628914e-17, and netWorthForeign divides that
  // RAW accumulator by the rate to -5.551115123125783e-19. roundMoney maps both
  // to -0. Divide the already-normalised netWorth instead and the second
  // assertion below can never fail.
  //
  // The marker must be VERIFIED, or `netWorthForeign` is `undefined` and the second
  // assertion becomes vacuous rather than falsifiable — the same trap, one level
  // up, as dividing the normalised value.
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
    // A helper-level assertion alone does not catch the render: the bug is
    // Intl's, and it only appears once the number reaches the formatter.
    expect(formatAmount(result().netWorth)).toBe('0');
  });

  it('while a raw -0 still renders "-0" — the tripwire proving the three above can fail', () => {
    expect(formatAmount(-0)).toBe('-0');
  });
});

// The same cancelling portfolio under the OTHER base, where the reciprocal
// MULTIPLIES instead of dividing: the raw netWorth accumulator
// -2.7755575615628914e-17 becomes -1.3877787807814457e-15, which roundMoney
// still maps to -0. Under a divide the residue shrinks and under a multiply it
// grows, so the guard reaching the foreign figure needs a fixture on each side;
// the EGP-base describe above only ever exercised the divide.
//
// **Assert with `Object.is`, not `toBe`.** Probed at jest 29.7.0, both
// `expect(-0).toBe(0)` and `expect(-0).toEqual(0)` already fail, so either
// matcher would catch a raw -0 here — `Object.is` is what states the intent the
// other two only imply, and it survives a matcher swap.
//
// This describe pins `normalizeNegativeZero` reaching the foreign figure, and
// nothing else. It does NOT pin the raw-vs-normalised conversion input: that
// rule is black-box unfalsifiable (measured at P5) and lives in the
// `dashboard.helpers.ts` comment above the two conversions.
describe('computeNetWorth — negative zero under a USD base, where the reciprocal multiplies', () => {
  // Array ORDER is load-bearing, exactly as in the EGP-base describe: 0.30
  // − 0.10 − 0.20 accumulated in this order is what produces the residue.
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
    // 0.30 USD at 50 is the 15.00 EGP the bank account actually holds — the
    // round trip, which a wrong direction would render as 0.01.
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

// The guard shape `account_aggregation.test.ts` puts on the sign table, applied
// to the tier allowlists for the same hazard. `resolveAccountAggregationSign`
// defaults a new `AccountType` to +1, so it joins `assets` automatically,
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

  // #259 C6 / S7: `shouldShowProportionBar` pins the pure predicate on its own
  // fixtures (net_worth_breakdown_sheet.helpers.test.ts); this is the
  // real-path proof that a sub-1.0 rate can actually collapse both parts to
  // zero through this function's own rounding, not just in a hand-built parts
  // object.
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

// Spec §3B under a USD base, the same four accounts the `computeNetWorth` row
// above uses. The point is that all three resolvers agree on one portfolio:
// 150 + 200 liquid/reserve against that row's `assets: 350`, and one liability
// row of 100 against its `liabilities: 100`. A breakdown still converting into
// EGP while the headline converts into USD is the drift this pins — and it
// renders as two currencies on one sheet, three lines apart.
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

    // 4885 EGP divides to 100.00 and the USD bank's 50.00 passes through
    // untouched — the identity pair inside a converting fold.
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
    // Intl's ASCII hyphen, pre-existing shape (the header reads this same
    // field today) — the glyph is #332's, out of scope here (spec §7, S5b).
    expect(liabilities).toBe(-300);
    expect(formatAmount(liabilities)).toBe('-300');
  });
});

// #259 C7 / tariq F1: neither helper takes a provenance gate, and this pins
// why that is safe. An EGP-only accounts set has nothing to convert, so
// `rate` is arithmetically inert for it — the same output at a plausible
// rate and at one three orders of magnitude smaller. If either helper ever
// grows a rate gate, this reds.
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
    // The component footer now renders `netWorth.liabilities` directly —
    // the `net_worth_breakdown_sheet.tsx` reduce this mirrored is deleted
    // (#259 C5). This reduce is no longer a mirror of component code: it is
    // the suite's OWN rows-sum-to-header agreement check (MA-013), proving the
    // rows and the header total agree independently of how the header itself
    // is computed.
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

  // MA-016 P8 F-2 (@sarah's ratified condition): the ADR's worked example (b) — the
  // commitments header total over its own rows, the ticket's gate-deciding accepted
  // approximation — was published as "measured" without a companion assertion. This is
  // that assertion. See docs/adr/2026-08-21-currency-aware-display-decimals.md §1.
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
