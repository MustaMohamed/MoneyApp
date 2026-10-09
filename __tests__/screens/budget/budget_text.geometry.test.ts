import { Size } from '@/constants/theme';
import { resolveRuleValueColumnWidth } from '@/modules/budget/screens/budget/budget_text.geometry';

describe('resolveRuleValueColumnWidth', () => {
  it('is the token width at a font scale of 1', () => {
    expect(resolveRuleValueColumnWidth(1)).toBe(Size.budgetRuleValueColumn);
  });

  it('is twice the token width at a font scale of 2', () => {
    expect(resolveRuleValueColumnWidth(2)).toBe(Size.budgetRuleValueColumn * 2);
  });
});
