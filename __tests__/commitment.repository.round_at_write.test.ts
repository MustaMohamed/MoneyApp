import Database from 'better-sqlite3';
import type { SQLiteDatabase } from 'expo-sqlite';
import uuid from 'react-native-uuid';

import { AmountType, Currency, DurationType, RecurrencePeriod } from '@/constants/enums';
import { getDb } from '@/database/client';
import { MIGRATIONS } from '@/database/migrations';
import {
  CommitmentRepository,
  type NewCommitmentInput,
  type UpdateCommitmentInput,
} from '@/modules/commitments/repositories/commitment.repository';

jest.mock('@/database/client', () => ({ getDb: jest.fn() }));
jest.mock('react-native-uuid', () => ({ v4: jest.fn() }));

const NOW_ISO = '2026-05-08T10:11:12.000Z';
let realDb: ReturnType<typeof Database>;
let fakeDb: SQLiteDatabase;
let generatedId = 0;

const baseInput: NewCommitmentInput = {
  name: 'Rent',
  amount_type: AmountType.Fixed,
  amount: 500.555,
  currency: Currency.EGP,
  category_id: 'cat',
  recurrence_every: 1,
  recurrence_period: RecurrencePeriod.Months,
  start_date: '2026-05-01',
  account_id: null,
  notes: null,
  duration_type: DurationType.Forever,
  end_date: null,
  end_after_count: null,
};

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
  } as unknown as SQLiteDatabase;
});

beforeEach(() => {
  realDb.exec('DELETE FROM commitment_payments; DELETE FROM commitments;');
  generatedId = 0;
  (uuid.v4 as jest.Mock).mockImplementation(() => `generated-${++generatedId}`);
  (getDb as jest.Mock).mockResolvedValue(fakeDb);
  jest.clearAllMocks();
});

afterAll(() => {
  realDb.close();
});

function readAmount(id: string): number | null {
  const row = realDb.prepare('SELECT amount FROM commitments WHERE id = ?').get(id) as {
    amount: number | null;
  };
  return row.amount;
}

describe('CommitmentRepository.add — rounds at the first statement', () => {
  it('500.555 persists as 500.56', async () => {
    const repo = new CommitmentRepository();
    await repo.add(baseInput);

    expect(readAmount('generated-1')).toBe(500.56);
  });

  it('a Variable commitment with amount: null persists NULL, not 0', async () => {
    const repo = new CommitmentRepository();
    await repo.add({
      ...baseInput,
      amount_type: AmountType.Variable,
      amount: null,
    });

    expect(readAmount('generated-1')).toBeNull();
  });
});

describe('CommitmentRepository.update — rounds at the first statement', () => {
  it("moves a stored 500.56 to 12.34 (12.345 rounds to even under banker's rounding)", async () => {
    const repo = new CommitmentRepository();
    await repo.add(baseInput);
    const id = 'generated-1';

    const updateData: UpdateCommitmentInput = {
      name: baseInput.name,
      amount_type: baseInput.amount_type,
      amount: 12.345,
      currency: baseInput.currency,
      category_id: baseInput.category_id,
      recurrence_every: baseInput.recurrence_every,
      recurrence_period: baseInput.recurrence_period,
      start_date: baseInput.start_date,
      account_id: baseInput.account_id,
      notes: baseInput.notes,
      duration_type: baseInput.duration_type,
      end_date: baseInput.end_date,
      end_after_count: baseInput.end_after_count,
    };
    await repo.update(id, updateData);

    // 12.345 * 100 is exactly 1234.5, and banker's rounding picks the even cent: 12.34, not 12.35.
    expect(readAmount(id)).toBe(12.34);
  });

  it('a Fixed-to-Variable update with amount: null persists NULL', async () => {
    const repo = new CommitmentRepository();
    await repo.add(baseInput);
    const id = 'generated-1';

    await repo.update(id, {
      name: baseInput.name,
      amount_type: AmountType.Variable,
      amount: null,
      currency: baseInput.currency,
      category_id: baseInput.category_id,
      recurrence_every: baseInput.recurrence_every,
      recurrence_period: baseInput.recurrence_period,
      start_date: baseInput.start_date,
      account_id: baseInput.account_id,
      notes: baseInput.notes,
      duration_type: baseInput.duration_type,
      end_date: baseInput.end_date,
      end_after_count: baseInput.end_after_count,
    });

    expect(readAmount(id)).toBeNull();
  });
});
