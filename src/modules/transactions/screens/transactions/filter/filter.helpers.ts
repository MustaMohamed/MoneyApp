import { Strings } from '@/constants/strings';
import type { TransactionListFilters } from '@/modules/transactions/store/transaction.store';
import { parseNonNegativeDecimal } from '@/utils/parse_decimal';

import type { AdvancedFilters } from './filter.store';

export function countActiveFilters(f: AdvancedFilters): number {
  let n = 0;
  if (f.accountIds.length > 0) n++;
  if (f.categoryIds.length > 0) n++;
  if (f.amountMin !== undefined || f.amountMax !== undefined) n++;
  return n;
}

export function toQueryFilters(applied: AdvancedFilters): Partial<TransactionListFilters> {
  const out: Partial<TransactionListFilters> = {};
  if (applied.accountIds.length > 0) out.accountIds = applied.accountIds;
  if (applied.categoryIds.length > 0) out.categoryIds = applied.categoryIds;
  if (applied.amountMin !== undefined) out.amountMin = applied.amountMin;
  if (applied.amountMax !== undefined) out.amountMax = applied.amountMax;
  if (applied.amountMin !== undefined || applied.amountMax !== undefined) {
    out.amountCurrency = applied.amountCurrency;
  }
  return out;
}

export function parseAmountInput(s: string): number | undefined {
  const trimmed = s.trim();
  if (!trimmed) return undefined;
  return parseNonNegativeDecimal(trimmed);
}

export interface AmountRangeValidation {
  isValid: boolean;
  min: number | undefined;
  max: number | undefined;
  minError: string | undefined;
  maxError: string | undefined;
  rangeError: string | undefined;
}

export function validateAmountRange(minText: string, maxText: string): AmountRangeValidation {
  const normalizedMin = minText.trim();
  const normalizedMax = maxText.trim();
  const min = parseAmountInput(normalizedMin);
  const max = parseAmountInput(normalizedMax);
  const minError = normalizedMin && min === undefined ? Strings.filterAmountInvalid : undefined;
  const maxError = normalizedMax && max === undefined ? Strings.filterAmountInvalid : undefined;
  const rangeError =
    minError === undefined &&
    maxError === undefined &&
    min !== undefined &&
    max !== undefined &&
    min > max
      ? Strings.filterAmountRangeInvalid
      : undefined;

  return {
    isValid: minError === undefined && maxError === undefined && rangeError === undefined,
    min,
    max,
    minError,
    maxError,
    rangeError,
  };
}

export function formatSelectionSummary(names: string[], allLabel: string): string {
  if (names.length === 0) return allLabel;
  if (names.length === 1) return names[0];
  if (names.length === 2) return `${names[0]}, ${names[1]}`;
  return `${names[0]}, ${names[1]} +${names.length - 2}`;
}

export function formatAmountSummary(f: AdvancedFilters): string {
  if (f.amountMin === undefined && f.amountMax === undefined)
    return Strings.filterSummaryAmountEmpty;
  const cur = f.amountCurrency;
  if (f.amountMin !== undefined && f.amountMax !== undefined)
    return `${f.amountMin}–${f.amountMax} ${cur}`;
  if (f.amountMax !== undefined) return `${Strings.filterSummaryAmountUpTo} ${f.amountMax} ${cur}`;
  return `${Strings.filterSummaryAmountFrom} ${f.amountMin} ${cur}`;
}

type NamedEntity = { name: string };

function sameStringSet(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  const left = [...a].sort();
  const right = [...b].sort();
  return left.every((id, index) => id === right[index]);
}

function hasAmountFilter(f: AdvancedFilters): boolean {
  return f.amountMin !== undefined || f.amountMax !== undefined;
}

export function advancedFiltersEqual(a: AdvancedFilters, b: AdvancedFilters): boolean {
  const amountActive = hasAmountFilter(a) || hasAmountFilter(b);
  return (
    sameStringSet(a.accountIds, b.accountIds) &&
    sameStringSet(a.categoryIds, b.categoryIds) &&
    a.amountMin === b.amountMin &&
    a.amountMax === b.amountMax &&
    (!amountActive || a.amountCurrency === b.amountCurrency)
  );
}

function selectedNames(ids: string[], source: ReadonlyMap<string, NamedEntity>): string[] {
  return ids.map((id) => source.get(id)?.name).filter((name): name is string => name !== undefined);
}

export function formatAppliedFilterSummary(
  f: AdvancedFilters,
  accountsById: ReadonlyMap<string, NamedEntity>,
  categoriesById: ReadonlyMap<string, NamedEntity>,
): string | null {
  const parts: string[] = [];
  const accountNames = selectedNames(f.accountIds, accountsById);
  const categoryNames = selectedNames(f.categoryIds, categoriesById);

  if (accountNames.length > 0) parts.push(formatSelectionSummary(accountNames, ''));
  if (categoryNames.length > 0) parts.push(formatSelectionSummary(categoryNames, ''));
  if (hasAmountFilter(f)) parts.push(formatAmountSummary(f));

  return parts.length > 0 ? parts.join(' + ') : null;
}
