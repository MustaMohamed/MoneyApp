import { Currency } from '@/constants/enums';
import {
  formatAmount,
  formatCurrencyAmount,
  formatCurrencyParts,
  formatCurrencyTotals,
  formatDisplayMagnitude,
  formatExchangeRate,
  formatExchangeRateSentence,
} from '@/utils/format_amount';

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
