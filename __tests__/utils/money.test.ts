import { roundMoney } from '@/utils/money';

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
