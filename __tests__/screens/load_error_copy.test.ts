import { Strings } from '@/constants/strings';

// Logic-only drift guard for the nine-copy LoadErrorAlert fold (W2G #290
// cluster 2, the `error_presentation_copy.test.ts` shape). Repo policy
// forbids UI-component render tests, so this cannot prove any of the nine
// callers actually renders its own title or retry label on screen — that is
// the device-QA walk's job (gate 3). What this guards against is a title or
// retry Strings key being deleted or emptied out from under its caller, and
// a screen's initial/refresh titles collapsing onto one string.
//
// Every value asserted here is copy the fold moved, never copy it changed
// (spec §4.6: zero Strings edits) — this is a presence-and-distinctness
// guard, not a wording test.
describe('load-error titles — all 13 present and non-empty', () => {
  it('has every title key present and non-empty', () => {
    const titles = [
      Strings.categoriesLoadError,
      Strings.categoriesRefreshError,
      Strings.dashboardLoadError,
      Strings.dashboardRefreshError,
      Strings.budgetLoadError,
      Strings.addTxDataLoadError,
      Strings.commitmentsLoadError,
      Strings.transactionsLoadError,
      Strings.transactionsRefreshError,
      Strings.transactionsTotalsLoadError,
      Strings.transactionsLoadMoreError,
      Strings.detailLoadErrorTitle,
      Strings.detailRefreshErrorTitle,
    ];

    expect(titles).toHaveLength(13);
    for (const value of titles) {
      expect(value.length).toBeGreaterThan(0);
    }
  });
});

describe('load-error retry labels — all 7 present and non-empty', () => {
  it('has every retry key present and non-empty', () => {
    const retryLabels = [
      Strings.categoriesLoadRetry,
      Strings.dashboardLoadRetry,
      Strings.budgetLoadRetry,
      Strings.addTxDataLoadRetry,
      Strings.commitmentsLoadRetry,
      Strings.transactionsLoadRetry,
      Strings.detailLoadRetry,
    ];

    expect(retryLabels).toHaveLength(7);
    for (const value of retryLabels) {
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
