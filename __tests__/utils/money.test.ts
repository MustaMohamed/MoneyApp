import { roundMoney } from '@/utils/money';
import { sumAllocations, toCents, type AllocationTotals } from '@/utils/money';

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

  // The tie case, and the reason `toCents` rounds through the money layer's
  // banker's rounding instead of being a bare `Math.round(x * 100)`: that
  // literal gives 33 here and disagrees with the persisted value at every
  // exact half-cent.
  it('rounds an exact half-cent to even, not up (0.325 -> 32)', () => {
    expect(toCents(0.325)).toBe(32);
  });

  it('is idempotent on an already-rounded value', () => {
    expect(toCents(0.34)).toBe(34);
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

  // D-A5: cents never leave this function. A cents value reaching
  // `formatAmount` is a 100x display bug.
  it('reports `allocated` in whole currency units, never cents', () => {
    expect(sumAllocations([0.4], 100).allocated).toBe(0.4);
  });

  it('treats null and undefined allocations as contributing 0', () => {
    expect(sumAllocations([null, undefined, 0.05], 0.06).allocated).toBe(0.05);
  });

  // D4: order independence. Under float accumulation this fails for ~11.86%
  // of three-way triples, so the permutation set is fixed rather than random.
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
