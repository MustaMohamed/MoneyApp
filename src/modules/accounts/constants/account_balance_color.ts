import { AccountType } from '@/constants/enums';

/**
 * The balance-colour class two account surfaces render by account type.
 * Scope, exclusions, and the rationale are on the function below.
 */
export type AccountBalanceColorClass = 'text-foreground' | 'text-accent';

const ACCOUNT_BALANCE_COLOR_CLASS: Record<AccountType, AccountBalanceColorClass> = {
  [AccountType.Bank]: 'text-accent',
  [AccountType.SmartWallet]: 'text-accent',
  [AccountType.PhysicalWallet]: 'text-accent',
  [AccountType.PhysicalSavings]: 'text-accent',
  [AccountType.CreditCard]: 'text-foreground',
};

/**
 * The balance-colour site for `account_card.tsx` (dashboard) and
 * `balance_hero.tsx` (account detail); both call this instead of branching on
 * `AccountType` themselves.
 *
 * `net_worth_breakdown_sheet.tsx`'s liability rows used to set `valueColor` to
 * a fixed `LIABILITY_COLOR` (`Colors.dark.negative`) on rows
 * `dashboard.helpers.ts:227`'s `computeLiabilitiesBreakdown` builds by
 * filtering `type !== AccountType.CreditCard` — an account's own balance
 * (signed since #259: positive owed, negative in credit — not the unsigned
 * magnitude the row carried when this paragraph was written), coloured from
 * its account type, in the same red this file's function exists to remove
 * from `account_card.tsx` and `balance_hero.tsx`. #265 has since adopted the
 * rule there too, via `resolveBreakdownRowColors` in
 * `net_worth_breakdown_sheet.helpers.ts` — see the ADR.
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
 * This does not claim to be the app's balance/money colour vocabulary; that
 * rule is written down at docs/adr/2026-08-27-money-colour-vocabulary.md.
 */
export function resolveAccountBalanceColorClass(type: AccountType): AccountBalanceColorClass {
  return ACCOUNT_BALANCE_COLOR_CLASS[type];
}
