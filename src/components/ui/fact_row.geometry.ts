import { PixelRatio, type ViewStyle } from 'react-native';

import {
  type FitAmountTextProps,
  type OneLineTextProps,
  type ScaledTextStyle,
  resolveFitAmountTextProps,
  resolveOneLineTextProps,
  scaledTextStyle,
} from '@/components/ui/text_scale.geometry';
import { Spacing, TouchSize, Type, lineHeightFor } from '@/constants/theme';
import { ms } from '@/utils/responsive';

// Canvas `.fact`: the 14/20 label and value, the 9.5 badge, 8 above and below, the 20 account tile, 8 between value parts.
export const FACT_ROW_FONT_SIZE = Type.body;
export const FACT_ROW_BADGE_FONT_SIZE = Type.compactBadge;
export const FACT_ROW_PADDING = Spacing.xs;
export const FACT_ROW_TILE = ms(20);
export const FACT_ROW_VALUE_GAP = Spacing.xs;

export interface FactRowShape {
  fitsValue: boolean;
  /** An amount or a count beside the label, whose label gives way first. */
  holdsAmount: boolean;
  hasCaption: boolean;
  wrapsValue: boolean;
  holdsField: boolean;
}

export interface FactRowGeometry {
  height: number | undefined;
  minHeight: number | undefined;
  paddingVertical: number;
  labelGivesWay: boolean;
}

export interface FactRowWrappedTextProps {
  allowFontScaling: true;
  style: ScaledTextStyle;
}

export type FactRowFlexStyle = Pick<
  ViewStyle,
  'flex' | 'flexGrow' | 'flexShrink' | 'flexBasis' | 'minWidth'
>;

export function resolveFactRowHeight(fontScale: number): number {
  return PixelRatio.roundToNearestPixel(
    Math.max(
      TouchSize.min,
      2 * FACT_ROW_PADDING +
        Math.max(scaledTextStyle(FACT_ROW_FONT_SIZE, fontScale).lineHeight, FACT_ROW_TILE),
    ),
  );
}

/** A field, a caption or a wrapped value grows the row from the shared height; any other row stands at it unpadded, since Android shrinks a fitted line padded inside it. */
export function resolveFactRowGeometry(shape: FactRowShape, fontScale: number): FactRowGeometry {
  const row = resolveFactRowHeight(fontScale);
  if (shape.holdsField) {
    return { height: undefined, minHeight: row, paddingVertical: 0, labelGivesWay: false };
  }
  const labelGivesWay = !shape.wrapsValue && (shape.holdsAmount || shape.hasCaption);
  if (shape.hasCaption || shape.wrapsValue) {
    return { height: undefined, minHeight: row, paddingVertical: FACT_ROW_PADDING, labelGivesWay };
  }
  return { height: row, minHeight: undefined, paddingVertical: 0, labelGivesWay };
}

/** A wrapped value keeps OS scaling and no line cap; a fitted one shrinks to fit; any other is one scaled line ending in `…`. */
export function resolveFactRowValueTextProps(
  shape: FactRowShape,
  fontSize: number,
  fontScale: number,
): FitAmountTextProps | OneLineTextProps | FactRowWrappedTextProps {
  if (shape.wrapsValue) {
    return { allowFontScaling: true, style: { fontSize, lineHeight: lineHeightFor(fontSize) } };
  }
  if (shape.fitsValue) return resolveFitAmountTextProps(fontSize, fontScale);
  return resolveOneLineTextProps(scaledTextStyle(fontSize, fontScale));
}

/** Giving way, the label grows from a zero basis and the value group shrinks only once the label is spent; holding, the label stays whole. */
export function resolveFactRowFlex(labelGivesWay: boolean): {
  label: FactRowFlexStyle;
  group: FactRowFlexStyle;
} {
  return labelGivesWay
    ? {
        label: { flexGrow: 1, flexShrink: 1, flexBasis: 0, minWidth: 0 },
        group: { flexGrow: 0, flexShrink: 1, flexBasis: 'auto' },
      }
    : { label: { flexShrink: 0 }, group: { flex: 1, minWidth: 0 } };
}
