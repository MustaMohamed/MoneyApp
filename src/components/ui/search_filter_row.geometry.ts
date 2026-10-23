import type { Insets } from 'react-native';

import { DISPLAY_HEADLINE_MAX_FONT_SCALE } from '@/components/ui/display_headline.geometry';
import {
  type ScaledTextStyle,
  scaledTextStyle,
  scaledTextStyleAboveOne,
} from '@/components/ui/text_scale.geometry';
import {
  HIT_SLOP_UNCLIPPED_STYLE,
  Radius,
  Size,
  Spacing,
  Type,
  touchFloorHitSlop,
  touchFloorHitSlopWithin,
} from '@/constants/theme';
import { ms } from '@/utils/responsive';

export const SEARCH_INPUT_MAX_FONT_SCALE = DISPLAY_HEADLINE_MAX_FONT_SCALE;
// Above it the badge covers the filter icon inside the button's clip.
export const FILTER_BADGE_MAX_FONT_SCALE = DISPLAY_HEADLINE_MAX_FONT_SCALE;

const COMPACT_CONTROL_SIZE = ms(36);
const FILTER_BADGE_SIZE = ms(16);

// The row's `gap-2` and `mb-2`, unscaled CSS px.
export const SEARCH_ROW_GAP = 8;
export const SEARCH_ROW_MARGIN_BOTTOM = 8;
// HeroUI's clear button `inset-inline-end: calc(var(--spacing) * 3)` (search-field.css), unscaled CSS px.
export const SEARCH_CLEAR_INSET_END = 12;

interface SearchInputBox {
  height: number;
  minHeight: number;
  paddingTop: 0;
  paddingBottom: 0;
}

export interface SearchFilterRowGeometry {
  input: SearchInputBox;
  inputText: ScaledTextStyle | undefined;
  inputStyle: SearchInputBox & Partial<ScaledTextStyle>;
  filterButton: {
    height: number;
    width: number;
    borderRadius: number;
    overflow: typeof HIT_SLOP_UNCLIPPED_STYLE.overflow;
  };
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
  const chip = scaledTextStyle(Type.chip, fontScale, FILTER_BADGE_MAX_FONT_SCALE);
  const badgeSize = Math.max(FILTER_BADGE_SIZE, chip.lineHeight);
  return {
    input,
    inputText,
    inputStyle: { ...input, ...inputText },
    filterButton: {
      height: inputHeight,
      width: COMPACT_CONTROL_SIZE,
      borderRadius: Radius.md,
      ...HIT_SLOP_UNCLIPPED_STYLE,
    },
    badge: {
      top: ms(2),
      right: ms(2),
      minWidth: badgeSize,
      height: badgeSize,
      borderRadius: badgeSize / 2,
    },
    badgeText: {
      // oxlint-disable-next-line moneyapp/font-size-pairs-line-height -- lineHeight matches the circular badge's own diameter so the count centers inside it; at scale 1 lineHeightFor(Type.chip)'s 12px would not fill the 16px circle.
      fontSize: chip.fontSize,
      lineHeight: badgeSize,
    },
  };
}

export interface SearchRowHitSlop {
  filter: Required<Insets>;
  clear: Required<Insets>;
}

/** Filter and clear reach the touch floor inside the room above the row and its margin below; beside them each stops at half the gap. */
export function resolveSearchRowHitSlop(inputHeight: number, topRoom: number): SearchRowHitSlop {
  const filter = touchFloorHitSlopWithin(inputHeight, {
    top: topRoom,
    bottom: SEARCH_ROW_MARGIN_BOTTOM,
  });
  const inset = (inputHeight - Size.searchClearTrack) / 2;
  const clear = touchFloorHitSlopWithin(Size.searchClearTrack, {
    top: inset + topRoom,
    bottom: inset + SEARCH_ROW_MARGIN_BOTTOM,
  });
  const clearFloor = touchFloorHitSlop(Size.searchClearTrack).top;
  return {
    filter: {
      ...filter,
      left: SEARCH_ROW_GAP / 2,
      right: touchFloorHitSlop(COMPACT_CONTROL_SIZE).top,
    },
    clear: {
      ...clear,
      left: clearFloor,
      right: Math.min(clearFloor, (SEARCH_CLEAR_INSET_END + SEARCH_ROW_GAP) / 2),
    },
  };
}
