import { Platform } from 'react-native';

import { Size, Spacing, Type, lineHeightFor } from '@/constants/theme';
import {
  BUNDLED_TAB_BAR_HEIGHT,
  resolveTabLabelStyle,
  resolveTabsGeometry,
} from '@/modules/navigation/screens/tabs/tabs.helpers';

// The bundled cell above its label: 5 dp top padding (BottomTabItem.js) and a 28 dp icon (TabBarIcon.js).
const BUNDLED_CELL_ABOVE_LABEL = 5 + 28;

type ThemeTokens = { Size: typeof Size; Spacing: typeof Spacing };

// jest-expo runs the iOS branch of Platform.select; the app ships Android's.
function loadAndroidTheme(): ThemeTokens {
  let theme: ThemeTokens | undefined;
  jest.isolateModules(() => {
    const isolated = jest.requireActual<{ Platform: typeof Platform }>('react-native');
    const selectAndroid = (spec: { android?: unknown; default?: unknown }) =>
      spec.android ?? spec.default;
    jest
      .spyOn(isolated.Platform, 'select')
      .mockImplementation(selectAndroid as typeof Platform.select);
    theme = jest.requireActual<ThemeTokens>('@/constants/theme');
  });
  if (theme === undefined) throw new Error('theme did not load');
  return theme;
}

describe('resolveTabLabelStyle', () => {
  it('draws the label at Type.pillLabel at font scale 1.0', () => {
    expect(resolveTabLabelStyle(1)).toEqual({
      fontSize: Type.pillLabel,
      lineHeight: lineHeightFor(Type.pillLabel),
    });
  });

  it.each([1.3, 1.5, 2])(
    'holds the label at Type.pillLabel × 1.3 on the 16 dp the cell leaves at font scale %s',
    (scale) => {
      expect(resolveTabLabelStyle(scale)).toEqual({
        fontSize: Type.pillLabel * 1.3,
        lineHeight: 16,
      });
    },
  );

  it.each([1, 1.3, 1.5, 2])(
    'fits the label line inside the bundled cell at font scale %s',
    (scale) => {
      const { lineHeight } = resolveTabLabelStyle(scale);

      expect(BUNDLED_CELL_ABOVE_LABEL + lineHeight).toBeLessThanOrEqual(BUNDLED_TAB_BAR_HEIGHT);
    },
  );
});

describe('the tab screens clear the + button', () => {
  it("ends each tab list at or above the + button's reach over the Android bar", () => {
    const android = loadAndroidTheme();
    const reach =
      android.Size.tabBarHeight + android.Spacing.md + android.Size.fab - BUNDLED_TAB_BAR_HEIGHT;

    expect(android.Size.tabBarHeight).not.toBe(Size.tabBarHeight);
    expect(android.Size.tabScreenBottomClearance).toBeGreaterThanOrEqual(reach);
  });
});

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
