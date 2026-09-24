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
}

export interface TransactionsPresentation {
  showInitialSkeleton: boolean;
  showEmptyState: boolean;
  showFirstLoadError: boolean;
  showRefreshIndicator: boolean;
  loadErrorVariant: TransactionLoadErrorVariant;
  showPaginationRetry: boolean;
}

export function buildTransactionsPresentation(
  input: TransactionsPresentationInput,
): TransactionsPresentation {
  const isInitial = input.listStatus === 'idle' || input.listStatus === 'initialLoading';
  const showFirstLoadError = input.listStatus === 'firstLoadError' && input.rowCount === 0;

  return {
    showInitialSkeleton: isInitial && input.rowCount === 0,
    showEmptyState: input.hasLoadedOnce && input.rowCount === 0 && !showFirstLoadError,
    showFirstLoadError,
    showRefreshIndicator: input.userRefreshing && input.listStatus === 'refreshing',
    loadErrorVariant: showFirstLoadError
      ? 'none'
      : input.listStatus === 'refreshErrorWithData' || input.totalsStatus === 'refreshErrorWithData'
        ? 'refresh'
        : input.totalsStatus === 'firstLoadError'
          ? 'totals'
          : input.accountLookupError
            ? 'accounts'
            : 'none',
    showPaginationRetry: input.paginationError && input.rowCount > 0,
  };
}
