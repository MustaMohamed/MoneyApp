import { AccountType, Currency } from '@/constants/enums';
import type { Account } from '@/modules/accounts/entities/account.entity';
import {
  type ReadyFrame,
  type ReadyPill,
  selectReadySummaryState,
} from '@/modules/onboarding/domain/ready_summary_state';
import { StartingNetPositionError } from '@/modules/onboarding/domain/starting_net_position';
import { makeTestAccount } from '@/test_helpers/transaction';

const RATE_VERIFIED_AT = '2026-08-01T09:00:00.000Z';

const bank = (openingBalance: number, currency: Currency = Currency.EGP): Account =>
  makeTestAccount({ type: AccountType.Bank, currency, opening_balance: openingBalance });

const sav = (openingBalance: number, currency: Currency = Currency.EGP): Account =>
  makeTestAccount({ type: AccountType.PhysicalSavings, currency, opening_balance: openingBalance });

const wal = (openingBalance: number, currency: Currency = Currency.EGP): Account =>
  makeTestAccount({ type: AccountType.SmartWallet, currency, opening_balance: openingBalance });

const cc = (openingBalance: number, currency: Currency = Currency.EGP): Account =>
  makeTestAccount({ type: AccountType.CreditCard, currency, opening_balance: openingBalance });

interface StateRow {
  case: string;
  accounts: readonly Account[];
  base: Currency;
  rate: number;
  rateUpdatedAt: string | null;
  frame: ReadyFrame;
  accountCount: number;
  foreignCount: number;
  foreignCurrency: Currency;
  pillsVisible: boolean;
  pills: readonly ReadyPill[];
}

// Every frame with the gate CLOSED, and every `amount` frame that is also
// reachable with the gate OPEN. The gate-open rows on F4-F7 are the ones a
// frame-keyed pill array cannot satisfy: frame selection evaluates F7/F6/F5/F4
// before F2, so keying pills by frame drops the currency pills for exactly the
// account sets rows 5, 7, 9 and 11 describe.
//
// Every expected value below is a LITERAL, computed against the shipped
// roundMoney with round-then-sum in array order — never re-derived here.
const STATE_ROWS: readonly StateRow[] = [
  {
    case: '1 — F1, two EGP accounts, nothing converted',
    accounts: [bank(48250), sav(100000)],
    base: Currency.EGP,
    rate: 50,
    rateUpdatedAt: null,
    frame: 'F1',
    accountCount: 2,
    foreignCount: 0,
    foreignCurrency: Currency.USD,
    pillsVisible: false,
    pills: [
      { kind: 'accounts', count: 2, glyph: 'bank-outline' },
      { kind: 'opening-balances', count: 2 },
    ],
  },
  {
    case: '2 — F2, one USD account converted; the currency pills REPLACE opening balances',
    accounts: [bank(48250), wal(1350, Currency.USD), cc(8450)],
    base: Currency.EGP,
    rate: 48.6,
    rateUpdatedAt: RATE_VERIFIED_AT,
    frame: 'F2',
    accountCount: 3,
    foreignCount: 1,
    foreignCurrency: Currency.USD,
    pillsVisible: true,
    pills: [
      { kind: 'accounts', count: 3, glyph: 'bank-outline' },
      { kind: 'rate', rate: 48.6 },
      { kind: 'approx', currency: Currency.USD, value: 2168.93 },
    ],
  },
  {
    case: '3 — F3, the refusal; the needs-rate pill counts FOREIGN accounts, not all of them',
    accounts: [bank(48250), wal(1350, Currency.USD), cc(8450)],
    base: Currency.EGP,
    rate: 50,
    rateUpdatedAt: null,
    frame: 'F3',
    accountCount: 3,
    foreignCount: 1,
    foreignCurrency: Currency.USD,
    pillsVisible: false,
    pills: [
      { kind: 'accounts', count: 3, glyph: 'bank-outline' },
      { kind: 'needs-rate', count: 1 },
    ],
  },
  {
    case: '4 — F4, negative, gate closed',
    accounts: [bank(1000), cc(2234.56)],
    base: Currency.EGP,
    rate: 50,
    rateUpdatedAt: null,
    frame: 'F4',
    accountCount: 2,
    foreignCount: 0,
    foreignCurrency: Currency.USD,
    pillsVisible: false,
    pills: [
      { kind: 'accounts', count: 2, glyph: 'bank-outline' },
      { kind: 'opening-balances', count: 2 },
    ],
  },
  {
    case: '5 — F4 with the gate OPEN (pill table row P7): negative and converted',
    accounts: [cc(9720), bank(100, Currency.USD)],
    base: Currency.USD,
    rate: 48.6,
    rateUpdatedAt: RATE_VERIFIED_AT,
    frame: 'F4',
    accountCount: 2,
    foreignCount: 1,
    foreignCurrency: Currency.EGP,
    pillsVisible: true,
    pills: [
      { kind: 'accounts', count: 2, glyph: 'bank-outline' },
      { kind: 'rate', rate: 48.6 },
      { kind: 'approx', currency: Currency.EGP, value: -4860 },
    ],
  },
  {
    case: '6 — F5, cancels out, gate closed',
    accounts: [bank(5000), cc(5000)],
    base: Currency.EGP,
    rate: 50,
    rateUpdatedAt: null,
    frame: 'F5',
    accountCount: 2,
    foreignCount: 0,
    foreignCurrency: Currency.USD,
    pillsVisible: false,
    pills: [
      { kind: 'accounts', count: 2, glyph: 'bank-outline' },
      { kind: 'opening-balances', count: 2 },
    ],
  },
  {
    case: '7 — F5 with the gate OPEN (pill table row P9): zero and converted',
    accounts: [bank(100, Currency.USD), cc(4860)],
    base: Currency.USD,
    rate: 48.6,
    rateUpdatedAt: RATE_VERIFIED_AT,
    frame: 'F5',
    accountCount: 2,
    foreignCount: 1,
    foreignCurrency: Currency.EGP,
    pillsVisible: true,
    pills: [
      { kind: 'accounts', count: 2, glyph: 'bank-outline' },
      { kind: 'rate', rate: 48.6 },
      { kind: 'approx', currency: Currency.EGP, value: 0 },
    ],
  },
  {
    case: '8 — F6, a single account, gate closed',
    accounts: [bank(12000)],
    base: Currency.EGP,
    rate: 50,
    rateUpdatedAt: null,
    frame: 'F6',
    accountCount: 1,
    foreignCount: 0,
    foreignCurrency: Currency.USD,
    pillsVisible: false,
    pills: [
      { kind: 'accounts', count: 1, glyph: 'bank-outline' },
      { kind: 'opening-balances', count: 1 },
    ],
  },
  {
    case: '9 — F6 with the gate OPEN: a single account on the other base',
    accounts: [bank(100)],
    base: Currency.USD,
    rate: 48.6,
    rateUpdatedAt: RATE_VERIFIED_AT,
    frame: 'F6',
    accountCount: 1,
    foreignCount: 1,
    foreignCurrency: Currency.EGP,
    pillsVisible: true,
    pills: [
      { kind: 'accounts', count: 1, glyph: 'bank-outline' },
      { kind: 'rate', rate: 48.6 },
      { kind: 'approx', currency: Currency.EGP, value: 100.12 },
    ],
  },
  {
    case: '10 — F7, credit cards only; the glyph swaps',
    accounts: [cc(8450)],
    base: Currency.EGP,
    rate: 50,
    rateUpdatedAt: null,
    frame: 'F7',
    accountCount: 1,
    foreignCount: 0,
    foreignCurrency: Currency.USD,
    pillsVisible: false,
    pills: [
      { kind: 'accounts', count: 1, glyph: 'credit-card' },
      { kind: 'opening-balances', count: 1 },
    ],
  },
  {
    case: '11 — F7 with the gate OPEN: credit cards only, converted',
    accounts: [cc(4860)],
    base: Currency.USD,
    rate: 48.6,
    rateUpdatedAt: RATE_VERIFIED_AT,
    frame: 'F7',
    accountCount: 1,
    foreignCount: 1,
    foreignCurrency: Currency.EGP,
    pillsVisible: true,
    pills: [
      { kind: 'accounts', count: 1, glyph: 'credit-card' },
      { kind: 'rate', rate: 48.6 },
      { kind: 'approx', currency: Currency.EGP, value: -4860 },
    ],
  },
  {
    // The glyph is keyed off the account COMPOSITION, not off the frame: this
    // set is all credit cards AND needs a rate, and `resolveFrame` returns F3
    // before it ever tests F7. A glyph read from `frame === 'F7'` renders
    // `bank-outline` over a credit-card-only set here.
    case: '12 — F3 over a credit-card-only set; the glyph still swaps',
    accounts: [cc(1350, Currency.USD)],
    base: Currency.EGP,
    rate: 50,
    rateUpdatedAt: null,
    frame: 'F3',
    accountCount: 1,
    foreignCount: 1,
    foreignCurrency: Currency.USD,
    pillsVisible: false,
    pills: [
      { kind: 'accounts', count: 1, glyph: 'credit-card' },
      { kind: 'needs-rate', count: 1 },
    ],
  },
  {
    case: '13 — F2 with TWO foreign accounts; foreignCount is a count, not a flag',
    accounts: [bank(48250), wal(1000, Currency.USD), wal(350, Currency.USD)],
    base: Currency.EGP,
    rate: 48.6,
    rateUpdatedAt: RATE_VERIFIED_AT,
    frame: 'F2',
    accountCount: 3,
    foreignCount: 2,
    foreignCurrency: Currency.USD,
    pillsVisible: true,
    pills: [
      { kind: 'accounts', count: 3, glyph: 'bank-outline' },
      { kind: 'rate', rate: 48.6 },
      { kind: 'approx', currency: Currency.USD, value: 2342.8 },
    ],
  },
  {
    // F7 is not a single-card frame: `isCreditCardOnly` is `every`, so any
    // all-credit-card set lands here, and N3 caps nothing. This row is what the
    // caption's plural arm exists for — the frame and the glyph are unchanged
    // while `accountCount` is 2.
    case: '14 — F7 with TWO credit cards and nothing else',
    accounts: [cc(8450), cc(2000)],
    base: Currency.EGP,
    rate: 50,
    rateUpdatedAt: null,
    frame: 'F7',
    accountCount: 2,
    foreignCount: 0,
    foreignCurrency: Currency.USD,
    pillsVisible: false,
    pills: [
      { kind: 'accounts', count: 2, glyph: 'credit-card' },
      { kind: 'opening-balances', count: 2 },
    ],
  },
];

describe('selectReadySummaryState — frame selection and pill composition', () => {
  it.each(STATE_ROWS)('$case', (row) => {
    const state = selectReadySummaryState({
      accounts: row.accounts,
      baseCurrency: row.base,
      rate: row.rate,
      rateUpdatedAt: row.rateUpdatedAt,
      isManualOverride: false,
    });

    expect(state.frame).toBe(row.frame);
    expect(state.accountCount).toBe(row.accountCount);
    expect(state.foreignCount).toBe(row.foreignCount);
    expect(state.foreignCurrency).toBe(row.foreignCurrency);
    expect(state.pillsVisible).toBe(row.pillsVisible);
    expect(state.pills).toStrictEqual(row.pills);
  });
});

describe('selectReadySummaryState — the invariants the table encodes', () => {
  it('feeds one count to both pluralisation points on every gate-closed amount frame', () => {
    // The literal rows already pin both counts; this states the rule they
    // encode — `{n} accounts` and `opening balance(s)` switch on the SAME
    // number — so a row added later cannot let them drift apart.
    const gateClosedAmountRows = STATE_ROWS.filter(
      (row) => !row.pillsVisible && row.frame !== 'F3',
    );
    expect(gateClosedAmountRows).toHaveLength(6);

    for (const row of gateClosedAmountRows) {
      const state = selectReadySummaryState({
        accounts: row.accounts,
        baseCurrency: row.base,
        rate: row.rate,
        rateUpdatedAt: row.rateUpdatedAt,
        isManualOverride: false,
      });
      const [accountsPill, openingBalancesPill] = state.pills;
      expect(accountsPill).toHaveProperty('count', row.accountCount);
      expect(openingBalancesPill).toHaveProperty('count', row.accountCount);
    }
  });

  it('renders row 7 zero approximation as +0, not a falsy hole', () => {
    const state = selectReadySummaryState({
      accounts: [bank(100, Currency.USD), cc(4860)],
      baseCurrency: Currency.USD,
      rate: 48.6,
      rateUpdatedAt: RATE_VERIFIED_AT,
      isManualOverride: false,
    });
    const approxPill = state.pills[2];
    if (approxPill.kind !== 'approx') {
      throw new Error('expected an approximation pill in third position');
    }
    expect(Object.is(approxPill.value, 0)).toBe(true);
  });

  it('carries the resolver outcome through untouched', () => {
    expect(
      selectReadySummaryState({
        accounts: [bank(48250), sav(100000)],
        baseCurrency: Currency.EGP,
        rate: 50,
        rateUpdatedAt: null,
        isManualOverride: false,
      }).outcome,
    ).toStrictEqual({ kind: 'amount', value: 148250 });
  });
});

describe('selectReadySummaryState — currencies outside EGP | USD throw', () => {
  // This function composes both wrappers, so a swallow added in either is
  // invisible without an assertion at this level too.
  it('throws rather than composing a frame out of an unsupported currency', () => {
    expect(() =>
      selectReadySummaryState({
        accounts: [bank(1000, 'GBP' as unknown as Currency)],
        baseCurrency: Currency.EGP,
        rate: 48.6,
        rateUpdatedAt: RATE_VERIFIED_AT,
        isManualOverride: false,
      }),
    ).toThrow(StartingNetPositionError);
  });
});
