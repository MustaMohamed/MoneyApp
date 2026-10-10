import { Currency } from '@/constants/enums';
import { formatDisplayMagnitude } from '@/utils/format_amount';
import { roundMoney } from '@/utils/money';
import {
  compareGapToPoints,
  compareToPercent,
  exceedsToCent,
  ratioHeldAtTie,
  snapToZero,
  sumAllocations,
  toCents,
  wholePercent,
  wholePercentGap,
  wholePercentOf,
  type AllocationTotals,
} from '@/utils/money';

describe('roundMoney', () => {
  describe('non-half cases (standard rounding)', () => {
    it('rounds 1.234 down to 1.23', () => {
      expect(roundMoney(1.234)).toBe(1.23);
    });

    it('rounds 1.236 up to 1.24', () => {
      expect(roundMoney(1.236)).toBe(1.24);
    });

    it('passes integers through', () => {
      expect(roundMoney(100)).toBe(100);
    });

    it('passes 2-dp values through', () => {
      expect(roundMoney(1.23)).toBe(1.23);
    });
  });

  describe('exact-half banker (round-half-even)', () => {
    it('rounds 0.005 to 0.00 (truncated 0 is even)', () => {
      expect(roundMoney(0.005)).toBe(0.0);
    });

    it('rounds 0.015 to 0.02 (truncated 1 is odd)', () => {
      expect(roundMoney(0.015)).toBe(0.02);
    });

    it('rounds 0.025 to 0.02 (truncated 2 is even)', () => {
      expect(roundMoney(0.025)).toBe(0.02);
    });

    it('rounds 0.035 to 0.04 (truncated 3 is odd)', () => {
      expect(roundMoney(0.035)).toBe(0.04);
    });
  });

  describe('cross-currency conversion examples', () => {
    it('rounds 100 EGP / 30.503 USD rate to 3.28 USD', () => {
      expect(roundMoney(100 / 30.503)).toBe(3.28);
    });

    it('rounds 50 USD × 50.75 EGP rate to 2537.50 EGP', () => {
      expect(roundMoney(50 * 50.75)).toBe(2537.5);
    });
  });

  describe('negative numbers', () => {
    it('rounds -1.236 to -1.24', () => {
      expect(roundMoney(-1.236)).toBe(-1.24);
    });

    it('rounds -0.015 to -0.02 (truncated -1 is odd magnitude)', () => {
      expect(roundMoney(-0.015)).toBe(-0.02);
    });
  });

  describe('null passthrough (Layla row 26)', () => {
    it('passes null through unchanged, not 0', () => {
      expect(roundMoney(null)).toBe(null);
    });
  });

  describe('MIN_MONEY_AMOUNT boundary sanity (Layla row 27)', () => {
    it('rounds 0.01 to 0.01 (unchanged)', () => {
      expect(roundMoney(0.01)).toBe(0.01);
    });
  });
});

describe('toCents', () => {
  it.each([
    [0.1, 10],
    [0.2, 20],
    [0, 0],
    [100, 10000],
    [0.335, 34],
    [0.015, 2],
  ])('converts %p to %p cents', (input, expected) => {
    expect(toCents(input)).toBe(expected);
  });

  // A bare `Math.round(x * 100)` gives 33 here and disagrees with the persisted value.
  it('rounds an exact half-cent to even, not up (0.325 -> 32)', () => {
    expect(toCents(0.325)).toBe(32);
  });

  it('is idempotent on an already-rounded value', () => {
    expect(toCents(0.34)).toBe(34);
  });
});

// 0.1 + 0.2 is 0.30000000000000004: one float step past 0.3, the leftover a sum of cents leaves.
describe('snapToZero', () => {
  const UNDER_HALF_A_CENT = [0.3 - (0.1 + 0.2), 0.1 + 0.2 - 0.3, 0.004, -0.004, -0];
  const KEPT = [0.005, -0.005, 0.3, -0.3];

  it.each(UNDER_HALF_A_CENT)('returns positive zero for %p', (value) => {
    expect(Object.is(snapToZero(value), 0)).toBe(true);
  });

  it.each(KEPT)('returns %p unchanged', (value) => {
    expect(snapToZero(value)).toBe(value);
  });

  describe.each([Currency.EGP, Currency.USD])('against the %s formatter', (currency) => {
    it.each([...UNDER_HALF_A_CENT, ...KEPT])(
      'is zero for %p exactly when the formatter prints it as zero',
      (value) => {
        expect(snapToZero(value) === 0).toBe(formatDisplayMagnitude(value, currency).printsAsZero);
      },
    );
  });
});

describe('exceedsToCent', () => {
  it.each([
    [0.1 + 0.2, 0.3, false],
    [0.31, 0.3, true],
    [0.3, 0.3, false],
    [5.5e-17, 0, false],
    [0.01, 0, true],
  ] as const)('%p over a limit of %p is %p', (amount, limit, expected) => {
    expect(exceedsToCent(amount, limit)).toBe(expected);
  });
});

describe('ratioHeldAtTie', () => {
  it('holds a part that ties its whole to the cent at exactly 1', () => {
    expect(ratioHeldAtTie(0.1 + 0.2, 0.3)).toBe(1);
  });

  it('stays above 1 for a part over its whole to the cent', () => {
    expect(ratioHeldAtTie(0.31, 0.3)).toBeGreaterThan(1);
  });

  it('never rounds a quotient at or below 1 to cents', () => {
    expect(ratioHeldAtTie(0.7 + 0.1, 1)).toBe(0.7999999999999999);
    expect(ratioHeldAtTie(500, 10000)).toBe(0.05);
  });

  it('is 0 when the whole is 0', () => {
    expect(ratioHeldAtTie(5, 0)).toBe(0);
  });
});

describe('sumAllocations', () => {
  it('accepts a sum that only float accumulation puts over the total', () => {
    expect(sumAllocations([0.01, 0.05], 0.06).isOver).toBe(false);
  });

  it('accepts sub-cent allocations that round down to the total', () => {
    expect(sumAllocations([0.5049, 0.5049], 1).isOver).toBe(false);
  });

  it('rejects allocations that round up past the total', () => {
    expect(sumAllocations([0.335, 0.335, 0.33], 1).isOver).toBe(true);
  });

  it('reports no buffer and no overage when the total is not yet entered', () => {
    expect(sumAllocations([0.4], undefined)).toEqual({
      allocated: 0.4,
      buffer: undefined,
      isOver: false,
    });
  });

  // A cents value reaching `formatAmount` is a 100x display bug.
  it('reports `allocated` in whole currency units, never cents', () => {
    expect(sumAllocations([0.4], 100).allocated).toBe(0.4);
  });

  it('treats null and undefined allocations as contributing 0', () => {
    expect(sumAllocations([null, undefined, 0.05], 0.06).allocated).toBe(0.05);
  });

  // Fixed permutations, not random: float accumulation fails ~11.86% of three-way triples.
  it('is order-independent across every permutation of the same allocations', () => {
    const permutations: number[][] = [
      [0.335, 0.12, 0.5049],
      [0.335, 0.5049, 0.12],
      [0.12, 0.335, 0.5049],
      [0.12, 0.5049, 0.335],
      [0.5049, 0.335, 0.12],
      [0.5049, 0.12, 0.335],
    ];
    const expected: AllocationTotals = { allocated: 0.96, buffer: 0.04, isOver: false };

    for (const amounts of permutations) {
      expect(sumAllocations(amounts, 1)).toEqual(expected);
    }
  });
});

// (145 / 1000) * 100 is 14.499999999999998: a half that a float quotient rounds down.
describe('wholePercent', () => {
  it.each([
    [145, 1_000, 15],
    [-145, 1_000, -15],
    [5, 0, 0],
    [0.1 + 0.2, 0.3, 100],
  ])('%p of %p is %p', (part, whole, expected) => {
    expect(wholePercent(part, whole)).toBe(expected);
  });

  it('returns positive zero, never -0, for a size under a half below zero', () => {
    expect(Object.is(wholePercent(-4, 1_000), 0)).toBe(true);
  });
});

describe('wholePercentOf', () => {
  it.each([
    [23, 40, 58],
    [29, 200, 15],
    [5, 0, 0],
  ])('%p of %p is %p', (numerator, denominator, expected) => {
    expect(wholePercentOf(numerator, denominator)).toBe(expected);
  });
});

describe('wholePercentGap', () => {
  it.each([
    [105, 1],
    [95, -1],
  ])('%p spent of 1,000 on day 3 of 30 is %p points from pace', (part, expected) => {
    expect(wholePercentGap({ part, whole: 1_000, elapsed: 3, span: 30 })).toBe(expected);
  });

  it('returns positive zero, never -0, for a gap whose size rounds to 0', () => {
    expect(Object.is(wholePercentGap({ part: 104, whole: 1_000, elapsed: 3, span: 30 }), 0)).toBe(
      true,
    );
  });

  it('reads a whole of 0 cents as a share of 0, the elapsed share under pace', () => {
    expect(wholePercentGap({ part: 50, whole: 0, elapsed: 3, span: 30 })).toBe(-10);
  });
});

// 2399.2 / 2999 is 0.7999999999999999 and 1110.6 / 1234 is 0.8999999999999999.
describe('compareToPercent', () => {
  it.each([
    [2399.2, 2999, 80, 0],
    [1110.6, 1234, 90, 0],
    [79.96 + 0.02 + 0.02, 100, 80, 0],
    [2399.19, 2999, 80, -1],
    [2399.21, 2999, 80, 1],
    [5, 0, 80, -1],
  ])('%p of %p against %p percent is %p', (part, whole, percent, expected) => {
    expect(compareToPercent(part, whole, percent)).toBe(expected);
  });
});

describe('compareGapToPoints', () => {
  it.each([
    [200, 0],
    [199.99, -1],
    [200.01, 1],
  ])('%p spent of 1,000 on day 3 of 30 against 10 points is %p', (part, expected) => {
    expect(compareGapToPoints({ part, whole: 1_000, elapsed: 3, span: 30 }, 10)).toBe(expected);
  });

  it('is -1 when the whole is 0 cents', () => {
    expect(compareGapToPoints({ part: 50, whole: 0, elapsed: 3, span: 30 }, 10)).toBe(-1);
  });
});
