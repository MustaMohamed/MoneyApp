import { DETAIL_ROWS_CARD_MARGIN_TOP } from '@/components/ui/detail_rows_card.geometry';
import {
  SECTION_HEADER_MARGIN_BOTTOM,
  SECTION_HEADER_MARGIN_TOP,
} from '@/components/ui/section_header.geometry';
import { scaledTextStyle } from '@/components/ui/text_scale.geometry';
import { type TouchFloorHitSlop, Type, touchFloorHitSlopWithin } from '@/constants/theme';

/** The section header's whole gaps, to the card above and to the payments card below. */
export function resolvePaymentsSeeAllHitSlop(fontScale: number): TouchFloorHitSlop {
  return touchFloorHitSlopWithin(scaledTextStyle(Type.caption, fontScale).lineHeight, {
    top: SECTION_HEADER_MARGIN_TOP,
    bottom: SECTION_HEADER_MARGIN_BOTTOM + DETAIL_ROWS_CARD_MARGIN_TOP,
  });
}
