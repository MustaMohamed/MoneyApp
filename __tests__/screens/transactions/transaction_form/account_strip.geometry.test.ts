import { Size, Spacing, TouchSize } from '@/constants/theme';
import {
  ACCOUNT_STRIP_CHIP_HEIGHT,
  ACCOUNT_STRIP_CHIP_PADDING_X,
  ACCOUNT_STRIP_CHIP_SLOP_Y,
  ACCOUNT_STRIP_CHIP_WIDTH,
  ACCOUNT_STRIP_GAP,
  ACCOUNT_STRIP_HIT_SLOP,
  ACCOUNT_STRIP_TILE,
  ACCOUNT_STRIP_TILE_NAME_GAP,
} from '@/modules/transactions/screens/transactions/transaction_form/components/transaction_form.geometry';
import { ms } from '@/utils/responsive';

describe('account strip geometry', () => {
  it('draws each chip as the 118 by 40 row with an 8 gap', () => {
    expect(ACCOUNT_STRIP_CHIP_WIDTH).toBe(ms(118));
    expect(ACCOUNT_STRIP_CHIP_HEIGHT).toBe(ms(40));
    expect(ACCOUNT_STRIP_GAP).toBe(Spacing.xs);
  });

  it('cuts the third chip inside a 390 screen less the strip margins', () => {
    const visible = ms(390) - 2 * Spacing.md;
    expect(2 * ACCOUNT_STRIP_CHIP_WIDTH + 2 * ACCOUNT_STRIP_GAP).toBeLessThan(visible);
    expect(3 * ACCOUNT_STRIP_CHIP_WIDTH + 2 * ACCOUNT_STRIP_GAP).toBeGreaterThan(visible);
  });

  it('reaches a 44 hit target through the vertical slop', () => {
    expect(ACCOUNT_STRIP_CHIP_HEIGHT + 2 * ACCOUNT_STRIP_CHIP_SLOP_Y).toBeGreaterThanOrEqual(
      TouchSize.min,
    );
    expect(ACCOUNT_STRIP_CHIP_SLOP_Y).toBeGreaterThanOrEqual(Spacing.xxxxs);
    expect(ACCOUNT_STRIP_HIT_SLOP).toEqual({
      top: ACCOUNT_STRIP_CHIP_SLOP_Y,
      bottom: ACCOUNT_STRIP_CHIP_SLOP_Y,
      left: ACCOUNT_STRIP_GAP / 2,
      right: ACCOUNT_STRIP_GAP / 2,
    });
    expect(ACCOUNT_STRIP_CHIP_WIDTH).toBeGreaterThanOrEqual(TouchSize.min);
  });

  it('pads the row 10 at the sides and sets the 24 tile 8 from the name', () => {
    expect(ACCOUNT_STRIP_CHIP_PADDING_X).toBe(ms(10));
    expect(ACCOUNT_STRIP_TILE_NAME_GAP).toBe(Spacing.xs);
    expect(ACCOUNT_STRIP_TILE).toBe(Size.dualTile);
  });
});
