import {
  CHIP_SLOP_Y,
  CHIP_TILE,
  ROW_PADDING_BOTTOM,
  ROW_PADDING_TOP,
  resolveTileChipPaddingVertical,
} from '@/components/ui/account_chips.geometry';
import {
  PILL_BORDER_WIDTH,
  SELECTABLE_PILL_LABEL_FONT_SIZE,
  SELECTABLE_PILL_PADDING_BLOCK,
} from '@/components/ui/chip.geometry';
import { scaledTextStyle } from '@/components/ui/text_scale.geometry';
import { Size, TOUCH_SLOP_PIXEL_MARGIN, TouchSize } from '@/constants/theme';

describe('account chip row geometry', () => {
  it('lifts the compact chip to the touch floor plus the pixel margin on each side', () => {
    expect(Size.compactChipHeight + 2 * CHIP_SLOP_Y).toBeCloseTo(
      TouchSize.min + 2 * TOUCH_SLOP_PIXEL_MARGIN,
      5,
    );
  });

  it('holds the whole slop in each row padding, since Android drops a touch outside the ScrollView', () => {
    expect(ROW_PADDING_TOP).toBeGreaterThanOrEqual(CHIP_SLOP_Y);
    expect(ROW_PADDING_BOTTOM).toBeGreaterThanOrEqual(CHIP_SLOP_Y);
  });
});

describe('resolveTileChipPaddingVertical', () => {
  it('holds a tile chip at the compact chip height at font scale 1.0, where the tile is its tallest child', () => {
    expect(scaledTextStyle(SELECTABLE_PILL_LABEL_FONT_SIZE, 1).lineHeight).toBeLessThan(CHIP_TILE);
    expect(2 * PILL_BORDER_WIDTH + 2 * resolveTileChipPaddingVertical(1) + CHIP_TILE).toBeCloseTo(
      Size.compactChipHeight,
      5,
    );
  });

  it('gives a tile chip the bare pill block at font scale 2.0, where the label line outgrows the tile', () => {
    expect(scaledTextStyle(SELECTABLE_PILL_LABEL_FONT_SIZE, 2).lineHeight).toBeGreaterThanOrEqual(
      CHIP_TILE,
    );
    expect(resolveTileChipPaddingVertical(2)).toBe(SELECTABLE_PILL_PADDING_BLOCK);
  });
});
