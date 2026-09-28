import { scaledFontSize } from '@/components/ui/text_scale.geometry';
import { Size, Spacing, Type, lineHeightFor } from '@/constants/theme';

// The bar's height is fixed, so its label stops growing where the icon and the label still fit it.
export const TAB_LABEL_MAX_FONT_SCALE = 1.3;

// expo-router's bundled bar in raw dp, before the safe-area inset (bottom-tabs BottomTabBar.js, TABBAR_HEIGHT_UIKIT).
export const BUNDLED_TAB_BAR_HEIGHT = 49;

// HeroUI's custom bottom inset replaces its safe-area default, so the clearance carries the safe area itself.
export function resolveTabsGeometry(
  safeAreaBottom: number,
  addButtonHidden: boolean,
): {
  fabBottomOffset: number;
  toastClearance: number;
} {
  const fabBottomOffset = safeAreaBottom + Size.tabBarHeight + Spacing.md;
  return {
    fabBottomOffset,
    toastClearance: addButtonHidden ? fabBottomOffset : fabBottomOffset + Size.fab + Spacing.md,
  };
}

/** Pair with `tabBarAllowFontScaling: false`; otherwise the OS scales this size a second time. */
export function resolveTabLabelStyle(fontScale: number): { fontSize: number; lineHeight: number } {
  const fontSize = scaledFontSize(Type.pillLabel, fontScale, TAB_LABEL_MAX_FONT_SCALE);
  return { fontSize, lineHeight: lineHeightFor(fontSize) };
}

/** How far the + button's top reaches above the top of the bar a tab screen ends at. */
export function resolveAddButtonReach(): number {
  return Size.tabBarHeight + Spacing.md + Size.fab - BUNDLED_TAB_BAR_HEIGHT;
}
