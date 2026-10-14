import { Platform } from 'react-native';

import {
  type FitAmountTextProps,
  type OneLineTextProps,
  resolveFitAmountTextProps,
  resolveOneLineTextProps,
  scaledTextStyle,
} from '@/components/ui/text_scale.geometry';
import { Colors, Type } from '@/constants/theme';

/** How a field with no focus draws its value above font scale 1: a text over the input that shrinks to fit or ends in `…`, or the input's own text from its start. */
export type InputValueAtRest = 'fit' | 'ellipsis' | 'start';

/** The displays drawn as a text over the input. */
export type InputRestOverlay = Exclude<InputValueAtRest, 'start'>;

export function isInputRestOverlay(
  display: InputValueAtRest | undefined,
): display is InputRestOverlay {
  return display !== undefined && display !== 'start';
}

// `.input__input`'s own `padding-inline`, unscaled CSS.
export const INPUT_PADDING_INLINE = 12;

// `.input__input`'s `android:border-[1.5px]` (heroui-native `input.styles.ts:33`), which Fabric adds to the text's insets; iOS draws an outline.
export const INPUT_BORDER_WIDTH = Platform.OS === 'android' ? 1.5 : 0;

/** Where the value at rest starts: after the input's border and padding, as its own text does. */
export const INPUT_REST_TEXT_START = INPUT_PADDING_INLINE + INPUT_BORDER_WIDTH;

/** A caret at the value's start, so a field with no focus shows its first glyph. */
export const INPUT_REST_SELECTION = { start: 0, end: 0 } as const;

/** The input's own text under a value at rest; alpha 1/255, since Android Fabric draws a colour of 0 in the platform default. */
export const INPUT_HIDDEN_TEXT_STYLE = { color: Colors.shared.hiddenText } as const;

/** The value at rest ends at the field's suffix, or at its padding when it has none, inside the input's border. */
export function resolveInputRestTextEnd(suffixWidth: number | undefined): number {
  const inner = suffixWidth !== undefined && suffixWidth > 0 ? suffixWidth : INPUT_PADDING_INLINE;
  return inner + INPUT_BORDER_WIDTH;
}

const REST_TEXT_PROPS: Record<
  InputRestOverlay,
  (fontScale: number) => FitAmountTextProps | OneLineTextProps
> = {
  fit: (fontScale) => resolveFitAmountTextProps(Type.subhead, fontScale),
  ellipsis: (fontScale) => resolveOneLineTextProps(scaledTextStyle(Type.subhead, fontScale)),
};

/** The value at rest at the input's `text-[16px]` step: one line that shrinks to fit, or one line ending in a tail `…`. */
export function resolveInputRestTextProps(
  display: InputRestOverlay,
  fontScale: number,
): FitAmountTextProps | OneLineTextProps {
  return REST_TEXT_PROPS[display](fontScale);
}
