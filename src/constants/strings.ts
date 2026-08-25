export const Strings = {
  loading: 'Loading...',
  logoMarkA11y: 'MoneyApp logo',
  tabHome: 'Home',
  tabTransactions: 'Transactions',
  tabCommitments: 'Commitments',
  tabGoals: 'Goals',
  tabBudget: 'Budget',

  startupErrorTitle: 'MoneyApp could not start',
  startupErrorDescription: 'Your data is still safe. Check the app again to finish loading it.',
  startupErrorRetry: 'Retry',
  renderErrorTitle: 'Something went wrong',
  renderErrorDescription:
    'This screen ran into a problem. Your data is safe — try loading it again.',
  renderErrorRetry: 'Try again',
  categoriesLoadError: 'Could not load categories.',
  categoriesRefreshError: 'Could not refresh categories.',
  categoriesLoadRetry: 'Retry',
  currencySaveError: 'Could not save rate. Try again.',

  // Add Account
  o4SectionName: 'ACCOUNT NAME',
  // CurrencySelector's a11y label inside AccountForm (both Settings' and
  // onboarding N2's hosts) — not base-currency copy, filed here with the
  // rest of the account form's strings instead.
  accountCurrencyA11y: 'Account currency',

  // Account form — MA-009, mockup § C (C1-C6). Shared by both entry points —
  // Settings' Add Account screen renders every one of these too.
  accountTypeLabel: 'Account type',
  accountNameLabel: 'Account name',
  accountNameHelper: 'Must be different from your other account names.',
  accountNamePlaceholder: 'e.g. CIB Current',
  accountBalanceLabel: 'Opening balance',
  accountBalanceHelper: "Today's balance.",
  accountBalancePlaceholder: '0.00',
  // The currency cell's visible field label (mockup C1 draws "Currency"
  // repeatedly — mockup.html:1362,1422,1480,1531,1587,1674). Distinct from
  // accountCurrencyA11y above, which stays the selector's own a11y label
  // (impl review round 1, D7 — that key was double-booked as both).
  accountCurrencyLabel: 'Currency',
  accountOwedLabel: 'Amount currently owed',
  accountOwedHelper: 'Enter 0 if the card is paid off.',
  accountColorLabel: 'Account colour',
  accountColorHelper: "Used for this account's dot everywhere in the app.",
  accountSlotHint:
    'Pick Credit Card above and four more fields open here — limit, minimum payment, due day, interest.',
  accountSlotTitle: 'Card details',
  accountSlotChip: '4 fields',
  accountCreditLimitLabel: 'Credit limit',
  accountCreditLimitHelper: 'Required.',
  accountMinPaymentLabel: 'Minimum payment',
  accountMinPaymentHelper: "Can't exceed what you owe.",
  accountDueDayLabel: 'Due day',
  accountDueDayHelper: 'Day of the month.',
  accountDueDayPlaceholder: '1–31',
  accountInterestLabel: 'Track interest',
  accountInterestHelper: 'Adds an APR field so MoneyApp can estimate interest.',
  accountAprLabel: 'APR',
  accountAprHelper: 'Yearly rate on your card.',
  accountAprPlaceholder: 'e.g. 24.5',
  fieldOptionalTag: 'optional',
  errCreditLimitPositive: 'Enter a limit greater than zero.',
  errMinPaymentExceedsOwed: 'More than you owe.',
  errDueDayRange: 'Enter a day from 1 to 31.',
  errAmountInvalid: 'Numbers only.',
  errNameDuplicateNamed: (name: string) => `You already have an account called "${name}".`,
  // N2's CTA — spec.md:81, mockup C1-C6. Settings keeps its own u4Cta
  // ('Save Account'); "and continue" means nothing there.
  n2Cta: 'Save and continue',

  // N1 Welcome — Broadsheet composition, mockup § B (B1-B5). Every value
  // transcribed verbatim from mockup.html; the line number is the source.
  n1GhostNumeral: '01', // mockup.html:1035
  n1Eyebrow: 'Private by design', // mockup.html:1037
  n1HeadlineLine1: 'Your money.', // mockup.html:1039
  n1HeadlineLine2: 'Finally clear.', // mockup.html:1041
  n1Body:
    "Everything you enter stays on this phone. No sign-in, no bank connection, nothing uploaded — so setup is three short steps and then you're in.", // mockup.html:1048-1049
  n1CurrencyQuestion: 'Which currency do you think in?', // mockup.html:1054
  n1CurrencyEgpLabel: 'Egyptian Pound', // mockup.html:1058
  n1CurrencyEgpConsequence: 'Every total in the app is shown in EGP.', // mockup.html:1059
  n1CurrencyUsdLabel: 'US Dollar', // mockup.html:1066
  n1CurrencyUsdConsequence: 'Totals convert to USD using the rate you save.', // mockup.html:1067
  n1CurrencyEgpSymbol: 'E£', // mockup.html:1056
  n1Trust: 'Your data never leaves this device. There is no cloud account to create.', // mockup.html:1075
  n1Cta: 'Continue', // mockup.html:1080

  // N3 Add more accounts — Broadsheet composition, mockup § E (E1-E5). Every
  // value transcribed verbatim from mockup.html; the line number is the source.
  n3GhostNumeral: '03', // mockup.html:2010
  n3SuccessChip: 'First account saved', // mockup.html:2012
  // Two keys, not one carrying a '\n' (spec §5.6, amended after c1's review):
  // a baked break cannot reflow at large font scale or on a narrow device.
  // MA-010 ships the same Broadsheet headline as a matched pair, composed in
  // welcome_headline.tsx.
  n3HeadlineLine1: 'Anything else', // mockup.html:2014
  n3HeadlineLine2: 'to add?', // mockup.html:2014
  n3Body:
    'Cash in your wallet, a second bank, a credit card. Or skip — one account is enough to start.', // mockup.html:2015
  n3ListLabel: 'Your accounts', // mockup.html:2019
  n3AddAnother: 'Add another account', // mockup.html:2038
  n3Cta: 'Review setup', // mockup.html:2043
  n3EmptyTitle: 'No accounts yet', // mockup.html:2096
  n3EmptyBody:
    'Something interrupted setup before your first account was saved. Nothing was lost — start it again.', // mockup.html:2097
  n3EmptyFootnote: 'Your currency choice was saved.', // mockup.html:2101
  n3EmptyCta: 'Add your first account', // mockup.html:2102

  // N4 Ready — mockup § F (F1-F9). Every value transcribed byte-exact from the
  // cited mockup line, ASCII apostrophes included. Five declared deviations
  // from the drawn strings are marked DEVIATION below.
  n4Eyebrow: 'Setup complete', // mockup.html:2326
  n4Headline: "You're ready.", // mockup.html:2328
  n4Body:
    "Here's where you're starting from. Every number below comes from the opening balances you just entered.", // mockup.html:2329
  n4HeroLabel: 'Starting net position', // mockup.html:2333
  n4RateNeededValue: 'Exchange rate needed', // mockup.html:2429
  n4CaptionRateNeeded: 'Your accounts are saved. Add a rate from the dashboard and this fills in.', // mockup.html:2430
  n4CaptionNegative: 'Your card balances are bigger than your cash and bank accounts right now.', // mockup.html:2477
  n4CaptionZero: 'What you have and what you owe cancel out exactly.', // mockup.html:2524
  n4CaptionSingle:
    'All of it in one account. You can add more from the dashboard whenever you like.', // mockup.html:2571
  n4RowBaseCurrency: 'Base currency', // mockup.html:2344
  n4RowAccounts: 'Accounts', // mockup.html:2348
  n4RowPrivacy: 'Privacy', // mockup.html:2352
  n4RowPrivacyValue: 'On device', // mockup.html:2353
  // DEVIATION 4 (reversed by the user, 2026-08-18): the mockup draws lower-case
  // `Open my dashboard` (mockup.html:2359) and the plan proposed adopting it.
  // The user ruled the shipped title case stays — this key is byte-identical to
  // the `o6Cta` it replaces, so the KEY renames and the COPY does not move.
  // `n4CompleteError` (N-shell block) still says "tap Open my dashboard"; it is
  // left exactly as shipped (deviation 5), so the casing differs by one letter.
  n4Cta: 'Open My Dashboard',

  // DEVIATION 1: parameterises the currency code rather than hard-coding EGP.
  // The mockup draws the EGP-base case only, but a USD-base user whose accounts
  // are all USD lands on F1 too, and "in EGP" would be false. Byte-identical to
  // mockup.html:2335 when `code === 'EGP'`.
  n4CaptionAllBase: (n: number, code: string) =>
    `All ${n} accounts are in ${code}, so nothing needed converting.`,
  // DEVIATION 2: parameterises the foreign code, and pluralises `account` — a
  // pluralisation point the spec does not name, switching on foreignCount, not
  // accountCount. Without it two foreign accounts read "Includes 2 USD
  // account", the exact "1 accounts" tell this ticket exists to remove.
  n4CaptionConverted: (n: number, code: string) =>
    `Includes ${n} ${code} account${n === 1 ? '' : 's'}, converted using your saved rate.`, // mockup.html:2382
  // DEVIATION 6: pluralises the credit-card-only caption. The mockup draws the
  // one-card sentence only (mockup.html:2618), but `resolveFrame` returns F7
  // for ANY all-credit-card set and N3 caps nothing — two cards otherwise read
  // "Your only account is a credit card" above a "2 accounts" pill. Gating F7
  // on a single card is not the fix: two cards would fall to F4, whose caption
  // names cash and bank accounts that do not exist. The singular is byte-
  // identical to mockup.html:2618.
  n4CaptionCreditOnly: (n: number) =>
    n === 1
      ? 'Your only account is a credit card, so this is what you owe. Add a bank or cash account for the full picture.'
      : 'Your accounts are all credit cards, so this is what you owe. Add a bank or cash account for the full picture.',
  n4PillAccounts: (n: number) => (n === 1 ? '1 account' : `${n} accounts`), // mockup.html:2337 / :2573
  n4PillOpeningBal: (n: number) => (n === 1 ? 'opening balance' : 'opening balances'), // mockup.html:2338 / :2574
  // DEVIATION 3: pluralises the verb (`2 need a rate`), also on foreignCount.
  n4PillNeedsRate: (n: number) => (n === 1 ? '1 needs a rate' : `${n} need a rate`), // mockup.html:2433

  // N-shell — MA-004. Mockup § A (A1-A3) and the per-route frames B1/C1/E1/F1.
  onboardingStepOf: (step: number) => `Step ${step} of 4`,
  onboardingProgressA11y: (step: number, name: string) => `Step ${step} of 4, ${name}`,
  n1StepName: 'Choose your currency',
  n2StepName: 'Add your first account',
  n3StepName: 'Add more accounts',
  n4StepName: 'Review and finish',
  n1HeaderWordmark: 'MoneyApp',
  n1HeaderSetup: 'Setup',
  n2HeaderTitle: 'Add your first account', // mockup.html:1334
  n3HeaderTitle: 'Your accounts', // mockup.html:2004
  n4HeaderTitle: 'Ready to start', // mockup.html:2319
  n1Footnote: 'You can change this later in Settings.',
  n2Footnote: 'Saved on this phone. Nothing is uploaded.',
  n3Footnote: 'One account is enough to start. You can add more any time.',
  n4Footnote: 'This is your starting point, not your net worth.',
  n1CtaBusy: 'Saving…',
  n2CtaBusy: 'Saving…',
  n3CtaBusy: 'Opening…',
  n4CtaBusy: 'Opening…',
  n1StepSaveError:
    "Couldn't save your choice. Check you have free storage, then tap Continue again.",
  n2SaveError: "Couldn't save that. Tap Save and continue to try again.",
  n3StepSaveError: "Couldn't move on. Your accounts are saved — tap Review setup to try again.",
  n4CompleteError:
    "Couldn't finish setup. Your accounts are saved — tap Open my dashboard to try again.",
  // Not one of the plan's six named keys — needed for the four back-chevron
  // writes (N2/N3 → N1, N4 → N3), which the plan specifies functionally
  // (Decision 4) but does not give copy for. Reused across all of them
  // rather than one key per screen, since the failure mode is identical.
  onboardingBackSaveError: "Couldn't go back. Tap the back arrow to try again.",

  // O4 validation errors
  errNameRequired: 'Account name is required',
  errNameTooLong: 'Name must be 30 characters or less',
  errNameDuplicate: 'This name is already used',
  errBalanceInvalid: 'Please enter a valid amount',
  errCreditLimitRequired: 'Credit limit is required for credit cards',
  errAprRequired: "Please enter your card's APR",
  // APR bound — ruled, spec.md § "Financial Logic — APR bound — ruled".
  // Same voice as errDueDayRange/errCreditLimitPositive: short, imperative,
  // states the accepted range, no exclamation, trailing period.
  errAprRange: 'Enter a rate from 0 to 100.',
  errAccountSaveFailed: "Couldn't save that account. Tap Save Account to try again.",

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

  // Account colour families — the 32-swatch palette. Names are locked design
  // (assets/locked-design-2026-07-23.md), not new copy.
  accountColorMidnight: 'Royal Midnight',
  accountColorGold: 'Cairo Gold',
  accountColorNile: 'Nile Teal',
  accountColorPaprika: 'Paprika',
  accountColorPlum: 'Plum',
  accountColorLapis: 'Lapis Blue',
  accountColorRose: 'Rose',
  accountColorSand: 'Sand',
  accountColorAmethyst: 'Amethyst',
  accountColorEmerald: 'Emerald',
  accountColorSaffron: 'Saffron',
  accountColorSteel: 'Steel Blue',
  accountColorJade: 'Jade',
  accountColorIndigo: 'Indigo',
  accountColorCoral: 'Coral',
  accountColorGraphite: 'Graphite',

  // Account colour sheet — MA-006, mockup § D (D1, D2) and C1's trigger row
  accountColorSheetTitle: 'Account colour',
  accountColorSheetCta: 'Use this colour',
  accountColorToneRich: 'Rich',
  accountColorToneSoft: 'Soft',
  accountColorToneRichHint: 'for cards and tiles',
  accountColorToneSoftHint: 'same 16 families, lighter',
  accountColorToneRichCaption: 'Rich · deeper tone, used on cards and tiles',
  accountColorToneSoftCaption: 'Soft · lighter tone, used for list dots and chips',
  accountColorCustom: 'Custom colour',
  accountColorSwatchA11y: (family: string, tone: string) => `${family}, ${tone.toLowerCase()}`,
  accountColorTriggerA11y: (family: string, tone: string) =>
    `Account colour: ${family}, ${tone.toLowerCase()}`,

  // Ready — the rest of this block retired with MA-012's N4 rebuild, which
  // owns its copy under `n4*`. `o6AccountsUnit` is NOT N4's: the dashboard
  // hero card renders "{n} accounts" through it, so it stays here rather than
  // going with the block it was grouped into.
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
  dashboardLoadError: 'Could not load dashboard.',
  dashboardRefreshError: 'Could not refresh dashboard.',
  dashboardLoadRetry: 'Retry',
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

  // The dashboard's rate refusal (#255). Modelled on N4's pair
  // (`n4RateNeededValue` / `n4CaptionRateNeeded`) so the two refusals read as
  // one app; only the remedy differs, because the user is already past
  // onboarding and the rate is set in Settings -> Currency from here.
  dashboardRateNeededValue: 'Exchange rate needed',
  dashboardRateNeededCaption: 'Your balances are saved. Set a rate in Settings and this fills in.',

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
  accountBalanceReviewTitle: 'Review this card balance',
  accountBalanceReviewBody:
    'Older transactions may have affected this balance. Check it against your card statement.',
  accountBalanceReviewAdjust: 'Adjust balance',
  accountBalanceReviewConfirm: 'Balance is correct',
  accountBalanceReviewError: 'Could not confirm this balance. Please try again.',

  // §9 Account Detail — balance hero captions
  accountHeroOpening: (amount: string, currency: string) => `Opening ${amount} ${currency}`,
  accountHeroAdjusted: 'adjusted',
  accountHeroAvailable: (avail: string, currency: string, limit: string) =>
    `Available ${avail} ${currency} of ${limit}`,

  // Add Account screen (U4 — main app)
  u4Title: 'Add Account',
  u4Cta: 'Save Account',
  u4CtaBusy: 'Saving…',

  // Adjust Balance sheet
  adjustBalanceTitle: 'Adjust Balance',
  adjustBalanceLabel: 'New Balance',
  adjustBalanceSave: 'Save Balance',
  adjustBalanceCancel: 'Cancel',
  // Distinct from errBalanceInvalid on purpose: that one asks the user to fix
  // what they typed, this one asks them to try the same value again. Voice
  // follows its neighbours accountBalanceReviewError and commitmentsPayError.
  adjustBalanceSaveError: 'Could not save this balance. Please try again.',

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
  goalsTitle: 'Goals',
  // Budget
  emptyBudgetTitle: 'No budgets yet',
  emptyBudgetSub: 'Set a monthly limit on a category to start tracking your spending.',
  emptyBudgetCta: 'Set up your budget',
  budgetTitle: 'Budget',
  budgetLoadError: 'Could not load your budget.',
  budgetLoadRetry: 'Try again',
  budgetAddCategory: 'Add budget',
  budgetSummaryBudgeted: 'Budgeted',
  budgetSummarySpent: 'Spent',
  budgetSummaryLeft: 'Left',
  budgetUsedSuffix: 'used',
  budgetDaysLeftSuffix: 'days left',
  budgetCountLabel: (count: number) => `${count} ${count === 1 ? 'budget' : 'budgets'}`,
  budgetCategoryCountLabel: (count: number) => (count === 1 ? '1 category' : `${count} categories`),
  budgetCategoriesSummaryEyebrow: (count: number, month: string) =>
    `${count} ${count === 1 ? 'category budget' : 'category budgets'} in ${month}`,
  budgetSummarySpentOfConnector: 'spent of',
  budgetCategoriesSummarySpentOf: (spent: string, planned: string) =>
    `${spent} spent of ${planned}`,
  budgetCategoriesSummaryUsed: (percentage: number) => `${percentage}% used`,
  budgetCategoriesSummaryPlanned: 'Planned',
  budgetCategoriesSummaryUnassignedIncome: 'Unassigned income',
  budgetCategoriesSummaryUnbudgetedSpend: 'Unbudgeted spend',
  budgetCategoriesSetIncome: 'Set income',
  budgetCategoriesNoBudgetSet: 'No budget set',
  budgetCategoriesLifecyclePlanned: 'Planned',
  budgetCategoriesLifecycleComplete: 'Complete',
  budgetCategoriesDaysLeft: (days: number) => `${days} ${days === 1 ? 'day' : 'days'} left`,
  budgetCategoriesStatusOnTrack: 'On track',
  budgetCategoriesStatusWatch: 'Watch',
  budgetCategoriesStatusOver: 'Over',
  budgetCategoriesStatusCount: (count: number, status: string) => `${count} ${status}`,
  budgetCategoriesSpentPlannedUsed: (spent: string, planned: string, percentage: number) =>
    `${spent} / ${planned} spent · ${percentage}% used`,
  budgetCategoriesShare: (percentage: number) => `${percentage}% of category`,
  budgetCategoriesSpentPlanned: (spent: string, planned: string) => `${spent} / ${planned} spent`,
  budgetCategoriesBalanceMeta: (status: string) => `EGP ${status}`,
  budgetCategoriesUnassignedSpending: 'Unassigned spending',
  budgetCategoriesUnassignedExplanation: 'Not linked to a named budget',
  budgetCategoriesUnassignedAmount: (amount: string) => `${amount} EGP`,
  budgetViewCategoryDetails: (name: string) => `${name} details`,
  budgetViewCategoryDetailsA11y: (name: string) => `View ${name} details`,
  budgetCategoriesBudgetA11y: (
    name: string,
    spent: string,
    planned: string,
    percentage: number,
    balance: string,
    balanceStatus: string,
  ) =>
    `${name}, ${spent} of ${planned} spent, ${percentage}% used, ${balance} EGP ${balanceStatus}`,
  budgetCategoriesBudgetMenuA11y: (name: string) => `Actions for ${name}`,
  budgetCategoriesCategoryA11y: (
    name: string,
    spent: string,
    planned: string,
    percentage: number,
    balance: string,
    balanceStatus: string,
    status: string,
  ) =>
    `${name}, ${spent} of ${planned} spent, ${percentage}% used, ${balance} EGP ${balanceStatus}, ${status}`,
  transactionBudgetAssignmentMismatch:
    'The selected budget does not match this transaction category and month.',
  addTxBudgetLabel: 'Budget',
  addTxPickBudgetTitle: 'Choose a budget',
  addTxBudgetNone: 'No named budget',
  addTxErrBudgetRequired: 'Choose a budget for this expense',
  addTxBudgetLoading: 'Loading matching budgets…',
  addTxBudgetLookupError: 'Could not load matching budgets. Try again.',
  addTxBudgetRetryA11y: 'Retry matching budget lookup',
  addTxBudgetEmptyTitle: 'No matching budgets',
  addTxBudgetEmptyBody: 'This category has no named budget for the selected month.',
  addTxDatePickerTitle: 'Choose transaction date',
  addTxDatePickerCancel: 'Cancel',
  addTxDatePickerDone: 'Done',
  transactionSaveError: 'Could not save this transaction. Please try again.',
  viewCommitment: 'View commitment',
  budgetOverPill: 'Over',
  budgetSetTitle: 'Set budget',
  budgetEditTitle: 'Edit budget',
  budgetNameLabel: 'Budget name',
  budgetNamePlaceholder: 'e.g. Monthly food',
  budgetMonthlyLimitLabel: 'Monthly limit',
  budgetSaveCta: 'Save budget',
  budgetSaveError: 'Could not save budget. Please try again.',
  budgetRemoveCta: 'Remove budget',
  budgetNameRequired: 'Enter a budget name',
  budgetAmountRequired: 'Enter a monthly limit',
  budgetAmountInvalid: 'Amount must be at least 0.01',
  budgetPickCategory: 'Choose a category',
  budgetDetailNet: 'Net',
  budgetDetailAvg: 'Avg / mo',
  budgetDetailUnder: 'under limit',
  budgetDetailMonthlyResult: 'Monthly result',
  budgetDetailCategories: 'Categories',
  budgetDetailInProgress: '* in progress',
  budgetDetailPlanned: 'Planned',
  budgetDetailCompleted: 'Complete',
  budgetToolCopy: 'Copy',
  budgetToolCategory: 'Budget',
  budgetToolPlan: 'Plan',
  budgetToolCopyA11y: 'Copy budget',
  budgetToolPlanComingSoonA11y: 'Temporary budget plans coming in Phase 2',
  budgetPlansTab: 'Plans',
  budgetPlansBody: 'Plan travel, a week, or another short period in a future phase.',
  budgetPlanSetTitle: 'Create plan',
  budgetPlanEditTitle: 'Edit plan',
  budgetPlanNameLabel: 'Plan name',
  budgetPlanNamePlaceholder: 'e.g. Alexandria weekend',
  budgetPlanAmountLabel: 'Plan total',
  budgetPlanStartDate: 'Start date',
  budgetPlanEndDate: 'End date',
  budgetPlanCategories: 'Categories',
  budgetPlanPickCategories: 'Pick categories',
  budgetPlanMoreCategoriesCount: (count: number) => `+${count}`,
  budgetPlanAllocateByCategory: 'Allocate by category',
  budgetPlanAllocationHelper: (allocated: string, total: string, buffer: string) =>
    `${allocated} of ${total} allocated · ${buffer} buffer`,
  budgetPlanAllocationOver: 'Allocations exceed the plan total.',
  // Two messages for one rule, deliberately. budgetPlanAllocationInvalid is the
  // sheet footer's, raised by spendingPlanInputSchema's refine, which has no row
  // context and needs the whole sentence. budgetPlanAllocationBelowMin is the
  // per-row one, and the row is a 128px column: the full sentence truncated to
  // 'Each allocati…', which says nothing the red border did not. Both legal
  // repairs stay named -- a deliberate 0 is a valid allocation ('tracking this
  // category, allocating nothing'), so 'Min 0.01' alone would read complete and
  // be wrong. No trailing period, matching budgetAmountInvalid above.
  budgetPlanAllocationInvalid: 'Each allocation must be 0 or at least 0.01.',
  budgetPlanAllocationBelowMin: '0 or min 0.01',
  budgetPlanExpenseCategoriesOnly: 'Select expense categories only.',
  budgetPlanOverlapError: (categoryName: string, planName: string) =>
    `${categoryName} overlaps ${planName}`,
  budgetPlanSave: 'Save plan',
  budgetPlanNameRequired: 'Enter a plan name',
  budgetPlanAmountRequired: 'Enter a plan amount',
  budgetPlanAmountInvalid: 'Amount must be at least 0.01',
  budgetPlanDateInvalid: 'End date must be on or after start date',
  budgetPlanCategoryRequired: 'Select at least one category',
  budgetPlanSaveError: 'Could not save plan. Try again.',
  budgetPlanDuplicateCategory: 'Select each category once.',
  zeroAmountPlaceholder: '0.00',
  budgetPlanDeleteConfirmTitle: 'Remove plan?',
  budgetPlanDeleteConfirmBody: (name: string) =>
    `Remove ${name}? This deletes the temporary budget and its category allocations.`,
  budgetPlanDeleteConfirmConfirm: 'Remove',
  budgetPlanDeleteConfirmCancel: 'Cancel',
  budgetPlanDeleteError: 'Could not remove this plan. Please try again.',
  budgetPlansEmptyTitle: 'No spending plans',
  budgetPlansEmptyBody: 'Create a short-term plan for travel, a week, or another temporary period.',
  budgetPlansCreateAction: 'Create plan',
  budgetPlansSummaryPlanned: 'Planned',
  budgetPlansSummarySpent: 'Spent',
  budgetPlansSummaryLeft: 'Left',
  budgetPlansSummaryEyebrow: (count: number, month: string) =>
    `${count} ${count === 1 ? 'plan' : 'plans'} in ${month}`,
  budgetPlansSummaryAttentionCount: (count: number) => `${count} needs attention`,
  budgetPlansSummarySpentOf: () => 'spent of',
  budgetPlansSummaryUsed: (percentage: number) => `${percentage}% used`,
  budgetPlansSummaryLifecycleLabel: 'Lifecycle',
  budgetPlansSummaryUpcomingLabel: 'Upcoming',
  budgetPlansSummaryActiveCount: (count: number) => `${count} active`,
  budgetPlansSummaryUpcomingPlansCount: (count: number) =>
    `${count} ${count === 1 ? 'plan' : 'plans'}`,
  budgetPlansSummaryUpcomingCount: (count: number) => `${count} upcoming`,
  budgetPlansSummaryItemized: (amount: string, percentage: number) => `${amount} · ${percentage}%`,
  budgetPlansSummaryItemizedLabel: 'Itemized',
  budgetPlansSummaryOnTrackCount: (count: number) => `${count} on track`,
  budgetPlansSummaryWatchCount: (count: number) => `${count} watch`,
  budgetPlansSummaryOverCount: (count: number) => `${count} over`,
  budgetPlansStatusUpcoming: 'Upcoming',
  budgetPlansStatusOnTrack: 'On track',
  budgetPlansStatusWatch: 'Watch',
  budgetPlansStatusOver: 'Over',
  budgetPlansLeftStatus: 'left',
  budgetPlansOverStatus: 'over',
  budgetPlansRemoveA11y: 'Remove plan',
  budgetPlansOpenDetailsA11y: (name: string) => `Open ${name} details`,
  budgetPlansDateRange: (start: string, end: string) => `${start} - ${end}`,
  budgetPlansDateWithLifecycle: (range: string, lifecycle: string) => `${range} · ${lifecycle}`,
  budgetPlansEndsToday: 'ends today',
  budgetPlansDaysLeft: (days: number) => `${days} ${days === 1 ? 'day' : 'days'} left`,
  budgetPlansStartsTomorrow: 'starts tomorrow',
  budgetPlansStartsInDays: (days: number) => `starts in ${days} days`,
  budgetPlansEndedYesterday: 'ended yesterday',
  budgetPlansEndedDaysAgo: (days: number) => `ended ${days} days ago`,
  budgetPlansCardBalanceMeta: (currency: string, status: string) => `${currency} ${status}`,
  budgetPlansCardBalanceA11y: (amount: string, meta: string) => `${amount} ${meta}`,
  budgetPlansCardSpentOf: (spent: string, total: string) => `${spent} / ${total} spent`,
  budgetPlansPaceAhead: (points: number) => `${points} pts ahead of pace`,
  budgetPlansPaceUnder: (points: number) => `${points} pts under pace`,
  budgetPlansPaceEven: 'On pace',
  budgetPlansFinishedLeft: (amount: string) => `${amount} left at finish`,
  budgetPlansFinishedOver: (amount: string) => `${amount} over at finish`,
  budgetPlansCardAllocationFooter: (assigned: string, flexible: string) =>
    `${assigned} assigned · ${flexible} flexible`,
  budgetPlansDetailBudgetUsed: 'Budget used',
  budgetPlansDetailTimeElapsed: 'Time elapsed',
  budgetPlansDetailAssigned: 'Assigned',
  budgetPlansDetailFlexible: 'Flexible',
  budgetPlansDetailTitle: 'Plan details',
  budgetPlansDetailNotFound: 'This spending plan is no longer available.',
  budgetPlansDetailLoadError: 'Could not load this spending plan.',
  budgetPlansDetailRetry: 'Try again',
  budgetPlansDetailBack: 'Back to plans',
  budgetPlansDetailCategories: 'Category limits',
  budgetPlansDetailTotalSpent: (amount: string) => `${amount} spent`,
  budgetPlansDetailUnassigned: 'Unassigned plan budget',
  budgetPlansDetailNoCategoryLimit: 'Included · no category limit',
  budgetPlansDetailSpent: (amount: string) => `${amount} spent`,
  budgetPlansDetailBalance: (amount: string, status: string) => `${amount} ${status}`,
  budgetPlansDetailCategoryStatus: (percentage: number, status: string) =>
    `${percentage}% used · ${status.toLocaleLowerCase()}`,
  budgetPlansDetailCategoryPressure: (category: string, percentage: number) =>
    `${category} has used ${percentage}% of its limit`,
  budgetPlansDetailCategoryOver: (category: string, amount: string) =>
    `${category} is ${amount} over its limit`,
  budgetPlansDetailCategoryA11y: (
    category: string,
    spent: string,
    allocated: string,
    percentage: number,
    balance: string,
    status: string,
  ) => `${category}, ${spent} of ${allocated}, ${percentage}% used, ${balance}, ${status}`,
  budgetPlansDetailUnallocatedA11y: (category: string, spent: string) =>
    `${category}, ${spent} spent, included with no category limit`,
  budgetPlansAllocationChipA11y: (
    category: string,
    spent: string,
    allocated: string,
    percentage: number,
  ) => `${category}, ${spent} of ${allocated}, ${percentage}% used`,
  budgetPlansCategoryChipA11y: (category: string, spent: string) => `${category}, ${spent} spent`,
  budgetPlansMoreCategoriesA11y: (count: number) =>
    `${count} more ${count === 1 ? 'category' : 'categories'}`,
  budgetPlansCategoriesCount: (count: number) =>
    count === 1 ? '1 category' : `${count} categories`,
  budgetPlansAllocationBuffer: (amount: string) => `${amount} buffer`,
  currencyEgp: 'EGP',
  budgetCopyTitle: 'Copy budget',
  budgetCopyRoute: (source: string, target: string) => `${source} → ${target}`,
  budgetCopySourceLabel: 'Copy from',
  budgetCopyPreviousSourceA11y: 'Previous source month',
  budgetCopyNextSourceA11y: 'Next source month',
  budgetCopySelectAll: 'Select all',
  budgetCopyClear: 'Clear',
  budgetCopyCancel: 'Cancel',
  budgetCopyApply: 'Apply',
  budgetCopyPreviewError: 'Could not load this copy preview.',
  budgetCopyRetry: 'Try again',
  budgetCopyError: 'Could not copy these budgets. Nothing was changed.',
  budgetCopyEmptyTitle: 'Nothing to copy',
  budgetCopyEmptyBody: 'Selected source month has no category budgets.',
  budgetCopyStatusNew: 'New',
  budgetCopyStatusWillReplace: 'Will replace',
  budgetCopyToggleA11y: (name: string) => `Toggle ${name}`,
  loadingBudgetA11y: 'Loading budget',

  // Budget — 50/30/20 lens
  budget5030TabCategories: 'Categories',
  budget5030TabLens: '50/30/20',
  budget5030MonthlyIncome: 'Monthly income',
  budget5030EditIncome: 'Edit',
  budget5030SetIncomeCta: 'Set your monthly income',
  budget5030SetIncomeCtaBody:
    'Add your expected monthly income to see how your budget aligns with the 50/30/20 rule.',
  budget5030NeedLabel: 'Needs',
  budget5030WantLabel: 'Wants',
  budget5030SavingsLabel: 'Savings',
  budget5030NeedPct: '50%',
  budget5030WantPct: '30%',
  budget5030SavingsPct: '20%',
  budget5030StatusOnTrack: 'On track',
  budget5030StatusOver: 'Over',
  budget5030StatusAhead: 'Ahead',
  budget5030StatusBehind: 'Behind',
  budget5030Unallocated: 'Unallocated',
  budget5030OverAllocated: 'Over-allocated by',
  budget5030Ungrouped: 'Ungrouped',
  budget5030SavingsCaption:
    "Savings moved as transfers won't show as spend — the allocation still reflects your plan.",
  budget5030AllocatedLabel: 'Allocated',
  budget5030TargetLabel: 'Target',
  budget5030GroupPickerLabel: 'BUDGET GROUP',
  budget5030GroupNeed: 'Need',
  budget5030GroupWant: 'Want',
  budget5030GroupSavings: 'Savings',
  budget5030SummaryEyebrow: (month: string) => `50/30/20 plan · ${month}`,
  budget5030DaysLeft: (days: number) => (days === 1 ? '1 day left' : `${days} days left`),
  budget5030LifecyclePlanned: 'Planned',
  budget5030LifecycleComplete: 'Complete',
  budget5030LeftToPlan: 'EGP left to plan',
  budget5030OverIncome: 'EGP over planned income',
  budget5030SetPlanningIncome: 'Set monthly planning income',
  budget5030PlannedOfIncome: (planned: string, income: string) =>
    `${planned} planned of ${income} income`,
  budget5030IncomeNeeded: 'Income is needed to calculate rule targets',
  budget5030NoBudgets: (month: string) => `No category budgets planned for ${month}`,
  budget5030PlannedPercentage: (percentage: number) => `${percentage}% planned`,
  budget5030PlannedOfConnector: 'planned of',
  budget5030PlannedConnector: 'planned',
  budget5030NotReady: 'Not ready',
  budget5030IncomeMetric: 'Income',
  budget5030PlannedMetric: 'Planned',
  budget5030NotGroupedMetric: 'Not grouped',
  budget5030EditIncomeA11y: 'Edit monthly planning income',
  budget5030BreakdownTitle: 'Rule breakdown',
  budget5030BreakdownSubtitle: 'Plan + recorded result',
  budget5030StatusIncomeNeeded: 'Income needed',
  budget5030SummaryIncomeNeeded: (group: string) => `${group} needs income`,
  budget5030SummaryNoPlan: (group: string) => `${group} no plan`,
  budget5030StatusNoPlan: 'No plan yet',
  budget5030StatusWithinCap: 'Within cap',
  budget5030StatusOverCap: 'Over cap',
  budget5030StatusTargetMet: 'Target met',
  budget5030StatusBelowTarget: 'Below target',
  budget5030BucketSummary: (planned: string, target: string, actual: string) =>
    `${planned} planned of ${target} · ${actual}`,
  budget5030Spent: (amount: string) => `${amount} spent`,
  budget5030ActualNotTracked: 'Actual not tracked',
  budget5030Unavailable: '—',
  budget5030BucketA11y: (group: string, status: string, details: string, variance: string) =>
    `${group}, ${status}. ${details}. ${variance}`,
  budget5030VarianceLeft: 'EGP room',
  budget5030VarianceOver: 'EGP over',
  budget5030VarianceAbove: 'EGP above target',
  budget5030VarianceShort: 'EGP short',
  budget5030TargetMetric: 'Target',
  budget5030SpentMetric: 'Spent',
  budget5030ActualMetric: 'Actual',
  budget5030PlanShare: (percentage: number, group: string) => `${percentage}% of ${group} plan`,
  budget5030SpentOfPlanned: (spent: string, planned: string) => `${spent} / ${planned}`,
  budget5030UnbudgetedMeta: 'unbudgeted',
  budget5030PlannedOnly: (planned: string) => `${planned} planned`,
  budget5030ManageGroup: (group: string) => `Manage ${group} budgets`,
  budget5030InsightIncomeNeeded: 'Set monthly income to calculate this rule target.',
  budget5030InsightNoPlan: (group: string) => `${group} has no planned budget yet.`,
  budget5030InsightRecordedBelowPlan: (group: string, amount: string) =>
    `Recorded ${group} spending is ${amount} EGP below the amount planned so far.`,
  budget5030InsightRecordedAbovePlan: (group: string, amount: string) =>
    `Recorded ${group} spending is ${amount} EGP above the amount planned so far.`,
  budget5030InsightOverCap: (group: string, amount: string) =>
    `${group} is ${amount} EGP above its rule cap.`,
  budget5030InsightTargetMet: (amount: string) =>
    `The savings plan is ${amount} EGP above its rule target.`,
  budget5030InsightTargetMatched: 'The savings plan meets its rule target.',
  budget5030InsightBelowTarget: (amount: string) =>
    `The savings plan is ${amount} EGP below its rule target.`,
  budget5030NotGroupedTitle: 'Not grouped',
  budget5030NotGroupedBody: 'Not counted in the rule breakdown',
  budget5030NotGroupedAmounts: (planned: string, spent: string) =>
    `${planned} planned · ${spent} spent`,
  budget5030SetIncomeMetric: 'Set income',
  // Income sheet
  incomeSheetTitle: 'Monthly planning income',
  incomeSheetDescription: (monthLabel: string | undefined) =>
    monthLabel
      ? `This value applies only to your ${monthLabel} budget plan.`
      : 'This value applies only to the selected budget month.',
  incomeSheetAmountLabel: (monthLabel: string | undefined) =>
    monthLabel ? `Expected income for ${monthLabel}` : 'Expected monthly income',
  incomeSheetAmountPlaceholder: '0.00',
  incomeSheetSuggestionNote: 'Pre-filled from your last 3 months of income',
  incomeSheetSaveCta: 'Save',
  incomeSheetSaveError: 'Could not save expected income. Please try again.',
  incomeSheetAmountRequired: 'Enter your monthly income',
  incomeSheetAmountInvalid: 'Amount must be at least 0.01',

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
  categoriesReassignError: 'Could not move this category.',
  categoriesReassignPlanOverlap: (sourcePlan: string, targetPlan: string) =>
    `Cannot merge categories used by overlapping spending plans: ${sourcePlan} and ${targetPlan}.`,

  // U23 Settings rows (categories row)
  settingsCategoriesRow: 'Categories',
  settingsCategoriesDesc: 'Manage expense and income categories',

  // U6 Add Transaction sheet
  addTxTitle: 'Add Transaction',
  addTxTypeExpense: 'Expense',
  addTxTypeIncome: 'Income',
  addTxTypeCardCredit: 'Card credit',
  addTxTypeTransfer: 'Transfer',
  addTxTypeCCPayment: 'CC Payment',
  addTxTypeSelectorA11y: 'Transaction type',
  addTxPickerAccessibility: (label: string, value: string) => `${label}, ${value}`,
  addTxAmountInputAccessibility: 'Transaction amount',
  addTxAmountPlaceholder: '0',
  addTxDataLoadError: 'Could not load the accounts and categories needed for this transaction.',
  addTxDataLoadRetry: 'Retry',
  cardCreditTitle: 'Card credit',
  addTxSupportExpense: 'Records spending from this account.',
  addTxSupportIncome: 'Adds cash received to this account.',
  addTxSupportCardCredit: 'Reduces card debt and offsets spending.',
  addTxSupportTransfer: 'Moves money between your accounts.',
  addTxSupportCcPayment: 'Pays down a credit card from an asset account.',
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
  addTxRateEditAccessibility: 'Use a custom exchange rate',
  addTxRateInputAccessibility: 'Exchange rate in EGP per 1 USD',
  addTxRateResetAccessibility: 'Reset exchange rate to the global rate',
  addTxRatePlaceholder: '0.00',
  addTxSaveCta: 'Save',
  editTxSaveCta: 'Save Changes',
  addTxErrAmountRequired: 'Enter an amount',
  addTxErrAmountZero: 'Amount must be at least 0.01',
  addTxErrAccountRequired: 'Select an account',
  addTxErrFromRequired: 'Select source account',
  addTxErrToRequired: 'Select destination account',
  addTxErrSameAccount: 'From and To must be different accounts',
  addTxErrCategoryRequired: 'Select a category',
  addTxErrCategoryMismatch: 'Select a category that matches this transaction',
  addTxErrCcPaymentSourceMustBeAsset: 'Pay from an asset account',
  addTxErrCcPaymentTargetMustBeCC: 'Pay to a credit card account',
  addTxErrTransferNoCc: 'Use Credit Pay for credit card moves',
  addTxErrRateRequired: 'Enter the exchange rate',
  addTxErrRateInvalid: 'Enter a valid rate greater than 0',
  addTxErrCardCreditExceedsLiability: 'Card credit cannot exceed the current card balance',
  addTxErrCcPaymentExceedsLiability: 'Payment cannot exceed the current card balance',
  addTxInsufficientBalance: (name: string) => `Insufficient balance in ${name}`,
  addTxPickAccountTitle: 'Select Account',
  addTxPickFromTitle: 'From Account',
  addTxPickToTitle: 'To Account',
  addTxPickCategoryTitle: 'Select Category',

  // U5 Transaction List
  transactions: 'Transactions',
  loadingTransactionsA11y: 'Loading transactions',
  loadingTransactionA11y: 'Loading transaction',
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
  goBackAccessibility: 'Go back',
  detailHeader: 'Transaction',
  detailEditAccessibility: 'Edit transaction',
  detailCategory: 'CATEGORY',
  detailAccount: 'ACCOUNT',
  detailDateTime: 'DATE & TIME',
  detailOriginalAmount: 'ORIGINAL AMOUNT',
  detailExchangeRate: 'EXCHANGE RATE',
  detailBudget: 'BUDGET',
  detailSource: 'SOURCE',
  detailBudgetUnavailable: 'Budget unavailable',
  detailManualSource: 'Manual entry',
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
  filterSearchClearAccessibility: 'Clear search',
  filterSearchButtonAccessibility: 'Filter',
  filterAccessibilityWithActiveCount: (label: string, n: number) => `${label}, ${n} active`,

  filterSectionAccounts: 'Accounts',
  filterSectionCategories: 'Categories',
  filterSectionDate: 'Date',
  filterSectionAmount: 'Amount',
  filterSectionAmountType: 'Amount type',
  filterSectionRecurrence: 'Recurrence',

  filterAllAccounts: 'All accounts',
  filterAllCategories: 'All categories',
  filterAllAmountTypes: 'All types',
  filterAllRecurrences: 'All recurrences',

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
  filterAmountMinPlaceholder: '0',
  filterAmountMaxPlaceholder: '∞',
  filterAmountCurrencyAccessibility: 'Amount currency',

  filterCategoryTypeExpense: 'Expense',
  filterCategoryTypeIncome: 'Income',

  // Commitments — C1 List
  commitmentsTitle: 'Commitments',
  loadingCommitmentsA11y: 'Loading commitments',
  searchCommitmentsPlaceholder: 'Search commitments…',
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
  commitmentsErrAmountPositive: 'Amount must be at least 0.01',
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
  commitmentsSkipError: 'Could not skip this payment. Please try again.',
  commitmentsLoadError: 'Could not load commitments. Please try again.',
  commitmentsLoadRetry: 'Retry',
  commitmentsSaveError: 'Could not save this commitment. Please try again.',

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
  commitmentsPayErrAmountMin: 'Amount must be at least 0.01',
  commitmentsPayErrAccountRequired: 'Select an account',
  // W1B — the rate row's purpose caption for a payment that crosses no
  // currency (USD commitment, USD account). The rate is still required there
  // because egp_amount is the ledger's storage currency, and a demanded field
  // with no visible reason reads as a bug. Renders above the source line, so
  // the "last updated" freshness stays where it is.
  commitmentsPayRatePurposeEgp: 'Used to record this payment in EGP',
  // W1B — the account_id membership refine. A plain empty selection keeps
  // commitmentsPayErrAccountRequired above; this one is for an id the loaded
  // (non-archived) list no longer holds, which the write path rejects.
  commitmentsPayErrAccountUnavailable: 'This account is no longer available. Pick another.',
  // W1B — the converted amount rounds below MIN_MONEY_AMOUNT in the paying
  // account's currency. Replaces the generic save banner with the reason, on
  // the field that owns it.
  commitmentsPayErrConvertedBelowMin: 'Converts to less than 0.01 USD at this rate',

  // Commitments — Deactivate
  commitmentsDeactivate: 'Deactivate Commitment',
  commitmentsDeactivateTitle: 'Deactivate this commitment?',
  commitmentsDeactivateBody:
    'It will be removed from your list. Past payment records are preserved.',
  commitmentsDeactivateCancel: 'Cancel',
  commitmentsDeactivateConfirm: 'Deactivate',
  commitmentsDeactivateError: 'Could not deactivate this commitment. Please try again.',
  commitmentsPayError: 'Could not save this payment. Please try again.',

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

  // Shared month filter
  monthFilterLabel: 'Month filter',
  monthFilterPreviousA11y: 'Previous month',
  monthFilterNextA11y: 'Next month',
  monthFilterOpenA11y: (month: string) => `${month}, open month picker`,
  monthPickerTitle: 'Select month',
  monthPickerPreviousYearA11y: 'Previous year',
  monthPickerNextYearA11y: 'Next year',

  // §6 Transactions — Totals strip
  totalsExpenseShareA11y: (pct: number) => `Expenses are ${pct}% of income`,
  totalsIncome: 'Income',
  totalsExpense: 'Expense',
  totalsNet: 'Net',
  totalsVsPrev: (prevLabel: string) => `vs ${prevLabel}`,
  totalsNoIncome: 'No income this month',
  totalsWithinIncome: 'Within income',
  totalsOverIncome: (pct: number) => `${pct}% of income · over`,
  totalsNetCredit: 'Credits exceed expenses',
  transactionsLoadError: 'Could not load transactions.',
  transactionsRefreshError: 'Could not refresh transactions.',
  transactionsTotalsLoadError: 'Could not load monthly totals.',
  transactionsLoadMoreError: 'Could not load more transactions.',
  transactionsLoadRetry: 'Retry',

  // §6 Transactions — Type badges
  typeBadgeCommitment: 'Commitment',
  transactionBudgetAssigned: 'Budget assigned',
  typeBadgeGoal: 'Goal',
  typeBadgeBill: 'Bill',

  // §6 Transactions — Filter sheet additions
  filterSummaryAccountsEmpty: 'All accounts',
  filterSummaryCategoriesEmpty: 'All categories',
  filterSummaryAmountEmpty: 'Any amount',
  filterSummaryAmountInvalid: 'Fix amount range',
  filterSummaryAmountUpTo: 'Up to',
  filterSummaryAmountFrom: 'From',
  filterAmountMinLabel: 'Min',
  filterAmountMaxLabel: 'Max',
  filterAmountInvalid: 'Enter a valid amount of 0 or more',
  filterAmountRangeInvalid: 'Minimum must be less than or equal to maximum',
  filterAccountAccessibility: (name: string) => `${name}, account filter`,
  filterCategoryAccessibility: (name: string) => `${name}, category filter`,
  commitmentFilterAccountAccessibility: (name: string) => `${name}, commitment account filter`,
  commitmentFilterCategoryAccessibility: (name: string) => `${name}, commitment category filter`,
  commitmentFilterAmountTypeAccessibility: (label: string) =>
    `${label}, commitment amount type filter`,
  commitmentFilterRecurrenceAccessibility: (label: string) =>
    `${label}, commitment recurrence filter`,
  commitmentFilterAmountCurrencyAccessibility: 'Commitment amount currency',
  transactionTypeFilterAccessibility: 'Transaction type filter',

  // §6 Transactions — Detail flow (TransferFlowCard labels)
  detailFlowFromLabel: 'From',
  detailFlowToLabel: 'To',
  detailFlowCategoryLabel: 'Category',
  detailFlowSourceLabel: 'Source',
  detailOpenAccountAccessibility: (name: string, amount: string) =>
    `${name}, ${amount}, open account detail`,

  // §6 Transactions — Detail screen V2 actions + states
  detailDeleteButton: 'Delete',
  detailEditButton: 'Edit Transaction',
  detailNotFoundTitle: 'Transaction not found',
  detailNotFoundBody: 'This transaction may have been deleted.',
  detailLoadErrorTitle: 'Could not load this transaction.',
  detailRefreshErrorTitle: 'Could not refresh this transaction.',
  detailRefreshingAccessibility: 'Refreshing transaction',
  detailLoadRetry: 'Retry',

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
  addTxBudgetOptionAccessibility: (name: string, amount: string) => `${name}, ${amount} EGP`,

  // Swipe actions — shared labels
  swipeEdit: 'Edit',
  swipeDelete: 'Delete',
  swipeSkip: 'Skip',

  // Budget — swipe delete confirm
  budgetDeleteConfirmTitle: 'Remove budget?',
  budgetDeleteConfirmBody: (name: string) =>
    `Remove ${name}? Its transactions stay in the category and their spending becomes unassigned.`,
  budgetDeleteConfirmConfirm: 'Remove',
  budgetDeleteConfirmCancel: 'Cancel',
  budgetDeleteError: 'Could not remove this budget. Please try again.',
} as const;
