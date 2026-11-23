import { BudgetGroup } from '@/constants/enums';
import { Strings } from '@/constants/strings';

export interface SetBudgetFaults {
  category: string | undefined;
  name: string | undefined;
  limit: string | undefined;
}

export function countSetBudgetFaults(faults: SetBudgetFaults): number {
  return [faults.category, faults.name, faults.limit].filter((fault) => fault !== undefined).length;
}

export function resolveSetBudgetFooterMessage(
  faults: SetBudgetFaults,
  saveError: string | undefined,
): string | undefined {
  const count = countSetBudgetFaults(faults);
  return count > 0 ? Strings.fixFieldsMarkedAbove(count) : saveError;
}

interface BudgetGroupOption {
  value: BudgetGroup;
  label: string;
  caption: string;
}

export const BUDGET_GROUP_OPTIONS: readonly BudgetGroupOption[] = [
  {
    value: BudgetGroup.Need,
    label: Strings.budget5030GroupNeed,
    caption: Strings.budgetGroupNeedCaption,
  },
  {
    value: BudgetGroup.Want,
    label: Strings.budget5030GroupWant,
    caption: Strings.budgetGroupWantCaption,
  },
  {
    value: BudgetGroup.Savings,
    label: Strings.budget5030GroupSavings,
    caption: Strings.budgetGroupSavingsCaption,
  },
];

export function resolveBudgetGroupRowValue(group: BudgetGroup | null): string {
  return (
    BUDGET_GROUP_OPTIONS.find((option) => option.value === group)?.label ??
    Strings.budget5030NotGroupedMetric
  );
}
