import { buildCommitmentsPresentation } from '@/modules/commitments/screens/commitments/commitments.presentation';

type PresentationInput = Parameters<typeof buildCommitmentsPresentation>[0];
type Presentation = ReturnType<typeof buildCommitmentsPresentation>;

const NOTHING_IN_MONTH = { commitmentCount: 0, rowCount: 0, matchCount: 0 };
const EMPTY_MONTH = { commitmentCount: 1, rowCount: 0, matchCount: 0 };

function input(overrides: Partial<PresentationInput> = {}): PresentationInput {
  return {
    hasMatchingSnapshot: true,
    loadError: false,
    commitmentCount: 1,
    rowCount: 2,
    matchCount: 1,
    filtersActive: false,
    showAccountLookupError: false,
    ...overrides,
  };
}

describe('buildCommitmentsPresentation', () => {
  it.each<[string, Partial<PresentationInput>, Presentation]>([
    [
      'the first load of a month',
      { hasMatchingSnapshot: false, ...NOTHING_IN_MONTH },
      { status: 'coldLoading', emptyVariant: 'none', floatingAlert: undefined },
    ],
    [
      'a first-load failure',
      { hasMatchingSnapshot: false, loadError: true, ...NOTHING_IN_MONTH },
      { status: 'coldError', emptyVariant: 'none', floatingAlert: undefined },
    ],
    [
      'a month with rows on screen',
      {},
      { status: 'content', emptyVariant: 'none', floatingAlert: undefined },
    ],
    [
      'a refresh failure over rows',
      { loadError: true },
      { status: 'contentWithError', emptyVariant: 'none', floatingAlert: 'list' },
    ],
    [
      "no commitment and no row, as a month after a stopped commitment's rows reads",
      NOTHING_IN_MONTH,
      { status: 'content', emptyVariant: 'noCommitments', floatingAlert: undefined },
    ],
    [
      'no commitment under a filter',
      { ...NOTHING_IN_MONTH, filtersActive: true },
      { status: 'content', emptyVariant: 'noCommitments', floatingAlert: undefined },
    ],
    [
      "a stopped commitment's rows in their month",
      { commitmentCount: 1, rowCount: 2, matchCount: 1 },
      { status: 'content', emptyVariant: 'none', floatingAlert: undefined },
    ],
    [
      'a month with no row of its own',
      EMPTY_MONTH,
      { status: 'content', emptyVariant: 'emptyMonth', floatingAlert: undefined },
    ],
    [
      'a filter on an empty month',
      { ...EMPTY_MONTH, filtersActive: true },
      { status: 'content', emptyVariant: 'noResults', floatingAlert: undefined },
    ],
    [
      'a filter that matches none of the month rows',
      { matchCount: 0, filtersActive: true },
      { status: 'content', emptyVariant: 'noResults', floatingAlert: undefined },
    ],
    [
      'the frame where a deferred status tab lags the rows',
      { matchCount: 0 },
      { status: 'content', emptyVariant: 'none', floatingAlert: undefined },
    ],
    [
      'a refresh failure over an empty month',
      { ...EMPTY_MONTH, loadError: true },
      { status: 'contentWithError', emptyVariant: 'emptyMonth', floatingAlert: 'list' },
    ],
    [
      'a refresh failure with no commitments',
      { ...NOTHING_IN_MONTH, loadError: true },
      { status: 'contentWithError', emptyVariant: 'noCommitments', floatingAlert: 'list' },
    ],
    [
      'a refresh failure under a filter that matches nothing',
      { loadError: true, matchCount: 0, filtersActive: true },
      { status: 'contentWithError', emptyVariant: 'noResults', floatingAlert: 'list' },
    ],
    [
      'an unresolved account name',
      { showAccountLookupError: true },
      { status: 'content', emptyVariant: 'none', floatingAlert: 'accounts' },
    ],
    [
      'the list alert in the account alert place',
      { loadError: true, showAccountLookupError: true },
      { status: 'contentWithError', emptyVariant: 'none', floatingAlert: 'list' },
    ],
    [
      'an unresolved account name during the first load',
      { hasMatchingSnapshot: false, showAccountLookupError: true, ...NOTHING_IN_MONTH },
      { status: 'coldLoading', emptyVariant: 'none', floatingAlert: undefined },
    ],
    [
      'an unresolved account name under a first-load failure',
      {
        hasMatchingSnapshot: false,
        loadError: true,
        showAccountLookupError: true,
        ...NOTHING_IN_MONTH,
      },
      { status: 'coldError', emptyVariant: 'none', floatingAlert: undefined },
    ],
  ])('%s', (_name, overrides, expected) => {
    expect(buildCommitmentsPresentation(input(overrides))).toStrictEqual(expected);
  });
});
