import { DISPLAY_HEADLINE_MAX_FONT_SCALE } from '@/components/ui/display_headline.geometry';
import {
  SEARCH_INPUT_MAX_FONT_SCALE,
  resolveSearchFilterRowGeometry,
} from '@/components/ui/search_filter_row.geometry';
import { scaledFontSize } from '@/components/ui/text_scale.geometry';
import { Radius, Type, lineHeightFor } from '@/constants/theme';
import { ms } from '@/utils/responsive';

describe('resolveSearchFilterRowGeometry', () => {
  it('caps the search input text at the app-wide 1.3 font scale', () => {
    expect(SEARCH_INPUT_MAX_FONT_SCALE).toBe(DISPLAY_HEADLINE_MAX_FONT_SCALE);
    expect(SEARCH_INPUT_MAX_FONT_SCALE).toBe(1.3);
  });

  it.each([0.85, 1])('keeps every box at its current size at font scale %s', (fontScale) => {
    const g = resolveSearchFilterRowGeometry(fontScale);
    expect(g.inputText).toBeUndefined();
    expect(g.input).toEqual({
      height: ms(36),
      minHeight: ms(36),
      paddingTop: 0,
      paddingBottom: 0,
    });
    expect(g.filterButton).toEqual({ height: ms(36), width: ms(36), borderRadius: Radius.md });
    expect(g.badge).toEqual({
      top: ms(2),
      right: ms(2),
      minWidth: ms(16),
      height: ms(16),
      borderRadius: ms(16) / 2,
    });
    expect(g.badgeText.lineHeight).toBe(ms(16));
  });

  it('at font scale 1 draws the badge count at Type.chip', () => {
    expect(resolveSearchFilterRowGeometry(1).badgeText.fontSize).toBe(Type.chip);
  });

  it('at font scale 2 sizes the input text at the 1.3 cap and holds its line box', () => {
    const g = resolveSearchFilterRowGeometry(2);
    const fontSize = scaledFontSize(Type.body, 2, SEARCH_INPUT_MAX_FONT_SCALE);
    expect(g.inputText).toEqual({ fontSize, lineHeight: lineHeightFor(fontSize) });
    expect(g.input.height).toBeGreaterThanOrEqual(g.inputText?.lineHeight ?? Infinity);
    expect(g.input.minHeight).toBe(g.input.height);
  });

  it('stops growing the input text past the cap', () => {
    expect(resolveSearchFilterRowGeometry(3).inputText).toEqual(
      resolveSearchFilterRowGeometry(2).inputText,
    );
  });

  it('at font scale 2 the filter button matches the input and the badge holds its count', () => {
    const g = resolveSearchFilterRowGeometry(2);
    expect(g.filterButton.height).toBe(g.input.height);
    expect(g.filterButton.width).toBe(ms(36));
    expect(g.badge.height).toBeGreaterThanOrEqual(lineHeightFor(scaledFontSize(Type.chip, 2)));
    expect(g.badgeText.lineHeight).toBe(g.badge.height);
  });
});
