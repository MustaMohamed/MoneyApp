import {
  SHEET_HEADER_PADDING_BOTTOM,
  resolveSheetCloseHitSlop,
} from '@/components/ui/sheet.helpers';
import { Size, TouchSize, touchFloorHitSlop } from '@/constants/theme';

describe('resolveSheetCloseHitSlop', () => {
  const floor = () => touchFloorHitSlop(Size.sheetCloseTrack).top;
  const total = (slop: { top: number; bottom: number }) =>
    Size.sheetCloseTrack + slop.top + slop.bottom;

  it('MA-242: before layout the close takes nothing above the header row and half the header padding below, under the floor', () => {
    const slop = resolveSheetCloseHitSlop(undefined);

    expect(slop.top).toBe(0);
    expect(slop.bottom).toBeCloseTo(SHEET_HEADER_PADDING_BOTTOM / 2, 6);
    expect(total(slop)).toBeLessThan(TouchSize.min);
  });

  it('MA-242: a header row as tall as the close, at font scale 1.0, gives the same slop as before layout', () => {
    const slop = resolveSheetCloseHitSlop(SHEET_HEADER_PADDING_BOTTOM + Size.sheetCloseTrack);

    expect(slop.top).toBe(0);
    expect(slop.bottom).toBeCloseTo(SHEET_HEADER_PADDING_BOTTOM / 2, 6);
    expect(total(slop)).toBeLessThan(TouchSize.min);
  });

  it('MA-242: a header row the title grows by twice the floor slop lifts the close to the floor, inside its room', () => {
    const k = floor();
    const slop = resolveSheetCloseHitSlop(
      SHEET_HEADER_PADDING_BOTTOM + Size.sheetCloseTrack + 2 * k,
    );

    expect(total(slop)).toBeGreaterThanOrEqual(TouchSize.min);
    expect(slop.top).toBeLessThanOrEqual(k);
    expect(slop.bottom).toBeLessThanOrEqual(k + SHEET_HEADER_PADDING_BOTTOM / 2);
  });

  it.each([undefined, 120])(
    'MA-242: with a header height of %p the left and right come from the touch-floor rule',
    (headerHeight) => {
      const slop = resolveSheetCloseHitSlop(headerHeight);

      expect(slop.left).toBe(floor());
      expect(slop.right).toBe(floor());
    },
  );
});
