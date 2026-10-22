import {
  MONTH_STEP_HIT_SLOP,
  resolveMonthPillGeometry,
  resolveMonthStepHitSlop,
} from '@/components/ui/month_filter.geometry';
import { scaledFontSize } from '@/components/ui/text_scale.geometry';
import { Spacing, Type, lineHeightFor, touchFloorHitSlop } from '@/constants/theme';

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

  it('MA-236: the year arrows keep MONTH_STEP_HIT_SLOP at 8, and a step without a row slop no longer takes it', () => {
    expect(MONTH_STEP_HIT_SLOP).toBe(8);
    expect(resolveMonthStepHitSlop(undefined, pillHeight, 'next')).not.toBe(MONTH_STEP_HIT_SLOP);
  });
});
