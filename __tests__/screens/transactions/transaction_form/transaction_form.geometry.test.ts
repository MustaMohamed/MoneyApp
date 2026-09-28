import { SHEET_FOOTER_CLEARANCE } from '@/components/ui/sheet';
import { TABS_LIST_PADDING, resolveSegmentedTabsGeometry } from '@/components/ui/tabs.geometry';
import { Size, Spacing, TouchSize, Type, lineHeightFor } from '@/constants/theme';
import {
  ACCOUNT_STRIP_CHIP_HEIGHT,
  ACCOUNT_STRIP_CHIP_WIDTH,
  FACT_ROW_MIN_HEIGHT,
  TRANSACTION_FORM_CONTENT_CONTAINER_STYLE,
  TRANSACTION_FORM_FOOTER_CLEARANCE,
  TRANSACTION_FORM_SKELETON_GEOMETRY,
  TRANSACTION_FORM_STATUS_GAP,
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
  it('clears the bare CTA footer plus the status track at its two-line cap and its gap', () => {
    expect(TRANSACTION_FORM_FOOTER_CLEARANCE).toBe(
      SHEET_FOOTER_CLEARANCE + Size.statusTrack + TRANSACTION_FORM_STATUS_GAP,
    );
  });

  it('pads the body and the skeleton alike and gaps their rows by Spacing.xs', () => {
    expect(TRANSACTION_FORM_CONTENT_CONTAINER_STYLE).toEqual({
      padding: Spacing.md,
      gap: Spacing.xs,
      paddingBottom: TRANSACTION_FORM_FOOTER_CLEARANCE,
    });
  });
});
