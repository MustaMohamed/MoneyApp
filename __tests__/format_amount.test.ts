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

describe('formatAmount — the signed-zero display guard', () => {
  // The guard's whole contract in two adjacent inputs, opposite outcomes, one line of
  // code between them. This is what stops a future reader "simplifying" the condition
  // to catch everything — see docs/adr/2026-08-21-currency-aware-display-decimals.md §2.
  it('draws the line between the domain population and the display population', () => {
    expect(formatAmount(-0)).toBe('-0'); // exact -0 is the domain's bug, not this layer's
    expect(formatAmount(-0.4)).toBe('0'); // nonzero, rounds to zero at 0dp — this layer's job
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
