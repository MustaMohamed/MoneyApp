import { budgetRingLabelMaxWidth } from '@/components/ui/budget_ring.geometry';
import { Size, Spacing } from '@/constants/theme';

describe('budgetRingLabelMaxWidth', () => {
  it.each([
    ['the category detail ring', Size.budgetDetailRing],
    ['the named budget ring', Size.budgetNamedRing],
  ])("gives %s's label the hole less a xxxs inset each side", (_name, size) => {
    const hole = size - 2 * Size.budgetRingStroke;
    const width = budgetRingLabelMaxWidth(size);

    expect(width).toBe(hole - 2 * Spacing.xxxs);
    expect(width).toBeGreaterThan(0);
  });

  it('measures the hole from an explicit stroke in place of the default', () => {
    const stroke = Size.budgetRingStroke * 2;

    expect(budgetRingLabelMaxWidth(Size.budgetDetailRing, stroke)).toBe(
      Size.budgetDetailRing - 2 * stroke - 2 * Spacing.xxxs,
    );
    expect(budgetRingLabelMaxWidth(Size.budgetDetailRing, stroke)).not.toBe(
      budgetRingLabelMaxWidth(Size.budgetDetailRing),
    );
  });
});
