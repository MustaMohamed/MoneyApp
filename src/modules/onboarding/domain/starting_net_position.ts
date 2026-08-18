import { AccountType, Currency } from '@/constants/enums';
import type { Account } from '@/modules/accounts/entities/account.entity';
import { roundMoney } from '@/utils/money';

/**
 * N4's starting net position — the corrected replacement for the currency-blind
 * and sign-blind `computeTotalBalance`.
 *
 * The outcome is a discriminated union so the refusal is unrepresentable as a
 * number: when conversion is required and no verified rate exists, there is no
 * value to hand a formatter, and `useCurrencyStore`'s `INITIAL_STATE.rate` of 50
 * is an unverified guess that must never reach the screen.
 *
 * Lives under `domain/` deliberately — `.claude/rules/money.md` globs the
 * `domain/` folders beneath `src/modules/`, so this is the path on which the
 * money rules auto-load (issue #244).
 */
export type StartingNetPosition =
  | { kind: 'amount'; value: number }
  | { kind: 'rate-needed'; foreignCount: number };

export interface StartingNetPositionInput {
  /** May contain archived rows — this resolver filters them itself. */
  accounts: readonly Account[];
  baseCurrency: Currency;
  rate: number;
  /** DB-mapped nullable column (`usd_rate_updated_at`); null means unverified. */
  rateUpdatedAt: string | null;
}

/** Shape mirrors `TransactionAmountError` — thrown type, never message text. */
export class StartingNetPositionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'StartingNetPositionError';
  }
}

// The app has exactly two currencies. Checked at runtime rather than trusted
// from the type, because these values arrive from SQLite rows that are mapped
// without validation — an unsupported code is a schema violation upstream, not
// a state to degrade into.
const SUPPORTED_CURRENCIES: readonly Currency[] = [Currency.EGP, Currency.USD];

function assertSupportedCurrency(currency: Currency): void {
  if (!SUPPORTED_CURRENCIES.includes(currency)) {
    throw new StartingNetPositionError(`Unsupported currency: ${currency}`);
  }
}

/**
 * The single named site for "credit cards are liabilities" in this screen's
 * math. It is the THIRD independent encoding of that rule in the app
 * (`computeNetWorth` inlines it, `resolvePrimaryBalanceDelta` owns the
 * write side) and it must be the last: no leading minus is derived at the
 * display layer, so when #249 is answered there is one site to adopt or move.
 */
export function resolveAccountAggregationSign(type: AccountType): 1 | -1 {
  return type === AccountType.CreditCard ? -1 : 1;
}

/**
 * `roundMoney` returns `-0` for a negative input that rounds to zero, and
 * `Intl.NumberFormat` renders `-0` as "-0.00". Called as the LAST operation
 * before returning any value that reaches a formatter.
 */
export function normalizeNegativeZero(value: number): number {
  return value === 0 ? 0 : value;
}

/**
 * Archived rows never contribute. `getAccounts` already filters at SQL, but the
 * snapshot in `accountLookup` is populated by `getByIdsIncludingArchived` and
 * does carry them — so the filter belongs here too, where the number is made.
 */
export function selectActiveAccounts(accounts: readonly Account[]): readonly Account[] {
  return accounts.filter((account) => account.is_archived === 0);
}

/** Non-archived accounts whose currency differs from the base — the rate gate's input. */
export function countForeignAccounts(accounts: readonly Account[], base: Currency): number {
  return selectActiveAccounts(accounts).filter((account) => account.currency !== base).length;
}

// `exchange_rate` is EGP per USD: USD -> EGP multiplies, EGP -> USD divides.
// `resolveTransactionAmounts` is the authority for that asymmetry.
function convertToBaseCurrency(
  amount: number,
  currency: Currency,
  baseCurrency: Currency,
  rate: number,
): number {
  if (currency === baseCurrency) {
    return amount;
  }
  return currency === Currency.USD ? amount * rate : amount / rate;
}

/**
 * `round2( Σ sign × round2(converted opening_balance) )`, over non-archived
 * accounts, in array order.
 *
 * Reads `opening_balance` ONLY — `credit_limit`, `revolving_balance`,
 * `minimum_payment` and `current_balance` never contribute (business rule 6
 * makes the two balance columns equal at creation, so the swap away from
 * `current_balance` is invisible during onboarding).
 *
 * A rate counts as usable when `rateUpdatedAt !== null` and `rate` is finite and
 * positive; it is required only when at least one account is foreign. Required
 * and unusable is the refusal outcome — never a substituted rate, a zero, a
 * partial total, or a direct sum of unlike currencies.
 */
export function resolveStartingNetPosition(input: StartingNetPositionInput): StartingNetPosition {
  const { accounts, baseCurrency, rate, rateUpdatedAt } = input;

  assertSupportedCurrency(baseCurrency);
  const activeAccounts = selectActiveAccounts(accounts);
  for (const account of activeAccounts) {
    assertSupportedCurrency(account.currency);
  }

  const foreignCount = countForeignAccounts(activeAccounts, baseCurrency);
  const rateUsable = rateUpdatedAt !== null && Number.isFinite(rate) && rate > 0;
  if (foreignCount >= 1 && !rateUsable) {
    return { kind: 'rate-needed', foreignCount };
  }

  // Round each converted value, then round once more at the sum — never
  // sum-then-round (scope case 14). The reduce runs in array order, which is
  // also what makes the -0 fixture in the suite reachable.
  const total = activeAccounts.reduce(
    (sum, account) =>
      sum +
      resolveAccountAggregationSign(account.type) *
        roundMoney(
          convertToBaseCurrency(account.opening_balance, account.currency, baseCurrency, rate),
        ),
    0,
  );

  return { kind: 'amount', value: normalizeNegativeZero(roundMoney(total)) };
}
