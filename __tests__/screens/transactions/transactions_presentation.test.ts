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
      { listStatus: 'refreshing', rowCount: 0 },
      { showEmptyState: true, showRefreshIndicator: true },
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
      { loadErrorVariant: 'refresh' },
    ],
    [
      'totals first-load failure with rows',
      { totalsStatus: 'firstLoadError' },
      { loadErrorVariant: 'totals' },
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
