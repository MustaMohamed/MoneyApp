import { DISPLAY_HEADLINE_MAX_FONT_SCALE } from '@/components/ui/display_headline.geometry';
import { TABS_LIST_PADDING, resolveSegmentedTabsGeometry } from '@/components/ui/tabs.geometry';
import { scaledTextStyle } from '@/components/ui/text_scale.geometry';
import { Spacing, TouchSize, Type, lineHeightFor } from '@/constants/theme';
import {
  ACCOUNT_STRIP_CHIP_HEIGHT,
  ACCOUNT_STRIP_CHIP_WIDTH,
  AMOUNT_ENTRY_MAX_FONT_SCALE,
  FACT_ROW_MIN_HEIGHT,
  TRANSACTION_FORM_CONTENT_CONTAINER_STYLE,
  TRANSACTION_FORM_SKELETON_GEOMETRY,
  resolveAccountStripChipGeometry,
  resolveTransactionFormSkeletonBars,
  resolveTypeTabsGeometry,
} from '@/modules/transactions/screens/transactions/transaction_form/components/transaction_form.geometry';

describe('TRANSACTION_FORM_SKELETON_GEOMETRY', () => {
  it('draws the strip as three chip-sized bars and each fact row at the fact-row minimum', () => {
    // Without these, undefined values would compare equal below.
    expect(ACCOUNT_STRIP_CHIP_HEIGHT).toBeDefined();
    expect(FACT_ROW_MIN_HEIGHT).toBe(TouchSize.min);
    expect(TRANSACTION_FORM_SKELETON_GEOMETRY).toMatchObject({
      stripBar: { width: ACCOUNT_STRIP_CHIP_WIDTH, height: ACCOUNT_STRIP_CHIP_HEIGHT },
      stripBarCount: 3,
      factRow: FACT_ROW_MIN_HEIGHT,
    });
    expect(TRANSACTION_FORM_SKELETON_GEOMETRY).not.toHaveProperty('accountRow');
  });

  it('draws four fact rows: Category, Budget, Date and Note', () => {
    expect(TRANSACTION_FORM_SKELETON_GEOMETRY).toMatchObject({ factRowCount: 4 });
  });

  it('sizes the key and value bars at the fact row text line box', () => {
    expect(TRANSACTION_FORM_SKELETON_GEOMETRY.keyBar.height).toBe(lineHeightFor(Type.body));
    expect(TRANSACTION_FORM_SKELETON_GEOMETRY.valueBar.height).toBe(lineHeightFor(Type.body));
  });
});

describe('resolveAccountStripChipGeometry', () => {
  it('at font scale 1 is the 40 chip with a label the OS scales', () => {
    const geometry = resolveAccountStripChipGeometry(1);
    expect(geometry.height).toBe(ACCOUNT_STRIP_CHIP_HEIGHT);
    expect(geometry.label).toBeUndefined();
  });

  it('at font scale 2 scales the label inside the chip, whose line box is under its height', () => {
    const label = scaledTextStyle(Type.micro, 2);
    expect(label.lineHeight).toBeLessThan(ACCOUNT_STRIP_CHIP_HEIGHT);
    expect(resolveAccountStripChipGeometry(2)).toEqual({
      height: ACCOUNT_STRIP_CHIP_HEIGHT,
      label,
    });
  });

  it('at font scale 3 grows the chip to the label line box, past its 1.0 height', () => {
    const geometry = resolveAccountStripChipGeometry(3);
    expect(geometry.label).toEqual(scaledTextStyle(Type.micro, 3));
    expect(geometry.height).toBe(lineHeightFor(3 * Type.micro));
    expect(geometry.height).toBeGreaterThan(ACCOUNT_STRIP_CHIP_HEIGHT);
  });
});

describe('resolveTransactionFormSkeletonBars', () => {
  const { amount, keyBar, valueBar } = TRANSACTION_FORM_SKELETON_GEOMETRY;

  it('at font scale 1 draws the supporting, amount, key, value and strip bars as today', () => {
    expect(resolveTransactionFormSkeletonBars(1)).toEqual({
      supportingBar: 12,
      amount,
      keyBar: { width: keyBar.width, height: keyBar.height },
      valueBar: { width: valueBar.width, height: valueBar.height },
      stripBar: { width: ACCOUNT_STRIP_CHIP_WIDTH, height: ACCOUNT_STRIP_CHIP_HEIGHT },
    });
  });

  it('stops the amount at the display headline stop, 1.3', () => {
    expect(AMOUNT_ENTRY_MAX_FONT_SCALE).toBe(DISPLAY_HEADLINE_MAX_FONT_SCALE);
    expect(AMOUNT_ENTRY_MAX_FONT_SCALE).toBe(1.3);
  });

  it('at font scale 2 doubles the supporting, key and value bars, keeps both widths, and stops the amount bar at the entry stop', () => {
    expect(resolveTransactionFormSkeletonBars(2)).toEqual({
      supportingBar: 24,
      amount: amount * AMOUNT_ENTRY_MAX_FONT_SCALE,
      keyBar: { width: keyBar.width, height: keyBar.height * 2 },
      valueBar: { width: valueBar.width, height: valueBar.height * 2 },
      stripBar: {
        width: ACCOUNT_STRIP_CHIP_WIDTH,
        height: resolveAccountStripChipGeometry(2).height,
      },
    });
  });

  it('draws the amount bar at font scale 2 as tall as at 1.3, and taller than at 1', () => {
    const atTwo = resolveTransactionFormSkeletonBars(2).amount;
    expect(atTwo).toBe(resolveTransactionFormSkeletonBars(1.3).amount);
    expect(atTwo).toBeGreaterThan(resolveTransactionFormSkeletonBars(1).amount);
  });

  it.each([1, 2, 3])(
    'at font scale %d draws each strip bar as tall as the loaded chip',
    (fontScale) => {
      expect(resolveTransactionFormSkeletonBars(fontScale).stripBar).toEqual({
        width: ACCOUNT_STRIP_CHIP_WIDTH,
        height: resolveAccountStripChipGeometry(fontScale).height,
      });
    },
  );
});

describe('resolveTypeTabsGeometry', () => {
  it('at font scale 1 keeps the 36 tab row and the skeleton tab bar', () => {
    const g = resolveTypeTabsGeometry(1);
    expect(g.listHeight).toBe(36);
    expect(g.skeletonHeight).toBe(TRANSACTION_FORM_SKELETON_GEOMETRY.tabBar);
  });

  it('at font scale 2 the skeleton is as tall as the tab row, which holds its triggers', () => {
    const g = resolveTypeTabsGeometry(2);
    const { compact } = resolveSegmentedTabsGeometry(2);
    expect(g.skeletonHeight).toBe(g.listHeight);
    expect(g.listHeight).toBeGreaterThanOrEqual(compact.triggerHeight + 2 * TABS_LIST_PADDING);
  });

  it('at font scale 1.5 the skeleton is as tall as the tab row', () => {
    const g = resolveTypeTabsGeometry(1.5);
    expect(g.skeletonHeight).toBe(g.listHeight);
  });

  it.each([1, 2])(
    'MA-109: at font scale %d the trigger slop lifts a tab to the touch floor with a margin on each side, the same above and below',
    (fontScale) => {
      const { triggerHitSlop } = resolveTypeTabsGeometry(fontScale);
      const { compact } = resolveSegmentedTabsGeometry(fontScale);
      expect(
        compact.triggerHeight + triggerHitSlop.top + triggerHitSlop.bottom,
      ).toBeGreaterThanOrEqual(TouchSize.min + 2 * Spacing.xxxxs);
      expect(triggerHitSlop.top).toBe(triggerHitSlop.bottom);
    },
  );
});

describe('transaction form content inset', () => {
  it('MA-123: pads the fact group and the skeleton by Spacing.md on every side, with no footer clearance', () => {
    expect(TRANSACTION_FORM_CONTENT_CONTAINER_STYLE).toEqual({
      padding: Spacing.md,
      gap: Spacing.xs,
    });
  });
});
