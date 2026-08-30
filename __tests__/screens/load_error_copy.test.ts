import { Strings } from '@/constants/strings';

// Logic-only drift guard for the nine-copy LoadErrorAlert fold (W2G #290
// cluster 2, the `error_presentation_copy.test.ts` shape). Repo policy
// forbids UI-component render tests, so this cannot prove any of the nine
// callers actually renders its own title or retry label on screen — that is
// the device-QA walk's job (gate 3). What this guards against is a title or
// retry Strings key being deleted or emptied out from under its caller, a
// screen's initial/refresh titles collapsing onto one string, and — the
// point of the derivation below — a load-error string added to `strings.ts`
// later and never added to this file, which a hand-typed array checked only
// against its own length cannot catch (review.md's gate-that-cannot-fail
// rule; the array literal WAS the length).
//
// Every value asserted here is copy the fold moved, never copy it changed
// (spec §4.6: zero Strings edits) — this is a presence-and-distinctness
// guard, not a wording test.

type StringsKey = keyof typeof Strings;

// Longest suffix first: 'TotalsLoadError' and 'LoadMoreError' both end in
// 'LoadError', so trying the short form first would strip the wrong tail.
const TITLE_SUFFIXES = [
  'TotalsLoadError',
  'LoadMoreError',
  'RefreshErrorTitle',
  'LoadErrorTitle',
  'RefreshError',
  'LoadError',
] as const;

/** The Strings key with its title suffix removed, e.g. `'categoriesLoadError'`
 * -> `'categories'`, `'detailRefreshErrorTitle'` -> `'detail'`. `undefined`
 * when `key` doesn't end in any load-error title shape at all. */
function loadErrorStem(key: string): string | undefined {
  for (const suffix of TITLE_SUFFIXES) {
    if (key.endsWith(suffix)) return key.slice(0, -suffix.length);
  }
  return undefined;
}

function isStringsKey(key: string): key is StringsKey {
  return Object.prototype.hasOwnProperty.call(Strings, key);
}

/**
 * A title-shaped key is IN the load-error-alert family iff its screen stem
 * also carries a `<stem>LoadRetry` sibling — the actual runtime contract
 * every `LoadErrorAlert` caller has (a title always ships with a
 * `retryLabel`). This is what excludes `budgetPlansDetailLoadError`
 * (strings.ts:595): same `LoadError` suffix as the nine this ticket folded,
 * but no `budgetPlansDetailLoadRetry` sibling — a different screen this
 * ticket never touched, correctly left out without being named here.
 */
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
      // Cannot be undefined — `key` only reached derivedTitleKeys via a
      // successful loadErrorStem call above.
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
