/**
 * commitment.repository.mark_as_paid.test.ts
 *
 * Bridges better-sqlite3 into the mocked expo-sqlite surface the way
 * `__tests__/transaction.repository.test.ts` does, following the pattern of
 * `__tests__/commitment_housekeeping.repository.test.ts` — but that suite's
 * fakeDb maps only `getAllAsync`/`runAsync`/`withExclusiveTransactionAsync`
 * and hands the db to the caller as a `fakeDb` parameter. `markCommitmentAsPaid`
 * uses `withTransactionAsync` (commitment_payments.ts) and
 * `CommitmentRepository.markAsPaid` calls `getDb()` itself rather than taking
 * a db parameter, so both gaps are closed here: `withTransactionAsync` is
 * mapped to real BEGIN/COMMIT/ROLLBACK, and the bridge is installed through
 * the mocked `@/database/client` module.
 *
 * This is the row-18 assertion the ticket's own diagnosis says does not exist
 * anywhere in the tree: `commitment_payments.amount_paid` was written from
 * `details.amount_paid` (raw) while `transactions.amount` was written from
 * `amounts.accountNativeAmount` (rounded) — two different numbers for one
 * payment. Reading both rows back in the same transaction's aftermath is the
 * only way to prove they now reconcile.
 */
import Database from 'better-sqlite3';
import type { SQLiteDatabase } from 'expo-sqlite';
import uuid from 'react-native-uuid';

import {
  AmountType,
  Currency,
  CommitmentPaymentStatus,
  DurationType,
  RecurrencePeriod,
} from '@/constants/enums';
import { getDb } from '@/database/client';
import { MIGRATIONS } from '@/database/migrations';
import type { Commitment } from '@/modules/commitments/entities/commitment.entity';
import { CommitmentRepository } from '@/modules/commitments/repositories/commitment.repository';

jest.mock('@/database/client', () => ({ getDb: jest.fn() }));
jest.mock('react-native-uuid', () => ({ v4: jest.fn() }));

const NOW_ISO = '2026-05-08T10:11:12.000Z';
let realDb: ReturnType<typeof Database>;
let fakeDb: SQLiteDatabase;
let generatedId = 0;

function commitmentRow(id: string, currency: Currency, amount: number): Commitment {
  return {
    id,
    name: id,
    amount_type: AmountType.Fixed,
    amount,
    currency,
    category_id: 'cat',
    recurrence_every: 1,
    recurrence_period: RecurrencePeriod.Months,
    start_date: '2026-05-01',
    account_id: null,
    notes: null,
    duration_type: DurationType.Forever,
    end_date: null,
    end_after_count: null,
    is_active: 1,
    created_at: NOW_ISO,
    updated_at: NOW_ISO,
  };
}

function insertCommitment(c: Commitment) {
  realDb
    .prepare(
      `INSERT INTO commitments
        (id, name, amount_type, amount, currency, category_id, recurrence_every,
         recurrence_period, start_date, account_id, notes, duration_type, end_date,
         end_after_count, is_active, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      c.id,
      c.name,
      c.amount_type,
      c.amount,
      c.currency,
      c.category_id,
      c.recurrence_every,
      c.recurrence_period,
      c.start_date,
      c.account_id,
      c.notes,
      c.duration_type,
      c.end_date,
      c.end_after_count,
      c.is_active,
      c.created_at,
      c.updated_at,
    );
}

function insertPayment(id: string, commitmentId: string, currency: Currency, amountDue: number) {
  realDb
    .prepare(
      `INSERT INTO commitment_payments
        (id, commitment_id, due_date, paid_date, skipped_date, amount_due, amount_paid,
         currency, exchange_rate_snapshot, account_id, transaction_id, status, notes,
         created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      id,
      commitmentId,
      '2026-05-08',
      null,
      null,
      amountDue,
      null,
      currency,
      null,
      null,
      null,
      CommitmentPaymentStatus.Due,
      null,
      NOW_ISO,
      NOW_ISO,
    );
}

beforeAll(() => {
  realDb = new Database(':memory:');
  realDb.exec(MIGRATIONS.map((migration) => migration.up).join('\n'));
  realDb
    .prepare(
      `INSERT INTO categories
        (id, name, type, icon, color, is_default, sort_order, created_at, updated_at)
       VALUES ('cat', 'Bills', 'expense', 'tag', '#C9973A', 0, 0, ?, ?)`,
    )
    .run(NOW_ISO, NOW_ISO);
  realDb
    .prepare(
      `INSERT INTO accounts
        (id, name, type, currency, opening_balance, current_balance,
         interest_tracking, is_archived, sort_order, created_at, updated_at)
       VALUES ('acc_egp', 'EGP Bank', 'bank', 'EGP', 1000, 1000, 0, 0, 0, ?, ?),
              ('acc_usd', 'USD Bank', 'bank', 'USD', 1000, 1000, 0, 0, 1, ?, ?)`,
    )
    .run(NOW_ISO, NOW_ISO, NOW_ISO, NOW_ISO);

  fakeDb = {
    getAllAsync: jest.fn(async (sql: string, ...rest: unknown[]) => {
      const params = (Array.isArray(rest[0]) ? rest[0] : rest) as unknown[];
      return realDb.prepare(sql).all(...(params as never[]));
    }),
    runAsync: jest.fn(async (sql: string, ...rest: unknown[]) => {
      const params = (Array.isArray(rest[0]) ? rest[0] : rest) as unknown[];
      const result = realDb.prepare(sql).run(...(params as never[]));
      return { changes: result.changes, lastInsertRowId: Number(result.lastInsertRowid) };
    }),
    withTransactionAsync: jest.fn(async (work: () => Promise<void>) => {
      realDb.exec('BEGIN');
      try {
        await work();
        realDb.exec('COMMIT');
      } catch (error) {
        realDb.exec('ROLLBACK');
        throw error;
      }
    }),
  } as unknown as SQLiteDatabase;
});

beforeEach(() => {
  realDb.exec(
    'DELETE FROM commitment_payments; DELETE FROM transactions; DELETE FROM commitments;',
  );
  realDb
    .prepare("UPDATE accounts SET current_balance = 1000 WHERE id IN ('acc_egp','acc_usd')")
    .run();
  generatedId = 0;
  (uuid.v4 as jest.Mock).mockImplementation(() => `generated-${++generatedId}`);
  (getDb as jest.Mock).mockResolvedValue(fakeDb);
  jest.clearAllMocks();
});

afterAll(() => {
  realDb.close();
});

describe('CommitmentRepository.markAsPaid — the write path reconciles', () => {
  // Row 18, the ticket's highest-value assertion. Gate: revert markAsPaid to
  // pass `details` straight through to markCommitmentAsPaid (delete the
  // `paidDetails` rebinding) and `payment.amount_paid` reads back 10.999
  // while `tx.amount` still reads 11 — two different numbers for one payment.
  it('EGP commitment / EGP account: 10.999 persists as 11 in the payment row, the transaction, and the account balance', async () => {
    insertCommitment(commitmentRow('commitment-egp', Currency.EGP, 10.999));
    insertPayment('payment-egp', 'commitment-egp', Currency.EGP, 10.999);
    const repo = new CommitmentRepository();

    await repo.markAsPaid(
      'payment-egp',
      { amount_paid: 10.999, account_id: 'acc_egp', paid_date: '2026-05-08' },
      commitmentRow('commitment-egp', Currency.EGP, 10.999),
    );

    const payment = realDb
      .prepare('SELECT amount_paid, transaction_id FROM commitment_payments WHERE id = ?')
      .get('payment-egp') as { amount_paid: number; transaction_id: string };
    const tx = realDb
      .prepare('SELECT amount, egp_amount FROM transactions WHERE id = ?')
      .get(payment.transaction_id) as { amount: number; egp_amount: number };
    const account = realDb
      .prepare('SELECT current_balance FROM accounts WHERE id = ?')
      .get('acc_egp') as { current_balance: number };

    expect(payment.amount_paid).toBe(11);
    expect(tx.amount).toBe(11);
    expect(tx.egp_amount).toBe(11);
    expect(account.current_balance).toBe(989);
  });

  // Row 19 plus the remaining two currency pairs. `amount_paid` is always the
  // commitment-currency figure; `tx.amount` is the account-native figure —
  // they are *supposed* to differ across currencies (ADR §3 row 2).
  it.each([
    [Currency.EGP, Currency.EGP, 'acc_egp', undefined, 11, 11],
    [Currency.USD, Currency.EGP, 'acc_egp', 48, 11, 528],
    [Currency.EGP, Currency.USD, 'acc_usd', 48, 11, 0.23],
    [Currency.USD, Currency.USD, 'acc_usd', 48, 11, 11],
  ] as const)(
    '%s commitment / %s account: amount_paid and the linked transaction both reconcile from 10.999',
    async (
      commitmentCurrency,
      accountCurrency,
      accountId,
      rate,
      expectedAmountPaid,
      expectedTxAmount,
    ) => {
      const id = `c-${commitmentCurrency}-${accountCurrency}`;
      insertCommitment(commitmentRow(id, commitmentCurrency, 10.999));
      insertPayment(`p-${id}`, id, commitmentCurrency, 10.999);
      const repo = new CommitmentRepository();

      await repo.markAsPaid(
        `p-${id}`,
        {
          amount_paid: 10.999,
          account_id: accountId,
          paid_date: '2026-05-08',
          exchange_rate_snapshot: rate,
        },
        commitmentRow(id, commitmentCurrency, 10.999),
      );

      const payment = realDb
        .prepare('SELECT amount_paid, transaction_id FROM commitment_payments WHERE id = ?')
        .get(`p-${id}`) as { amount_paid: number; transaction_id: string };
      const tx = realDb
        .prepare('SELECT amount FROM transactions WHERE id = ?')
        .get(payment.transaction_id) as { amount: number };

      expect(payment.amount_paid).toBe(expectedAmountPaid);
      expect(tx.amount).toBe(expectedTxAmount);
    },
  );
});
