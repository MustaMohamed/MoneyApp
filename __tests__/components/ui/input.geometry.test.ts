import {
  INPUT_BORDER_WIDTH,
  INPUT_HIDDEN_TEXT_STYLE,
  INPUT_PADDING_INLINE,
  INPUT_REST_TEXT_START,
  resolveInputRestTextEnd,
  resolveInputRestTextProps,
} from '@/components/ui/input.geometry';
import {
  resolveFitAmountTextProps,
  resolveOneLineTextProps,
  scaledTextStyle,
} from '@/components/ui/text_scale.geometry';
import { Colors, Type } from '@/constants/theme';

describe('INPUT_REST_TEXT_START', () => {
  it("MA-179: the value at rest starts after the input's border and padding, as its own text does", () => {
    expect(INPUT_REST_TEXT_START).toBe(INPUT_PADDING_INLINE + INPUT_BORDER_WIDTH);
  });
});

describe('resolveInputRestTextEnd', () => {
  it("MA-179: a measured suffix ends the value at the suffix, inside the input's border", () => {
    expect(resolveInputRestTextEnd(64)).toBe(64 + INPUT_BORDER_WIDTH);
  });

  it.each([0, undefined])(
    'MA-179: a suffix width of %s ends the value at the field padding',
    (suffixWidth) => {
      expect(resolveInputRestTextEnd(suffixWidth)).toBe(INPUT_PADDING_INLINE + INPUT_BORDER_WIDTH);
    },
  );
});

describe('INPUT_HIDDEN_TEXT_STYLE', () => {
  it('MA-179: the input text under a value at rest has a colour Android Fabric draws, alpha above 0', () => {
    const { color } = INPUT_HIDDEN_TEXT_STYLE;
    expect(color).not.toBe(Colors.shared.transparent);
    expect(color).toMatch(/^#[0-9a-fA-F]{8}$/);
    expect(Number.parseInt(color.slice(7, 9), 16)).toBeGreaterThan(0);
  });
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
