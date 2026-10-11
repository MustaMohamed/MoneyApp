import { resolveSmallButtonHeight } from '@/components/ui/button.geometry';
import {
  resolveFloatingAlertToastClearance,
  resolveLoadErrorAlertTone,
  resolveLoadErrorRetryHitSlop,
} from '@/components/ui/load_error_alert.geometry';
import { Spacing, TOUCH_SLOP_PIXEL_MARGIN, TouchSize } from '@/constants/theme';

const FONT_SCALES = [1, 2];

describe('resolveLoadErrorAlertTone', () => {
  it.each([
    ['fill', 'tint'],
    ['inline', 'tint'],
    ['bare', 'tint'],
    ['floating', 'tintOverSurface'],
  ] as const)('a tinted %s alert draws %s', (mode, tone) => {
    expect(resolveLoadErrorAlertTone(mode, true)).toBe(tone);
  });

  it.each(['fill', 'inline', 'bare', 'floating'] as const)(
    'an untinted %s alert draws plain',
    (mode) => {
      expect(resolveLoadErrorAlertTone(mode, false)).toBe('plain');
    },
  );
});

describe('resolveLoadErrorRetryHitSlop', () => {
  it.each(FONT_SCALES)(
    'a tinted sm retry at font scale %s takes a tap in a band of the touch floor',
    (fontScale) => {
      const slop = resolveLoadErrorRetryHitSlop('sm', fontScale, true);
      const height = resolveSmallButtonHeight(fontScale);
      const band = height + (slop?.top ?? 0) + (slop?.bottom ?? 0);

      expect(slop).toBeDefined();
      expect(slop?.top).toBe(slop?.bottom);
      expect(band).toBeGreaterThanOrEqual(TouchSize.min);
      expect(band).toBeCloseTo(Math.max(height, TouchSize.min) + 2 * TOUCH_SLOP_PIXEL_MARGIN, 5);
    },
  );

  it.each(FONT_SCALES)('a tinted md retry at font scale %s gets no slop', (fontScale) => {
    expect(resolveLoadErrorRetryHitSlop('md', fontScale, true)).toBeUndefined();
  });

  it.each(FONT_SCALES)('an untinted sm retry at font scale %s gets no slop', (fontScale) => {
    expect(resolveLoadErrorRetryHitSlop('sm', fontScale, false)).toBeUndefined();
  });
});

describe('resolveFloatingAlertToastClearance', () => {
  it("clears the alert's top by the frames' gap", () => {
    expect(resolveFloatingAlertToastClearance(731, 490.3)).toBeCloseTo(731 - 490.3 + Spacing.xs, 5);
  });
});
