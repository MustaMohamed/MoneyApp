import { resolveKeptSpaceHeight, scaledTextStyle } from '@/components/ui/text_scale.geometry';
import { Type } from '@/constants/theme';
import { ms } from '@/utils/responsive';

export const DETAIL_ROW_HEIGHT = ms(58);
export const DETAIL_ROW_LABEL_FONT_SIZE = Type.overline;
export const DETAIL_ROW_VALUE_FONT_SIZE = Type.meta;

function rowLines(fontScale: number): number {
  return (
    scaledTextStyle(DETAIL_ROW_LABEL_FONT_SIZE, fontScale).lineHeight +
    scaledTextStyle(DETAIL_ROW_VALUE_FONT_SIZE, fontScale).lineHeight
  );
}

export function resolveDetailRowHeight(fontScale: number): number {
  return resolveKeptSpaceHeight(DETAIL_ROW_HEIGHT, rowLines, fontScale);
}
