import {
  resolveDayHeaderGeometry,
  resolveDayHeaderNetMaxWidth,
} from '@/components/ui/day_header.geometry';
import { Spacing, Type, lineHeightFor } from '@/constants/theme';

describe('resolveDayHeaderGeometry', () => {
  it.each([1, 1.3, 2])(
    'sizes the label, the pill and the header from the caption size at font scale %s, uncapped',
    (scale) => {
      const fontSize = Type.caption * scale;
      const lineHeight = lineHeightFor(fontSize);
      const pillHeight = lineHeight + 2 * Spacing.xxxs;
      expect(resolveDayHeaderGeometry(scale)).toEqual({
        fontSize,
        lineHeight,
        pillHeight,
        height: Spacing.md + pillHeight + Spacing.xs,
      });
    },
  );
});

describe('resolveDayHeaderNetMaxWidth', () => {
  const HEADER_WIDTH = 411;

  it('MA-171: leaves the net uncapped at font scale 1', () => {
    expect(resolveDayHeaderNetMaxWidth(1, HEADER_WIDTH)).toBeUndefined();
  });

  it.each([1.3, 2])(
    'MA-171: caps the net at half the inner width of the header at font scale %s',
    (scale) => {
      expect(resolveDayHeaderNetMaxWidth(scale, HEADER_WIDTH)).toBe(
        (HEADER_WIDTH - 2 * Spacing.md) / 2,
      );
    },
  );
});
