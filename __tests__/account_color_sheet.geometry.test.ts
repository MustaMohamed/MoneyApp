import { Size, Spacing, TouchSize } from '@/constants/theme';
import { AcctTokens } from '@/constants/theme_tokens';
import {
  ACCOUNT_COLOR_CELL_HEIGHT,
  ACCOUNT_COLOR_GRID_COLUMNS,
  ACCOUNT_COLOR_GRID_METRICS,
  ACCOUNT_COLOR_GRID_ROWS_PER_BLOCK,
  accountColorSwatchLabel,
  resolveAccountColorGrid,
  resolveColorGridMetrics,
} from '@/modules/accounts/components/account_form/account_color_sheet.geometry';
import { ACCOUNT_PALETTE } from '@/modules/accounts/constants/account_palette';
import { ms } from '@/utils/responsive';

/**
 * Local replica of src/utils/responsive.ts:15-22. responsive.ts freezes SCALE
 * from Dimensions at import time and jest-expo pins that to 750pt (scale 1.15),
 * so importing Size/Spacing gives ONE scale and no sweep is possible. The
 * assertion in "the replica matches the shipped ms()" is what stops this
 * replica drifting from the real formula.
 */
const msAt = (n: number, width: number) =>
  Math.round(n * Math.min(Math.max(width / 390, 0.85), 1.15));

const WIDTHS = [320, 360, 375, 390, 412, 430] as const;

const metricsAt = (width: number) =>
  resolveColorGridMetrics({
    screenWidth: width,
    horizontalPadding: msAt(16, width), // Spacing.md
    gap: msAt(4, width), // Spacing.xxs
    cellHeight: Math.max(msAt(44, width), TouchSize.min), // Size.dialogButton floored
  });

describe('the replica matches the shipped ms()', () => {
  it('agrees at jest-expo 750pt for every token this file scales', () => {
    expect(msAt(16, 750)).toBe(ms(16));
    expect(msAt(4, 750)).toBe(ms(4));
    expect(msAt(44, 750)).toBe(ms(44));
  });

  // ADDED AT PLAN REVIEW (round 1). Without this the whole sweep below is
  // self-referential: every number in it is computed from values the TEST
  // supplies, so it would stay green if the shipped ACCOUNT_COLOR_GRID_METRICS
  // were built from Spacing.lg, or from a 6-column default, or from a cell
  // height that never touched TouchSize. These four assertions are the only
  // thing tying the sweep to the grid the user actually taps.
  it('is anchored to the tokens the component actually feeds the resolver', () => {
    expect(Spacing.md).toBe(ms(16));
    expect(Spacing.xxs).toBe(ms(4));
    expect(Size.dialogButton).toBe(ms(44));
    // jest-expo pins Dimensions to 750pt, which is the module-scope width
    // ACCOUNT_COLOR_GRID_METRICS was computed at.
    expect(ACCOUNT_COLOR_GRID_METRICS).toEqual(metricsAt(750));
  });
});

describe('grid model', () => {
  it('is two blocks of 8 columns x 2 rows, covering all 32', () => {
    const blocks = resolveAccountColorGrid();
    expect(blocks).toHaveLength(2);
    expect(ACCOUNT_COLOR_GRID_COLUMNS).toBe(8);
    expect(ACCOUNT_COLOR_GRID_ROWS_PER_BLOCK).toBe(2);
    for (const block of blocks) {
      expect(block.rows).toHaveLength(2);
      for (const row of block.rows) expect(row).toHaveLength(8);
    }
    expect(blocks.flatMap((b) => b.rows.flat())).toHaveLength(ACCOUNT_PALETTE.length);
  });

  it('pairs each family tone-above-tone in the same column', () => {
    // The Done-when clause and mockup D1's caption: "Column order is identical
    // in both blocks." account_palette.test.ts already asserts the FLAT arrays
    // agree; this asserts the wrap into 8 columns does not break the pairing,
    // which is the thing a user sees.
    const [rich, soft] = resolveAccountColorGrid();
    expect(rich?.tone).toBe('rich');
    expect(soft?.tone).toBe('soft');
    for (let r = 0; r < ACCOUNT_COLOR_GRID_ROWS_PER_BLOCK; r++) {
      for (let c = 0; c < ACCOUNT_COLOR_GRID_COLUMNS; c++) {
        expect(soft?.rows[r]?.[c]?.family).toBe(rich?.rows[r]?.[c]?.family);
      }
    }
    expect(rich?.rows[0]?.[0]?.family).toBe('midnight');
    expect(rich?.rows[1]?.[7]?.family).toBe('graphite');
    expect(soft?.rows[0]?.[2]?.hex).toBe(AcctTokens.nile.soft);
  });
});

describe('accessible names', () => {
  it('gives all 32 swatches a distinct name carrying family and tone', () => {
    const labels = ACCOUNT_PALETTE.map(accountColorSwatchLabel);
    expect(new Set(labels).size).toBe(32);
    for (const [i, label] of labels.entries()) {
      expect(label).toContain(ACCOUNT_PALETTE[i]?.familyLabel);
      expect(label).toContain(ACCOUNT_PALETTE[i]?.tone);
    }
    // Index 2 is nile rich — AcctTokens declaration order, midnight, gold, nile.
    // This is spec.md:89's example string minus ", selected"; see plan step 0.2.
    expect(labels[2]).toBe('Nile Teal, rich');
  });
});

describe('cell geometry across supported widths', () => {
  it('never lets hitSlop overlap the neighbouring cell', () => {
    for (const width of WIDTHS) {
      const m = metricsAt(width);
      expect(m.hitSlopX * 2).toBeLessThanOrEqual(msAt(4, width));
    }
  });

  it('clears WCAG 2.2 SC 2.5.8 (24x24) at every supported width', () => {
    for (const width of WIDTHS) {
      const m = metricsAt(width);
      expect(m.cellWidth).toBeGreaterThanOrEqual(24);
      expect(m.cellHeight).toBeGreaterThanOrEqual(24);
    }
  });

  it('meets the 44pt vertical floor at every supported width', () => {
    for (const width of WIDTHS) {
      expect(metricsAt(width).cellHeight).toBeGreaterThanOrEqual(TouchSize.min);
    }
  });

  it('reproduces the mockup at the 390pt reference', () => {
    // mockup.html:1952-1954 — "8 columns at 390pt with 16pt sheet padding and a
    // 4pt gap gives a cell of 41.25 x 44 ... hitSlop 2 -> 45.25 x 44".
    const m = metricsAt(390);
    expect(m.cellWidth).toBeCloseTo(41.25, 5);
    expect(m.cellHeight).toBe(44);
    expect(m.hitSlopX).toBe(2);
    expect(m.effectiveWidth).toBeCloseTo(45.25, 5);
  });

  it('records that the 44pt HORIZONTAL floor is unreachable below 390pt', () => {
    // NOT A DIAL. Plan step 0.4: eight columns, 32 swatches and no scrolling
    // cannot all hold at 320pt. This is the shortfall written down so it moves
    // through review rather than through a silent layout edit. Loosening the
    // grid to 6 columns or making it scroll is @marcus's call, not a fix for
    // whoever is looking at a red test.
    expect(metricsAt(320).effectiveWidth).toBeCloseTo(35.875, 5);
    expect(metricsAt(360).effectiveWidth).toBeCloseTo(41.75, 5);
    expect(metricsAt(375).effectiveWidth).toBeCloseTo(43.625, 5);
    expect(metricsAt(390).effectiveWidth).toBeGreaterThanOrEqual(TouchSize.min);
    expect(metricsAt(430).effectiveWidth).toBeGreaterThanOrEqual(TouchSize.min);
  });

  it('exports a cell height bound to the tokens, floored at the touch minimum', () => {
    expect(ACCOUNT_COLOR_CELL_HEIGHT).toBe(Math.max(Size.dialogButton, TouchSize.min));
    expect(ACCOUNT_COLOR_CELL_HEIGHT).toBeGreaterThanOrEqual(TouchSize.min);
    expect(Spacing.xxs).toBe(ms(4)); // the gap the metrics are derived from
  });
});
