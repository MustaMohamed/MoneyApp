import { PixelRatio } from 'react-native';
import { ms, msFont, responsiveScale } from '@/utils/responsive';

describe('responsiveScale', () => {
  it('is clamped within [0.85, 1.15]', () => {
    expect(responsiveScale).toBeGreaterThanOrEqual(0.85);
    expect(responsiveScale).toBeLessThanOrEqual(1.15);
  });
});

describe('ms', () => {
  it('ms(0) is always 0', () => {
    expect(ms(0)).toBe(0);
  });

  it('ms(n) returns Math.round(n * responsiveScale)', () => {
    expect(ms(16)).toBe(Math.round(16 * responsiveScale));
    expect(ms(24)).toBe(Math.round(24 * responsiveScale));
  });
});

describe('msFont', () => {
  it('msFont(n) snaps n * responsiveScale to the nearest physical pixel', () => {
    expect(msFont(14)).toBe(PixelRatio.roundToNearestPixel(14 * responsiveScale));
    expect(msFont(11)).toBe(PixelRatio.roundToNearestPixel(11 * responsiveScale));
  });
});
