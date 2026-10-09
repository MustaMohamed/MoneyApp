import { type ScaledTextStyle, scaledTextStyle } from '@/components/ui/text_scale.geometry';
import { Type } from '@/constants/theme';

/** The label's app-scaled pair and the height its row keeps for `reserveLines` of it; `undefined` when no line is reserved. */
export function resolveFormLabelReserve(
  reserveLines: 1 | 2 | undefined,
  fontScale: number,
): { text: ScaledTextStyle; minHeight: number } | undefined {
  if (reserveLines === undefined) return undefined;
  const text = scaledTextStyle(Type.detail, fontScale);
  return { text, minHeight: reserveLines * text.lineHeight };
}
