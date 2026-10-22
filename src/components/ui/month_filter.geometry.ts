import type { Insets } from 'react-native';

import { type ScaledTextStyle, scaledTextStyle } from '@/components/ui/text_scale.geometry';
import { Size, Spacing, Type, touchFloorHitSlop } from '@/constants/theme';

/** The gap between the step buttons and the pill. */
export const MONTH_ROW_GAP = Spacing.xxs;

/** The month picker's year arrows' slop on every side, raw dp. */
export const MONTH_STEP_HIT_SLOP = 8;

/** Dp past the top and bottom edges of the pill and both step buttons that still reach them. */
export interface MonthRowHitSlop {
  top: number;
  bottom: number;
}

export type MonthStepSide = 'previous' | 'next';

/** The touch-floor slop at the pill's height outward, and half the row gap toward the pill. */
export function resolveMonthStepHitSlop(
  rowHitSlop: MonthRowHitSlop | undefined,
  height: number,
  side: MonthStepSide,
): Required<Insets> {
  const floor = touchFloorHitSlop(height);
  const inward = Math.min(floor.top, MONTH_ROW_GAP / 2);
  const { top, bottom } = rowHitSlop ?? floor;
  return side === 'previous'
    ? { top, bottom, left: floor.top, right: inward }
    : { top, bottom, left: inward, right: floor.top };
}

export interface MonthPillGeometry {
  label: ScaledTextStyle;
  height: number;
}

export function resolveMonthPillGeometry(fontScale: number): MonthPillGeometry {
  const label = scaledTextStyle(Type.micro, fontScale);
  return { label, height: Math.max(Size.monthPillTrack, label.lineHeight + 2 * Spacing.xxxs) };
}
