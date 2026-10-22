import {
  FILTER_ACCORDION_CARD_BORDER,
  FILTER_ACCORDION_CARD_MARGIN_BOTTOM,
  FILTER_ACCORDION_CONTENT_PADDING_BOTTOM,
  FILTER_AMOUNT_ERROR_SLOT_HEIGHT,
  FILTER_AMOUNT_FIELD_SLOT_HEIGHT,
  FILTER_OPTION_LIST_EDGE,
  resolveFilterAmountSlotStyle,
} from '@/components/ui/filter_accordion.geometry';
import { Type, lineHeightFor } from '@/constants/theme';
import { ms } from '@/utils/responsive';

describe('FILTER_OPTION_LIST_EDGE', () => {
  it('MA-236: the top row takes no room above it, where the section trigger draws over the content', () => {
    expect(FILTER_OPTION_LIST_EDGE.top).toBe(0);
  });

  it('MA-236: the bottom row takes half the gap to the next card trigger, inside the content padding', () => {
    expect(FILTER_OPTION_LIST_EDGE.bottom).toBe(
      (FILTER_ACCORDION_CONTENT_PADDING_BOTTOM +
        2 * FILTER_ACCORDION_CARD_BORDER +
        FILTER_ACCORDION_CARD_MARGIN_BOTTOM) /
        2,
    );
    expect(FILTER_OPTION_LIST_EDGE.bottom).toBeLessThan(FILTER_ACCORDION_CONTENT_PADDING_BOTTOM);
  });

  // The literals, not the tokens: these replace `pb-3.5`, `border` and `mb-2` at the same values, so nothing the sheet draws moves.
  it('MA-236: the card keeps its 14 dp content padding, 1 dp border and 8 dp margin', () => {
    expect(FILTER_ACCORDION_CONTENT_PADDING_BOTTOM).toBe(14);
    expect(FILTER_ACCORDION_CARD_BORDER).toBe(1);
    expect(FILTER_ACCORDION_CARD_MARGIN_BOTTOM).toBe(8);
  });
});

describe('filter amount slot constants', () => {
  it('keeps the field slot at 76 and the range slot at 16', () => {
    expect(FILTER_AMOUNT_FIELD_SLOT_HEIGHT).toBe(ms(76));
    expect(FILTER_AMOUNT_ERROR_SLOT_HEIGHT).toBe(ms(16));
  });
});

describe('resolveFilterAmountSlotStyle', () => {
  it.each([1, 0.85])(
    'at font scale %s fixes both slots at their heights, as today',
    (fontScale) => {
      expect(resolveFilterAmountSlotStyle(fontScale)).toStrictEqual({
        field: { height: FILTER_AMOUNT_FIELD_SLOT_HEIGHT },
        range: { height: FILTER_AMOUNT_ERROR_SLOT_HEIGHT },
      });
    },
  );

  it('at font scale 2 floors each slot and fixes neither, so a slot grows with its message', () => {
    const { field, range } = resolveFilterAmountSlotStyle(2);

    expect(field).toStrictEqual({ minHeight: FILTER_AMOUNT_FIELD_SLOT_HEIGHT });
    expect(range).toStrictEqual({ minHeight: lineHeightFor(2 * Type.micro) });
    expect(field).not.toHaveProperty('height');
    expect(range).not.toHaveProperty('height');
  });
});
