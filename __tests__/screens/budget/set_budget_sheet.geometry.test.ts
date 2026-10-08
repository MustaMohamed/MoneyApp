import { scaledTextStyle } from '@/components/ui/text_scale.geometry';
import { Size, Type, lineHeightFor } from '@/constants/theme';
import { resolveSetBudgetFieldGeometry } from '@/modules/budget/screens/budget/components/set_budget_sheet.geometry';
import { ms } from '@/utils/responsive';

const fields = [
  { field: 'name', size: Type.body },
  { field: 'limit', size: Type.bodyStrong },
];

describe('resolveSetBudgetFieldGeometry', () => {
  // The literal, not the token: a drifted border width must fail here, not on a device.
  it('reads the Android input border as 1.5 on each edge', () => {
    expect(Size.fieldBorderWidth).toBe(1.5);
  });

  describe.each(fields)('the $field field', ({ size }) => {
    it.each([0.85, 1])('keeps the 28 track at font scale %s', (fontScale) => {
      const geometry = resolveSetBudgetFieldGeometry(size, fontScale);

      expect(geometry.text).toEqual(scaledTextStyle(size, fontScale));
      expect(geometry.height).toBe(ms(28));
    });

    it('draws its token size and line height at font scale 1', () => {
      expect(resolveSetBudgetFieldGeometry(size, 1).text).toEqual({
        fontSize: size,
        lineHeight: lineHeightFor(size),
      });
    });

    it.each([2, 3])('holds its scaled line and both borders at font scale %s', (fontScale) => {
      const text = scaledTextStyle(size, fontScale);
      const geometry = resolveSetBudgetFieldGeometry(size, fontScale);

      expect(geometry.text).toEqual(text);
      expect(geometry.height).toBeCloseTo(text.lineHeight + 2 * Size.fieldBorderWidth, 10);
      expect(geometry.height).toBeGreaterThan(ms(28));
    });
  });
});
