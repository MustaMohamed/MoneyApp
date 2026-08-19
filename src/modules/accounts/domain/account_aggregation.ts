import { CURRENCY_CONFIG, type CurrencyMeta } from '@/constants/currency';
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
 * this function, and a surface rendering one must not re-apply a minus on top.
 * It is NOT "no minus is ever composed at the display layer". Per-account
 * liability ROWS are the standing exception and are deliberately unsigned —
 * `computeLiabilitiesBreakdown` returns `Math.abs(balanceEgp)`, and
 * `net_worth_breakdown_sheet.tsx:218` composes the leading minus glyph itself
 * for the rows it flags `negative`. Signing those rows too would double it.
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
 * `assetsUsd` and `netWorthUsd` are `undefined` exactly when the rate is not
 * usable. That is a SECOND, independent question from the EGP total: the EGP
 * total needs a rate only when something is foreign, while the `~USD`
 * equivalent needs a verified rate always, because the conversion is the whole
 * point of it (spec §3a). They are `undefined` rather than `null` because
 * neither is DB-mapped (CLAUDE.md's null-versus-undefined rule).
 */
export type DashboardNetWorth =
  | {
      kind: 'amount';
      assetsEgp: number;
      liabilitiesEgp: number;
      netWorthEgp: number;
      assetsUsd: number | undefined;
      netWorthUsd: number | undefined;
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
 * A single object parameter rather than positional arguments, matching
 * `StartingNetPositionInput` so the two resolvers read alike. There is no
 * `baseCurrency` field: EGP base is `computeNetWorth`'s documented precondition
 * and must not become a parameter (spec §2a).
 */
export interface NetWorthInput {
  /** May contain archived rows — the resolver filters them itself. */
  accounts: Account[];
  rate: number;
  /** DB-mapped nullable setting (`usd_rate_updated_at`); null means unverified. */
  rateUpdatedAt: string | null;
}

/**
 * The rate-provenance gate, stated once so the dashboard and N4 cannot drift.
 *
 * `useCurrencyStore`'s `INITIAL_STATE.rate` is `50` — an unverified guess that
 * must never reach a screen (ADR 2026-08-18 §2), and it is greater than zero, so
 * a bare `rate > 0` check opens the gate on it. The marker is what separates a
 * stored rate a user or a fetch actually verified from that placeholder.
 *
 * Do NOT loosen this to make pre-#165 installs show a number (ADR 2026-08-18
 * §3): loosening it re-admits the unverified 50, which is the entire thing the
 * gate exists to keep off the screen. The remedy for that population is a
 * backfill migration, filed separately.
 */
export function isRateUsable(rate: number, rateUpdatedAt: string | null): boolean {
  return rateUpdatedAt !== null && Number.isFinite(rate) && rate > 0;
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
// Seen here as a lookup that can MISS. Its index type promises a hit for
// anything the compiler already believes is a `Currency`, and that promise does
// not hold: these values arrive from SQLite rows mapped without validation, and
// an unsupported code is a schema violation upstream (migration 001 has
// `CHECK(currency IN ('EGP','USD'))`), not a state to degrade into. Nothing
// catches the throw — the app has no error boundary — and that is a recorded
// known gap rather than this ticket's to fix (spec §6).
const CURRENCY_LOOKUP: Readonly<Record<string, CurrencyMeta | undefined>> = CURRENCY_CONFIG;

export function assertSupportedCurrency(currency: Currency): void {
  if (CURRENCY_LOOKUP[currency] === undefined) {
    throw new AccountAggregationError(`Unsupported currency: ${currency}`);
  }
}
