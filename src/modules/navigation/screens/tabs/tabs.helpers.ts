import { Size, Spacing } from '@/constants/theme';

// HeroUI's custom bottom inset replaces its safe-area default, so the clearance carries the safe area itself.
export function resolveTabsGeometry(safeAreaBottom: number): {
  fabBottomOffset: number;
  toastClearance: number;
} {
  const fabBottomOffset = safeAreaBottom + Size.tabBarHeight + Spacing.md;
  return { fabBottomOffset, toastClearance: fabBottomOffset + Size.fab + Spacing.md };
}
