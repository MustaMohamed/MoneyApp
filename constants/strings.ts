export const Strings = {
  // O1 Welcome
  o1Headline: 'Your money,\nyour rules.',
  o1Subtext: 'Track every pound and dollar — no banks, no sync, just clarity.',
  o1Cta: 'Get Started',

  // O2 Currency
  o2Title: 'Base Currency',
  o2Subtitle: 'Pick your main currency. You can still add accounts in any currency.',
  o2Cta: 'Continue',
  currencyEGP: 'Egyptian Pound',
  currencyUSD: 'US Dollar',
  currencyEGPCode: 'EGP',
  currencyUSDCode: 'USD',

  // O3 Security
  o3Title: 'Secure Your App',
  o3Subtitle: 'Choose how you want to protect MoneyApp.',
  o3PinLabel: 'PIN Code',
  o3PinSub: 'Set a 4-digit PIN on next launch',
  o3BiometricLabel: 'Face ID / Fingerprint',
  o3BiometricSub: 'Use biometrics to unlock',
  o3SkipLabel: 'Skip for now',
  o3SkipSub: 'You can set this up later in Settings',
  o3BestBadge: 'Best',
  o3Cta: 'Continue',

  // O4 Add Account
  o4Title: 'Add Your First Account',
  o4Subtitle: 'Start by adding one account — you can add more next.',
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
  o4MinPaymentPlaceholder: '0',
  o4DueDayLabel: 'Statement Due Day',
  o4DueDayPlaceholder: 'e.g. 15',
  o4InterestLabel: 'Track Interest',
  o4AprLabel: 'Annual Percentage Rate (APR %)',
  o4AprPlaceholder: 'e.g. 2.99',
  o4Cta: 'Save & Continue',

  // O4 validation errors
  errNameRequired: 'Account name is required',
  errNameTooLong: 'Name must be 30 characters or less',
  errNameDuplicate: 'This name is already used',
  errBalanceInvalid: 'Please enter a valid amount',
  errCreditLimitRequired: 'Credit limit is required for credit cards',
  errAprRequired: "Please enter your card's APR",

  // Account types
  typeBank: 'Bank Account',
  typeSmartWallet: 'Smart Wallet',
  typePhysicalWallet: 'Cash Wallet',
  typePhysicalSavings: 'Savings Jar',
  typeCreditCard: 'Credit Card',

  // O5 More Accounts
  o5Title: 'Add More Accounts',
  o5Subtitle: 'Got other accounts? Add them now — or skip and do it later.',
  o5AddAnother: '+ Add Another Account',
  o5Cta: "I'm Done",

  // O6 Ready
  o6Title: "You're all set!",
  o6Subtitle: 'Your accounts are ready. Start tracking your money with full control.',
  o6Cta: 'Open My Dashboard',
  o6Currency: 'Base Currency',
  o6Security: 'Security',
  o6Accounts: 'Accounts',
  o6SecurityPin: 'PIN Code',
  o6SecurityBiometric: 'Biometrics',
  o6SecuritySkipped: 'Not set',

  // Placeholder dashboard
  placeholderTitle: 'Dashboard coming soon',
  placeholderSubtitle: 'M1 complete — M1.5 next.',
} as const;
