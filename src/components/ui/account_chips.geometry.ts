import {
  PILL_BORDER_WIDTH,
  SELECTABLE_PILL_LABEL_FONT_SIZE,
  SELECTABLE_PILL_PADDING_BLOCK,
} from '@/components/ui/chip.geometry';
import { scaledTextStyle } from '@/components/ui/text_scale.geometry';
import { Size, Spacing, touchFloorHitSlop } from '@/constants/theme';
import { ms } from '@/utils/responsive';

/** Lifts the compact chip to the touch floor; unscaled, so it can outgrow the scaled paddings on a small phone. */
export const CHIP_SLOP_Y = touchFloorHitSlop(Size.compactChipHeight).top;

/** Android drops a touch outside the ScrollView, so each padding holds the whole slop. */
export const ROW_PADDING_TOP = Math.max(ms(9), CHIP_SLOP_Y);
export const ROW_PADDING_BOTTOM = Math.max(Spacing.xs, CHIP_SLOP_Y);

/** Commitments canvas `.spill .id-tile`, a 20 square around a 14 glyph, the account strip's `Size.rowGlyph`. */
export const CHIP_TILE = ms(20);

/** `Size.compactChipHeight` while the tile is the chip's tallest child, the bare pill's block once the scaled label line reaches it. */
export function resolveTileChipPaddingVertical(fontScale: number): number {
  const { lineHeight } = scaledTextStyle(SELECTABLE_PILL_LABEL_FONT_SIZE, fontScale);
  return lineHeight >= CHIP_TILE
    ? SELECTABLE_PILL_PADDING_BLOCK
    : (Size.compactChipHeight - CHIP_TILE) / 2 - PILL_BORDER_WIDTH;
}
