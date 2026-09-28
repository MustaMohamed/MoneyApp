import { Size, Spacing } from '@/constants/theme';
import { resolveTabsGeometry } from '@/modules/navigation/screens/tabs/tabs.helpers';

describe('resolveTabsGeometry', () => {
  it.each([false, true])(
    'lifts the + button above the tab bar by the safe-area bottom, add button hidden %s',
    (addButtonHidden) => {
      expect(resolveTabsGeometry(0, addButtonHidden).fabBottomOffset).toBe(
        Size.tabBarHeight + Spacing.md,
      );
      expect(resolveTabsGeometry(34, addButtonHidden).fabBottomOffset).toBe(
        34 + Size.tabBarHeight + Spacing.md,
      );
    },
  );

  it('clears the toast past the top of the + button with a gap where the button shows', () => {
    const { fabBottomOffset, toastClearance } = resolveTabsGeometry(34, false);

    expect(toastClearance).toBe(fabBottomOffset + Size.fab + Spacing.md);
  });

  it('sits the toast at the + button offset where the path hides the button', () => {
    const hidden = resolveTabsGeometry(34, true);

    expect(hidden.toastClearance).toBe(34 + Size.tabBarHeight + Spacing.md);
    expect(hidden.toastClearance).toBe(hidden.fabBottomOffset);
  });

  it.each([false, true])(
    'grows both values by exactly the safe-area delta, add button hidden %s',
    (addButtonHidden) => {
      const flush = resolveTabsGeometry(0, addButtonHidden);
      const inset = resolveTabsGeometry(34, addButtonHidden);

      expect(inset.fabBottomOffset - flush.fabBottomOffset).toBe(34);
      expect(inset.toastClearance - flush.toastClearance).toBe(34);
    },
  );
});
