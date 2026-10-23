import { resolveTypeTabsGeometry } from '@/components/ui/form_sheet.geometry';
import { TABS_LIST_PADDING, resolveSegmentedTabsGeometry } from '@/components/ui/tabs.geometry';
import { Spacing, TouchSize } from '@/constants/theme';

describe('resolveTypeTabsGeometry', () => {
  it('at font scale 1 keeps the 36 tab row and returns only the list height and the slop', () => {
    const g = resolveTypeTabsGeometry(1);
    expect(g.listHeight).toBe(36);
    expect(Object.keys(g).sort()).toEqual(['listHeight', 'triggerHitSlop']);
  });

  it.each([1.5, 2])('at font scale %d the tab row holds its triggers', (fontScale) => {
    const { compact } = resolveSegmentedTabsGeometry(fontScale);
    expect(resolveTypeTabsGeometry(fontScale).listHeight).toBeGreaterThanOrEqual(
      compact.triggerHeight + 2 * TABS_LIST_PADDING,
    );
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
