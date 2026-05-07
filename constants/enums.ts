export enum AccountType {
  Bank = 'bank',
  SmartWallet = 'smart_wallet',
  PhysicalWallet = 'physical_wallet',
  PhysicalSavings = 'physical_savings',
  CreditCard = 'credit_card',
}

export enum OnboardingStep {
  O1 = 'O1',
  O2 = 'O2',
  O3 = 'O3',
  O4 = 'O4',
  O5 = 'O5',
  O6 = 'O6',
}

export enum SecurityChoice {
  Pin = 'pin',
  Biometric = 'biometric',
  Skip = 'skip',
}

export enum Currency {
  EGP = 'EGP',
  USD = 'USD',
}

export enum CategoryType {
  Expense = 'expense',
  Income = 'income',
}

export enum TransactionType {
  Expense = 'expense',
  Income = 'income',
  Transfer = 'transfer',
  CCPayment = 'cc_payment',
}

export enum DatePreset {
  Today = 'today',
  ThisWeek = 'this_week',
  ThisMonth = 'this_month',
  LastMonth = 'last_month',
  Last30Days = 'last_30_days',
  ThisYear = 'this_year',
  AllTime = 'all_time',
  Custom = 'custom',
}

export enum AmountType {
  Fixed = 'fixed',
  Variable = 'variable',
}

export enum RecurrencePeriod {
  Days = 'days',
  Weeks = 'weeks',
  Months = 'months',
  Years = 'years',
}

export enum DurationType {
  Forever = 'forever',
  AfterCount = 'after_count',
  UntilDate = 'until_date',
}

export enum CommitmentPaymentStatus {
  Upcoming = 'upcoming',
  Due = 'due',
  Overdue = 'overdue',
  Paid = 'paid',
  Skipped = 'skipped',
}
