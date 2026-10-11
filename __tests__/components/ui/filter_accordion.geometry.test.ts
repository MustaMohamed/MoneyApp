import {
  FILTER_AMOUNT_ERROR_SLOT_HEIGHT,
  FILTER_AMOUNT_FIELD_SLOT_HEIGHT,
  resolveFilterAmountSlotStyle,
} from '@/components/ui/filter_accordion.geometry';
import { Type, lineHeightFor } from '@/constants/theme';
import { ms } from '@/utils/responsive';

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
