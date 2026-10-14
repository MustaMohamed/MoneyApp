import {
  INPUT_PADDING_INLINE,
  resolveInputRestTextInsets,
  resolveInputRestTextProps,
} from '@/components/ui/input.geometry';
import {
  resolveFitAmountTextProps,
  resolveOneLineTextProps,
  scaledTextStyle,
} from '@/components/ui/text_scale.geometry';
import { Type } from '@/constants/theme';

describe('resolveInputRestTextInsets', () => {
  it('MA-179: a measured suffix ends the value at the suffix, after the field padding at the start', () => {
    expect(resolveInputRestTextInsets(64)).toEqual({ start: INPUT_PADDING_INLINE, end: 64 });
  });

  it.each([0, undefined])(
    'MA-179: a suffix width of %s ends the value at the field padding',
    (suffixWidth) => {
      expect(resolveInputRestTextInsets(suffixWidth)).toEqual({
        start: INPUT_PADDING_INLINE,
        end: INPUT_PADDING_INLINE,
      });
    },
  );
});

describe('resolveInputRestTextProps', () => {
  it("MA-179: 'fit' at font scale 2 is the input step's one-line amount that shrinks to fit", () => {
    expect(resolveInputRestTextProps('fit', 2)).toEqual(resolveFitAmountTextProps(Type.subhead, 2));
  });

  it("MA-179: 'ellipsis' at font scale 2 is the input step's one line ending in a tail ellipsis", () => {
    expect(resolveInputRestTextProps('ellipsis', 2)).toEqual(
      resolveOneLineTextProps(scaledTextStyle(Type.subhead, 2)),
    );
  });
});
