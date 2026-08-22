import { Currency } from '@/constants/enums';
import {
  parseDecimalText,
  parseNonNegativeDecimal,
  parsePositiveDecimal,
} from '@/utils/parse_decimal';

// Layla's input-floor ruling, rows 1-13 (both currencies named for provenance —
// MIN_MONEY_AMOUNT is currency-independent, so EGP and USD share every row).
describe('parsePositiveDecimal — the MIN_MONEY_AMOUNT floor, on the raw parsed value', () => {
  it.each([
    ['0.01', Currency.EGP, 0.01], // row 1
    ['0.01', Currency.USD, 0.01], // row 2
    ['0.001', Currency.EGP, undefined], // row 3
    ['0.001', Currency.USD, undefined], // row 4
    ['0.005', Currency.EGP, undefined], // row 5 — exact-half boundary, would round to 0.00
    ['0.005', Currency.USD, undefined], // row 6
    ['0.006', Currency.EGP, undefined], // row 7 — no implicit round-up, even though roundMoney(0.006) = 0.01
    ['0.0099', Currency.EGP, undefined], // row 8
    ['0.02', Currency.EGP, 0.02], // row 9
    ['0', Currency.EGP, undefined], // row 10 — unchanged, existing behaviour
    ['-0.01', Currency.EGP, undefined], // row 11 — unchanged, DECIMAL_PATTERN has no sign
  ])('parsePositiveDecimal(%p) for %s -> %p', (value, _currency, expected) => {
    expect(parsePositiveDecimal(value)).toBe(expected);
  });
});

describe('parseNonNegativeDecimal — the same floor, with 0 preserved as a distinct state', () => {
  it.each([
    ['0', Currency.EGP, 0], // row 12
    ['0.005', Currency.EGP, undefined], // row 13
  ])('parseNonNegativeDecimal(%p) for %s -> %p', (value, _currency, expected) => {
    expect(parseNonNegativeDecimal(value)).toBe(expected);
  });
});

// The floor must not touch the parser's shape — every value below either
// fails DECIMAL_PATTERN or Number.isFinite, independent of MIN_MONEY_AMOUNT.
describe('parseDecimalText — pattern and finiteness only, no money floor', () => {
  it.each([
    ['12.', undefined], // no digits after the decimal point
    ['1e3', undefined], // exponent notation rejected
    ['0x10', undefined], // hex rejected
    ['1e-9', undefined], // exponent notation rejected
    ['Infinity', undefined],
    ['', undefined],
    ['5,000.25', 5000.25], // grouped thousands still parse
  ])('parseDecimalText(%p) -> %p', (value, expected) => {
    expect(parseDecimalText(value)).toBe(expected);
  });

  it('carries no money floor — 0.005 parses as 0.005, not undefined', () => {
    expect(parseDecimalText('0.005')).toBe(0.005);
  });
});
