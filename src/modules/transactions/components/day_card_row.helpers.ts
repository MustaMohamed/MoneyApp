import { PixelRatio, Platform, type ViewStyle } from 'react-native';

import { Radius, Size, Spacing } from '@/constants/theme';

// Whole device pixels: a fractional inset or border leaves a background line between two slices.
export const DAY_CARD_INSET = PixelRatio.roundToNearestPixel(Spacing.md);
export const DAY_CARD_BORDER_WIDTH = PixelRatio.roundToNearestPixel(Size.hairline);
const DAY_CARD_RADIUS = Radius.lg;
/** The card's corner inside its border, where a row's swipe actions are clipped. */
export const DAY_CARD_INNER_RADIUS = DAY_CARD_RADIUS - DAY_CARD_BORDER_WIDTH;

type SlicePosition = 'first' | 'middle' | 'last' | 'only';

const SIDES = {
  marginHorizontal: DAY_CARD_INSET,
  borderLeftWidth: DAY_CARD_BORDER_WIDTH,
  borderRightWidth: DAY_CARD_BORDER_WIDTH,
};
const TOP = {
  borderTopWidth: DAY_CARD_BORDER_WIDTH,
  borderTopLeftRadius: DAY_CARD_RADIUS,
  borderTopRightRadius: DAY_CARD_RADIUS,
};
const BOTTOM = {
  borderBottomWidth: DAY_CARD_BORDER_WIDTH,
  borderBottomLeftRadius: DAY_CARD_RADIUS,
  borderBottomRightRadius: DAY_CARD_RADIUS,
};

// Android starts a bottom-rounded slice's fill about 0.8 px below its top edge, so there a last slice overlaps the one above by a device pixel; iOS is unmeasured.
const LAST_OVERLAP = Platform.OS === 'android' ? { marginTop: -1 / PixelRatio.get() } : {};

const SLICE_STYLES: Record<SlicePosition, ViewStyle> = {
  first: Object.freeze({ ...SIDES, ...TOP }),
  middle: Object.freeze({ ...SIDES }),
  last: Object.freeze({ ...SIDES, ...BOTTOM, ...LAST_OVERLAP }),
  only: Object.freeze({ ...SIDES, ...TOP, ...BOTTOM }),
};

const SWIPE_CORNERS: Record<SlicePosition, ViewStyle> = {
  first: Object.freeze({ borderTopRightRadius: DAY_CARD_INNER_RADIUS }),
  middle: Object.freeze({}),
  last: Object.freeze({ borderBottomRightRadius: DAY_CARD_INNER_RADIUS }),
  only: Object.freeze({
    borderTopRightRadius: DAY_CARD_INNER_RADIUS,
    borderBottomRightRadius: DAY_CARD_INNER_RADIUS,
  }),
};

function slicePosition(isFirst: boolean, isLast: boolean): SlicePosition {
  if (isFirst) return isLast ? 'only' : 'first';
  return isLast ? 'last' : 'middle';
}

/** One row's slice of its day's card; it sets no `overflow`, so the swipeable clips its own actions. */
export function resolveDayCardSliceStyle(isFirst: boolean, isLast: boolean): ViewStyle {
  return SLICE_STYLES[slicePosition(isFirst, isLast)];
}

/** The swipeable's corners on that slice, so the outer action tile follows the card's curve. */
export function resolveDayCardSwipeCorners(isFirst: boolean, isLast: boolean): ViewStyle {
  return SWIPE_CORNERS[slicePosition(isFirst, isLast)];
}
