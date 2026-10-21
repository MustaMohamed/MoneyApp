import { Strings } from '@/constants/strings';

const PAY_SHEET_RATE_CARD =
  'modules/transactions/components/exchange_rate_row.tsx, mounted by modules/commitments/screens/commitments/detail/components/pay_sheet.tsx';
const COMMITMENT_FILTER = 'modules/commitments/screens/commitments/filter';
const AMOUNT_RANGE_FILTER =
  'modules/transactions/utils/amount_range_filter.ts, read by both filter sheets';

// Keys the transactions module shares with other screens, which the MA-097 sweep leaves as they read (MA-197).
describe('strings the transactions module shares with other modules', () => {
  it.each([
    ['deletedAccount', 'utils/account_name.ts', Strings.deletedAccount, 'Deleted Account'],
    [
      'typeBadgeCommitment',
      'components/ui/type_badge.tsx',
      Strings.typeBadgeCommitment,
      'Commitment',
    ],
    ['todayLabel', 'utils/group_transactions_by_date.ts', Strings.todayLabel, 'Today'],
    ['yesterdayLabel', 'utils/group_transactions_by_date.ts', Strings.yesterdayLabel, 'Yesterday'],
    [
      'emptyFilteredHeadline',
      'components/ui/empty_state.tsx',
      Strings.emptyFilteredHeadline,
      'No results',
    ],
    [
      'emptyFilteredDescription',
      'components/ui/empty_state.tsx',
      Strings.emptyFilteredDescription,
      'Try adjusting your filters.',
    ],
    [
      'emptyFilteredClearCta',
      'components/ui/empty_state.tsx',
      Strings.emptyFilteredClearCta,
      'Clear Filters',
    ],
    ['filterTitle', `${COMMITMENT_FILTER}/index.tsx`, Strings.filterTitle, 'Filters'],
    ['filterReset', `${COMMITMENT_FILTER}/index.tsx`, Strings.filterReset, 'Reset'],
    ['filterApply', `${COMMITMENT_FILTER}/index.tsx`, Strings.filterApply, 'Apply'],
    [
      'filterApplyWithCount(2)',
      `${COMMITMENT_FILTER}/index.tsx`,
      Strings.filterApplyWithCount(2),
      'Apply (2)',
    ],
    [
      'filterSectionAccounts',
      `${COMMITMENT_FILTER}/components/account_accordion.tsx`,
      Strings.filterSectionAccounts,
      'Accounts',
    ],
    [
      'filterSectionCategories',
      `${COMMITMENT_FILTER}/components/category_accordion.tsx`,
      Strings.filterSectionCategories,
      'Categories',
    ],
    [
      'filterSectionAmount',
      `${COMMITMENT_FILTER}/components/amount_accordion.tsx`,
      Strings.filterSectionAmount,
      'Amount',
    ],
    [
      'filterSectionAmountType',
      `${COMMITMENT_FILTER}/components/amount_type_accordion.tsx`,
      Strings.filterSectionAmountType,
      'Amount type',
    ],
    [
      'filterSectionRepeats',
      `${COMMITMENT_FILTER}/components/recurrence_accordion.tsx`,
      Strings.filterSectionRepeats,
      'Repeats',
    ],
    [
      'filterSummaryAccountsEmpty',
      `${COMMITMENT_FILTER}/filter.hook.ts`,
      Strings.filterSummaryAccountsEmpty,
      'All accounts',
    ],
    [
      'filterSummaryCategoriesEmpty',
      `${COMMITMENT_FILTER}/filter.hook.ts`,
      Strings.filterSummaryCategoriesEmpty,
      'All categories',
    ],
    [
      'filterSummaryAmountEmpty',
      AMOUNT_RANGE_FILTER,
      Strings.filterSummaryAmountEmpty,
      'Any amount',
    ],
    ['filterSummaryAmountUpTo', AMOUNT_RANGE_FILTER, Strings.filterSummaryAmountUpTo, 'Up to'],
    ['filterSummaryAmountFrom', AMOUNT_RANGE_FILTER, Strings.filterSummaryAmountFrom, 'From'],
    [
      'swipeEdit',
      'budget named_budget_row.tsx and commitments commitment_row.tsx',
      Strings.swipeEdit,
      'Edit',
    ],
    [
      'swipeDelete',
      'budget named_budget_row.tsx and commitments commitment_row.tsx',
      Strings.swipeDelete,
      'Delete',
    ],
    [
      'fixFieldsMarkedAbove(2)',
      'modules/accounts/screens/accounts/edit_account/edit_account.helpers.ts',
      Strings.fixFieldsMarkedAbove(2),
      'Fix the 2 fields marked above.',
    ],
    [
      'transactions',
      'modules/dashboard/screens/dashboard/components/transactions_card.tsx',
      Strings.transactions,
      'Transactions',
    ],
    [
      'totalsExpenseShareA11y(40)',
      'modules/dashboard/screens/dashboard/components/transactions_card.tsx',
      Strings.totalsExpenseShareA11y(40),
      'Expenses are 40% of income',
    ],
    [
      'addTxNotePlaceholder',
      'modules/commitments/screens/commitments/components/commitment_form_body.tsx',
      Strings.addTxNotePlaceholder,
      'Add a note (optional)',
    ],
    [
      'addTxErrRateInvalid',
      'modules/commitments/screens/commitments/detail/components/pay_sheet.hook.ts',
      Strings.addTxErrRateInvalid,
      'Enter a valid rate greater than 0',
    ],
    [
      'currencyRateLabel',
      `modules/currency/screens/currency/index.tsx and ${PAY_SHEET_RATE_CARD}`,
      Strings.currencyRateLabel,
      'Exchange Rate',
    ],
    ['addTxRateReset', PAY_SHEET_RATE_CARD, Strings.addTxRateReset, 'Reset to global'],
    ['addTxRateSourceCustom', PAY_SHEET_RATE_CARD, Strings.addTxRateSourceCustom, 'Custom rate'],
    [
      'addTxPickAccountTitle',
      'modules/commitments/screens/commitments/components/commitment_form_body.tsx',
      Strings.addTxPickAccountTitle,
      'Select Account',
    ],
    [
      'addTxPickCategoryTitle',
      'modules/commitments/screens/commitments/components/commitment_form_body.tsx',
      Strings.addTxPickCategoryTitle,
      'Select Category',
    ],
  ])('%s, read by %s, stays as shipped', (_key, _readers, value, expected) => {
    expect(value).toBe(expected);
  });
});
