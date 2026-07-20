import { Currency, TransactionType } from '@/constants/enums';
import { getTransactionQueryKey } from '@/modules/transactions/store/transaction_query.helpers';

describe('getTransactionQueryKey', () => {
  it('normalizes search text and identifier collections without mutating the filters', () => {
    const accountIds = ['account-b', 'account-a', 'account-a'];
    const categoryIds = ['category-b', 'category-a'];

    const first = getTransactionQueryKey({
      search: ' rent ',
      accountIds,
      categoryIds,
    });
    const second = getTransactionQueryKey({
      search: 'rent',
      accountIds: ['account-a', 'account-b'],
      categoryIds: ['category-a', 'category-b'],
    });

    expect(first).toBe(second);
    expect(accountIds).toEqual(['account-b', 'account-a', 'account-a']);
    expect(categoryIds).toEqual(['category-b', 'category-a']);
  });

  it('distinguishes every query field that changes the result set', () => {
    const base = {
      type: TransactionType.Expense,
      search: 'rent',
      accountIds: ['account-a'],
      categoryIds: ['category-a'],
      dateFrom: '2026-07-01',
      dateTo: '2026-07-31',
      amountMin: 10,
      amountMax: 100,
      amountCurrency: Currency.EGP,
    };
    const baseKey = getTransactionQueryKey(base);

    expect(getTransactionQueryKey({ ...base, type: TransactionType.Income })).not.toBe(baseKey);
    expect(getTransactionQueryKey({ ...base, search: 'food' })).not.toBe(baseKey);
    expect(getTransactionQueryKey({ ...base, accountIds: ['account-b'] })).not.toBe(baseKey);
    expect(getTransactionQueryKey({ ...base, categoryIds: ['category-b'] })).not.toBe(baseKey);
    expect(getTransactionQueryKey({ ...base, dateFrom: '2026-07-02' })).not.toBe(baseKey);
    expect(getTransactionQueryKey({ ...base, dateTo: '2026-07-30' })).not.toBe(baseKey);
    expect(getTransactionQueryKey({ ...base, amountMin: 11 })).not.toBe(baseKey);
    expect(getTransactionQueryKey({ ...base, amountMax: 99 })).not.toBe(baseKey);
    expect(getTransactionQueryKey({ ...base, amountCurrency: Currency.USD })).not.toBe(baseKey);
  });

  it('treats omitted and empty optional filters consistently', () => {
    expect(getTransactionQueryKey({ search: '  ', accountIds: [], categoryIds: [] })).toBe(
      getTransactionQueryKey({}),
    );
  });
});
