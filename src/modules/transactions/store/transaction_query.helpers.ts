import type { TransactionListFilters } from './transaction.store';

function normalizeIds(ids: string[] | undefined): string[] | null {
  if (!ids?.length) return null;
  return [...new Set(ids)].sort();
}

export function getTransactionQueryKey(filters: TransactionListFilters): string {
  const normalizedSearch = filters.search?.trim() ?? '';
  const key = {
    type: filters.type ?? null,
    search: normalizedSearch.length > 0 ? normalizedSearch : null,
    accountIds: normalizeIds(filters.accountIds),
    categoryIds: normalizeIds(filters.categoryIds),
    dateFrom: filters.dateFrom ?? null,
    dateTo: filters.dateTo ?? null,
    amountMin: filters.amountMin ?? null,
    amountMax: filters.amountMax ?? null,
    amountCurrency: filters.amountCurrency ?? null,
  } satisfies Record<keyof TransactionListFilters, unknown>;
  return JSON.stringify(key);
}
