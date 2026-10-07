import { CURRENCY_CONFIG } from '@/constants/currency';
import { Currency } from '@/constants/enums';
import {
  MINUS_SIGN,
  PLUS_SIGN,
  formatAccountBalance,
  formatAccountBalanceParts,
  formatAmount,
  formatCurrencyAmount,
  formatCurrencyParts,
  formatCurrencyTotals,
  formatDisplayMagnitude,
  formatExchangeRate,
  formatExchangeRateSentence,
  formatLiabilityAmountParts,
  formatLiabilityRowValue,
  formatOwnedAmountParts,
  formatRateDisplayMagnitude,
  signAmountText,
} from '@/utils/format_amount';
import { roundMoney } from '@/utils/money';

describe('formatAmount', () => {
  it('formats integer with comma separator', () => {
    expect(formatAmount(10500)).toBe('10,500');
  });

  it('formats large number with multiple commas', () => {
    expect(formatAmount(1234567)).toBe('1,234,567');
  });

  it('returns "0" for zero', () => {
    expect(formatAmount(0)).toBe('0');
  });

  it('formats negative amounts', () => {
    expect(formatAmount(-5000)).toBe('-5,000');
  });

  it('formats with 2 decimal places when specified', () => {
    expect(formatAmount(10500.5, 2)).toBe('10,500.50');
  });

  it('formats with 1 decimal place', () => {
    expect(formatAmount(10500.5, 1)).toBe('10,500.5');
  });

  it('always shows exact decimal count (no rounding display)', () => {
    expect(formatAmount(5000, 2)).toBe('5,000.00');
  });
});

describe('currency amount formatting', () => {
  it('uses the configured currency decimals by default', () => {
    expect(formatCurrencyAmount(10500.5, Currency.USD)).toBe('10,500.50 USD');
  });

  it('honors an explicit currency decimal count', () => {
    expect(formatCurrencyAmount(10500.5, Currency.EGP, 1)).toBe('10,500.5 EGP');
  });

  it('formats the USD to EGP exchange-rate label in the compact pill form', () => {
    expect(formatExchangeRate(48.125)).toBe('48.13 EGP/USD');
  });

  it('formats the labelled-row long form with the same rounding as the compact pill', () => {
    expect(formatExchangeRateSentence(48.125)).toBe('1 USD = 48.13 EGP');
  });

  it('#243: formatCurrencyParts splits value and code, decimals from CURRENCY_CONFIG by default', () => {
    expect(formatCurrencyParts(10500.5, Currency.USD)).toEqual({
      value: '10,500.50',
      code: 'USD',
    });
    expect(formatCurrencyParts(10500.5, Currency.EGP)).toEqual({ value: '10,501', code: 'EGP' });
  });

  it('#243: formatCurrencyParts honors an explicit decimal count, both sides of the ?? covered', () => {
    expect(formatCurrencyParts(10500.5, Currency.EGP, 1)).toEqual({
      value: '10,500.5',
      code: 'EGP',
    });
  });

  it('#243: formatCurrencyAmount is the join of formatCurrencyParts, pinned against pre-refactor literals', () => {
    expect(formatCurrencyAmount(10500.5, Currency.USD)).toBe('10,500.50 USD');
    expect(formatCurrencyAmount(10500.5, Currency.EGP)).toBe('10,501 EGP');
    expect(formatCurrencyAmount(10500.5, Currency.EGP, 1)).toBe('10,500.5 EGP');
  });
});

describe('formatAmount — the signed-zero display guard', () => {
  it('draws the line between the domain population and the display population', () => {
    expect(formatAmount(-0)).toBe('-0'); // exact -0 is the domain's bug, not this layer's
    expect(formatAmount(-0.4)).toBe('0'); // nonzero, rounds to zero at 0dp; this layer's job
  });

  it('strips the sign from a nonzero negative that rounds to zero at display precision', () => {
    expect(formatAmount(-0.4, 0)).toBe('0');
    expect(formatAmount(-0.001, 0)).toBe('0');
    expect(formatAmount(-0.004, 2)).toBe('0.00');
    expect(formatAmount(-0.001, 2)).toBe('0.00');
    expect(formatAmount(-1e-7, 3)).toBe('0.000');
  });

  it('leaves an exact -0 visible — it is a domain defect, not this layer to repair', () => {
    expect(formatAmount(-0, 0)).toBe('-0');
    expect(formatAmount(-0, 2)).toBe('-0.00');
  });

  it('leaves a genuinely negative value, whose magnitude rounds to non-zero, byte-identical', () => {
    expect(formatAmount(-0.4, 2)).toBe('-0.40');
    expect(formatAmount(-0.01, 2)).toBe('-0.01');
    expect(formatAmount(-0.005, 2)).toBe('-0.01');
    expect(formatAmount(-0.5, 0)).toBe('-1');
    expect(formatAmount(-0.9, 0)).toBe('-1');
    expect(formatAmount(-0.001, 3)).toBe('-0.001');
    expect(formatAmount(-1234.5, 2)).toBe('-1,234.50');
    expect(formatAmount(-1, 0)).toBe('-1');
  });
});

describe('formatDisplayMagnitude', () => {
  // `isTrueZero` tests the raw value, `printsAsZero` the rendered text; they can disagree.
  it('collapses an exact zero to a bare, unsigned magnitude', () => {
    expect(formatDisplayMagnitude(0, Currency.EGP)).toEqual({ text: '0', printsAsZero: true });
  });

  it('collapses a float tie (-1e-13, income === expense) to a true, unsigned zero', () => {
    expect(formatDisplayMagnitude(-1e-13, Currency.EGP)).toEqual({ text: '0', printsAsZero: true });
  });

  it('escalates to full rounding precision when EGP 0dp display would print a nonzero value as "0"', () => {
    expect(formatDisplayMagnitude(0.4, Currency.EGP)).toEqual({
      text: '0.40',
      printsAsZero: false,
    });
    expect(formatDisplayMagnitude(-0.4, Currency.EGP)).toEqual({
      text: '0.40',
      printsAsZero: false,
    });
  });

  it('does not escalate once 0dp already prints a nonzero digit', () => {
    expect(formatDisplayMagnitude(0.6, Currency.EGP)).toEqual({ text: '1', printsAsZero: false });
  });

  it('does not escalate a half-EGP tie that already rounds to a nonzero digit', () => {
    expect(formatDisplayMagnitude(249.5, Currency.EGP)).toEqual({
      text: '250',
      printsAsZero: false,
    });
  });

  it('escalates a sub-cent raw USD magnitude to 2dp, but reports printsAsZero true — the escalation still cannot show a nonzero digit', () => {
    expect(formatDisplayMagnitude(0.001, Currency.USD)).toEqual({
      text: '0.00',
      printsAsZero: true,
    });
    expect(formatDisplayMagnitude(0.004, Currency.USD)).toEqual({
      text: '0.00',
      printsAsZero: true,
    });
  });

  it('does not escalate for USD magnitudes that already print a nonzero digit at 2dp', () => {
    expect(formatDisplayMagnitude(0.4, Currency.USD)).toEqual({
      text: '0.40',
      printsAsZero: false,
    });
    expect(formatDisplayMagnitude(0.01, Currency.USD)).toEqual({
      text: '0.01',
      printsAsZero: false,
    });
  });

  it('escalates an EGP half-cent tie under half-expand, matching USD at the same magnitude (spec row 1)', () => {
    expect(formatDisplayMagnitude(0.005, Currency.EGP)).toEqual({
      text: '0.01',
      printsAsZero: false,
    });
  });

  it('leaves the USD half-cent tie byte-identical — the direct branch was always half-expand (spec row 2)', () => {
    expect(formatDisplayMagnitude(0.005, Currency.USD)).toEqual({
      text: '0.01',
      printsAsZero: false,
    });
  });

  it("escalates a second EGP half-cent tie under half-expand, not the old banker's rounding (spec row 3)", () => {
    expect(formatDisplayMagnitude(0.025, Currency.EGP)).toEqual({
      text: '0.03',
      printsAsZero: false,
    });
  });

  it('holds the hard 2dp ceiling for a magnitude below half a cent, and reports printsAsZero true since the ceiling prints no nonzero digit (spec row 4)', () => {
    expect(formatDisplayMagnitude(0.001, Currency.EGP)).toEqual({
      text: '0.00',
      printsAsZero: true,
    });
  });

  it('reports printsAsZero true for a magnitude the 2dp escalation ceiling still cannot show a nonzero digit for, on both currencies', () => {
    expect(formatDisplayMagnitude(0.001, Currency.EGP).printsAsZero).toBe(true);
    expect(formatDisplayMagnitude(0.001, Currency.USD).printsAsZero).toBe(true);
  });
});

describe.each([
  // [rate, expectedText, expectedPrintsAsZero]
  [48.6, '48.60', false], // baseline, no escalation
  [1, '1.00', false], // RATE_PLAUSIBLE_MIN boundary, no escalation
  [0.01, '0.01', false], // exact 2dp floor, no escalation
  [0.0049, '0.005', false], // just below the printed-zero threshold, escalates one step to 3dp
  [0.005, '0.01', false], // issue's boundary value; rounds UP at the floor, not the zero bug
  [0.0005, '0.001', false], // issue's second value; escalates to 3dp
  [0.0000001, '0.0000001', false], // issue's third value; escalates to 7dp
  [0.000000001, '0.00000000', true], // ceiling (8dp) exhausted, still zero; legitimate terminal state
])('formatRateDisplayMagnitude(%p)', (rate, expectedText, expectedPrintsAsZero) => {
  it(`-> { text: '${expectedText}', printsAsZero: ${expectedPrintsAsZero} }`, () => {
    expect(formatRateDisplayMagnitude(rate)).toEqual({
      text: expectedText,
      printsAsZero: expectedPrintsAsZero,
    });
  });
});

describe.each([
  [0, 'Rate must be finite and positive: 0'],
  [-48.6, 'Rate must be finite and positive: -48.6'],
  [NaN, 'Rate must be finite and positive: NaN'],
  [Infinity, 'Rate must be finite and positive: Infinity'],
])('formatRateDisplayMagnitude(%p) throws', (rate, expectedMessage) => {
  it('throws RangeError', () => {
    expect(() => formatRateDisplayMagnitude(rate)).toThrow(RangeError);
    expect(() => formatRateDisplayMagnitude(rate)).toThrow(expectedMessage);
  });
});

describe('formatRateDisplayMagnitude composition', () => {
  it('formatExchangeRate escalates', () => {
    expect(formatExchangeRate(0.0000001)).toBe('0.0000001 EGP/USD');
  });

  it('formatExchangeRateSentence escalates', () => {
    expect(formatExchangeRateSentence(0.0005)).toBe('1 USD = 0.001 EGP');
  });
});

describe('formatCurrencyTotals', () => {
  it('renders a single currency entry with no separator', () => {
    expect(formatCurrencyTotals(new Map([[Currency.EGP, 4850]]))).toBe('4,850 EGP');
  });

  it('joins two currency entries with the shared separator, in insertion order', () => {
    expect(
      formatCurrencyTotals(
        new Map([
          [Currency.EGP, 4850],
          [Currency.USD, 100],
        ]),
      ),
    ).toBe('4,850 EGP  ·  100.00 USD');
  });

  it('renders the em dash placeholder for an empty map', () => {
    expect(formatCurrencyTotals(new Map())).toBe('—');
  });
});

describe('signAmountText — the one sign composition point (#332)', () => {
  it('MINUS_SIGN is U+2212, not the ASCII hyphen (ADR 2026-08-27 decision 3)', () => {
    expect(MINUS_SIGN.codePointAt(0)).toBe(0x2212);
    expect(MINUS_SIGN).not.toBe('-');
  });

  it('prefixes the chosen glyph onto a formatted magnitude', () => {
    expect(signAmountText('1,200 EGP', MINUS_SIGN)).toBe('−1,200 EGP');
    expect(signAmountText('50.00 USD', PLUS_SIGN)).toBe('+50.00 USD');
    expect(signAmountText('700', '')).toBe('700');
  });

  it('drops the sign when the text prints as zero', () => {
    expect(signAmountText('0', MINUS_SIGN, true)).toBe('0');
    expect(signAmountText('0.00 USD', PLUS_SIGN, true)).toBe('0.00 USD');
  });

  it('composes with formatDisplayMagnitude for both currencies', () => {
    const egp = formatDisplayMagnitude(-1200, Currency.EGP);
    expect(signAmountText(egp.text, MINUS_SIGN, egp.printsAsZero)).toBe('−1,200');
    const usd = formatDisplayMagnitude(0.001, Currency.USD);
    expect(signAmountText(usd.text, MINUS_SIGN, usd.printsAsZero)).toBe('0.00');
  });
});

// `LiabilityRow.balance` is signed: positive is owed, negative is in credit.
describe('formatLiabilityRowValue — the single composition point for a liability row (#259 C3)', () => {
  it.each([
    [500, '−500'],
    [5000, '−5,000'],
    [-500, '+500'],
    [-300, '+300'],
    [0.4, '−0.40'],
    [-0.4, '+0.40'],
    [-0, '0'],
    [0.001, '0.00'],
  ] as const)('%s -> %s', (balance, expected) => {
    expect(formatLiabilityRowValue(balance, Currency.EGP)).toBe(expected);
  });

  it('composes U+2212, never an ASCII hyphen, on an owed row', () => {
    const rendered = formatLiabilityRowValue(500, Currency.EGP);
    expect(rendered.codePointAt(0)).toBe(0x2212);
    expect(rendered).not.toContain('-');
  });

  it('agrees with the section header on the half-cent rounding case', () => {
    // 9.51 USD at 40.01 is 380.4951, rounds to 380.50, displays as 381.
    expect(formatLiabilityRowValue(roundMoney(9.51 * 40.01), Currency.EGP)).toBe('−381');
  });

  // EGP's zero decimals would print 1,500.50 as `1,500` and drop the cents; USD keeps them.
  it.each([
    [1500.5, '−1,500.50'],
    [-1500.5, '+1,500.50'],
    [500, '−500.00'],
  ] as const)('USD base: %s -> %s', (balance, expected) => {
    expect(formatLiabilityRowValue(balance, Currency.USD)).toBe(expected);
  });
});

// `amount.netWorth`/`amount.assets` and `LiquidityBreakdown.liquid`/`.reserve`/account rows are
// magnitudes the user owns (ADR decision 1): unsigned at zero/positive, `−` only if genuinely
// negative — never `+`, unlike the owed-frame liability convention above.
describe('formatOwnedAmountParts — the composition point for an owned magnitude (#332)', () => {
  // Characterization, not guard (review.md's gate rule): `formatAmount` itself is untouched by
  // this PR, so this passes identically at base and head — it documents why the fix below is
  // needed, it does not prove the fix works.
  it('characterizes the bug this function fixes: plain formatAmount(-0) prints an ASCII "-0"', () => {
    expect(formatAmount(-0)).toBe('-0');
  });

  it.each([
    [500, '500'],
    [-500, '−500'],
    [-0, '0'],
    [0, '0'],
    [0.4, '0.40'],
    [-0.4, '−0.40'],
    [0.001, '0.00'],
  ] as const)('%s -> %s', (value, expected) => {
    expect(formatOwnedAmountParts(value, Currency.EGP)).toEqual({ value: expected, code: 'EGP' });
  });

  it('composes U+2212, never an ASCII hyphen, for a genuine negative', () => {
    const { value } = formatOwnedAmountParts(-500, Currency.EGP);
    expect(value.codePointAt(0)).toBe(0x2212);
    expect(value).not.toContain('-');
  });

  it('never prefixes `+` for a positive magnitude, unlike the owed-frame convention', () => {
    expect(formatOwnedAmountParts(500, Currency.EGP).value).not.toContain('+');
  });

  it.each([
    [1500.5, '1,500.50'],
    [-1500.5, '−1,500.50'],
    // Unsigned-zero convention: an exact zero is always '0', never the currency's own decimals.
    [0, '0'],
  ] as const)('USD base: %s -> %s', (value, expected) => {
    expect(formatOwnedAmountParts(value, Currency.USD)).toEqual({ value: expected, code: 'USD' });
  });
});

describe('formatAccountBalance — the amount and its code joined, `−` only below zero, at the currency decimals', () => {
  it('leaves a positive EGP balance exactly as the shipped formatter printed it', () => {
    expect(formatAccountBalance(30000, Currency.EGP)).toBe('30,000 EGP');
    expect(formatAccountBalance(30000, Currency.EGP)).toBe(
      formatCurrencyAmount(30000, Currency.EGP),
    );
  });

  it('keeps a positive USD balance at two decimals', () => {
    expect(formatAccountBalance(1250.5, Currency.USD)).toBe('1,250.50 USD');
    expect(formatAccountBalance(1250.5, Currency.USD)).toBe(
      formatCurrencyAmount(1250.5, Currency.USD),
    );
  });

  it('#411: an overdrawn EGP balance keeps its minus at zero decimals', () => {
    expect(formatAccountBalance(-1900, Currency.EGP)).toBe(`${MINUS_SIGN}1,900 EGP`);
  });

  it('#411: an overdrawn USD balance keeps it at two decimals', () => {
    expect(formatAccountBalance(-42.5, Currency.USD)).toBe(`${MINUS_SIGN}42.50 USD`);
  });

  it('#411: the minus is U+2212, never the ASCII hyphen `Intl` emits', () => {
    expect(formatAccountBalance(-1, Currency.EGP).codePointAt(0)).toBe(0x2212);
    expect(formatAccountBalance(-1, Currency.EGP)).not.toContain('-');
    expect(formatCurrencyAmount(-1, Currency.EGP).codePointAt(0)).toBe(0x2d);
  });

  it('prints an exact zero unsigned with each currency decimals', () => {
    expect(formatAccountBalance(0, Currency.EGP)).toBe('0 EGP');
    expect(formatAccountBalance(0, Currency.USD)).toBe('0.00 USD');
  });

  it('carries no sign when a negative magnitude rounds to zero at the currency precision', () => {
    expect(formatAccountBalance(-0.4, Currency.EGP)).toBe('0 EGP');
    expect(formatAccountBalance(-0.004, Currency.USD)).toBe('0.00 USD');
  });

  it('prints an exact negative zero unsigned', () => {
    expect(formatAccountBalance(-0, Currency.EGP)).toBe('0 EGP');
  });
});

describe('formatAccountBalanceParts — the amount, the code and printsAsZero apart', () => {
  const cases = [
    { balance: 30000, currency: Currency.EGP },
    { balance: 1250.5, currency: Currency.USD },
    { balance: -1900, currency: Currency.EGP },
    { balance: -42.5, currency: Currency.USD },
  ];

  it.each(cases)(
    '$balance $currency recomposes into the shipped string',
    ({ balance, currency }) => {
      const { amount, code } = formatAccountBalanceParts(balance, currency);
      expect(`${amount} ${code}`).toBe(formatAccountBalance(balance, currency));
    },
  );

  it.each(cases)(
    '$balance $currency takes its code from the currency config',
    ({ balance, currency }) => {
      expect(formatAccountBalanceParts(balance, currency).code).toBe(
        CURRENCY_CONFIG[currency].code,
      );
    },
  );

  it('keeps the minus on the magnitude, never on the code', () => {
    const { amount, code } = formatAccountBalanceParts(-1900, Currency.EGP);
    expect(amount).toBe(`${MINUS_SIGN}1,900`);
    expect(code).not.toContain(MINUS_SIGN);
  });

  // The archive dialog gates its balance line on this, so it is part of the contract.
  it.each([
    { balance: 0.01, currency: Currency.EGP, printsAsZero: true },
    { balance: 0.01, currency: Currency.USD, printsAsZero: false },
    { balance: 0, currency: Currency.USD, printsAsZero: true },
    { balance: 0, currency: Currency.EGP, printsAsZero: true },
    { balance: -1900, currency: Currency.EGP, printsAsZero: false },
  ])('$balance $currency printsAsZero=$printsAsZero', ({ balance, currency, printsAsZero }) => {
    expect(formatAccountBalanceParts(balance, currency).printsAsZero).toBe(printsAsZero);
  });
});

describe('formatLiabilityAmountParts — the aggregate liabilities total, same owed-frame sign as a row (#332)', () => {
  it.each([
    [500, '−500'],
    [-500, '+500'],
    [-0, '0'],
  ] as const)('%s -> %s', (value, expected) => {
    expect(formatLiabilityAmountParts(value, Currency.EGP)).toEqual({
      value: expected,
      code: 'EGP',
    });
  });
});
