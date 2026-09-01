import { BudgetGroup } from '@/constants/enums';
import { CoreTokens, SemanticTokens } from '@/constants/theme_tokens';
import type { BudgetEditTargetVM } from '@/modules/budget/screens/budget/budget.hook';
import type { Category } from '@/modules/categories/entities/category.entity';
import { makeTestCategory } from '@/test_helpers/transaction';

export function makeTestBudgetableCategory(overrides: Partial<Category> = {}): Category {
  return makeTestCategory({
    id: 'housing',
    name: 'Housing',
    icon: 'home',
    // Overrides makeTestCategory's BudgetGroup.Need default; set_budget_sheet.test.tsx's
    // 'adds a named budget for the selected month' asserts setBudget gets no categoryGroup key.
    budget_group: null,
    ...overrides,
  });
}

export function makeTestBudgetEditTarget(
  overrides: Partial<BudgetEditTargetVM> = {},
): BudgetEditTargetVM {
  return {
    id: 'budget-trip-food',
    categoryId: 'housing',
    categoryName: 'Housing',
    categoryGroup: BudgetGroup.Need,
    name: 'Alexandria Trip Food',
    planned: 1500,
    spent: 0,
    left: 1500,
    usedPct: 0,
    categorySharePct: 1,
    usedLabel: '0%',
    shareLabel: '100% of category',
    spentPlannedLabel: '0 / 1,500 spent',
    balanceAmountLabel: '1,500',
    balanceMetaLabel: 'EGP left',
    ringColor: SemanticTokens.positive,
    accessibilityLabel: 'Alexandria Trip Food',
    menuAccessibilityLabel: 'Actions for Alexandria Trip Food',
    limit: 1500,
    icon: 'home',
    color: CoreTokens.text1,
    ...overrides,
  };
}
