import {
  TABS_LIST_PADDING,
  resolveGrownScrollRadii,
  resolveSegmentedTabsGeometry,
  resolveTabsScrollSlopInset,
} from '@/components/ui/tabs.geometry';
import { scaledFontSize } from '@/components/ui/text_scale.geometry';
import { Radius, Type, lineHeightFor } from '@/constants/theme';

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

describe('resolveTabsScrollSlopInset', () => {
  it('MA-109: without a trigger hit slop the scroll box takes no inset', () => {
    expect(resolveTabsScrollSlopInset(undefined)).toBeUndefined();
  });

  it('MA-109: a slop past the list padding is the inset on its side', () => {
    expect(resolveTabsScrollSlopInset({ top: 7, bottom: 10 })).toEqual({ top: 7, bottom: 10 });
  });

  it('MA-109: a slop under the list padding insets by the list padding on both sides', () => {
    expect(resolveTabsScrollSlopInset({ top: 1, bottom: 2 })).toEqual({
      top: TABS_LIST_PADDING,
      bottom: TABS_LIST_PADDING,
    });
  });
});

describe('resolveGrownScrollRadii', () => {
  it('MA-109: a form track rounds each corner by its side of the inset past the list padding', () => {
    expect(resolveGrownScrollRadii(Radius.md, { top: 7, bottom: 10 })).toEqual({
      borderTopLeftRadius: Radius.md + 7 - TABS_LIST_PADDING,
      borderTopRightRadius: Radius.md + 7 - TABS_LIST_PADDING,
      borderBottomLeftRadius: Radius.md + 10 - TABS_LIST_PADDING,
      borderBottomRightRadius: Radius.md + 10 - TABS_LIST_PADDING,
    });
  });

  it('MA-109: a track left at the pill radius takes no corner radius', () => {
    expect(resolveGrownScrollRadii(undefined, { top: 7, bottom: 10 })).toBeUndefined();
  });
});
