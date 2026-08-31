import { Currency } from '@/constants/enums';
import {
  convertCurrency,
  countForeignAccounts,
  isRateUsable,
  isSupportedCurrency,
  normalizeNegativeZero,
  type RateProvenance,
  resolveAccountAggregationSign,
} from '@/modules/accounts/domain/account_aggregation';
import type { Account } from '@/modules/accounts/entities/account.entity';
import { roundMoney } from '@/utils/money';

/** Refusal is a variant, not a number: an unverified rate must never reach a formatter. */
export type StartingNetPosition =
  | { kind: 'amount'; value: number }
  | { kind: 'rate-needed'; foreignCount: number };

export interface StartingNetPositionInput extends RateProvenance {
  /** May contain archived rows; this resolver filters them itself. */
  accounts: readonly Account[];
  baseCurrency: Currency;
}

/** Shape mirrors `TransactionAmountError`; callers match the thrown type, never the message. */
export class StartingNetPositionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'StartingNetPositionError';
  }
}

function assertSupportedCurrency(currency: Currency): void {
  if (!isSupportedCurrency(currency)) {
    throw new StartingNetPositionError(`Unsupported currency: ${currency}`);
  }
}

// Re-export only this one; a wider re-export lets dashboard reach accounts through onboarding.
export { normalizeNegativeZero };

/** `accountLookup` carries archived rows, so the filter is needed here as well as in SQL. */
export function selectActiveAccounts(accounts: readonly Account[]): readonly Account[] {
  return accounts.filter((account) => account.is_archived === 0);
}

/** Sums `opening_balance` only; refuses when a foreign account has no usable rate. */
export function resolveStartingNetPosition(input: StartingNetPositionInput): StartingNetPosition {
  const { accounts, baseCurrency, rate } = input;

  assertSupportedCurrency(baseCurrency);
  const activeAccounts = selectActiveAccounts(accounts);
  for (const account of activeAccounts) {
    assertSupportedCurrency(account.currency);
  }

  const foreignCount = countForeignAccounts(activeAccounts, baseCurrency);
  const rateUsable = isRateUsable(input);
  if (foreignCount >= 1 && !rateUsable) {
    return { kind: 'rate-needed', foreignCount };
  }

  // Round each converted value, then round once more at the sum; never sum-then-round.
  const total = activeAccounts.reduce(
    (sum, account) =>
      sum +
      resolveAccountAggregationSign(account.type) *
        roundMoney(
          convertCurrency({
            amount: account.opening_balance,
            from: account.currency,
            to: baseCurrency,
            rate,
          }),
        ),
    0,
  );

  return { kind: 'amount', value: normalizeNegativeZero(roundMoney(total)) };
}
