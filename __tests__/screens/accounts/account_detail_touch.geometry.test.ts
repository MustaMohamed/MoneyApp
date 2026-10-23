import { resolveCompactCtaHeight, resolveCompactCtaHitSlop } from '@/components/ui/button.geometry';
import { DETAIL_ROWS_CARD_MARGIN_TOP } from '@/components/ui/detail_rows_card.geometry';
import {
  SECTION_HEADER_MARGIN_BOTTOM,
  SECTION_HEADER_MARGIN_TOP,
} from '@/components/ui/section_header.geometry';
import { scaledTextStyle } from '@/components/ui/text_scale.geometry';
import { Spacing, TouchSize, Type } from '@/constants/theme';
import {
  ACTIVITY_EMPTY_BLOCK_PADDING_Y,
  ARCHIVED_DELETE_MARGIN_TOP,
  ARCHIVED_UNARCHIVE_ROOM,
  resolveActivityEmptyLinkHitSlop,
  resolveActivitySeeAllHitSlop,
} from '@/modules/accounts/screens/accounts/detail/components/account_detail_touch.geometry';

const captionLine = (fontScale: number) => scaledTextStyle(Type.caption, fontScale).lineHeight;
const linkTotal = (fontScale: number, slop: { top: number; bottom: number }) =>
  captionLine(fontScale) + slop.top + slop.bottom;

describe('resolveActivitySeeAllHitSlop', () => {
  it('MA-242: over activity rows at font scale 1.0 See all stops at half the gap to each neighbouring control, under the floor', () => {
    const slop = resolveActivitySeeAllHitSlop(1, 'rows');

    expect(slop.top).toBeCloseTo(SECTION_HEADER_MARGIN_TOP / 2, 6);
    expect(slop.bottom).toBeCloseTo(
      (SECTION_HEADER_MARGIN_BOTTOM + DETAIL_ROWS_CARD_MARGIN_TOP) / 2,
      6,
    );
    expect(linkTotal(1, slop)).toBeLessThan(TouchSize.min);
  });

  it('MA-242: over the activity load error at font scale 1.0 See all reaches the floor, its bottom inside the whole gap to the alert', () => {
    const slop = resolveActivitySeeAllHitSlop(1, 'error');

    expect(linkTotal(1, slop)).toBeGreaterThanOrEqual(TouchSize.min);
    expect(slop.bottom).toBeLessThan(SECTION_HEADER_MARGIN_BOTTOM + DETAIL_ROWS_CARD_MARGIN_TOP);
  });

  it.each(['rows', 'error'] as const)(
    'MA-242: over %s at font scale 2.0 See all reaches the floor',
    (body) => {
      expect(linkTotal(2, resolveActivitySeeAllHitSlop(2, body))).toBeGreaterThanOrEqual(
        TouchSize.min,
      );
    },
  );
});

describe('resolveActivityEmptyLinkHitSlop', () => {
  it.each([1, 2])(
    'MA-242: at font scale %p Add a transaction reaches the floor inside the gap to the body text and the block padding',
    (fontScale) => {
      const slop = resolveActivityEmptyLinkHitSlop(fontScale);

      expect(linkTotal(fontScale, slop)).toBeGreaterThanOrEqual(TouchSize.min);
      expect(slop.top).toBeLessThanOrEqual(Spacing.sm);
      expect(slop.bottom).toBeLessThanOrEqual(ACTIVITY_EMPTY_BLOCK_PADDING_Y);
    },
  );
});

describe('the archived account Unarchive slop', () => {
  it.each([1, 2])(
    'MA-242: at font scale %p Unarchive reaches the floor and stops at half the gap to Delete',
    (fontScale) => {
      const slop = resolveCompactCtaHitSlop('md', fontScale, ARCHIVED_UNARCHIVE_ROOM);

      expect(slop.bottom).toBeLessThanOrEqual(ARCHIVED_DELETE_MARGIN_TOP / 2);
      expect(
        resolveCompactCtaHeight('md', fontScale) + slop.top + slop.bottom,
      ).toBeGreaterThanOrEqual(TouchSize.min);
    },
  );
});
