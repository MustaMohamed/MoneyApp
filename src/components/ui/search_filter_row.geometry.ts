import { DISPLAY_HEADLINE_MAX_FONT_SCALE } from '@/components/ui/display_headline.geometry';
import {
  type ScaledTextStyle,
  scaledFontSize,
  scaledTextStyleAboveOne,
} from '@/components/ui/text_scale.geometry';
import { Radius, Spacing, Type, lineHeightFor } from '@/constants/theme';
import { ms } from '@/utils/responsive';

export const SEARCH_INPUT_MAX_FONT_SCALE = DISPLAY_HEADLINE_MAX_FONT_SCALE;

const COMPACT_CONTROL_SIZE = ms(36);
const FILTER_BADGE_SIZE = ms(16);

interface SearchInputBox {
  height: number;
  minHeight: number;
  paddingTop: 0;
  paddingBottom: 0;
}

export interface SearchFilterRowGeometry {
  input: SearchInputBox;
  /** `undefined` at or below scale 1: the input keeps HeroUI's own size and the OS scales it. */
  inputText: ScaledTextStyle | undefined;
  inputStyle: SearchInputBox & Partial<ScaledTextStyle>;
  filterButton: { height: number; width: number; borderRadius: number };
  badge: { top: number; right: number; minWidth: number; height: number; borderRadius: number };
  badgeText: ScaledTextStyle;
}

export function resolveSearchFilterRowGeometry(fontScale: number): SearchFilterRowGeometry {
  const inputText = scaledTextStyleAboveOne(Type.body, fontScale, SEARCH_INPUT_MAX_FONT_SCALE);
  const inputHeight = Math.max(
    COMPACT_CONTROL_SIZE,
    (inputText?.lineHeight ?? 0) + 2 * Spacing.xxs,
  );
  const input: SearchInputBox = {
    height: inputHeight,
    minHeight: inputHeight,
    paddingTop: 0,
    paddingBottom: 0,
  };
  const badgeFontSize = scaledFontSize(Type.chip, fontScale, SEARCH_INPUT_MAX_FONT_SCALE);
  const badgeSize = Math.max(FILTER_BADGE_SIZE, lineHeightFor(badgeFontSize));
  return {
    input,
    inputText,
    inputStyle: { ...input, ...inputText },
    filterButton: { height: inputHeight, width: COMPACT_CONTROL_SIZE, borderRadius: Radius.md },
    badge: {
      top: ms(2),
      right: ms(2),
      minWidth: badgeSize,
      height: badgeSize,
      borderRadius: badgeSize / 2,
    },
    badgeText: {
      // oxlint-disable-next-line moneyapp/font-size-pairs-line-height -- lineHeight matches the circular badge's own diameter so the count centers inside it; at scale 1 lineHeightFor(Type.chip)'s 12px would not fill the 16px circle.
      fontSize: badgeFontSize,
      lineHeight: badgeSize,
    },
  };
}
