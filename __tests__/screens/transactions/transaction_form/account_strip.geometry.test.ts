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
  resolveAccountStripRevealX,
} from '@/modules/transactions/screens/transactions/transaction_form/components/transaction_form.geometry';
import { ms } from '@/utils/responsive';

const STRIP_VIEWPORT = ms(390) - 2 * Spacing.md;
const CHIP_PITCH = ACCOUNT_STRIP_CHIP_WIDTH + ACCOUNT_STRIP_GAP;
const leftEdgeOf = (index: number) => index * CHIP_PITCH;
const rightEdgeOf = (index: number) => leftEdgeOf(index) + ACCOUNT_STRIP_CHIP_WIDTH;

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

describe('resolveAccountStripRevealX', () => {
  it('returns the offset it was given for a chip that lies whole in view', () => {
    expect(
      resolveAccountStripRevealX({ index: 1, viewportWidth: STRIP_VIEWPORT, scrollX: 0 }),
    ).toBe(0);

    const scrolled = leftEdgeOf(3) - ACCOUNT_STRIP_GAP;
    expect(
      resolveAccountStripRevealX({ index: 3, viewportWidth: STRIP_VIEWPORT, scrollX: scrolled }),
    ).toBe(scrolled);
  });

  it('returns the seventh chip’s right edge less the viewport from offset 0, and that offset moves nothing', () => {
    const revealed = resolveAccountStripRevealX({
      index: 6,
      viewportWidth: STRIP_VIEWPORT,
      scrollX: 0,
    });

    expect(revealed).toBeCloseTo(rightEdgeOf(6) - STRIP_VIEWPORT, 5);
    expect(revealed).toBeGreaterThan(0);
    expect(
      resolveAccountStripRevealX({ index: 6, viewportWidth: STRIP_VIEWPORT, scrollX: revealed }),
    ).toBe(revealed);
  });

  it('returns the left edge of a chip that lies left of the offset, whole or in part', () => {
    expect(
      resolveAccountStripRevealX({
        index: 1,
        viewportWidth: STRIP_VIEWPORT,
        scrollX: leftEdgeOf(3),
      }),
    ).toBeCloseTo(leftEdgeOf(1), 5);
    expect(
      resolveAccountStripRevealX({
        index: 1,
        viewportWidth: STRIP_VIEWPORT,
        scrollX: leftEdgeOf(1) + ACCOUNT_STRIP_GAP,
      }),
    ).toBeCloseTo(leftEdgeOf(1), 5);
  });

  it('returns the offset it was given while the viewport is 0 wide', () => {
    expect(resolveAccountStripRevealX({ index: 6, viewportWidth: 0, scrollX: 0 })).toBe(0);
    expect(resolveAccountStripRevealX({ index: 1, viewportWidth: 0, scrollX: leftEdgeOf(3) })).toBe(
      leftEdgeOf(3),
    );
  });

  it('returns 0 for the first chip at offset 0', () => {
    expect(
      resolveAccountStripRevealX({ index: 0, viewportWidth: STRIP_VIEWPORT, scrollX: 0 }),
    ).toBe(0);
  });
});
