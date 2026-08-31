import { foreignCurrencyFor } from '@/constants/currency';
import { AccountType, CommitmentPaymentStatus, Currency } from '@/constants/enums';
import {
  assertSupportedCurrency,
  convertCurrency,
  countForeignAccounts,
  type DashboardNetWorth,
  isRateUsable,
  type NetWorthInput,
  normalizeNegativeZero,
  resolveAccountAggregationSign,
} from '@/modules/accounts/domain/account_aggregation';
import type { Account } from '@/modules/accounts/entities/account.entity';
import type { BudgetDashboardSummaryVM } from '@/modules/budget/screens/budget/budget.helpers';
import type { CommitmentPayment } from '@/modules/commitments/entities/commitment_payment.entity';
import type {
  DashboardBudgetLimitRow,
  DashboardTransactionFactRow,
} from '@/modules/dashboard/database/dashboard_snapshot';
import { roundMoney } from '@/utils/money';

/**
 * `round2( Σ sign × round2(converted current_balance) )`, over non-archived
 * accounts, in array order.
 *
 * **EGP is the storage currency; `baseCurrency` is the reporting currency, and
 * this function honours it.** The gate-1 product decision recorded at
 * `docs/scopes/MA-onboarding-redesign/scope.md:46` treats the N1 currency
 * choice as a display promise; this resolver used to hardcode `Currency.EGP` as
 * both the summation target and the rate-gate reference, so a USD-base user
 * with a USD-only portfolio and no saved rate was refused a total for a
 * conversion their portfolio does not need. `baseCurrency` now decides all
 * three: what the accounts are summed INTO, which accounts count as foreign,
 * and which way each conversion runs. Every direction goes through
 * `convertCurrency` — shared with N4's `resolveStartingNetPosition`, so the two
 * cannot drift again (ADR `2026-08-18` §5, audit M28).
 *
 * Reads `current_balance`, unlike N4's `resolveStartingNetPosition`, which
 * reads `opening_balance` — that difference is deliberate and unchanged here.
 *
 * Archived rows never contribute. `getAccounts` already filters them at SQL,
 * so this is a CONTRACT guarantee of the function rather than a change to the
 * current call path. That guarantee FORECLOSES audit M12's recommendation (a) —
 * giving the dashboard snapshot an archived-inclusive credit-card read so an
 * archived card's debt keeps counting against net worth. Anyone taking that
 * route has to reopen this contract and this comment, not just widen a query.
 * M12's other half, the archive-confirmation copy that contradicts the current
 * behaviour, is untouched by #255.
 *
 * A rate counts as usable only when it is finite AND positive AND its
 * provenance is known — a verification marker or the user's own manual-override
 * flag (`isRateUsable`, which owns that disjunction for this function and N4
 * alike). It is REQUIRED only when at least one non-archived account is
 * foreign. Required and unusable is the `rate-needed` outcome — never a
 * substituted rate, a zero, or a partial total.
 *
 * Whether the base total can be stated and whether the foreign equivalent can be
 * stated are two questions with two answers. The base total needs a rate only
 * when something is foreign; the foreign equivalent needs a verified rate
 * ALWAYS, because the conversion is the whole point of it. So on the amount path
 * `assetsForeign` and `netWorthForeign` are `undefined` exactly when the rate is
 * unusable.
 */
export function computeNetWorth(input: NetWorthInput): DashboardNetWorth {
  const { accounts, baseCurrency, rate } = input;

  assertSupportedCurrency(baseCurrency);
  // Archived rows are dropped BEFORE every other step, the foreign count
  // included: an archived foreign wallet must not force a refusal on a portfolio
  // that has nothing left to convert.
  const activeAccounts = accounts.filter((a) => !a.is_archived);
  for (const a of activeAccounts) {
    assertSupportedCurrency(a.currency);
  }

  // The gate's reference is the user's OWN base, not a hardcoded EGP: a USD-base
  // user holding only USD accounts has nothing to convert, so an unverified rate
  // is irrelevant to them. Gating them on EGP is the bug this closes.
  const foreignCount = countForeignAccounts(activeAccounts, baseCurrency);
  // `input` itself, not a re-assembled literal: `NetWorthInput` extends
  // `RateProvenance`, so a provenance field added there cannot be dropped here.
  const rateUsable = isRateUsable(input);
  if (foreignCount >= 1 && !rateUsable) {
    return { kind: 'rate-needed', foreignCount };
  }

  let assets = 0;
  let liabilities = 0;
  // Accumulated separately rather than derived as `assets - liabilities`:
  // subtracting two independently-rounded group totals cannot produce the `-0`
  // that a cancelling portfolio really lands on, and the two agree at 2 dp
  // everywhere else.
  let netWorth = 0;

  for (const a of activeAccounts) {
    const converted = convertCurrency({
      amount: a.current_balance,
      from: a.currency,
      to: baseCurrency,
      rate,
    });
    // Round each converted value, then round once more at the sum — never
    // sum-then-round: 0.502 USD at rate 2 is 1.004, so two of them are 2.00
    // round-then-sum and 2.01 sum-then-round. Unchanged by the divide branch:
    // two EGP 100.00 accounts at 48.85 are 2.05 + 2.05 = 4.10 round-then-sum
    // and 4.09 sum-then-round.
    const rounded = roundMoney(converted);
    const sign = resolveAccountAggregationSign(a.type);

    if (sign === 1) {
      assets += rounded;
    } else {
      // `liabilities` is the OWED-FRAME total: positive when cards are
      // owed, negative when every card is in credit (#259 T4 pins
      // `liabilities === -300` on an all-credit portfolio). `stat_cards.tsx`
      // reads it two ways: `Math.abs(...)` for its assets/liabilities
      // proportion bar (`stat_cards.tsx:333`) and the raw signed value,
      // un-re-signed, for its liabilities text (`:384`, `formatAmount`). The
      // sheet's header/footer also render it raw, and
      // `computeLiabilitiesBreakdown`'s rows below now carry the same
      // polarity.
      liabilities += rounded;
    }
    netWorth += sign * rounded;
  }

  // ONE conversion of the accumulated total, in the direction
  // `baseCurrency -> foreignCurrencyFor(baseCurrency)` — never a second
  // per-account pass. The two differ by a cent and the suite pins it: three EGP
  // 100.00 accounts under a USD base at 48.85 convert to 2.05 each, and
  // 6.15 × 48.85 = 300.4275 rounds to 300.43 while three separate
  // roundMoney(2.05 × 48.85) sum to 300.42.
  //
  // **Both inputs are the RAW accumulators — before `roundMoney` and before
  // `normalizeNegativeZero` below — and that rule has NO TEST and cannot get
  // one.** Measured at P5: converting the normalised value instead leaves the
  // whole tree green, and brute force over 10 rates × 2-6 accounts ×
  // 0.01-2000.00 found no fixture where
  // `roundMoney(acc × rate) ≠ roundMoney(roundMoney(acc) × rate)`. It is
  // black-box unfalsifiable, so this comment is the ONLY artifact carrying it:
  // it is a diff-review invariant, not redundant prose, and deleting it loses
  // the rule with CI green.
  //
  // The shape of the residue it protects flips with the base, which is why the
  // reciprocal argument has to be stated for both directions rather than for
  // the divide alone. A cancelling portfolio's netWorth accumulator is
  // -2.7755575615628914e-17. Under an EGP base that DIVIDES by the rate, to
  // -5.551115123125783e-19; under a USD base it MULTIPLIES, to
  // -1.3877787807814457e-15. Both round to -0, and the normalisation below
  // maps that to +0. Feed the already-normalised value in and both land on +0
  // before `roundMoney` ever sees them, which makes the suite's negative-zero
  // assertion on the foreign figure pass no matter what the guard does.
  //
  // `undefined` when the rate is unusable, never `?? 0` and never a substituted
  // rate: `formatAmount(0)` renders a wrong number rather than an absent one.
  const foreignCurrency = foreignCurrencyFor(baseCurrency);
  const assetsForeign = rateUsable
    ? convertCurrency({ amount: assets, from: baseCurrency, to: foreignCurrency, rate })
    : undefined;
  const netWorthForeign = rateUsable
    ? convertCurrency({ amount: netWorth, from: baseCurrency, to: foreignCurrency, rate })
    : undefined;

  // `normalizeNegativeZero` is the LAST operation before any of these reaches a
  // formatter — `Intl.NumberFormat` renders `-0` as "-0".
  return {
    kind: 'amount',
    assets: normalizeNegativeZero(roundMoney(assets)),
    liabilities: normalizeNegativeZero(roundMoney(liabilities)),
    netWorth: normalizeNegativeZero(roundMoney(netWorth)),
    assetsForeign:
      assetsForeign === undefined ? undefined : normalizeNegativeZero(roundMoney(assetsForeign)),
    netWorthForeign:
      netWorthForeign === undefined
        ? undefined
        : normalizeNegativeZero(roundMoney(netWorthForeign)),
  };
}

export function groupAccountsByType(accounts: Account[]): Partial<Record<AccountType, Account[]>> {
  const groups: Partial<Record<AccountType, Account[]>> = {};
  for (const a of accounts) {
    groups[a.type] ??= [];
    groups[a.type]!.push(a);
  }
  return groups;
}

export interface AccountRow {
  id: string;
  name: string;
  balance: number;
}

export interface LiquidityBreakdown {
  liquid: number;
  liquidCount: number;
  liquidAccounts: AccountRow[];
  reserve: number;
  reserveCount: number;
  reserveAccounts: AccountRow[];
}

const LIQUID_TYPES: ReadonlySet<AccountType> = new Set([
  AccountType.Bank,
  AccountType.SmartWallet,
  AccountType.PhysicalWallet,
]);

const RESERVE_TYPES: ReadonlySet<AccountType> = new Set([AccountType.PhysicalSavings]);

export function computeLiquidityBreakdown(
  accounts: Account[],
  rate: number,
  baseCurrency: Currency,
): LiquidityBreakdown {
  let liquid = 0;
  let reserve = 0;
  const liquidAccounts: AccountRow[] = [];
  const reserveAccounts: AccountRow[] = [];

  for (const a of accounts) {
    if (a.is_archived) continue;
    // Rounded per value on `computeNetWorth`'s contract, and converted through
    // the same `convertCurrency`. The breakdown sheet renders these rows
    // directly beneath that function's totals, all at the base currency's
    // decimals, so an unrounded 380.4951 here beside a rounded 380.50 there is
    // 380 and 381 on one screen for one account.
    const balance = roundMoney(
      convertCurrency({ amount: a.current_balance, from: a.currency, to: baseCurrency, rate }),
    );
    if (LIQUID_TYPES.has(a.type)) {
      liquid += balance;
      liquidAccounts.push({ id: a.id, name: a.name, balance });
    } else if (RESERVE_TYPES.has(a.type)) {
      reserve += balance;
      reserveAccounts.push({ id: a.id, name: a.name, balance });
    }
  }

  liquidAccounts.sort((a, b) => b.balance - a.balance);
  reserveAccounts.sort((a, b) => b.balance - a.balance);

  // Rounded once at the sum, completing `computeNetWorth`'s round-then-sum
  // contract rather than stopping half way through it. Ten 0.05 EGP wallets
  // accumulate to 0.49999999999999994, which the sheet's assets header renders
  // as "1" (it reads the rounded `assets`) and this tier legend rendered as
  // "0" directly beneath it.
  return {
    liquid: roundMoney(liquid),
    liquidCount: liquidAccounts.length,
    liquidAccounts,
    reserve: roundMoney(reserve),
    reserveCount: reserveAccounts.length,
    reserveAccounts,
  };
}

export interface LiabilityRow extends AccountRow {
  statementDueDay: number | null;
}

export function computeLiabilitiesBreakdown(
  accounts: Account[],
  rate: number,
  baseCurrency: Currency,
): LiabilityRow[] {
  const rows: LiabilityRow[] = [];
  for (const a of accounts) {
    if (a.is_archived) continue;
    if (a.type !== AccountType.CreditCard) continue;
    // Rounded per value and converted through `convertCurrency`, same contract
    // and same reason as `computeLiquidityBreakdown` above.
    const balance = roundMoney(
      convertCurrency({ amount: a.current_balance, from: a.currency, to: baseCurrency, rate }),
    );
    rows.push({
      id: a.id,
      name: a.name,
      balance,
      statementDueDay: a.statement_due_day ?? null,
    });
  }
  rows.sort((a, b) => b.balance - a.balance);
  return rows;
}

export interface DashboardMonthFacts {
  totals: { incomeEgp: number; expenseEgp: number; netEgp: number };
  spend: { totalEgp: number; usdNative: number; count: number };
}

export interface ReducedDashboardTransactionFacts {
  currentMonth: DashboardMonthFacts;
  previousMonth: DashboardMonthFacts;
  currentCategorySpendEgp: Record<string, number>;
}

export function emptyDashboardMonthFacts(): DashboardMonthFacts {
  return {
    totals: { incomeEgp: 0, expenseEgp: 0, netEgp: 0 },
    spend: { totalEgp: 0, usdNative: 0, count: 0 },
  };
}

function addTransactionFact(target: DashboardMonthFacts, row: DashboardTransactionFactRow): void {
  target.totals.incomeEgp += row.income_egp;
  target.totals.expenseEgp += row.expense_egp;
  target.spend.usdNative += row.usd_native;
  target.spend.count += row.transaction_count;
}

function finishTransactionFacts(facts: DashboardMonthFacts): void {
  facts.totals.netEgp = facts.totals.incomeEgp - facts.totals.expenseEgp;
  facts.spend.totalEgp = facts.totals.expenseEgp;
}

export function reduceDashboardTransactionFacts(
  rows: DashboardTransactionFactRow[],
  currentYearMonth: string,
  previousYearMonth: string,
): ReducedDashboardTransactionFacts {
  const currentMonth = emptyDashboardMonthFacts();
  const previousMonth = emptyDashboardMonthFacts();
  const currentCategorySpendEgp: Record<string, number> = {};

  for (const row of rows) {
    if (row.year_month === currentYearMonth) {
      addTransactionFact(currentMonth, row);
      if (row.category_id !== null) {
        currentCategorySpendEgp[row.category_id] =
          (currentCategorySpendEgp[row.category_id] ?? 0) + row.expense_egp;
      }
    } else if (row.year_month === previousYearMonth) {
      addTransactionFact(previousMonth, row);
    }
  }

  finishTransactionFacts(currentMonth);
  finishTransactionFacts(previousMonth);

  return { currentMonth, previousMonth, currentCategorySpendEgp };
}

export function buildDashboardBudgetSummary(
  limits: DashboardBudgetLimitRow[],
  categorySpendEgp: Record<string, number>,
): BudgetDashboardSummaryVM {
  let budgeted = 0;
  let spent = 0;
  const categories = new Set<string>();

  for (const limit of limits) {
    budgeted += limit.limit_amount;
    spent += Math.max(categorySpendEgp[limit.category_id] ?? 0, 0);
    categories.add(limit.category_id);
  }

  return {
    budgeted,
    spent,
    left: budgeted - spent,
    pct: budgeted > 0 ? spent / budgeted : 0,
    categoryCount: categories.size,
  };
}

export function computeDashboardAccountCounts(accounts: Account[]): {
  assets: number;
  liabilities: number;
} {
  let assets = 0;
  let liabilities = 0;

  for (const account of accounts) {
    if (account.is_archived) continue;
    if (account.type === AccountType.CreditCard) liabilities++;
    else assets++;
  }

  return { assets, liabilities };
}

export function computeDashboardSpendDeltaPct(
  currentEgp: number,
  previousEgp: number,
): number | null {
  if (previousEgp <= 0) return null;
  return Math.round(((currentEgp - previousEgp) / previousEgp) * 100);
}

export function computeDashboardCommitmentSummary(payments: CommitmentPayment[]): {
  counts: {
    paid: number;
    overdue: number;
    due: number;
    upcoming: number;
    skipped: number;
    total: number;
  };
  totalsByCurrency: Map<Currency, number>;
} {
  const counts = { paid: 0, overdue: 0, due: 0, upcoming: 0, skipped: 0, total: 0 };
  const totalsByCurrency = new Map<Currency, number>();

  for (const payment of payments) {
    switch (payment.status) {
      case CommitmentPaymentStatus.Paid:
        counts.paid++;
        break;
      case CommitmentPaymentStatus.Overdue:
        counts.overdue++;
        break;
      case CommitmentPaymentStatus.Due:
        counts.due++;
        break;
      case CommitmentPaymentStatus.Upcoming:
        counts.upcoming++;
        break;
      case CommitmentPaymentStatus.Skipped:
        counts.skipped++;
        continue;
    }

    counts.total++;
    const amount =
      payment.status === CommitmentPaymentStatus.Paid
        ? (payment.amount_paid ?? payment.amount_due)
        : payment.amount_due;
    if (amount !== null) {
      totalsByCurrency.set(
        payment.currency,
        (totalsByCurrency.get(payment.currency) ?? 0) + amount,
      );
    }
  }

  return { counts, totalsByCurrency };
}
