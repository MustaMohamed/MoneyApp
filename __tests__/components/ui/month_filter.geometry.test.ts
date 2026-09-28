import { resolveMonthPillGeometry } from '@/components/ui/month_filter.geometry';
import { scaledFontSize } from '@/components/ui/text_scale.geometry';
import { Type, lineHeightFor } from '@/constants/theme';

describe('resolveMonthPillGeometry', () => {
  it('at font scale 1 draws the pill at 32 with the Type.micro label', () => {
    const g = resolveMonthPillGeometry(1);
    expect(g.height).toBe(32);
    expect(g.label).toEqual({ fontSize: Type.micro, lineHeight: lineHeightFor(Type.micro) });
  });

  it('at font scale 2 the pill holds its label line box', () => {
    const g = resolveMonthPillGeometry(2);
    const fontSize = scaledFontSize(Type.micro, 2);
    expect(g.label).toEqual({ fontSize, lineHeight: lineHeightFor(fontSize) });
    expect(g.height).toBeGreaterThanOrEqual(g.label.lineHeight);
  });
});
