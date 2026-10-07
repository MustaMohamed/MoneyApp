import type { TransactionListStatus } from '@/modules/transactions/store/transaction.store';

import type { TransactionTotalsStatus } from './transactions.state';

export type TransactionLoadErrorVariant = 'none' | 'refresh' | 'totals' | 'accounts';

export interface TransactionsPresentationInput {
  listStatus: TransactionListStatus;
  totalsStatus: TransactionTotalsStatus;
  rowCount: number;
  hasLoadedOnce: boolean;
  paginationError: boolean;
  accountLookupError: boolean;
  userRefreshing: boolean;
  filtersActive: boolean;
  isCurrentMonth: boolean;
  /** Whether any transaction exists at all, which an empty unfiltered month waits on. */
  existence: 'unknown' | 'some' | 'none' | 'failed';
}

export interface TransactionsPresentation {
  showInitialSkeleton: boolean;
  showEmptyState: boolean;
  emptyVariant: 'none' | 'noResults' | 'noData' | 'emptyMonth';
  showsBackToThisMonth: boolean;
  showFirstLoadError: boolean;
  showRefreshIndicator: boolean;
  loadErrorVariant: TransactionLoadErrorVariant;
  showPaginationRetry: boolean;
}

const EMPTY_VARIANT_BY_EXISTENCE: Record<
  TransactionsPresentationInput['existence'],
  TransactionsPresentation['emptyVariant']
> = {
  unknown: 'none',
  failed: 'none',
  none: 'noData',
  some: 'emptyMonth',
};

export function buildTransactionsPresentation(
  input: TransactionsPresentationInput,
): TransactionsPresentation {
  const isInitial = input.listStatus === 'idle' || input.listStatus === 'initialLoading';
  const listFirstLoadError = input.listStatus === 'firstLoadError' && input.rowCount === 0;
  const loadedEmpty = input.hasLoadedOnce && input.rowCount === 0 && !listFirstLoadError;
  // Only an unfiltered empty month needs the answer: a filter with no rows is `noResults` either way.
  const awaitsExistence = loadedEmpty && !input.filtersActive;
  const showFirstLoadError =
    listFirstLoadError || (awaitsExistence && input.existence === 'failed');
  const emptyVariant = !loadedEmpty
    ? 'none'
    : input.filtersActive
      ? 'noResults'
      : EMPTY_VARIANT_BY_EXISTENCE[input.existence];

  return {
    showInitialSkeleton:
      (isInitial && input.rowCount === 0) || (awaitsExistence && input.existence === 'unknown'),
    showEmptyState: emptyVariant !== 'none',
    emptyVariant,
    showsBackToThisMonth: emptyVariant === 'emptyMonth' && !input.isCurrentMonth,
    showFirstLoadError,
    showRefreshIndicator: input.userRefreshing && input.listStatus === 'refreshing',
    loadErrorVariant: showFirstLoadError
      ? 'none'
      : input.listStatus === 'refreshErrorWithData'
        ? 'refresh'
        : input.totalsStatus === 'firstLoadError' || input.totalsStatus === 'refreshErrorWithData'
          ? 'totals'
          : input.accountLookupError
            ? 'accounts'
            : 'none',
    showPaginationRetry: input.paginationError && input.rowCount > 0,
  };
}
