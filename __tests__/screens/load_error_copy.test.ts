import { Strings } from '@/constants/strings';

type StringsKey = keyof typeof Strings;

// Longest suffix first: the short `LoadError` form would strip the wrong tail from the others.
const TITLE_SUFFIXES = [
  'TotalsLoadError',
  'LoadMoreError',
  'RefreshErrorTitle',
  'LoadErrorTitle',
  'RefreshError',
  'LoadError',
] as const;

/** The key with its load-error title suffix removed: `categoriesLoadError` -> `categories`. */
function loadErrorStem(key: string): string | undefined {
  for (const suffix of TITLE_SUFFIXES) {
    if (key.endsWith(suffix)) return key.slice(0, -suffix.length);
  }
  return undefined;
}

function isStringsKey(key: string): key is StringsKey {
  return Object.prototype.hasOwnProperty.call(Strings, key);
}

// Every `LoadErrorAlert` title ships a retry label, so the sibling key is the family test.
const derivedTitleKeys: StringsKey[] = (Object.keys(Strings) as StringsKey[]).filter((key) => {
  const stem = loadErrorStem(key);
  if (stem === undefined) return false;
  const retryKey = `${stem}LoadRetry`;
  return isStringsKey(retryKey) && typeof Strings[retryKey] === 'string';
});

const derivedRetryKeys: StringsKey[] = [
  ...new Set(
    derivedTitleKeys.map((key) => {
      const stem = loadErrorStem(key);
      // Never undefined: `key` reached `derivedTitleKeys` only via a successful `loadErrorStem`.
      return `${stem}LoadRetry`;
    }),
  ),
].filter(isStringsKey);

describe('load-error titles — derived from Strings by naming convention', () => {
  it('derives exactly the 13 titles the nine-copy fold uses', () => {
    expect(derivedTitleKeys.slice().sort()).toEqual(
      [
        'categoriesLoadError',
        'categoriesRefreshError',
        'dashboardLoadError',
        'dashboardRefreshError',
        'budgetLoadError',
        'addTxDataLoadError',
        'commitmentsLoadError',
        'transactionsLoadError',
        'transactionsRefreshError',
        'transactionsTotalsLoadError',
        'transactionsLoadMoreError',
        'detailLoadErrorTitle',
        'detailRefreshErrorTitle',
      ].sort(),
    );
  });

  it('every derived title is present and non-empty', () => {
    expect(derivedTitleKeys).toHaveLength(13);
    for (const key of derivedTitleKeys) {
      const value = Strings[key];
      if (typeof value !== 'string') throw new Error(`expected ${key} to be a string`);
      expect(value.length).toBeGreaterThan(0);
    }
  });
});

describe('load-error retry labels — derived from Strings by naming convention', () => {
  it('derives exactly the 7 retry labels the nine-copy fold uses', () => {
    expect(derivedRetryKeys.slice().sort()).toEqual(
      [
        'categoriesLoadRetry',
        'dashboardLoadRetry',
        'budgetLoadRetry',
        'addTxDataLoadRetry',
        'commitmentsLoadRetry',
        'transactionsLoadRetry',
        'detailLoadRetry',
      ].sort(),
    );
  });

  it('every derived retry label is present and non-empty', () => {
    expect(derivedRetryKeys).toHaveLength(7);
    for (const key of derivedRetryKeys) {
      const value = Strings[key];
      if (typeof value !== 'string') throw new Error(`expected ${key} to be a string`);
      expect(value.length).toBeGreaterThan(0);
    }
  });
});

describe('load-error titles — initial and refresh stay distinct where a screen has both', () => {
  it('categories', () => {
    expect(Strings.categoriesRefreshError).not.toBe(Strings.categoriesLoadError);
  });

  it('dashboard', () => {
    expect(Strings.dashboardRefreshError).not.toBe(Strings.dashboardLoadError);
  });

  it('transactions — initial, refresh, totals and pagination are four distinct titles', () => {
    const variants = [
      Strings.transactionsLoadError,
      Strings.transactionsRefreshError,
      Strings.transactionsTotalsLoadError,
      Strings.transactionsLoadMoreError,
    ];
    expect(new Set(variants).size).toBe(variants.length);
  });

  it('transaction detail', () => {
    expect(Strings.detailRefreshErrorTitle).not.toBe(Strings.detailLoadErrorTitle);
  });
});
