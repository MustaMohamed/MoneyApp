import { CURRENCY_CONFIG } from '@/constants/currency';
import { Strings } from '@/constants/strings';
import type { Account } from '@/modules/accounts/entities/account.entity';
import type { TransactionListFilters } from '@/modules/transactions/store/transaction.store';
import { resolveAccountName } from '@/utils/account_name';
import { MONEY_ROUNDING_DECIMALS, formatAmount } from '@/utils/format_amount';
import { parseDecimalText } from '@/utils/parse_decimal';

import type { AdvancedFilters } from './filter.store';

export function countActiveFilters(f: AdvancedFilters): number {
  let n = 0;
  if (f.accountIds.length > 0) n++;
  if (f.categoryIds.length > 0) n++;
  if (f.amountMin !== undefined || f.amountMax !== undefined) n++;
  return n;
}

/** One applied account is shown by its chip, so the funnel counts accounts only at two or more. */
export function countFunnelFilters(f: AdvancedFilters): number {
  return countActiveFilters(f) - (f.accountIds.length === 1 ? 1 : 0);
}

export function toggleAccountFilter(
  f: AdvancedFilters,
  accountId: string | undefined,
): AdvancedFilters {
  const isOnlyApplied = f.accountIds.length === 1 && f.accountIds[0] === accountId;
  const accountIds = accountId === undefined || isOnlyApplied ? [] : [accountId];
  return { ...f, accountIds };
}

export function pruneAccountFilter(
  f: AdvancedFilters,
  activeAccounts: readonly Account[],
): AdvancedFilters {
  const activeIds = new Set(activeAccounts.map((account) => account.id));
  const accountIds = f.accountIds.filter((id) => activeIds.has(id));
  return accountIds.length === f.accountIds.length ? f : { ...f, accountIds };
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
  return parseDecimalText(trimmed);
}

export interface AmountRangeValidation {
  isValid: boolean;
  min: number | undefined;
  max: number | undefined;
  minError: string | undefined;
  maxError: string | undefined;
  rangeError: string | undefined;
}

// A bound past 2 dp would filter on a value the summary cannot print, so the sheet refuses it.
function exceedsMoneyDecimals(text: string): boolean {
  return (text.split('.')[1] ?? '').length > MONEY_ROUNDING_DECIMALS;
}

export function validateAmountRange(minText: string, maxText: string): AmountRangeValidation {
  const normalizedMin = minText.trim();
  const normalizedMax = maxText.trim();
  const min = parseAmountInput(normalizedMin);
  const max = parseAmountInput(normalizedMax);
  const minError =
    normalizedMin && (min === undefined || exceedsMoneyDecimals(normalizedMin))
      ? Strings.filterAmountInvalid
      : undefined;
  const maxError =
    normalizedMax && (max === undefined || exceedsMoneyDecimals(normalizedMax))
      ? Strings.filterAmountInvalid
      : undefined;
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
  const { amountMin, amountMax, amountCurrency: cur } = f;
  // A fractional bound keeps its cents, so the summary never rounds past the bound the filter applies.
  const bound = (value: number) =>
    formatAmount(
      value,
      Number.isInteger(value) ? CURRENCY_CONFIG[cur].decimals : MONEY_ROUNDING_DECIMALS,
    );
  if (amountMin === undefined) {
    return amountMax === undefined
      ? Strings.filterSummaryAmountEmpty
      : `${Strings.filterSummaryAmountUpTo} ${bound(amountMax)} ${cur}`;
  }
  if (amountMax === undefined)
    return `${Strings.filterSummaryAmountFrom} ${bound(amountMin)} ${cur}`;
  return `${bound(amountMin)}–${bound(amountMax)} ${cur}`;
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

export function labelAccountsById(
  accountsById: ReadonlyMap<string, Account>,
): ReadonlyMap<string, NamedEntity> {
  return new Map(
    [...accountsById].map(([id, account]) => [id, { name: resolveAccountName(account) }]),
  );
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
