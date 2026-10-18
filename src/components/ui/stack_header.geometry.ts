import type { Insets } from 'react-native';

import { type ScaledTextStyle, scaledTextStyle } from '@/components/ui/text_scale.geometry';
import { Size, Type } from '@/constants/theme';

export interface StackHeaderGeometry {
  title: ScaledTextStyle;
  height: number;
}

/** The header token is the height at scale 1 and the floor above it; the hairline is the `border-b` drawn inside the box. */
export function resolveStackHeaderGeometry(fontScale: number): StackHeaderGeometry {
  const title = scaledTextStyle(Type.title, fontScale);
  return { title, height: Math.max(Size.headerHeight, title.lineHeight + Size.hairline) };
}

export interface HeaderTextActionGeometry {
  label: ScaledTextStyle;
  allowFontScaling: boolean;
  minWidth: number;
  height: number;
}

export const HEADER_ACTION_HIT_SLOP = {
  top: Size.headerActionSlop,
  bottom: Size.headerActionSlop,
  left: Size.headerActionSlop,
  right: Size.headerActionSlop,
} as const satisfies Insets;

export const NATIVE_HEADER_BACK_PADDING = {
  paddingLeft: 0,
  paddingRight: Size.headerActionSlop,
  paddingVertical: Size.headerActionSlop,
} as const;

/** `HeaderTextAction`'s box: at or below scale 1 the label keeps `Type.micro` and the OS scales it. */
export function resolveHeaderTextActionGeometry(fontScale: number): HeaderTextActionGeometry {
  const allowFontScaling = fontScale <= 1;
  const label = scaledTextStyle(Type.micro, allowFontScaling ? 1 : fontScale);
  return {
    label,
    allowFontScaling,
    minWidth: Size.headerActionTrack,
    height: Math.max(Size.headerActionTrack, label.lineHeight + 2 * Size.hairline),
  };
}
