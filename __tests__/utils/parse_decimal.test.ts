import { Currency } from '@/constants/enums';
import {
  parseDecimalText,
  parseNonNegativeDecimal,
  parsePositiveDecimal,
  parseRateText,
} from '@/utils/parse_decimal';

// `MIN_MONEY_AMOUNT` is currency-independent, so EGP and USD share every row.
describe('parsePositiveDecimal — the MIN_MONEY_AMOUNT floor, on the raw parsed value', () => {
  it.each([
    ['0.01', Currency.EGP, 0.01],
    ['0.01', Currency.USD, 0.01],
    ['0.001', Currency.EGP, undefined],
    ['0.001', Currency.USD, undefined],
    ['0.005', Currency.EGP, undefined], // Exact-half boundary, would round to 0.00
    ['0.005', Currency.USD, undefined],
    ['0.006', Currency.EGP, undefined], // No implicit round-up, though `roundMoney(0.006)` = 0.01
    ['0.0099', Currency.EGP, undefined],
    ['0.02', Currency.EGP, 0.02],
    ['0', Currency.EGP, undefined],
    ['-0.01', Currency.EGP, undefined], // `DECIMAL_PATTERN` has no sign
  ])('parsePositiveDecimal(%p) for %s -> %p', (value, _currency, expected) => {
    expect(parsePositiveDecimal(value)).toBe(expected);
  });
});

describe('parseNonNegativeDecimal — the same floor, with 0 preserved as a distinct state', () => {
  it.each([
    ['0', Currency.EGP, 0],
    ['0.005', Currency.EGP, undefined],
  ])('parseNonNegativeDecimal(%p) for %s -> %p', (value, _currency, expected) => {
    expect(parseNonNegativeDecimal(value)).toBe(expected);
  });
});

describe('parseDecimalText — pattern and finiteness only, no money floor', () => {
  it.each([
    ['12.', undefined],
    ['1e3', undefined],
    ['0x10', undefined],
    ['1e-9', undefined],
    ['Infinity', undefined],
    ['', undefined],
    ['5,000.25', 5000.25],
  ])('parseDecimalText(%p) -> %p', (value, expected) => {
    expect(parseDecimalText(value)).toBe(expected);
  });

  it('carries no money floor — 0.005 parses as 0.005, not undefined', () => {
    expect(parseDecimalText('0.005')).toBe(0.005);
  });
});

// A rate is not money: no floor here, magnitude safety is `transaction_amounts.ts`'s guard.
describe('parseRateText — positive, finite, no money floor', () => {
  it.each([
    ['0.005', 0.005], // Below `MIN_MONEY_AMOUNT`, accepted here unlike `parsePositiveDecimal`
    ['0', undefined],
    ['50', 50],
    ['abc', undefined],
    ['1e3', undefined],
    ['-5', undefined],
  ])('parseRateText(%p) -> %p', (value, expected) => {
    expect(parseRateText(value)).toBe(expected);
  });
});
