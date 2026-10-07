import {
  type ScaledTextStyle,
  scaledTextStyle,
  scaledTextStyleAboveOne,
} from '@/components/ui/text_scale.geometry';
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
  label: ScaledTextStyle | undefined;
  minWidth: number;
  height: number;
}

/** `HeaderTextAction`'s box: `label` is `undefined` at or below scale 1, where the OS scales the class size. */
export function resolveHeaderTextActionGeometry(fontScale: number): HeaderTextActionGeometry {
  const label = scaledTextStyleAboveOne(Type.micro, fontScale);
  return {
    label,
    minWidth: Size.headerTextActionTrack,
    height: Math.max(Size.headerTextActionTrack, (label?.lineHeight ?? 0) + 2 * Size.hairline),
  };
}
