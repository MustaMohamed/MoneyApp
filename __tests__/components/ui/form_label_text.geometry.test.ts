import { resolveFormLabelReserve } from '@/components/ui/form_label_text.geometry';
import { scaledTextStyle } from '@/components/ui/text_scale.geometry';
import { Type } from '@/constants/theme';

const FONT_SCALES = [1, 2] as const;
const RESERVED_LINES = [1, 2] as const;

describe.each(FONT_SCALES)('resolveFormLabelReserve at font scale %s', (fontScale) => {
  it('MA-162: with no line reserved there is no reserve', () => {
    expect(resolveFormLabelReserve(undefined, fontScale)).toBeUndefined();
  });

  it.each(RESERVED_LINES)(
    'MA-162: %s reserved keeps the scaled Type.detail pair and that many of its lines',
    (lines) => {
      const text = scaledTextStyle(Type.detail, fontScale);

      expect(resolveFormLabelReserve(lines, fontScale)).toEqual({
        text,
        minHeight: lines * text.lineHeight,
      });
    },
  );
});

describe('resolveFormLabelReserve with a tag line', () => {
  it.each(RESERVED_LINES)(
    'MA-171: %s reserved keeps one more line above font scale 1 and no more at it',
    (lines) => {
      const atOne = scaledTextStyle(Type.detail, 1);
      const atTwo = scaledTextStyle(Type.detail, 2);

      expect(resolveFormLabelReserve(lines, 1, true)).toEqual({
        text: atOne,
        minHeight: lines * atOne.lineHeight,
      });
      expect(resolveFormLabelReserve(lines, 2, true)).toEqual({
        text: atTwo,
        minHeight: (lines + 1) * atTwo.lineHeight,
      });
    },
  );

  it('MA-171: with no line reserved there is no reserve at font scale 2', () => {
    expect(resolveFormLabelReserve(undefined, 2, true)).toBeUndefined();
  });
});
