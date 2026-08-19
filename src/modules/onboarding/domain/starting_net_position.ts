import { CURRENCY_CONFIG, type CurrencyMeta } from '@/constants/currency';
import { Currency } from '@/constants/enums';
import {
  countForeignAccounts,
  isRateUsable,
  normalizeNegativeZero,
  resolveAccountAggregationSign,
} from '@/modules/accounts/domain/account_aggregation';
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

// The supported vocabulary is `CURRENCY_CONFIG` itself, never a hand-kept copy
// of the same codes: it is a `Record<Currency, CurrencyMeta>`, so a member
// added to the enum is a TYPE ERROR there, while a local array compiles
// unchanged and throws on real rows.
//
// Seen here as a lookup that can MISS. Its index type promises a hit for
// anything the compiler already believes is a `Currency`, and that promise does
// not hold: these values arrive from SQLite rows mapped without validation, and
// an unsupported code is a schema violation upstream, not a state to degrade
// into.
const CURRENCY_LOOKUP: Readonly<Record<string, CurrencyMeta | undefined>> = CURRENCY_CONFIG;

function assertSupportedCurrency(currency: Currency): void {
  if (CURRENCY_LOOKUP[currency] === undefined) {
    throw new StartingNetPositionError(`Unsupported currency: ${currency}`);
  }
}

// Both now live in `@/modules/accounts/domain/account_aggregation` — the sign
// rule has one owner for aggregations, and `normalizeNegativeZero` went with it
// because the dashboard needs it and the import may only run
// dashboard -> accounts. `normalizeNegativeZero` alone is re-exported: it is
// what `approximation_pill.ts` imports, and keeping that importer unedited is
// the whole purpose of the re-export. #255 chunk 2 may drop it once that
// importer moves.
//
// `resolveAccountAggregationSign` is deliberately NOT re-exported. Both its
// consumers already import it from the accounts path, and `.oxlintrc.json`
// carries no import-path rule, so a re-export here would let the dashboard
// reach the sign THROUGH the onboarding domain — the exact direction the hoist
// exists to forbid.
//
// `countForeignAccounts` moved to the same accounts file in #255 chunk 2 and is
// NOT re-exported either, for that same reason: `computeNetWorth` consumes it
// now, so a re-export here would re-open the inverted direction through a
// different door. `approximation_pill.ts` and `ready_summary_state.ts` import it
// from the accounts path directly. `selectActiveAccounts` stays here — it has no
// dashboard consumer.
export { normalizeNegativeZero };

/**
 * Archived rows never contribute. `getAccounts` already filters at SQL, but the
 * snapshot in `accountLookup` is populated by `getByIdsIncludingArchived` and
 * does carry them — so the filter belongs here too, where the number is made.
 */
export function selectActiveAccounts(accounts: readonly Account[]): readonly Account[] {
  return accounts.filter((account) => account.is_archived === 0);
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
  const rateUsable = isRateUsable(rate, rateUpdatedAt);
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
