import { Size, Spacing, Type, lineHeightFor } from '@/constants/theme';
import {
  BUNDLED_TAB_BAR_HEIGHT,
  TAB_LABEL_MAX_FONT_SCALE,
  resolveAddButtonReach,
  resolveTabLabelStyle,
  resolveTabsGeometry,
} from '@/modules/navigation/screens/tabs/tabs.helpers';
import { ms } from '@/utils/responsive';

describe('resolveTabLabelStyle', () => {
  it('draws the label at Type.pillLabel at font scale 1.0', () => {
    expect(resolveTabLabelStyle(1)).toEqual({
      fontSize: Type.pillLabel,
      lineHeight: lineHeightFor(Type.pillLabel),
    });
  });

  it('caps the label at a font scale of 1.3', () => {
    expect(TAB_LABEL_MAX_FONT_SCALE).toBe(1.3);
  });

  it.each([1.3, 1.5, 2])('holds the label at Type.pillLabel × 1.3 at font scale %s', (scale) => {
    const fontSize = Type.pillLabel * 1.3;

    expect(resolveTabLabelStyle(scale)).toEqual({ fontSize, lineHeight: lineHeightFor(fontSize) });
  });
});

describe('the tab screens clear the + button', () => {
  it("reaches the + button's top from the bundled 49 dp bar", () => {
    expect(BUNDLED_TAB_BAR_HEIGHT).toBe(49);
    expect(resolveAddButtonReach()).toBe(Size.tabBarHeight + Spacing.md + Size.fab - 49);
  });

  it("ends each tab list at or above the + button's reach", () => {
    expect(Size.tabScreenBottomClearance).toBeGreaterThanOrEqual(resolveAddButtonReach());
  });

  it("keeps Budget's bottom clearance at today's ms(96)", () => {
    expect(Size.tabScreenBottomClearance).toBe(ms(96));
  });

  it('leaves the + button and the toast clearance where they are at base', () => {
    expect(resolveTabsGeometry(34)).toEqual({ fabBottomOffset: 108, toastClearance: 190 });
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
