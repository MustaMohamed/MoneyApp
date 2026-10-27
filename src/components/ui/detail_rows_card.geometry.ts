import { Spacing, Type, lineHeightFor } from '@/constants/theme';

// DetailRowsCard's `mt-4`, unscaled CSS px.
export const DETAIL_ROWS_CARD_MARGIN_TOP = 16;
// Canvas `.note-card` holding one line: its 12 padding, the overline, a 4 gap and the body line.
export const DETAIL_NOTE_MIN_HEIGHT =
  2 * Spacing.sm + lineHeightFor(Type.overline) + Spacing.xxs + lineHeightFor(Type.body);
