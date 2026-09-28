import type { ButtonSize } from 'heroui-native';

import { type ScaledTextStyle, scaledTextStyleAboveOne } from '@/components/ui/text_scale.geometry';
import { Size, Type } from '@/constants/theme';

// The `Type` steps that match HeroUI's `text-sm`, `text-base`, `text-lg` at 390 dp.
const LABEL_FONT_SIZE: Record<ButtonSize, number> = {
  sm: Type.body,
  md: Type.subhead,
  lg: Type.title,
};

/** `undefined` at or below scale 1: the label keeps HeroUI's own size and the OS scales it. */
export function resolveButtonLabelStyle(
  size: ButtonSize,
  fontScale: number,
): ScaledTextStyle | undefined {
  return scaledTextStyleAboveOne(LABEL_FONT_SIZE[size], fontScale);
}

export function resolveCompactCtaHeight(size: ButtonSize, fontScale: number): number {
  return Math.max(Size.compactCtaTrack, resolveButtonLabelStyle(size, fontScale)?.lineHeight ?? 0);
}
