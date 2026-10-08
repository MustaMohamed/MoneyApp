import { TABS_LIST_PADDING, resolveSegmentedTabsGeometry } from '@/components/ui/tabs.geometry';
import { Size, Spacing, TouchSize } from '@/constants/theme';
import {
  TRANSACTIONS_RAIL,
  resolveTransactionsRailGeometry,
} from '@/modules/transactions/screens/transactions/components/transactions_rail.geometry';

const SCALED_SPACES = [7, 8, 9];

describe('resolveTransactionsRailGeometry', () => {
  it.each([
    { scaledSpace: 7, space: 8 },
    { scaledSpace: 8, space: 8 },
    { scaledSpace: 9, space: 9 },
  ])('a scaled space of $scaledSpace gives a space of $space', ({ scaledSpace, space }) => {
    expect(resolveTransactionsRailGeometry(scaledSpace).space).toBe(space);
  });

  it.each(SCALED_SPACES)(
    'at a scaled space of %d the month row reaches the touch floor with a margin on each side',
    (scaledSpace) => {
      const { monthRowHitSlop } = resolveTransactionsRailGeometry(scaledSpace);
      expect(
        Size.monthPillTrack + monthRowHitSlop.top + monthRowHitSlop.bottom,
      ).toBeGreaterThanOrEqual(TouchSize.min + 2 * Spacing.xxxxs);
    },
  );

  it.each(SCALED_SPACES)(
    'at a scaled space of %d a type tab reaches the touch floor with its margin',
    (scaledSpace) => {
      const { tabsHitSlop } = resolveTransactionsRailGeometry(scaledSpace);
      expect(
        Size.compactSegmentTrack + tabsHitSlop.top + tabsHitSlop.bottom,
      ).toBeGreaterThanOrEqual(TouchSize.min + Spacing.xxxxs);
    },
  );

  it.each(SCALED_SPACES)(
    'at a scaled space of %d the slop under the tab track ends inside the space under it',
    (scaledSpace) => {
      const { space, tabsHitSlop } = resolveTransactionsRailGeometry(scaledSpace);
      expect(tabsHitSlop.bottom - TABS_LIST_PADDING).toBeLessThanOrEqual(space);
    },
  );

  it.each(SCALED_SPACES)(
    'at a scaled space of %d the gap between the rows splits between the pill and the tabs with no overlap',
    (scaledSpace) => {
      const { space, monthRowHitSlop, tabsHitSlop } = resolveTransactionsRailGeometry(scaledSpace);
      expect(monthRowHitSlop.bottom - Spacing.xxxxs + (tabsHitSlop.top - TABS_LIST_PADDING)).toBe(
        space,
      );
    },
  );

  it('at a space of 8 the header line to the hero is 90 at font scale 1', () => {
    const { space } = resolveTransactionsRailGeometry(8);
    expect(
      3 * space + Size.monthPillTrack + resolveSegmentedTabsGeometry(1).compact.listHeight,
    ).toBe(90);
  });

  it('the screen reads the geometry resolved from Spacing.xs', () => {
    expect(TRANSACTIONS_RAIL).toEqual(resolveTransactionsRailGeometry(Spacing.xs));
  });
});
