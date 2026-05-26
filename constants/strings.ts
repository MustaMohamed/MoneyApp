export const Strings = {
  // O1 Welcome
  o1Headline: 'Your money.\nFinally clear.',
  o1Subtext: 'Track everything. Plan with confidence.\nNo bank access needed.',
  o1Cta: 'Get Started',

  // Add Account
  o4Title: 'Add Account',
  o4Subtitle: 'Start by adding one account — you can add more next.',
  o4SectionType: 'ACCOUNT TYPE',
  o4SectionName: 'ACCOUNT NAME',
  o4SectionCurrency: 'CURRENCY',
  o4SectionBalance: 'BALANCE',
  o4SectionColor: 'COLOR — 12 PRESETS',
  o4SectionRevolving: 'REVOLVING BALANCE',
  o4SectionLimit: 'CREDIT LIMIT',
  o4SectionMinPayment: 'MIN. PAYMENT',
  o4SectionDueDay: 'DUE DAY',
  o4SectionApr: 'APR (%)',
  o4NameLabel: 'Account Name',
  o4NamePlaceholder: 'e.g. CIB Savings',
  o4BalanceLabel: 'Opening Balance',
  o4BalancePlaceholder: '0',
  o4ColorLabel: 'Color',
  o4CreditLimitLabel: 'Credit Limit',
  o4CreditLimitPlaceholder: '0',
  o4RevolvingLabel: 'Revolving Balance',
  o4RevolvingPlaceholder: '0',
  o4MinPaymentLabel: 'Minimum Payment',
  o4DueDayLabel: 'Statement Due Day',
  o4DueDayPlaceholder: 'e.g. 15',
  o4InterestLabel: 'Track Interest',
  o4AprLabel: 'Annual Percentage Rate (APR %)',
  o4AprPlaceholder: 'e.g. 2.99',
  o4Cta: 'Save Account',

  // Welcome — base currency
  n1CurrencyLabel: 'BASE CURRENCY',
  n1CurrencyNote: 'Change anytime in Settings.',

  // Add Another?
  n3AccountSaved: 'Account saved',
  n3AddMoreSubtitle: 'Want to add another? You can add credit cards, cash wallets, and more.',

  // Credit-card field hints
  o4MinPaymentHint: 'Copy from your latest statement. Leave blank if your card is new.',
  o4AprHint:
    'Annual rate — usually 25–40% on Egyptian credit cards. Find it on your cardholder agreement or in your bank app under "Rates".',
  o4MinPaymentPlaceholder: 'From your statement',

  // O4 validation errors
  errNameRequired: 'Account name is required',
  errNameTooLong: 'Name must be 30 characters or less',
  errNameDuplicate: 'This name is already used',
  errBalanceInvalid: 'Please enter a valid amount',
  errCreditLimitRequired: 'Credit limit is required for credit cards',
  errAprRequired: "Please enter your card's APR",

  // Generic Zod error map fallbacks
  errRequired: 'This field is required',
  errTooShort: 'Too short',
  errTooLong: 'Too long',
  errInvalid: 'Invalid value',

  // Account types
  typeBank: 'Bank',
  typeSmartWallet: 'Smart Wallet',
  typePhysicalWallet: 'Phys. Wallet',
  typePhysicalSavings: 'Savings',
  typeCreditCard: 'Credit Card',

  // More Accounts
  o5Subtitle: 'Got other accounts? Add them now — or skip and do it later.',
  o5AddAnother: 'Add another account',
  o5SettingsHint: 'You can always add more from Settings',
  o5Cta: "I'm done",

  // Ready
  o6Title: "You're all set!",
  o6Subtitle: "Your MoneyApp is configured. Here's your summary.",
  o6Cta: 'Open My Dashboard',
  o6Currency: 'Base Currency',
  o6Accounts: 'Accounts',
  o6TotalBalance: 'Total Balance',
  o6AccountsUnit: 'accounts',

  // Placeholder dashboard
  placeholderTitle: 'Dashboard coming soon',
  placeholderSubtitle: 'M1 complete — M1.5 next.',

  // Dashboard (U2)
  // Account card info rows
  cardLimitLabel: 'Limit',
  cardAvailableLabel: 'Available',
  cardMinPayLabel: 'Min Pay',
  cardOverLimit: 'Over Limit',
  cardTypeLabel: 'Type',
  cardCurrencyLabel: 'Currency',
  cardOpeningLabel: 'Opening',
  cardDueDateLabel: 'Due Date',
  cardMonthInLabel: 'Month In',
  cardMonthOutLabel: 'Month Out',
  cardThisWeekLabel: 'This Week',
  cardInEgpLabel: 'In EGP',
  cardMonthSpendLabel: 'Month Spend',
  cardAvgDayLabel: 'Avg/Day',
  cardWeekSpendLabel: 'Week Spend',
  cardMonthStartLabel: 'Month Start',
  cardChangeLabel: 'Change',

  dashAddPrefix: 'Add',
  dashAvailableToSpend: 'Available to Spend',
  dashNetWorthTitle: 'Net Worth',
  dashAssetsLabel: 'Assets',
  dashLiabilitiesLabel: 'Liabilities',
  dashMonthSpentTitle: 'Spent This Month',
  dashMonthSpentTxsUnit: 'txs',
  dashSeeAll: 'See all',

  // §5 Dashboard v2 — segments + breakdown sheet
  dashboardSegmentOverview: 'Overview',
  dashboardSegmentAccounts: 'Accounts',
  dashboardTotalBalance: 'Total balance',
  dashboardAccountsLabel: 'Accounts',
  dashboardBreakdownTitle: 'Net Worth',
  dashboardBreakdownNetWorthLabel: 'Net Worth',
  dashboardBreakdownAssetsHeader: (egp: string, count: number) =>
    `${egp} EGP · ${count} ${count === 1 ? 'acct' : 'accts'}`,
  dashboardBreakdownLiabilitiesHeader: (egp: string, count: number) =>
    `${egp} EGP · ${count} ${count === 1 ? 'card' : 'cards'}`,
  dashboardBreakdownLiquid: 'Liquid',
  dashboardBreakdownReserve: 'Reserve',
  dashboardBreakdownLiquidCaption: 'Bank, Smart Wallet, Cash',
  dashboardBreakdownReserveCaption: 'Savings',
  dashboardBreakdownTotalDebt: 'Total debt',

  // Account Detail (U3)
  accountDetailEdit: 'Edit',
  accountDetailSave: 'Save',
  accountDetailCancel: 'Cancel',
  accountDetailMore: 'More',
  accountDetailBalance: 'Current Balance',
  accountDetailAdjustBalance: 'Adjust Balance',
  accountDetailArchive: 'Archive',
  accountDetailArchiveTitle: 'Archive Account?',
  accountDetailArchiveBody: 'This account will be hidden from your dashboard and all calculations.',
  accountDetailArchiveCCWarning: 'Outstanding credit card balance will still affect net worth.',
  accountDetailArchiveConfirm: 'Archive',

  // §9 Account Detail — balance hero captions
  accountHeroOpening: (amount: string, currency: string) => `Opening ${amount} ${currency}`,
  accountHeroAdjusted: 'adjusted',
  accountHeroAvailable: (avail: string, currency: string, limit: string) =>
    `Available ${avail} ${currency} of ${limit}`,

  // Add Account screen (U4 — main app)
  u4Title: 'Add Account',
  u4Cta: 'Save Account',

  // Adjust Balance sheet
  adjustBalanceTitle: 'Adjust Balance',
  adjustBalanceLabel: 'New Balance',
  adjustBalanceSave: 'Save Balance',
  adjustBalanceCancel: 'Cancel',

  // Settings Main (U23)
  settingsTitle: 'Settings',
  settingsCurrencyRow: 'Currency',
  settingsCurrencyDesc: 'USD / EGP exchange rate',

  // Settings Currency (U26)
  currencyScreenTitle: 'Currency',
  currencyRateLabel: 'Exchange Rate',
  currencyRateSub: 'EGP per 1 USD',
  currencyLastFetched: 'Last updated',
  currencyNeverFetched: 'Never fetched',
  currencyManualLabel: 'Manual Override',
  currencyManualShort: 'Manual',
  currencyManualSub: 'Set your own rate',
  currencyFetchCta: 'Refresh Rate',
  currencySaveCta: 'Save Rate',

  // Empty States
  emptyAccountsTitle: 'No accounts yet',
  emptyAccountsSub: 'Add your first account to get started.',
  emptyAccountsCta: 'Add Account',
  emptyTransactionsTitle: 'No transactions yet',
  emptyTransactionsSub: 'Transactions will appear here.',
  emptyBillsTitle: 'No bills yet',
  emptyBillsSub: 'Bills will appear here.',
  emptyGoalsTitle: 'No goals set',
  emptyGoalsSub: 'Goals will appear here.',
  // Budget
  emptyBudgetTitle: 'No budgets yet',
  emptyBudgetSub: 'Set a monthly limit on a category to start tracking your spending.',
  emptyBudgetCta: 'Set up your budget',
  budgetTitle: 'Budget',
  budgetAddCategory: 'Budget a category',
  budgetSummaryBudgeted: 'Budgeted',
  budgetSummarySpent: 'Spent',
  budgetSummaryLeft: 'Left',
  budgetUsedSuffix: 'used',
  budgetDaysLeftSuffix: 'days left',
  budgetOverPill: 'Over',
  budgetSetTitle: 'Set budget',
  budgetEditTitle: 'Edit budget',
  budgetMonthlyLimitLabel: 'Monthly limit',
  budgetSaveCta: 'Save budget',
  budgetRemoveCta: 'Remove budget',
  budgetAmountRequired: 'Enter a monthly limit',
  budgetAmountInvalid: 'Enter an amount greater than 0',
  budgetPickCategory: 'Choose a category',
  budgetDetailNet: 'Net',
  budgetDetailAvg: 'Avg / mo',
  budgetDetailUnder: 'under limit',
  budgetDetailMonthlyResult: 'Monthly result',
  budgetDetailCategories: 'Categories',
  budgetDetailInProgress: '* in progress',

  // U25 Settings Categories
  categoriesTitle: 'Categories',
  categoriesTabExpense: 'Expense',
  categoriesTabIncome: 'Income',
  categoriesDefaultSection: 'DEFAULTS',
  categoriesCustomSection: 'CUSTOM',
  categoriesAddBtn: 'Add Category',
  categoriesLimitMsg: 'Maximum 30 custom categories reached',
  categoriesAddSheetTitle: 'New Category',
  categoriesEditSheetTitle: 'Edit Category',
  categoriesNameLabel: 'Name',
  categoriesNamePlaceholder: 'e.g. Travel',
  categoriesTypeLabel: 'TYPE',
  categoriesIconLabel: 'ICON',
  categoriesColorLabel: 'COLOR',
  categoriesSaveCta: 'Save',
  categoriesErrNameRequired: 'Category name is required',
  categoriesErrNameTooLong: 'Name must be 50 characters or less',
  categoriesErrNameDuplicate: 'This name is already used',
  categoriesErrIconRequired: 'Please select an icon',
  categoriesDeleteTitle: 'Delete Category',
  categoriesDeleteBody: (name: string) => `Delete "${name}"? This cannot be undone.`,
  categoriesDeleteConfirm: 'Delete',
  categoriesDeleteCancel: 'Cancel',
  categoriesReassignTitle: (name: string) => `"${name}" has transactions`,
  categoriesReassignBody: 'Move its transactions to:',
  categoriesReassignConfirm: 'Move & Delete',

  // U23 Settings rows (categories row)
  settingsCategoriesRow: 'Categories',
  settingsCategoriesDesc: 'Manage expense and income categories',

  // U6 Add Transaction sheet
  addTxTitle: 'Add Transaction',
  addTxTypeExpense: 'Expense',
  addTxTypeIncome: 'Income',
  addTxTypeTransfer: 'Transfer',
  addTxTypeCCPayment: 'CC Payment',
  addTxAccountLabel: 'Account',
  addTxFromLabel: 'From',
  addTxToLabel: 'To',
  addTxCategoryLabel: 'Category',
  addTxDateLabel: 'Date',
  addTxTimeLabel: 'Time',
  addTxNoteLabel: 'Note',
  addTxNotePlaceholder: 'Add a note (optional)',
  addTxRateLabel: 'Rate',
  addTxRateSubGlobal: 'EGP per 1 USD · global rate',
  addTxRateSubCustom: 'EGP per 1 USD · custom rate',
  addTxRateOverrideLabel: 'Override',
  addTxSaveCta: 'Save',
  editTxSaveCta: 'Save Changes',
  addTxErrAmountRequired: 'Enter an amount',
  addTxErrAmountZero: 'Amount must be greater than 0',
  addTxErrAccountRequired: 'Select an account',
  addTxErrFromRequired: 'Select source account',
  addTxErrToRequired: 'Select destination account',
  addTxErrSameAccount: 'From and To must be different accounts',
  addTxErrCategoryRequired: 'Select a category',
  addTxErrCcPaymentSourceMustBeAsset: 'Pay from an asset account',
  addTxErrCcPaymentTargetMustBeCC: 'Pay to a credit card account',
  addTxErrTransferNoCc: 'Use Credit Pay for credit card moves',
  addTxErrRateRequired: 'Enter the exchange rate',
  addTxErrRateInvalid: 'Rate must be greater than 0',
  addTxInsufficientBalance: (name: string) => `Insufficient balance in ${name}`,
  addTxPickAccountTitle: 'Select Account',
  addTxPickFromTitle: 'From Account',
  addTxPickToTitle: 'To Account',
  addTxPickCategoryTitle: 'Select Category',

  // U5 Transaction List
  transactions: 'Transactions',
  searchTransactionsPlaceholder: 'Search transactions…',
  filterAll: 'All',
  filterExpense: 'Expense',
  filterIncome: 'Income',
  filterTransfer: 'Transfer',
  filterCcPayment: 'Credit Pay',
  transferTitle: 'Transfer',
  ccPaymentTitle: 'Credit Card Payment',
  unknownAccount: 'Unknown account',
  uncategorized: 'Uncategorized',
  noResultsHeadline: 'No transactions found',
  noResultsSubtext: 'Try a different search term or filter.',
  todayLabel: 'TODAY',
  yesterdayLabel: 'YESTERDAY',

  // U7 Transaction Detail
  detailHeader: 'Transaction',
  detailCategory: 'CATEGORY',
  detailAccount: 'ACCOUNT',
  detailDateTime: 'DATE & TIME',
  detailOriginalAmount: 'ORIGINAL AMOUNT',
  detailExchangeRate: 'EXCHANGE RATE',
  detailNote: 'NOTE',
  detailNoteEmpty: 'No note',
  capturedBadge: 'Captured',
  editTransaction: 'Edit Transaction',
  editTxTitle: 'Edit Transaction',
  deleteTransaction: 'Delete',
  deleteConfirmTitle: 'Delete this transaction?',
  deleteConfirmBody: 'The account balance will be restored. This cannot be undone.',
  deleteCancel: 'Cancel',
  detailNotFoundHeadline: 'Transaction not found',
  detailNotFoundCta: 'Back to transactions',
  errDeleteFailed: 'Could not delete transaction. Please try again.',
  typeBadgeExpense: 'Expense',
  typeBadgeIncome: 'Income',
  typeBadgeTransfer: 'Transfer',
  typeBadgeCcPayment: 'CC Payment',

  // U31 Advanced Filter Drawer
  filterTitle: 'Filters',
  filterReset: 'Reset',
  filterApply: 'Apply',
  filterApplyWithCount: (n: number) => `Apply (${n})`,

  filterSectionAccounts: 'Accounts',
  filterSectionCategories: 'Categories',
  filterSectionDate: 'Date',
  filterSectionAmount: 'Amount',

  filterAllAccounts: 'All accounts',
  filterAllCategories: 'All categories',

  datePresetToday: 'Today',
  datePresetThisWeek: 'This week',
  datePresetThisMonth: 'This month',
  datePresetLastMonth: 'Last month',
  datePresetLast30Days: 'Last 30 days',
  datePresetThisYear: 'This year',
  datePresetAllTime: 'All time',
  datePresetCustom: 'Custom...',
  filterCustomDateRangeTitle: 'Custom date range',
  filterCustomFromLabel: 'From',
  filterCustomToLabel: 'To',

  filterPickAccountsTitle: 'Select Accounts',
  filterPickCategoriesTitle: 'Select Categories',
  filterPickerDone: 'Done',

  filterAmountFromPlaceholder: 'Min',
  filterAmountToPlaceholder: 'Max',

  filterCategoryTypeExpense: 'Expense',
  filterCategoryTypeIncome: 'Income',

  // Commitments — C1 List
  commitmentsTitle: 'Commitments',
  commitmentsPaidSummary: 'Paid this month',
  commitmentsTotalCommitted: 'Total committed',
  commitmentsOverdue: 'Overdue',
  commitmentsDueToday: 'Due Today',
  commitmentsUpcoming: 'Upcoming',
  commitmentsPaid: 'Paid',
  commitmentsSkipped: 'Skipped',

  // Commitments — Empty state
  commitmentsEmptyTitle: 'No commitments yet',
  commitmentsEmptySub: 'Add rent, subscriptions, or any regular payment',
  commitmentsEmptyCta: 'Add Commitment',

  // Commitments — C2 Add / C3 Edit
  commitmentsAddTitle: 'New Commitment',
  commitmentsEditTitle: 'Edit Commitment',
  commitmentsFieldName: 'Name',
  commitmentsFieldAmountType: 'Amount Type',
  commitmentsFieldAmount: 'Amount',
  commitmentsFieldCurrency: 'Currency',
  commitmentsFieldCategory: 'Category',
  commitmentsFieldRecurrence: 'Recurrence',
  commitmentsFieldCustomRecurrence: 'Custom Recurrence',
  commitmentsFieldStartDate: 'Start Date',
  commitmentsFieldDefaultAccount: 'Default Account',
  commitmentsFieldDuration: 'Duration',
  commitmentsFieldNotes: 'Notes',
  commitmentsAmountFixed: 'Fixed',
  commitmentsAmountVariable: 'Variable',
  commitmentsRecurrenceMonthly: 'Monthly',
  commitmentsRecurrenceWeekly: 'Weekly',
  commitmentsRecurrenceAnnually: 'Annually',
  commitmentsRecurrenceCustom: 'Custom',
  commitmentsRecurrenceEvery: 'Every',
  commitmentsDurationForever: 'Forever',
  commitmentsDurationAfterCount: 'After N payments',
  commitmentsDurationUntilDate: 'Until date',
  commitmentsDurationStopAfter: 'Stop after',
  commitmentsDurationPayments: 'payments',
  commitmentsSave: 'Save Commitment',
  commitmentsOptional: '(optional)',
  commitmentsDone: 'Done',

  // Commitments — validation errors
  commitmentsErrNameRequired: 'Name is required',
  commitmentsErrNameMax: 'Name must be 50 characters or less',
  commitmentsErrAmountRequired: 'Amount is required for fixed commitments',
  commitmentsErrAmountPositive: 'Amount must be greater than zero',
  commitmentsErrCategoryRequired: 'Category is required',
  commitmentsErrStartDateRequired: 'Start date is required',
  commitmentsErrEndDateRequired: 'End date is required',
  commitmentsErrAfterCountRequired: 'Number of payments is required',
  commitmentsErrEveryMin: 'Must be at least 1',
  commitmentsErrEveryMax: 'Must be 365 or less',

  // Commitments — placeholders
  commitmentsNamePlaceholder: 'e.g. Rent',
  commitmentsAmountPlaceholder: '0.00',
  commitmentDateInputFormat: 'YYYY-MM-DD',
  commitmentsAfterCountPlaceholder: '0',
  commitmentsFieldEstimatedAmount: 'Estimated Amount',
  commitmentsEstimatedAmountPlaceholder: 'e.g. 500',

  // Commitments — C4 Detail
  commitmentsDetailRecurrence: 'Recurrence',
  commitmentsDetailStartDate: 'Start Date',
  commitmentsDetailDefaultAccount: 'Default Account',
  commitmentsDetailDuration: 'Duration',
  commitmentsDetailCurrency: 'Currency',
  commitmentsDetailNone: 'None',
  commitmentsDetailPaymentHistory: 'Payment History',
  commitmentsDetailCurrentCycle: 'Current Cycle',
  commitmentsDetailNotes: 'Notes',
  commitmentsDetailEdit: 'Edit',
  commitmentsMarkAsPaid: 'Mark as Paid',
  commitmentsSkip: 'Skip',
  commitmentsSkipConfirmTitle: 'Skip this payment?',
  commitmentsSkipConfirmBody:
    'This payment will be marked as skipped and excluded from your totals.',
  commitmentsSkipConfirmCancel: 'Cancel',
  commitmentsSkipConfirmConfirm: 'Skip Payment',

  // Commitments — C5 Pay Sheet
  commitmentsPayTitle: (name: string) => `Pay ${name}`,
  commitmentsPayAmount: 'Amount',
  commitmentsPayAccount: 'Pay from Account',
  commitmentsPayDate: 'Payment Date',
  // §8: pay sheet date field upgraded from free-text to a date picker (OQ-2).
  // commitmentsPayDate (the field label) already exists and is reused. This is
  // the placeholder shown on the picker trigger when no date is chosen yet —
  // reuses the existing long-date format produced by formatLongDate at runtime,
  // so this key is only the fallback empty-state hint.
  commitmentsPayDatePlaceholder: 'Select date',
  commitmentsPayNotes: 'Notes',
  commitmentsPayConfirm: 'Confirm Payment',
  commitmentsPayErrAmountRequired: 'Amount is required',
  commitmentsPayErrAccountRequired: 'Select an account',

  // Commitments — Deactivate
  commitmentsDeactivate: 'Deactivate Commitment',
  commitmentsDeactivateTitle: 'Deactivate this commitment?',
  commitmentsDeactivateBody:
    'It will be removed from your list. Past payment records are preserved.',
  commitmentsDeactivateCancel: 'Cancel',
  commitmentsDeactivateConfirm: 'Deactivate',

  // Commitments — status badges
  commitmentsStatusOverdue: 'Overdue',
  commitmentsStatusDue: 'Due',
  commitmentsStatusUpcoming: 'Upcoming',
  commitmentsStatusPaid: 'Paid',
  commitmentsStatusSkipped: 'Skipped',

  // Commitments — recurrence / duration labels
  commitmentsRecurrenceEveryN: (n: number, period: string) =>
    n === 1 ? `Every ${period}` : `Every ${n} ${period}s`,
  commitmentsRecurrencePeriodDay: 'day',
  commitmentsRecurrencePeriodWeek: 'week',
  commitmentsRecurrencePeriodMonth: 'month',
  commitmentsRecurrencePeriodYear: 'year',
  commitmentsRecurrenceUnitDays: 'Days',
  commitmentsRecurrenceUnitWeeks: 'Weeks',
  commitmentsRecurrenceUnitMonths: 'Months',
  commitmentsRecurrenceUnitYears: 'Years',
  commitmentsDurationAfterCountOf: (n: number) => `After ${n} payments`,
  commitmentsDurationUntilDateOf: (date: string) => `Until ${date}`,
  commitmentsDetailNotFound: 'Commitment not found',

  // Dashboard — commitments card
  dashboardCommitmentsTitle: 'Commitments',
  dashboardCommitmentsPaid: (paid: number, total: number) => `${paid} of ${total} paid`,
  dashboardCommitmentsOverdue: (count: number) => `${count} overdue`,

  // EmptyState component
  emptyAccountsHeadline: 'No accounts yet',
  emptyAccountsDescription: 'Add your first account to start tracking your money.',
  emptyTransactionsHeadline: 'No transactions yet',
  emptyTransactionsDescription: 'Your transactions will appear here once you start adding them.',
  emptyTransactionsCta: 'Add Transaction',
  emptyCommitmentsHeadline: 'No commitments yet',
  emptyCommitmentsDescription: 'Track bills, subscriptions, and recurring payments here.',
  emptyCommitmentsCta: 'Add Commitment',
  emptyFilteredHeadline: 'No results',
  emptyFilteredDescription: 'Try adjusting your filters.',
  emptyFilteredClearCta: 'Clear Filters',
  emptyCommitmentsMonthHeadline: 'Nothing this month',
  emptyCommitmentsMonthDescription:
    'No commitments scheduled for this month. Use the arrows above to browse other months.',

  // §4 Settings root — row descriptions
  settingsCurrencyDescription: 'Set your default currency and exchange rate',
  settingsCategoriesDescription: 'Manage your expense and income categories',
  settingsAboutDescription: 'App version and information',
  settingsCurrencyValue: (pair: string) => pair,

  // §4 About screen
  aboutTitle: 'About',
  aboutDataNotice: 'MoneyApp is local-only. All your financial data stays on your device.',
  aboutVersion: (version: string) => `Version ${version}`,
  aboutBuild: (build: string) => `Build ${build}`,

  // §4 Currency screen additions
  currencyFetchError: 'Could not update rate. Try again.',
  currencyFooterNote: 'All balances and analytics are shown in Egyptian Pound (EGP).',

  // §4 Category additions
  categoriesReassignSubtitle: (count: number) =>
    count === 1 ? '1 transaction will be moved' : `${count} transactions will be moved`,

  // §4 EmptyState — categories variant
  emptyStateCategoriesHeadline: 'No categories yet',
  emptyStateCategoriesDescription: 'Your categories will appear here.',

  // §6 Transactions — Month carousel
  carouselAllLabel: 'All',
  carouselCustomLabel: 'Custom',
  carouselCustomActiveLabel: (from: string, to: string) => `${from} → ${to}`,
  carouselMonthShort: (yearMonth: string) => {
    const [y, m] = yearMonth.split('-').map(Number);
    const labels = [
      'Jan',
      'Feb',
      'Mar',
      'Apr',
      'May',
      'Jun',
      'Jul',
      'Aug',
      'Sep',
      'Oct',
      'Nov',
      'Dec',
    ];
    return `${labels[m - 1]} ${y}`;
  },

  // §6 Transactions — Totals strip
  totalsIncome: 'Income',
  totalsExpense: 'Expense',
  totalsNet: 'Net',
  totalsVsPrev: (prevLabel: string) => `vs ${prevLabel}`,

  // §6 Transactions — Type badges
  typeBadgeCommitment: 'Commitment',
  typeBadgeGoal: 'Goal',
  typeBadgeBill: 'Bill',

  // §6 Transactions — Filter sheet additions
  filterSummaryAccountsEmpty: 'All accounts',
  filterSummaryCategoriesEmpty: 'All categories',
  filterSummaryAmountEmpty: 'Any amount',
  filterSummaryAmountUpTo: 'Up to',
  filterSummaryAmountFrom: 'From',
  filterAmountMinLabel: 'Min',
  filterAmountMaxLabel: 'Max',

  // §6 Transactions — Date range picker sheet (carousel Custom pill)
  dateRangePickerTitle: 'Custom range',
  dateRangePickerFromLabel: 'From',
  dateRangePickerToLabel: 'To',
  dateRangePickerConfirm: 'Apply',
  dateRangePickerCancel: 'Cancel',

  // §6 Transactions — Detail flow (TransferFlowCard labels)
  detailFlowFromLabel: 'From',
  detailFlowToLabel: 'To',
  detailFlowCategoryLabel: 'Category',
  detailFlowSourceLabel: 'Source',

  // §6 Transactions — Detail screen V2 actions + states
  detailDeleteButton: 'Delete',
  detailEditButton: 'Edit Transaction',
  detailNotFoundTitle: 'Transaction not found',
  detailNotFoundBody: 'This transaction may have been deleted.',

  // §7: Add / Edit Transaction
  addTxNoAccountsTitle: 'No Accounts Yet',
  addTxNoAccountsBody: 'Add an account first to record transactions.',
  addTxNoAccountsCta: 'Add Account',
  addTxRateSourceStored: 'Using stored rate',
  addTxRateSourceCustom: 'Custom rate',
  addTxRateLastUpdated: 'Last updated {date}',
  addTxRateReset: 'Reset to global',
  addTxRateStale: 'Rate may be stale',
  addTxEgpPreview: '≈ {amount} EGP',

  // Swipe actions — shared labels
  swipeEdit: 'Edit',
  swipeDelete: 'Delete',
  swipeSkip: 'Skip',

  // Budget — swipe delete confirm
  budgetDeleteConfirmTitle: 'Remove budget?',
  budgetDeleteConfirmBody: (name: string) =>
    `This stops tracking the limit for ${name}. Your transactions and spending history are kept.`,
  budgetDeleteConfirmConfirm: 'Remove',
  budgetDeleteConfirmCancel: 'Cancel',

  // Transactions — swipe/list delete confirm
  // Note: deleteConfirmTitle, deleteConfirmBody, deleteTransaction, deleteCancel already exist
  // for the detail screen. Reuse them for the list-delete ConfirmSheet (same copy, consistent).

  // Commitments — swipe delete confirm
  // Note: commitmentsDeactivateTitle, commitmentsDeactivateBody, commitmentsDeactivateConfirm,
  // commitmentsDeactivateCancel already exist. Reuse them — same action, same copy.
} as const;
