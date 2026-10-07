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

export interface HeaderActionGeometry {
  label: ScaledTextStyle | undefined;
  minWidth: number;
  height: number;
}

/** A text action in the header: `label` is `undefined` at or below scale 1, where the OS scales the class size. */
export function resolveHeaderActionGeometry(fontScale: number): HeaderActionGeometry {
  const label = scaledTextStyleAboveOne(Type.micro, fontScale);
  return {
    label,
    minWidth: Size.headerActionTrack,
    height: Math.max(Size.headerActionTrack, (label?.lineHeight ?? 0) + 2 * Size.hairline),
  };
}
