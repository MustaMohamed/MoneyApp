import { AccountType } from '@/constants/enums';

export type AccountBalanceColorClass = 'text-foreground' | 'text-accent';

const ACCOUNT_BALANCE_COLOR_CLASS: Record<AccountType, AccountBalanceColorClass> = {
  [AccountType.Bank]: 'text-accent',
  [AccountType.SmartWallet]: 'text-accent',
  [AccountType.PhysicalWallet]: 'text-accent',
  [AccountType.PhysicalSavings]: 'text-accent',
  [AccountType.CreditCard]: 'text-foreground',
};

/**
 * The one site that maps an account type to a balance colour. Both
 * `account_card.tsx` (dashboard) and `balance_hero.tsx` (account detail) call
 * this instead of branching on `AccountType` themselves.
 *
 * `text-foreground` (cream) for a credit card, `text-accent` (gold) for every
 * other type. Cream is not a demotion to body text — it is the absence of the
 * gold asset accent, kept distinct on purpose so a liability balance and an
 * asset balance still read as two different things once the balance itself
 * stops being red. Gold was proposed and rejected at the P1 gate: both
 * surfaces already paint asset balances gold, so a credit card in gold would
 * be indistinguishable from a bank account (ruling #249).
 *
 * The utilisation ramp (the `Available` row, the progress bar) and the
 * over-limit treatment are a separate decision and do not route through this
 * function — red there still means something the user can act on.
 *
 * This does not claim to be the app's balance/money colour vocabulary; #265
 * tracks that as a still-open, wider question.
 */
export function resolveAccountBalanceColorClass(type: AccountType): AccountBalanceColorClass {
  return ACCOUNT_BALANCE_COLOR_CLASS[type];
}
