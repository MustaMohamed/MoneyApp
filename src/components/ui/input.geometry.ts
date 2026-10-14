import {
  type FitAmountTextProps,
  type OneLineTextProps,
  resolveFitAmountTextProps,
  resolveOneLineTextProps,
  scaledTextStyle,
} from '@/components/ui/text_scale.geometry';
import { Type } from '@/constants/theme';

/** How a field with no focus draws its value above font scale 1: a text over the input that shrinks to fit or ends in `…`, or the input's own text from its start. */
export type InputValueAtRest = 'fit' | 'ellipsis' | 'start';

// `.input__input`'s own `padding-inline`, unscaled CSS.
export const INPUT_PADDING_INLINE = 12;

/** A caret at the value's start, so a field with no focus shows its first glyph. */
export const INPUT_REST_SELECTION = { start: 0, end: 0 } as const;

export interface InputRestTextInsets {
  start: number;
  end: number;
}

/** The value at rest starts after the field's padding and ends at its suffix, or at the padding when the field has none. */
export function resolveInputRestTextInsets(suffixWidth: number | undefined): InputRestTextInsets {
  return {
    start: INPUT_PADDING_INLINE,
    end: suffixWidth !== undefined && suffixWidth > 0 ? suffixWidth : INPUT_PADDING_INLINE,
  };
}

/** The value at rest at the input's `text-[16px]` step: one line that shrinks to fit, or one line ending in a tail `…`. */
export function resolveInputRestTextProps(
  display: 'fit' | 'ellipsis',
  fontScale: number,
): FitAmountTextProps | OneLineTextProps {
  return display === 'fit'
    ? resolveFitAmountTextProps(Type.subhead, fontScale)
    : resolveOneLineTextProps(scaledTextStyle(Type.subhead, fontScale));
}
