import { lineHeightFor } from '@/constants/theme';

describe('lineHeightFor', () => {
  it('rounds fontSize * 1.3', () => {
    expect(lineHeightFor(10)).toBe(13); // 13.0 -> 13
    expect(lineHeightFor(12)).toBe(16); // 15.6 -> 16
    expect(lineHeightFor(20)).toBe(26); // 26.0 -> 26
  });

  it('rounds half-up, matching Math.round', () => {
    // 11.5 * 1.3 = 14.95 -> 15
    expect(lineHeightFor(11.5)).toBe(15);
  });
});
