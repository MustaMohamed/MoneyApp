import { CURRENCY_CONFIG } from '@/constants/currency';
import { AccountType, Currency } from '@/constants/enums';
import type { Account } from '@/modules/accounts/entities/account.entity';

/**
 * Account-aggregation primitives, shared by every surface that sums balances
 * across accounts.
 *
 * Lives under `domain/` deliberately — `.claude/rules/money.md` globs the
 * `domain/` folders beneath `src/modules/`, so this is the path on which the
 * money rules auto-load (issue #244).
 */

/**
 * The named site for "credit cards are liabilities" in the two aggregations
 * that adopted it: `computeNetWorth` (dashboard helpers) and
 * `resolveStartingNetPosition` (N4); before #255 each inlined its own copy of
 * the conditional.
 *
 * It is NOT yet the only aggregation encoding the rule. Two more sit inline in
 * `dashboard.helpers.ts`: `computeLiabilitiesBreakdown` filters on
 * `type !== AccountType.CreditCard`, and `computeDashboardAccountCounts`
 * buckets accounts on `type === AccountType.CreditCard`. Adopting the resolver
 * at either is out of scope for #255 (spec §7) and owned by a separate ticket.
 *
 * `resolvePrimaryBalanceDelta` in the transactions domain remains a separate
 * encoding on purpose: it signs WRITES, not aggregations, and unifying the two
 * is out of scope (spec §2).
 *
 * The corollary is scoped to AGGREGATION: a summed TOTAL takes its sign from
 * this function, and no surface re-applies a minus to a total. Per-account
 * liability ROWS were the standing exception UNTIL #259 — deliberately
 * unsigned, with `computeLiabilitiesBreakdown` returning `Math.abs(balance)`
 * and the sheet composing the leading minus glyph itself for every row. As of
 * #259 the rows carry the signed owed-frame value instead (positive owed,
 * negative in credit), and the double-minus this comment used to warn about
 * is prevented by a single composition point for the row's GLYPH —
 * `formatLiabilityRowValue` (`net_worth_breakdown_sheet.helpers.ts`) —
 * rather than by keeping the rows unsigned. That is scoped to the glyph, not
 * every sign-driven decision on the row: the sheet's "In credit" caption
 * reads `balance < 0` on its own, a second, independent read of the same
 * sign for a different purpose, not a second glyph site. The glyph itself
 * follows docs/adr/2026-08-27-money-colour-vocabulary.md §3; the aggregate
 * corollary above is unchanged.
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
 * The dashboard's net-worth outcome. A discriminated union so the refusal is
 * unrepresentable as a number: the `rate-needed` member carries NO numeric
 * field, so a formatter structurally cannot be handed a value that was never
 * computed. Mirrors `StartingNetPosition` deliberately — a reader comparing the
 * two should find the same shape.
 *
 * `assetsForeign` and `netWorthForeign` are `undefined` exactly when the rate is not
 * usable. That is a SECOND, independent question from the EGP total: the EGP
 * total needs a rate only when something is foreign, while the `~USD`
 * equivalent needs a verified rate always, because the conversion is the whole
 * point of it (spec §3a). They are `undefined` rather than `null` because
 * neither is DB-mapped (CLAUDE.md's null-versus-undefined rule).
 */
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

/**
 * The amount member, narrowed once at the union's owner rather than at each
 * surface that needs it: `stat_cards.tsx` and `net_worth_breakdown_sheet.tsx`
 * both pass it to a body subcomponent that only this member can supply, and
 * owning the narrowing here makes a discriminant rename one edit, not three.
 */
export type DashboardNetWorthAmount = Extract<DashboardNetWorth, { kind: 'amount' }>;

/**
 * Everything `isRateUsable` reads, as one shape.
 *
 * It is an interface both resolver inputs EXTEND rather than three fields each
 * declares, so a provenance source added later cannot reach one resolver and
 * not the other. That is the same argument the predicate itself makes, one level
 * up: a positional signature let this gate gain a source with every existing
 * caller still compiling, which is how a caller keeps answering `false` in
 * silence.
 */
export interface RateProvenance {
  rate: number;
  /**
   * DB-mapped nullable setting (`usd_rate_updated_at`); null means no
   * verification marker was ever written for this rate.
   */
  rateUpdatedAt: string | null;
  /**
   * `usd_rate_manual_override === 'true'` — the user typed this rate into
   * Settings themselves. Not DB-mapped as a nullable, so `boolean`, not
   * `boolean | null`.
   */
  isManualOverride: boolean;
}

/**
 * A single object parameter rather than positional arguments, matching
 * `StartingNetPositionInput` so the two resolvers read alike. There is no
 * `baseCurrency` field: EGP is the storage currency, and `base_currency` is a
 * reporting currency per the gate-1 decision at
 * `docs/scopes/MA-onboarding-redesign/scope.md:46` that `computeNetWorth`
 * does not yet honour — a gap audit M28 owns, not a choice this shape makes.
 */
export interface NetWorthInput extends RateProvenance {
  /** May contain archived rows — the resolver filters them itself. */
  accounts: Account[];
}

/**
 * The rate-provenance gate, stated once so the dashboard and N4 cannot drift.
 *
 * A rate is usable when it is finite and positive AND the app can say where it
 * came from. There are exactly two answers to that second question, and either
 * one is sufficient:
 *
 * - `rateUpdatedAt !== null` — a marker recording WHEN this rate was written by
 *   a fetch or a manual save.
 * - `isManualOverride` — the flag recording THAT the user typed it. It is
 *   written by `setManualRate` and by nothing else; `fetchRate` writes `false`.
 *
 * The override flag is provenance in its own right, not a weaker proxy for the
 * marker. `INITIAL_STATE.isManualOverride` is `false`, so the unverified `50`
 * this gate exists to keep off the screen (ADR 2026-08-18 §2) is refused by the
 * widened predicate exactly as it was by the narrow one — the regression test
 * for that claim hydrates the real store over an empty repository rather than
 * copying the constant.
 *
 * Accepting it is what reaches the population `2026-08-18-starting-net-position.md`
 * §3 describes and this file's earlier comment proposed a backfill migration
 * for. `currency.store.ts` shipped in #23 writing `usd_rate` and
 * `usd_rate_manual_override` with no `usd_rate_updated_at`; the marker arrives
 * in #85. An install that saved a manual rate inside that window carries the
 * flag and no marker, and `shouldRefreshRate` returns false on its first line
 * for a manual override — so no background fetch ever writes the missing marker
 * and the refusal is permanent. The fetched half of the same window repairs
 * itself on the next online app-open, which is why the flag is the whole
 * remedy. See ADR 2026-08-19 §4.
 *
 * A backfill would have to invent a verification time for a rate whose real one
 * is unknown — the substitution ADR 2026-08-18 §2 forbids. Reading the flag
 * that is already there invents nothing.
 *
 * `loadRate` publishes `isManualOverride` as `rate !== undefined && manualStr
 * === 'true'`, so the flag cannot outlive a rate that failed to parse: an
 * install with a corrupt `usd_rate` row falls back to the placeholder with the
 * flag OFF and is refused. The one input this admits that the marker would not
 * is a user who typed 50 themselves — their number, deliberately entered, and
 * indistinguishable from the placeholder only by value.
 *
 * Still do NOT loosen this to `rate > 0`: that admits the placeholder, and no
 * install's data is improved by it.
 */
export function isRateUsable({ rate, rateUpdatedAt, isManualOverride }: RateProvenance): boolean {
  return (rateUpdatedAt !== null || isManualOverride) && Number.isFinite(rate) && rate > 0;
}

/**
 * Non-archived accounts whose currency differs from the base — the rate gate's
 * input.
 *
 * Filters `is_archived` inline rather than calling `selectActiveAccounts`, which
 * stays in the onboarding domain: importing it here would run
 * accounts -> onboarding, the one direction this file exists to forbid.
 */
export function countForeignAccounts(accounts: readonly Account[], base: Currency): number {
  return accounts.filter((account) => account.is_archived === 0 && account.currency !== base)
    .length;
}

/** Shape mirrors `StartingNetPositionError` — thrown type, never message text. */
export class AccountAggregationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AccountAggregationError';
  }
}

// The supported vocabulary is `CURRENCY_CONFIG` itself, never a hand-kept copy
// of the same codes: it is a `Record<Currency, CurrencyMeta>`, so a member
// added to the enum is a TYPE ERROR there, while a local array compiles
// unchanged and throws on real rows.
//
// Seen here as a membership question that can MISS. The record's index type
// promises a hit for anything the compiler already believes is a `Currency`,
// and that promise does not hold: these values arrive from SQLite rows mapped
// without validation, and an unsupported code is a schema violation upstream
// (migration 001 has `CHECK(currency IN ('EGP','USD'))`), not a state to
// degrade into. Nothing catches the throw — the app has no error boundary —
// and that is a recorded known gap rather than this ticket's to fix (spec §6).
//
// `Object.hasOwn`, not `CURRENCY_CONFIG[currency] !== undefined`: an index read
// resolves through the PROTOTYPE CHAIN, so `constructor`, `toString` and every
// other `Object.prototype` member answered "supported" under the old check.
//
// This predicate is the single encoding of the vocabulary, shared with
// `starting_net_position.ts`. What is deliberately NOT shared is the assertion:
// spec §6 requires the thrown TYPE to name its own domain, so each domain wraps
// this predicate in its own two-line throw. Only the error class differs.
export function isSupportedCurrency(currency: Currency): boolean {
  return Object.hasOwn(CURRENCY_CONFIG, currency);
}

export function assertSupportedCurrency(currency: Currency): void {
  if (!isSupportedCurrency(currency)) {
    throw new AccountAggregationError(`Unsupported currency: ${currency}`);
  }
}

/**
 * The one bidirectional conversion, shared by `computeNetWorth`, the two
 * dashboard breakdown resolvers, `resolveStartingNetPosition` and N4's
 * approximation pill. Before it, each of those carried its own copy of the
 * direction check, and `computeNetWorth`'s copy multiplied unconditionally.
 *
 * `exchange_rate` is EGP per USD, so the asymmetry is the whole point:
 * `USD -> EGP` MULTIPLIES and `EGP -> USD` DIVIDES. A flat `amount × rate` is
 * correct in exactly one of the four pairs. `resolveTransactionAmounts` is the
 * authority for that asymmetry on the write path; this is its aggregation-side
 * counterpart.
 *
 * An object parameter, not four positionals: `from` and `to` are the same type,
 * so a transposed pair would compile silently, and the direction is the one
 * thing this function exists to get right.
 *
 * The identity pair returns `amount` untouched and never reads `rate` — an
 * EGP-only portfolio under an EGP base converts nothing, so an unusable rate
 * must be arithmetically inert rather than a division by a placeholder.
 *
 * **Does not round, and must not import `@/utils/money`.** Rounding is the
 * caller's, at the fold, once — `round2(Σ sign × round2(converted))`. Rounding
 * here would round twice on every path and change the fold's answer at the
 * half-cent (ADR 2026-08-22).
 */
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
