import {
  TOUCH_SLOP_PIXEL_MARGIN,
  TouchSize,
  touchFloorHitSlop,
  touchFloorSlop,
} from '@/constants/theme';

describe('touchFloorSlop', () => {
  it('returns half the distance to the touch floor for a height under it', () => {
    expect(touchFloorSlop(40)).toBe(2);
    expect(touchFloorSlop(28)).toBe(8);
  });

  it('returns zero for a height at the touch floor', () => {
    expect(touchFloorSlop(44)).toBe(0);
  });

  it('returns zero, never a negative inset, for a height over the touch floor', () => {
    expect(touchFloorSlop(56)).toBe(0);
  });

  it.each([16, 28, 34.5, 40])(
    'height %p plus the slop on both sides reaches the touch floor',
    (height) => {
      expect(height + 2 * touchFloorSlop(height)).toBe(TouchSize.min);
    },
  );
});

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
