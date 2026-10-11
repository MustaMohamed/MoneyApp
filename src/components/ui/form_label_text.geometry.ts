import { type ScaledTextStyle, scaledTextStyle } from '@/components/ui/text_scale.geometry';
import { Type } from '@/constants/theme';

/** The label's app-scaled pair and the height its row keeps for `reserveLines` of it, one line more above scale 1 for a tag under it; `undefined` when no line is reserved. */
export function resolveFormLabelReserve(
  reserveLines: 1 | 2 | undefined,
  fontScale: number,
  tagLine = false,
): { text: ScaledTextStyle; minHeight: number } | undefined {
  if (reserveLines === undefined) return undefined;
  const text = scaledTextStyle(Type.detail, fontScale);
  const lines = reserveLines + (tagLine && fontScale > 1 ? 1 : 0);
  return { text, minHeight: lines * text.lineHeight };
}
