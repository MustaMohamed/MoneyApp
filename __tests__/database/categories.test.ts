import { getCategoryTransactionCount } from '@/database/categories';
import { migration009 } from '@/database/migrations/009_add_other_income_category';

const mockGetFirstAsync = jest.fn();
const mockDb = {
  getFirstAsync: mockGetFirstAsync,
} as unknown as Parameters<typeof getCategoryTransactionCount>[0];

describe('getCategoryTransactionCount', () => {
  beforeEach(() => {
    mockGetFirstAsync.mockReset();
  });

  it('returns 0 when no transactions are linked', async () => {
    mockGetFirstAsync.mockResolvedValueOnce({ count: 0 });
    const result = await getCategoryTransactionCount(mockDb, 'cat_groceries');
    expect(result).toBe(0);
  });

  it('calls getFirstAsync with the correct SQL and category id', async () => {
    mockGetFirstAsync.mockResolvedValueOnce({ count: 0 });
    await getCategoryTransactionCount(mockDb, 'cat_groceries');
    expect(mockGetFirstAsync).toHaveBeenCalledWith(
      'SELECT COUNT(*) as count FROM transactions WHERE category_id = ?',
      ['cat_groceries'],
    );
  });

  it('returns the correct count when 47 transactions are linked (TC-01)', async () => {
    mockGetFirstAsync.mockResolvedValueOnce({ count: 47 });
    const result = await getCategoryTransactionCount(mockDb, 'cat_groceries');
    expect(result).toBe(47);
  });

  it('returns 0 when db.getFirstAsync returns null (defensive fallback)', async () => {
    mockGetFirstAsync.mockResolvedValueOnce(null);
    const result = await getCategoryTransactionCount(mockDb, 'cat_nonexistent');
    expect(result).toBe(0);
  });

  it('returns 0 when db.getFirstAsync returns undefined count (defensive fallback)', async () => {
    mockGetFirstAsync.mockResolvedValueOnce({ count: undefined });
    const result = await getCategoryTransactionCount(mockDb, 'cat_nonexistent');
    expect(result).toBe(0);
  });
});

describe('migration009', () => {
  it('exports version 9', () => {
    expect(migration009.version).toBe(9);
  });

  it('INSERT OR IGNORE sql targets cat_other_income', () => {
    expect(migration009.up).toContain("'cat_other_income'");
    expect(migration009.up).toContain('INSERT OR IGNORE');
    expect(migration009.up).toContain("'income'");
  });
});
