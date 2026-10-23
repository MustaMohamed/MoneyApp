import { DETAIL_ROWS_CARD_MARGIN_TOP } from '@/components/ui/detail_rows_card.geometry';
import {
  SECTION_HEADER_MARGIN_BOTTOM,
  SECTION_HEADER_MARGIN_TOP,
} from '@/components/ui/section_header.geometry';
import { scaledTextStyle } from '@/components/ui/text_scale.geometry';
import {
  Spacing,
  type TouchFloorHitSlop,
  type TouchFloorRoom,
  Type,
  touchFloorHitSlopWithin,
} from '@/constants/theme';

import type { ActivityCardBody } from './account_activity.helpers';

// The activity empty block's `py-5`, unscaled CSS px.
export const ACTIVITY_EMPTY_BLOCK_PADDING_Y = 20;

/** The gap between the empty block's body text and its link. */
export const ACTIVITY_EMPTY_LINK_MARGIN_TOP = Spacing.sm;

// The archived account's Unarchive `mt-4` and Delete `mt-2`, unscaled CSS px.
export const ARCHIVED_UNARCHIVE_MARGIN_TOP = 16;
export const ARCHIVED_DELETE_MARGIN_TOP = 8;

/** The whole gap to the facts card above, which takes no touch, and half the gap to Delete below. */
export const ARCHIVED_UNARCHIVE_ROOM: TouchFloorRoom = {
  top: ARCHIVED_UNARCHIVE_MARGIN_TOP,
  bottom: ARCHIVED_DELETE_MARGIN_TOP / 2,
};

function captionLineHeight(fontScale: number): number {
  return scaledTextStyle(Type.caption, fontScale).lineHeight;
}

/** Half the gap to the actions above; below, half the gap to the first activity row, or the whole gap to the load error's alert, which takes no touch. */
export function resolveActivitySeeAllHitSlop(
  fontScale: number,
  body: Extract<ActivityCardBody, 'rows' | 'error'>,
): TouchFloorHitSlop {
  const gapBelow = SECTION_HEADER_MARGIN_BOTTOM + DETAIL_ROWS_CARD_MARGIN_TOP;
  return touchFloorHitSlopWithin(captionLineHeight(fontScale), {
    top: SECTION_HEADER_MARGIN_TOP / 2,
    bottom: body === 'rows' ? gapBelow / 2 : gapBelow,
  });
}

/** The whole gap to the body text above and the block's padding below. */
export function resolveActivityEmptyLinkHitSlop(fontScale: number): TouchFloorHitSlop {
  return touchFloorHitSlopWithin(captionLineHeight(fontScale), {
    top: ACTIVITY_EMPTY_LINK_MARGIN_TOP,
    bottom: ACTIVITY_EMPTY_BLOCK_PADDING_Y,
  });
}
