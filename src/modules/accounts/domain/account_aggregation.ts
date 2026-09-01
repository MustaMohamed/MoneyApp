import { CURRENCY_CONFIG } from '@/constants/currency';
import { AccountType, Currency } from '@/constants/enums';
import type { Account } from '@/modules/accounts/entities/account.entity';

/** Credit cards are liabilities, so aggregations sign their balances negative. */
export function resolveAccountAggregationSign(type: AccountType): 1 | -1 {
  return type === AccountType.CreditCard ? -1 : 1;
}

/** `Intl.NumberFormat` renders `-0` as "-0.00", so call this last before formatting. */
export function normalizeNegativeZero(value: number): number {
  return value === 0 ? 0 : value;
}

/** `*Foreign` fields hold the app's other currency, `undefined` when the rate is unusable. */
export type DashboardNetWorth =
  | {
      kind: 'amount';
      assets: number;
      liabilities: number;
      netWorth: number;
      assetsForeign: number | undefined;
      netWorthForeign: number | undefined;
    }
  | { kind: 'rate-needed'; foreignCount: number };

export type DashboardNetWorthAmount = Extract<DashboardNetWorth, { kind: 'amount' }>;

export interface RateProvenance {
  rate: number;
  /** `usd_rate_updated_at`; null means no verification marker was ever written for this rate. */
  rateUpdatedAt: string | null;
  /** True when `usd_rate_manual_override` is 'true': the user typed the rate in Settings. */
  isManualOverride: boolean;
}

/** EGP is the storage currency; `baseCurrency` is the reporting currency this sums against. */
export interface NetWorthInput extends RateProvenance {
  /** May contain archived rows; the resolver filters them itself. */
  accounts: Account[];
  baseCurrency: Currency;
}

/** Do not loosen to `rate > 0`: without provenance the placeholder rate 50 reaches the screen. */
export function isRateUsable({ rate, rateUpdatedAt, isManualOverride }: RateProvenance): boolean {
  return (rateUpdatedAt !== null || isManualOverride) && Number.isFinite(rate) && rate > 0;
}

/** Do not swap in `selectActiveAccounts`: accounts must not import from onboarding. */
export function countForeignAccounts(accounts: readonly Account[], base: Currency): number {
  return accounts.filter((account) => account.is_archived === 0 && account.currency !== base)
    .length;
}

/** Callers match on the thrown type, never on the message text. */
export class AccountAggregationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AccountAggregationError';
  }
}

// `Object.hasOwn`, not an index read: prototype members like `toString` would answer supported.
export function isSupportedCurrency(currency: Currency): boolean {
  return Object.hasOwn(CURRENCY_CONFIG, currency);
}

export function assertSupportedCurrency(currency: Currency): void {
  if (!isSupportedCurrency(currency)) {
    throw new AccountAggregationError(`Unsupported currency: ${currency}`);
  }
}

/** `rate` is EGP per USD: USD to EGP multiplies, EGP to USD divides. Rounding is the caller's. */
export function convertCurrency(input: {
  amount: number;
  from: Currency;
  to: Currency;
  rate: number;
}): number {
  const { amount, from, to, rate } = input;
  assertSupportedCurrency(from);
  assertSupportedCurrency(to);

  if (from === to) {
    return amount;
  }
  return from === Currency.USD ? amount * rate : amount / rate;
}
