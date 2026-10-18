import { scaledFontSize } from '@/components/ui/text_scale.geometry';
import { Spacing, Type, lineHeightFor } from '@/constants/theme';
import { ms } from '@/utils/responsive';

/** The day header's row and insets, shared by the header and the list skeleton's header row. */
export const DAY_HEADER_ROOT_STYLE = {
  flexDirection: 'row',
  alignItems: 'center',
  paddingHorizontal: Spacing.md,
  paddingTop: Spacing.md,
  paddingBottom: Spacing.xs,
} as const;
export const DAY_HEADER_NET_PLACEHOLDER_WIDTH = ms(70);

export interface DayHeaderGeometry {
  fontSize: number;
  lineHeight: number;
  pillHeight: number;
  height: number;
}

// Uncapped: the day header scales its text with the OS, so every box grows from the one scaled size.
export function resolveDayHeaderGeometry(fontScale: number): DayHeaderGeometry {
  const fontSize = scaledFontSize(Type.caption, fontScale);
  const text = { fontSize, lineHeight: lineHeightFor(fontSize) };
  const pillHeight = text.lineHeight + 2 * Spacing.xxxs;
  return { ...text, pillHeight, height: Spacing.md + pillHeight + Spacing.xs };
}

/** Above font scale 1 the net's box stops at half the header's inner width, the share a row's value track takes, and a wider net shrinks to fit. */
export function resolveDayHeaderNetMaxWidth(
  fontScale: number,
  headerWidth: number,
): number | undefined {
  return fontScale <= 1
    ? undefined
    : (headerWidth - 2 * DAY_HEADER_ROOT_STYLE.paddingHorizontal) / 2;
}
