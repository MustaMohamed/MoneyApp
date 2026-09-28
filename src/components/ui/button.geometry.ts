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
