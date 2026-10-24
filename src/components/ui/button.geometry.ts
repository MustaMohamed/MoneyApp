import type { ButtonSize } from 'heroui-native';

import {
  HEROUI_TEXT_TYPE,
  type ScaledTextStyle,
  scaledTextStyleAboveOne,
} from '@/components/ui/text_scale.geometry';
import {
  Radius,
  Size,
  type TouchFloorHitSlop,
  type TouchFloorRoom,
  touchFloorHitSlopWithin,
} from '@/constants/theme';

const LABEL_FONT_SIZE: Record<ButtonSize, number> = {
  sm: HEROUI_TEXT_TYPE.sm,
  md: HEROUI_TEXT_TYPE.base,
  lg: HEROUI_TEXT_TYPE.lg,
};

const ROOT_RADIUS: Record<ButtonSize, number> = {
  sm: Radius.heroButton,
  md: Radius.heroButton,
  lg: Radius.heroButtonLg,
};

export function resolveButtonRadius(size: ButtonSize): number {
  return ROOT_RADIUS[size];
}

export function resolveButtonLabelStyle(
  size: ButtonSize,
  fontScale: number,
): ScaledTextStyle | undefined {
  return scaledTextStyleAboveOne(LABEL_FONT_SIZE[size], fontScale);
}

export function resolveCompactCtaHeight(size: ButtonSize, fontScale: number): number {
  return Math.max(Size.compactCtaTrack, resolveButtonLabelStyle(size, fontScale)?.lineHeight ?? 0);
}

/** The compact CTA's touch-floor slop at its drawn height, held inside `room`. */
export function resolveCompactCtaHitSlop(
  size: ButtonSize,
  fontScale: number,
  room: TouchFloorRoom,
): TouchFloorHitSlop {
  return touchFloorHitSlopWithin(resolveCompactCtaHeight(size, fontScale), room);
}

export function resolveSmallButtonHeight(fontScale: number): number {
  return Math.max(Size.smallButtonTrack, resolveButtonLabelStyle('sm', fontScale)?.lineHeight ?? 0);
}

export interface ButtonRootStyle {
  height?: number;
  borderRadius?: number;
}

/** `md` and `lg` get no track `height`; the flat arm's keys win over the `sm` track. */
export function resolveButtonRootStyle(
  size: ButtonSize,
  fontScale: number,
  flatStyle?: { borderRadius: number; height?: number },
): ButtonRootStyle | undefined {
  const track = size === 'sm' ? { height: resolveSmallButtonHeight(fontScale) } : undefined;
  if (track === undefined && flatStyle === undefined) return undefined;
  return { ...track, ...flatStyle };
}
