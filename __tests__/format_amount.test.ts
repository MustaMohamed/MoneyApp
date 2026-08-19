import { Currency } from '@/constants/enums';
import {
  formatAmount,
  formatCurrencyAmount,
  formatExchangeRate,
  formatWithCurrencyCode,
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

  it('formats an arbitrary currency code with default and explicit decimals', () => {
    expect(formatWithCurrencyCode(10500.5, 'GBP')).toBe('10,501 GBP');
    expect(formatWithCurrencyCode(10500.5, 'GBP', 2)).toBe('10,500.50 GBP');
  });

  it('formats the USD to EGP exchange-rate label in the compact pill form', () => {
    // spec §1.4: the label shortened from `1 USD = 48.13 EGP` so three pills
    // fit one line on N4. The 48.125 -> 48.13 rounding is unchanged; only the
    // surrounding text moved.
    expect(formatExchangeRate(48.125)).toBe('48.13 EGP/USD');
  });
});
