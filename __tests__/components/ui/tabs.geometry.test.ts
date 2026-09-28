import { TABS_LIST_PADDING, resolveSegmentedTabsGeometry } from '@/components/ui/tabs.geometry';
import { scaledFontSize } from '@/components/ui/text_scale.geometry';
import { Type, lineHeightFor } from '@/constants/theme';

describe('resolveSegmentedTabsGeometry', () => {
  it('at font scale 1 draws the compact trigger at 28 with the Type.micro label', () => {
    const g = resolveSegmentedTabsGeometry(1);
    expect(g.compact.triggerHeight).toBe(28);
    expect(g.compact.label).toEqual({
      fontSize: Type.micro,
      lineHeight: lineHeightFor(Type.micro),
    });
    expect(g.compact.listHeight).toBe(28 + 2 * TABS_LIST_PADDING);
    expect(g.defaultLabel).toBeUndefined();
  });

  it('at font scale 0.85 leaves the default label to HeroUI and the compact trigger at 28', () => {
    const g = resolveSegmentedTabsGeometry(0.85);
    expect(g.defaultLabel).toBeUndefined();
    expect(g.compact.triggerHeight).toBe(28);
  });

  it('at font scale 2 the compact trigger holds its label line box', () => {
    const g = resolveSegmentedTabsGeometry(2);
    const fontSize = scaledFontSize(Type.micro, 2);
    expect(g.compact.label).toEqual({ fontSize, lineHeight: lineHeightFor(fontSize) });
    expect(g.compact.triggerHeight).toBeGreaterThanOrEqual(g.compact.label.lineHeight);
    expect(g.compact.listHeight).toBe(g.compact.triggerHeight + 2 * TABS_LIST_PADDING);
  });

  it('at font scale 2 sizes the default label from Type.subhead with its paired line height', () => {
    const g = resolveSegmentedTabsGeometry(2);
    expect(g.defaultLabel?.fontSize).toBe(scaledFontSize(Type.subhead, 2));
    expect(g.defaultLabel?.lineHeight).toBe(lineHeightFor(g.defaultLabel?.fontSize ?? NaN));
  });
});
