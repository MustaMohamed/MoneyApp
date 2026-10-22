import { resolveGridItemHitSlop } from '@/components/ui/touch_floor.geometry';
import { TOUCH_SLOP_PIXEL_MARGIN, TouchSize, touchFloorHitSlop } from '@/constants/theme';

const PILL_GAP = 6;
const PICKER_GAP = 8;
const OPTION_LIST_EDGE = { top: 0, bottom: 12 };
const OPTION_PILL_HEIGHT = 29.33;
const ROW_PITCH = OPTION_PILL_HEIGHT + PILL_GAP;

describe('resolveGridItemHitSlop', () => {
  it('MA-236: an unmeasured box takes half the gap on every side, with or without a minimum slop', () => {
    const half = { top: 3, bottom: 3, left: 3, right: 3 };

    expect(resolveGridItemHitSlop(undefined, undefined, PILL_GAP, OPTION_LIST_EDGE)).toEqual(half);
    expect(
      resolveGridItemHitSlop({ y: 0, height: 29 }, undefined, PILL_GAP, OPTION_LIST_EDGE),
    ).toEqual(half);
    expect(
      resolveGridItemHitSlop(
        undefined,
        { minY: 0, maxY: ROW_PITCH },
        PILL_GAP,
        OPTION_LIST_EDGE,
        touchFloorHitSlop(25),
      ),
    ).toEqual(half);
  });

  it('MA-236: an inner 29 dp pill 6 dp from its neighbours takes 3 on every side', () => {
    expect(
      resolveGridItemHitSlop(
        { y: ROW_PITCH, height: 29 },
        { minY: 0, maxY: 2 * ROW_PITCH },
        PILL_GAP,
        OPTION_LIST_EDGE,
      ),
    ).toEqual({ top: 3, bottom: 3, left: 3, right: 3 });
  });

  it('MA-236: in a two-row list the top row takes the edge room above and the bottom row the edge room below', () => {
    const rows = { minY: 0, maxY: ROW_PITCH };

    expect(
      resolveGridItemHitSlop(
        { y: 0, height: OPTION_PILL_HEIGHT },
        rows,
        PILL_GAP,
        OPTION_LIST_EDGE,
      ),
    ).toEqual({ top: 0, bottom: 3, left: 3, right: 3 });
    expect(
      resolveGridItemHitSlop(
        { y: ROW_PITCH, height: OPTION_PILL_HEIGHT },
        rows,
        PILL_GAP,
        OPTION_LIST_EDGE,
      ),
    ).toEqual({ top: 3, bottom: 12, left: 3, right: 3 });
  });

  it('MA-236: in a one-row list a pill takes both edge rooms', () => {
    expect(
      resolveGridItemHitSlop(
        { y: 0, height: OPTION_PILL_HEIGHT },
        { minY: 0, maxY: 0 },
        PILL_GAP,
        OPTION_LIST_EDGE,
      ),
    ).toEqual({ top: 0, bottom: 12, left: 3, right: 3 });
  });

  it('MA-236: a bottom-row 25 dp pill with no neighbour below stops at half the gap above and reaches the floor below', () => {
    const height = 25;
    const { top, bottom } = resolveGridItemHitSlop(
      { y: height + PICKER_GAP, height },
      { minY: 0, maxY: height + PICKER_GAP },
      PICKER_GAP,
      { top: 0 },
    );

    expect(top).toBe(PICKER_GAP / 2);
    expect(height + top + bottom).toBeCloseTo(TouchSize.min + 2 * TOUCH_SLOP_PIXEL_MARGIN, 5);
  });

  describe('with a minimum slop', () => {
    const minSlop = touchFloorHitSlop(25);
    const height = 37;
    const pitch = height + PICKER_GAP;

    it('MA-236: a 37 dp pill in a one-row list with no neighbours takes the minimum slop', () => {
      const slop = resolveGridItemHitSlop(
        { y: 0, height },
        { minY: 0, maxY: 0 },
        PICKER_GAP,
        {},
        minSlop,
      );

      expect(slop.top).toBe(minSlop.top);
      expect(slop.bottom).toBe(minSlop.bottom);
    });

    it('MA-236: an inner pill still stops at half the gap', () => {
      expect(
        resolveGridItemHitSlop(
          { y: pitch, height },
          { minY: 0, maxY: 2 * pitch },
          PICKER_GAP,
          {},
          minSlop,
        ),
      ).toEqual({
        top: PICKER_GAP / 2,
        bottom: PICKER_GAP / 2,
        left: PICKER_GAP / 2,
        right: PICKER_GAP / 2,
      });
    });

    it('MA-236: a bottom-row pill stops at an edge room of 4 below', () => {
      expect(
        resolveGridItemHitSlop(
          { y: pitch, height },
          { minY: 0, maxY: pitch },
          PICKER_GAP,
          { bottom: 4 },
          minSlop,
        ).bottom,
      ).toBe(4);
    });
  });
});
