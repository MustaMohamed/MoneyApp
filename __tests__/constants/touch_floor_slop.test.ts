import {
  TOUCH_SLOP_PIXEL_MARGIN,
  TouchSize,
  touchFloorHitSlop,
  touchFloorHitSlopWithin,
} from '@/constants/theme';

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

describe('touchFloorHitSlopWithin', () => {
  it.each([17, 33, 36, 44])(
    'MA-236: height %p with no neighbour on either side takes touchFloorHitSlop',
    (height) => {
      expect(touchFloorHitSlopWithin(height, {})).toEqual(touchFloorHitSlop(height));
    },
  );

  it('MA-236: a 17 dp control between rooms of 8 and 12 stops at each room', () => {
    expect(touchFloorHitSlopWithin(17, { top: 8, bottom: 12 })).toEqual({ top: 8, bottom: 12 });
  });

  it('MA-236: a 33 dp control whose floor slop fits both rooms takes equal sides that reach the floor plus the margin', () => {
    const { top, bottom } = touchFloorHitSlopWithin(33, { top: 8, bottom: 12 });

    expect(top).toBe(bottom);
    expect(33 + top + bottom).toBeCloseTo(TouchSize.min + 2 * TOUCH_SLOP_PIXEL_MARGIN, 5);
  });

  it('MA-236: a 36 dp control with no room above hands its whole top slop to the bottom', () => {
    expect(touchFloorHitSlopWithin(36, { top: 0 })).toEqual({
      top: 0,
      bottom: 2 * touchFloorHitSlop(36).top,
    });
  });
});
