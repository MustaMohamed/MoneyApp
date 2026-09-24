import Database from 'better-sqlite3';

import { AccountType, Currency, TransactionType } from '@/constants/enums';
import { MIGRATIONS } from '@/database/migrations';
import type { Account } from '@/modules/accounts/entities/account.entity';
import {
  getBudgetSpendByMonth,
  getCategorySpendByMonth,
  getSpendingPlanSpend,
} from '@/modules/budget/database/budget_stats';
import type { SpendingPlan, SpendingPlanCategory } from '@/modules/budget/entities/budget.entity';
import {
  getDashboardTransactionFactRows,
  resolveDashboardMonthWindow,
} from '@/modules/dashboard/database/dashboard_snapshot';
import {
  getMonthExpenseStats,
  getPeriodTotals,
  getTransactionMonthAggregate,
} from '@/modules/transactions/database/transactions';
import type {
  LedgerAccountSnapshot,
  TransactionPolicyCommand,
  TransactionReportingClass,
  TransactionReportingEffect,
} from '@/modules/transactions/domain/transaction_policy';
import {
  resolveReportingClass,
  resolveReportingEffect,
} from '@/modules/transactions/domain/transaction_policy';
import type { Transaction } from '@/modules/transactions/entities/transaction.entity';
import { bridgeBetterSQLite, getExpoSQLiteTestDatabase } from '@/test_helpers/sqlite';
import { makeTestAccount, makeTestBudget, makeTestTransaction } from '@/test_helpers/transaction';

const MONTH = '2026-05';
const NOW = '2026-05-01T12:00:00.000Z';
const FOOD = 'cat_food';
const SALARY = 'cat_salary';

const ACCOUNTS: Account[] = [
  makeTestAccount({ id: 'acc_bank', name: 'Bank', type: AccountType.Bank, sort_order: 0 }),
  makeTestAccount({ id: 'acc_other', name: 'Savings', type: AccountType.Bank, sort_order: 1 }),
  makeTestAccount({
    id: 'acc_card',
    name: 'Card',
    type: AccountType.CreditCard,
    credit_limit: 5000,
    revolving_balance: 0,
    sort_order: 2,
  }),
  makeTestAccount({
    id: 'acc_usd',
    name: 'Dollars',
    type: AccountType.Bank,
    currency: Currency.USD,
    sort_order: 3,
  }),
];

const BUDGET = makeTestBudget({
  id: 'budget_food',
  category_id: FOOD,
  name: 'Food',
  limit_amount: 1000,
  effective_from: MONTH,
  created_at: NOW,
  updated_at: NOW,
});

const PLAN: SpendingPlan = {
  id: 'plan_may',
  name: 'May plan',
  start_date: '2026-05-01',
  end_date: '2026-05-31',
  total_amount: 2000,
  created_at: NOW,
  updated_at: NOW,
};

const PLAN_CATEGORY: SpendingPlanCategory = {
  plan_id: PLAN.id,
  category_id: FOOD,
  allocated_amount: null,
};

function seedRow(overrides: Partial<Transaction>): Transaction {
  return makeTestTransaction({ created_at: NOW, updated_at: NOW, ...overrides });
}

const TRANSACTIONS: Transaction[] = [
  seedRow({
    id: 'tx_expense',
    type: TransactionType.Expense,
    amount: 300,
    egp_amount: 300,
    account_id: 'acc_bank',
    category_id: FOOD,
    budget_id: BUDGET.id,
    transaction_date: '2026-05-01',
  }),
  seedRow({
    id: 'tx_income',
    type: TransactionType.Income,
    amount: 1000,
    egp_amount: 1000,
    account_id: 'acc_bank',
    category_id: SALARY,
    transaction_date: '2026-05-04',
  }),
  seedRow({
    id: 'tx_card_credit',
    type: TransactionType.Income,
    amount: 150,
    egp_amount: 150,
    account_id: 'acc_card',
    category_id: FOOD,
    budget_id: BUDGET.id,
    transaction_date: '2026-05-10',
  }),
  seedRow({
    id: 'tx_transfer',
    type: TransactionType.Transfer,
    amount: 200,
    egp_amount: 200,
    to_amount: 200,
    account_id: 'acc_bank',
    to_account_id: 'acc_other',
    category_id: null,
    transaction_date: '2026-05-15',
  }),
  seedRow({
    id: 'tx_cc_payment',
    type: TransactionType.CCPayment,
    amount: 400,
    egp_amount: 400,
    to_amount: 400,
    account_id: 'acc_bank',
    to_account_id: 'acc_card',
    category_id: null,
    transaction_date: '2026-05-20',
  }),
  seedRow({
    id: 'tx_usd_expense',
    type: TransactionType.Expense,
    amount: 10,
    currency: Currency.USD,
    exchange_rate: 50,
    egp_amount: 500,
    account_id: 'acc_usd',
    category_id: FOOD,
    budget_id: BUDGET.id,
    transaction_date: '2026-05-31',
  }),
];

const SEEDED_ROW_BY_CLASS = {
  expense: 'tx_expense',
  income: 'tx_income',
  card_credit: 'tx_card_credit',
  transfer: 'tx_transfer',
  cc_payment: 'tx_cc_payment',
} satisfies Record<TransactionReportingClass, string>;

function snapshotOf(accountId: string): LedgerAccountSnapshot {
  const account = ACCOUNTS.find((candidate) => candidate.id === accountId);
  if (!account) throw new Error(`unseeded account ${accountId}`);
  return {
    id: account.id,
    type: account.type,
    currency: account.currency,
    currentBalance: account.current_balance,
    revolvingBalance: account.revolving_balance,
    minimumPayment: account.minimum_payment,
  };
}

function commandOf(row: Transaction): TransactionPolicyCommand {
  return {
    type: row.type,
    amount: row.amount,
    egpAmount: row.egp_amount,
    toAmount: row.to_amount,
    minimumPaymentSnapshot: row.minimum_payment_snapshot,
    source: snapshotOf(row.account_id),
    destination: row.to_account_id === null ? undefined : snapshotOf(row.to_account_id),
  };
}

interface FoldedRow {
  row: Transaction;
  effect: TransactionReportingEffect;
  reportingClass: TransactionReportingClass;
  outSign: number;
}

const FOLDED: FoldedRow[] = TRANSACTIONS.map((row) => {
  const effect = resolveReportingEffect(commandOf(row));
  return {
    row,
    effect,
    reportingClass: resolveReportingClass(row.type, snapshotOf(row.account_id).type),
    outSign: Math.sign(effect.spendingEgp),
  };
});

function fold(
  pick: (entry: FoldedRow) => number,
  keep: (entry: FoldedRow) => boolean = () => true,
) {
  return FOLDED.filter(keep).reduce((total, entry) => total + pick(entry), 0);
}

const expectedIn = fold((entry) => entry.effect.incomeEgp);
const expectedOut = fold((entry) => entry.effect.spendingEgp);
const expectedNative = (currency: Currency) =>
  fold(
    (entry) => entry.outSign * entry.row.amount,
    (entry) => entry.row.currency === currency,
  );
const expectedCount = FOLDED.filter(
  (entry) => entry.reportingClass === 'expense' || entry.reportingClass === 'card_credit',
).length;
const expectedFoodSpend = fold(
  (entry) => entry.effect.budgetSpendingEgp,
  (entry) => entry.row.category_id === FOOD,
);
const expectedBudgetSpend = fold(
  (entry) => entry.effect.budgetSpendingEgp,
  (entry) => entry.row.budget_id === BUDGET.id,
);

const sqlite = getExpoSQLiteTestDatabase();
const db = sqlite.database;
let realDb: ReturnType<typeof Database>;

function insertRow(table: string, record: object): void {
  const columns = Object.keys(record);
  realDb
    .prepare(
      `INSERT INTO ${table} (${columns.join(',')}) VALUES (${columns.map((column) => `@${column}`).join(',')})`,
    )
    .run(record);
}

beforeAll(() => {
  realDb = new Database(':memory:');
  realDb.pragma('foreign_keys = ON');
  realDb.exec(MIGRATIONS.map((migration) => migration.up).join('\n'));
  for (const account of ACCOUNTS) insertRow('accounts', account);
  insertRow('budgets', BUDGET);
  insertRow('spending_plans', PLAN);
  insertRow('spending_plan_categories', PLAN_CATEGORY);
  for (const transaction of TRANSACTIONS) insertRow('transactions', transaction);
  bridgeBetterSQLite(sqlite, realDb);
});

afterAll(() => {
  realDb.close();
  sqlite.reset();
});

describe('every query on the reporting sign agrees with the domain classifier', () => {
  it('seeds one row of every reporting class', () => {
    expect(new Set(FOLDED.map((entry) => entry.reportingClass))).toEqual(
      new Set(Object.keys(SEEDED_ROW_BY_CLASS)),
    );
    for (const [reportingClass, rowId] of Object.entries(SEEDED_ROW_BY_CLASS)) {
      expect(FOLDED.find((entry) => entry.row.id === rowId)?.reportingClass).toBe(reportingClass);
    }
    expect(expectedFoodSpend).toBeGreaterThan(0);
  });

  it('month expense stats', async () => {
    const stats = await getMonthExpenseStats(db, MONTH);

    expect(stats.totalEgp).toBe(expectedOut);
    expect(stats.egpNative).toBe(expectedNative(Currency.EGP));
    expect(stats.usdNative).toBe(expectedNative(Currency.USD));
    expect(stats.count).toBe(expectedCount);
  });

  it('month totals', async () => {
    const totals = await getPeriodTotals(db, { from: '2026-05-01', to: '2026-05-31' });

    expect(totals.incomeEgp).toBe(expectedIn);
    expect(totals.expenseEgp).toBe(expectedOut);
  });

  it('month aggregate', async () => {
    const aggregate = await getTransactionMonthAggregate(db, {
      dateFrom: '2026-05-01',
      dateTo: '2026-05-31',
    });
    const dates = [...new Set(TRANSACTIONS.map((row) => row.transaction_date))].sort().reverse();

    expect(aggregate.scoped.incomeEgp).toBe(expectedIn);
    expect(aggregate.scoped.expenseEgp).toBe(expectedOut);
    expect(aggregate.matchNetEgp).toBe(expectedIn - expectedOut);
    expect(aggregate.matchCount).toBe(TRANSACTIONS.length);
    expect(aggregate.days).toEqual(
      dates.map((date) => ({
        date,
        netEgp: fold(
          (entry) => entry.effect.incomeEgp - entry.effect.spendingEgp,
          (entry) => entry.row.transaction_date === date,
        ),
        count: FOLDED.filter((entry) => entry.row.transaction_date === date).length,
      })),
    );
  });

  it('category spend', async () => {
    const spend = await getCategorySpendByMonth(db, [MONTH]);

    expect(spend[FOOD]?.[MONTH]).toBe(expectedFoodSpend);
  });

  it('budget spend', async () => {
    const spend = await getBudgetSpendByMonth(db, [MONTH]);

    expect(spend[BUDGET.id]).toBe(expectedBudgetSpend);
  });

  it('spending-plan spend', async () => {
    const spend = await getSpendingPlanSpend(db, [PLAN.id]);

    expect(spend[PLAN.id]?.[FOOD]).toBe(expectedFoodSpend);
  });

  it('dashboard month facts', async () => {
    const rows = await getDashboardTransactionFactRows(db, resolveDashboardMonthWindow(MONTH));
    const month = rows.filter((row) => row.year_month === MONTH);
    const sum = (pick: (row: (typeof month)[number]) => number) =>
      month.reduce((total, row) => total + pick(row), 0);

    expect(sum((row) => row.income_egp)).toBe(expectedIn);
    expect(sum((row) => row.expense_egp)).toBe(expectedOut);
    expect(sum((row) => row.usd_native)).toBe(expectedNative(Currency.USD));
    expect(sum((row) => row.transaction_count)).toBe(expectedCount);
  });
});
