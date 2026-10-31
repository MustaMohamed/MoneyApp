import { DETAIL_ROWS_CARD_MARGIN_TOP } from '@/components/ui/detail_rows_card.geometry';
import {
  SECTION_HEADER_MARGIN_BOTTOM,
  SECTION_HEADER_MARGIN_TOP,
} from '@/components/ui/section_header.geometry';
import { scaledTextStyle } from '@/components/ui/text_scale.geometry';
import { TouchSize, Type } from '@/constants/theme';
import { resolvePaymentsSeeAllHitSlop } from '@/modules/commitments/screens/commitments/detail/components/payment_history.geometry';

describe('resolvePaymentsSeeAllHitSlop (MA-213)', () => {
  it.each([1, 2])('reaches the touch floor inside both gaps at font scale %d', (fontScale) => {
    const slop = resolvePaymentsSeeAllHitSlop(fontScale);
    const line = scaledTextStyle(Type.caption, fontScale).lineHeight;

    expect(line + slop.top + slop.bottom).toBeGreaterThanOrEqual(TouchSize.min);
    expect(slop.top).toBeLessThanOrEqual(SECTION_HEADER_MARGIN_TOP);
    expect(slop.bottom).toBeLessThanOrEqual(
      SECTION_HEADER_MARGIN_BOTTOM + DETAIL_ROWS_CARD_MARGIN_TOP,
    );
  });
});
