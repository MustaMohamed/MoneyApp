import { CHIP_ROW_ROOM_BELOW } from '@/components/ui/account_chips.geometry';
import { DISPLAY_HEADLINE_MAX_FONT_SCALE } from '@/components/ui/display_headline.geometry';
import {
  FILTER_BADGE_MAX_FONT_SCALE,
  SEARCH_CLEAR_INSET_END,
  SEARCH_INPUT_MAX_FONT_SCALE,
  SEARCH_ROW_GAP,
  SEARCH_ROW_MARGIN_BOTTOM,
  resolveSearchFilterRowGeometry,
  resolveSearchRowHitSlop,
} from '@/components/ui/search_filter_row.geometry';
import { scaledFontSize } from '@/components/ui/text_scale.geometry';
import {
  HIT_SLOP_UNCLIPPED_STYLE,
  Radius,
  Size,
  Spacing,
  TouchSize,
  Type,
  lineHeightFor,
  touchFloorHitSlop,
} from '@/constants/theme';
import { SUMMARY_HEADER_MARGIN_BOTTOM } from '@/modules/commitments/screens/commitments/components/summary_header.geometry';
import { ms } from '@/utils/responsive';

describe('resolveSearchRowHitSlop', () => {
  const cases = [1, 2].flatMap((fontScale) => [
    { fontScale, list: 'transactions', room: CHIP_ROW_ROOM_BELOW },
    { fontScale, list: 'commitments', room: SUMMARY_HEADER_MARGIN_BOTTOM },
  ]);

  it.each(cases)(
    'MA-236: on $list at font scale $fontScale the Filter button reaches the floor inside the room above and the row margin below',
    ({ fontScale, room }) => {
      const height = resolveSearchFilterRowGeometry(fontScale).input.height;
      const { filter } = resolveSearchRowHitSlop(height, room);

      expect(filter.top).toBeLessThanOrEqual(room);
      expect(filter.bottom).toBeLessThanOrEqual(SEARCH_ROW_MARGIN_BOTTOM);
      expect(height + filter.top + filter.bottom).toBeGreaterThanOrEqual(TouchSize.min);
      expect(filter.left).toBe(SEARCH_ROW_GAP / 2);
    },
  );

  it.each(cases)(
    'MA-236: on $list at font scale $fontScale the clear button reaches the floor inside its inset plus each room, and stops at half the gap to Filter',
    ({ fontScale, room }) => {
      const height = resolveSearchFilterRowGeometry(fontScale).input.height;
      const inset = (height - Size.searchClearTrack) / 2;
      const { clear } = resolveSearchRowHitSlop(height, room);

      expect(clear.top).toBeLessThanOrEqual(inset + room);
      expect(clear.bottom).toBeLessThanOrEqual(inset + SEARCH_ROW_MARGIN_BOTTOM);
      expect(Size.searchClearTrack + clear.top + clear.bottom).toBeGreaterThanOrEqual(
        TouchSize.min,
      );
      expect(clear.right).toBe((SEARCH_CLEAR_INSET_END + SEARCH_ROW_GAP) / 2);
      expect(clear.left).toBe(touchFloorHitSlop(Size.searchClearTrack).top);
    },
  );

  it.each([
    { label: 'the summary card margin', room: SUMMARY_HEADER_MARGIN_BOTTOM },
    { label: 'half the clamped chips padding', room: 5.5 },
  ])(
    'MA-236: Rule 1 gives a card its whole gap, so at a 31 dp input under $label Filter and clear each reach the floor, where half the card gap, 4, leaves both at 43',
    ({ room }) => {
      const inputHeight = 31;
      const { filter, clear } = resolveSearchRowHitSlop(inputHeight, room);

      expect(inputHeight + filter.top + filter.bottom).toBeGreaterThanOrEqual(TouchSize.min);
      expect(Size.searchClearTrack + clear.top + clear.bottom).toBeGreaterThanOrEqual(
        TouchSize.min,
      );
    },
  );
});

describe('resolveSearchFilterRowGeometry', () => {
  it('caps the search input text at the app-wide 1.3 font scale', () => {
    expect(SEARCH_INPUT_MAX_FONT_SCALE).toBe(DISPLAY_HEADLINE_MAX_FONT_SCALE);
    expect(SEARCH_INPUT_MAX_FONT_SCALE).toBe(1.3);
  });

  it.each([0.85, 1])('keeps every box at its current size at font scale %s', (fontScale) => {
    const g = resolveSearchFilterRowGeometry(fontScale);
    expect(g.inputText).toBeUndefined();
    expect(g.input).toEqual({
      height: ms(36),
      minHeight: ms(36),
      paddingTop: 0,
      paddingBottom: 0,
    });
    expect(g.filterButton).toEqual({
      height: ms(36),
      width: ms(36),
      borderRadius: Radius.md,
      ...HIT_SLOP_UNCLIPPED_STYLE,
    });
    expect(g.badge).toEqual({
      top: ms(2),
      right: ms(2),
      minWidth: ms(16),
      height: ms(16),
      borderRadius: ms(16) / 2,
    });
    expect(g.badgeText.lineHeight).toBe(ms(16));
    expect(g.inputStyle).toEqual({
      height: ms(36),
      minHeight: ms(36),
      paddingTop: 0,
      paddingBottom: 0,
    });
  });

  it('at font scale 1 draws the badge count at Type.chip', () => {
    expect(resolveSearchFilterRowGeometry(1).badgeText.fontSize).toBe(Type.chip);
  });

  it('at font scale 2 sizes the input text at the 1.3 cap and holds its line box', () => {
    const g = resolveSearchFilterRowGeometry(2);
    const fontSize = scaledFontSize(Type.body, 2, SEARCH_INPUT_MAX_FONT_SCALE);
    expect(g.inputText).toEqual({ fontSize, lineHeight: lineHeightFor(fontSize) });
    expect(g.input.minHeight).toBe(g.input.height);
    expect(g.inputStyle).toEqual({
      height: g.input.height,
      minHeight: g.input.height,
      paddingTop: 0,
      paddingBottom: 0,
      fontSize,
      lineHeight: lineHeightFor(fontSize),
    });
  });

  it.each([2, 3])('at font scale %s keeps the input padding around its text line', (fontScale) => {
    const g = resolveSearchFilterRowGeometry(fontScale);
    expect(g.input.height - (g.inputText?.lineHeight ?? Infinity)).toBeGreaterThanOrEqual(
      2 * Spacing.xxs,
    );
  });

  it('stops growing the input text past the cap', () => {
    expect(resolveSearchFilterRowGeometry(3).inputText).toEqual(
      resolveSearchFilterRowGeometry(2).inputText,
    );
    expect(resolveSearchFilterRowGeometry(3).input).toEqual(
      resolveSearchFilterRowGeometry(2).input,
    );
  });

  it('at font scale 2 the filter button matches the input and the badge holds its count', () => {
    const g = resolveSearchFilterRowGeometry(2);
    expect(g.filterButton.height).toBe(g.input.height);
    expect(g.filterButton.width).toBe(ms(36));
    expect(g.badge.height).toBeGreaterThanOrEqual(
      lineHeightFor(scaledFontSize(Type.chip, 2, FILTER_BADGE_MAX_FONT_SCALE)),
    );
    expect(g.badge).toEqual(resolveSearchFilterRowGeometry(FILTER_BADGE_MAX_FONT_SCALE).badge);
    expect(g.badgeText.lineHeight).toBe(g.badge.height);
    expect(g.badge.top + g.badge.height).toBeLessThanOrEqual(g.filterButton.height / 2);
  });
});
