import { Currency, TransactionType } from '@/constants/enums';
import type { Transaction } from '@/database/entities/transaction.entity';
import { groupTransactionsByDate } from '@/utils/group_transactions_by_date';

const NOW = new Date('2026-05-01T12:00:00.000Z');
const NEW_YEAR = new Date('2026-01-01T12:00:00.000Z');

function tx(date: string, time = '10:00:00', id = `tx-${date}-${time}`): Transaction {
  return {
    id,
    type: TransactionType.Expense,
    amount: 10,
    currency: Currency.EGP,
    egp_amount: 10,
    exchange_rate: null,
    to_amount: null,
    minimum_payment_snapshot: null,
    revolving_balance_delta: null,
    account_id: 'acc-1',
    to_account_id: null,
    category_id: null,
    budget_id: null,
    note: null,
    transaction_date: date,
    transaction_time: time,
    commitment_payment_id: null,
    installment_id: null,
    created_at: `${date}T${time}.000Z`,
    updated_at: `${date}T${time}.000Z`,
  };
}

function keysAndLabels(txs: Transaction[], now: Date) {
  return groupTransactionsByDate(txs, now).map(({ key, label }) => ({ key, label }));
}

describe('groupTransactionsByDate', () => {
  it('returns empty array for no transactions', () => {
    expect(groupTransactionsByDate([], NOW)).toEqual([]);
  });

  it('keys a section by its date and labels today with the word alone', () => {
    const out = groupTransactionsByDate([tx('2026-05-01')], NOW);
    expect(out).toHaveLength(1);
    expect(out[0].key).toBe('2026-05-01');
    expect(out[0].label).toBe('Today');
    expect(out[0].data).toHaveLength(1);
  });

  it('labels yesterday with the word alone', () => {
    expect(keysAndLabels([tx('2026-04-30')], NOW)).toEqual([
      { key: '2026-04-30', label: 'Yesterday' },
    ]);
  });

  it('labels an older day of this year Ddd d Mmm', () => {
    expect(keysAndLabels([tx('2026-04-15')], NOW)).toEqual([
      { key: '2026-04-15', label: 'Wed 15 Apr' },
    ]);
  });

  it('carries the year on a day outside the current year', () => {
    expect(keysAndLabels([tx('2025-12-14')], NOW)).toEqual([
      { key: '2025-12-14', label: 'Sun 14 Dec 2025' },
    ]);
  });

  it('reads Yesterday alone across the year boundary', () => {
    expect(keysAndLabels([tx('2025-12-31')], NEW_YEAR)).toEqual([
      { key: '2025-12-31', label: 'Yesterday' },
    ]);
  });

  it('carries the year on the day before yesterday across the year boundary', () => {
    expect(keysAndLabels([tx('2025-12-30')], NEW_YEAR)).toEqual([
      { key: '2025-12-30', label: 'Tue 30 Dec 2025' },
    ]);
  });

  it('groups transactions on the same date together preserving order', () => {
    const a = tx('2026-05-01', '14:00:00', 'a');
    const b = tx('2026-05-01', '10:00:00', 'b');
    const out = groupTransactionsByDate([a, b], NOW);
    expect(out).toHaveLength(1);
    expect(out[0].data.map((t) => t.id)).toEqual(['a', 'b']);
  });

  it('keeps DESC order across sections', () => {
    const today = tx('2026-05-01', '12:00:00', 'today');
    const yesterday = tx('2026-04-30', '12:00:00', 'yest');
    const older = tx('2026-04-15', '12:00:00', 'older');
    const lastYear = tx('2025-12-14', '12:00:00', 'old');
    expect(keysAndLabels([today, yesterday, older, lastYear], NOW)).toEqual([
      { key: '2026-05-01', label: 'Today' },
      { key: '2026-04-30', label: 'Yesterday' },
      { key: '2026-04-15', label: 'Wed 15 Apr' },
      { key: '2025-12-14', label: 'Sun 14 Dec 2025' },
    ]);
  });

  it('grows a day already on screen and opens a new day when a second page lands', () => {
    const firstPage = [tx('2026-05-01', '14:00:00', 'a'), tx('2026-04-30', '18:00:00', 'b')];
    const secondPage = [tx('2026-04-30', '09:00:00', 'c'), tx('2026-04-29', '12:00:00', 'd')];

    const before = groupTransactionsByDate(firstPage, NOW);
    const after = groupTransactionsByDate([...firstPage, ...secondPage], NOW);

    expect(before.map((section) => section.key)).toEqual(['2026-05-01', '2026-04-30']);
    expect(
      after.map((section) => ({ key: section.key, ids: section.data.map((t) => t.id) })),
    ).toEqual([
      { key: '2026-05-01', ids: ['a'] },
      { key: '2026-04-30', ids: ['b', 'c'] },
      { key: '2026-04-29', ids: ['d'] },
    ]);
    expect(after[2].label).toBe('Wed 29 Apr');
  });
});
