import {
  buildTransactionsPresentation,
  type TransactionsPresentationInput,
} from '@/modules/transactions/screens/transactions/transactions.presentation';
import type { TransactionTotalsStatus } from '@/modules/transactions/screens/transactions/transactions.state';
import type { TransactionListStatus } from '@/modules/transactions/store/transaction.store';

type Existence = TransactionsPresentationInput['existence'];
type Presentation = ReturnType<typeof buildTransactionsPresentation>;

const EXISTENCES: Existence[] = ['unknown', 'some', 'none', 'failed'];

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
    filtersActive: false,
    isCurrentMonth: true,
    existence: 'some',
    ...overrides,
  };
}

function emptyInput(
  overrides: Partial<TransactionsPresentationInput> = {},
): TransactionsPresentationInput {
  return input({ listStatus: 'empty', rowCount: 0, isCurrentMonth: false, ...overrides });
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
      { showInitialSkeleton: true, emptyVariant: 'none' },
    ],
    [
      'loaded empty',
      { listStatus: 'empty', rowCount: 0 },
      { showInitialSkeleton: false, emptyVariant: 'emptyMonth' },
    ],
    [
      'empty refresh',
      { listStatus: 'refreshing', rowCount: 0, userRefreshing: true },
      { emptyVariant: 'emptyMonth', showRefreshIndicator: true },
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
      { showFirstLoadError: true, emptyVariant: 'none', loadErrorVariant: 'none' },
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

describe('buildTransactionsPresentation list slot (MA-093)', () => {
  it.each(EXISTENCES)(
    'no rows under a filter read noResults whatever the read says (%s)',
    (existence) => {
      expect(
        buildTransactionsPresentation(emptyInput({ filtersActive: true, existence })),
      ).toMatchObject({
        emptyVariant: 'noResults',
        awaitsExistence: false,
        showInitialSkeleton: false,
        showFirstLoadError: false,
        showsBackToThisMonth: false,
      });
    },
  );

  it.each<[string, Existence, boolean, Partial<Presentation>]>([
    [
      'holds the skeleton and no block until the read answers',
      'unknown',
      false,
      {
        showInitialSkeleton: true,
        awaitsExistence: true,
        emptyVariant: 'none',
        showFirstLoadError: false,
        showsBackToThisMonth: false,
      },
    ],
    [
      'shows the first-load error and no block when the read failed',
      'failed',
      false,
      {
        showFirstLoadError: true,
        awaitsExistence: true,
        loadErrorVariant: 'none',
        emptyVariant: 'none',
        showInitialSkeleton: false,
        showsBackToThisMonth: false,
      },
    ],
    [
      'shows the no-transactions block when no transaction exists',
      'none',
      false,
      {
        emptyVariant: 'noData',
        awaitsExistence: true,
        showInitialSkeleton: false,
        showFirstLoadError: false,
        showsBackToThisMonth: false,
      },
    ],
    [
      'shows the empty-month block with its link when another month holds a transaction',
      'some',
      false,
      {
        emptyVariant: 'emptyMonth',
        awaitsExistence: true,
        showInitialSkeleton: false,
        showFirstLoadError: false,
        showsBackToThisMonth: true,
      },
    ],
    [
      'shows the empty-month block without the link on the current month',
      'some',
      true,
      {
        emptyVariant: 'emptyMonth',
        awaitsExistence: true,
        showInitialSkeleton: false,
        showFirstLoadError: false,
        showsBackToThisMonth: false,
      },
    ],
  ])('a loaded unfiltered month with no rows %s', (_name, existence, isCurrentMonth, expected) => {
    expect(buildTransactionsPresentation(emptyInput({ existence, isCurrentMonth }))).toMatchObject(
      expected,
    );
  });

  it.each(EXISTENCES)(
    'rows present read no block, and the read (%s) changes no field',
    (existence) => {
      const withRows = buildTransactionsPresentation(input({ existence, isCurrentMonth: false }));

      expect(withRows).toMatchObject({
        emptyVariant: 'none',
        awaitsExistence: false,
        showInitialSkeleton: false,
        showFirstLoadError: false,
        showsBackToThisMonth: false,
      });
      expect(withRows).toEqual(
        buildTransactionsPresentation(input({ existence: 'some', isCurrentMonth: false })),
      );
    },
  );

  it.each<[string, Partial<TransactionsPresentationInput>, Partial<Presentation>]>([
    ['rows present', {}, { showFirstLoadError: false, emptyVariant: 'none' }],
    [
      'no rows under a filter',
      { listStatus: 'empty', rowCount: 0, filtersActive: true },
      { showFirstLoadError: false, emptyVariant: 'noResults' },
    ],
    [
      'rows present under a failed list refresh',
      { listStatus: 'refreshErrorWithData' },
      { showFirstLoadError: false, loadErrorVariant: 'refresh', emptyVariant: 'none' },
    ],
  ])(
    'a failed read carried in from an empty month leaves %s alone',
    (_name, overrides, expected) => {
      expect(
        buildTransactionsPresentation(input({ existence: 'failed', ...overrides })),
      ).toMatchObject(expected);
    },
  );

  it.each(EXISTENCES)(
    "the list's own first-load failure shows no block whatever the read says (%s)",
    (existence) => {
      expect(
        buildTransactionsPresentation(
          input({ listStatus: 'firstLoadError', rowCount: 0, hasLoadedOnce: false, existence }),
        ),
      ).toMatchObject({
        showFirstLoadError: true,
        awaitsExistence: false,
        emptyVariant: 'none',
        showInitialSkeleton: false,
      });
    },
  );

  it("the list's own first-load failure over a loaded snapshot does not wait on the read", () => {
    expect(
      buildTransactionsPresentation(
        emptyInput({ listStatus: 'firstLoadError', existence: 'unknown' }),
      ),
    ).toMatchObject({
      awaitsExistence: false,
      showFirstLoadError: true,
      showInitialSkeleton: false,
    });
  });

  it.each(EXISTENCES)(
    'a snapshot not yet loaded reads the skeleton and no block whatever the read says (%s)',
    (existence) => {
      expect(
        buildTransactionsPresentation(
          input({ listStatus: 'initialLoading', rowCount: 0, hasLoadedOnce: false, existence }),
        ),
      ).toMatchObject({
        showInitialSkeleton: true,
        emptyVariant: 'none',
        showFirstLoadError: false,
      });
    },
  );

  it('the link shows on emptyMonth alone', () => {
    const listStatuses: TransactionListStatus[] = [
      'initialLoading',
      'empty',
      'ready',
      'refreshing',
      'firstLoadError',
      'refreshErrorWithData',
    ];

    for (const listStatus of listStatuses) {
      for (const rowCount of [0, 2]) {
        for (const hasLoadedOnce of [true, false]) {
          for (const filtersActive of [true, false]) {
            for (const existence of EXISTENCES) {
              const presentation = buildTransactionsPresentation(
                input({
                  listStatus,
                  rowCount,
                  hasLoadedOnce,
                  filtersActive,
                  existence,
                  isCurrentMonth: false,
                }),
              );

              expect(presentation.showsBackToThisMonth).toBe(
                presentation.emptyVariant === 'emptyMonth',
              );
            }
          }
        }
      }
    }
  });
});
