import { Currency, TransactionType } from '@/constants/enums';
import type { Transaction } from '@/database/entities/transaction.entity';
import { groupTransactionsByDate } from '@/utils/group_transactions_by_date';

const NOW = new Date('2026-05-01T12:00:00.000Z');

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

describe('groupTransactionsByDate', () => {
  it('returns empty array for no transactions', () => {
    expect(groupTransactionsByDate([], NOW)).toEqual([]);
  });

  it('labels today as TODAY · MMM D', () => {
    const out = groupTransactionsByDate([tx('2026-05-01')], NOW);
    expect(out).toHaveLength(1);
    expect(out[0].key).toBe('TODAY · MAY 1');
    expect(out[0].data).toHaveLength(1);
  });

  it('labels yesterday as YESTERDAY · MMM D', () => {
    const out = groupTransactionsByDate([tx('2026-04-30')], NOW);
    expect(out[0].key).toBe('YESTERDAY · APR 30');
  });

  it('labels older same-year as MMM D', () => {
    const out = groupTransactionsByDate([tx('2026-04-15')], NOW);
    expect(out[0].key).toBe('APR 15');
  });

  it('labels older years as MMM D, YYYY', () => {
    const out = groupTransactionsByDate([tx('2025-12-12')], NOW);
    expect(out[0].key).toBe('DEC 12, 2025');
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
    const lastYear = tx('2025-12-12', '12:00:00', 'old');
    const out = groupTransactionsByDate([today, yesterday, older, lastYear], NOW);
    expect(out.map((s) => s.key)).toEqual([
      'TODAY · MAY 1',
      'YESTERDAY · APR 30',
      'APR 15',
      'DEC 12, 2025',
    ]);
  });
});
