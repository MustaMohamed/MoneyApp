import type {
  AmountSuggestion,
  AmountSuggestionKind,
} from '@/components/ui/amount_suggestions.helpers';
import { CURRENCY_CONFIG } from '@/constants/currency';
import { BudgetGroup, Currency } from '@/constants/enums';
import { Strings } from '@/constants/strings';
import { resolveSuggestedAmounts } from '@/modules/budget/screens/budget/suggested_amounts.helpers';
import { formatAmount } from '@/utils/format_amount';
import { fullMonthName } from '@/utils/year_month';

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

export type SetBudgetStatusSubject =
  | { kind: 'add'; categoryName: string; budgetCount: number }
  | { kind: 'edit'; spent: number; limit: number };

export function resolveSetBudgetStatusLine(
  subject: SetBudgetStatusSubject | undefined,
  month: string,
  today: string,
): string | undefined {
  if (subject === undefined) return undefined;
  const monthName = fullMonthName(month);
  if (subject.kind === 'add') {
    return subject.budgetCount === 0
      ? Strings.budgetStatusNoBudget(subject.categoryName, monthName)
      : Strings.budgetStatusBudgetCount(subject.categoryName, subject.budgetCount, monthName);
  }
  const decimals = CURRENCY_CONFIG[Currency.EGP].decimals;
  const spent = formatAmount(subject.spent, decimals);
  const limit = formatAmount(subject.limit, decimals);
  return today.slice(0, 7) === month
    ? Strings.budgetStatusSpentSoFar(spent, limit, monthName)
    : Strings.budgetStatusSpent(spent, limit, monthName);
}

const SUGGESTION_ORDER = {
  spentLastMonth: 0,
  threeMonthAverage: 1,
} satisfies Record<AmountSuggestionKind, number>;

function isSuggestionKind(key: string): key is AmountSuggestionKind {
  return key in SUGGESTION_ORDER;
}

const SUGGESTION_KINDS = Object.keys(SUGGESTION_ORDER)
  .filter(isSuggestionKind)
  .sort((a, b) => SUGGESTION_ORDER[a] - SUGGESTION_ORDER[b]);

export function resolveSetBudgetSuggestions(
  month: string,
  categorySpendByMonth: Readonly<Record<string, number>> | undefined,
): AmountSuggestion[] {
  const amounts = resolveSuggestedAmounts(month, categorySpendByMonth);
  return SUGGESTION_KINDS.map((kind) => ({ kind, amount: amounts[kind] }));
}
