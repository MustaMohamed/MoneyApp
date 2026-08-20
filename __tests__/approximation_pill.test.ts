import { AccountType, Currency } from '@/constants/enums';
import type { Account } from '@/modules/accounts/entities/account.entity';
import {
  type ApproximationPill,
  selectApproximationPill,
} from '@/modules/onboarding/domain/approximation_pill';
import {
  type StartingNetPositionInput,
  StartingNetPositionError,
} from '@/modules/onboarding/domain/starting_net_position';
import { makeTestAccount } from '@/test_helpers/transaction';
import { formatCurrencyAmount } from '@/utils/format_amount';

const RATE_VERIFIED_AT = '2026-08-01T09:00:00.000Z';

const bank = (openingBalance: number, currency: Currency = Currency.EGP): Account =>
  makeTestAccount({ type: AccountType.Bank, currency, opening_balance: openingBalance });

const sav = (openingBalance: number, currency: Currency = Currency.EGP): Account =>
  makeTestAccount({ type: AccountType.PhysicalSavings, currency, opening_balance: openingBalance });

const wal = (openingBalance: number, currency: Currency = Currency.EGP): Account =>
  makeTestAccount({ type: AccountType.SmartWallet, currency, opening_balance: openingBalance });

const cc = (openingBalance: number, currency: Currency = Currency.EGP): Account =>
  makeTestAccount({ type: AccountType.CreditCard, currency, opening_balance: openingBalance });

function approxValue(pill: ApproximationPill): number {
  if (pill.approxPill === undefined) {
    throw new Error('expected an approximation pill');
  }
  return pill.approxPill.value;
}

interface PillRow {
  case: string;
  accounts: readonly Account[];
  base: Currency;
  rate: number;
  rateUpdatedAt: string | null;
  expected: ApproximationPill;
}

// The scope spec's pill table, P1-P9 in its order, plus P10 (the pill's own -0,
// which the nine drawn rows cannot reach). Every `expected` is a LITERAL —
// nothing is recomputed through roundMoney or through the resolver.
const HIDDEN: ApproximationPill = { ratePill: undefined, approxPill: undefined };

const PILL_ROWS: readonly PillRow[] = [
  {
    case: 'P1 — two EGP accounts on an EGP base; a saved rate nothing needed earns no pill',
    accounts: [bank(48250), sav(100000)],
    base: Currency.EGP,
    rate: 48.6,
    rateUpdatedAt: RATE_VERIFIED_AT,
    expected: HIDDEN,
  },
  {
    case: 'P2 — the control: EGP base, one USD account, 105410 / 48.6',
    accounts: [bank(48250), wal(1350, Currency.USD), cc(8450)],
    base: Currency.EGP,
    rate: 48.6,
    rateUpdatedAt: RATE_VERIFIED_AT,
    expected: { ratePill: { rate: 48.6 }, approxPill: { currency: Currency.USD, value: 2168.93 } },
  },
  {
    case: 'P3 — a rate-needed outcome shows no amount pills at all',
    accounts: [bank(48250), wal(1350, Currency.USD), cc(8450)],
    base: Currency.EGP,
    rate: 50,
    rateUpdatedAt: null,
    expected: HIDDEN,
  },
  {
    case: 'P4 — a lone USD account on a USD base is not foreign',
    accounts: [wal(1350, Currency.USD)],
    base: Currency.USD,
    rate: 48.6,
    rateUpdatedAt: RATE_VERIFIED_AT,
    expected: HIDDEN,
  },
  {
    case: 'P5 — USD base converts the other way (the "hide instead of fix" catcher)',
    accounts: [bank(1000, Currency.USD), sav(4860)],
    base: Currency.USD,
    rate: 48.6,
    rateUpdatedAt: RATE_VERIFIED_AT,
    expected: { ratePill: { rate: 48.6 }, approxPill: { currency: Currency.EGP, value: 53460 } },
  },
  {
    case: 'P6 — rate-needed on a USD base',
    accounts: [bank(100)],
    base: Currency.USD,
    rate: 48.6,
    rateUpdatedAt: null,
    expected: HIDDEN,
  },
  {
    case: 'P7 — the pill sign matches the hero value (a dropped sign or a swapped direction)',
    accounts: [cc(9720), bank(100, Currency.USD)],
    base: Currency.USD,
    rate: 48.6,
    rateUpdatedAt: RATE_VERIFIED_AT,
    expected: { ratePill: { rate: 48.6 }, approxPill: { currency: Currency.EGP, value: -4860 } },
  },
  {
    case: 'P8 — a lone USD card on a USD base is still not foreign',
    accounts: [cc(173.99, Currency.USD)],
    base: Currency.USD,
    rate: 48.6,
    rateUpdatedAt: RATE_VERIFIED_AT,
    expected: HIDDEN,
  },
  {
    case: 'P9 — zero is rendered, never hidden (the falsy-zero catcher)',
    accounts: [bank(100, Currency.USD), cc(4860)],
    base: Currency.USD,
    rate: 48.6,
    rateUpdatedAt: RATE_VERIFIED_AT,
    expected: { ratePill: { rate: 48.6 }, approxPill: { currency: Currency.EGP, value: 0 } },
  },
  {
    case: 'P10 — -0.01 EGP converts to -0 USD, normalised to +0',
    accounts: [bank(1000, Currency.USD), cc(48600.01)],
    base: Currency.EGP,
    rate: 48.6,
    rateUpdatedAt: RATE_VERIFIED_AT,
    expected: { ratePill: { rate: 48.6 }, approxPill: { currency: Currency.USD, value: 0 } },
  },
];

describe('selectApproximationPill — the scope spec table, P1-P9, plus P10', () => {
  it.each(PILL_ROWS)('$case', ({ accounts, base, rate, rateUpdatedAt, expected }) => {
    // toStrictEqual, not toEqual: toEqual ignores explicitly-undefined keys, so
    // an implementation returning `{}` for a hidden pill would pass it.
    expect(
      selectApproximationPill({
        accounts,
        baseCurrency: base,
        rate,
        rateUpdatedAt,
        isManualOverride: false,
      }),
    ).toStrictEqual(expected);
  });
});

describe('selectApproximationPill — zero and negative zero', () => {
  const p9Input: StartingNetPositionInput = {
    accounts: [bank(100, Currency.USD), cc(4860)],
    baseCurrency: Currency.USD,
    rate: 48.6,
    rateUpdatedAt: RATE_VERIFIED_AT,
    isManualOverride: false,
  };

  // P10 is the row that dies when `normalizeNegativeZero` is deleted from THIS
  // function: P9's net is exactly +0, so it passes either way, while P10's net
  // is -0.01 and roundMoney(-0.01 / 48.6) is -0. The resolver's own -0 fixture
  // cannot cover this call site, and vice versa.
  const p10Input: StartingNetPositionInput = {
    accounts: [bank(1000, Currency.USD), cc(48600.01)],
    baseCurrency: Currency.EGP,
    rate: 48.6,
    rateUpdatedAt: RATE_VERIFIED_AT,
    isManualOverride: false,
  };

  it('renders the legitimate zero of row P9 rather than hiding it', () => {
    expect(Object.is(approxValue(selectApproximationPill(p9Input)), 0)).toBe(true);
  });

  it('normalises the row P10 pill value from -0 to +0', () => {
    expect(Object.is(approxValue(selectApproximationPill(p10Input)), 0)).toBe(true);
  });

  it('and therefore renders "0.00 USD"', () => {
    expect(
      formatCurrencyAmount(approxValue(selectApproximationPill(p10Input)), Currency.USD, 2),
    ).toBe('0.00 USD');
  });

  it('while a raw -0 still renders "-0.00 USD" — the tripwire proving the two above can fail', () => {
    expect(formatCurrencyAmount(-0, Currency.USD, 2)).toBe('-0.00 USD');
  });
});

describe('selectApproximationPill — currencies outside EGP | USD throw', () => {
  // Asserted here rather than inherited from the resolver's own suite: a
  // try/catch swallow added inside this wrapper would be invisible to it.
  it('throws instead of degrading into a hidden pill', () => {
    expect(() =>
      selectApproximationPill({
        accounts: [bank(1000, 'GBP' as unknown as Currency)],
        baseCurrency: Currency.EGP,
        rate: 48.6,
        rateUpdatedAt: RATE_VERIFIED_AT,
        isManualOverride: false,
      }),
    ).toThrow(StartingNetPositionError);
  });
});
