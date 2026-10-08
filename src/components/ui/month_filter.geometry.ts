import type { Insets } from 'react-native';

import { type ScaledTextStyle, scaledTextStyle } from '@/components/ui/text_scale.geometry';
import { Size, Spacing, Type } from '@/constants/theme';

/** A step button's slop on every side, raw dp. */
export const MONTH_STEP_HIT_SLOP = 8;

/** Dp past the top and bottom edges of the pill and both step buttons that still reach them. */
export interface MonthRowHitSlop {
  top: number;
  bottom: number;
}

export function resolveMonthStepHitSlop(rowHitSlop: MonthRowHitSlop | undefined): number | Insets {
  if (rowHitSlop === undefined) return MONTH_STEP_HIT_SLOP;
  return {
    top: rowHitSlop.top,
    bottom: rowHitSlop.bottom,
    left: MONTH_STEP_HIT_SLOP,
    right: MONTH_STEP_HIT_SLOP,
  };
}

export interface MonthPillGeometry {
  label: ScaledTextStyle;
  height: number;
}

export function resolveMonthPillGeometry(fontScale: number): MonthPillGeometry {
  const label = scaledTextStyle(Type.micro, fontScale);
  return { label, height: Math.max(Size.monthPillTrack, label.lineHeight + 2 * Spacing.xxxs) };
}
