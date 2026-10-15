import { Size, TOUCH_SLOP_PIXEL_MARGIN, TouchSize } from '@/constants/theme';
import {
  CHIP_SLOP_Y,
  ROW_PADDING_BOTTOM,
  ROW_PADDING_TOP,
} from '@/modules/transactions/screens/transactions/components/account_chips.geometry';

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
