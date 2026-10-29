import { PixelRatio, type ViewStyle } from 'react-native';

import { STATUS_BADGE_PADDING_VERTICAL } from '@/components/ui/status_badge';
import { FITTED_LINE_SLACK, scaledLineHeight } from '@/components/ui/text_scale.geometry';
import { Radius, Size, Spacing, Type } from '@/constants/theme';

// Frames C1 and C6 `.cyc`.
export const CURRENT_CYCLE_CARD_BORDER_WIDTH = Size.hairline;
const CURRENT_CYCLE_CARD_PADDING_TOP = Spacing.sm;
const CURRENT_CYCLE_CARD_PADDING_BOTTOM = Spacing.sm + Spacing.xxxs;

export const CURRENT_CYCLE_CARD_FRAME_STYLE: Readonly<ViewStyle> = Object.freeze({
  borderRadius: Radius.detailCard,
  boxShadow: 'none',
  paddingTop: CURRENT_CYCLE_CARD_PADDING_TOP,
  paddingBottom: CURRENT_CYCLE_CARD_PADDING_BOTTOM,
  paddingHorizontal: Spacing.md,
  borderWidth: CURRENT_CYCLE_CARD_BORDER_WIDTH,
});

export const CURRENT_CYCLE_ROW_GAP = Spacing.xs;
export const CURRENT_CYCLE_LINE_GAP = Spacing.xxxs;
export const CURRENT_CYCLE_AMOUNT_GAP = Spacing.xxs;
export const CURRENT_CYCLE_ACTIONS_GAP = Spacing.sm;
export const CURRENT_CYCLE_ACTION_GAP = Spacing.xs;

export const CURRENT_CYCLE_OVERLINE_FONT_SIZE = Type.overline;
export const CURRENT_CYCLE_DUE_DAY_FONT_SIZE = Type.body;
export const CURRENT_CYCLE_DAY_LINE_FONT_SIZE = Type.micro;
export const CURRENT_CYCLE_AMOUNT_FONT_SIZE = Type.title;
export const CURRENT_CYCLE_CODE_FONT_SIZE = Type.micro;

// The `tagMd` badge's label is one micro line.
const CURRENT_CYCLE_BADGE_FONT_SIZE = Type.micro;

export interface CurrentCycleCardGeometry {
  headerHeight: number;
  bodyHeight: number;
  height: number;
}

/** The flat `md` button stands at HeroUI's fixed 48 at every scale, so the action row is one `ctaFooterTrack`. */
export function resolveCurrentCycleCardGeometry(
  fontScale: number,
  showsActions: boolean,
): CurrentCycleCardGeometry {
  const ratio = PixelRatio.get();
  // Android ceils a scaled line box to a whole device pixel.
  const line = (fontSize: number): number =>
    Math.ceil(scaledLineHeight(fontSize, fontScale) * ratio - 1e-6) / ratio;
  const headerHeight = Math.max(
    line(CURRENT_CYCLE_OVERLINE_FONT_SIZE),
    line(CURRENT_CYCLE_BADGE_FONT_SIZE) + 2 * STATUS_BADGE_PADDING_VERTICAL,
  );
  const bodyHeight = Math.max(
    line(CURRENT_CYCLE_DUE_DAY_FONT_SIZE) +
      CURRENT_CYCLE_LINE_GAP +
      line(CURRENT_CYCLE_DAY_LINE_FONT_SIZE),
    line(CURRENT_CYCLE_AMOUNT_FONT_SIZE) + FITTED_LINE_SLACK,
  );
  const sum =
    2 * CURRENT_CYCLE_CARD_BORDER_WIDTH +
    CURRENT_CYCLE_CARD_PADDING_TOP +
    headerHeight +
    CURRENT_CYCLE_ROW_GAP +
    bodyHeight +
    (showsActions ? CURRENT_CYCLE_ACTIONS_GAP + Size.ctaFooterTrack : 0) +
    CURRENT_CYCLE_CARD_PADDING_BOTTOM;
  // Yoga rounds a half device pixel up.
  const height = Math.round(sum * ratio + 1e-6) / ratio;
  return { headerHeight, bodyHeight, height };
}
