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

/** Sums into `baseCurrency`, the reporting currency, not the EGP storage currency. */
export function computeNetWorth(input: NetWorthInput): DashboardNetWorth {
  const { accounts, baseCurrency, rate } = input;

  assertSupportedCurrency(baseCurrency);
  // Archived rows drop before the foreign count, so they cannot force a refusal.
  const activeAccounts = accounts.filter((a) => !a.is_archived);
  for (const a of activeAccounts) {
    assertSupportedCurrency(a.currency);
  }

  const foreignCount = countForeignAccounts(activeAccounts, baseCurrency);
  // Pass `input` whole so a field added to `RateProvenance` is not dropped.
  const rateUsable = isRateUsable(input);
  if (foreignCount >= 1 && !rateUsable) {
    return { kind: 'rate-needed', foreignCount };
  }

  let assets = 0;
  let liabilities = 0;
  // Summed separately: subtracting the two rounded totals cannot yield `-0`.
  let netWorth = 0;

  for (const a of activeAccounts) {
    const converted = convertCurrency({
      amount: a.current_balance,
      from: a.currency,
      to: baseCurrency,
      rate,
    });
    // Round each converted value, then round once at the sum; never sum-then-round.
    const rounded = roundMoney(converted);
    const sign = resolveAccountAggregationSign(a.type);

    if (sign === 1) {
      assets += rounded;
    } else {
      // Owed-frame total: positive when cards are owed, negative when every card is in credit.
      liabilities += rounded;
    }
    netWorth += sign * rounded;
  }

  // Convert the raw accumulators once here, before rounding or negative-zero normalisation.
  const foreignCurrency = foreignCurrencyFor(baseCurrency);
  const assetsForeign = rateUsable
    ? convertCurrency({ amount: assets, from: baseCurrency, to: foreignCurrency, rate })
    : undefined;
  const netWorthForeign = rateUsable
    ? convertCurrency({ amount: netWorth, from: baseCurrency, to: foreignCurrency, rate })
    : undefined;

  // `Intl.NumberFormat` renders `-0` as "-0", so normalise last before returning.
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
    // Rounded per value, as `computeNetWorth` does, so the sheet's rows match its totals.
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

  // Rounded once at the sum, completing the round-then-sum contract. Normalised the same way
  // computeNetWorth's aggregates are (line 77-79): a float-noise sum can round to an exact `-0`,
  // which `formatAmount` prints as Intl's "-0" (#332, #371's residual). The per-account `balance`
  // above is untouched — its own `-0` (a sub-cent overdraft) stays a format-layer concern.
  return {
    liquid: normalizeNegativeZero(roundMoney(liquid)),
    liquidCount: liquidAccounts.length,
    liquidAccounts,
    reserve: normalizeNegativeZero(roundMoney(reserve)),
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
    // Rounded per value, same contract as `computeLiquidityBreakdown`.
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
  // Rounded and negative-zero-normalized before either leg is used for sign, delta, or display
  // (#332) — same two-step as computeNetWorth (account_aggregation.ts:77-79). A credit-card refund
  // month can net negative here; the sign is a domain state (spent vs refunded), not a display bug.
  facts.spend.totalEgp = normalizeNegativeZero(roundMoney(facts.totals.expenseEgp));
  facts.spend.usdNative = normalizeNegativeZero(roundMoney(facts.spend.usdNative));
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
