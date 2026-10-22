import uuid from 'react-native-uuid';

import { Currency, TransactionType } from '@/constants/enums';
import { getDb } from '@/database/client';
import { budgetRepository } from '@/modules/budget/repositories/budget.repository';
import { CategoryRepository } from '@/modules/categories/repositories/category.repository';
import type { Commitment } from '@/modules/commitments/entities/commitment.entity';
import type { CommitmentPayment } from '@/modules/commitments/entities/commitment_payment.entity';
import {
  commitmentRepository,
  type UpdateCommitmentInput,
} from '@/modules/commitments/repositories/commitment.repository';
import { transactionRepository } from '@/modules/transactions/repositories/transaction.repository';
import { makeTestCommitment, makeTestPayment } from '@/test_helpers/commitment';
import { bridgeSQLiteConnections, type SQLiteConnections } from '@/test_helpers/sqlite_connections';
import { insertRecords } from '@/test_helpers/sqlite_fixtures';

jest.mock('react-native-uuid', () => ({ v4: jest.fn() }));

const HOLD_MS = 150;
const NOW = new Date('2026-05-08T10:11:12.000Z');
const NOW_ISO = NOW.toISOString();
const TODAY = '2026-05-08';
const SEEDED_AT = '2026-01-01T00:00:00.000Z';
const OPENING_BALANCE = 1000;

let connections: SQLiteConnections;
let generatedId = 0;

const COMMITMENT = makeTestCommitment({
  id: 'commitment',
  amount: 100,
  category_id: 'cat',
  account_id: 'account',
  start_date: '2026-03-01',
  created_at: SEEDED_AT,
  updated_at: SEEDED_AT,
});
const OVERDUE_MAY = makeTestPayment({
  id: 'overdue-may',
  commitment_id: 'commitment',
  due_date: '2026-05-01',
  amount_due: 100,
  created_at: SEEDED_AT,
  updated_at: SEEDED_AT,
});
const SKIPPED_APRIL = makeTestPayment({
  id: 'skipped-april',
  commitment_id: 'commitment',
  due_date: '2026-04-01',
  skipped_date: '2026-04-03',
  amount_due: 100,
  created_at: SEEDED_AT,
  updated_at: SEEDED_AT,
});

function category(id: string, name: string) {
  return {
    id,
    name,
    type: 'expense',
    icon: 'tag',
    color: '#C9973A',
    is_default: 0,
    sort_order: 0,
    created_at: SEEDED_AT,
    updated_at: SEEDED_AT,
  };
}

beforeAll(async () => {
  connections = bridgeSQLiteConnections();
  insertRecords(connections.inspect, 'categories', [category('cat', 'Bills')]);
  insertRecords(connections.inspect, 'accounts', [
    {
      id: 'account',
      name: 'Main',
      type: 'bank',
      currency: 'EGP',
      opening_balance: OPENING_BALANCE,
      current_balance: OPENING_BALANCE,
      interest_tracking: 0,
      is_archived: 0,
      sort_order: 0,
      created_at: SEEDED_AT,
      updated_at: SEEDED_AT,
    },
  ]);
  await getDb();
});

beforeEach(() => {
  connections.inspect.exec(`
    DELETE FROM transactions; DELETE FROM commitment_payments; DELETE FROM commitments;
    DELETE FROM budget_month_category_groups; DELETE FROM budget_month_settings;
    DELETE FROM budgets; DELETE FROM lock_holder; DELETE FROM categories WHERE id <> 'cat';
  `);
  connections.inspect
    .prepare("UPDATE accounts SET current_balance = ? WHERE id = 'account'")
    .run(OPENING_BALANCE);
  generatedId = 0;
  (uuid.v4 as jest.Mock).mockImplementation(() => `generated-${++generatedId}`);
});

afterEach(async () => {
  await connections.settle();
});

afterAll(() => {
  connections.dispose();
});

async function whileLocked<T>(write: () => Promise<T>): Promise<T> {
  const lock = await connections.holdWriteLock(HOLD_MS);
  const result = await write();
  await lock.released;
  return result;
}

function seed(commitment: Commitment, payments: CommitmentPayment[]): void {
  insertRecords(connections.inspect, 'commitments', [commitment]);
  insertRecords(connections.inspect, 'commitment_payments', payments);
}

function row(table: string, id: string): unknown {
  return connections.inspect.prepare(`SELECT * FROM ${table} WHERE id = ?`).get(id);
}

function dueDates(): string[] {
  return connections.inspect
    .prepare("SELECT due_date FROM commitment_payments WHERE commitment_id = 'commitment'")
    .pluck()
    .all()
    .map(String);
}

function accountBalance(): unknown {
  return connections.inspect
    .prepare("SELECT current_balance FROM accounts WHERE id = 'account'")
    .pluck()
    .get();
}

function editInput(overrides: Partial<UpdateCommitmentInput> = {}): UpdateCommitmentInput {
  return {
    name: COMMITMENT.name,
    amount_type: COMMITMENT.amount_type,
    amount: COMMITMENT.amount,
    currency: COMMITMENT.currency,
    category_id: COMMITMENT.category_id,
    recurrence_every: COMMITMENT.recurrence_every,
    recurrence_period: COMMITMENT.recurrence_period,
    start_date: COMMITMENT.start_date,
    account_id: COMMITMENT.account_id,
    notes: COMMITMENT.notes,
    duration_type: COMMITMENT.duration_type,
    end_date: COMMITMENT.end_date,
    end_after_count: COMMITMENT.end_after_count,
    ...overrides,
  };
}

describe('a write on the main connection while another connection holds the write lock', () => {
  it('Skip, an autocommit update, waits and writes the skip', async () => {
    seed(COMMITMENT, [OVERDUE_MAY]);

    await whileLocked(() => commitmentRepository.markAsSkipped('overdue-may', TODAY, NOW_ISO));

    expect(row('commitment_payments', 'overdue-may')).toMatchObject({ skipped_date: TODAY });
  });

  it('Pay waits and writes the payment, its transaction and the account delta in one go', async () => {
    seed(COMMITMENT, [OVERDUE_MAY]);

    await whileLocked(() =>
      commitmentRepository.markAsPaid('overdue-may', {
        amount_paid: 100,
        account_id: 'account',
        paid_date: TODAY,
      }),
    );

    expect(row('commitment_payments', 'overdue-may')).toMatchObject({
      paid_date: TODAY,
      amount_paid: 100,
    });
    expect(
      connections.inspect
        .prepare("SELECT COUNT(*) FROM transactions WHERE commitment_payment_id = 'overdue-may'")
        .pluck()
        .get(),
    ).toBe(1);
    expect(accountBalance()).toBe(OPENING_BALANCE - 100);
  });

  it('a category reassign, which reads before it writes, waits and moves the rows', async () => {
    insertRecords(connections.inspect, 'categories', [category('old', 'Old bills')]);
    seed({ ...COMMITMENT, category_id: 'old' }, []);

    await whileLocked(() => new CategoryRepository().reassignAndDelete('old', 'cat'));

    expect(row('commitments', 'commitment')).toMatchObject({ category_id: 'cat' });
    expect(row('categories', 'old')).toBeUndefined();
  });

  it('a transaction save waits and writes the row and the balance change', async () => {
    const created = await whileLocked(() =>
      transactionRepository.add({
        type: TransactionType.Expense,
        amount: 200,
        currency: Currency.EGP,
        egp_amount: 200,
        account_id: 'account',
        category_id: 'cat',
        transaction_date: TODAY,
        transaction_time: '10:00:00',
      }),
    );

    expect(row('transactions', created.id)).toMatchObject({ amount: 200, account_id: 'account' });
    expect(accountBalance()).toBe(OPENING_BALANCE - 200);
  });
});

describe('an exclusive write while another connection holds the write lock', () => {
  it('housekeeping, which reads first, waits and plans the payments', async () => {
    seed(COMMITMENT, []);

    await whileLocked(() => commitmentRepository.runHousekeeping(NOW));

    expect(dueDates()).toEqual(expect.arrayContaining(['2026-03-01', '2026-04-01', '2026-05-01']));
  });

  it('Undo, which reads first, waits and clears the skip', async () => {
    seed(COMMITMENT, [SKIPPED_APRIL]);

    await whileLocked(() => commitmentRepository.undoSkip('skipped-april', TODAY, NOW_ISO));

    expect(row('commitment_payments', 'skipped-april')).toMatchObject({ skipped_date: null });
  });

  it('Edit waits and writes the commitment and its unpaid rows', async () => {
    seed(COMMITMENT, [OVERDUE_MAY]);

    await whileLocked(() =>
      commitmentRepository.update('commitment', editInput({ amount: 150 }), NOW),
    );

    expect(row('commitments', 'commitment')).toMatchObject({ amount: 150 });
    expect(
      connections.inspect
        .prepare(
          "SELECT DISTINCT amount_due FROM commitment_payments WHERE commitment_id = 'commitment'",
        )
        .pluck()
        .all(),
    ).toEqual([150]);
  });

  it('Stop waits, marks the commitment inactive and deletes its unpaid rows', async () => {
    seed(COMMITMENT, [OVERDUE_MAY]);

    await whileLocked(() => commitmentRepository.deactivate('commitment'));

    expect(row('commitments', 'commitment')).toMatchObject({ is_active: 0 });
    expect(dueDates()).toEqual([]);
  });

  it('an expected-income save, which writes first, waits and writes the month', async () => {
    await whileLocked(() => budgetRepository.setExpectedIncome('2026-05', 20000));

    expect(
      connections.inspect
        .prepare("SELECT expected_income FROM budget_month_settings WHERE year_month = '2026-05'")
        .pluck()
        .get(),
    ).toBe(20000);
  });

  it('a budget edit, which reads the row first, waits and writes the new limit', async () => {
    insertRecords(connections.inspect, 'budgets', [
      {
        id: 'budget-1',
        category_id: 'cat',
        name: 'Groceries',
        limit_amount: 500,
        effective_from: '2026-05',
        created_at: SEEDED_AT,
        updated_at: SEEDED_AT,
      },
    ]);

    await whileLocked(() =>
      budgetRepository.setBudget({
        id: 'budget-1',
        categoryId: 'cat',
        name: 'Groceries',
        limit: 750,
        yearMonth: '2026-05',
      }),
    );

    expect(row('budgets', 'budget-1')).toMatchObject({ limit_amount: 750, created_at: SEEDED_AT });
  });
});
