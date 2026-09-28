import type { ButtonSize } from 'heroui-native';

import { scaledFontSize } from '@/components/ui/text_scale.geometry';
import { Size, Type, lineHeightFor } from '@/constants/theme';

// HeroUI's own label step per button size: `text-sm`, `text-base`, `text-lg`.
const LABEL_FONT_SIZE: Record<ButtonSize, number> = {
  sm: Type.body,
  md: Type.subhead,
  lg: Type.title,
};

/** `undefined` at or below scale 1: the label keeps HeroUI's own size and the OS scales it. */
export function resolveButtonLabelStyle(
  size: ButtonSize,
  fontScale: number,
): { fontSize: number; lineHeight: number } | undefined {
  if (fontScale <= 1) return undefined;
  const fontSize = scaledFontSize(LABEL_FONT_SIZE[size], fontScale);
  return { fontSize, lineHeight: lineHeightFor(fontSize) };
}

export function resolveCompactCtaHeight(fontScale: number, size: ButtonSize): number {
  return Math.max(Size.compactCtaTrack, resolveButtonLabelStyle(size, fontScale)?.lineHeight ?? 0);
}
