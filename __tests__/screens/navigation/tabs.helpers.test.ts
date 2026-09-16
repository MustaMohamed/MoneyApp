import { Size, Spacing } from '@/constants/theme';
import { resolveTabsGeometry } from '@/modules/navigation/screens/tabs/tabs.helpers';

describe('resolveTabsGeometry', () => {
  it('lifts the + button above the tab bar by the safe-area bottom', () => {
    expect(resolveTabsGeometry(0).fabBottomOffset).toBe(Size.tabBarHeight + Spacing.md);
    expect(resolveTabsGeometry(34).fabBottomOffset).toBe(34 + Size.tabBarHeight + Spacing.md);
  });

  it('clears the toast past the top of the + button with a gap', () => {
    const { fabBottomOffset, toastClearance } = resolveTabsGeometry(34);

    expect(toastClearance).toBe(fabBottomOffset + Size.fab + Spacing.md);
  });

  it('grows both values by exactly the safe-area delta', () => {
    const flush = resolveTabsGeometry(0);
    const inset = resolveTabsGeometry(34);

    expect(inset.fabBottomOffset - flush.fabBottomOffset).toBe(34);
    expect(inset.toastClearance - flush.toastClearance).toBe(34);
  });
});
