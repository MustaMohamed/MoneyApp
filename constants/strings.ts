export const Strings = {
  // O1 Welcome
  o1Headline: 'Your money.\nFinally clear.',
  o1Subtext: 'Track everything. Plan with confidence.\nNo bank access needed.',
  o1Cta: 'Get Started',
  o1SignIn: 'Already set up? Sign in',

  // O2 Currency
  o2Title: 'Base Currency',
  o2Heading: 'Choose your currency',
  o2Subtitle: 'Used for all net worth and budget calculations.',
  o2Cta: 'Continue',
  o2NoteLabel: 'Note:',
  o2NoteBody: ' This is your reporting currency. Individual accounts can still be in any currency.',
  currencyEGP: 'Egyptian Pound',
  currencyUSD: 'US Dollar',
  currencyEGPCode: 'EGP',
  currencyUSDCode: 'USD',

  // O3 Security
  o3Title: 'Security',
  o3HeaderTitle: 'Protect your data',
  o3HeaderSub: 'Stays on your device only.',
  o3PinLabel: 'Set PIN',
  o3PinSub: '4 or 6 digit code',
  o3BiometricLabel: 'Biometric',
  o3BiometricSub: 'Face ID or fingerprint',
  o3SkipLabel: 'Skip for now',
  o3SkipSub: 'Enable later in Settings',
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
