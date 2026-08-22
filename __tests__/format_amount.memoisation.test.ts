// #274: formatAmount memoises its Intl.NumberFormat instances, keyed on `decimals`. Gets its
// own file so the module registry is fresh per test (jest.resetModules() + a per-test
// require) — sharing a registry with format_amount.test.ts would let one test's warm cache
// leak into another's construction count.
//
// Totality invariant this suite pins: `decimals` is the only varying constructor argument.
// format_amount.ts hardcodes the locale as the string literal 'en-US' — it is not a runtime
// input — so a `decimals`-only cache key is complete over everything the constructor varies
// on. If a locale ever becomes a parameter, this key must grow with it.

describe('formatAmount — Intl.NumberFormat memoisation', () => {
  const RealNumberFormat = Intl.NumberFormat;
  let constructionCount = 0;

  beforeEach(() => {
    jest.resetModules();
    constructionCount = 0;

    class CountingNumberFormat extends RealNumberFormat {
      constructor(...args: ConstructorParameters<typeof Intl.NumberFormat>) {
        super(...args);
        constructionCount++;
      }
    }

    Intl.NumberFormat = CountingNumberFormat as unknown as typeof Intl.NumberFormat;
  });

  afterEach(() => {
    Intl.NumberFormat = RealNumberFormat;
  });

  it('constructs one Intl.NumberFormat per distinct fraction-digit count, not per call', () => {
    const { formatAmount } = require('@/utils/format_amount') as typeof import('@/utils/format_amount');

    formatAmount(1, 2);
    formatAmount(1, 2);
    formatAmount(1, 2);
    formatAmount(1, 0);
    formatAmount(1, 0);

    // Unmemoised, 5 calls construct 5 formatters (the base behaviour this gate catches a
    // regression back to). Memoised, 2 distinct `decimals` keys construct exactly 2.
    expect(constructionCount).toBe(2);
  });

  it('does not contaminate one decimals key with another when calls interleave', () => {
    const { formatAmount } = require('@/utils/format_amount') as typeof import('@/utils/format_amount');

    // First call per key is the cache-miss branch; the repeats are the cache-hit branch —
    // both sides of the `cached !== undefined` check get exercised here.
    expect(formatAmount(1, 0)).toBe('1');
    expect(formatAmount(1, 2)).toBe('1.00');
    expect(formatAmount(1, 0)).toBe('1');
    expect(formatAmount(1, 1)).toBe('1.0');
    expect(formatAmount(1, 2)).toBe('1.00');
  });

  it('still runs the signed-zero guard through the memoised path on a warm cache', () => {
    const { formatAmount } = require('@/utils/format_amount') as typeof import('@/utils/format_amount');

    formatAmount(1, 0); // warm the decimals=0 formatter before the guard cases below
    expect(formatAmount(-0.4)).toBe('0');
    expect(formatAmount(-0)).toBe('-0');
  });
});
