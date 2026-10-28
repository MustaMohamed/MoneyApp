import type { Account } from '@/modules/accounts/entities/account.entity';
import type { TransactionListFilters } from '@/modules/transactions/store/transaction.store';
import { formatAmountSummary } from '@/modules/transactions/utils/amount_range_filter';
import {
  type NamedEntity,
  formatSelectionSummary,
  hasAmountFilter,
  sameStringSet,
  selectedNames,
} from '@/modules/transactions/utils/filter_selection';
import { resolveAccountName } from '@/utils/account_name';

import type { AdvancedFilters } from './filter.store';

export function countActiveFilters(f: AdvancedFilters): number {
  let n = 0;
  if (f.accountIds.length > 0) n++;
  if (f.categoryIds.length > 0) n++;
  if (hasAmountFilter(f)) n++;
  return n;
}

export function toQueryFilters(applied: AdvancedFilters): Partial<TransactionListFilters> {
  const out: Partial<TransactionListFilters> = {};
  if (applied.accountIds.length > 0) out.accountIds = applied.accountIds;
  if (applied.categoryIds.length > 0) out.categoryIds = applied.categoryIds;
  if (applied.amountMin !== undefined) out.amountMin = applied.amountMin;
  if (applied.amountMax !== undefined) out.amountMax = applied.amountMax;
  if (hasAmountFilter(applied)) {
    out.amountCurrency = applied.amountCurrency;
  }
  return out;
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
