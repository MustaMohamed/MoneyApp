import Database from 'better-sqlite3';

import { MIGRATIONS } from '@/database/migrations';
import {
  paidPaymentSql,
  settledPaymentSql,
  unpaidPaymentSql,
} from '@/modules/commitments/database/payment_state_sql';
import { isPaidPayment, isUnpaidPayment } from '@/modules/commitments/domain/payment_state';
import type { CommitmentPayment } from '@/modules/commitments/entities/commitment_payment.entity';

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
