import { AccountType, CommitmentPaymentStatus, Currency } from '@/constants/enums';
import {
  assertSupportedCurrency,
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
 * **EGP is the base currency — a precondition, not an assumption.** The
 * dashboard has no base at all: `base_currency` is written at
 * `onboarding.repository.ts:34` and read nowhere on this path, this function
 * takes no base parameter, and every output field is named `*Egp`. So USD
 * balances MULTIPLY by the rate (`exchange_rate` is EGP per USD) and the two
 * `*Usd` fields divide. Adding a divide branch or a `baseCurrency` parameter
 * would create a path no supported input reaches; supporting a USD base is
 * audit M28's work and out of scope for #255.
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
 * A rate counts as usable only when it carries a verification marker AND is
 * finite AND positive (`isRateUsable`); it is REQUIRED only when at least one
 * non-archived account is foreign. Required and unusable is the `rate-needed`
 * outcome — never a substituted rate, a zero, or a partial total.
 *
 * Whether the EGP total can be stated and whether the `~USD` equivalent can be
 * stated are two questions with two answers. The EGP total needs a rate only
 * when something is foreign; the `~USD` equivalent needs a verified rate ALWAYS,
 * because the conversion is the whole point of it. So on the amount path
 * `assetsUsd` and `netWorthUsd` are `undefined` exactly when the rate is
 * unusable.
 */
export function computeNetWorth(input: NetWorthInput): DashboardNetWorth {
  const { accounts, rate, rateUpdatedAt } = input;

  // Archived rows are dropped BEFORE every other step, the foreign count
  // included: an archived USD wallet must not force a refusal on a portfolio
  // that has nothing left to convert.
  const activeAccounts = accounts.filter((a) => !a.is_archived);
  for (const a of activeAccounts) {
    assertSupportedCurrency(a.currency);
  }

  // `Currency.EGP` is named here rather than taken as a parameter: EGP base is
  // this function's documented precondition (above), not a choice.
  const foreignCount = countForeignAccounts(activeAccounts, Currency.EGP);
  const rateUsable = isRateUsable(rate, rateUpdatedAt);
  if (foreignCount >= 1 && !rateUsable) {
    return { kind: 'rate-needed', foreignCount };
  }

  let assetsEgp = 0;
  let liabilitiesEgp = 0;
  // Accumulated separately rather than derived as `assetsEgp - liabilitiesEgp`:
  // subtracting two independently-rounded group totals cannot produce the `-0`
  // that a cancelling portfolio really lands on, and the two agree at 2 dp
  // everywhere else.
  let netWorthEgp = 0;

  for (const a of activeAccounts) {
    const converted = a.currency === Currency.USD ? a.current_balance * rate : a.current_balance;
    // Round each converted value, then round once more at the sum — never
    // sum-then-round: 0.502 USD at rate 2 is 1.004, so two of them are 2.00
    // round-then-sum and 2.01 sum-then-round.
    const rounded = roundMoney(converted);
    const sign = resolveAccountAggregationSign(a.type);

    if (sign === 1) {
      assetsEgp += rounded;
    } else {
      // `liabilitiesEgp` stays a POSITIVE magnitude — `stat_cards.tsx` and the
      // breakdown sheet both render it as one, and adopting the resolver
      // changes which bucket a row lands in, not this field's polarity.
      liabilitiesEgp += rounded;
    }
    netWorthEgp += sign * rounded;
  }

  // Both numerators are the RAW accumulators, before the rounding and
  // normalisation below: a cancelling portfolio's netWorthEgp accumulator is
  // -2.7755575615628914e-17, which divides to -5.551115123125783e-19 and
  // rounds to -0. Dividing the already-normalised value would yield +0 and
  // make the suite's negative-zero assertion unfalsifiable.
  //
  // `undefined` when the rate is unusable, never `?? 0` and never a substituted
  // rate: `formatAmount(0)` renders a wrong number rather than an absent one.
  const assetsUsd = rateUsable ? assetsEgp / rate : undefined;
  const netWorthUsd = rateUsable ? netWorthEgp / rate : undefined;

  // `normalizeNegativeZero` is the LAST operation before any of these reaches a
  // formatter — `Intl.NumberFormat` renders `-0` as "-0".
  return {
    kind: 'amount',
    assetsEgp: normalizeNegativeZero(roundMoney(assetsEgp)),
    liabilitiesEgp: normalizeNegativeZero(roundMoney(liabilitiesEgp)),
    netWorthEgp: normalizeNegativeZero(roundMoney(netWorthEgp)),
    assetsUsd: assetsUsd === undefined ? undefined : normalizeNegativeZero(roundMoney(assetsUsd)),
    netWorthUsd:
      netWorthUsd === undefined ? undefined : normalizeNegativeZero(roundMoney(netWorthUsd)),
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
  balanceEgp: number;
}

export interface LiquidityBreakdown {
  liquidEgp: number;
  liquidCount: number;
  liquidAccounts: AccountRow[];
  reserveEgp: number;
  reserveCount: number;
  reserveAccounts: AccountRow[];
}

const LIQUID_TYPES: ReadonlySet<AccountType> = new Set([
  AccountType.Bank,
  AccountType.SmartWallet,
  AccountType.PhysicalWallet,
]);

const RESERVE_TYPES: ReadonlySet<AccountType> = new Set([AccountType.PhysicalSavings]);

export function computeLiquidityBreakdown(accounts: Account[], rate: number): LiquidityBreakdown {
  let liquidEgp = 0;
  let reserveEgp = 0;
  const liquidAccounts: AccountRow[] = [];
  const reserveAccounts: AccountRow[] = [];

  for (const a of accounts) {
    if (a.is_archived) continue;
    // Rounded per value on `computeNetWorth`'s contract. The breakdown sheet
    // renders these rows directly beneath that function's totals, all at zero
    // decimals, so an unrounded 380.4951 here beside a rounded 380.50 there is
    // 380 and 381 on one screen for one account.
    const balanceEgp = roundMoney(
      a.currency === Currency.USD ? a.current_balance * rate : a.current_balance,
    );
    if (LIQUID_TYPES.has(a.type)) {
      liquidEgp += balanceEgp;
      liquidAccounts.push({ id: a.id, name: a.name, balanceEgp });
    } else if (RESERVE_TYPES.has(a.type)) {
      reserveEgp += balanceEgp;
      reserveAccounts.push({ id: a.id, name: a.name, balanceEgp });
    }
  }

  liquidAccounts.sort((a, b) => b.balanceEgp - a.balanceEgp);
  reserveAccounts.sort((a, b) => b.balanceEgp - a.balanceEgp);

  // Rounded once at the sum, completing `computeNetWorth`'s round-then-sum
  // contract rather than stopping half way through it. Ten 0.05 EGP wallets
  // accumulate to 0.49999999999999994, which the sheet's assets header renders
  // as "1" (it reads the rounded `assetsEgp`) and this tier legend rendered as
  // "0" directly beneath it.
  return {
    liquidEgp: roundMoney(liquidEgp),
    liquidCount: liquidAccounts.length,
    liquidAccounts,
    reserveEgp: roundMoney(reserveEgp),
    reserveCount: reserveAccounts.length,
    reserveAccounts,
  };
}

export interface LiabilityRow extends AccountRow {
  statementDueDay: number | null;
}

export function computeLiabilitiesBreakdown(accounts: Account[], rate: number): LiabilityRow[] {
  const rows: LiabilityRow[] = [];
  for (const a of accounts) {
    if (a.is_archived) continue;
    if (a.type !== AccountType.CreditCard) continue;
    // Rounded per value, same contract and same reason as
    // `computeLiquidityBreakdown` above.
    const balanceEgp = roundMoney(
      a.currency === Currency.USD ? a.current_balance * rate : a.current_balance,
    );
    rows.push({
      id: a.id,
      name: a.name,
      balanceEgp: Math.abs(balanceEgp),
      statementDueDay: a.statement_due_day ?? null,
    });
  }
  rows.sort((a, b) => b.balanceEgp - a.balanceEgp);
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
  totalsByCurrency: Map<string, number>;
} {
  const counts = { paid: 0, overdue: 0, due: 0, upcoming: 0, skipped: 0, total: 0 };
  const totalsByCurrency = new Map<string, number>();

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
