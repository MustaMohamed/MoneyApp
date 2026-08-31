// Own file: `jest.resetModules()` gives a cold cache; `decimals` is the only varying key.

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
    const { formatAmount } =
      require('@/utils/format_amount') as typeof import('@/utils/format_amount');

    formatAmount(1, 2);
    formatAmount(1, 2);
    formatAmount(1, 2);
    formatAmount(1, 0);
    formatAmount(1, 0);

    // Unmemoised, these 5 calls construct 5 formatters; memoised, 2 distinct keys construct 2.
    expect(constructionCount).toBe(2);
  });

  it('does not contaminate one decimals key with another when calls interleave', () => {
    const { formatAmount } =
      require('@/utils/format_amount') as typeof import('@/utils/format_amount');

    // First call per key is the cache-miss branch; the repeats are the cache-hit branch.
    expect(formatAmount(1, 0)).toBe('1');
    expect(formatAmount(1, 2)).toBe('1.00');
    expect(formatAmount(1, 0)).toBe('1');
    expect(formatAmount(1, 1)).toBe('1.0');
    expect(formatAmount(1, 2)).toBe('1.00');
  });

  it('still runs the signed-zero guard through the memoised path on a warm cache', () => {
    const { formatAmount } =
      require('@/utils/format_amount') as typeof import('@/utils/format_amount');

    formatAmount(1, 0); // warm the decimals=0 formatter before the guard cases below
    expect(formatAmount(-0.4)).toBe('0');
    expect(formatAmount(-0)).toBe('-0');
  });
});
