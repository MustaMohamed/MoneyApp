import { TOUCH_SLOP_PIXEL_MARGIN, TouchSize, touchFloorHitSlop } from '@/constants/theme';

describe('touchFloorHitSlop', () => {
  it.each([16, 28, 34.5, 40])(
    'height %p takes equal top and bottom slop that reach the touch floor plus the pixel margin',
    (height) => {
      const { top, bottom } = touchFloorHitSlop(height);

      expect(top).toBe(bottom);
      expect(height + top + bottom).toBeCloseTo(TouchSize.min + 2 * TOUCH_SLOP_PIXEL_MARGIN, 5);
    },
  );

  it.each([44, 56])(
    'height %p at or past the touch floor still takes the pixel margin',
    (height) => {
      expect(touchFloorHitSlop(height)).toStrictEqual({
        top: TOUCH_SLOP_PIXEL_MARGIN,
        bottom: TOUCH_SLOP_PIXEL_MARGIN,
      });
    },
  );
});
