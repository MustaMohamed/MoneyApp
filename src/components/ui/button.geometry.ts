import type { ButtonSize } from 'heroui-native';

import {
  HEROUI_TEXT_TYPE,
  type ScaledTextStyle,
  scaledTextStyleAboveOne,
} from '@/components/ui/text_scale.geometry';
import { Size } from '@/constants/theme';

const LABEL_FONT_SIZE: Record<ButtonSize, number> = {
  sm: HEROUI_TEXT_TYPE.sm,
  md: HEROUI_TEXT_TYPE.base,
  lg: HEROUI_TEXT_TYPE.lg,
};

export function resolveButtonLabelStyle(
  size: ButtonSize,
  fontScale: number,
): ScaledTextStyle | undefined {
  return scaledTextStyleAboveOne(LABEL_FONT_SIZE[size], fontScale);
}

export function resolveCompactCtaHeight(size: ButtonSize, fontScale: number): number {
  return Math.max(Size.compactCtaTrack, resolveButtonLabelStyle(size, fontScale)?.lineHeight ?? 0);
}

export function resolveSmallButtonHeight(fontScale: number): number {
  return Math.max(Size.smallButtonTrack, resolveButtonLabelStyle('sm', fontScale)?.lineHeight ?? 0);
}

export interface ButtonRootStyle {
  height?: number;
  borderRadius?: number;
}

/** `md` and `lg` keep HeroUI's CSS height, so they get no `height` key; the flat arm's keys win over the `sm` track. */
export function resolveButtonRootStyle(
  size: ButtonSize,
  fontScale: number,
  flatStyle?: { borderRadius: number; height?: number },
): ButtonRootStyle | undefined {
  const track = size === 'sm' ? { height: resolveSmallButtonHeight(fontScale) } : undefined;
  if (track === undefined && flatStyle === undefined) return undefined;
  return { ...track, ...flatStyle };
}
