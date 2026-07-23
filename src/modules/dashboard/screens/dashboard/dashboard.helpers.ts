import { AccountType, CommitmentPaymentStatus, Currency } from '@/constants/enums';
import type { Account } from '@/modules/accounts/entities/account.entity';
import type { BudgetDashboardSummaryVM } from '@/modules/budget/screens/budget/budget.helpers';
import type { CommitmentPayment } from '@/modules/commitments/entities/commitment_payment.entity';
import type {
  DashboardBudgetLimitRow,
  DashboardTransactionFactRow,
} from '@/modules/dashboard/database/dashboard_snapshot';

export interface NetWorthResult {
  assetsEgp: number;
  assetsUsd: number;
  liabilitiesEgp: number;
  netWorthEgp: number;
  netWorthUsd: number;
}

export function computeNetWorth(accounts: Account[], rate: number): NetWorthResult {
  let assetsEgp = 0;
  let liabilitiesEgp = 0;

  for (const a of accounts) {
    const balanceEgp = a.currency === Currency.USD ? a.current_balance * rate : a.current_balance;
    if (a.type === AccountType.CreditCard) {
      liabilitiesEgp += balanceEgp;
    } else {
      assetsEgp += balanceEgp;
    }
  }

  const netWorthEgp = assetsEgp - liabilitiesEgp;
  const assetsUsd = rate > 0 ? assetsEgp / rate : 0;
  const netWorthUsd = rate > 0 ? netWorthEgp / rate : 0;
  return { assetsEgp, assetsUsd, liabilitiesEgp, netWorthEgp, netWorthUsd };
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
    const balanceEgp = a.currency === Currency.USD ? a.current_balance * rate : a.current_balance;
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

  return {
    liquidEgp,
    liquidCount: liquidAccounts.length,
    liquidAccounts,
    reserveEgp,
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
    const balanceEgp = a.currency === Currency.USD ? a.current_balance * rate : a.current_balance;
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
