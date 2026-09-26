import {
  buildTransactionsPresentation,
  type TransactionsPresentationInput,
} from '@/modules/transactions/screens/transactions/transactions.presentation';
import type { TransactionTotalsStatus } from '@/modules/transactions/screens/transactions/transactions.state';
import type { TransactionListStatus } from '@/modules/transactions/store/transaction.store';

function input(
  overrides: Partial<TransactionsPresentationInput> = {},
): TransactionsPresentationInput {
  return {
    listStatus: 'ready',
    totalsStatus: 'ready',
    rowCount: 2,
    hasLoadedOnce: true,
    paginationError: false,
    accountLookupError: false,
    userRefreshing: false,
    ...overrides,
  };
}

describe('buildTransactionsPresentation', () => {
  it.each<
    [
      string,
      Partial<TransactionsPresentationInput>,
      Partial<ReturnType<typeof buildTransactionsPresentation>>,
    ]
  >([
    [
      'initial load',
      { listStatus: 'initialLoading', rowCount: 0, hasLoadedOnce: false },
      { showInitialSkeleton: true, showEmptyState: false },
    ],
    [
      'loaded empty',
      { listStatus: 'empty', rowCount: 0 },
      { showInitialSkeleton: false, showEmptyState: true },
    ],
    [
      'empty refresh',
      { listStatus: 'refreshing', rowCount: 0, userRefreshing: true },
      { showEmptyState: true, showRefreshIndicator: true },
    ],
    [
      'refresh the user did not start',
      { listStatus: 'refreshing', userRefreshing: false },
      { showRefreshIndicator: false },
    ],
    [
      'first-load retry the user tapped',
      { listStatus: 'initialLoading', rowCount: 0, hasLoadedOnce: false, userRefreshing: true },
      { showRefreshIndicator: false, showInitialSkeleton: true },
    ],
    [
      'first-load failure',
      { listStatus: 'firstLoadError', rowCount: 0, hasLoadedOnce: false },
      { showFirstLoadError: true, showEmptyState: false, loadErrorVariant: 'none' },
    ],
    [
      'list refresh failure',
      { listStatus: 'refreshErrorWithData' },
      { loadErrorVariant: 'refresh' },
    ],
    [
      'totals refresh failure',
      { totalsStatus: 'refreshErrorWithData' },
      { loadErrorVariant: 'totals' },
    ],
    [
      'list and totals refresh failures together',
      { listStatus: 'refreshErrorWithData', totalsStatus: 'refreshErrorWithData' },
      { loadErrorVariant: 'refresh' },
    ],
    [
      'totals first-load failure with rows',
      { totalsStatus: 'firstLoadError' },
      { loadErrorVariant: 'totals' },
    ],
    ['account lookup failure', { accountLookupError: true }, { loadErrorVariant: 'accounts' }],
    [
      'account lookup failure under a list refresh failure',
      { accountLookupError: true, listStatus: 'refreshErrorWithData' },
      { loadErrorVariant: 'refresh' },
    ],
    [
      'account lookup failure under a totals first-load failure',
      { accountLookupError: true, totalsStatus: 'firstLoadError' },
      { loadErrorVariant: 'totals' },
    ],
    [
      'account lookup failure under a first-load list failure',
      { accountLookupError: true, listStatus: 'firstLoadError', rowCount: 0, hasLoadedOnce: false },
      { loadErrorVariant: 'none' },
    ],
    ['pagination failure with rows', { paginationError: true }, { showPaginationRetry: true }],
    [
      'pagination failure without rows',
      { paginationError: true, rowCount: 0 },
      { showPaginationRetry: false },
    ],
  ])('%s', (_name, overrides, expected) => {
    expect(buildTransactionsPresentation(input(overrides))).toMatchObject(expected);
  });

  it.each<TransactionListStatus>(['idle', 'initialLoading'])(
    'shows the first-load skeleton for %s',
    (listStatus) => {
      expect(
        buildTransactionsPresentation(input({ listStatus, rowCount: 0, hasLoadedOnce: false })),
      ).toMatchObject({ showInitialSkeleton: true });
    },
  );

  it.each<TransactionTotalsStatus>(['idle', 'initialLoading', 'ready', 'refreshing'])(
    'does not report a totals error for %s',
    (totalsStatus) => {
      expect(buildTransactionsPresentation(input({ totalsStatus })).loadErrorVariant).toBe('none');
    },
  );
});
