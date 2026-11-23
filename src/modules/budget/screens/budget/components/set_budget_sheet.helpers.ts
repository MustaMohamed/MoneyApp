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
