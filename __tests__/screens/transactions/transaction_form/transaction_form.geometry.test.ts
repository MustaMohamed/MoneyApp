import { TABS_LIST_PADDING, resolveSegmentedTabsGeometry } from '@/components/ui/tabs.geometry';
import { Spacing, TouchSize, Type, lineHeightFor } from '@/constants/theme';
import {
  ACCOUNT_STRIP_CHIP_HEIGHT,
  ACCOUNT_STRIP_CHIP_WIDTH,
  FACT_ROW_MIN_HEIGHT,
  TRANSACTION_FORM_CONTENT_CONTAINER_STYLE,
  TRANSACTION_FORM_SKELETON_GEOMETRY,
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

describe('resolveTransactionFormSkeletonBars', () => {
  const { amount, keyBar, valueBar } = TRANSACTION_FORM_SKELETON_GEOMETRY;

  it('at font scale 1 draws the supporting, amount, key and value bars as today', () => {
    expect(resolveTransactionFormSkeletonBars(1)).toEqual({
      supportingBar: 12,
      amount,
      keyBar: { width: keyBar.width, height: keyBar.height },
      valueBar: { width: valueBar.width, height: valueBar.height },
    });
  });

  it('at font scale 2 doubles each bar height and keeps both widths', () => {
    expect(resolveTransactionFormSkeletonBars(2)).toEqual({
      supportingBar: 24,
      amount: amount * 2,
      keyBar: { width: keyBar.width, height: keyBar.height * 2 },
      valueBar: { width: valueBar.width, height: valueBar.height * 2 },
    });
  });
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
});

describe('transaction form content inset', () => {
  it('MA-123: pads the fact group and the skeleton by Spacing.md on every side, with no footer clearance', () => {
    expect(TRANSACTION_FORM_CONTENT_CONTAINER_STYLE).toEqual({
      padding: Spacing.md,
      gap: Spacing.xs,
    });
  });
});
