import { Strings } from '@/constants/strings';

// The transactions canvas Copy note (`r2copy`), one row per string, as the strings file holds it (MA-097, MA-197).
describe('transactions Copy note strings', () => {
  it.each([
    ['transactionsHeroTitle', Strings.transactionsHeroTitle, 'Out this month'],
    ['transactionsHeroIn', Strings.transactionsHeroIn, 'In'],
    ['transactionsHeroNet', Strings.transactionsHeroNet, 'Net'],
    ['transactionsHeroLeftOfIncome', Strings.transactionsHeroLeftOfIncome, 'Left of income'],
    [
      'transactionsHeroShareSpent(62)',
      Strings.transactionsHeroShareSpent(62),
      '62% of income spent',
    ],
    ['listHeroDaysLeft(1)', Strings.listHeroDaysLeft(1), '1 day left'],
    ['listHeroDaysLeft(12)', Strings.listHeroDaysLeft(12), '12 days left'],
    ['listHeroCaptionSeparator', Strings.listHeroCaptionSeparator, ' · '],
    ['listHeroUnavailable', Strings.listHeroUnavailable, '—'],
    ['listHeroAmountUnavailableA11y(EGP)', Strings.listHeroAmountUnavailableA11y('EGP'), '— EGP'],
    ['searchTransactionsPlaceholder', Strings.searchTransactionsPlaceholder, 'Search transactions'],
    [
      'transactionsTallyResults(October)',
      Strings.transactionsTallyResults('October'),
      'results in October',
    ],
    ['emptyTransactionsHeadline', Strings.emptyTransactionsHeadline, 'No transactions yet'],
    [
      'emptyTransactionsDescription',
      Strings.emptyTransactionsDescription,
      'Your transactions will appear here once you start adding them.',
    ],
    [
      'emptyTransactionsMonthHeadline(September)',
      Strings.emptyTransactionsMonthHeadline('September'),
      'Nothing recorded in September',
    ],
    [
      'emptyTransactionsMonthDescription(September)',
      Strings.emptyTransactionsMonthDescription('September'),
      'Add a transaction dated in September, or pick another month.',
    ],
    ['emptyTransactionsMonthBackCta', Strings.emptyTransactionsMonthBackCta, 'Back to this month'],
    ['emptyFilteredHeadline', Strings.emptyFilteredHeadline, 'No results'],
    ['emptyFilteredDescription', Strings.emptyFilteredDescription, 'Try adjusting your filters.'],
    ['emptyFilteredClearCta', Strings.emptyFilteredClearCta, 'Clear Filters'],
    ['transactionsLoadError', Strings.transactionsLoadError, "Couldn't load your transactions"],
    [
      'transactionsLoadErrorDescription',
      Strings.transactionsLoadErrorDescription,
      'Something went wrong reading your data. Your transactions are still there.',
    ],
    [
      'transactionsRefreshError',
      Strings.transactionsRefreshError,
      "Couldn't refresh your transactions.",
    ],
    [
      'transactionsTotalsLoadError',
      Strings.transactionsTotalsLoadError,
      "Couldn't load this month's figures.",
    ],
    ['transactionsLoadMoreError', Strings.transactionsLoadMoreError, "Couldn't load more."],
    [
      'transactionsAccountLookupError',
      Strings.transactionsAccountLookupError,
      "Couldn't load account names.",
    ],
    ['transactionsLoadRetry', Strings.transactionsLoadRetry, 'Try again'],
    ['detailLoadErrorTitle', Strings.detailLoadErrorTitle, "Couldn't load this transaction"],
    [
      'detailLoadErrorDescription',
      Strings.detailLoadErrorDescription,
      'Something went wrong reading your data. The transaction is still there.',
    ],
    [
      'detailRefreshErrorTitle',
      Strings.detailRefreshErrorTitle,
      "Couldn't refresh this transaction.",
    ],
    ['detailLoadRetry', Strings.detailLoadRetry, 'Try again'],
    ['deleteConfirmTitle', Strings.deleteConfirmTitle, 'Delete this transaction?'],
    [
      'deleteConfirmBodyExpense',
      Strings.deleteConfirmBodyExpense('500 EGP', 'CIB'),
      '500 EGP returns to CIB. This cannot be undone.',
    ],
    [
      'deleteConfirmBodyIncome',
      Strings.deleteConfirmBodyIncome('500 EGP', 'CIB'),
      '500 EGP leaves CIB. This cannot be undone.',
    ],
    [
      'deleteConfirmBodyTransfer',
      Strings.deleteConfirmBodyTransfer('500 EGP', 'CIB', 'Wallet'),
      '500 EGP moves back to CIB from Wallet. This cannot be undone.',
    ],
    [
      'deleteConfirmBodyCardPayment',
      Strings.deleteConfirmBodyCardPayment('500 EGP', 'CIB', 'Visa'),
      '500 EGP moves back to CIB and is owed on Visa again. This cannot be undone.',
    ],
    [
      'deleteConfirmBodyCardCredit',
      Strings.deleteConfirmBodyCardCredit('500 EGP', 'Visa'),
      '500 EGP is owed on Visa again. This cannot be undone.',
    ],
    ['deleteCancel', Strings.deleteCancel, 'Cancel'],
    ['deleteTransaction', Strings.deleteTransaction, 'Delete'],
    ['addTxRateSourceStored', Strings.addTxRateSourceStored, 'Using stored rate'],
    ['addTxRateLastUpdated(Oct 12)', Strings.addTxRateLastUpdated('Oct 12'), 'Last updated Oct 12'],
    [
      'addTxRateSourceCustomPerUsd',
      Strings.addTxRateSourceCustomPerUsd,
      'Custom rate · EGP per 1 USD',
    ],
    ['addTxRateResetToStored', Strings.addTxRateResetToStored, 'Reset to stored rate'],
    ['addTxRateStale', Strings.addTxRateStale, 'Rate may be stale'],
    ['filterAllAccounts', Strings.filterAllAccounts, 'All accounts'],
    ['detailHeader', Strings.detailHeader, 'Transaction'],
    ['detailAmountOverline', Strings.detailAmountOverline, 'Amount'],
    ['detailManualSource', Strings.detailManualSource, 'Manual entry'],
    ['capturedBadge', Strings.capturedBadge, 'Captured'],
    ['viewCommitment', Strings.viewCommitment, 'View commitment'],
    ['detailDeleteButton', Strings.detailDeleteButton, 'Delete'],
    [
      'transactionAccountArchived(CIB)',
      Strings.transactionAccountArchived('CIB'),
      'CIB is archived. Restore it to change this transaction.',
    ],
    ['detailNotFoundTitle', Strings.detailNotFoundTitle, 'Transaction not found'],
    ['detailNotFoundBody', Strings.detailNotFoundBody, 'This transaction may have been deleted.'],
    ['addTxBudgetLookupError', Strings.addTxBudgetLookupError, "Couldn't load budgets."],
    ['addTxBudgetRetryA11y', Strings.addTxBudgetRetryA11y, 'Try again'],
  ])('%s reads as the note writes it', (_key, value, expected) => {
    expect(value).toBe(expected);
  });
});

describe('the two departures from the Copy note', () => {
  it("reads the empty state's button Add transaction, as the #543 review ruled on 2026-09-22", () => {
    expect(Strings.emptyTransactionsCta).toBe('Add transaction');
  });

  it("shows Amount in EGP and Amount in USD where the note writes Original amount, per #543's Rule 26", () => {
    expect(Strings.detailAmountInEgp).toBe('Amount in EGP');
    expect(Strings.detailAmountInUsd).toBe('Amount in USD');
    expect(
      Object.values(Strings).filter(
        (value) => typeof value === 'string' && value.includes('Original amount'),
      ),
    ).toEqual([]);
  });
});

describe('labels the note does not write stay as shipped', () => {
  it.each([['emptyFilteredClearCta', Strings.emptyFilteredClearCta, 'Clear Filters']])(
    '%s keeps its shipped case',
    (_key, value, expected) => {
      expect(value).toBe(expected);
    },
  );
});

describe('the shared no-accounts state reads in sentence case (MA-219)', () => {
  it('labels the add account action Add account on both sheets that mount it', () => {
    expect(Strings.addTxNoAccountsCta).toBe('Add account');
    expect(Strings.addTxNoAccountsBody).toBe('Add an account first to record transactions.');
  });
});
