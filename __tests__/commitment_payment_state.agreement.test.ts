import Database from 'better-sqlite3';

import { DurationType } from '@/constants/enums';
import { MIGRATIONS } from '@/database/migrations';
import { deactivateExpiredCommitments } from '@/modules/commitments/database/commitments';
import {
  paidPaymentSql,
  settledPaymentSql,
  skippedPaymentSql,
  unpaidPaymentSql,
} from '@/modules/commitments/database/payment_state_sql';
import {
  countSettledPayments,
  isPaidPayment,
  isSkippedPayment,
  isUnpaidPayment,
  resolveCommitmentLifecycle,
} from '@/modules/commitments/domain/payment_state';
import type { Commitment } from '@/modules/commitments/entities/commitment.entity';
import type { CommitmentPayment } from '@/modules/commitments/entities/commitment_payment.entity';
import { bridgeBetterSQLite, createMockSQLiteDatabase } from '@/test_helpers/sqlite';

type Row = Pick<CommitmentPayment, 'id' | 'paid_date' | 'skipped_date'>;

const NOW = '2026-05-08T10:00:00.000Z';
const ROWS: Row[] = [
  { id: 'neither', paid_date: null, skipped_date: null },
  { id: 'paid', paid_date: '2026-05-02', skipped_date: null },
  { id: 'skipped', paid_date: null, skipped_date: '2026-05-03' },
  { id: 'both', paid_date: '2026-05-02', skipped_date: '2026-05-03' },
];

const CASES: [string, (alias?: string) => string, (row: Row) => boolean][] = [
  ['unpaid', unpaidPaymentSql, isUnpaidPayment],
  ['paid', paidPaymentSql, isPaidPayment],
  ['skipped', skippedPaymentSql, isSkippedPayment],
  ['settled', settledPaymentSql, (row) => !isUnpaidPayment(row)],
];

let db: Database.Database;

beforeAll(() => {
  db = new Database(':memory:');
  db.pragma('foreign_keys = OFF');
  for (const migration of MIGRATIONS) db.exec(migration.up);
  const insert = db.prepare(
    `INSERT INTO commitment_payments
       (id, commitment_id, due_date, paid_date, skipped_date, currency, created_at, updated_at)
     VALUES (?, 'commitment', ?, ?, ?, 'EGP', ?, ?)`,
  );
  ROWS.forEach((row, index) =>
    insert.run(row.id, `2026-05-0${index + 1}`, row.paid_date, row.skipped_date, NOW, NOW),
  );
});

afterAll(() => {
  db.close();
});

function selectIds(sql: string): string[] {
  return db
    .prepare<[], { id: string }>(sql)
    .all()
    .map((row) => row.id)
    .sort();
}

describe('the payment state SQL fragments agree with the TypeScript predicates', () => {
  it('runs against the schema without a status column', () => {
    const columns = db
      .prepare<[], { name: string }>("SELECT name FROM pragma_table_info('commitment_payments')")
      .all()
      .map((column) => column.name);
    expect(columns).not.toContain('status');
  });

  it.each(CASES)(
    '%s selects exactly the rows its predicate accepts',
    (_name, fragment, accepts) => {
      const expected = ROWS.filter(accepts)
        .map((row) => row.id)
        .sort();
      expect(expected.length).toBeGreaterThan(0);
      expect(expected.length).toBeLessThan(ROWS.length);

      expect(selectIds(`SELECT id FROM commitment_payments WHERE ${fragment()}`)).toEqual(expected);
      expect(
        selectIds(
          `SELECT payment.id FROM commitment_payments payment WHERE ${fragment('payment')}`,
        ),
      ).toEqual(expected);
    },
  );
});

describe('resolveCommitmentLifecycle agrees with deactivateExpiredCommitments (MA-266)', () => {
  type EndFields = Pick<Commitment, 'id' | 'duration_type' | 'end_date' | 'end_after_count'>;
  const TODAY = '2026-05-08';
  const COMMITMENTS: EndFields[] = [
    {
      id: 'until-before',
      duration_type: DurationType.UntilDate,
      end_date: '2026-05-07',
      end_after_count: null,
    },
    {
      id: 'until-today',
      duration_type: DurationType.UntilDate,
      end_date: TODAY,
      end_after_count: null,
    },
    {
      id: 'until-no-date',
      duration_type: DurationType.UntilDate,
      end_date: null,
      end_after_count: null,
    },
    {
      id: 'after-paid-skipped',
      duration_type: DurationType.AfterCount,
      end_date: null,
      end_after_count: 2,
    },
    {
      id: 'after-one-short',
      duration_type: DurationType.AfterCount,
      end_date: null,
      end_after_count: 2,
    },
    {
      id: 'after-skipped-past',
      duration_type: DurationType.AfterCount,
      end_date: null,
      end_after_count: 1,
    },
    { id: 'forever', duration_type: DurationType.Forever, end_date: null, end_after_count: null },
  ];
  const PAYMENTS: (Row & { commitment_id: string; due_date: string })[] = [
    {
      id: 'aps-1',
      commitment_id: 'after-paid-skipped',
      due_date: '2026-03-01',
      paid_date: '2026-03-01',
      skipped_date: null,
    },
    {
      id: 'aps-2',
      commitment_id: 'after-paid-skipped',
      due_date: '2026-04-01',
      paid_date: null,
      skipped_date: '2026-04-01',
    },
    {
      id: 'aos-1',
      commitment_id: 'after-one-short',
      due_date: '2026-03-01',
      paid_date: '2026-03-01',
      skipped_date: null,
    },
    {
      id: 'aos-2',
      commitment_id: 'after-one-short',
      due_date: '2026-04-01',
      paid_date: null,
      skipped_date: null,
    },
    {
      id: 'asp-1',
      commitment_id: 'after-skipped-past',
      due_date: '2026-04-01',
      paid_date: null,
      skipped_date: '2026-04-01',
    },
    {
      id: 'f-1',
      commitment_id: 'forever',
      due_date: '2026-04-01',
      paid_date: '2026-04-01',
      skipped_date: null,
    },
    {
      id: 'ub-1',
      commitment_id: 'until-before',
      due_date: '2026-04-01',
      paid_date: null,
      skipped_date: null,
    },
  ];

  it('reads ended for exactly the commitments the sweep sets to is_active 0', async () => {
    const sweepDb = new Database(':memory:');
    sweepDb.pragma('foreign_keys = OFF');
    for (const migration of MIGRATIONS) sweepDb.exec(migration.up);
    const insertCommitment = sweepDb.prepare(
      `INSERT INTO commitments
         (id, name, amount_type, amount, currency, category_id, recurrence_every, recurrence_period,
          start_date, duration_type, end_date, end_after_count, is_active, created_at, updated_at)
       VALUES (?, ?, 'fixed', 100, 'EGP', 'category', 1, 'months', '2026-03-01', ?, ?, ?, 1, ?, ?)`,
    );
    for (const c of COMMITMENTS) {
      insertCommitment.run(c.id, c.id, c.duration_type, c.end_date, c.end_after_count, NOW, NOW);
    }
    const insertPayment = sweepDb.prepare(
      `INSERT INTO commitment_payments
         (id, commitment_id, due_date, paid_date, skipped_date, currency, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, 'EGP', ?, ?)`,
    );
    for (const p of PAYMENTS) {
      insertPayment.run(p.id, p.commitment_id, p.due_date, p.paid_date, p.skipped_date, NOW, NOW);
    }
    const mock = createMockSQLiteDatabase();
    bridgeBetterSQLite(mock, sweepDb);

    await deactivateExpiredCommitments(mock.database, TODAY, NOW);

    const swept = sweepDb
      .prepare<[], { id: string }>('SELECT id FROM commitments WHERE is_active = 0 ORDER BY id')
      .all()
      .map((row) => row.id);
    sweepDb.close();
    const ended = COMMITMENTS.filter(
      (c) =>
        resolveCommitmentLifecycle(
          { ...c, is_active: 1 },
          countSettledPayments(PAYMENTS.filter((p) => p.commitment_id === c.id)),
          TODAY,
        ) === 'ended',
    )
      .map((c) => c.id)
      .sort();

    expect(ended).toEqual(['after-paid-skipped', 'after-skipped-past', 'until-before']);
    expect(swept).toEqual(ended);
  });
});
