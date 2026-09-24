import { AccountType, Currency, TransactionType } from '@/constants/enums';
import type { Account } from '@/modules/accounts/entities/account.entity';
import type {
  TransactionAggregateQuery,
  TransactionMonthAggregate,
} from '@/modules/transactions/database/transactions';
import { getTransactionMonthAggregate } from '@/modules/transactions/database/transactions';
import type { Transaction } from '@/modules/transactions/entities/transaction.entity';
import { bridgeBetterSQLite, getExpoSQLiteTestDatabase } from '@/test_helpers/sqlite';
import {
  createSeededDatabase,
  explainQueryPlan,
  type RealSQLiteDatabase,
} from '@/test_helpers/sqlite_fixtures';
import { makeTestAccount, makeTestTransaction } from '@/test_helpers/transaction';

const NOW = '2026-05-01T12:00:00.000Z';
const MAY = { dateFrom: '2026-05-01', dateTo: '2026-05-31' };
const AUGUST = { dateFrom: '2026-08-01', dateTo: '2026-08-31' };
const JUNE = { dateFrom: '2026-06-01', dateTo: '2026-06-30' };

const ACCOUNTS: Account[] = [
  makeTestAccount({ id: 'acc_bank', name: 'Current', type: AccountType.Bank, sort_order: 0 }),
  makeTestAccount({ id: 'acc_other', name: 'Savings', type: AccountType.Bank, sort_order: 1 }),
  makeTestAccount({
    id: 'acc_card',
    name: 'Card',
    type: AccountType.CreditCard,
    credit_limit: 50000,
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

function seedRow(overrides: Partial<Transaction>): Transaction {
  return makeTestTransaction({
    account_id: 'acc_bank',
    category_id: 'cat_food',
    created_at: NOW,
    updated_at: NOW,
    ...overrides,
  });
}

const TRANSACTIONS: Transaction[] = [
  seedRow({
    id: 'coffee_beans',
    amount: 1240,
    egp_amount: 1240,
    note: 'Coffee beans',
    transaction_date: '2026-05-03',
  }),
  seedRow({
    id: 'coffee_shop',
    amount: 860,
    egp_amount: 860,
    note: 'Coffee shop',
    transaction_date: '2026-05-03',
  }),
  seedRow({
    id: 'salary',
    type: TransactionType.Income,
    amount: 22300,
    egp_amount: 22300,
    category_id: 'cat_salary',
    note: 'Salary',
    transaction_date: '2026-05-10',
  }),
  seedRow({
    id: 'rent',
    amount: 8000,
    egp_amount: 8000,
    category_id: 'cat_housing',
    note: 'Rent',
    transaction_date: '2026-05-10',
  }),
  seedRow({
    id: 'transfer',
    type: TransactionType.Transfer,
    amount: 5000,
    egp_amount: 5000,
    to_amount: 5000,
    to_account_id: 'acc_other',
    category_id: null,
    transaction_date: '2026-05-10',
  }),
  seedRow({
    id: 'card_payment',
    type: TransactionType.CCPayment,
    amount: 2000,
    egp_amount: 2000,
    to_amount: 2000,
    to_account_id: 'acc_card',
    category_id: null,
    transaction_date: '2026-05-15',
  }),
  seedRow({
    id: 'card_credit',
    type: TransactionType.Income,
    amount: 150,
    egp_amount: 150,
    account_id: 'acc_card',
    transaction_date: '2026-05-20',
  }),
  seedRow({
    id: 'usd_expense',
    amount: 10,
    currency: Currency.USD,
    exchange_rate: 50,
    egp_amount: 500,
    account_id: 'acc_usd',
    transaction_date: '2026-05-25',
  }),
  seedRow({
    id: 'savings_expense',
    amount: 300,
    egp_amount: 300,
    account_id: 'acc_other',
    transaction_date: '2026-05-28',
  }),
  seedRow({ id: 'aug_bank', amount: 9400, egp_amount: 9400, transaction_date: '2026-08-12' }),
  seedRow({
    id: 'aug_savings',
    amount: 7500,
    egp_amount: 7500,
    account_id: 'acc_other',
    transaction_date: '2026-08-20',
  }),
];

const MAY_SCOPED = { incomeEgp: 22300, expenseEgp: 10750, netEgp: 11550 };

const sqlite = getExpoSQLiteTestDatabase();
const db = sqlite.database;
let realDb: RealSQLiteDatabase;

beforeAll(() => {
  realDb = createSeededDatabase([
    ['accounts', ACCOUNTS],
    ['transactions', TRANSACTIONS],
  ]);
  bridgeBetterSQLite(sqlite, realDb);
});

afterAll(() => {
  realDb.close();
  sqlite.reset();
});

const sum = (values: number[]) => values.reduce((total, value) => total + value, 0);

describe('getTransactionMonthAggregate — the unfiltered month', () => {
  let aggregate: TransactionMonthAggregate;

  beforeAll(async () => {
    aggregate = await getTransactionMonthAggregate(db, MAY);
  });

  it('returns every day with a row, newest first, with its signed net and count', () => {
    expect(aggregate.days).toEqual([
      { date: '2026-05-28', netEgp: -300, count: 1 },
      { date: '2026-05-25', netEgp: -500, count: 1 },
      { date: '2026-05-20', netEgp: 150, count: 1 },
      { date: '2026-05-15', netEgp: 0, count: 1 },
      { date: '2026-05-10', netEgp: 14300, count: 3 },
      { date: '2026-05-03', netEgp: -2100, count: 2 },
    ]);
  });

  it('two expenses of 1,240 and 860 read 2 rows, −2,100 (frame A3)', () => {
    expect(aggregate.days.find((day) => day.date === '2026-05-03')).toEqual({
      date: '2026-05-03',
      netEgp: -2100,
      count: 2,
    });
  });

  it('a salary, a rent and a transfer read +14,300 over 3 rows (frame A2)', () => {
    expect(aggregate.days.find((day) => day.date === '2026-05-10')).toEqual({
      date: '2026-05-10',
      netEgp: 14300,
      count: 3,
    });
  });

  it('a day holding one card payment reads 0 over 1 row', () => {
    expect(aggregate.days.find((day) => day.date === '2026-05-15')).toEqual({
      date: '2026-05-15',
      netEgp: 0,
      count: 1,
    });
  });

  it('a card credit reduces Out and a USD expense sums its stored EGP amount', () => {
    expect(aggregate.days.find((day) => day.date === '2026-05-20')?.netEgp).toBe(150);
    expect(aggregate.days.find((day) => day.date === '2026-05-25')?.netEgp).toBe(-500);
  });

  it('the tally is the fold over the days', () => {
    expect(aggregate.matchCount).toBe(9);
    expect(aggregate.matchNetEgp).toBe(11550);
    expect(aggregate.matchCount).toBe(sum(aggregate.days.map((day) => day.count)));
    expect(aggregate.matchNetEgp).toBe(sum(aggregate.days.map((day) => day.netEgp)));
  });

  it('the scoped totals are Out, In and Net over the month, and agree with the tally', () => {
    expect(aggregate.scoped).toEqual(MAY_SCOPED);
    expect(aggregate.scoped.netEgp).toBe(aggregate.matchNetEgp);
  });
});

describe('getTransactionMonthAggregate — scoped to one account', () => {
  it.each([
    {
      accountId: 'acc_bank',
      days: [
        { date: '2026-05-15', netEgp: 0, count: 1 },
        { date: '2026-05-10', netEgp: 14300, count: 3 },
        { date: '2026-05-03', netEgp: -2100, count: 2 },
      ],
      matchCount: 6,
      matchNetEgp: 12200,
      scoped: { incomeEgp: 22300, expenseEgp: 10100, netEgp: 12200 },
    },
    {
      accountId: 'acc_other',
      days: [
        { date: '2026-05-28', netEgp: -300, count: 1 },
        { date: '2026-05-10', netEgp: 0, count: 1 },
      ],
      matchCount: 2,
      matchNetEgp: -300,
      scoped: { incomeEgp: 0, expenseEgp: 300, netEgp: -300 },
    },
    {
      accountId: 'acc_card',
      days: [
        { date: '2026-05-20', netEgp: 150, count: 1 },
        { date: '2026-05-15', netEgp: 0, count: 1 },
      ],
      matchCount: 2,
      matchNetEgp: 150,
      scoped: { incomeEgp: 0, expenseEgp: -150, netEgp: 150 },
    },
    {
      accountId: 'acc_usd',
      days: [{ date: '2026-05-25', netEgp: -500, count: 1 }],
      matchCount: 1,
      matchNetEgp: -500,
      scoped: { incomeEgp: 0, expenseEgp: 500, netEgp: -500 },
    },
  ])('$accountId: every figure is the month over that account’s rows alone', async (expected) => {
    const aggregate = await getTransactionMonthAggregate(db, {
      ...MAY,
      accountIds: [expected.accountId],
    });

    expect(aggregate).toEqual({
      days: expected.days,
      matchCount: expected.matchCount,
      matchNetEgp: expected.matchNetEgp,
      scoped: expected.scoped,
    });
  });
});

describe('getTransactionMonthAggregate — the rows’ filters narrow days and tally, never the hero', () => {
  it('type expense', async () => {
    const aggregate = await getTransactionMonthAggregate(db, {
      ...MAY,
      type: TransactionType.Expense,
    });

    expect(aggregate.days).toEqual([
      { date: '2026-05-28', netEgp: -300, count: 1 },
      { date: '2026-05-25', netEgp: -500, count: 1 },
      { date: '2026-05-10', netEgp: -8000, count: 1 },
      { date: '2026-05-03', netEgp: -2100, count: 2 },
    ]);
    expect(aggregate.matchCount).toBe(5);
    expect(aggregate.matchNetEgp).toBe(-10900);
    expect(aggregate.scoped).toEqual(MAY_SCOPED);
  });

  it('a search that matches two rows on one day', async () => {
    const aggregate = await getTransactionMonthAggregate(db, { ...MAY, search: 'coffee' });

    expect(aggregate.days).toEqual([{ date: '2026-05-03', netEgp: -2100, count: 2 }]);
    expect(aggregate.matchCount).toBe(2);
    expect(aggregate.matchNetEgp).toBe(-2100);
    expect(aggregate.scoped).toEqual(MAY_SCOPED);
  });

  it('a category', async () => {
    const aggregate = await getTransactionMonthAggregate(db, {
      ...MAY,
      categoryIds: ['cat_housing'],
    });

    expect(aggregate.days).toEqual([{ date: '2026-05-10', netEgp: -8000, count: 1 }]);
    expect(aggregate.matchCount).toBe(1);
    expect(aggregate.matchNetEgp).toBe(-8000);
    expect(aggregate.scoped).toEqual(MAY_SCOPED);
  });

  it('an amount range in its currency', async () => {
    const aggregate = await getTransactionMonthAggregate(db, {
      ...MAY,
      amountMin: 1000,
      amountCurrency: Currency.EGP,
    });

    expect(aggregate.days).toEqual([
      { date: '2026-05-15', netEgp: 0, count: 1 },
      { date: '2026-05-10', netEgp: 14300, count: 3 },
      { date: '2026-05-03', netEgp: -1240, count: 1 },
    ]);
    expect(aggregate.matchCount).toBe(5);
    expect(aggregate.matchNetEgp).toBe(13060);
    expect(aggregate.scoped).toEqual(MAY_SCOPED);
  });
});

describe('getTransactionMonthAggregate — the previous month and the empty month', () => {
  it('the previous month with the accounts filter alone yields its Out scoped to that bank (frame A2)', async () => {
    const bank = await getTransactionMonthAggregate(db, { ...AUGUST, accountIds: ['acc_bank'] });
    const everyAccount = await getTransactionMonthAggregate(db, AUGUST);

    expect(bank.scoped).toEqual({ incomeEgp: 0, expenseEgp: 9400, netEgp: -9400 });
    expect(everyAccount.scoped).toEqual({ incomeEgp: 0, expenseEgp: 16900, netEgp: -16900 });
  });

  it('a month with no rows returns zeros, no days and an empty tally', async () => {
    expect(await getTransactionMonthAggregate(db, JUNE)).toEqual({
      days: [],
      matchCount: 0,
      matchNetEgp: 0,
      scoped: { incomeEgp: 0, expenseEgp: 0, netEgp: 0 },
    });
  });
});

describe('getTransactionMonthAggregate — query plan', () => {
  const TRANSACTION_TABLE_ROW = /^(SEARCH|SCAN) (t|transaction_row)\b/;
  const DATE_RANGE_SEARCH =
    /^SEARCH (t|transaction_row) USING INDEX idx_transactions_date \(transaction_date>\?/;

  function planOf(call: [string, ...unknown[]]): string[] {
    const [sql, ...rest] = call;
    return explainQueryPlan(realDb, sql, rest);
  }

  function expectDateIndexSearch(plan: string[]): void {
    const tableRows = plan.filter((detail) => TRANSACTION_TABLE_ROW.test(detail));
    expect(tableRows.length).toBeGreaterThan(0);
    for (const detail of plan) expect(detail).not.toMatch(/^SCAN (t|transaction_row)\b/);
    for (const detail of tableRows) expect(detail).toMatch(DATE_RANGE_SEARCH);
  }

  it.each<{ shape: string; query: TransactionAggregateQuery }>([
    { shape: 'the unfiltered month', query: MAY },
    { shape: 'a search', query: { ...MAY, search: 'coffee' } },
    { shape: 'the empty month', query: JUNE },
    { shape: 'a type', query: { ...MAY, type: TransactionType.Expense } },
    { shape: 'an account', query: { ...MAY, accountIds: ['acc_bank'] } },
    { shape: 'a category', query: { ...MAY, categoryIds: ['cat_housing'] } },
  ])(
    '$shape: every statement searches the transactions table by the date index',
    async ({ query }) => {
      sqlite.getAllAsync.mockClear();
      sqlite.getFirstAsync.mockClear();

      await getTransactionMonthAggregate(db, query);

      const filtered = [...sqlite.getAllAsync.mock.calls];
      const scoped = [...sqlite.getFirstAsync.mock.calls];
      expect(filtered.length).toBeGreaterThan(0);
      expect(scoped.length).toBeGreaterThan(0);
      for (const call of [...filtered, ...scoped]) expectDateIndexSearch(planOf(call));
    },
  );
});
