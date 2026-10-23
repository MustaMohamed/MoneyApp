import type { Insets } from 'react-native';

import { type ScaledTextStyle, scaledTextStyle } from '@/components/ui/text_scale.geometry';
import {
  Size,
  Spacing,
  type TouchFloorRoom,
  Type,
  touchFloorHitSlop,
  touchFloorHitSlopWithin,
} from '@/constants/theme';

import { SHEET_HEADER_PADDING_BOTTOM } from './sheet.helpers';

/** The gap between the step buttons and the pill. */
export const MONTH_ROW_GAP = Spacing.xxs;

/** The gap between the month picker's year row and its month cells. */
export const MONTH_PICKER_YEAR_ROW_GAP = Spacing.sm;

/** The gap between the month picker's cells, across and down. */
export const MONTH_PICKER_CELL_GAP = Spacing.xs;

/** The cells' room past the grid: half the year row gap above; below lies only the body's padding. */
export const MONTH_PICKER_GRID_EDGE: TouchFloorRoom = { top: MONTH_PICKER_YEAR_ROW_GAP / 2 };

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

/** A year arrow's slop, centred in the measured year row: half the gap to the cells below, and above it half the header padding under the close (next) or the whole of it under the title (previous); `undefined` is a row not yet laid out. */
export function resolveMonthYearStepHitSlop(
  yearRowHeight: number | undefined,
  side: MonthStepSide,
): Required<Insets> {
  const inset =
    yearRowHeight === undefined ? 0 : Math.max(0, (yearRowHeight - Size.monthYearStepTrack) / 2);
  const headerRoom =
    side === 'next' ? SHEET_HEADER_PADDING_BOTTOM / 2 : SHEET_HEADER_PADDING_BOTTOM;
  const vertical = touchFloorHitSlopWithin(Size.monthYearStepTrack, {
    top: inset + headerRoom,
    bottom: inset + MONTH_PICKER_YEAR_ROW_GAP / 2,
  });
  const across = touchFloorHitSlop(Size.monthYearStepTrack).top;
  return { ...vertical, left: across, right: across };
}

export interface MonthPillGeometry {
  label: ScaledTextStyle;
  height: number;
}

export function resolveMonthPillGeometry(fontScale: number): MonthPillGeometry {
  const label = scaledTextStyle(Type.micro, fontScale);
  return { label, height: Math.max(Size.monthPillTrack, label.lineHeight + 2 * Spacing.xxxs) };
}
