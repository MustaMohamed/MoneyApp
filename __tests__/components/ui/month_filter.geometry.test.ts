import {
  MONTH_PICKER_GRID_EDGE,
  MONTH_PICKER_YEAR_ROW_GAP,
  type MonthStepSide,
  resolveMonthPillGeometry,
  resolveMonthStepHitSlop,
  resolveMonthYearStepHitSlop,
} from '@/components/ui/month_filter.geometry';
import { SHEET_HEADER_PADDING_BOTTOM } from '@/components/ui/sheet.helpers';
import { scaledFontSize } from '@/components/ui/text_scale.geometry';
import {
  Size,
  Spacing,
  TouchSize,
  Type,
  lineHeightFor,
  touchFloorHitSlop,
} from '@/constants/theme';

describe('resolveMonthPillGeometry', () => {
  it('at font scale 1 draws the pill at 32 with the Type.micro label', () => {
    const g = resolveMonthPillGeometry(1);
    expect(g.height).toBe(32);
    expect(g.label).toEqual({ fontSize: Type.micro, lineHeight: lineHeightFor(Type.micro) });
  });

  it('at font scale 2 the pill holds its label line box', () => {
    const g = resolveMonthPillGeometry(2);
    const fontSize = scaledFontSize(Type.micro, 2);
    expect(g.label).toEqual({ fontSize, lineHeight: lineHeightFor(fontSize) });
    expect(g.height).toBeGreaterThanOrEqual(g.label.lineHeight);
  });
});

describe('resolveMonthStepHitSlop', () => {
  const pillHeight = resolveMonthPillGeometry(1).height;
  const floor = touchFloorHitSlop(pillHeight).top;
  const inward = Spacing.xxs / 2;

  it('MA-236: without a row slop a step takes the touch-floor slop at the pill height, and half the row gap toward the pill', () => {
    expect(resolveMonthStepHitSlop(undefined, pillHeight, 'previous')).toEqual({
      top: touchFloorHitSlop(pillHeight).top,
      bottom: touchFloorHitSlop(pillHeight).bottom,
      left: floor,
      right: inward,
    });
    expect(resolveMonthStepHitSlop(undefined, pillHeight, 'next')).toEqual({
      top: touchFloorHitSlop(pillHeight).top,
      bottom: touchFloorHitSlop(pillHeight).bottom,
      left: inward,
      right: floor,
    });
  });

  it('MA-236: a row slop sets the top and bottom, and the sides still come from the touch-floor rule', () => {
    expect(resolveMonthStepHitSlop({ top: 9, bottom: 5 }, pillHeight, 'previous')).toEqual({
      top: 9,
      bottom: 5,
      left: floor,
      right: inward,
    });
    expect(resolveMonthStepHitSlop({ top: 9, bottom: 5 }, pillHeight, 'next')).toEqual({
      top: 9,
      bottom: 5,
      left: inward,
      right: floor,
    });
  });
});

describe('resolveMonthYearStepHitSlop', () => {
  const SIDES: MonthStepSide[] = ['previous', 'next'];
  const total = (slop: { top: number; bottom: number }) =>
    Size.monthYearStepTrack + slop.top + slop.bottom;
  const roomTop = (inset: number, side: MonthStepSide) =>
    inset + (side === 'next' ? SHEET_HEADER_PADDING_BOTTOM / 2 : SHEET_HEADER_PADDING_BOTTOM);

  it('MA-242: before layout next stops at half the gap to the close and to the cells, under the floor, and previous reaches it', () => {
    const next = resolveMonthYearStepHitSlop(undefined, 'next');
    const previous = resolveMonthYearStepHitSlop(undefined, 'previous');

    expect(next.top).toBeCloseTo(SHEET_HEADER_PADDING_BOTTOM / 2, 6);
    expect(next.bottom).toBeLessThanOrEqual(MONTH_PICKER_YEAR_ROW_GAP / 2);
    expect(total(next)).toBeLessThan(TouchSize.min);
    expect(total(previous)).toBeGreaterThanOrEqual(TouchSize.min);
  });

  it.each(SIDES)(
    'MA-242: a year row the label grows by twice the floor slop lifts %s to the floor, no side past its room',
    (side) => {
      const k = touchFloorHitSlop(Size.monthYearStepTrack).top;
      const slop = resolveMonthYearStepHitSlop(Size.monthYearStepTrack + 2 * k, side);

      expect(total(slop)).toBeGreaterThanOrEqual(TouchSize.min);
      expect(slop.top).toBeLessThanOrEqual(roomTop(k, side));
      expect(slop.bottom).toBeLessThanOrEqual(k + MONTH_PICKER_YEAR_ROW_GAP / 2);
    },
  );

  it('MA-242: the top row of cells and next meet inside the year row gap', () => {
    const next = resolveMonthYearStepHitSlop(undefined, 'next');

    expect(MONTH_PICKER_GRID_EDGE.top).toBeDefined();
    expect((MONTH_PICKER_GRID_EDGE.top ?? Infinity) + next.bottom).toBeLessThanOrEqual(
      MONTH_PICKER_YEAR_ROW_GAP,
    );
  });
});
